# Code Examples: How to Replace Table Structure

## 📋 File Locations Quick Reference

```
src/
├── screens/
│   ├── GameScreen.jsx              ← Main container (1800+ lines)
│   ├── GameTableModern.jsx         ← Table background styling
│   ├── GameTable.jsx               ← Alternative table design
│   ├── PlayersAroundTable.jsx      ← AI players around table
│   ├── CenterArea.jsx              ← Draw/Discard/Declare
│   ├── PlayerHand.jsx              ← Player's 13 cards (drag & drop)
│   ├── Controls.jsx                ← Buttons (Sort/Discard/Declare)
│   ├── TopBar.jsx                  ← Score & back button
│   └── Scoreboard.jsx              ← Round scores & elimination
├── game/
│   ├── engine.js                   ← Validation rules
│   └── gameEngine.js               ← Alternative engine
└── utils/
    └── alignmentConfig.js          ← Card positioning math
```

---

## 🎨 EXAMPLE 1: Replace Table Background

### Current Code (GameTableModern.jsx)

```javascript
// Lines 40-65
<motion.div
  style={{
    position: 'relative',
    width: '100%',
    height: '100%',
    aspectRatio: '2 / 1',
    maxHeight: '100%',
    borderRadius: '46% / 52%',      // ← ELLIPTICAL SHAPE
    overflow: 'hidden',
    backgroundColor: '#0b1410',      // ← DARK GREEN BASE
    backgroundImage: "url('/assets/Table.png')",  // ← TEXTURE IMAGE
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    boxShadow: reduceMotion           // ← LIGHTING EFFECTS
      ? '0 14px 34px rgba(0,0,0,0.46)...'
      : '0 30px 80px rgba(0,0,0,0.72)...',
  }}
  animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.006, 1] }}
  transition={reduceMotion ? { duration: 0 } : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
>
```

### To Replace - Option 1: Different Image

```javascript
backgroundColor: '#1a5c2e',  // Different green
backgroundImage: "url('/assets/MyCustomTable.png')",  // Use your image
```

### To Replace - Option 2: Gradient Pattern

```javascript
backgroundColor: '#0a3d15',
backgroundImage: `
  radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 40%),
  linear-gradient(135deg, #0b1410 0%, #1a3a2e 50%, #0b1410 100%)
`,
borderRadius: '50%',  // Try circular instead of elliptical
```

### To Replace - Option 3: Solid Color

```javascript
backgroundColor: '#2d5a3d',
backgroundImage: 'none',
boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 0 80px rgba(45,90,61,0.4)',
```

---

## 👥 EXAMPLE 2: Reposition AI Players Around Table

### Current Code (PlayersAroundTable.jsx)

```javascript
// Lines 30-50 (approximate positioning)
const seatPositions = [
  { top: '15%', left: '12%' },    // Seat 0 - Top Left
  { top: '15%', left: '88%' },    // Seat 1 - Top Right
  { top: '50%', left: '92%' },    // Seat 2 - Right
  { top: '85%', left: '88%' },    // Seat 3 - Bottom Right
  { top: '85%', left: '12%' },    // Seat 4 - Bottom Left
]

return (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    {aiPlayers.map((player, idx) => (
      <div
        key={player.id}
        style={{
          position: 'absolute',
          top: seatPositions[idx].top,
          left: seatPositions[idx].left,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <AISeat player={player} active={isPlayerTurn && currentTurn === idx + 1} />
      </div>
    ))}
  </div>
)
```

### To Replace - Square Positioning

```javascript
// 5 players in circle pattern
const seatPositions = [
  { top: '20%', left: '50%' },    // Top center
  { top: '50%', left: '90%' },    // Right center
  { top: '80%', left: '70%' },    // Bottom right
  { top: '80%', left: '30%' },    // Bottom left
  { top: '50%', left: '10%' },    // Left center
]
```

### To Replace - Straight Lines (Left & Right)

```javascript
// 3 left, 2 right
const seatPositions = [
  { top: '20%', left: '15%' },    // Left 1
  { top: '50%', left: '15%' },    // Left 2
  { top: '80%', left: '15%' },    // Left 3
  { top: '35%', left: '85%' },    // Right 1
  { top: '65%', left: '85%' },    // Right 2
]
```

### To Replace - All Centered View

```javascript
// Everyone views from same angle - no repositioning
// Just stack small card displays in a list
<div style={{ position: 'absolute', top: 10, right: 10 }}>
  {aiPlayers.map((player, idx) => (
    <div key={player.id} style={{ marginBottom: 8 }}>
      <div>{player.name}</div>
      <div>{player.hand.length} cards</div>
    </div>
  ))}
</div>
```

---

## 🃏 EXAMPLE 3: Move Draw/Discard Piles

### Current Code (CenterArea.jsx)

```javascript
// Lines 45-80 (approximate)
<div style={{
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
}}>
  {/* Wild Joker Display */}
  <div>{wildJoker && <CardFace card={wildJoker} />}</div>
  
  {/* Draw & Discard Piles */}
  <div style={{ display: 'flex', gap: 32 }}>
    <button onClick={onDrawClosed}>
      {drawPile.length} cards (Draw)
    </button>
    <button onClick={onDrawOpen}>
      {discardPile[discardPile.length - 1]} (Open)
    </button>
  </div>
  
  {/* Declare Button */}
  <button onClick={onDeclare}>Declare</button>
</div>
```

### To Replace - Left-Aligned Layout

```javascript
<div style={{
  position: 'absolute',
  top: '50%',
  left: '10%',           // Changed from 50%
  transform: 'translateY(-50%)',  // Only Y translate
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}}>
  {/* Contents same as above */}
</div>
```

### To Replace - Top-Aligned (Landscape)

```javascript
<div style={{
  position: 'absolute',
  top: '5%',             // Changed from 50%
  left: '50%',
  transform: 'translateX(-50%)',  // Only X translate
  display: 'flex',
  flexDirection: 'row',  // Horizontal instead
  gap: 32,
}}>
  {/* Contents reordered horizontally */}
</div>
```

### To Replace - Bottom-Aligned

```javascript
<div style={{
  position: 'absolute',
  bottom: '5%',
  left: '50%',
  transform: 'translateX(-50%)',
  // Rest of styling...
}}>
```

---

## 🎴 EXAMPLE 4: Change Card Hand Layout

### Current Code (PlayerHand.jsx)

```javascript
// Lines 150-200 (approximate)
<DndContext
  sensors={sensors}
  collisionDetection={closestCorners}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  <div
    ref={handRef}
    style={{
      display: 'flex',
      flexDirection: 'row',      // Horizontal line
      gap: 4,
      padding: 8,
      overflowX: 'auto',
      justifyContent: 'center',
    }}
  >
    {playerHand.map((card, idx) => (
      <div key={card.id} style={{ 
        width: cardW,
        height: cardH,
        cursor: 'pointer',
      }}>
        <CardFace card={card} selected={selectedCard?.id === card.id} />
      </div>
    ))}
  </div>
</DndContext>
```

### To Replace - Grid Layout (2 Rows)

```javascript
style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(52px, 1fr))',
  gap: 4,
  padding: 8,
  maxWidth: '600px',
}}
```

### To Replace - Vertical Stack

```javascript
style={{
  display: 'flex',
  flexDirection: 'column',  // Changed from row
  gap: 8,
  padding: 8,
  maxHeight: '400px',
  overflowY: 'auto',
}}
```

### To Replace - Compact Horizontal (Smaller Cards)

```javascript
style={{
  display: 'flex',
  flexDirection: 'row',
  gap: 2,                    // Reduced gap
  padding: 4,
  overflowX: 'auto',
  // Card size will shrink due to viewport changes
}}
```

---

## 🎛️ EXAMPLE 5: Modify Control Buttons Layout

### Current Code (Controls.jsx)

```javascript
// Lines 40-80 (approximate)
return (
  <div style={{
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  }}>
    <button onClick={onSort} disabled={!canSort}>
      ↔ Sort
    </button>
    <button onClick={onDiscard} disabled={!canDiscard}>
      Discard
    </button>
    <button onClick={onDeclare} disabled={!canDeclare}>
      🏁 Declare
    </button>
    <button onClick={onDrop} disabled={!canDrop}>
      Drop
    </button>
  </div>
)
```

### To Replace - Vertical Stack

```javascript
style={{
  display: 'flex',
  flexDirection: 'column',  // Changed from row
  gap: 8,
  minWidth: 'fit-content',
}}
```

### To Replace - Icon Only (Smaller)

```javascript
return (
  <div style={{ display: 'flex', gap: 4 }}>
    <button title="Sort">↔</button>
    <button title="Discard">✓</button>
    <button title="Declare">🏁</button>
    <button title="Drop">✕</button>
  </div>
)
```

### To Replace - Horizontal Pill Buttons

```javascript
<button style={{
  padding: '8px 16px',
  borderRadius: 999,
  border: '1px solid gold',
  background: 'rgba(0,0,0,0.5)',
  color: 'white',
  cursor: 'pointer',
}}>
  Sort Hand
</button>
```

---

## 📊 EXAMPLE 6: Change Score Display Position

### Current TopBar (TopBar.jsx)

```javascript
// Typical layout
return (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    background: 'rgba(0,0,0,0.85)',
  }}>
    <button onClick={onBack}>← Back</button>
    <div>{playerScore}/101</div>
    <button onClick={onReport}>Report</button>
  </div>
)
```

### To Replace - Centered Score

```javascript
<div style={{
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 12,
}}>
  <div style={{ flex: 1 }}>← Back</div>
  <div style={{ flex: 1, textAlign: 'center' }}>
    {playerScore}/101
  </div>
  <div style={{ flex: 1, textAlign: 'right' }}>Report</div>
</div>
```

### To Replace - Score in Bottom Right

```javascript
// Move score badge to bottom zone, next to controls
<div style={{
  padding: '8px 12px',
  background: 'rgba(245, 197, 24, 0.1)',
  border: '1px solid #F5C518',
  borderRadius: 8,
}}>
  <div style={{ fontSize: 12, color: '#F5C518' }}>
    Score
  </div>
  <div style={{ fontSize: 18, fontWeight: 'bold' }}>
    {playerScore}
  </div>
</div>
```

---

## 🎬 EXAMPLE 7: Add/Modify Animations

### Current Animation Styles (GameScreen.jsx, lines 150-250)

```css
@keyframes dealCard {
  0%   { transform: translate(var(--dx), var(--dy)) scale(0.3) rotate(var(--dr)); opacity:0; }
  60%  { opacity: 1; }
  100% { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
}
.deal-animate {
  animation: dealCard 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
  animation-delay: var(--deal-delay);
}
```

### To Replace - Faster Animation

```css
@keyframes dealCard {
  0%   { transform: translate(var(--dx), var(--dy)) scale(0.3) rotate(var(--dr)); opacity:0; }
  60%  { opacity: 1; }
  100% { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
}
.deal-animate {
  animation: dealCard 0.35s cubic-bezier(0.22,1,0.36,1) forwards;  /* Faster */
  animation-delay: var(--deal-delay);
}
```

### To Replace - Disabled Animation (No Motion)

```css
.deal-animate {
  animation: none;
  transform: translate(0,0) scale(1) rotate(0deg);
  opacity: 1;
}
```

### To Replace - Bounce Effect

```css
@keyframes dealCard {
  0%   { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity:0; }
  40%  { transform: translate(0,0) scale(1.1); opacity:1; }
  60%  { transform: translate(0,0) scale(0.95); }
  100% { transform: translate(0,0) scale(1); opacity: 1; }
}
```

---

## 🎨 EXAMPLE 8: Change Color Scheme

### Current Colors (GameScreen.jsx, lines 15-30)

```javascript
const C = {
  bg: '#0a0f0d',           // Background
  tableFelt: '#1e7a3e',    // Green table
  topBar: 'rgba(0,0,0,0.85)',
  gold: '#F5C518',         // Accent
  white: '#ffffff',
  grey: 'rgba(255,255,255,0.5)',
  cardRed: '#d32f2f',      // Red suits
  cardBlack: '#1a1a1a',    // Black suits
  purpleDark: '#2d0a4a',   // Card back
  purpleMid: '#4a1a6a',
  btnBorder: 'rgba(255,255,255,0.15)',
  green: '#22c55e',        // Valid
}
```

### To Replace - Blue Theme

```javascript
const C = {
  bg: '#0a0d1f',           // Dark blue background
  tableFelt: '#1a3a5e',    // Blue table
  topBar: 'rgba(0,0,20,0.9)',
  gold: '#00D4FF',         // Cyan accent
  white: '#ffffff',
  grey: 'rgba(255,255,255,0.5)',
  cardRed: '#FF1744',
  cardBlack: '#263238',
  purpleDark: '#0a1a3a',
  purpleMid: '#1a3a6a',
  btnBorder: 'rgba(0,212,255,0.25)',
  green: '#00E676',
}
```

### To Replace - Red/Orange Theme

```javascript
const C = {
  bg: '#1a0a0a',           // Dark red
  tableFelt: '#8B2F2F',    // Deep red
  topBar: 'rgba(20,0,0,0.9)',
  gold: '#FF6B00',         // Orange accent
  white: '#ffffff',
  grey: 'rgba(255,255,255,0.5)',
  cardRed: '#FF1744',
  cardBlack: '#2a2a2a',
  purpleDark: '#3a0a1a',
  purpleMid: '#6a2a3a',
  btnBorder: 'rgba(255,107,0,0.25)',
  green: '#00E676',
}
```

---

## 🔧 EXAMPLE 9: Modify Game Rules (engine.js)

### Current Validation (engine.js)

```javascript
// Lines 80-120 - Declaration validation
const isValidPureSequence = (cards) => {
  if (cards.length < 3) return false
  const sameSuit = cards.every(c => c.suit === cards[0].suit)
  if (!sameSuit) return false
  // Check consecutive...
  return isConsecutive(cards)
}
```

### To Replace - Allow 2-Card Sequences

```javascript
const isValidPureSequence = (cards) => {
  if (cards.length < 2) return false  // Changed from 3 to 2
  // Rest of logic...
}
```

### To Replace - Different Point Penalties

```javascript
// Lines 200+ - Scoring
const pointValue = {
  'A': 15,    // Changed from 10
  '2-9': (rank) => parseInt(rank),
  '10': 10,
  'J': 10,
  'Q': 15,    // Changed from 10
  'K': 15,    // Changed from 10
}
```

---

## 📱 EXAMPLE 10: Adjust Responsive Breakpoints

### Current (GameScreen.jsx, lines 350-380)

```javascript
const isMobileLandscape = isLandscape && viewportHeight < 600
const isShortLandscape = isLandscape && viewportWidth < 900

const cardW = isMobileLandscape ? 44 : isShortLandscape ? 48 : 52
const cardH = isMobileLandscape ? 64 : isShortLandscape ? 70 : 76

const gridTemplateRows = isMobileLandscape
  ? 'auto minmax(0, 1fr) minmax(148px, 34vh)'
  : 'auto minmax(0, 1fr) auto'
```

### To Replace - More Aggressive Breakpoints

```javascript
const isVerySmall = viewportWidth < 480
const isSmall = viewportWidth < 768
const isMedium = viewportWidth < 1024

const cardW = isVerySmall ? 40 : isSmall ? 46 : 52
const cardH = isVerySmall ? 58 : isSmall ? 68 : 76
```

### To Replace - Tablet-Optimized

```javascript
const isTablet = viewportHeight > 600 && viewportHeight < 900
const isMobileSmall = viewportHeight < 600

const cardW = isMobileSmall ? 40 : isTablet ? 56 : 52
const cardH = isMobileSmall ? 58 : isTablet ? 82 : 76
```

---

## 🚀 Quick Find-Replace Commands

| Find | Replace With | File |
|---|---|---|
| `GameTableModern` | `GameTableCustom` | All imports |
| `46% / 52%` | `50%` | GameTableModern.jsx |
| `#0b1410` | `#1a2d1f` | Any (old green) |
| `#F5C518` | `#00D4FF` | Any (old gold) |
| `displayAsRow` | `displayAsGrid` | PlayerHand.jsx |
| `3` (min cards for sequence) | `2` | engine.js |

---

## 📌 Files Most Likely to Modify

```
PRIORITY 1 (Visual Look):
├── GameTableModern.jsx     ← Table appearance
├── PlayerHand.jsx          ← Card hand layout
└── Controls.jsx            ← Button styling

PRIORITY 2 (Layout):
├── PlayersAroundTable.jsx  ← AI seat positions
├── CenterArea.jsx          ← Pile positions
└── GameScreen.jsx          ← Overall grid layout

PRIORITY 3 (Rules):
├── engine.js               ← Validation logic
└── GameScreen.jsx          ← Scoring calculations

PRIORITY 4 (Polish):
├── TopBar.jsx              ← Header
├── Scoreboard.jsx          ← Scorecard
└── RummyCardAnimations.jsx ← Card visuals
```

---

**For component structure details, see STRUCTURE.md**
**For layout specifics, see TABLE_LAYOUT.md**
**For interaction flow, see COMPONENT_GUIDE.md**
