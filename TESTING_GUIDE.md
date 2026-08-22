# Testing Guide - Game Rules Fixes

## 🎯 What Was Fixed

### Fix 1: Declare Button Now Enables ✅
**Problem:** Button never enabled, even with valid hand  
**Solution:** Changed validation to check hand AFTER discard  
**File:** `src/screens/GameScreen.jsx` (Line 1155)

### Fix 2: Drop Popup Now Closes ✅
**Problem:** Popup appeared but never closed, blocking next round  
**Solution:** Added modal state reset in `startNextRound()`  
**File:** `src/screens/GameScreen.jsx` (Line 1118)

### Fix 3: Dealer Rotation ✅
**Problem:** Random dealer each round (not standard rules)  
**Solution:** Changed to round-robin rotation  
**File:** `src/screens/GameScreen.jsx` (Line 1147)

---

## 🧪 Test Scenarios

### Test 1: Declare Button Enables with Valid Hand

**Steps:**
1. Start a new game
2. Wait for your turn
3. Draw a card from closed/open deck
4. Arrange your hand to have:
   - 1 Pure Sequence (e.g., 4♠ 5♠ 6♠)
   - 1 More Sequence (e.g., 7♥ 8♥ 9♥)
   - Valid sets for remaining cards
5. Select a card to discard

**Expected Result:**
- ✅ Declare button (FINISH HERE) should **glow green**
- ✅ Console shows: `🎯 DECLARE CHECK { valid: true, ... }`
- ✅ Button is clickable

**If Invalid Hand:**
- ✅ Button stays dimmed/disabled
- ✅ Console shows: `🎯 DECLARE CHECK { valid: false, reason: '...' }`

---

### Test 2: Drop Popup Closes and Next Round Starts

**Steps:**
1. Start a new game
2. Wait for your turn
3. Click "Drop" button
4. See popup: "You dropped. +20 pts. Total: 20/101"
5. Click "New Round" button

**Expected Result:**
- ✅ Popup **closes immediately**
- ✅ New round starts
- ✅ Cards are dealt
- ✅ Turn indicator shows who starts
- ✅ Round number increases

**Before Fix:**
- ❌ Popup stayed open
- ❌ Game was stuck

---

### Test 3: Drop After Drawing (40 Points)

**Steps:**
1. Start a new game
2. Wait for your turn
3. Draw a card (from closed or open deck)
4. Click "Drop" button
5. See popup: "You dropped. +40 pts. Total: 40/101"
6. Click "New Round"

**Expected Result:**
- ✅ Penalty is **40 points** (not 20)
- ✅ Popup closes
- ✅ Next round starts

---

### Test 4: Wrong Declaration Penalty

**Steps:**
1. Start a new game
2. Wait for your turn
3. Draw a card
4. Select a card to discard
5. Try to declare with **invalid hand** (missing pure sequence)

**Expected Result:**
- ✅ Declare button should be **disabled** (dimmed)
- ✅ Cannot click it
- ✅ Console shows validation failure

**If you somehow trigger it:**
- ✅ +80 point penalty
- ✅ Popup shows: "Wrong declaration. +80 pts."
- ✅ Turn advances to next player

---

### Test 5: Valid Declaration

**Steps:**
1. Arrange a valid hand:
   - Pure Seq: 4♠ 5♠ 6♠
   - Sequence: 7♥ 8♥ 9♥
   - Set: 10♦ 10♣ 10♠
   - Set: J♥ J♦ J♣ J♠
2. Draw a card
3. Select a card to discard
4. Click "FINISH HERE" (declare button)

**Expected Result:**
- ✅ Confetti animation
- ✅ "YOU WIN!" popup
- ✅ +0 points for you
- ✅ AI players get points based on their hands
- ✅ Click "Next Round" to continue

---

### Test 6: Elimination at 101+

**Steps:**
1. Play multiple rounds
2. Accumulate 101+ points (drop multiple times)
3. Check scoreboard

**Expected Result:**
- ✅ Player with 101+ is marked as **ELIMINATED**
- ✅ Eliminated players skip turns
- ✅ Game continues with remaining players

---

### Test 7: Winner Detection

**Steps:**
1. Play until only 1 player remains under 101
2. All other players eliminated

**Expected Result:**
- ✅ Winner popup appears
- ✅ Message: "[Name] wins! Last remaining under 101."
- ✅ Click button returns to home screen

---

### Test 8: Dealer Rotation

**Steps:**
1. Play multiple rounds
2. Watch who starts each round

**Expected Result:**
- ✅ Round 1: Player 0 starts
- ✅ Round 2: Player 1 starts
- ✅ Round 3: Player 2 starts
- ✅ Round 4: Player 3 starts
- ✅ Round 5: Player 4 starts
- ✅ Round 6: Player 5 starts
- ✅ Round 7: Player 0 starts (cycles)

**Before Fix:**
- ❌ Random player each time

---

## 🐛 Known Issues (Not Fixed)

These are NOT part of the current fixes but are noted for future:

1. **Card Grouping Display** - Cards are grouped by suit, not by valid melds
   - This is cosmetic only
   - Validation uses correct engine
   - Not blocking gameplay

2. **AI Strategy** - AI discards highest point invalid card
   - Simple but functional
   - Not blocking gameplay

3. **Multiplayer** - Currently mock/local only
   - Photon integration needed
   - Not in scope for this fix

---

## 📊 Console Debugging

### Useful Console Messages:

**Declare Validation:**
```
🎯 DECLARE CHECK { valid: true, reason: undefined, handSize: 13, selectedCard: '4♠' }
```

**Turn Engine:**
```
TURN ENGINE: TURN START { currentTurn: 0, gameState: 'draw', hasDrawn: false }
```

**Score Updates:**
```
DEBUG: score calculation { playerDelta: 20, aiDeltas: [0,0,0,0,0], reason: 'Drop penalty applied (+20)' }
```

**Elimination:**
```
DEBUG: elimination trigger - player reached 101+ { player: 'You', score: 101 }
```

---

## ✅ Success Criteria

All tests pass if:

- [x] Declare button enables with valid hand
- [x] Declare button stays disabled with invalid hand
- [x] Drop popup closes when clicking "New Round"
- [x] Next round starts after drop
- [x] Scores accumulate correctly
- [x] Elimination triggers at 101+
- [x] Winner detected correctly
- [x] Dealer rotates properly
- [x] No console errors
- [x] No stuck states

---

## 🚀 Quick Test Commands

```bash
# Start dev server
npm run dev

# Open in browser
http://localhost:5173

# Test on Android
npm run build && npx cap sync android && npx cap open android
```

---

## 📝 Test Checklist

### Before Testing:
- [ ] Code changes applied
- [ ] Dev server running
- [ ] Browser console open (F12)

### During Testing:
- [ ] Test 1: Declare button ✅
- [ ] Test 2: Drop popup closes ✅
- [ ] Test 3: Drop penalty (40 pts) ✅
- [ ] Test 4: Wrong declaration ✅
- [ ] Test 5: Valid declaration ✅
- [ ] Test 6: Elimination ✅
- [ ] Test 7: Winner detection ✅
- [ ] Test 8: Dealer rotation ✅

### After Testing:
- [ ] No console errors
- [ ] No stuck states
- [ ] All modals close properly
- [ ] Game flows smoothly

---

## 🎓 Understanding the Fixes

### Why Declare Button Was Broken:

**Old Logic:**
```javascript
const canDeclareMove = !!validateMove('declare').ok
```

This checked if you COULD declare, but `validateMove` was checking the CURRENT hand, not the hand AFTER discarding.

**New Logic:**
```javascript
const canDeclareMove = useMemo(() => {
  // ... check requirements ...
  const handAfterDiscard = playerHand.filter(c => c.id !== selectedCard.id)
  const verdict = getDeclarationVerdict(handAfterDiscard)
  return verdict.valid
}, [isPlayerTurn, gameState, hasDrawn, selectedCard, playerHand])
```

This checks if the hand AFTER discarding the selected card would be valid.

### Why Drop Popup Was Stuck:

**Old Logic:**
```javascript
function startNextRound() {
  // ... deal new round ...
  // ❌ Never closed the modal!
}
```

**New Logic:**
```javascript
function startNextRound() {
  setShowResult(false)  // ✅ Close modal
  setShowDeclare(false) // ✅ Close declare modal
  setResultMsg('')      // ✅ Clear message
  // ... deal new round ...
}
```

---

**Status:** ✅ **All Fixes Applied**  
**Ready for Testing:** ✅ **Yes**  
**Risk Level:** 🟢 **Low (Isolated changes)**
