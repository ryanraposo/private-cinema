// Private Cinema Client - Minimalist sync for date nights
// Password is configurable in this file (shared secret)
const PASSWORD = 'date-night'; // ← Change this to your private secret

// Socket URL from Render env or fallback
const SOCKET_URL = window.SOCKET_URL || 'https://YOUR-BACKEND.onrender.com';
const socket = io(SOCKET_URL);

// Password handling
const passwordScreen = document.getElementById('passwordScreen');
const passwordInput = document.getElementById('passwordInput');
const enterBtn = document.getElementById('enterBtn');
const passwordError = document.getElementById('passwordError');

function checkPassword() {
  if (passwordInput.value.trim() === PASSWORD) {
    passwordScreen.style.display = 'none';
    initCinema();
  } else {
    passwordError.style.opacity = '1';
    setTimeout(() => passwordError.style.opacity = '0', 2000);
    passwordInput.value = '';
    passwordInput.focus();
  }
}

enterBtn.addEventListener('click', checkPassword);
passwordInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') checkPassword();
});

// Main cinema init (called after password)
function initCinema() {
  const video = document.getElementById('video');
  const urlInput = document.getElementById('urlInput');
  const loadBtn = document.getElementById('loadBtn');
  const heartbeat = document.getElementById('heartbeat');
  const statusEl = document.getElementById('status');

  let isRemoteSync = false;
  let syncCheckInterval = null;

// Heartbeat for that warm, connected feel
function updateHeartbeat(status) {
  heartbeat.classList.remove('synced', 'jitter');
  if (status === 'synced') {
    heartbeat.classList.add('synced');
    statusEl.textContent = 'In perfect sync 💕';
  } else if (status === 'jitter') {
    heartbeat.classList.add('jitter');
    statusEl.textContent = 'Adjusting...';
  } else {
    statusEl.textContent = 'Connected';
  }
}

loadBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (url) socket.emit('loadVideo', url);
});

['play', 'pause', 'seeked'].forEach(evt => {
  video.addEventListener(evt, () => {
    if (isRemoteSync) return;
    const data = { currentTime: video.currentTime };
    if (evt === 'play') socket.emit('play', data);
    if (evt === 'pause') socket.emit('pause', data);
    if (evt === 'seeked') socket.emit('seek', data);
  });
});

socket.on('connect', () => updateHeartbeat('connected'));
socket.on('disconnect', () => statusEl.textContent = 'Reconnecting...');

socket.on('roomState', (state) => {
  if (state.videoUrl) {
    applyState(state);
  }
});

socket.on('videoLoaded', (state) => applyState(state));

function applyState(state) {
  if (video.src !== state.videoUrl) {
    video.src = state.videoUrl;
  }
  video.currentTime = state.currentTime;
  if (state.isPlaying) {
    video.play().catch(e => console.log('Autoplay prevented'));
  } else {
    video.pause();
  }
  updateHeartbeat('synced');
}

socket.on('syncPlay', (data) => {
  isRemoteSync = true;
  video.currentTime = data.currentTime;
  video.play().catch(() => {});
  setTimeout(() => isRemoteSync = false, 150);
});

socket.on('syncPause', (data) => {
  isRemoteSync = true;
  video.currentTime = data.currentTime;
  video.pause();
  setTimeout(() => isRemoteSync = false, 150);
});

socket.on('syncSeek', (data) => {
  isRemoteSync = true;
  video.currentTime = data.currentTime;
  setTimeout(() => isRemoteSync = false, 150);
});

// Drift correction: Server master + client check
function startSyncChecks() {
  if (syncCheckInterval) clearInterval(syncCheckInterval);
  syncCheckInterval = setInterval(() => {
    if (!video.src || !video.duration) return;
    
    socket.emit('getState'); // Ask server for truth
  }, 3000);
}

video.addEventListener('loadedmetadata', startSyncChecks);

// Bonus: Keyboard shortcuts for cozy control (space = play/pause)
document.addEventListener('keydown', e => {
  if (e.key === ' ' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    if (video.paused) video.play(); else video.pause();
  }
});

console.log('%c❤️ Private Cinema initialized - enjoy your date night', 'color:#ff6b6b;font-weight:bold');

// Start with password screen
passwordInput.focus();
