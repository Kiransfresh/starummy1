const fs = require('fs');
const file = 'src/screens/GameScreen.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. State changes
code = code.replace(
  /const \[aiHand,       setAiHand\]       = useState\(\[\]\)\n/,
  ''
);
code = code.replace(
  /const \[aiScore,      setAiScore\]      = useState\(0\)\n/,
  ''
);
code = code.replace(
  /const \[isPlayerTurn, setIsPlayerTurn\] = useState\(true\)/,
  'const [currentTurn,  setCurrentTurn]  = useState(0)\n  const isPlayerTurn = currentTurn === 0\n  const currentTurnRef = useRef(0)'
);

// 2. Add advanceTurn, playAITurn, and getAIPositions after handleCardDragOver
const newFunctions = `
  function advanceTurn() {
    let next = (currentTurnRef.current + 1) % tableSize
    setAiPlayers(ais => {
      let safeNext = next
      while (safeNext !== 0 && ais[safeNext - 1]?.isEliminated) {
        safeNext = (safeNext + 1) % tableSize
        if (safeNext === currentTurnRef.current) break
      }
      currentTurnRef.current = safeNext
      setCurrentTurn(safeNext)
      setHasDrawn(false)
      setGameState('draw')
      if (safeNext !== 0) {
        setTimeout(() => playAITurn(safeNext - 1), 1000)
      }
      return ais
    })
  }

  function playAITurn(aiIndex) {
     setAiPlayers(ais => {
        const ai = ais[aiIndex];
        if (ai.isEliminated) {
           setTimeout(advanceTurn, 100);
           return ais;
        }
        setDrawPile(dp => {
           if (!dp.length) return dp;
           const card = dp[0];
           const newDp = dp.slice(1);
           const newHand = [...ai.hand, card];
           setAiPlayers(prevAis => {
              const nais = [...prevAis];
              nais[aiIndex] = { ...nais[aiIndex], hand: newHand };
              return nais;
           });
           setTimeout(() => doAiDiscard(aiIndex, newHand), 1000);
           return newDp;
        });
        return ais;
     });
  }

  function doAiDiscard(aiIndex, currentHand) {
      const groups   = getHandGroups(currentHand)
      const evals    = groups.map(g => evalGroup(g))
      let discard    = currentHand[currentHand.length-1]
      let maxPts     = -1
      groups.forEach((g, gi) => {
        if (!evals[gi].valid) {
          g.forEach(c => {
            if (c.pts > maxPts) { maxPts = c.pts; discard = c }
          })
        }
      })
      const finalHand = currentHand.filter(c => c.id !== discard.id)
      setAiPlayers(ais => {
         const next = [...ais]
         next[aiIndex] = { ...next[aiIndex], hand: finalHand }
         showToast(\`\${next[aiIndex].name} discarded \${discard.rank}\${discard.suit}\`)
         return next
      })
      setDiscardPile(p => [...p, discard])
      advanceTurn()
  }

  function getAIPositions(size) {
    if (size === 2) return [{ top: 52, left: '50%', transform: 'translateX(-50%)' }]
    if (size === 4) return [
      { top: '40%', left: 20, transform: 'translateY(-50%)' },
      { top: 52, left: '50%', transform: 'translateX(-50%)' },
      { top: '40%', right: 20, transform: 'translateY(-50%)' },
    ]
    if (size === 6) return [
      { top: '50%', left: 20, transform: 'translateY(-50%)' },
      { top: 70, left: '20%', transform: 'none' },
      { top: 52, left: '50%', transform: 'translateX(-50%)' },
      { top: 70, right: '20%', transform: 'none' },
      { top: '50%', right: 20, transform: 'translateY(-50%)' },
    ]
    return []
  }
`;

code = code.replace(/function handleCardDragOver\(e, index\) {[\s\S]*?}/, match => match + newFunctions);

// 3. Update Dealing effect
code = code.replace(/const ais = dealt.aiHands.map\(\(hand, i\) => \(\{[\s\S]*?\}\)\)\n\s*setAiPlayers\(ais\)/, `const ais = dealt.aiHands.map((hand, i) => ({
      id: i,
      name: AI_NAMES[i],
      hand,
      score: 0,
      isEliminated: false,
    }))
    setAiPlayers(ais)
    setCurrentTurn(0)
    currentTurnRef.current = 0`);

// 4. Update DiscardCard function
code = code.replace(/setIsPlayerTurn\(false\)\n\s+setTimeout\(\(\) => aiTurn\(newHand\), 1500\)/g, `advanceTurn()`);
// 5. Update Wrong declaration
code = code.replace(/setIsPlayerTurn\(false\)\n\s+setTimeout\(\(\) => aiTurn\(handAfterDiscard\), 1500\)/g, `advanceTurn()`);
// 6. Update auto discard
code = code.replace(/setIsPlayerTurn\(false\)\n\s+setTimeout\(\(\) => aiTurn\(newHand\), 1500\)/g, `advanceTurn()`);

// 7. Remove old aiTurn function
code = code.replace(/\/\/ AI TURN[\s\S]*?\/\/ AUTO DISCARD/m, `// AUTO DISCARD`);

// 8. Update New Round
code = code.replace(/setAiHand\(dealt.aiHands\?\.\[0\] \|\| \[\]\)/, `const ais = dealt.aiHands.map((hand, i) => ({
                    id: i,
                    name: AI_NAMES[i] || 'AI',
                    hand,
                     score: 0,
                    isEliminated: false
                  }))
                  setAiPlayers(ais)`);
code = code.replace(/setIsPlayerTurn\(true\)/, `setCurrentTurn(0)\n                  currentTurnRef.current = 0`);

// 9. Replace Opponents rendering
const opponentRendering = `      {/* ── OPPONENTS ── */}
      {aiPlayers.map((ai, index) => {
        const positions = getAIPositions(tableSize)
        const pos = positions[index] || {}
        const isThisAiTurn = currentTurn === index + 1
        return (
          <div key={ai.id} style={{
            position:'absolute',
            display:'flex', flexDirection:'column',
            alignItems:'center', zIndex:10, gap:2,
            ...pos
          }}>
            <div style={{
              background:'rgba(0,0,0,0.55)',
              borderRadius:999, padding:'2px 12px',
              color:'white', fontSize:11, fontWeight:'bold'
            }}>{ai.name}</div>
            <div className={isThisAiTurn ? 'turn-pulse' : ''} style={{
              width:46, height:46, borderRadius:'50%',
              background:'#5d4037',
              border:\`3px solid \${isThisAiTurn ? C.gold : 'rgba(255,255,255,0.2)'}\`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22,
              boxShadow: isThisAiTurn ? \`0 0 14px \${C.gold}\` : 'none',
              transition:'border-color 0.3s,box-shadow 0.3s'
            }}>👤</div>
            <div style={{
              background:'rgba(0,0,0,0.6)', borderRadius:999,
              padding:'1px 8px', color:C.gold, fontSize:10
            }}>PTS: {ai.score}</div>
            <div style={{ display:'flex', marginTop:2 }}>
              {Array(Math.min(ai.hand.length, 5)).fill(0).map((_,i)=>(
                <CardBack key={i} width={18} height={26}
                  style={{ marginLeft: i>0 ? -7 : 0 }}/>
              ))}
              {ai.hand.length > 5 && (
                <span style={{ color:C.grey, fontSize:9, marginLeft:3 }}>
                  +{ai.hand.length-5}
                </span>
              )}
            </div>
          </div>
        )
      })}`;
code = code.replace(/\{\/\* ── OPPONENT ── \*\/\}[\s\S]*?\{\/\* ── TABLE CONTENT ── \*\/\}/, `${opponentRendering}\n\n      {/* ── TABLE CONTENT ── */}`);

// 10. Turn pill text
code = code.replace(/\{isPlayerTurn \? '⚡ YOUR TURN' : "Priya's turn"\}/, `{isPlayerTurn ? '⚡ YOUR TURN' : \`\${aiPlayers[currentTurn - 1]?.name}'s turn\`}`);

fs.writeFileSync(file, code);
console.log('Patched GameScreen.jsx');
