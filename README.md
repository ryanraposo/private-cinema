# Private Cinema ❤️

A minimalist, intimate synced video player for couples. Built with **Node.js + Socket.io** (backend) and **Vanilla JS** (frontend). Server-as-Master architecture for perfect sync.

## Features
- Paste any direct video URL (mp4/webm)
- Real-time play/pause/seek sync
- Drift correction every 3s
- Heartbeat indicator (blue → green → yellow)
- **Shared password protection** (settable secret)
- Graceful late joiner support

## Password (Shared Secret)
The default password is **`date-night`**. 

**To change it:**
1. Edit `script.js`
2. Update the `PASSWORD` constant
3. Redeploy

## Deploy on Render (Recommended)

1. Fork / use this repo
2. Go to [Render Dashboard](https://dashboard.render.com) → **New Blueprint**
3. Connect `ryanraposo/private-cinema` (or your fork)
4. Render auto-detects `render.yaml` and deploys **server** + **frontend**
5. After backend deploys, set **Environment Variable** on the frontend service:
   - `SOCKET_URL` = your backend URL (e.g. `https://private-cinema-server.onrender.com`)
6. Redeploy frontend

## Local Development

```bash
# Backend
npm install
npm start

# Frontend
Open index.html in browser
```

**Share the frontend URL + your secret password with your partner.**

Perfect for cozy date nights. Enjoy the sync! 💕

*Made with ❤️ for real couples.*