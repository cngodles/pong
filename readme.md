# 🏓 Live Hero Pong

Real-time multiplayer Pong designed for a website hero section. One visitor plays immediately, others can watch live or challenge for PVP.

## ✨ Features
- **Solo vs AI:** First visitor plays a lightweight bot.
- **Spectator Mode:** Additional visitors see the live match state.
- **PVP Challenge:** Challenger can take over the right paddle when accepted.
- **Mobile-Ready:** Touch input, responsive canvas, and landscape prompt.
- **Hero-Friendly:** Lightweight, full-bleed canvas suitable for landing pages.

## 🧠 How It Works
- **Roles:** First connection is the Host (authoritative physics). Second is Challenger (PVP). Others are Spectators.
- **Data Flow:** Host simulates physics at ~60fps and broadcasts state. Challenger sends Y-axis input through the server relay.
- **Match Rules:** First to 5 wins. Match locks prevent double-starts. Rematch requires handshake.

## 🧱 Tech Stack
- **Backend:** Node.js + Express + Socket.io (Render/Fly.io friendly).
- **Frontend:** HTML5 Canvas + Vanilla JS + CSS3.

## 🗂 Project Structure
- `public/index.html` - Single-file frontend with Canvas rendering, touch handlers, and Socket.io client logic.
- `server.js` - Server-side room logic, role assignment, validation, and relay.
- `package.json` - Dependencies and start scripts.

## 📱 Mobile & UX Details
- **Touch Control:** Uses `touch-action: none` to prevent scrolling during play.
- **Orientation Prompt:** CSS-based landscape notice for better playability.
- **Responsive Canvas:** Scales to viewport while maintaining a 2:1 aspect ratio.
- **Server Wake UX:** Loading screen for cold-start hosts.

## ⚙️ Local Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000` in two different browser windows to test multiplayer/challenge flow.

## 🚀 Deployment
- Works on Render and Fly.io using `npm start`.
- Ensure WebSocket support is enabled on the host.

## 🌐 Quick Tunnel (Cloudflare)
Use a public URL while running locally.

1. Install `cloudflared` (Windows):
   ```bash
   winget install Cloudflare.cloudflared
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Start the tunnel:
   ```bash
   npm run tunnel
   ```
4. One-liner (server + tunnel in separate PowerShell windows):
   ```powershell
   Start-Process powershell "-NoExit","-Command","npm start"; Start-Process powershell "-NoExit","-Command","npm run tunnel"
   ```
5. Share the printed `https://<random>.trycloudflare.com` URL.

## ✅ Notes
- The Host is authoritative to keep physics consistent for all clients.
- Payloads are validated and capped (1kb) for safety.

## 📌 Next Ideas
- Visual polish (ball trail, glow, hit sparks).
- Matchmaking queue or “Next Up” challenger list.
- Replay or instant highlight for hero section loops.
