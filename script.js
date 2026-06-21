// Private Cinema Client - Minimalist sync for date nights

// Socket URL from Render env or fallback
const SOCKET_URL = window.ENV?.SOCKET_URL || 'https://YOUR-BACKEND.onrender.com';
const socket = io(SOCKET_URL);

const DEBUG_VIDEO_URL = 'https://media.w3.org/2010/05/sintel/trailer.mp4';

// DOM Elements
const passwordScreen = document.getElementById('passwordScreen');
const passwordInput = document.getElementById('passwordInput');
const enterBtn = document.getElementById('enterBtn');
const passwordError = document.getElementById('passwordError');

function checkPassword() {
  const pwd = passwordInput.value.trim();
  socket.emit('verifyPassword', pwd);
}

socket.on('passwordResult', (isValid) => {
  if (isValid) {
    passwordScreen.style.display = 'none';
    initCinema();
  } else {
    passwordError.style.opacity = '1';
    setTimeout(() => passwordError.style.opacity = '0', 2000);
    passwordInput.value = '';
    passwordInput.focus();
  }
});

if (enterBtn && passwordInput) {
  enterBtn.addEventListener('click', checkPassword);
  passwordInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') checkPassword();
  });
}

// Main cinema init (called only after successful password check)
function initCinema() {
  const video = document.getElementById('video');
  const urlInput = document.getElementById('urlInput');
  const loadBtn = document.getElementById('loadBtn');
  const debugVideoBtn = document.getElementById('debugVideoBtn');
  const heartbeat = document.getElementById('heartbeat');
  const statusEl = document.getElementById('status');

  let isRemoteSync = false;
  let syncCheckInterval = null;
  let remoteSyncTimer = null;

  function holdRemoteSync(ms = 250) {
    isRemoteSync = true;
    clearTimeout(remoteSyncTimer);
    remoteSyncTimer = setTimeout(() => {
      isRemoteSync = false;
    }, ms);
  }

  // Heartbeat for that warm, connected feel
  function updateHeartbeat(status) {
    heartbeat?.classList.remove('synced', 'jitter');
    if (status === 'synced') {
      heartbeat?.classList.add('synced');
      if (statusEl) statusEl.textContent = 'In perfect sync 💕';
    } else if (status === 'jitter') {
      heartbeat?.classList.add('jitter');
      if (statusEl) statusEl.textContent = 'Adjusting...';
    } else {
      if (statusEl) statusEl.textContent = 'Connected';
    }
  }

  function loadVideoUrl(url) {
    const nextUrl = url.trim();
    if (nextUrl) socket.emit('loadVideo', nextUrl);
  }

  loadBtn.addEventListener('click', () => loadVideoUrl(urlInput.value));
  debugVideoBtn?.addEventListener('click', () => {
    urlInput.value = DEBUG_VIDEO_URL;
    loadVideoUrl(DEBUG_VIDEO_URL);
  });

  ['play', 'pause', 'seeked'].forEach(evt => {
    video.addEventListener(evt, () => {
      if (isRemoteSync) return;
      const data = { currentTime: video.currentTime, clientSentAt: Date.now() };
      if (evt === 'play') socket.emit('play', data);
      if (evt === 'pause') socket.emit('pause', data);
      if (evt === 'seeked') socket.emit('seek', data);
    });
  });

  socket.on('connect', () => updateHeartbeat('connected'));
  socket.on('disconnect', () => {
    if (statusEl) statusEl.textContent = 'Reconnecting...';
  });

  socket.on('roomState', (state) => {
    if (state.videoUrl) {
      applyState(state);
    }
  });

  socket.on('videoLoaded', (state) => applyState(state));

  function getTargetTime(state) {
    if (typeof state.currentTime !== 'number' || !Number.isFinite(state.currentTime)) return null;
    if (!state.isPlaying || typeof state.serverTime !== 'number') return state.currentTime;

    const elapsedSinceServerSnapshot = Math.max(0, (Date.now() - state.serverTime) / 1000);
    return state.currentTime + elapsedSinceServerSnapshot;
  }

  function syncCurrentTime(targetTime, threshold = 0.75) {
    if (typeof targetTime !== 'number' || !Number.isFinite(targetTime)) return;

    const clampedTime = video.duration ? Math.min(targetTime, video.duration) : Math.max(0, targetTime);
    const drift = clampedTime - video.currentTime;

    if (Math.abs(drift) > threshold) {
      updateHeartbeat('jitter');
      video.currentTime = clampedTime;
      video.playbackRate = 1;
    } else if (!video.paused && Math.abs(drift) > 0.15) {
      // Smooth out tiny network jitter without causing visible seek jumps.
      video.playbackRate = drift > 0 ? 1.05 : 0.95;
      setTimeout(() => {
        if (!video.paused) video.playbackRate = 1;
      }, 1000);
    }
  }

  function applyState(state) {
    holdRemoteSync(400);

    if (video.src !== state.videoUrl) {
      video.src = state.videoUrl;
      video.load();
    }

    const targetTime = getTargetTime(state);
    syncCurrentTime(targetTime);

    if (state.isPlaying) {
      video.play().catch(() => console.log('Autoplay prevented'));
    } else {
      video.pause();
      video.playbackRate = 1;
    }

    updateHeartbeat('synced');
  }

  socket.on('syncPlay', (state) => {
    holdRemoteSync(300);
    syncCurrentTime(getTargetTime({ ...state, isPlaying: true }), 0.25);
    video.play().catch(() => {});
  });

  socket.on('syncPause', (state) => {
    holdRemoteSync(300);
    syncCurrentTime(getTargetTime({ ...state, isPlaying: false }), 0.25);
    video.pause();
    video.playbackRate = 1;
  });

  socket.on('syncSeek', (state) => {
    holdRemoteSync(300);
    syncCurrentTime(getTargetTime(state), 0.25);
  });

  // Drift correction: Server master + client check
  function startSyncChecks() {
    if (syncCheckInterval) clearInterval(syncCheckInterval);
    syncCheckInterval = setInterval(() => {
      if (!video.src || !Number.isFinite(video.duration)) return;
      socket.emit('getState');
    }, 1500);
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
}

// Start with password screen focused when present; otherwise initialize immediately.
if (passwordInput) {
  passwordInput.focus();
} else {
  initCinema();
}
