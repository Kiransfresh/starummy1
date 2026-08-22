// =============================================
// 101 POOL RUMMY GAME SIMULATION TEST
// =============================================

const SUITS = ['♠','♥','♦','♣']
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

// Game state simulation
class GameSimulation {
  constructor(numPlayers = 6) {
    this.numPlayers = numPlayers
    this.roundNumber = 1
    this.scores = new Array(numPlayers).fill(0)
    this.eliminated = new Array(numPlayers).fill(false)
    this.winner = null
    this.gameLog = []
    this.maxRounds = 50 // Safety limit
    this.roundsPlayed = 0
  }

  log(message, data = {}) {
    this.gameLog.push({ round: this.roundNumber, message, ...data })
  }

  makeDeck() {
    const deck = []
    let id = 0
    for (let s of SUITS)
      for (let r of RANKS)
        deck.push({
          id: id++, rank: r, suit: s,
          pts: ['A','J','Q','K','10'].includes(r) ? 10 : parseInt(r) || 0,
          isJoker: false
        })
    deck.push({ id: 52, rank: '🃏', suit: '', pts: 0, isJoker: true })
    deck.push({ id: 53, rank: '🃏', suit: '', pts: 0, isJoker: true })
    return deck
  }

  shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  dealCards(deck, numPlayers) {
    const s = this.shuffle(deck)
    const hands = []
    for (let i = 0; i < numPlayers; i++) {
      hands.push(s.slice(i * 13, (i + 1) * 13))
    }
    const offset = numPlayers * 13
    return {
      playerHands: hands,
      drawPile: s.slice(offset),
      discardPile: [s[offset]],
      wildJoker: s[offset + 1],
    }
  }

  // Group cards by suit then rank for display
  getHandGroups(hand) {
    if (!hand || hand.length === 0) return [[]]
    const bySuit = {}
    hand.forEach(card => {
      const key = card.isJoker ? 'joker' : card.suit
      if (!bySuit[key]) bySuit[key] = []
      bySuit[key].push(card)
    })
    Object.keys(bySuit).forEach(suit => {
      if (suit !== 'joker') {
        bySuit[suit].sort((a,b) =>
          RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank))
      }
    })
    return Object.values(bySuit).filter(g => g.length > 0)
  }

  // Evaluate a single group of cards
  evalGroup(group) {
    if (!group || group.length === 0)
      return { label:'Empty', color:'#555', pts:0, valid:false }

    const jokers  = group.filter(c => c.isJoker)
    const natural = group.filter(c => !c.isJoker)
    const pts = natural.reduce((s,c) => s+(c.pts||0), 0)

    // PURE SEQUENCE: 3+ same suit consecutive, NO joker
    if (jokers.length === 0 && natural.length >= 3) {
      const sameSuit = natural.every(
        c => c.suit === natural[0].suit)
      if (sameSuit) {
        const idx = natural
          .map(c => RANKS.indexOf(c.rank))
          .sort((a,b) => a-b)
        const isConsec = idx.every(
          (v,i) => i===0 || v===idx[i-1]+1)
        if (isConsec)
          return {
            label:'Pure Sequence',
            color:'#1565c0', pts:0, valid:true,
            type:'pureSeq'
          }
      }
    }

    // SEQUENCE: 3+ same suit consecutive, joker allowed
    if (natural.length >= 2) {
      const sameSuit = natural.every(
        c => c.suit === natural[0].suit)
      if (sameSuit) {
        const idx = natural
          .map(c => RANKS.indexOf(c.rank))
          .sort((a,b) => a-b)
        const gaps = idx.reduce((acc,v,i) =>
          i===0 ? 0 : acc+(v-idx[i-1]-1), 0)
        if (gaps <= jokers.length && natural.length+jokers.length >= 3)
          return {
            label:'Sequence',
            color:'#2e7d32', pts:0, valid:true,
            type:'seq'
          }
      }
    }

    // SET: 3-4 same rank, different suits, joker allowed
    if (natural.length >= 2) {
      const sameRank = natural.every(
        c => c.rank === natural[0].rank)
      const uniqueSuits = new Set(
        natural.map(c => c.suit)).size
      const total = natural.length + jokers.length
      if (sameRank && uniqueSuits === natural.length
          && total >= 3 && total <= 4)
        return {
          label:'Set',
          color:'#2e7d32', pts:0, valid:true,
          type:'set'
        }
    }

    // INVALID
    return {
      label:`Invalid(${pts})`,
      color:'#c62828', pts, valid:false,
      type:'invalid'
    }
  }

  // Check if hand can be declared
  checkDeclaration(hand) {
    const groups = this.getHandGroups(hand)
    const evals  = groups.map(g => this.evalGroup(g))

    const hasPureSeq = evals.some(
      e => e.type === 'pureSeq')
    const seqCount = evals.filter(
      e => e.type === 'pureSeq' || e.type === 'seq').length
    const allValid = evals.every(e => e.valid)
    const totalInvalidPts = evals.reduce(
      (s,e) => s+e.pts, 0)

    return {
      canDeclare: hasPureSeq && seqCount >= 2 && allValid,
      hasPureSeq,
      seqCount,
      allValid,
      totalInvalidPts,
      reason: !hasPureSeq
        ? 'Need 1 Pure Sequence!'
        : seqCount < 2
          ? 'Need 2 Sequences!'
          : !allValid
            ? `${totalInvalidPts} pts not in valid groups`
            : ''
    }
  }

  // Calculate score for a hand
  calcScore(hand) {
    const groups = this.getHandGroups(hand)
    return groups.reduce((s,g) => s+this.evalGroup(g).pts, 0)
  }

  // Simulate a complete round
  simulateRound() {
    this.roundsPlayed++
    this.log('ROUND_START', { round: this.roundNumber, scores: [...this.scores] })

    const deck = this.numPlayers === 6
      ? [...this.makeDeck(), ...this.makeDeck()]
      : this.makeDeck()
    const dealt = this.dealCards(deck, this.numPlayers)

    const hands = dealt.playerHands
    let drawPile = dealt.drawPile
    let discardPile = dealt.discardPile
    const wildJoker = dealt.wildJoker

    this.log('DEALT', {
      wildJoker: `${wildJoker.rank}${wildJoker.suit}`,
      handSizes: hands.map(h => h.length)
    })

    // Simulate turns until someone declares or drops
    let currentPlayer = 0
    let roundEnded = false
    let roundWinner = null
    let roundScores = new Array(this.numPlayers).fill(0)
    let turnCount = 0
    const maxTurns = 1000 // Safety limit

    while (!roundEnded && turnCount < maxTurns) {
      turnCount++

      // Skip eliminated players
      let activePlayer = currentPlayer
      let skipCount = 0
      while (this.eliminated[activePlayer] && skipCount < this.numPlayers) {
        activePlayer = (activePlayer + 1) % this.numPlayers
        skipCount++
      }

      if (skipCount >= this.numPlayers) {
        // All players eliminated - this shouldn't happen
        this.log('ERROR_ALL_ELIMINATED', { turnCount })
        roundEnded = true
        break
      }

      currentPlayer = activePlayer

      // Simulate player turn
      const hand = hands[currentPlayer]
      let drewCard = false

      // AI decision: draw from discard if useful, otherwise from pile
      const topDiscard = discardPile[discardPile.length - 1]
      let drawFromDiscard = false

      if (topDiscard && this.isCardUseful(hand, topDiscard, wildJoker)) {
        // Draw from discard
        hand.push(topDiscard)
        discardPile.pop()
        drawFromDiscard = true
        drewCard = true
        this.log('DRAW_DISCARD', {
          player: currentPlayer,
          card: `${topDiscard.rank}${topDiscard.suit}`,
          handSize: hand.length
        })
      } else {
        // Draw from pile (with reshuffling if needed)
        if (drawPile.length === 0) {
          // Reshuffle discard pile (except top card)
          if (discardPile.length <= 1) {
            this.log('ERROR_NO_CARDS_TO_RESHUFFLE', { player: currentPlayer, turnCount })
            roundEnded = true
            break
          }
          const topCard = discardPile[discardPile.length - 1]
          const cardsToShuffle = discardPile.slice(0, -1)
          drawPile = this.shuffle(cardsToShuffle)
          discardPile = [topCard]
          this.log('RESHUFFLE', {
            player: currentPlayer,
            newDrawPileSize: drawPile.length,
            remainingDiscard: discardPile.length
          })
        }

        if (drawPile.length > 0) {
          const randomIndex = Math.floor(Math.random() * drawPile.length)
          const card = drawPile[randomIndex]
          drawPile.splice(randomIndex, 1)
          hand.push(card)
          drewCard = true
          this.log('DRAW_PILE', {
            player: currentPlayer,
            card: `${card.rank}${card.suit}`,
            handSize: hand.length
          })
        } else {
          this.log('ERROR_NO_CARDS_AFTER_RESHUFFLE', { player: currentPlayer, turnCount })
          roundEnded = true
          break
        }
      }

      if (drewCard && hand.length === 14) {
        // Check if can declare
        const check = this.checkDeclaration(hand)
        if (check.canDeclare) {
          // Valid declaration!
          this.log('DECLARATION_VALID', {
            player: currentPlayer,
            handSize: hand.length
          })

          // Calculate scores for other players
          for (let i = 0; i < this.numPlayers; i++) {
            if (i !== currentPlayer && !this.eliminated[i]) {
              const score = Math.min(this.calcScore(hands[i]), 80)
              roundScores[i] = score
            }
          }

          roundWinner = currentPlayer
          roundEnded = true
          break
        } else {
          // Cannot declare, discard a card
          const discardCard = this.chooseDiscardCard(hand, wildJoker)
          hand.splice(hand.indexOf(discardCard), 1)
          discardPile.push(discardCard)
          this.log('DISCARD', {
            player: currentPlayer,
            card: `${discardCard.rank}${discardCard.suit}`,
            handSize: hand.length
          })
        }
      }

      // Check for drop (random chance or if hand is too bad)
      const dropChance = Math.random()
      const handScore = this.calcScore(hand)
      if (dropChance < 0.05 || handScore > 60) { // 5% chance or bad hand
        const dropPenalty = drewCard ? 40 : 20
        roundScores[currentPlayer] = dropPenalty
        this.log('DROP', {
          player: currentPlayer,
          penalty: dropPenalty,
          handScore,
          drewCard
        })
        roundEnded = true
        break
      }

      // Next player
      currentPlayer = (currentPlayer + 1) % this.numPlayers
    }

    if (turnCount >= maxTurns) {
      this.log('ERROR_MAX_TURNS', { turnCount })
      // Force end round with random penalties
      for (let i = 0; i < this.numPlayers; i++) {
        if (!this.eliminated[i]) {
          roundScores[i] = 40
        }
      }
    }

    // Apply round scores
    for (let i = 0; i < this.numPlayers; i++) {
      if (!this.eliminated[i]) {
        this.scores[i] += roundScores[i]
        if (this.scores[i] >= 101) {
          this.eliminated[i] = true
          this.log('ELIMINATED', { player: i, score: this.scores[i] })
        }
      }
    }

    // Check for winner (only one player left under 101)
    const activePlayers = this.scores
      .map((score, idx) => ({ score, idx, eliminated: this.eliminated[idx] }))
      .filter(p => !p.eliminated)

    if (activePlayers.length === 1) {
      this.winner = activePlayers[0].idx
      this.log('GAME_WINNER', {
        winner: this.winner,
        score: activePlayers[0].score,
        roundsPlayed: this.roundsPlayed
      })
      return true // Game complete
    }

    if (activePlayers.length === 0) {
      this.log('ERROR_NO_ACTIVE_PLAYERS')
      return true // Game complete (error state)
    }

    this.roundNumber++
    this.log('ROUND_END', {
      roundScores,
      newScores: [...this.scores],
      activePlayers: activePlayers.length
    })

    return false // Continue to next round
  }

  isCardUseful(hand, card, wildJoker) {
    // Simple heuristic: card is useful if it helps complete a group
    const testHand = [...hand, card]
    const groups = this.getHandGroups(testHand)
    const evals = groups.map(g => this.evalGroup(g))

    // Count valid groups before and after
    const validBefore = this.getHandGroups(hand)
      .map(g => this.evalGroup(g))
      .filter(e => e.valid).length

    const validAfter = evals.filter(e => e.valid).length

    return validAfter > validBefore
  }

  chooseDiscardCard(hand, wildJoker) {
    // Discard the highest point card from invalid groups
    const groups = this.getHandGroups(hand)
    const evals = groups.map(g => this.evalGroup(g))

    let discardCard = hand[hand.length - 1] // Default to last card
    let maxPoints = -1

    groups.forEach((group, groupIdx) => {
      if (!evals[groupIdx].valid) {
        group.forEach(card => {
          if (card.pts > maxPoints) {
            maxPoints = card.pts
            discardCard = card
          }
        })
      }
    })

    return discardCard
  }

  // Run complete game
  runGame() {
    this.log('GAME_START', { numPlayers: this.numPlayers })

    while (!this.winner && this.roundsPlayed < this.maxRounds) {
      const gameComplete = this.simulateRound()
      if (gameComplete) break
    }

    if (!this.winner) {
      this.log('ERROR_MAX_ROUNDS', { roundsPlayed: this.roundsPlayed })
      // Find player with lowest score as winner
      let minScore = Infinity
      let winnerIdx = -1
      for (let i = 0; i < this.numPlayers; i++) {
        if (this.scores[i] < minScore) {
          minScore = this.scores[i]
          winnerIdx = i
        }
      }
      this.winner = winnerIdx
    }

    this.log('GAME_END', {
      winner: this.winner,
      finalScores: [...this.scores],
      roundsPlayed: this.roundsPlayed
    })

    return {
      winner: this.winner,
      finalScores: [...this.scores],
      roundsPlayed: this.roundsPlayed,
      log: this.gameLog
    }
  }
}

// Run simulation tests
function runSimulationTests() {
  const results = {
    games: [],
    winRates: {},
    avgRounds: 0,
    brokenStates: [],
    totalGames: 500
  }

  console.log('Starting 101 Pool Rummy simulation tests...')

  for (let gameNum = 0; gameNum < results.totalGames; gameNum++) {
    const numPlayers = [2, 4, 6][Math.floor(Math.random() * 3)]
    const game = new GameSimulation(numPlayers)
    const result = game.runGame()

    results.games.push(result)

    // Track win rates
    if (!results.winRates[numPlayers]) {
      results.winRates[numPlayers] = {}
    }
    if (!results.winRates[numPlayers][result.winner]) {
      results.winRates[numPlayers][result.winner] = 0
    }
    results.winRates[numPlayers][result.winner]++

    // Check for broken states
    const hasErrors = result.log.some(entry =>
      entry.message.startsWith('ERROR_')
    )
    if (hasErrors) {
      results.brokenStates.push({
        gameNum,
        numPlayers,
        result,
        errors: result.log.filter(e => e.message.startsWith('ERROR_'))
      })
    }

    results.avgRounds += result.roundsPlayed

    if (gameNum % 50 === 0) {
      console.log(`Completed ${gameNum}/${results.totalGames} games...`)
    }
  }

  results.avgRounds /= results.totalGames

  // Analyze results
  console.log('\n=== SIMULATION RESULTS ===')
  console.log(`Total Games: ${results.totalGames}`)
  console.log(`Average Rounds per Game: ${results.avgRounds.toFixed(2)}`)
  console.log(`Broken States Found: ${results.brokenStates.length}`)

  console.log('\nWin Rates by Table Size:')
  Object.keys(results.winRates).forEach(tableSize => {
    console.log(`\n${tableSize} Players:`)
    const totalGames = Object.values(results.winRates[tableSize]).reduce((a,b) => a+b, 0)
    Object.keys(results.winRates[tableSize]).forEach(player => {
      const wins = results.winRates[tableSize][player]
      const rate = (wins / totalGames * 100).toFixed(1)
      console.log(`  Player ${player}: ${wins} wins (${rate}%)`)
    })
  })

  if (results.brokenStates.length > 0) {
    console.log('\nBroken States Found:')
    results.brokenStates.forEach(state => {
      console.log(`Game ${state.gameNum} (${state.numPlayers} players):`)
      state.errors.forEach(error => {
        console.log(`  ${error.message}:`, error)
      })
    })
  }

  // Validate game completion
  const completionRate = (results.games.filter(g => g.winner !== undefined).length / results.totalGames * 100).toFixed(1)
  console.log(`\nGame Completion Rate: ${completionRate}%`)

  const validGames = results.games.filter(g =>
    g.finalScores.every(score => score >= 0 && score <= 200) &&
    g.roundsPlayed > 0 &&
    g.roundsPlayed <= 50
  )
  console.log(`Valid Game States: ${validGames.length}/${results.totalGames}`)

  return results
}

// Export for Node.js or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameSimulation, runSimulationTests }
} else {
  // Run tests when executed directly
  runSimulationTests()
}