const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

// Security: Max 1kb per packet to prevent buffer overflow attacks
const io = new Server(server, {
    maxHttpBufferSize: 1e3 
});

app.use(express.static('public'));

let hostId = null;
let challengerId = null;

// Validation Helper: Checks if the data is a valid Pong state
function isValidState(data) {
    return data && 
           typeof data.playerY === 'number' && 
           typeof data.opponentY === 'number' &&
           data.ball && typeof data.ball.x === 'number';
}

io.on('connection', (socket) => {
    userCount++;
    broadcastUserCount(); // Notify everyone someone joined
    console.log(`Users online: ${userCount}`);
    
    if (!hostId) {
        hostId = socket.id;
        socket.emit('role', 'HOST');
    } else {
        socket.emit('role', 'SPECTATOR');
    }

    // FIX: Relay challenge and confirm to Challenger
    socket.on('challenge_request', () => {
        if (hostId && socket.id !== hostId) {
            io.to(hostId).emit('challenge_received', socket.id);
            socket.emit('challenge_pending'); // Tell challenger it's sent
        }
    });

    socket.on('accept_challenge', (id) => {
        if (socket.id === hostId) {
            challengerId = id;
            io.emit('game_mode_change', { mode: 'PVP', challengerId: id });
        }
    });

    // SECURITY: Validate host data before broadcasting
    socket.on('host_update', (gameState) => {
        if (socket.id === hostId && isValidState(gameState)) {
            socket.broadcast.emit('spectator_update', gameState);
        }
    });

    // SECURITY: Validate P2 movement data (must be a number)
    socket.on('p2_move', (y) => {
        if (socket.id === challengerId && typeof y === 'number') {
            io.to(hostId).emit('p2_update', y);
        }
    });

    socket.on('match_finished', (data) => {
        if (socket.id === hostId) {
            io.emit('game_over', data);
        }
    });

    socket.on('request_rematch', () => {
        // In a simple version, we just reset for everyone immediately
        // In a complex version, you'd wait for both to click 'Rematch'
        io.emit('rematch_started');
    });

    socket.on('disconnect', () => {
        userCount--;
        broadcastUserCount(); // Notify everyone someone left
        if (socket.id === hostId) {
            hostId = null;
            challengerId = null;
            io.emit('reset_game');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Secure Server on ${PORT}`));