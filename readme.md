# 🏓 Live Hero Pong

An interactive, real-time multiplayer Pong game designed to live in a website's Hero section. 

## 🚀 The Concept
- **Solo Mode:** When a user lands on the page, they play against a simple AI.
- **Spectator Mode:** Subsequent visitors see the active game in real-time.
- **PVP Challenge:** Visitors can challenge the Host. If accepted, the AI is disabled, and the visitor takes control of the right paddle.
- **Tech:** Node.js, Socket.io, HTML5 Canvas.

## 🛠 Project Structure
- `/public/index.html` - Single-file frontend containing Canvas logic, touch handlers, and Socket.io client.
- `server.js` - Node.js backend managing room states, role assignments, and data relay.
- `package.json` - Dependency management and start scripts for Render/Fly.io.

## 📱 Mobile Features
- **Touch Control:** Uses `touch-action: none` to allow paddle control without page scrolling.
- **Orientation Lock:** Includes a CSS-based landscape prompt for better playability.
- **Responsive:** Canvas scales to fit viewport width while maintaining a 2:1 aspect ratio.

## ⚙️ Local Setup
1. Clone the repository.
2. Install dependencies:
   ```npm install```
3. Start the server:
```npm start```
4. Open `http://localhost:3000` in two different browser windows to test the multiplayer/challenge flow.