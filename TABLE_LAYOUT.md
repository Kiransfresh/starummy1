# Table Layout Visual Guide

## Physical Table Layout

```
                    ╔════════════════════════════════════════╗
                    ║        GAME TABLE CENTER VIEW         ║
                    ║      (2:1 Aspect Ratio, Responsive)   ║
                    ╚════════════════════════════════════════╝

   ┌──────────────────────────────────────────────────────────────────┐
   │                                                                  │
   │         AI Player 1 (Top-Left)         AI Player 2 (Top-Right)  │
   │              [CARDS]                          [CARDS]            │
   │                                                                  │
   │  AI Player 5                         TABLE FELT                AI Player 3
   │  (Left)                           ┌──────────────┐            (Right)
   │  [CARDS]                          │              │             [CARDS]
   │                                   │   [WILD]     │
   │                                   │    JOKER     │
   │                                   │              │
   │                                   │ [DRAW] [OPEN]│
   │                                   │              │
   │                                   │  [DECLARE]   │
   │                                   └──────────────┘
   │                                                                  │
   │         AI Player 4 (Bottom-Left)    AI Player 3 (Bottom-Right)│
   │              [CARDS]                        [CARDS]             │
   │                                                                  │
   └──────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────┐
   │  👤 YOU                                  [SORT] [DECLARE] [DROP] │
   │  YOU: 45/101                                                     │
   │  ┌─────────────────────────────────────────────────────────────┐ │
   │  │  [A♠] [2♥] [3♦] [4♣] [5♠] [J♥] [Q♦] [K♣] [10♠] [9♥] [...] │ │
   │  │         ↑ (Selected card highlighted in gold)              │ │
   │  └─────────────────────────────────────────────────────────────┘ │
   └──────────────────────────────────────────────────────────────────┘
```

---

## Component Positioning System

### **CENTER AREA (CenterArea.jsx)** - Fixed in middle
```
    Wild Joker (Top)
         ↓
    [🃏 Card Icon]
         ↓
    Draw Pile [Closed] ←→ Discard Pile [Open]
    (Left)                (Right)
         ↓
    Declare Button
```

### **AI PLAYERS (PlayersAroundTable.jsx)** - Positioned around table

```javascript
// Approximate positioning calculations:
Position 1 (Top-Left):    x: 15%, y: 18%
Position 2 (Top-Right):   x: 85%, y: 18%
Position 3 (Right):       x: 92%, y: 50%
Position 4 (Bottom-Right):x: 85%, y: 82%
Position 5 (Bottom-Left): x: 15%, y: 82%
```

Each AI player displays:
```
  ┌──────────────┐
  │   AI NAME    │ ← Name label
  ├──────────────┤
  │  [💜] [💜]  │ ← Card backs (hand count)
  │  [💜] [💜]  │
  │  [💜] ...   │
  └──────────────┘
  
  Optional: Glow ring if their turn (active: true)
```

---

## TABLE FELT STYLING (GameTableModern.jsx)

### **Shape & Dimensions**
```javascript
{
  position: 'relative',
  width: '100%',
  height: '100%',
  aspectRatio: '2 / 1',           // 2:1 ratio (standard poker table)
  borderRadius: '46% / 52%',       // Elliptical shape
  backgroundColor: '#0b1410',      // Dark green base
  backgroundImage: "url('/assets/Table.png')",  // Texture overlay
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}
```

### **Visual Effects**
```javascript
{
  // Shadows & Depth
  boxShadow: [
    '0 30px 80px rgba(0,0,0,0.72)',      // Outer shadow (depth)
    'inset 0 0 120px rgba(24, 132, 76, 0.22)',  // Inner green glow
    '0 0 0 2px rgba(255,255,255,0.06)',  // Border line
  ],
  
  // Animations
  animate: {
    scale: [1, 1.006, 1],     // Subtle breathing effect
  },
  transition: {
    duration: 4.2,            // 4.2 second cycle
    repeat: Infinity,
    ease: 'easeInOut',
  },
}
```

### **Layer Breakdown**
```
Layer 1: Background gradient (radial center → edges darker)
         ↓
Layer 2: Table.png texture overlay
         ↓
Layer 3: Inner shadow (inset glow) - adds depth
         ↓
Layer 4: Border line (subtle rim)
         ↓
Layer 5: Animated glow effect (radial pulse in center)
         ↓
Layer 6: Center area overlay (absolute positioned, z-index higher)
```

---

## PLAYER HAND LAYOUT (PlayerHand.jsx)

### **Structure**
```
┌─────────────────────────────────────────────────────────────────┐
│ HAND CONTAINER (Horizontal scroll, flex layout)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Card] [Card] [Card] [Card] [Card] [Card] [Card] [Card] ...   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Drag & Drop Enabled (DnD-kit)                          │   │
│  │ - Cards can be sorted/rearranged                       │   │
│  │ - Drop zones between cards                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### **Card Dimensions** (responsive)
```javascript
// Desktop
cardW = 52px
cardH = 76px

// Tablet
cardW = 48px
cardH = 70px

// Mobile landscape
cardW = 44px
cardH = 64px
```

### **Card States**
```
1. Normal
   └─ Basic card face styling
   
2. Selected (Hover)
   └─ translateY(-10px)
   └─ brightness(1.08)
   └─ scale(1.04)
   
3. Selected (Click)
   └─ translateY(-22px)
   └─ scale(1.06)
   └─ Golden glow border
   └─ box-shadow: 0 12px 40px rgba(245,197,24,0.6)
   
4. Drag Over
   └─ Drop zone highlight
   └─ opacity: 0.6
```

---

## SEAT POSITIONS - Mathematical Calculation

### **Formula for positioning AI players around elliptical table:**

```javascript
// Elliptical table with 5 players (excluding player at bottom)
const positions = [
  { seat: 1, angle: 25,  scale: 0.15 },   // Top-Left
  { seat: 2, angle: 155, scale: 0.15 },   // Top-Right
  { seat: 3, angle: 270, scale: 0.18 },   // Right (extends further)
  { seat: 4, angle: 295, scale: 0.15 },   // Bottom-Right
  { seat: 5, angle: 85,  scale: 0.15 },   // Left (Bottom-Left area)
]

// Calculation:
x = centerX + (radiusX × cos(angle) × scale)
y = centerY + (radiusY × sin(angle) × scale)
```

---

## CENTER AREA LAYOUT (CenterArea.jsx)

### **Vertical Stack Layout**
```
     ▲ Top of viewport
     │
     │  ┌─────────────────┐
     │  │  [WILD JOKER]   │  ← Displays current wild joker card
     │  │   Indicator     │  
     │  └─────────────────┘
     │         ▲
     │         │ (Spacing)
     │
     │  ┌─────────────────┐
     │  │ DRAW   │ OPEN   │  ← Draw pile | Discard pile
     │  │ [DECK] │ [DECK] │     (Both clickable)
     │  │        │        │
     │  │ Closed │ Visible│
     │  │ (Back) │ (Face) │
     │  └─────────────────┘
     │         ▲
     │         │ (Spacing)
     │
     │  ┌─────────────────┐
     │  │  [DECLARE] BTN  │  ← Declare button (red/green state)
     │  │  (Only if valid)│
     │  └─────────────────┘
     │         ▲
     │         │ (Spacing)
     │
     │  ┌─────────────────┐
     │  │  TIMER: 30s     │  ← Turn timer countdown
     │  └─────────────────┘
     │
     ▼ Bottom of viewport
```

---

## RESPONSIVE BREAKPOINTS

### **Desktop (>900px width, Landscape)**
```
Full table view
Scoreboard visible on right side
4:3 card aspect ratio
Standard padding
```

### **Tablet (600-900px, Landscape)**
```
Compact table
Scoreboard hidden or minimized
Smaller padding
Tighter layout
```

### **Mobile (>900px width, but Landscape & <600px height)**
```
isMobileLandscape = true
Reduced card size
Minimal gaps
Table positioned at top with compressed height
```

---

## SIZE CALCULATIONS

```javascript
// Table zone sizing
width: isMobileLandscape ? 'min(98vw, 980px)' : 'min(94vw, 760px)'
aspectRatio: '2 / 1'
maxHeight: isMobileLandscape ? '56vh' : '58vh'

// Grid layout
gridTemplateRows: isMobileLandscape
  ? 'auto minmax(0, 1fr) minmax(148px, 34vh)'  // Compressed bottom
  : 'auto minmax(0, 1fr) auto'                  // Standard

// Padding
padding: isMobileLandscape ? '0 6px' : '6px 12px'
```

---

## ANIMATION FLOW

### **Deal Animation (Cards entering hand)**
```
0%   → Cards at center, small (0.3x), rotated, transparent
60%  → Cards visible at peak of arc
100% → Cards at final position in hand, full size
Time → 0.55s cubic-bezier curve
```

### **Discard Animation (Card leaving to discard pile)**
```
0%   → Card at current position
40%  → Card at halfway trajectory
100% → Card at discard pile, small (0.5x), transparent
Time → 0.5s ease-out curve
```

### **Draw Animation (Pop effect)**
```
0%   → Below position, 0.7x scale
60%  → At position slightly above, 1.05x scale
100% → Final position, 1x scale
Time → 0.45s cubic-bezier
```

---

## KEY CSS VARIABLES FOR REPLACEMENT

```css
/* Colors */
--table-bg: #0b1410;
--table-felt: #1e7a3e;
--accent-gold: #F5C518;
--card-red: #d32f2f;
--card-black: #1a1a1a;
--card-back-dark: #2d0a4a;
--card-back-mid: #4a1a6a;

/* Dimensions */
--card-width: 52px;
--card-height: 76px;
--table-aspect: 2 / 1;
--table-border-radius: 46% / 52%;

/* Shadows */
--table-shadow: 0 30px 80px rgba(0,0,0,0.72);
--card-shadow: 0 8px 20px rgba(0,0,0,0.6);
--glow-shadow: 0 0 0 2px rgba(255,255,255,0.06);
```

---

## Quick Reference: File-to-Component Mapping

| Visual Element | File | Key Props |
|---|---|---|
| Table felt background | `GameTableModern.jsx` | `compact`, `animate` |
| AI players around | `PlayersAroundTable.jsx` | `aiPlayers`, `isPlayerTurn` |
| Draw/Discard piles | `CenterArea.jsx` | `drawPile`, `discardPile` |
| Wild joker | `CenterArea.jsx` | `wildJoker` |
| Player hand | `PlayerHand.jsx` | `playerHand`, `selectedCard` |
| Control buttons | `Controls.jsx` | `gameState`, callbacks |
| Turn timer | `CenterArea.jsx` | `turnTimer` |
| Score display | `TopBar.jsx` | `playerScore` |

---

## Replace Examples

### To change table background color:
```javascript
// GameTableModern.jsx, line ~45
backgroundColor: '#0b1410',  // ← Change this
```

### To reposition AI players:
```javascript
// PlayersAroundTable.jsx, calculate positions array
const positions = [
  { top: '10%', left: '20%' },  // Seat 1
  // ... etc
]
```

### To change card pile style:
```javascript
// CenterArea.jsx
const deckStyle = {
  width: '80px',     // ← Change dimensions
  height: '110px',
  // ... styling
}
```

---

**For complete component details, see STRUCTURE.md**
