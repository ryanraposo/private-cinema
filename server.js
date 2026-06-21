const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- NEW: Grab the secret from Render environment ---
// This uses 'date-night' as a fallback if you test it locally
const CINEMA_SECRET = process.env.CINEMA_SECRET || 'date-night';

// Room state - server as master
let roomState = {
  videoUrl: '',
  currentTime: 0,
  isPlaying: false,
  lastUpdated: Date.now()
};

io.on('connection', (socket) => {
  console.log('👤 New connection. Total clients:', io.engine.clientsCount);

  // 1. Mark socket as unauthenticated initially
  socket.isAuthenticated = false;

  // 2. Handle the password check
  socket.on('verifyPassword', (attemptedPassword) => {
    if (attemptedPassword === CINEMA_SECRET) {
      socket.isAuthenticated = true;
      socket.emit('passwordResult', true);
      console.log('💕 User authenticated successfully.');
      
      // Send them the full state ONLY after they authenticate
      socket.emit('roomState', roomState);
    } else {
      socket.emit('passwordResult', false);
      console.log('❌ Failed authentication attempt.');
    }
  });

  // 3. Secure the control events (ignore if not authenticated)
  socket.on('loadVideo', (url) => {
    if (!socket.isAuthenticated) return;
    
    roomState.videoUrl = url;
    roomState.currentTime = 0;
    roomState.isPlaying = false;
    roomState.lastUpdated = Date.now();
    io.emit('videoLoaded', roomState);
  });

  socket.on('play', ({ currentTime }) => {
    if (!socket.isAuthenticated) return;

    roomState.isPlaying = true;
    roomState.currentTime = currentTime || roomState.currentTime;
    roomState.lastUpdated = Date.now();
    // Use broadcast so the sender doesn't receive their own play command
    socket.broadcast.emit('syncPlay', { currentTime: roomState.currentTime, serverTime: Date.now() });
  });

  socket.on('pause', ({ currentTime }) => {
    if (!socket.isAuthenticated) return;

    roomState.isPlaying = false;
    roomState.currentTime = currentTime || roomState.currentTime;
    roomState.lastUpdated = Date.now();
    socket.broadcast.emit('syncPause', { currentTime: roomState.currentTime });
  });

  socket.on('seek', ({ currentTime }) => {
    if (!socket.isAuthenticated) return;

    roomState.currentTime = currentTime;
    roomState.lastUpdated = Date.now();
    socket.broadcast.emit('syncSeek', { currentTime: roomState.currentTime });
  });

  // For heartbeat / advanced sync
  socket.on('getState', () => {
    if (!socket.isAuthenticated) return;
    socket.emit('roomState', roomState);
  });

  socket.on('disconnect', () => {
    console.log('👋 User left. Remaining:', io.engine.clientsCount);
  });
});

app.use(express.static('public')); // Local testing

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎥 Private Cinema server on http://localhost:${PORT}`);
});
