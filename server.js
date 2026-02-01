const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

// Store the socket ID of the active player (Host)
let hostId = null;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // If no host exists, this user becomes the host
    if (!hostId) {
        hostId = socket.id;
        socket.emit('role', 'HOST');
        console.log(`User ${socket.id} is now the HOST.`);
    } else {
        // If a host exists, this user becomes a spectator/challenger
        socket.emit('role', 'SPECTATOR');
        console.log(`User ${socket.id} is a SPECTATOR.`);
    }

    // HOST sends game state (Ball pos, Paddle pos, etc.)
    socket.on('host_update', (gameState) => {
        // Broadcast this state to everyone EXCEPT the sender (the host)
        socket.broadcast.emit('spectator_update', gameState);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.id === hostId) {
            hostId = null;
            // Ideally, you'd promote the next user to host here
            console.log('Host left. Slot open.');
        }
    });
});

server.listen(3000, () => {
    console.log('Pong Server running on *:3000');
});