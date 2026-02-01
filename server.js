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

io.on('connection', (socket) => {
    userCount++;
    io.emit('visitor_count', userCount);

    // Initial Role Assignment
    if (!hostId) {
        hostId = socket.id;
        socket.emit('role', 'HOST');
    } else {
        socket.emit('role', 'SPECTATOR');
    }

    // Challenge Logic
    socket.on('challenge_request', () => {
        // Only allow a challenge if there is a host and no active match
        if (hostId && !isMatchInProgress && socket.id !== hostId) {
            io.to(hostId).emit('challenge_received', socket.id);
            socket.emit('challenge_pending');
        }
    });

    socket.on('accept_challenge', (id) => {
        if (socket.id === hostId) {
            challengerId = id;
            isMatchInProgress = true;
            io.emit('game_mode_change', { mode: 'PVP', challengerId: id });
        }
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
        }
    });

    socket.on('request_rematch', () => {
        io.emit('rematch_started');
    });

    socket.on('disconnect', () => {
        userCount--;
        io.emit('visitor_count', userCount);

        if (socket.id === hostId) {
            hostId = null;
            challengerId = null;
            isMatchInProgress = false;
            io.emit('reset_game'); // Forces everyone to find a new host
        } else if (socket.id === challengerId) {
            challengerId = null;
            isMatchInProgress = false;
            io.emit('challenger_left'); // Tells host to go back to AI
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));