const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

let hostId = null;
let challengerId = null;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- Role Assignment ---
    if (!hostId) {
        hostId = socket.id;
        socket.emit('role', 'HOST');
        console.log(`User ${socket.id} is now HOST.`);
    } else {
        socket.emit('role', 'SPECTATOR');
        console.log(`User ${socket.id} is a SPECTATOR.`);
    }

    // --- Core Game Loops ---

    // 1. Host sends state (Ball, Paddles, SCORE) to everyone
    // The 'gameState' object now includes scoreP1 and scoreP2
    socket.on('host_update', (gameState) => {
        socket.broadcast.emit('spectator_update', gameState);
    });

    // 2. Challenger moves paddle (sends input to Host)
    socket.on('p2_move', (y) => {
        if (hostId) {
            io.to(hostId).emit('p2_update', y);
        }
    });

    // --- Challenge Logic ---

    socket.on('challenge_request', () => {
        if (hostId) {
            io.to(hostId).emit('challenge_received', socket.id);
            console.log(`Challenge sent from ${socket.id} to Host`);
        }
    });

    socket.on('accept_challenge', (id) => {
        challengerId = id;
        console.log(`Challenge Accepted! Host vs ${id}`);
        
        // Broadcast event to switch everyone to PVP mode
        io.emit('game_mode_change', { 
            mode: 'PVP', 
            challengerId: id 
        });
    });

    // --- Disconnect Logic ---
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.id === hostId) {
            hostId = null;
            challengerId = null;
            console.log('Host left. Resetting game for all.');
            // Reload all clients to find a new host
            io.emit('reset_game'); 
        } else if (socket.id === challengerId) {
            // If the challenger leaves, we could optionally tell the host to revert to AI
            // For now, we'll just log it. The host will likely keep playing alone.
            challengerId = null;
            console.log('Challenger left.');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Pong Server running on port ${PORT}`);
});