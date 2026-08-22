/**
 * GAME SCREEN ALIGNMENT - CONSOLIDATION COMPLETE ✅
 * 
 * PROBLEM FIXED:
 * - Alignment logic was scattered across 10+ files causing conflicts
 * - CSS hardcoded bottom: 78px conflicted with dynamic calculations (116-148px)
 * - Multiple components recalculating the same breakpoints independently
 * - AI player positions were hardcoded, not responsive
 * - Controls sizing calculated twice (GameScreen + Controls.jsx)
 * 
 * SOLUTION IMPLEMENTED:
 * All alignment calculations consolidated into ONE centralized system
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * KEY FILES CHANGED
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ NEW: src/utils/alignmentConfig.js
 *    - calculateAlignment(viewportWidth, viewportHeight, isLandscape)
 *    - getAIPositions(tableSize) - responsive AI player positioning
 *    - Single source of truth for ALL spacing, sizing, breakpoints
 * 
 * ✅ UPDATED: src/screens/GameScreen.jsx
 *    Line 7: + import { calculateAlignment } from '../utils/alignmentConfig'
 *    Line 440-442: Replaced 15+ lines of alignment calcs with 1 function call
 *    All props now come from alignment config object
 * 
 * ✅ UPDATED: src/screens/Controls.jsx
 *    - pillStyle() function now accepts sizing parameters
 *    - Removed duplicate compactMode/smallMode calculations
 *    - Receives sizing from parent (GameScreen) via props
 * 
 * ✅ UPDATED: src/screens/PlayersAroundTable.jsx
 *    - Now receives getAIPositions function
 *    - Positions are responsive to viewport (was hardcoded)
 *    - isShortLandscape and tableCompact params for dynamic adjustments
 * 
 * ✅ UPDATED: src/index.css
 *    - Removed hardcoded bottom: 78px from .player-hand
 *    - Now dynamically positioned by GameScreen (handBottom value)
 *    - Eliminates CSS/inline-style conflict
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * BENEFITS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ NO MORE CONFLICTS
 *    CSS no longer fights with inline styles over positioning
 * 
 * ✅ CONSISTENT EVERYWHERE
 *    All components use the SAME breakpoint calculations
 *    No more duplicate/conflicting responsive logic
 * 
 * ✅ RESPONSIVE AI POSITIONS
 *    getAIPositions() generates positions based on actual viewport
 *    Scales properly on short landscape (height ≤ 420px)
 * 
 * ✅ EASY MAINTENANCE
 *    Change alignment logic? Only update alignmentConfig.js
 *    All components automatically use new values
 * 
 * ✅ BUILD SUCCESS
 *    npm run dev compiles without errors
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT TO TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. LANDSCAPE MODE (Main Focus)
 *    [ ] Player hand at bottom shows correct spacing
 *    [ ] Action buttons (Leave, Sort, Discard, Declare) properly aligned
 *    [ ] Draw/Discard piles centered correctly
 *    [ ] AI players positioned correctly around table
 *    [ ] Game table size responsive
 * 
 * 2. SHORT LANDSCAPE (Height ≤ 420px)
 *    [ ] Compact mode activates correctly
 *    [ ] Cards smaller but still visible
 *    [ ] AI positions adjust (higher on screen)
 *    [ ] No overlapping elements
 * 
 * 3. ROTATE BETWEEN ORIENTATIONS
 *    [ ] Portrait: All other screens work normally
 *    [ ] Landscape: Game screen shows up with correct alignment
 *    [ ] Back to Portrait: Smooth transition
 * 
 * 4. DIFFERENT DEVICES
 *    [ ] iPhone SE (narrow: 375px) - uses isIphoneSE breakpoint
 *    [ ] Standard Phone (376-430px) - normal sizing
 *    [ ] Fold/Tablet (430-900px) - larger cards
 *    [ ] Desktop (900px+) - side scoreboard visible
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * HOW THE ALIGNMENT CONFIG WORKS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * // In GameScreen.jsx, calculate ONCE:
 * const alignment = calculateAlignment(viewportWidth, viewportHeight, isLandscape)
 * 
 * // Returns object with ALL values:
 * {
 *   isShortLandscape: boolean,
 *   isIphoneSE: boolean,
 *   isStandardPhone: boolean,
 *   isFoldOrTablet: boolean,
 *   tableCompact: boolean,
 *   cardW: number,        // Calculated card width
 *   cardH: number,        // Calculated card height
 *   handBottom: number,   // Distance from bottom for player hand
 *   actionBarHeight: number,
 *   centerAreaTop: string, // CSS percentage for center draw area
 *   getAIPositions: fn,   // Function to get AI player positions
 *   // ... and more
 * }
 * 
 * // Pass to child components:
 * <Controls {...alignment} />
 * <PlayersAroundTable getAIPositions={alignment.getAIPositions} />
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * FILES THAT CAN BE DELETED
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * patch_game_screen.cjs - The AI positioning logic is now in alignmentConfig.js
 *                        (Keep as backup if needed, but no longer used)
 */
