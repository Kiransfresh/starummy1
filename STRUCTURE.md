# Rummy 101 Game - Code Structure & Table Layout

## 📊 Overall Architecture

```
GameScreen.jsx (Main Container)
├── Top Bar Section
├── TABLE ZONE (Central Area)
│   ├── GameTable / GameTableModern (Background & Visual Effects)
│   ├── PlayersAroundTable (AI Players positioned around table)
│   └── CenterArea (Draw pile, Discard pile, Declare button)
└── BOTTOM ZONE (Player Interface)
    ├── PlayerHand (Player's 13 cards)
    ├── Controls (Sort, Discard, Declare, Drop buttons)
    └── Player Seat Info (Score display)
```

---

## 🎮 Main Screen Layout (GameScreen.jsx)

### Grid Structure
```javascript
<div style={{
  width: '100vw',
  height: '100dvh',
  display: 'grid',
  gridTemplateRows: isMobileLandscape
    ? 'auto minmax(0, 1fr) minmax(148px, 34vh)'    // Mobile: Top | Middle | Bottom
    : 'auto minmax(0, 1fr) auto',                   // Desktop: Top | Middle | Bottom
}}>
```

### Sections:

#### 1. **TOP BAR** (TopBar.jsx)
- Player score `/101`
- Back button
- Report issue button

#### 2. **TABLE ZONE** (Central area)
- Positioned with flex, centered
- Size: `min(94vw, 760px)` width, aspect ratio 2:1
- **Contains 3 layers:**

  a) **GameTable / GameTableModern** (Background)
     - Elliptical felt table background
     - Gradient glow effects
     - Animated pulsing effect
     - Background image: `/assets/Table.png`
     - Animated shadows and borders

  b) **PlayersAroundTable** (AI players)
     - 5 AI players positioned around the table
     - Each seat shows:
       - Player name
       - Hand of cards (face-down)
       - Active state indicator (glow ring)
       - Animation for draw/discard actions

  c) **CenterArea** (Game controls & decks)
     - Wild joker display (top)
     - Draw pile (left) - with ripple animation
     - Discard pile (right) - top card visible
     - Timer display
     - Declare button (bottom)

#### 3. **BOTTOM ZONE** (Player controls)
- Player hand display (DnD-capable)
- Control buttons (Sort, Discard, Declare, Drop)
- Player status indicator

---

## 🎨 Table Visual Structure

### GameTableModern Component Details

```
┌─────────────────────────────────────┐
│         TABLE BACKGROUND            │
├─────────────────────────────────────┤
│                                     │
│    AI Player 1              AI 2   │
│         ↓                    ↓      │
│   [CARDS]               [CARDS]    │
│                                     │
│  AI 5         CENTER AREA         AI 3
│  [CARDS]   [WILD] [DRAW] [DISCARD] [CARDS]
│            [JOKER]               
│                                     │
│    AI Player 4              AI 3   │
│         ↓                    ↓      │
│   [CARDS]               [CARDS]    │
│                                     │
└─────────────────────────────────────┘

         ┌──────────────────┐
         │   PLAYER HAND    │
         │  13 CARDS (DnD)  │
         └──────────────────┘
     ┌────────────────────────────┐
     │  CONTROLS  │  PLAYER SCORE │
     └────────────────────────────┘
```

---

## 🎴 Card Data Structure

### Card Object
```javascript
{
  id: 54,                    // Unique identifier
  rank: 'A' | '2'-'9' | '10' | 'J' | 'Q' | 'K' | '🃏',
  suit: '♠' | '♥' | '♦' | '♣' | '' (for jokers),
  pts: 0-10,                 // Points value
  isJoker: boolean,          // Printed joker
  isWildJoker: boolean,      // Wild joker (marked by rank)
}
```

---

## 🔄 Game State Management

### State Variables (GameScreen)
```javascript
// Game flow
gameState: 'dealing' | 'draw' | 'discard' | 'finished'
currentTurn: 0-5 (which player's turn)
isPlayerTurn: boolean

// Player data
playerHand: Card[]
selectedCard: Card | null
playerScore: number
aiPlayers: Array<{
  id: number,
  name: string,
  hand: Card[],
  score: number,
  isEliminated: boolean
}>

// Piles
drawPile: Card[]
discardPile: Card[]
wildJoker: Card

// UI & Animation
gameState: 'dealing' | 'draw' | 'discard' | 'finished'
hasDrawn: boolean
selectedCard: Card | null
groupFlash: { [groupIndex]: 'valid' | 'invalid' }
flyingCard: { card, fromPile, toHand }
aiActionAnim: { type: 'draw'|'discard', playerIndex }
confetti: Array<confetti pieces>
```

---

## 🎯 Game Logic Flow

### Turn Sequence
```
1. DEALING PHASE
   ├─ Shuffle deck
   ├─ Deal 13 cards to each player
   ├─ Set up draw/discard piles
   └─ Animate card dealing

2. PLAYER TURN (for each player)
   ├─ DRAW: Player draws from pile
   │  ├─ fromPile: false → draw pile
   │  └─ fromPile: true  → discard pile (open deck)
   │
   ├─ DISCARD: Player discards one card
   │  └─ Can declare instead of discard
   │
   └─ Next player turn

3. DECLARE (Win condition)
   ├─ Must have exactly 13 cards
   ├─ Must have:
   │  ├─ 1 Pure Sequence (3+ consecutive, same suit, no joker)
   │  ├─ At least 2 Sequences total
   │  └─ All remaining cards in valid groups (Seq/Set)
   │
   └─ If valid → WIN, else → round continues

4. SCORING
   ├─ Winner: 0 points
   ├─ Others: Sum of unmatched cards
   └─ First to 101+ points is ELIMINATED
```

---

## 📁 File Structure

### Screens (`/src/screens/`)
| File | Purpose |
|------|---------|
| `GameScreen.jsx` | Main game container & state management |
| `GameTableModern.jsx` | Animated table visual (background/felt) |
| `GameTable.jsx` | Alternative table design |
| `PlayersAroundTable.jsx` | AI players positioning & display |
| `CenterArea.jsx` | Draw/Discard piles & declare button |
| `PlayerHand.jsx` | Player's 13 cards (drag & drop) |
| `Controls.jsx` | Sort, Discard, Declare, Drop buttons |
| `TopBar.jsx` | Score, back button, report |
| `Scoreboard.jsx` | Round scores & elimination tracker |
| `RummyCardAnimations.jsx` | Card animations & effects |

### Game Engine (`/src/game/`)
| File | Purpose |
|------|---------|
| `engine.js` | Core 101 Rummy rules & validation |
| `gameEngine.js` | Alternative game logic |

### Utilities & Config
| File | Purpose |
|------|---------|
| `/src/store.js` | Zustand state management |
| `/src/utils/alignmentConfig.js` | Card alignment calculations |
| `/src/services/` | Socket, SMS, User, ReCaptcha services |

---

## 🎨 Color & Style Constants

```javascript
const C = {
  bg: '#0a0f0d',                    // Background
  tableFelt: '#1e7a3e',              // Table green
  topBar: 'rgba(0,0,0,0.85)',        // Top bar
  gold: '#F5C518',                   // Highlight/Gold
  white: '#ffffff',                  // White
  grey: 'rgba(255,255,255,0.5)',     // Grey
  cardRed: '#d32f2f',                // Red suits
  cardBlack: '#1a1a1a',              // Black suits
  purpleDark: '#2d0a4a',             // Card back dark
  purpleMid: '#4a1a6a',              // Card back mid
  btnBorder: 'rgba(255,255,255,0.15)', // Button border
  green: '#22c55e',                  // Success/Valid
}
```

---

## 🎭 Animation Types

### Card Animations
- **Deal Animation**: Cards fly from deck to hand
- **Discard Animation**: Card flies to discard pile
- **Draw Animation**: Pop effect when drawing
- **Selection Animation**: Card lifts up when selected

### Table Animations
- **Pulsing Glow**: Animated table effect (4.2s loop)
- **Turn Pulse**: Gold pulse on active player
- **Valid Flash**: Green flash for valid groups
- **Invalid Shake**: Red shake for invalid groups
- **Confetti**: Falling pieces on win

---

## 🔧 How to Replace Table

### Current Table Components
1. **Background**: `GameTableModern` or `GameTable`
   - Contains: Elliptical shape, gradient, glow effects
   - Size: Responsive 2:1 aspect ratio
   - Position: Absolute, centered

2. **Player Positions**: `PlayersAroundTable`
   - 5 AI players positioned using calculated positions
   - Cards displayed as stacks (back-side up)

3. **Center Area**: `CenterArea`
   - Draw pile, Discard pile, Declare button
   - Wild joker display

### To Replace:
1. **Modify `GameTableModern.jsx`**: Change background image/styling
2. **Adjust `PlayersAroundTable.jsx`**: Reposition player seats if needed
3. **Update `CenterArea.jsx`**: Relocate draw/discard/declare button
4. **Adjust sizing in `GameScreen.jsx`**: Table zone dimensions

---

## 📱 Responsive Breakpoints

```javascript
const isMobileLandscape = isLandscape && viewportHeight < 600
const isShortLandscape = isLandscape && viewportWidth < 900
const tableCompact = isMobileLandscape || isShortLandscape

// Dimensions adjust based on:
gridTemplateRows: isMobileLandscape ? 'auto minmax(0, 1fr) minmax(148px, 34vh)' : '...'
cardW/cardH: Recalculated for viewport
padding/gaps: Compressed for mobile
```

---

## 🎯 Key Entry Points to Modify

| Component | When to Modify |
|-----------|----------------|
| `GameScreen.jsx` | Change layout, add sections |
| `GameTableModern.jsx` | Change table background/visual |
| `PlayersAroundTable.jsx` | Reposition AI players |
| `CenterArea.jsx` | Move deck/declare button |
| `PlayerHand.jsx` | Change hand layout/styling |
| `Controls.jsx` | Add/remove control buttons |

---

## 💾 State Flow Diagram

```
GAME STARTS
    ↓
  DEAL (Animate cards flying)
    ↓
  PLAYER TURN (Turn 0)
    ├─ DRAW PHASE (Draw pile or open deck)
    │  ├─ Calculate valid draw options
    │  ├─ Animate card flying to hand
    │  └─ State: hasDrawn = true
    │
    └─ DISCARD PHASE
       ├─ Player selects card
       ├─ Option 1: Discard (normal)
       │  ├─ Animate card to discard pile
       │  └─ Next player turn
       │
       └─ Option 2: Declare (if valid)
          ├─ Validate hand
          ├─ Calculate scores
          └─ Show winner/scoreboard
```

---

## 🚀 Performance Considerations

- **Animations**: CSS keyframes (not JavaScript driven)
- **Drag & Drop**: DnD-kit library (optimized)
- **State Updates**: Zustand (minimal re-renders)
- **Card Rendering**: React.memo where applicable
- **Piles**: Arrays with immutable updates (spread operator)

---

**Last Updated**: 2024
**Framework**: React + Framer Motion + Vite
