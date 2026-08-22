# 📚 Rummy 101 - Complete Documentation Index

## 📖 Documentation Files Created

### 1. **[STRUCTURE.md](STRUCTURE.md)** - Overall Architecture
   - 📊 Component hierarchy & directory structure
   - 🎮 Game state management details
   - 🎯 Game logic flow (turn sequence, declaration, scoring)
   - 🔧 File organization & key entry points
   - Performance considerations

   **Use this when:** You need to understand the overall project structure.

---

### 2. **[TABLE_LAYOUT.md](TABLE_LAYOUT.md)** - Visual Table Structure
   - 🎨 Physical table layout (visual diagrams)
   - 🪑 Seat positioning system (AI players)
   - 🎴 Card hand layout
   - 📐 Responsive breakpoints & sizing
   - 🔑 CSS variables for theming

   **Use this when:** You need to understand how the table looks and is positioned.

---

### 3. **[COMPONENT_GUIDE.md](COMPONENT_GUIDE.md)** - Component Interactions & Data Flow
   - 📊 Component dependency map
   - 🔄 Data flow patterns (Draw, Declare, AI Turn)
   - 📡 Props drilling & communication between components
   - 🔧 Key functions in GameScreen
   - 🎬 Animation state management
   - 💾 State persistence with Zustand

   **Use this when:** You need to understand how components communicate and pass data.

---

### 4. **[CODE_EXAMPLES.md](CODE_EXAMPLES.md)** - Practical Code Examples
   - 🎨 Replace table background (3 options)
   - 👥 Reposition AI players (3 options)
   - 🃏 Move draw/discard piles (3 options)
   - 🎴 Change card hand layout (3 options)
   - 🎛️ Modify control buttons (3 options)
   - 📊 Change score display
   - 🎬 Add/modify animations
   - 🎨 Change color scheme (2 theme examples)
   - 🔧 Modify game rules
   - 📱 Adjust responsive breakpoints
   - 🚀 Quick find-replace commands

   **Use this when:** You're ready to make specific code changes.

---

## 🗂️ Quick Navigation by Task

### **I want to change the table appearance:**
1. Read: [TABLE_LAYOUT.md](TABLE_LAYOUT.md) - "PLAYER HAND LAYOUT" section
2. Reference: [CODE_EXAMPLES.md](CODE_EXAMPLES.md) - "EXAMPLE 1: Replace Table Background"
3. Edit: `src/screens/GameTableModern.jsx`

### **I want to reposition players around the table:**
1. Read: [TABLE_LAYOUT.md](TABLE_LAYOUT.md) - "SEAT POSITIONS" section
2. Reference: [CODE_EXAMPLES.md](CODE_EXAMPLES.md) - "EXAMPLE 2: Reposition AI Players"
3. Edit: `src/screens/PlayersAroundTable.jsx`

### **I want to move the draw/discard piles:**
1. Read: [TABLE_LAYOUT.md](TABLE_LAYOUT.md) - "CENTER AREA LAYOUT" section
2. Reference: [CODE_EXAMPLES.md](CODE_EXAMPLES.md) - "EXAMPLE 3: Move Draw/Discard Piles"
3. Edit: `src/screens/CenterArea.jsx`

### **I want to change the player hand layout:**
1. Read: [TABLE_LAYOUT.md](TABLE_LAYOUT.md) - "PLAYER HAND LAYOUT" section
2. Reference: [CODE_EXAMPLES.md](CODE_EXAMPLES.md) - "EXAMPLE 4: Change Card Hand Layout"
3. Edit: `src/screens/PlayerHand.jsx`

### **I want to reorganize control buttons:**
1. Read: [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) - "Props Drilling" section
2. Reference: [CODE_EXAMPLES.md](CODE_EXAMPLES.md) - "EXAMPLE 5: Modify Control Buttons"
3. Edit: `src/screens/Controls.jsx`

### **I want to change the color scheme:**
1. Reference: [CODE_EXAMPLES.md](CODE_EXAMPLES.md) - "EXAMPLE 8: Change Color Scheme"
2. Update color constants in all component files

### **I want to understand the game logic flow:**
1. Read: [STRUCTURE.md](STRUCTURE.md) - "GAME LOGIC FLOW" section
2. Read: [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) - "DATA FLOW PATTERNS" section
3. Reference: `src/game/engine.js` for validation rules

### **I want to modify game rules:**
1. Reference: [CODE_EXAMPLES.md](CODE_EXAMPLES.md) - "EXAMPLE 9: Modify Game Rules"
2. Edit: `src/game/engine.js` for validation rules
3. Edit: `src/screens/GameScreen.jsx` for scoring

---

## 🎯 Key Files to Modify

### **Primary (For Layout & Appearance):**
```
src/screens/
├── GameScreen.jsx              Main container & state
├── GameTableModern.jsx         Table background styling
├── PlayersAroundTable.jsx      AI player positions
├── CenterArea.jsx              Draw/Discard piles & buttons
├── PlayerHand.jsx              Hand layout & card display
└── Controls.jsx                Button layout & styling
```

### **Secondary (For Game Logic):**
```
src/game/
├── engine.js                   Validation rules
└── gameEngine.js               Alternative implementation

src/screens/
└── GameScreen.jsx              State management & turns
```

### **Tertiary (For Polish):**
```
src/screens/
├── TopBar.jsx                  Score display
├── Scoreboard.jsx              Round scores
└── RummyCardAnimations.jsx     Card animations
```

---

## 🎨 Component Replacement Matrix

| Component | Current File | Purpose | Difficulty | Time |
|-----------|---|---|---|---|
| Table Background | GameTableModern.jsx | Visual styling | ⭐⭐ | 15 min |
| AI Player Positions | PlayersAroundTable.jsx | Seat layout | ⭐⭐ | 20 min |
| Draw/Discard Piles | CenterArea.jsx | Pile positioning | ⭐⭐ | 15 min |
| Card Hand | PlayerHand.jsx | Hand layout | ⭐⭐⭐ | 30 min |
| Control Buttons | Controls.jsx | Button layout | ⭐ | 10 min |
| Color Scheme | Multiple files | Theme colors | ⭐ | 20 min |
| Animations | GameScreen.jsx | Motion effects | ⭐⭐⭐ | 45 min |
| Game Rules | engine.js | Validation logic | ⭐⭐⭐⭐ | 60+ min |
| Scoring | GameScreen.jsx | Point calculation | ⭐⭐⭐ | 30 min |
| Responsive Sizing | GameScreen.jsx | Breakpoints | ⭐⭐⭐ | 40 min |

---

## 🚀 Implementation Checklist

### **Phase 1: Layout (1-2 hours)**
- [ ] Read TABLE_LAYOUT.md & COMPONENT_GUIDE.md
- [ ] Modify GameTableModern.jsx (background)
- [ ] Adjust PlayersAroundTable.jsx (seats)
- [ ] Move CenterArea contents (piles)
- [ ] Test in browser

### **Phase 2: Styling (30-45 min)**
- [ ] Change color scheme (CODE_EXAMPLES.md)
- [ ] Update animations if needed
- [ ] Adjust card dimensions
- [ ] Test responsive view

### **Phase 3: Functionality (1-2 hours)**
- [ ] Test card drawing
- [ ] Test card discarding
- [ ] Test declaring
- [ ] Verify animations work

### **Phase 4: Polish (30-45 min)**
- [ ] Update button styling
- [ ] Fine-tune spacing
- [ ] Adjust mobile view
- [ ] Test all screen sizes

---

## 📱 Responsive Design Overview

### Current Breakpoints:
```javascript
// Desktop
width > 1200px, height > 800px
→ Full table view, scoreboard visible

// Tablet
width 800-1200px
→ Compact table, reduced card size

// Mobile Landscape
width < 900px OR height < 600px
→ Further compressed, optimized for tall narrow screens

// Mobile Portrait
Not currently supported (game is landscape-only)
```

---

## 🎬 Animation System

### **Key Animations Used:**
1. **Deal Animation**: Cards fly from deck to hand (0.55s)
2. **Discard Animation**: Card flies to pile (0.5s)
3. **Draw Pop**: Pop effect when drawing (0.45s)
4. **Table Pulse**: Breathing effect on table (4.2s loop)
5. **Turn Indicator**: Glow pulse on active player (1.2s)
6. **Confetti**: Celebration particles on win (varies)

### **To Disable Animations:**
All animations defined in `src/screens/GameScreen.jsx` lines 150-300
Set `animation: none;` on any `.animation-class`

---

## 🔌 State Management Summary

### **Zustand Store** (`src/store.js`)
- User authentication data
- Screen navigation
- Global app state

### **Component State** (`src/screens/GameScreen.jsx`)
- Game state (dealing, draw, discard, finished)
- Card hands (player & AI)
- Turn management
- Scores & elimination
- UI state (toasts, animations)

### **No Redux/Context Used**
State is managed locally in GameScreen.jsx and passed down via props

---

## 📊 Game Flow Architecture

```
INITIALIZATION
├─ Create/shuffle deck
├─ Deal 13 cards to each player
├─ Set up draw/discard piles
└─ Select random first player

GAME LOOP (repeats for each round)
├─ PLAYER TURNS (rotate 1-6)
│  ├─ Draw phase: Pick card from pile
│  ├─ Discard phase: Put card back (or declare)
│  └─ Next player
├─ VALIDATION
│  ├─ Check declaration validity
│  └─ Calculate scores
└─ SCORING
   ├─ Update scoreboard
   ├─ Check for elimination
   └─ Continue or new round

GAME END
├─ Someone reaches 101+ points
└─ Winner declared
```

---

## 🎓 Learning Path

### For Beginners:
1. Start with STRUCTURE.md (5 min read)
2. Look at TABLE_LAYOUT.md diagrams (5 min)
3. Try Code Example 1 (Replace table color) (15 min)

### For Intermediate:
1. Read COMPONENT_GUIDE.md (10 min)
2. Try Code Examples 2-5 (45 min)
3. Test in browser after each change

### For Advanced:
1. Study engine.js rules engine (20 min)
2. Try modifying game rules (30+ min)
3. Implement custom animations (60+ min)

---

## 🐛 Debugging Tips

### **Card not appearing in hand:**
- Check: PlayerHand.jsx line where cards are mapped
- Verify: Card object has `id` property
- Debug: Console.log(playerHand) in GameScreen

### **AI players not positioned:**
- Check: PlayersAroundTable.jsx positioning calculations
- Verify: Percentage values add up (should be distributed around table)
- Debug: Add border to player divs to see positioning

### **Piles not clickable:**
- Check: CenterArea.jsx onClick handlers
- Verify: canDrawMove & canDrawOpen props are true
- Debug: Look at GameScreen.jsx validateMove() function

### **Animations stuttering:**
- Check: Using CSS keyframes (not JS driven)
- Verify: Using Framer Motion correctly
- Reduce: Complex visual effects if on low-end device

---

## 🔧 Common Customizations

### **Change Number of Players:**
Modify: `src/screens/GameScreen.jsx` line ~480
```javascript
const tableSize = 6  // Change this to 2-8 players
```

### **Change Win Condition:**
Modify: `src/game/engine.js`
```javascript
maxScore: 101  // Change to different value
```

### **Change Card Points:**
Modify: `src/game/engine.js` lines ~10-20
```javascript
// Adjust point values for face cards
```

### **Add Sound Effects:**
Add to: `src/screens/GameScreen.jsx`
```javascript
// Add audio play on events:
// - Card draw
// - Card discard
// - Declaration
// - Win
```

---

## 📞 Quick Reference Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run on Android
npm run android-build
npm run android-run

# Build capacitor app
npx cap build android
```

---

## 🎯 Most Important Files

1. **GameScreen.jsx** - Everything starts here (1800+ lines, main logic)
2. **GameTableModern.jsx** - Visual appearance
3. **engine.js** - Game rules & validation
4. **PlayerHand.jsx** - Card display & interaction
5. **PlayersAroundTable.jsx** - AI player display

---

## 📚 Additional Resources

- **Framework**: React (Hooks, Refs, Context)
- **Animation**: Framer Motion
- **State**: Zustand
- **Build**: Vite
- **Mobile**: Capacitor (iOS/Android)
- **Drag & Drop**: DnD-Kit
- **Cards**: Custom React components

---

## ✅ Validation Checklist Before Replacing

- [ ] Backed up original files
- [ ] Read relevant documentation
- [ ] Understand component dependencies
- [ ] Made changes to one component at a time
- [ ] Tested after each change
- [ ] Verified responsive design still works
- [ ] Checked console for errors
- [ ] Tested on mobile devices

---

## 📝 Notes

- **This is a single-player game** vs 5 AI opponents (not multiplayer)
- **Uses local state** (no server sync needed for single session)
- **Fully responsive** (tested on multiple breakpoints)
- **Works on mobile** (iOS/Android via Capacitor)
- **Performance optimized** (CSS animations, not JS)

---

## 🎉 You're Ready!

You now have:
1. ✅ Complete code structure documentation
2. ✅ Visual layout diagrams
3. ✅ Component interaction guide
4. ✅ Practical code examples
5. ✅ Implementation checklist

**Start with [CODE_EXAMPLES.md](CODE_EXAMPLES.md) and pick the specific change you want to make first!**

---

**Last Updated**: May 3, 2026
**Total Documentation**: 4 markdown files + this index
**Estimated Learning Time**: 30-60 minutes for full understanding
