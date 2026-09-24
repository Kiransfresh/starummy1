import { evaluateMeld, getCardPoints, isJokerCard, isPrintedJoker } from './rummyRules.js'

// Physical-card validation is separate from meld validity: two A-spades are
// real cards, but they cannot both fill the same suit in a set.
export function validTwoDeckCards(cards) {
  if (!Array.isArray(cards) || cards.length > 108) return false
  const copies = new Map(), ids = new Set()
  let printed = 0
  const suits = { S:'S', H:'H', D:'D', C:'C', '♠':'S', '♥':'H', '♦':'D', '♣':'C' }
  for (const card of cards) {
    if (!card || card.id == null || ids.has(String(card.id))) return false
    ids.add(String(card.id))
    if (isPrintedJoker(card)) { if (++printed > 4) return false; continue }
    if (!suits[card.suit] || !['A','2','3','4','5','6','7','8','9','10','J','Q','K'].includes(String(card.rank))) return false
    const key = `${card.rank}:${suits[card.suit]}`
    copies.set(key, (copies.get(key) || 0) + 1)
    if (copies.get(key) > 2) return false
  }
  return true
}

// Custom first-card rule only. Unlike ordinary 101 scoring, any disjoint
// valid meld is protected; no two-life requirement applies to opponents.
export function calculateFirstCardScore(hand, wildJoker = null) {
  if (hand.length !== 13 || !validTwoDeckCards(hand)) throw new Error('Invalid initial 13-card hand')
  const n = hand.length, full = (1 << n) - 1
  const byFirst = Array.from({ length:n }, () => [])
  for (let mask = 1; mask <= full; mask++) {
    const group = hand.filter((_, i) => mask & (1 << i))
    if (group.length < 3 || !evaluateMeld(group, wildJoker)) continue
    const first = Math.log2(mask & -mask)
    byFirst[first].push(mask)
  }
  const memo = new Map([[0, true]])
  function partitionable(mask) {
    if (memo.has(mask)) return memo.get(mask)
    const first = Math.log2(mask & -mask)
    const ok = byFirst[first].some(meld => (meld & mask) === meld && partitionable(mask ^ meld))
    memo.set(mask, ok)
    return ok
  }
  const allJokers = hand.filter(card => isJokerCard(card, wildJoker)).length
  let best = { score:Math.max(0, 40 - 4 * allJokers), unmatchedJokers:allJokers, matchedIds:[], base:40 }
  let found = false
  for (let mask = 1; mask <= full; mask++) {
    if (!partitionable(mask)) continue
    const remaining = hand.filter((_, i) => !(mask & (1 << i)))
    const unmatchedJokers = remaining.filter(card => isJokerCard(card, wildJoker)).length
    const base = Math.min(40, remaining.reduce((sum, card) => sum + getCardPoints(card, wildJoker), 0))
    const score = Math.max(0, base - 4 * unmatchedJokers)
    if (!found || score < best.score) best = { score, base, unmatchedJokers, matchedIds:hand.filter((_, i) => mask & (1 << i)).map(c => c.id) }
    found = true
  }
  return best
}
