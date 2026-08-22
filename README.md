# 101 Pool Rummy — Complete Clone

A full-stack 101 Pool Rummy game built with React + Vite (frontend) and Node.js + Socket.IO (backend).

## 🎮 Features

- **Splash Screen** — Animated loading with card game branding
- **OTP Login** — Phone number authentication flow (demo accepts any OTP)
- **Game Lobby** — Home screen with 101 Pool and Private Room modes
- **Game Mode Selection** — Choose entry fee (100/500/1000/2000 coins), 6 player tables
- **Private Room** — Create room with auto-generated 6-char code, share with friends
- **Join Room** — Enter code to join a friend's private game
- **Subscription** — ₹999 (6,000 coins) or ₹1999 (20,000 coins) per month plans
- **Live Game** — Full 101 Pool Rummy with:
  - Oval felt table
  - AI opponents with smart moves
  - Draw from pile / open discard
  - Card selection & discard
  - Wild joker system
  - Declare modal with group arrangement
  - Drop with penalty (20 first drop / 40 middle drop)
  - Turn timer (30 seconds)
  - Score tracking (eliminated at 101 points)
  - Game results with win/loss screen

---

## 🚀 Quick Start

### 1. Install frontend dependencies
```bash
npm install
```

### 2. Install backend dependencies
```bash
cp server-package.json backend-package.json
mkdir -p server && cp server.js server/
cd server
npm install express socket.io
```

### 3. Run both servers

**Terminal 1 — Frontend:**
```bash
npm run dev
```
Open: http://localhost:3000

**Terminal 2 — Backend:**
```bash
node server.js
```
Runs on port 4000

---

## 🃏 How to Play

1. Enter your phone number → any 6-digit OTP will work in demo mode
2. Choose **101 Pool** for a game vs AI opponents, or **Private Room** to play with friends
3. Select entry fee and table size (4 or 6 players)
4. In game:
   - **Tap the draw pile** or **open discard** to draw a card
   - **Tap a card** in your hand to select/discard it (tap selected card to discard)
   - **DECLARE** button opens the group-arrangement modal when you think you're ready
   - **DROP** to exit the hand with a 20-point penalty (40 if you've already drawn)
5. First to validly declare wins! Last player to reach 101 points is eliminated

---

## 🏗️ Project Structure

```
rummy101/
├── src/
│   ├── App.jsx              # Main router
│   ├── main.jsx             # React entry point
│   ├── index.css            # Global styles & theme
│   ├── store.js             # Zustand global state
│   ├── game/
│   │   └── engine.js        # Complete Rummy game logic
│   └── screens/
│       ├── SplashScreen.jsx
│       ├── OTPScreen.jsx
│       ├── LobbyScreen.jsx
│       ├── GameModeScreen.jsx
│       ├── PrivateRoomScreen.jsx   # CreateRoom + JoinRoom
│       ├── SubscriptionScreen.jsx
│       └── GameScreen.jsx   # Main gameplay
├── server.js                # Node.js + Socket.IO backend
├── server-package.json      # Backend deps
├── vite.config.js
├── package.json
└── index.html
```

---

## 🎨 UI Design

Matches the reference screenshots with:
- **Dark green felt** color palette (`#0a1a0f` → `#1e5228`)
- **Gold/orange** accents (`#f5c842` → `#ff7a00`)
- **Orbitron** font for numbers, **Exo 2** for UI, **Rajdhani** for labels
- Oval poker table with stitched border
- Player seats with active pulse animation
- Card fan hand at the bottom

---

## 🔧 Extending for Real Multiplayer

The Socket.IO backend is already wired. To enable real multiplayer:
1. Deploy `server.js` to Railway / Render / any Node host
2. Update the proxy in `vite.config.js` to point to your deployed backend
3. The `useSocket` hook pattern is ready — connect it in `GameScreen.jsx`

For production OTP, replace the demo store in `server.js` with [MSG91](https://msg91.com/) or [Twilio](https://twilio.com/)

---

## 📱 101 Pool Rummy Rules

- 13 cards dealt to each player from 2 standard decks + 2 jokers
- Wild joker is randomly selected at game start
- **Objective**: Form valid groups before your score reaches 101 points
- **Valid Declaration**: Min 2 sequences (at least 1 pure) + remaining valid groups
- **Pure Sequence**: Consecutive same-suit cards with NO jokers
- **Impure Sequence**: Consecutive same-suit with joker(s) substituting
- **Set**: 3-4 cards of same rank, different suits
- **First Drop**: 20 points penalty
- **Middle Drop**: 40 points penalty  
- **Wrong Declaration**: 80 points penalty
- **Elimination**: Player eliminated when score ≥ 101 points
- **Winner**: Last player remaining!
