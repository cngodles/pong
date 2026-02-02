const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
    maxHttpBufferSize: 1e3 // Security: 1kb limit
});

app.use(express.static('public'));

let hostId = null;
let challengerId = null;
let userCount = 0;
let isMatchInProgress = false;
const connectedIds = [];
const queue = [];
const usedNames = new Set();
const nameById = new Map();
let countdownTimer = null;
const COUNTDOWN_SECONDS = 5;

const NAME_ADJECTIVES = [
    "Cheerful", "Brave", "Clever", "Gentle", "Swift", "Sunny", "Mighty", "Curious",
    "Lucky", "Nimble", "Cosmic", "Jolly", "Bright", "Kind", "Zany", "Breezy"
];
const NAME_NOUNS = [
    "Otter", "Fox", "Panda", "Hawk", "Dolphin", "Koala", "Tiger", "Lynx",
    "Badger", "Gecko", "Wombat", "Falcon", "Toucan", "Rabbit", "Marmot", "Orca"
];

function generateAnonName() {
    let attempt = 0;
    while (attempt < 1000) {
        const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
        const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
        const base = `${adj} ${noun}`;
        if (!usedNames.has(base)) return base;
        attempt++;
    }
    return `Player ${Math.floor(Math.random() * 10000)}`;
}

function assignName(id) {
    const name = generateAnonName();
    usedNames.add(name);
    nameById.set(id, name);
    return name;
}

function getName(id) {
    return nameById.get(id) || "Player";
}

function emitRoles() {
    for (const [id, sock] of io.sockets.sockets) {
        let role = 'SPECTATOR';
        if (id === hostId) role = 'HOST';
        else if (id === challengerId) role = 'CHALLENGER';
        sock.emit('role', role);
    }
}

function promoteNextHost() {
    hostId = connectedIds.length ? connectedIds[0] : null;
}

function clearCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

function emitQueueStatus() {
    // Remove stale entries before reporting
    for (let i = queue.length - 1; i >= 0; i--) {
        if (!io.sockets.sockets.has(queue[i])) queue.splice(i, 1);
    }
    const total = queue.length;
    for (const [id, sock] of io.sockets.sockets) {
        const idx = queue.indexOf(id);
        sock.emit('queue_status', { total, ahead: idx >= 0 ? idx : 0, inQueue: idx >= 0 });
    }
}

function removeFromQueue(id) {
    const idx = queue.indexOf(id);
    if (idx >= 0) {
        queue.splice(idx, 1);
        emitQueueStatus();
    }
}

function startCountdown() {
    clearCountdown();
    let remaining = COUNTDOWN_SECONDS;
    io.emit('match_countdown', {
        seconds: remaining,
        hostName: getName(hostId),
        challengerName: getName(challengerId)
    });
    countdownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearCountdown();
            io.emit('game_mode_change', { mode: 'PVP', challengerId });
            io.emit('game_start');
            return;
        }
        io.emit('match_countdown', {
            seconds: remaining,
            hostName: getName(hostId),
            challengerName: getName(challengerId)
        });
    }, 1000);
}

function startNextMatch() {
    if (isMatchInProgress) return;
    emitQueueStatus();
    if (queue.length < 2) return;
    // Ensure we don't start a match with the same player twice
    let hostCandidate = queue.shift();
    while (queue.length && queue[0] === hostCandidate) queue.shift();
    if (queue.length < 1) {
        queue.unshift(hostCandidate);
        emitQueueStatus();
        return;
    }
    hostId = hostCandidate;
    challengerId = queue.shift();
    isMatchInProgress = true;
    emitRoles();
    emitQueueStatus();
    startCountdown();
}

io.on('connection', (socket) => {
    connectedIds.push(socket.id);
    userCount++;
    io.emit('visitor_count', userCount);

    const anonName = assignName(socket.id);
    socket.emit('anon_name', { name: anonName });

    // Initial Role Assignment
    if (!hostId) {
        hostId = socket.id;
    }
    emitRoles();
    emitQueueStatus();

    // Queue Logic
    socket.on('queue_join', () => {
        if (socket.id === challengerId) return;
        removeFromQueue(socket.id);
        queue.push(socket.id);
        emitQueueStatus();
        if (!isMatchInProgress) startNextMatch();
    });

    socket.on('queue_leave', () => {
        removeFromQueue(socket.id);
    });

    // Relay Game State
    socket.on('host_update', (gameState) => {
        if (socket.id === hostId) {
            socket.broadcast.emit('spectator_update', gameState);
        }
    });

    // Relay P2 Input
    socket.on('p2_move', (y) => {
        if (socket.id === challengerId) {
            io.to(hostId).emit('p2_update', y);
        }
    });

    socket.on('match_finished', (data) => {
        if (socket.id === hostId) {
            io.emit('game_over', data);
            isMatchInProgress = false;

            const winnerId = data.winner === 'P1' ? hostId : challengerId;
            const loserId = winnerId === hostId ? challengerId : hostId;

            challengerId = null;
            if (winnerId) hostId = winnerId;
            emitRoles();

            if (winnerId && queue.length) {
                io.to(winnerId).emit('next_match_info', { opponentName: getName(queue[0]) });
            }

            if (loserId) {
                io.to(loserId).emit('queue_status', { total: queue.length, ahead: 0, inQueue: false });
            }

            startNextMatch();
        }
    });

    socket.on('request_rematch', () => {
        io.emit('rematch_started');
    });

    socket.on('request_name', () => {
        socket.emit('anon_name', { name: getName(socket.id) });
    });

    socket.on('disconnect', () => {
        const idx = connectedIds.indexOf(socket.id);
        if (idx >= 0) connectedIds.splice(idx, 1);
        userCount--;
        io.emit('visitor_count', userCount);
        removeFromQueue(socket.id);
        usedNames.delete(nameById.get(socket.id));
        nameById.delete(socket.id);

        if (socket.id === hostId) {
            hostId = null;
            challengerId = null;
            isMatchInProgress = false;
            clearCountdown();
            promoteNextHost();
            io.emit('reset_game'); // Reset state for everyone
            emitRoles();
            if (!isMatchInProgress) startNextMatch();
        } else if (socket.id === challengerId) {
            challengerId = null;
            isMatchInProgress = false;
            clearCountdown();
            io.emit('challenger_left'); // Tells host to go back to AI
            emitRoles();
            if (!isMatchInProgress) startNextMatch();
        } else {
            emitRoles();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));
