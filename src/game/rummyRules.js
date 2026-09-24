const HIGH_CARDS = new Set(['A', '10', 'J', 'Q', 'K'])

export function isPrintedJoker(card) {
  return !!card && (card.isJoker === true || card.rank === 'JKR' || card.suit === 'JOKER' || card.suit === '🃏')
}

export function getWildJokerRank(wildJoker = null) {
  if (!wildJoker) return null
  // Standard Indian-rummy handling: when the printed joker is selected as
  // the joker indicator, all Aces act as wild jokers for that round.
  return isPrintedJoker(wildJoker) ? 'A' : wildJoker.rank
}

export function isWildJoker(card, wildJoker = null) {
  if (!card || isPrintedJoker(card)) return false
  const wildRank = getWildJokerRank(wildJoker)
  // The current round indicator is authoritative. A stale isWildJoker flag from
  // an older deal must never turn a different rank into a joker. The flag is
  // only a display fallback when no indicator object was supplied.
  if (wildRank) return String(card.rank) === String(wildRank)
  return card.isWildJoker === true
}

export function selectWildJokerIndex(cards = [], random = Math.random) {
  if (!Array.isArray(cards) || cards.length === 0) return -1
  const eligible = []
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index]
    if (isPrintedJoker(card) || ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].includes(String(card?.rank))) {
      eligible.push(index)
    }
  }
  if (eligible.length === 0) return -1
  const roll = Number(random?.())
  const safeRoll = Number.isFinite(roll) ? Math.min(.999999999, Math.max(0, roll)) : 0
  return eligible[Math.floor(safeRoll * eligible.length)]
}

export function isJokerCard(card, wildJoker = null) {
  return isPrintedJoker(card) || isWildJoker(card, wildJoker)
}

export function canPickFromOpenPile(card, wildJoker = null, initialOpenJokerAvailable = false) {
  // A discarded printed/wild joker stays visible in the open pile, but the
  // next player must draw from the closed deck instead of picking that joker.
  // The initially dealt face-up joker is the sole exception, before any draw.
  return !!card && (initialOpenJokerAvailable === true || !isJokerCard(card, wildJoker))
}

export function getCardPoints(card, wildJoker = null) {
  if (!card || isJokerCard(card, wildJoker)) return 0
  if (HIGH_CARDS.has(String(card.rank))) return 10
  return Math.max(0, Number(card.pts ?? card.value ?? card.rank) || 0)
}

function rankNumber(rank, aceHigh = false) {
  if (rank === 'A') return aceHigh ? 14 : 1
  if (rank === 'J') return 11
  if (rank === 'Q') return 12
  if (rank === 'K') return 13
  return Number(rank) || 0
}

function canFormSequence(naturals, jokerCount) {
  if (!naturals.length) return false
  if (new Set(naturals.map(card => card.suit)).size !== 1) return false

  const groupSize = naturals.length + jokerCount
  if (groupSize < 3 || groupSize > 13) return false

  for (const aceHigh of [false, true]) {
    const ranks = naturals.map(card => rankNumber(card.rank, aceHigh)).sort((a, b) => a - b)
    if (ranks.some(rank => rank < 1 || rank > 14)) continue
    if (new Set(ranks).size !== ranks.length) continue

    const minRank = ranks[0]
    const maxRank = ranks[ranks.length - 1]
    const earliestStart = Math.max(1, maxRank - groupSize + 1)
    const latestStart = Math.min(minRank, 15 - groupSize)
    if (earliestStart <= latestStart) return true
  }

  return false
}

export function evaluateMeld(cards, wildJoker = null) {
  const group = Array.isArray(cards) ? cards.filter(Boolean) : []
  if (group.length < 3) return null

  const printed = group.filter(isPrintedJoker)
  const wild = group.filter(card => isWildJoker(card, wildJoker))
  const jokers = [...printed, ...wild]
  const naturals = group.filter(card => !isPrintedJoker(card) && !isWildJoker(card, wildJoker))

  // A wild joker is still a natural card when it appears in its own suit and
  // rank. Printed jokers can never be used in a pure sequence.
  if (printed.length === 0 && canFormSequence([...naturals, ...wild], 0)) {
    return { type: 'pure_sequence', sequence: true, pure: true }
  }

  if (naturals.length > 0 && canFormSequence(naturals, jokers.length)) {
    return { type: 'sequence', sequence: true, pure: false }
  }

  if (group.length <= 4 && naturals.length > 0) {
    const ranks = new Set(naturals.map(card => card.rank))
    const suits = new Set(naturals.map(card => card.suit))
    if (ranks.size === 1 && suits.size === naturals.length) {
      return { type: 'set', sequence: false, pure: false }
    }
  }

  return null
}

function enumerateMelds(hand, wildJoker = null) {
  const melds = []
  const limit = 1 << hand.length
  const points = hand.map(card => getCardPoints(card, wildJoker))

  for (let mask = 1; mask < limit; mask += 1) {
    const cards = []
    let count = 0
    let coveredPoints = 0
    for (let index = 0; index < hand.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue
      count += 1
      cards.push(hand[index])
      coveredPoints += points[index]
    }
    if (count < 3) continue
    const evaluation = evaluateMeld(cards, wildJoker)
    if (evaluation) melds.push({ mask, coveredPoints, ...evaluation })
  }

  return melds
}

function buildMeldIndex(hand, melds) {
  const byCard = Array.from({ length: hand.length }, () => [])
  for (const meld of melds) {
    for (let index = 0; index < hand.length; index += 1) {
      if (meld.mask & (1 << index)) byCard[index].push(meld)
    }
  }
  return byCard
}

const SORT_SUITS = ['S', 'H', 'D', 'C']
const SORT_SUIT_KEYS = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' }

function compareDisplayCards(a, b) {
  const suitA = SORT_SUITS.indexOf(SORT_SUIT_KEYS[a.suit] || a.suit)
  const suitB = SORT_SUITS.indexOf(SORT_SUIT_KEYS[b.suit] || b.suit)
  return suitA - suitB || rankNumber(a.rank) - rankNumber(b.rank)
    || String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
}

function orderMeldCards(cards, meld, wildJoker) {
  if (!meld.sequence) return [...cards].sort(compareDisplayCards)

  const naturals = meld.pure ? [...cards] : cards.filter(card => !isJokerCard(card, wildJoker))
  const jokers = meld.pure ? [] : cards.filter(card => isJokerCard(card, wildJoker)).sort(compareDisplayCards)
  // Lay joker substitutes in the missing rank's position, rather than placing
  // every joker at the end. Wild cards in a pure run retain their natural rank.
  for (const aceHigh of [false, true]) {
    const ranked = [...naturals].sort((a, b) => rankNumber(a.rank, aceHigh) - rankNumber(b.rank, aceHigh))
    const low = rankNumber(ranked[0]?.rank, aceHigh)
    const high = rankNumber(ranked[ranked.length - 1]?.rank, aceHigh)
    const earliest = Math.max(1, high - cards.length + 1)
    const latest = Math.min(low, 15 - cards.length)
    if (earliest > latest) continue
    const byRank = new Map(ranked.map(card => [rankNumber(card.rank, aceHigh), card]))
    if (byRank.size !== ranked.length) continue
    let jokerIndex = 0
    const ordered = Array.from({ length: cards.length }, (_, offset) =>
      byRank.get(latest + offset) || jokers[jokerIndex++])
    if (ordered.every(Boolean)) return ordered
  }
  return [...cards].sort(compareDisplayCards)
}

// Explicit SORT only: keep the opening deal's suit groups separate from this
// exact, disjoint meld search. It never changes card identities or deck order.
export function smartSort101Hand(hand, wildJoker = null) {
  const cards = (Array.isArray(hand) ? hand.filter(Boolean) : []).slice().sort(compareDisplayCards)
  if (cards.length > 14) throw new RangeError('Smart sort supports a maximum of 14 cards.')
  if (!cards.length) {
    return { groups: [[]], meldTypes: ['invalid'], declarationReady: false, discardCard: null, penalty: 0 }
  }

  const fullMask = (1 << cards.length) - 1
  const counts = new Uint8Array(fullMask + 1)
  for (let mask = 1; mask <= fullMask; mask += 1) counts[mask] = counts[mask >> 1] + (mask & 1)
  const melds = enumerateMelds(cards, wildJoker)
  const byCard = buildMeldIndex(cards, melds)
  const totalPoints = cards.reduce((sum, card) => sum + getCardPoints(card, wildJoker), 0)
  const empty = { protectedPoints: 0, coveredCount: 0, pureCards: 0, pureCount: 0, sequences: 0, melds: [] }

  function better(a, b) {
    if (!a) return b
    if (!b) return a
    for (const key of ['protectedPoints', 'coveredCount', 'pureCards', 'pureCount', 'sequences']) {
      if (a[key] !== b[key]) return a[key] > b[key] ? a : b
    }
    // Prefer fewer, readable groups when every rule/coverage objective ties.
    return a.melds.length <= b.melds.length ? a : b
  }

  function makeSearch(mode) {
    const memo = new Map()
    function search(mask, sequences = 0, hasPure = false) {
      if (mask === 0) return mode === 'pure' || (sequences >= 2 && hasPure) ? empty : null
      // Numeric state keys avoid string allocation in joker-heavy searches.
      // Pure-only protection has no life requirement, so its suffix solution
      // does not depend on the sequences already selected by the caller.
      const key = mode === 'pure' ? mask : mask * 6 + Math.min(2, sequences) * 2 + (hasPure ? 1 : 0)
      if (memo.has(key)) return memo.get(key)
      let first = 0
      while (!(mask & (1 << first))) first += 1
      let best = mode === 'complete' ? null : search(mask ^ (1 << first), sequences, hasPure)
      for (const meld of byCard[first]) {
        if ((meld.mask & mask) !== meld.mask) continue
        const tail = search(mask ^ meld.mask, Math.min(2, sequences + (meld.sequence ? 1 : 0)), hasPure || meld.pure)
        if (!tail) continue
        const candidate = {
          protectedPoints: tail.protectedPoints + (mode !== 'pure' || meld.pure ? meld.coveredPoints : 0),
          coveredCount: tail.coveredCount + counts[meld.mask],
          pureCards: tail.pureCards + (meld.pure ? counts[meld.mask] : 0),
          pureCount: tail.pureCount + (meld.pure ? 1 : 0),
          sequences: tail.sequences + (meld.sequence ? 1 : 0),
          meldCount: tail.melds.length + 1,
        }
        // Most overlapping joker combinations lose immediately. Allocate the
        // actual group list only for a better solution, not every candidate.
        let wins = !best
        if (best) {
          let decided = false
          for (const objective of ['protectedPoints', 'coveredCount', 'pureCards', 'pureCount', 'sequences']) {
            if (candidate[objective] === best[objective]) continue
            wins = candidate[objective] > best[objective]
            decided = true
            break
          }
          if (!decided) wins = candidate.meldCount < best.melds.length
        }
        if (wins) best = { ...candidate, melds: [meld, ...tail.melds] }
      }
      memo.set(key, best)
      return best
    }
    return search
  }

  // A legal declaration takes priority over a tempting longer run that leaves
  // only one sequence. At 14 cards, leave exactly one legal finish discard.
  const complete = makeSearch('complete')
  let solution = cards.length === 13 ? complete(fullMask) : null
  let discardCard = null
  if (cards.length === 14) {
    for (let index = 0; index < cards.length; index += 1) {
      const candidate = complete(fullMask ^ (1 << index))
      if (candidate && better(solution, candidate) === candidate) {
        solution = candidate
        discardCard = cards[index]
      }
    }
  }
  const declarationReady = !!solution
  if (!solution) {
    // Match 101 scoring: before both lives, only pure sequences are protected.
    // Sets and impure runs can still be displayed without incorrectly making
    // their points disappear. With both lives, every valid meld is protected.
    solution = better(makeSearch('pure')(fullMask), makeSearch('full')(fullMask)) || empty
  }

  const typeOrder = { pure_sequence: 0, sequence: 1, set: 2 }
  const selectedMelds = [...solution.melds].sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.mask - b.mask)
  let usedMask = 0
  const groups = selectedMelds.map(meld => {
    usedMask |= meld.mask
    return orderMeldCards(cards.filter((_, index) => meld.mask & (1 << index)), meld, wildJoker)
  })
  const meldTypes = selectedMelds.map(meld => meld.type)
  const leftovers = cards.filter((_, index) => !(usedMask & (1 << index)))
  const suitGroups = new Map()
  for (const card of leftovers.filter(card => !isJokerCard(card, wildJoker))) {
    const key = SORT_SUIT_KEYS[card.suit] || card.suit
    if (!suitGroups.has(key)) suitGroups.set(key, [])
    suitGroups.get(key).push(card)
  }
  for (const group of suitGroups.values()) {
    groups.push(group)
    meldTypes.push('invalid')
  }
  const unusedJokers = leftovers.filter(card => isJokerCard(card, wildJoker))
  if (unusedJokers.length) {
    groups.push(unusedJokers)
    meldTypes.push('joker')
  }
  return {
    groups,
    meldTypes,
    declarationReady,
    discardCard,
    penalty: Math.min(80, Math.max(0, totalPoints - solution.protectedPoints)),
  }
}

export function validate101Declaration(hand, wildJoker = null) {
  if (!Array.isArray(hand) || hand.length !== 13) {
    return { valid: false, reason: 'A declaration must contain exactly 13 cards.' }
  }

  const melds = enumerateMelds(hand, wildJoker)
  const byCard = buildMeldIndex(hand, melds)
  const fullMask = (1 << hand.length) - 1
  const memo = new Map()

  function search(remainingMask, sequenceCount, hasPureSequence) {
    if (remainingMask === 0) return sequenceCount >= 2 && hasPureSequence
    const key = `${remainingMask}:${Math.min(sequenceCount, 2)}:${hasPureSequence ? 1 : 0}`
    if (memo.has(key)) return memo.get(key)

    let first = 0
    while ((remainingMask & (1 << first)) === 0) first += 1
    for (const meld of byCard[first]) {
      if ((meld.mask & remainingMask) !== meld.mask) continue
      if (search(
        remainingMask ^ meld.mask,
        Math.min(2, sequenceCount + (meld.sequence ? 1 : 0)),
        hasPureSequence || meld.pure,
      )) {
        memo.set(key, true)
        return true
      }
    }

    memo.set(key, false)
    return false
  }

  const valid = search(fullMask, 0, false)
  return {
    valid,
    reason: valid ? '' : 'Need two sequences, including one pure sequence, with every card in a valid meld.',
  }
}

export function findDeclarationDiscard(hand, wildJoker = null) {
  if (!Array.isArray(hand) || hand.length !== 14) return null
  for (const card of hand) {
    const remaining = hand.filter(candidate => candidate.id !== card.id)
    if (remaining.length === 13 && validate101Declaration(remaining, wildJoker).valid) return card
  }
  return null
}

export function calculate101Penalty(hand, wildJoker = null) {
  const cards = Array.isArray(hand) ? hand.filter(Boolean) : []
  if (!cards.length) return 0

  const points = cards.map(card => getCardPoints(card, wildJoker))
  const totalPoints = points.reduce((sum, point) => sum + point, 0)
  const melds = enumerateMelds(cards, wildJoker)
  const byCard = buildMeldIndex(cards, melds)
  const fullMask = (1 << cards.length) - 1

  // Before the second sequence exists, only a pure sequence is protected.
  // Once two sequences (one pure) exist, every disjoint valid meld protects
  // its cards. This mirrors the standard 13-card/101-pool life rules.
  const pureMemo = new Map()
  function bestPureCoverage(mask) {
    if (mask === 0) return 0
    if (pureMemo.has(mask)) return pureMemo.get(mask)
    let first = 0
    while ((mask & (1 << first)) === 0) first += 1
    let best = bestPureCoverage(mask ^ (1 << first))
    for (const meld of byCard[first]) {
      if (!meld.pure || (meld.mask & mask) !== meld.mask) continue
      best = Math.max(best, meld.coveredPoints + bestPureCoverage(mask ^ meld.mask))
    }
    pureMemo.set(mask, best)
    return best
  }

  const fullMemo = new Map()
  function bestFullCoverage(mask, sequenceCount, hasPureSequence) {
    if (mask === 0) return sequenceCount >= 2 && hasPureSequence ? 0 : Number.NEGATIVE_INFINITY
    const key = `${mask}:${Math.min(sequenceCount, 2)}:${hasPureSequence ? 1 : 0}`
    if (fullMemo.has(key)) return fullMemo.get(key)

    let first = 0
    while ((mask & (1 << first)) === 0) first += 1
    let best = bestFullCoverage(mask ^ (1 << first), sequenceCount, hasPureSequence)
    for (const meld of byCard[first]) {
      if ((meld.mask & mask) !== meld.mask) continue
      const tail = bestFullCoverage(
        mask ^ meld.mask,
        Math.min(2, sequenceCount + (meld.sequence ? 1 : 0)),
        hasPureSequence || meld.pure,
      )
      if (Number.isFinite(tail)) best = Math.max(best, meld.coveredPoints + tail)
    }
    fullMemo.set(key, best)
    return best
  }

  const pureCoverage = bestPureCoverage(fullMask)
  const fullCoverage = bestFullCoverage(fullMask, 0, false)
  const protectedPoints = Math.max(pureCoverage, Number.isFinite(fullCoverage) ? fullCoverage : 0)
  return Math.min(80, Math.max(0, totalPoints - protectedPoints))
}

export const POOL_101 = Object.freeze({
  eliminationScore: 101,
  firstDrop: 20,
  middleDrop: 40,
  invalidDeclaration: 80,
  maxRoundPenalty: 80,
})
