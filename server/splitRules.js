// Platform token rules, not a universal 101 Pool scoring rule.
export const DEFAULT_SPLIT_RULES = Object.freeze({ enabled:true, method:'drop_weighted', timeoutSeconds:30,
  maxRequests:2, tableTypes:[6], minPlayers:3, feeBps:0, dropPenalty:20,
  enableThreePlayer:true, enableTwoPlayer:true, autoPopup:false, manualButton:true, precision:0 })

export function normalizeSplitRules(value = {}) {
  const integer = (key, low, high) => Math.max(low, Math.min(high, Math.floor(Number(value[key] ?? DEFAULT_SPLIT_RULES[key]) || 0)))
  return { enabled:value.enabled !== false, method:value.method === 'equal' ? 'equal' : 'drop_weighted',
    timeoutSeconds:integer('timeoutSeconds',10,120), maxRequests:integer('maxRequests',1,10),
    tableTypes:Array.isArray(value.tableTypes) ? [...new Set(value.tableTypes.filter(n => n === 2 || n === 6))] : [6],
    minPlayers:integer('minPlayers',2,3), feeBps:integer('feeBps',0,10000), dropPenalty:integer('dropPenalty',1,80),
    enableThreePlayer:value.enableThreePlayer !== false, enableTwoPlayer:value.enableTwoPlayer !== false,
    autoPopup:value.autoPopup === true, manualButton:value.manualButton !== false,
    // Existing wallets support whole tokens only. Do not introduce fractional balances.
    precision:0 }
}

export function distributableTokens(gross, feeBps = 0) {
  if (!Number.isSafeInteger(gross) || gross < 0 || !Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000) throw new Error('Invalid token pool.')
  return Number(BigInt(gross) * BigInt(10000-feeBps) / 10000n)
}

export function remainingDrops(score, penalty = 20) {
  return Math.max(0, Math.floor((100 - Number(score || 0)) / penalty))
}

// Largest-remainder apportionment. Stable player ID breaks equal remainders.
// Integer arithmetic preserves every token, even for large funded pools.
export function allocateSplitTokens(pool, players, rules = DEFAULT_SPLIT_RULES) {
  if (!Number.isSafeInteger(pool) || pool < 0 || !players.length || new Set(players.map(p=>p.playerId)).size !== players.length) throw new Error('Invalid split participants or pool.')
  const rows = players.map(p => ({ ...p, dropsLeft:remainingDrops(p.score,rules.dropPenalty),
    weight:rules.method === 'equal' ? 1 : remainingDrops(p.score,rules.dropPenalty)+1 }))
  const total = BigInt(rows.reduce((sum,p)=>sum+p.weight,0))
  const amounts = rows.map(p => { const numerator = BigInt(pool)*BigInt(p.weight); return { ...p, tokens:Number(numerator/total), remainder:numerator%total } })
  let left = pool - amounts.reduce((sum,p)=>sum+p.tokens,0)
  for (const p of [...amounts].sort((a,b)=>a.remainder===b.remainder ? String(a.playerId).localeCompare(String(b.playerId)) : a.remainder>b.remainder ? -1 : 1)) {
    if (!left--) break
    p.tokens++
  }
  return amounts.map(({remainder,...p})=>p)
}

export function splitEligible(game, players, pendingRejoin = false) {
  const rules = normalizeSplitRules(game.splitRules)
  const count = players.length
  const stageAllowed = game.originTableSize === 6
    ? (count === 3 && rules.enableThreePlayer || count === 2 && rules.enableTwoPlayer)
    : game.originTableSize === 2 && count === 2 && rules.enableTwoPlayer && rules.minPlayers === 2
  const requests = game.splitRequestCountsByCount?.[count] ?? (game.splitRequestCountsByCount ? 0 : game.splitRequestCount || 0)
  return rules.enabled && (rules.manualButton || rules.autoPopup)
    && rules.tableTypes.includes(game.originTableSize) && stageAllowed
    && game.state === 'round_over' && !game.splitFinalized && !game.settlementPending && !game.poolSettled
    && !pendingRejoin && !game.rejoinPaymentsPending
    && players.every(p=>p.connected !== false) && requests < rules.maxRequests
}
