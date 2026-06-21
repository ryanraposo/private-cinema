// script.js - Date-night optimized: remoteSync flag, drift correction, heartbeat
const socket = io('https://your-backend.onrender.com'); // ← Update with your Render backend URL

const video = document.getElementById('video');
const urlInput = document.getElementById('urlInput');
const loadBtn = document.getElementById('loadBtn');
const heartbeat = document.getElementById('heartbeat');

let isRemoteSync = false;

function updateHeartbeat(status) {
  heartbeat.classList.remove('synced', 'jitter');
  if (status === 'synced') heartbeat.classList.add('synced');
  else if (status === 'jitter') heartbeat.classList.add('jitter');
}

loadBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (url) socket.emit('loadVideo', url);
});

['play', 'pause', 'seeked'].forEach(ev => {
  video.addEventListener(ev, () => {
    if (isRemoteSync) return;
    const payload = { currentTime: video.currentTime };
    if (ev === 'play') socket.emit('play', payload);
    else if (ev === 'pause') socket.emit('pause', payload);
    else socket.emit('seek', payload);
  });
});

socket.on('connect', () => console.log('Connected 💕'));
socket.on('roomState', state => { if (state.videoUrl) applyState(state); });
socket.on('videoLoaded', applyState);

function applyState(state) {
  if (video.src !== state.videoUrl) video.src = state.videoUrl;
  video.currentTime = state.currentTime || 0;
  state.isPlaying ? video.play() : video.pause();
  updateHeartbeat('synced');
}

socket.on('syncPlay', d => { isRemoteSync=true; video.currentTime=d.currentTime; video.play(); setTimeout(()=>isRemoteSync=false,150); });
socket.on('syncPause', d => { isRemoteSync=true; video.currentTime=d.currentTime; video.pause(); setTimeout(()=>isRemoteSync=false,150); });
socket.on('syncSeek', d => { isRemoteSync=true; video.currentTime=d.currentTime; setTimeout(()=>isRemoteSync=false,150); });

// Drift correction every 3s
setInterval(() => {
  if (video.src && !video.paused) socket.emit('getState');
}, 3000);

console.log('%c❤️ Private Cinema ready — enjoy your perfect night', 'color:#ff6b6b; font-size:1.1em');