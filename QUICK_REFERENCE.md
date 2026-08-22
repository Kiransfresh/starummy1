# 🎮 Rummy 101 - Complete Code Structure & Table Guide

## 📦 What Has Been Created

I've created **5 comprehensive documentation files** to help you understand and replace the table structure:

### Documentation Files:

1. **README_DOCUMENTATION.md** (This file's parent)
   - Index & navigation guide
   - Quick task-based lookup
   - Learning path for beginners/advanced
   - Debugging tips & checklist

2. **STRUCTURE.md**
   - Overall architecture & components
   - Game state management
   - Game logic flow
   - File structure & organization

3. **TABLE_LAYOUT.md**
   - Physical table layout diagrams
   - Seat positioning system
   - Card hand layout structure
   - Responsive breakpoints
   - CSS variables reference

4. **COMPONENT_GUIDE.md**
   - Component dependency map
   - Data flow patterns (with examples)
   - Props drilling & communication
   - Key functions reference
   - Animation state management

5. **CODE_EXAMPLES.md**
   - 10 practical implementation examples
   - Before/after code snippets
   - Color scheme templates
   - Quick find-replace reference
   - File modification priority guide

---

## 🎯 Quick Start Guide

### **What is the table structure?**

The table is made of 3 layers:
```
Layer 1: Background (GameTableModern.jsx)
         └─ Elliptical felt with animations

Layer 2: AI Players (PlayersAroundTable.jsx)
         └─ 5 opponents around the table

Layer 3: Center Area (CenterArea.jsx)
         └─ Draw pile, Discard pile, Declare button
```

### **Main files you'll modify:**

| File | Purpose | Complexity |
|------|---------|-----------|
| `src/screens/GameTableModern.jsx` | Table background styling | ⭐⭐ |
| `src/screens/PlayersAroundTable.jsx` | AI player positions | ⭐⭐ |
| `src/screens/CenterArea.jsx` | Draw/Discard piles location | ⭐⭐ |
| `src/screens/PlayerHand.jsx` | Player's hand layout | ⭐⭐⭐ |
| `src/screens/Controls.jsx` | Button layout | ⭐ |
| `src/screens/GameScreen.jsx` | Main container & state | ⭐⭐⭐⭐ |

---

## 🎨 Component Hierarchy

```
GameScreen (Root)
│
├─ TopBar (Score display)
│
├─ TABLE ZONE
│  ├─ GameTableModern (Felt background)
│  ├─ PlayersAroundTable (5 AI players)
│  └─ CenterArea (Draw/Discard/Declare)
│
└─ BOTTOM ZONE
   ├─ PlayerHand (13 cards, drag & drop)
   ├─ Controls (Sort/Discard/Declare/Drop buttons)
   └─ Player Status (Your Turn indicator)
```

---

## 🔄 Game State Flow

```
DEAL → PLAYER TURN → DRAW → DISCARD → NEXT PLAYER → ...
         ↓           ↓
      (Optional)  (Optional)
    DECLARE ─────→ VALIDATE ─→ WIN/LOSE → NEW ROUND
```

### Key State Variables:
```javascript
gameState          // 'dealing' | 'draw' | 'discard' | 'finished'
playerHand        // Card[] (your 13 cards)
selectedCard      // Card (currently selected for discard)
playerScore       // Number (cumulative score)
currentTurn        // 0-5 (which player's turn)
drawPile           // Card[] (remaining to draw)
discardPile        // Card[] (discarded cards)
wildJoker          // Card (current round's wild joker)
aiPlayers          // Array of AI player objects
```

---

## 🎨 Color & Styling Constants

```javascript
// Found in GameScreen.jsx lines 15-30
const C = {
  bg: '#0a0f0d',              // Background (dark)
  tableFelt: '#1e7a3e',       // Table (green)
  topBar: 'rgba(0,0,0,0.85)', // Top bar
  gold: '#F5C518',            // Accent (gold)
  white: '#ffffff',           // White
  grey: 'rgba(255,255,255,0.5)', // Grey
  cardRed: '#d32f2f',         // Red card suits
  cardBlack: '#1a1a1a',       // Black suits
  purpleDark: '#2d0a4a',      // Card back (dark)
  purpleMid: '#4a1a6a',       // Card back (mid)
  btnBorder: 'rgba(255,255,255,0.15)',
  green: '#22c55e',           // Valid (green)
}
```

**To change colors:**
- Find & replace these hex values across files
- Or update the `C` object in GameScreen.jsx
- All components use these references

---

## 📐 Table Positioning Math

### AI Players Positioning:
```javascript
// Positions arranged in 5 seats around elliptical table
Position 1 (Top-Left):    15% from left, 18% from top
Position 2 (Top-Right):   85% from left, 18% from top
Position 3 (Right):       92% from left, 50% from top
Position 4 (Bottom-Right):85% from left, 82% from top
Position 5 (Bottom-Left): 15% from left, 82% from top

// Calculated with:
x = centerX + (radiusX × cos(angle) × scale)
y = centerY + (radiusY × sin(angle) × scale)
```

### Card Dimensions (Responsive):
```javascript
// Desktop (large screen)
cardWidth: 52px, cardHeight: 76px

// Tablet (medium screen)
cardWidth: 48px, cardHeight: 70px

// Mobile landscape (small screen)
cardWidth: 44px, cardHeight: 64px
```

---

## 🎬 Animation System

### Built-in Animations:

```css
/* Deal - Cards flying to hand (0.55s) */
@keyframes dealCard { 0% to 100% }

/* Discard - Card flying to pile (0.5s) */
@keyframes discardFly { 0% to 100% }

/* Draw - Pop effect (0.45s) */
@keyframes drawPop { 0% to 100% }

/* Table - Breathing effect (4.2s loop) */
animate: scale [1, 1.006, 1]

/* Turn - Pulse indicator (1.2s) */
@keyframes turnPulse { 0% to 100% }

/* Valid - Green flash (0.7s) */
@keyframes validFlash { 0% to 100% }

/* Invalid - Red shake (0.6s) */
@keyframes invalidShake { 0% to 100% }
```

All animations defined in: `src/screens/GameScreen.jsx` lines ~150-300

---

## 🎯 Implementation Priority

### Phase 1: Visual Changes (Start Here - ~1-2 hours)
```
1. Change table background color ← EASIEST
2. Add custom table image
3. Reposition AI players
4. Move draw/discard piles
5. Adjust card hand layout
```

### Phase 2: Styling Tweaks (~30-45 min)
```
1. Update color scheme
2. Adjust button styling
3. Modify spacing/gaps
4. Fine-tune card sizes
```

### Phase 3: Functionality Modifications (~1-2 hours)
```
1. Add sound effects
2. Modify game rules
3. Change card point values
4. Adjust animations
```

### Phase 4: Polish & Testing (~30-45 min)
```
1. Test all screen sizes
2. Verify mobile layout
3. Check animations smoothness
4. Validate game logic
```

---

## 📱 Responsive Design Breakpoints

### Current Setup:
```javascript
// Mobile landscape (narrow & short)
viewportHeight < 600px
→ Very compact layout

// Short landscape (normal width but short height)
viewportWidth < 900px AND viewportHeight < 800px
→ Compressed layout

// Desktop (normal view)
viewportWidth > 900px AND viewportHeight > 800px
→ Full layout with scoreboard

// Portrait mode
NOT SUPPORTED (game is landscape-only)
```

### Viewport Variables Available:
```javascript
viewportWidth      // Current window width
viewportHeight     // Current window height
isLandscape        // true if landscape
isMobileLandscape  // very compact mobile view
isShortLandscape   // tablet compressed view
tableCompact       // true if should compress table
```

---

## 🔧 File-by-File Modification Guide

### 1. GameTableModern.jsx (Table Background)

**Find:** Lines 40-65 (motion.div with backgroundImage)

**Current:**
```javascript
backgroundImage: "url('/assets/Table.png')",
borderRadius: '46% / 52%',
backgroundColor: '#0b1410',
```

**To change:**
- Modify `backgroundColor` for base color
- Change `backgroundImage` URL or remove it
- Adjust `borderRadius` for different shape
- Tweak `boxShadow` for lighting

---

### 2. PlayersAroundTable.jsx (AI Players)

**Find:** Positioning calculations (around line 30-50)

**Current:** Seats positioned at specific percentages around table

**To change:**
- Modify `top` and `left` percentages
- Or use completely different layout (grid, flex, etc.)
- Adjust `transform: 'translate(-50%, -50%)'` if centering changes

---

### 3. CenterArea.jsx (Draw/Discard Piles)

**Find:** Main container positioning (around line 45-80)

**Current:** Centered in middle (`top: 50%, left: 50%`)

**To change:**
- Modify `top` and `left` values
- Adjust layout direction (column vs row)
- Change button positioning within container

---

### 4. PlayerHand.jsx (Card Hand)

**Find:** DndContext container (around line 150-200)

**Current:** Horizontal flex layout

**To change:**
- Change `flexDirection` from 'row' to 'column'
- Use `display: 'grid'` for 2D layout
- Adjust `gap`, `padding`, `overflowX`

---

### 5. Controls.jsx (Buttons)

**Find:** Button container (around line 40-80)

**Current:** Flex layout, horizontal

**To change:**
- Modify `flexDirection`, `gap`, `padding`
- Change button styling
- Adjust button size or text

---

### 6. GameScreen.jsx (Main Container)

**Find:** Lines 350-400 (responsive calculations)

**Current:** Grid layout with responsive adjustments

**To change:**
- Modify `gridTemplateRows` breakpoint
- Adjust `cardW` and `cardH` calculations
- Change padding/margins
- Modify viewport thresholds

---

## 🎓 How to Read the Code

### Best Order for Understanding:

1. **Start:** Open `src/screens/GameScreen.jsx`
   - Lines 15-30: Color constants
   - Lines 350-400: Responsive calculations
   - Lines 1520+: JSX return (main layout)

2. **Then:** Open `src/screens/GameTableModern.jsx`
   - Lines 40-65: Table styling
   - Understand background image & animation

3. **Next:** Open `src/screens/PlayersAroundTable.jsx`
   - Understand AI player positioning
   - See how props are used

4. **Then:** Open `src/screens/CenterArea.jsx`
   - See how piles are positioned
   - Understand callback functions

5. **Finally:** Open `src/screens/PlayerHand.jsx`
   - Understand drag & drop
   - See card rendering logic

---

## 🚀 Quick Commands

### Development:
```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview production build
```

### Mobile:
```bash
npm run android-build # Build Android
npm run android-run   # Run on Android device
npx cap sync         # Sync files to Capacitor
```

### Debugging:
```bash
# Open browser console
F12 or Cmd+Option+I

# Check React component tree
React DevTools extension

# Check state changes
Zustand DevTools
```

---

## ✅ Verification Checklist

Before and after making changes:

- [ ] Read relevant documentation (README_DOCUMENTATION.md)
- [ ] Understand component dependencies
- [ ] Made backup of original file
- [ ] Made ONE change at a time
- [ ] Tested in browser after each change
- [ ] Checked console for errors
- [ ] Verified game still plays correctly
- [ ] Tested on mobile landscape
- [ ] Tested game logic (draw, discard, declare)

---

## 🐛 Common Issues & Fixes

### Issue: AI players not visible
**Solution:** Check PlayersAroundTable.jsx positioning, verify parent has `position: relative`

### Issue: Cards not clickable
**Solution:** Check CenterArea.jsx onClick handlers, verify `canDraw` props are true

### Issue: Layout broken on mobile
**Solution:** Review responsive calculations in GameScreen.jsx, adjust breakpoint thresholds

### Issue: Animation stuttering
**Solution:** Check if using CSS keyframes (not JS), reduce shadow/blur effects

### Issue: Game logic broken
**Solution:** Check engine.js validation rules, verify GameScreen.jsx state management

---

## 📚 External References

- **React Docs:** https://react.dev
- **Framer Motion:** https://www.framer.com/motion
- **Zustand:** https://github.com/pmndrs/zustand
- **Vite:** https://vitejs.dev
- **DnD-Kit:** https://docs.dndkit.com
- **Capacitor:** https://capacitorjs.com

---

## 🎉 Summary

You now have:

✅ **Complete code structure documentation** (STRUCTURE.md)
✅ **Visual table layout diagrams** (TABLE_LAYOUT.md)
✅ **Component interaction guide** (COMPONENT_GUIDE.md)
✅ **10+ practical code examples** (CODE_EXAMPLES.md)
✅ **Navigation & implementation guide** (README_DOCUMENTATION.md)

**Total Files:** 5 markdown documents + this summary

**Next Steps:**
1. Open README_DOCUMENTATION.md
2. Find your specific task
3. Reference CODE_EXAMPLES.md for code snippets
4. Make changes to relevant files
5. Test in browser
6. Repeat

---

## 📞 Key Contact Points in Code

| When you want to... | Look at... | File | Lines |
|---|---|---|---|
| Change table look | GameTableModern.jsx | table styling | 40-65 |
| Move AI players | PlayersAroundTable.jsx | positioning | 30-50 |
| Move piles/buttons | CenterArea.jsx | container position | 45-80 |
| Change hand layout | PlayerHand.jsx | DndContext | 150-200 |
| Add colors | GameScreen.jsx | Color constants | 15-30 |
| Modify animations | GameScreen.jsx | CSS keyframes | 150-300 |
| Change game rules | engine.js | validation logic | 50-150 |
| Adjust responsive | GameScreen.jsx | calculations | 350-400 |

---

**You're all set! Start reading the documentation files and make your first change! 🚀**

---

*Documentation created: May 3, 2026*
*Framework: React + Framer Motion + Vite*
*Mobile: Capacitor (iOS/Android)*
*Language: JavaScript/JSX*
