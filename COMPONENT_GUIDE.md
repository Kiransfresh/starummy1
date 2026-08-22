# Component Interaction & Data Flow Guide

## 📊 Component Dependency Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          GAMESCREEN (Root)                              │
│                   State: gameState, playerHand, etc                      │
└──────────────────────────────────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
   ┌─────────┐                  ┌──────────────┐          ┌──────────────┐
   │  TopBar │                  │ TABLE ZONE   │          │ BOTTOM ZONE  │
   └─────────┘                  └──────────────┘          └──────────────┘
                                     │                            │
                        ┌────────────┼────────────┐               │
                        │            │            │               │
                        ▼            ▼            ▼               ▼
                   ┌──────────┐ ┌─────────┐ ┌─────────┐    ┌────────────┐
                   │GameTable │ │Players  │ │CenterA  │    │PlayerHand  │
                   │Modern    │ │AroundT. │ │rea      │    │+ Controls  │
                   └──────────┘ └─────────┘ └─────────┘    │+ Status    │
                                                           └────────────┘
```

---

## 🔄 Data Flow Patterns

### **Pattern 1: Drawing a Card**

```
User clicks "Draw from Deck"
         │
         ▼
PlayerHand.jsx (onDrawClosed prop) fires
         │
         ▼
GameScreen.drawFromPile(false) executes
         │
         ├─ Validate turn & game state
         ├─ Pick random card from drawPile array
         ├─ Remove from drawPile state
         ├─ Trigger flying card animation (setFlyingCard)
         │
         ├─ After 300ms animation:
         │  ├─ Add card to playerHand array
         │  ├─ Set selectedCard = drawn card
         │  ├─ setHasDrawn(true)
         │  ├─ setGameState('discard')
         │  └─ Trigger draw animation
         │
         ▼
CenterArea.jsx re-renders
         │
         ├─ Discard button becomes visible
         ├─ Declare button becomes enabled
         │
         ▼
PlayerHand.jsx re-renders
         │
         ├─ New card appears at end of hand
         ├─ Draw pop animation plays
         └─ Card is automatically selected
```

### **Pattern 2: Declaring (Winning)**

```
User selects card + clicks "Declare"
         │
         ▼
Controls.jsx (onDeclare prop) fires
         │
         ▼
GameScreen.declare() executes
         │
         ├─ Validate: must have 13 cards in hand
         ├─ Create hand after discard (remove selected card)
         ├─ Call getDeclarationVerdict(handAfterDiscard)
         │  │
         │  └─ Checks with engine.js validation
         │     ├─ Pure sequence check
         │     ├─ 2+ sequences check
         │     └─ All cards in valid groups
         │
         ├─ If VALID:
         │  ├─ Set winner = current player
         │  ├─ Calculate scores (winner = 0)
         │  ├─ applyRoundScores() → updates scoreboard
         │  ├─ Check if anyone reached 101+
         │  ├─ If yes → eliminate, show results
         │  ├─ If no → startNextRound()
         │
         └─ If INVALID:
            ├─ Show error toast
            └─ Player continues playing
```

### **Pattern 3: AI Player Turn**

```
setCurrentTurn(1) executed (Next player)
         │
         ▼
useEffect triggers (dependent on currentTurn)
         │
         ├─ Check if player is AI
         ├─ setTurnPhase('ai_turn')
         ├─ Delay 800ms (for visual effect)
         │
         ├─ AI decides: Draw or Declare?
         │  ├─ Run AI logic (looks at hand value)
         │  ├─ Calculate valid moves
         │  └─ Choose best action
         │
         ├─ If DRAW:
         │  ├─ Pick from draw or discard pile
         │  ├─ setAiActionAnim({type:'draw', playerIndex: 1})
         │  ├─ Remove card from appropriate pile
         │  ├─ Add to AI hand
         │  ├─ Delay 600ms
         │
         ├─ Then DISCARD:
         │  ├─ Pick worst card from hand
         │  ├─ setAiActionAnim({type:'discard', playerIndex: 1})
         │  ├─ Move card to discardPile
         │  ├─ Delay 600ms
         │
         └─ Next turn → setCurrentTurn(2)
```

---

## 🎯 State Management Hub

### **GameScreen.jsx - Central State**

```javascript
// Game Flow State
gameState                // 'dealing' | 'draw' | 'discard' | 'finished'
currentTurn              // 0-5 (which player index)
isPlayerTurn             // currentTurn === 0
turnPhase                // 'idle' | 'player_turn' | 'ai_turn' | 'advancing_turn'

// Player Data
playerHand: Card[]       // 13 cards in hand
selectedCard: Card|null  // Currently selected for discard
playerScore: number      // Cumulative score

// Piles
drawPile: Card[]         // Remaining cards to draw from
discardPile: Card[]      // Cards that have been discarded
wildJoker: Card          // Current round's wild joker

// AI Players
aiPlayers: Array<{
  id, name, hand, score, isEliminated
}>

// Animation Triggers
flyingCard: { card, fromPile, toHand }  // Card in flight animation
aiActionAnim: { type, playerIndex }      // AI action indicator
confetti: Array<piece>                   // Winning animation particles

// UI State
hasDrawn: boolean        // Did player draw this turn?
showDeclare: boolean     // Show declare button?
showResult: boolean      // Show end-of-round result?
declaration: Object      // Declaration validation result
```

---

## 📡 Props Drilling & Component Communication

### **TopBar.jsx Props**
```javascript
<TopBar 
  playerScore={playerScore}           // Number
  onBack={() => setScreen('home')}    // Callback
  onReport={() => showToast(...)}     // Callback
/>
```

### **GameTable Props**
```javascript
<GameTable 
  compact={tableCompact}  // Boolean - responsive flag
/>
```

### **PlayersAroundTable Props**
```javascript
<PlayersAroundTable
  aiPlayers={aiPlayers}           // Array of AI player objects
  isPlayerTurn={isPlayerTurn}     // Boolean
  aiActionAnim={aiActionAnim}     // { type, playerIndex } | null
  viewportWidth={viewportWidth}   // Number - for positioning
  tableCompact={tableCompact}     // Boolean
/>
```

### **CenterArea Props**
```javascript
<CenterArea
  wildJoker={wildJoker}                      // Card object
  drawPile={drawPile}                        // Card array
  discardPile={discardPile}                  // Card array
  gameState={gameState}                      // String
  isPlayerTurn={isPlayerTurn}                // Boolean
  turnTimer={turnTimer}                      // Number (seconds)
  aiPlayers={aiPlayers}                      // For display only
  onDrawClosed={() => drawFromPile(false)}   // Callback
  onDrawOpen={() => drawFromPile(true)}      // Callback
  onDeclare={declare}                        // Callback
  canDrawClosed={canDrawMove}                // Boolean
  canDrawOpen={canDrawOpenMove}              // Boolean
  canDeclare={canDeclareMove}                // Boolean
/>
```

### **PlayerHand Props**
```javascript
<PlayerHand
  playerHand={playerHand}                    // Card array
  selectedCard={selectedCard}                // Card | null
  gameState={gameState}                      // String
  cardW={cardW}                              // Number (pixels)
  cardH={cardH}                              // Number (pixels)
  handRef={handRef}                          // React ref
  onCardSelect={selectCard}                  // Callback
  onCardDragStart={onCardDragStart}          // Callback
  onCardDragEnter={onCardDragEnter}          // Callback
  onCardDragOver={onCardDragOver}            // Callback
  onCardDrop={onCardDrop}                    // Callback
  onCardDragEnd={onCardDragEnd}              // Callback
  onHandMouseDown={onHandMouseDown}          // Callback
  onHandMouseMove={onHandMouseMove}          // Callback
  onHandTouchStart={onHandTouchStart}        // Callback
  onHandTouchMove={onHandTouchMove}          // Callback
  isDragging={isDragging}                    // Boolean
  dragIndex={dragIndex}                      // Number | null
  dragOverIdx={dragOverIdx}                  // Number | null
  groupFlash={groupFlash}                    // { groupIndex: state }
  canInteract={canSelectCard}                // Boolean
  viewportWidth={viewportWidth}              // Number
  viewportHeight={viewportHeight}            // Number
/>
```

### **Controls Props**
```javascript
<Controls
  playerScore={playerScore}                  // Number
  gameState={gameState}                      // String
  selectedCard={selectedCard}                // Card | null
  hasDrawn={hasDrawn}                        // Boolean
  declaration={declaration}                  // Declaration object
  onDeclare={declare}                        // Callback
  onDropGame={dropGame}                      // Callback
  onSort={sortHand}                          // Callback
  onDiscard={discardCard}                    // Callback
  isPlayerTurn={isPlayerTurn}                // Boolean
  canDropMove={canDropMove}                  // Boolean
/>
```

---

## 🔧 Key Functions in GameScreen.jsx

### **Main Game Functions**

```javascript
// Card drawing
function drawFromPile(fromDiscard = false)
  → Picks card from pile
  → Animates flying card
  → Adds to playerHand
  → Sets gameState to 'discard'

// Card discarding
function discardCard(card)
  → Removes card from playerHand
  → Adds to discardPile
  → Animates flying card
  → Advances turn to next player

// Declaration
function declare()
  → Validates hand with engine
  → If valid → calculate scores & start new round
  → If invalid → show error, continue playing

// Hand sorting
function sortHand()
  → Groups cards by suit
  → Sorts by rank
  → Triggers sort animation

// Dropping (forfeit)
function dropGame()
  → Player forfeits round
  → Adds full hand value to score
  → Starts new round

// Turn management
function startNextRound()
  → Resets all state
  → Deals new hands
  → Random first player
  → Resets drawn flags

// Turn advancement
function advanceTurn()
  → Move to next player
  → If AI → execute AI logic
  → If player → reset draw/discard state
```

### **Validation Functions**

```javascript
function validateMove(action, payload)
  → Checks: turn lock, player turn, game state
  → Returns: { ok: boolean, message: string }
  → Actions: 'draw', 'discard', 'declare', 'sort', 'drop'

function getDeclarationVerdict(handAfterDiscard)
  → Calls engine.js validation
  → Returns: { valid, groups, reason }

function calcScore(hand)
  → Sums up unmatched card values
  → Returns: point penalty
```

---

## 🎨 Styling & Layout State

### **Responsive Calculation**

```javascript
useEffect(() => {
  // Detect viewport changes
  const updateDimensions = () => {
    setViewportWidth(window.innerWidth)
    setViewportHeight(window.innerHeight)
  }
  
  // Derived state
  const isMobileLandscape = isLandscape && viewportHeight < 600
  const isShortLandscape = isLandscape && viewportWidth < 900
  const tableCompact = isMobileLandscape || isShortLandscape
  
  // Card dimensions recalculated
  const cardW = isMobileLandscape ? 44 : isShortLandscape ? 48 : 52
  const cardH = isMobileLandscape ? 64 : isShortLandscape ? 70 : 76
}, [viewportWidth, viewportHeight, isLandscape])
```

---

## 🎬 Animation State Management

### **Flying Card Animation Flow**

```javascript
setFlyingCard({
  card: drawnCard,
  fromPile: 'draw',    // or 'discard'
  toHand: true
})
  │
  ├─ CenterArea renders flying card during 300ms
  │
  └─ After 300ms:
     └─ setFlyingCard(null) // Animation ends
     └─ Card appears in PlayerHand
```

### **AI Action Animation Flow**

```javascript
setAiActionAnim({
  type: 'draw',        // or 'discard'
  playerIndex: 1
})
  │
  ├─ PlayersAroundTable shows animation indicator
  │
  └─ After 600ms:
     └─ setAiActionAnim(null)
     └─ Animation ends
```

---

## 🚨 Error Handling & Validation

### **Validation Chain**

```
User Action
  │
  ▼
validateMove(action)  ← Guard 1: Basic state check
  │ (returns { ok: boolean })
  │
  ├─ if !ok → showToast(message) → Exit
  │
  ▼
runGuarded('action', fn)  ← Guard 2: Execute function if valid
  │
  ├─ if declaration: getDeclarationVerdict()
  │  ├─ Check hand structure with engine
  │  ├─ Validate sequences & sets
  │  └─ Return verdict
  │
  ├─ if verdict.invalid → showToast(reason) → Continue round
  │
  └─ if verdict.valid → Start new round
```

---

## 💾 State Persistence

### **Zustand Store (store.js)**

```javascript
// Global state (persists across screens)
useGameStore(state => state.user)        // Current logged-in user
useGameStore(state => state.setScreen)   // Screen navigation

// Everything else is local component state in GameScreen
// No persistence needed for game session (one-time play)
```

---

## 🔌 Integration Points for Replacement

| What to Replace | File | Key Section | Why |
|---|---|---|---|
| Table background | `GameTableModern.jsx` | `.map ~ styles object` | Visual look |
| AI positioning | `PlayersAroundTable.jsx` | `positions` array calculation | Seat layout |
| Card pile location | `CenterArea.jsx` | Grid/flex positioning | Deck placement |
| Hand layout | `PlayerHand.jsx` | Flex/Grid container | Hand display |
| Button styling | `Controls.jsx` | Style objects | Button appearance |
| Animations | `GameScreen.jsx` | CSS keyframes section | Motion effects |
| Colors | Any component | `const C = { ... }` | Theme colors |

---

## 🎓 Component Replacement Guide

### **To Replace Table Background:**

1. Open `GameTableModern.jsx`
2. Find the motion.div with `backgroundImage`
3. Change or remove `backgroundImage` property
4. Adjust `backgroundColor` for base color
5. Modify `boxShadow` values for lighting
6. Update `borderRadius` if shape changes

### **To Reposition AI Players:**

1. Open `PlayersAroundTable.jsx`
2. Find positioning calculations
3. Modify percentage values (e.g., `top: '18%'` → `'20%'`)
4. Or use CSS Grid/absolute positioning alternative
5. Adjust `transform` translate values

### **To Change Card Pile Position:**

1. Open `CenterArea.jsx`
2. Find the main container style
3. Modify `top`, `left`, positioning
4. Adjust child elements (draw pile, discard pile) relative positions

---

## 📝 Quick Command Reference

```javascript
// Force state update
setPlayerHand([...playerHand])  // Spread creates new reference

// Clear all pending timeouts
clearTimeout(turnStartTimeoutRef.current)
clearTimeout(aiTurnTimeoutRef.current)
clearTimeout(aiDiscardTimeoutRef.current)

// Show notification
showToast('Message text')

// Trigger animation
setFlyingCard({ card, fromPile, toHand })
setAiActionAnim({ type: 'draw', playerIndex: 1 })

// Navigate away
setScreen('home')  // From Zustand store
```

---

**For specific file paths and line numbers, see STRUCTURE.md**
