const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Server-as-Master: Single cozy room state
let roomState = {
  videoUrl: '',
  currentTime: 0,
  isPlaying: false,
  lastUpdated: Date.now()
};

io.on('connection', (socket) => {
  console.log('💕 User joined the cinema. Total:', io.engine.clientsCount);

  // Graceful late-joiner: Send full current state
  socket.emit('roomState', roomState);

  socket.on('loadVideo', (url) => {
    roomState.videoUrl = url;
    roomState.currentTime = 0;
    roomState.isPlaying = false;
    roomState.lastUpdated = Date.now();
    io.emit('videoLoaded', roomState);
  });

  socket.on('play', ({ currentTime }) => {
    roomState.isPlaying = true;
    roomState.currentTime = currentTime || roomState.currentTime;
    roomState.lastUpdated = Date.now();
    socket.broadcast.emit('syncPlay', { currentTime: roomState.currentTime });
  });

  socket.on('pause', ({ currentTime }) => {
    roomState.isPlaying = false;
    roomState.currentTime = currentTime || roomState.currentTime;
    roomState.lastUpdated = Date.now();
    socket.broadcast.emit('syncPause', { currentTime: roomState.currentTime });
  });

  socket.on('seek', ({ currentTime }) => {
    roomState.currentTime = currentTime;
    roomState.lastUpdated = Date.now();
    socket.broadcast.emit('syncSeek', { currentTime: roomState.currentTime });
  });

  // For drift correction queries
  socket.on('getState', () => socket.emit('roomState', roomState));

  socket.on('disconnect', () => {
    console.log('User left. Remaining:', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎥 Private Cinema server running on ${PORT}`));