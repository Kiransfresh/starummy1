/* eslint-env node */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';


// Railway-safe 101-pool rules. These are intentionally embedded in the
// socket server so the production backend does not depend on frontend src/
// files being present in the Docker/GitHub build context.
const RULE_HIGH_CARDS = new Set(['A', '10', 'J', 'Q', 'K']);

function ruleIsPrintedJoker(card) {
  return !!card && (
    card.isJoker === true
    || card.rank === 'JKR'
    || card.suit === 'JOKER'
    || card.suit === '🃏'
  );
}

function ruleWildJokerRank(wildJoker = null) {
  if (!wildJoker) return null;
  return ruleIsPrintedJoker(wildJoker) ? 'A' : wildJoker.rank;
}

function ruleIsWildJoker(card, wildJoker = null) {
  if (!card || ruleIsPrintedJoker(card)) return false;
  const wildRank = ruleWildJokerRank(wildJoker);
  // The current round indicator is authoritative. Never let an old display
  // flag make the wrong rank a joker after a new 101 Pool deal starts.
  if (wildRank) return String(card.rank) === String(wildRank);
  return card.isWildJoker === true;
}

function ruleIsJokerCard(card, wildJoker = null) {
  return ruleIsPrintedJoker(card) || ruleIsWildJoker(card, wildJoker);
}

function ruleCardPoints(card, wildJoker = null) {
  if (!card || ruleIsJokerCard(card, wildJoker)) return 0;
  if (RULE_HIGH_CARDS.has(String(card.rank))) return 10;
  return Math.max(0, Number(card.pts ?? card.value ?? card.rank) || 0);
}

function ruleRankNumber(rank, aceHigh = false) {
  if (rank === 'A') return aceHigh ? 14 : 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return Number(rank) || 0;
}

function ruleCanFormSequence(naturals, jokerCount) {
  if (!naturals.length) return false;
  if (new Set(naturals.map((card) => card.suit)).size !== 1) return false;

  const groupSize = naturals.length + jokerCount;
  if (groupSize < 3 || groupSize > 13) return false;

  for (const aceHigh of [false, true]) {
    const ranks = naturals
      .map((card) => ruleRankNumber(card.rank, aceHigh))
      .sort((a, b) => a - b);
    if (ranks.some((rank) => rank < 1 || rank > 14)) continue;
    if (new Set(ranks).size !== ranks.length) continue;

    const minRank = ranks[0];
    const maxRank = ranks[ranks.length - 1];
    const earliestStart = Math.max(1, maxRank - groupSize + 1);
    const latestStart = Math.min(minRank, 15 - groupSize);
    if (earliestStart <= latestStart) return true;
  }

  return false;
}

function ruleEvaluateMeld(cards, wildJoker = null) {
  const group = Array.isArray(cards) ? cards.filter(Boolean) : [];
  if (group.length < 3) return null;

  const printed = group.filter(ruleIsPrintedJoker);
  const wild = group.filter((card) => ruleIsWildJoker(card, wildJoker));
  const jokers = [...printed, ...wild];
  const naturals = group.filter(
    (card) => !ruleIsPrintedJoker(card) && !ruleIsWildJoker(card, wildJoker),
  );

  if (printed.length === 0 && ruleCanFormSequence([...naturals, ...wild], 0)) {
    return { type: 'pure_sequence', sequence: true, pure: true };
  }

  if (naturals.length > 0 && ruleCanFormSequence(naturals, jokers.length)) {
    return { type: 'sequence', sequence: true, pure: false };
  }

  if (group.length <= 4 && naturals.length > 0) {
    const ranks = new Set(naturals.map((card) => card.rank));
    const suits = new Set(naturals.map((card) => card.suit));
    if (ranks.size === 1 && suits.size === naturals.length) {
      return { type: 'set', sequence: false, pure: false };
    }
  }

  return null;
}

function ruleEnumerateMelds(hand, wildJoker = null) {
  const melds = [];
  const limit = 1 << hand.length;
  const points = hand.map((card) => ruleCardPoints(card, wildJoker));

  for (let mask = 1; mask < limit; mask += 1) {
    const cards = [];
    let count = 0;
    let coveredPoints = 0;
    for (let index = 0; index < hand.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      count += 1;
      cards.push(hand[index]);
      coveredPoints += points[index];
    }
    if (count < 3) continue;
    const evaluation = ruleEvaluateMeld(cards, wildJoker);
    if (evaluation) melds.push({ mask, coveredPoints, ...evaluation });
  }

  return melds;
}

function ruleBuildMeldIndex(hand, melds) {
  const byCard = Array.from({ length: hand.length }, () => []);
  for (const meld of melds) {
    for (let index = 0; index < hand.length; index += 1) {
      if (meld.mask & (1 << index)) byCard[index].push(meld);
    }
  }
  return byCard;
}

function validate101Declaration(hand, wildJoker = null) {
  if (!Array.isArray(hand) || hand.length !== 13) {
    return { valid: false, reason: 'A declaration must contain exactly 13 cards.' };
  }

  const melds = ruleEnumerateMelds(hand, wildJoker);
  const byCard = ruleBuildMeldIndex(hand, melds);
  const fullMask = (1 << hand.length) - 1;
  const memo = new Map();

  function search(remainingMask, sequenceCount, hasPureSequence) {
    if (remainingMask === 0) return sequenceCount >= 2 && hasPureSequence;
    const key = `${remainingMask}:${Math.min(sequenceCount, 2)}:${hasPureSequence ? 1 : 0}`;
    if (memo.has(key)) return memo.get(key);

    let first = 0;
    while ((remainingMask & (1 << first)) === 0) first += 1;
    for (const meld of byCard[first]) {
      if ((meld.mask & remainingMask) !== meld.mask) continue;
      if (search(
        remainingMask ^ meld.mask,
        Math.min(2, sequenceCount + (meld.sequence ? 1 : 0)),
        hasPureSequence || meld.pure,
      )) {
        memo.set(key, true);
        return true;
      }
    }

    memo.set(key, false);
    return false;
  }

  const valid = search(fullMask, 0, false);
  return {
    valid,
    reason: valid
      ? ''
      : 'Need two sequences, including one pure sequence, with every card in a valid meld.',
  };
}

function calculate101Penalty(hand, wildJoker = null) {
  const cards = Array.isArray(hand) ? hand.filter(Boolean) : [];
  if (!cards.length) return 0;

  const points = cards.map((card) => ruleCardPoints(card, wildJoker));
  const totalPoints = points.reduce((sum, point) => sum + point, 0);
  const melds = ruleEnumerateMelds(cards, wildJoker);
  const byCard = ruleBuildMeldIndex(cards, melds);
  const fullMask = (1 << cards.length) - 1;

  const pureMemo = new Map();
  function bestPureCoverage(mask) {
    if (mask === 0) return 0;
    if (pureMemo.has(mask)) return pureMemo.get(mask);
    let first = 0;
    while ((mask & (1 << first)) === 0) first += 1;
    let best = bestPureCoverage(mask ^ (1 << first));
    for (const meld of byCard[first]) {
      if (!meld.pure || (meld.mask & mask) !== meld.mask) continue;
      best = Math.max(best, meld.coveredPoints + bestPureCoverage(mask ^ meld.mask));
    }
    pureMemo.set(mask, best);
    return best;
  }

  const fullMemo = new Map();
  function bestFullCoverage(mask, sequenceCount, hasPureSequence) {
    if (mask === 0) {
      return sequenceCount >= 2 && hasPureSequence ? 0 : Number.NEGATIVE_INFINITY;
    }
    const key = `${mask}:${Math.min(sequenceCount, 2)}:${hasPureSequence ? 1 : 0}`;
    if (fullMemo.has(key)) return fullMemo.get(key);

    let first = 0;
    while ((mask & (1 << first)) === 0) first += 1;
    let best = bestFullCoverage(mask ^ (1 << first), sequenceCount, hasPureSequence);
    for (const meld of byCard[first]) {
      if ((meld.mask & mask) !== meld.mask) continue;
      const tail = bestFullCoverage(
        mask ^ meld.mask,
        Math.min(2, sequenceCount + (meld.sequence ? 1 : 0)),
        hasPureSequence || meld.pure,
      );
      if (Number.isFinite(tail)) best = Math.max(best, meld.coveredPoints + tail);
    }
    fullMemo.set(key, best);
    return best;
  }

  const pureCoverage = bestPureCoverage(fullMask);
  const fullCoverage = bestFullCoverage(fullMask, 0, false);
  const protectedPoints = Math.max(
    pureCoverage,
    Number.isFinite(fullCoverage) ? fullCoverage : 0,
  );
  return Math.min(80, Math.max(0, totalPoints - protectedPoints));
}
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 20000,
  pingInterval: 25000,
});

const MAX_PLAYERS = 6;
const RECONNECT_GRACE_MS = 45_000;
const START_COUNTDOWN_SECONDS = 3;
const SCORE_WINDOW_SECONDS = 30;
const ROUND_RESULT_SECONDS = 6;
const SPLIT_COUNTS = new Set([2, 3]);

function normaliseTableSize(value) {
  return Number(value) === 2 ? 2 : MAX_PLAYERS;
}

// { code: { host, hostPlayerId, players: [{ id, playerId, name, connected }] } }
const rooms = {};
// { code: { players, deck, handsByPlayerId, discardPile, wildJoker, turnIndex, state } }
const games = {};
const disconnectTimers = new Map();

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function normaliseCode(code) {
  return String(code || '').trim().toUpperCase();
}

function buildDeck(offset = 0) {
  const deck = [];
  let id = offset;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}${suit}_${id++}`, rank, suit });
    }
  }
  deck.push({
    id: `JKR_${offset}`,
    rank: 'JKR',
    suit: 'JOKER',
    isJoker: true,
  });
  return deck;
}

function buildTwoDecks() {
  return [...buildDeck(0), ...buildDeck(100)];
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function selectWildJokerIndex(cards = [], random = Math.random) {
  if (!Array.isArray(cards) || cards.length === 0) return -1;
  const eligible = [];
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    if (ruleIsPrintedJoker(card) || RANKS.includes(String(card?.rank))) eligible.push(index);
  }
  if (eligible.length === 0) return -1;
  const roll = Number(random?.());
  const safeRoll = Number.isFinite(roll) ? Math.min(.999999999, Math.max(0, roll)) : 0;
  return eligible[Math.floor(safeRoll * eligible.length)];
}

function isWild(card, wildJoker) {
  if (!card || ruleIsPrintedJoker(card)) return false;
  const wildRank = ruleWildJokerRank(wildJoker);
  return !!wildRank && card.rank === wildRank;
}

function cardPoints(card, wildJoker) {
  if (!card || isWild(card, wildJoker)) return 0;
  if (['A', '10', 'J', 'Q', 'K'].includes(card.rank)) return 10;
  return Math.max(0, Number(card.rank) || 0);
}

function rankValue(rank) {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return Number(rank) || 0;
}

function isSequence(cards, jokerCount) {
  if (cards.length === 0) return false;
  if (new Set(cards.map((card) => card.suit)).size !== 1) return false;

  const ranks = cards.map((card) => rankValue(card.rank)).sort((a, b) => a - b);
  if (ranks.some((rank) => rank < 1 || rank > 13)) return false;
  if (new Set(ranks).size !== ranks.length) return false;

  const groupSize = cards.length + jokerCount;
  const minRank = ranks[0];
  const maxRank = ranks[ranks.length - 1];
  const earliestStart = Math.max(1, maxRank - groupSize + 1);
  const latestStart = Math.min(minRank, 14 - groupSize);
  return earliestStart <= latestStart;
}

function evaluateMeld(cards, wildJoker) {
  if (!Array.isArray(cards) || cards.length < 3) return null;
  const jokers = cards.filter((card) => isWild(card, wildJoker));
  const naturals = cards.filter((card) => !isWild(card, wildJoker));

  if (jokers.length === 0 && isSequence(naturals, 0)) {
    return { type: 'pure_sequence', sequence: true, pure: true };
  }

  if (naturals.length > 0 && isSequence(naturals, jokers.length)) {
    return { type: 'sequence', sequence: true, pure: false };
  }

  if (cards.length <= 4 && naturals.length > 0) {
    const ranks = new Set(naturals.map((card) => card.rank));
    const suits = new Set(naturals.map((card) => card.suit));
    if (ranks.size === 1 && suits.size === naturals.length) {
      return { type: 'set', sequence: false, pure: false };
    }
  }

  return null;
}

function enumerateMelds(hand, wildJoker) {
  const melds = [];
  const limit = 1 << hand.length;
  for (let mask = 1; mask < limit; mask += 1) {
    let count = 0;
    const cards = [];
    for (let index = 0; index < hand.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      count += 1;
      cards.push(hand[index]);
    }
    if (count < 3) continue;
    const evaluation = evaluateMeld(cards, wildJoker);
    if (evaluation) melds.push({ mask, cards, ...evaluation });
  }
  return melds;
}

function validateDeclaration(hand, wildJoker) {
  return validate101Declaration(hand, wildJoker);
}

function calculateDeadwood(hand, wildJoker) {
  return calculate101Penalty(hand, wildJoker);
}

function isEliminated(game, playerId) {
  return (game.scoresByPlayerId[playerId] || 0) >= 101;
}

function isRoundActive(game, player) {
  return !!player
    && !isEliminated(game, player.playerId)
    && !game.droppedPlayerIds.has(player.playerId);
}

// Seat order is clockwise around the table. Moving +1 therefore moves to the
// player on the current player's RIGHT, which is the required 101 Pool turn direction.
function nextPlayableIndex(game, fromIndex) {
  if (!game.players.length) return -1;
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (fromIndex + offset + game.players.length) % game.players.length;
    const player = game.players[index];
    if (isRoundActive(game, player) && player.connected !== false) return index;
  }
  return -1;
}

function activeRoundPlayers(game) {
  return game.players.filter((player) => isRoundActive(game, player));
}

function activeGamePlayers(game) {
  return game.players.filter((player) => !isEliminated(game, player.playerId));
}

function safePoolAmount(game) {
  return Math.max(0, Number(game.poolAmount) || 0);
}

function buildSplitOffer(game) {
  const remaining = activeGamePlayers(game);
  if (!SPLIT_COUNTS.has(remaining.length) || game.splitFinalized) return null;
  const poolAmount = safePoolAmount(game);
  if (poolAmount <= 0) return null;

  // Work in paise so the total can never exceed or fall short of the pool.
  const poolPaise = Math.round(poolAmount * 100);
  if (poolPaise % remaining.length !== 0) return null;
  const sharePaise = poolPaise / remaining.length;
  const confirmed = game.splitConfirmedPlayerIds || new Set();
  return {
    eligible: true,
    playerCount: remaining.length,
    poolAmount: poolPaise / 100,
    shareAmount: sharePaise / 100,
    playerIds: remaining.map((player) => player.playerId),
    confirmedPlayerIds: remaining.filter((player) => confirmed.has(player.playerId)).map((player) => player.playerId),
    requiresAllPlayers: true,
  };
}

function roundHistoryEntry(game, details = {}) {
  const winnerPlayerId = details.roundWinnerPlayerId || game.roundWinnerPlayerId || null;
  return {
    roundNumber: game.roundNumber || 1,
    winnerPlayerId,
    reason: details.reason || 'round_over',
    message: details.message || 'Round completed.',
    finalizedAt: Date.now(),
    players: game.players.map((player) => {
      const roundScore = game.roundPointsByPlayerId[player.playerId] || 0;
      const totalScore = game.scoresByPlayerId[player.playerId] || 0;
      return {
        playerId: player.playerId,
        seatIndex: player.seatIndex ?? game.players.indexOf(player),
        name: player.name,
        roundScore,
        previousScore: Math.max(0, totalScore - roundScore),
        totalScore,
        status: player.playerId === winnerPlayerId
          ? 'ROUND WINNER'
          : isEliminated(game, player.playerId)
            ? 'ELIMINATED'
            : game.droppedPlayerIds.has(player.playerId)
              ? 'DROPPED'
              : 'ACTIVE',
      };
    }),
    split: game.splitFinalized ? game.splitResult || null : null,
  };
}

function addPoints(game, playerId, points) {
  const safePoints = Math.max(0, Math.min(80, Number(points) || 0));
  game.scoresByPlayerId[playerId] = (game.scoresByPlayerId[playerId] || 0) + safePoints;
  game.roundPointsByPlayerId[playerId] = (game.roundPointsByPlayerId[playerId] || 0) + safePoints;
}

function dealRound(game, incrementRound = true) {
  if (game.nextRoundTimer) {
    clearTimeout(game.nextRoundTimer);
    game.nextRoundTimer = null;
  }
  if (game.scoreWindowTimer) {
    clearTimeout(game.scoreWindowTimer);
    game.scoreWindowTimer = null;
  }
  const deck = shuffle(buildTwoDecks());
  const handsByPlayerId = Object.fromEntries(game.players.map((player) => [player.playerId, []]));
  const activePlayers = game.players.filter((player) => !isEliminated(game, player.playerId));
  let cursor = 0;

  // Real-table style distribution: one card per active seat per pass instead
  // of giving 13-card blocks. Client hands are animated LEFT -> RIGHT.
  for (let cardNo = 0; cardNo < 13; cardNo++) {
    for (const player of activePlayers) {
      handsByPlayerId[player.playerId].push(deck[cursor++]);
    }
  }

  const remaining = deck.slice(cursor);
  // 101 Pool joker indicator can be any natural rank (including 2-10) or
  // the printed joker. This uses the same selection practice as the client.
  const wildIndex = selectWildJokerIndex(remaining);
  const [wildJoker = null] = wildIndex >= 0 ? remaining.splice(wildIndex, 1) : [];
  const firstDiscard = remaining.shift() || null;

  game.deck = remaining;
  game.handsByPlayerId = handsByPlayerId;
  game.discardPile = firstDiscard ? [firstDiscard] : [];
  game.lastDiscardByPlayerId = {};
  game.wildJoker = wildJoker;
  game.droppedPlayerIds = new Set();
  game.drawnPlayerIds = new Set();
  if (!game.lastRoundPointsByPlayerId) {
    game.lastRoundPointsByPlayerId = Object.fromEntries(game.players.map((player) => [player.playerId, 0]));
  }
  game.roundPointsByPlayerId = Object.fromEntries(game.players.map((player) => [player.playerId, 0]));
  game.roundNumber = incrementRound ? (game.roundNumber || 0) + 1 : (game.roundNumber || 1);
  game.state = 'playing';
  game.winnerPlayerId = null;
  game.roundWinnerPlayerId = null;
  game.scoreWindowEndsAt = null;
  game.pendingScoreSubmissions = {};
  game.submittedScorePlayerIds = new Set();
  game.splitConfirmedPlayerIds = new Set();
  game.lastRoundDetails = null;

  const startingFrom = Number.isInteger(game.dealerIndex) ? game.dealerIndex : -1;
  game.dealerIndex = nextPlayableIndex(game, startingFrom);
  game.turnIndex = game.dealerIndex >= 0 ? game.dealerIndex : 0;
}

function publicPlayers(players) {
  return players.map((p) => ({
    id: p.id,
    playerId: p.playerId,
    name: p.name,
    connected: p.connected !== false,
    seatIndex: p.seatIndex ?? null,
  }));
}

function recordGameAction(game, action) {
  game.actionSequence = (game.actionSequence || 0) + 1;
  game.lastAction = {
    id: `${game.roundNumber || 1}-${game.actionSequence}`,
    ...action,
  };
}

function emitRoomUpdate(code) {
  const room = rooms[code];
  if (!room) return;
  io.to(code).emit('room_update', {
    code,
    hostPlayerId: room.hostPlayerId || null,
    tableSize: normaliseTableSize(room.tableSize),
    players: publicPlayers(room.players),
  });
}

function timerKey(code, playerId) {
  return `${code}:${playerId}`;
}

function clearDisconnectTimer(code, playerId) {
  const key = timerKey(code, playerId);
  const timer = disconnectTimers.get(key);
  if (timer) clearTimeout(timer);
  disconnectTimers.delete(key);
}

function bindPlayerSocket(code, player, socket) {
  if (!player) return;
  clearDisconnectTimer(code, player.playerId);
  player.id = socket.id;
  player.connected = true;
  socket.join(code);

  const game = games[code];
  if (game) {
    const gamePlayer = game.players.find((p) => p.playerId === player.playerId);
    if (gamePlayer) {
      gamePlayer.id = socket.id;
      gamePlayer.connected = true;
    }
  }
}

function findGamePlayer(game, playerId, socketId) {
  return game?.players.find((p) =>
    (playerId && p.playerId === playerId) || p.id === socketId
  );
}

function buildSnapshot(game, forPlayerId) {
  const playerMeta = game.players.map((p) => ({
    id: p.id,
    playerId: p.playerId,
    name: p.name,
    connected: p.connected !== false,
    seatIndex: p.seatIndex ?? game.players.indexOf(p),
    handSize: (game.handsByPlayerId[p.playerId] || []).length,
    score: game.scoresByPlayerId[p.playerId] || 0,
    roundPoints: game.roundPointsByPlayerId[p.playerId] || 0,
    lastRoundPoints: game.lastRoundPointsByPlayerId?.[p.playerId] || 0,
    lastDiscard: game.lastDiscardByPlayerId?.[p.playerId] || null,
    dropped: game.droppedPlayerIds.has(p.playerId),
    isEliminated: isEliminated(game, p.playerId),
    scoreSubmitted: game.submittedScorePlayerIds?.has(p.playerId) || false,
  }));

  const current = game.state === 'playing' ? (game.players[game.turnIndex] || null) : null;

  return {
    players: playerMeta,
    hand: game.handsByPlayerId[forPlayerId] || [],
    discardPile: game.discardPile,
    deckSize: game.deck.length,
    wildJoker: game.wildJoker || null,
    turnIndex: game.turnIndex,
    currentTurn: current?.id ?? null,
    currentTurnPlayerId: current?.playerId ?? null,
    state: game.state,
    roundNumber: game.roundNumber || 1,
    dealerIndex: game.dealerIndex ?? 0,
    winnerPlayerId: game.winnerPlayerId || null,
    roundWinnerPlayerId: game.roundWinnerPlayerId || null,
    scoreWindowEndsAt: game.scoreWindowEndsAt || null,
    scoreWindowSeconds: SCORE_WINDOW_SECONDS,
    submittedScorePlayerIds: [...(game.submittedScorePlayerIds || new Set())],
    roundHistory: [...(game.roundHistory || [])],
    poolAmount: safePoolAmount(game),
    splitOffer: buildSplitOffer(game),
    splitFinalized: !!game.splitFinalized,
    splitResult: game.splitResult || null,
    lastAction: game.lastAction || null,
  };
}

function sendGameStateToPlayer(code, player) {
  const game = games[code];
  if (!game || !player?.connected || !player.id) return;
  io.to(player.id).emit('game_state', { code, ...buildSnapshot(game, player.playerId) });
}

function sendLatestRoundResult(code, player) {
  const game = games[code];
  if (!game?.lastRoundDetails || !player?.connected || !player.id) return;
  io.to(player.id).emit(
    'round_result',
    buildRoundResult(code, game, player.playerId, game.lastRoundDetails),
  );
}

function broadcastGameState(code) {
  const game = games[code];
  if (!game) return;
  for (const player of game.players) sendGameStateToPlayer(code, player);
}

function buildRoundResult(code, game, forPlayerId, details = {}) {
  return {
    code,
    roundNumber: game.roundNumber || 1,
    state: game.state,
    reason: details.reason || 'round_over',
    message: details.message || 'Round over.',
    declarerPlayerId: details.declarerPlayerId || null,
    validDeclaration: details.validDeclaration ?? null,
    roundWinnerPlayerId: details.roundWinnerPlayerId || null,
    winnerPlayerId: game.winnerPlayerId || null,
    nextRoundInSeconds: game.state === 'round_over' ? ROUND_RESULT_SECONDS : null,
    scoreWindowEndsAt: game.scoreWindowEndsAt || null,
    roundHistory: [...(game.roundHistory || [])],
    poolAmount: safePoolAmount(game),
    splitOffer: buildSplitOffer(game),
    splitFinalized: !!game.splitFinalized,
    splitResult: game.splitResult || null,
    scoresByPlayerId: { ...game.scoresByPlayerId },
    roundPointsByPlayerId: { ...game.roundPointsByPlayerId },
    lastRoundPointsByPlayerId: { ...(game.lastRoundPointsByPlayerId || game.roundPointsByPlayerId) },
    hand: [...(game.handsByPlayerId[forPlayerId] || [])],
    wildJoker: game.wildJoker || null,
    players: game.players.map((player) => ({
      id: player.id,
      playerId: player.playerId,
      name: player.name,
      connected: player.connected !== false,
      seatIndex: player.seatIndex ?? game.players.indexOf(player),
      score: game.scoresByPlayerId[player.playerId] || 0,
      roundPoints: game.roundPointsByPlayerId[player.playerId] || 0,
      lastRoundPoints: game.roundPointsByPlayerId[player.playerId] || 0,
      dropped: game.droppedPlayerIds.has(player.playerId),
      isEliminated: isEliminated(game, player.playerId),
      handSize: (game.handsByPlayerId[player.playerId] || []).length,
    })),
  };
}

function finishRound(code, details = {}) {
  const game = games[code];
  if (!game) return;

  if (game.scoreWindowTimer) {
    clearTimeout(game.scoreWindowTimer);
    game.scoreWindowTimer = null;
  }
  game.scoreWindowEndsAt = null;
  game.roundWinnerPlayerId = details.roundWinnerPlayerId || game.roundWinnerPlayerId || null;

  // Preserve the completed round points and append immutable history before
  // the next deal resets roundPointsByPlayerId.
  game.lastRoundPointsByPlayerId = { ...game.roundPointsByPlayerId };
  game.roundHistory = game.roundHistory || [];
  game.roundHistory.push(roundHistoryEntry(game, details));

  const remaining = activeGamePlayers(game);
  if (remaining.length <= 1) {
    game.state = 'finished';
    game.winnerPlayerId = remaining[0]?.playerId || game.roundWinnerPlayerId || null;
  } else {
    game.state = 'round_over';
    game.winnerPlayerId = null;
  }

  game.lastRoundDetails = { ...details };
  for (const player of game.players) {
    if (!player.connected || !player.id) continue;
    io.to(player.id).emit('round_result', buildRoundResult(code, game, player.playerId, details));
  }
  broadcastGameState(code);

  // If only 3 or 2 players remain, keep the result screen open so every
  // remaining player has a fair chance to review/confirm the optional split.
  // Otherwise the normal short result pause advances to the next round.
  if (game.state === 'round_over' && !buildSplitOffer(game)) {
    game.nextRoundTimer = setTimeout(() => {
      const current = games[code];
      if (!current || current.state !== 'round_over' || current.splitFinalized) return;
      dealRound(current);
      io.to(code).emit('round_started', { code, roundNumber: current.roundNumber });
      broadcastGameState(code);
    }, ROUND_RESULT_SECONDS * 1000);
  }
}

function finalizeScoreWindow(code) {
  const game = games[code];
  if (!game || game.state !== 'score_window') return;
  if (game.scoreWindowTimer) {
    clearTimeout(game.scoreWindowTimer);
    game.scoreWindowTimer = null;
  }

  const winnerId = game.roundWinnerPlayerId;
  for (const player of game.players) {
    if (player.playerId === winnerId) continue;
    if (game.droppedPlayerIds.has(player.playerId)) continue; // drop/wrong-show penalty already recorded
    if (isEliminated(game, player.playerId)) continue;
    const submitted = game.pendingScoreSubmissions?.[player.playerId];
    const score = Number.isFinite(submitted)
      ? submitted
      : calculateDeadwood(game.handsByPlayerId[player.playerId] || [], game.wildJoker);
    addPoints(game, player.playerId, score);
  }

  const details = game.pendingRoundDetails || {
    reason: 'valid_declaration',
    message: 'The 30-second score window ended.',
    roundWinnerPlayerId: winnerId,
  };
  game.pendingRoundDetails = null;
  finishRound(code, { ...details, scoreWindowFinalized: true });
}

function beginScoreWindow(code, details = {}) {
  const game = games[code];
  if (!game) return;
  if (game.nextRoundTimer) {
    clearTimeout(game.nextRoundTimer);
    game.nextRoundTimer = null;
  }
  if (game.scoreWindowTimer) clearTimeout(game.scoreWindowTimer);

  game.state = 'score_window';
  game.roundWinnerPlayerId = details.roundWinnerPlayerId || details.declarerPlayerId || null;
  game.pendingRoundDetails = { ...details };
  game.pendingScoreSubmissions = {};
  game.submittedScorePlayerIds = new Set(game.roundWinnerPlayerId ? [game.roundWinnerPlayerId] : []);
  game.scoreWindowEndsAt = Date.now() + SCORE_WINDOW_SECONDS * 1000;

  const requiredPlayerIds = game.players
    .filter((player) => player.playerId !== game.roundWinnerPlayerId)
    .filter((player) => !game.droppedPlayerIds.has(player.playerId))
    .filter((player) => !isEliminated(game, player.playerId))
    .map((player) => player.playerId);

  io.to(code).emit('score_window_started', {
    code,
    roundNumber: game.roundNumber || 1,
    winnerPlayerId: game.roundWinnerPlayerId,
    scoreWindowEndsAt: game.scoreWindowEndsAt,
    seconds: SCORE_WINDOW_SECONDS,
    requiredPlayerIds,
    submittedPlayerIds: [...game.submittedScorePlayerIds],
    message: 'Winner declared. Other players have 30 seconds to submit their round score.',
  });
  broadcastGameState(code);

  game.scoreWindowTimer = setTimeout(() => finalizeScoreWindow(code), SCORE_WINDOW_SECONDS * 1000);
}

function finalizeSplit(code) {
  const game = games[code];
  if (!game || game.splitFinalized) return false;
  const offer = buildSplitOffer(game);
  if (!offer) return false;
  const confirmed = game.splitConfirmedPlayerIds || new Set();
  if (!offer.playerIds.every((playerId) => confirmed.has(playerId))) return false;

  if (game.nextRoundTimer) {
    clearTimeout(game.nextRoundTimer);
    game.nextRoundTimer = null;
  }
  game.splitFinalized = true;
  game.state = 'finished';
  game.winnerPlayerId = null;
  game.splitResult = {
    poolAmount: offer.poolAmount,
    shareAmount: offer.shareAmount,
    playerIds: [...offer.playerIds],
    finalizedAt: Date.now(),
  };

  game.roundHistory = game.roundHistory || [];
  game.roundHistory.push({
    type: 'split',
    roundNumber: game.roundNumber || 1,
    finalizedAt: Date.now(),
    poolAmount: offer.poolAmount,
    shareAmount: offer.shareAmount,
    playerIds: [...offer.playerIds],
  });

  io.to(code).emit('split_finalized', { code, ...game.splitResult });
  game.lastRoundDetails = {
    reason: 'split_finalized',
    message: `Pool split confirmed. Each remaining player receives ${offer.shareAmount}.`,
    roundWinnerPlayerId: game.roundWinnerPlayerId || null,
  };
  for (const player of game.players) {
    if (!player.connected || !player.id) continue;
    io.to(player.id).emit('round_result', buildRoundResult(code, game, player.playerId, game.lastRoundDetails));
  }
  broadcastGameState(code);
  return true;
}

function stopActiveGameForExit(code, playerId, playerName, reason = 'left') {
  const game = games[code];
  if (!game || game.state !== 'playing') return false;

  if (game.nextRoundTimer) {
    clearTimeout(game.nextRoundTimer);
    game.nextRoundTimer = null;
  }
  if (game.scoreWindowTimer) {
    clearTimeout(game.scoreWindowTimer);
    game.scoreWindowTimer = null;
  }

  const safeName = String(playerName || 'A player').trim() || 'A player';
  game.state = 'stopped';
  io.to(code).emit('game_stopped', {
    code,
    stoppedByPlayerId: playerId || null,
    stoppedByName: safeName,
    reason,
    message: `${safeName} stopped the game. Play a new game with your friend.`,
    canReplayInRoom: true,
  });

  // The current hand must never continue after a real player exits. Removing
  // the game object also makes the room immediately reusable for a new friend.
  delete games[code];
  return true;
}

function removePlayerAfterGrace(code, playerId) {
  const room = rooms[code];
  if (!room) return;

  const player = room.players.find((p) => p.playerId === playerId);
  if (!player || player.connected) return;

  const removedRoomIndex = room.players.findIndex((p) => p.playerId === playerId);
  if (removedRoomIndex >= 0) room.players.splice(removedRoomIndex, 1);

  const game = games[code];
  if (game) {
    const previousTurnPlayerId = game.players[game.turnIndex]?.playerId || null;
    const removedGameIndex = game.players.findIndex((p) => p.playerId === playerId);
    if (removedGameIndex >= 0) {
      game.players.splice(removedGameIndex, 1);
      delete game.handsByPlayerId[playerId];
      delete game.scoresByPlayerId[playerId];
      delete game.roundPointsByPlayerId[playerId];
      if (game.lastRoundPointsByPlayerId) delete game.lastRoundPointsByPlayerId[playerId];
      game.droppedPlayerIds.delete(playerId);

      if (game.players.length === 0) {
        delete games[code];
      } else {
        if (removedGameIndex < game.turnIndex) game.turnIndex -= 1;
        if (game.turnIndex >= game.players.length) game.turnIndex = 0;
        if (game.dealerIndex >= game.players.length) game.dealerIndex = 0;

        if (game.state === 'playing' && game.players.length === 1) {
          finishRound(code, {
            reason: 'opponents_left',
            message: `${game.players[0].name} wins because all opponents left the room.`,
          });
        } else {
          const currentStillValid = game.players[game.turnIndex]?.playerId === previousTurnPlayerId
            && isRoundActive(game, game.players[game.turnIndex]);
          if (game.state === 'playing' && !currentStillValid) {
            const nextIndex = nextPlayableIndex(game, game.turnIndex - 1);
            if (nextIndex >= 0) game.turnIndex = nextIndex;
          }
          broadcastGameState(code);
        }
      }
    }
  }

  if (room.players.length === 0) {
    delete rooms[code];
    delete games[code];
    return;
  }

  if (room.hostPlayerId === playerId) {
    const nextHost = room.players.find((p) => p.connected) || room.players[0];
    room.hostPlayerId = nextHost.playerId;
    room.host = nextHost.id;
    io.to(code).emit('host_changed', {
      code,
      newHost: nextHost.id,
      newHostPlayerId: nextHost.playerId,
    });
  }

  emitRoomUpdate(code);
}

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'Star Rummy multiplayer', rooms: Object.keys(rooms).length });
});

io.on('connection', (socket) => {
  console.log(`[connect] socket.id=${socket.id}`);

  socket.on('register_room', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const playerName = String(payload.playerName || 'Host').trim().slice(0, 40) || 'Host';
    const entryFee = Math.max(0, Number(payload.entryFee) || 0);
    const tableSize = normaliseTableSize(payload.tableSize);

    if (!code || !playerId) {
      const response = { ok: false, message: 'Room code and player identity are required.' };
      socket.emit('room_error', response);
      ack?.(response);
      return;
    }

    const existing = rooms[code];
    if (existing) {
      if (existing.hostPlayerId !== playerId) {
        const response = { ok: false, message: 'That room code is already in use. Please create a new room.' };
        socket.emit('room_error', response);
        ack?.(response);
        return;
      }

      let hostPlayer = existing.players.find((p) => p.playerId === playerId);
      if (!hostPlayer) {
        hostPlayer = { id: socket.id, playerId, name: playerName, connected: true };
        existing.players.unshift(hostPlayer);
      }
      hostPlayer.name = playerName;
      bindPlayerSocket(code, hostPlayer, socket);
      existing.host = socket.id;
      if (entryFee > 0) existing.entryFee = entryFee;
      if (!games[code]) existing.tableSize = tableSize;
      socket.emit('room_registered', { code, resumed: true });
      emitRoomUpdate(code);
      const response = { ok: true, code, resumed: true, hostPlayerId: existing.hostPlayerId || null, entryFee: existing.entryFee || 0, tableSize: existing.tableSize, players: publicPlayers(existing.players) };
      ack?.(response);
      return;
    }

    rooms[code] = {
      host: socket.id,
      hostPlayerId: playerId,
      entryFee,
      tableSize,
      players: [{ id: socket.id, playerId, name: playerName, connected: true }],
    };
    socket.join(code);
    socket.emit('room_registered', { code, resumed: false });
    emitRoomUpdate(code);
    ack?.({ ok: true, code, resumed: false, hostPlayerId: rooms[code].hostPlayerId || null, entryFee: rooms[code].entryFee || 0, tableSize, players: publicPlayers(rooms[code].players) });
  });

  socket.on('validate_room', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const room = rooms[code];
    const roomTableSize = normaliseTableSize(room?.tableSize);
    const valid = !!room && !games[code] && room.players.length < roomTableSize;
    const response = { code, valid, entryFee: room?.entryFee || 0, tableSize: roomTableSize, playerCount: room?.players?.length || 0 };
    socket.emit('room_validated', response);
    ack?.({ ok: true, ...response });
  });

  socket.on('join_room', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const playerName = String(payload.playerName || 'Player').trim().slice(0, 40) || 'Player';
    const room = rooms[code];

    if (!code || !playerId) {
      const response = { ok: false, message: 'Enter a valid room code.' };
      socket.emit('room_error', response);
      ack?.(response);
      return;
    }
    if (!room) {
      const response = { ok: false, message: 'Room not found. Ask the host to create the room first.' };
      socket.emit('room_error', response);
      ack?.(response);
      return;
    }

    let player = room.players.find((p) => p.playerId === playerId);
    if (games[code] && !player) {
      const response = { ok: false, message: 'This game has already started.' };
      socket.emit('room_error', response);
      ack?.(response);
      return;
    }
    if (!player && room.players.length >= normaliseTableSize(room.tableSize)) {
      const response = { ok: false, message: 'Room is full.' };
      socket.emit('room_error', response);
      ack?.(response);
      return;
    }

    if (!player) {
      player = { id: socket.id, playerId, name: playerName, connected: true };
      room.players.push(player);
    } else {
      player.name = playerName;
    }

    bindPlayerSocket(code, player, socket);
    emitRoomUpdate(code);
    socket.emit('room_joined', { code });

    if (games[code]) {
      const gamePlayer = findGamePlayer(games[code], playerId, socket.id);
      sendGameStateToPlayer(code, gamePlayer);
      sendLatestRoundResult(code, gamePlayer);
    }

    ack?.({ ok: true, code, hostPlayerId: room.hostPlayerId || null, entryFee: room.entryFee || 0, tableSize: normaliseTableSize(room.tableSize), players: publicPlayers(room.players), resumed: !!games[code] });
  });

  socket.on('leave_room', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const room = rooms[code];
    const player = room?.players.find((p) => p.playerId === playerId);

    if (!room || !player) {
      ack?.({ ok: true, code, alreadyLeft: true });
      return;
    }

    clearDisconnectTimer(code, playerId);
    stopActiveGameForExit(code, playerId, player.name, 'player_left');
    player.connected = false;
    const gamePlayer = games[code]?.players.find((p) => p.playerId === playerId);
    if (gamePlayer) gamePlayer.connected = false;
    socket.leave(code);
    io.to(code).emit('player_left', { code, playerId, name: player.name });
    removePlayerAfterGrace(code, playerId);
    ack?.({ ok: true, code });
  });

  socket.on('rejoin_room', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const room = rooms[code];
    const player = room?.players.find((p) => p.playerId === playerId);

    if (!room || !player) {
      ack?.({ ok: false, message: 'Room is no longer available.' });
      return;
    }

    bindPlayerSocket(code, player, socket);
    if (room.hostPlayerId === playerId) room.host = socket.id;
    emitRoomUpdate(code);

    const gamePlayer = findGamePlayer(games[code], playerId, socket.id);
    if (gamePlayer) {
      sendGameStateToPlayer(code, gamePlayer);
      sendLatestRoundResult(code, gamePlayer);
    }

    socket.emit('room_rejoined', { code });
    ack?.({ ok: true, code, inGame: !!games[code] });
  });

  socket.on('request_game_state', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const game = games[code];
    if (!game) {
      ack?.({ ok: false, message: 'Game not found.' });
      return;
    }

    const player = findGamePlayer(game, playerId, socket.id);
    if (!player) {
      ack?.({ ok: false, message: 'Player is not part of this game.' });
      return;
    }

    player.id = socket.id;
    player.connected = true;
    socket.join(code);

    const roomPlayer = rooms[code]?.players.find((p) => p.playerId === player.playerId);
    if (roomPlayer) bindPlayerSocket(code, roomPlayer, socket);

    sendGameStateToPlayer(code, player);
    sendLatestRoundResult(code, player);
    ack?.({ ok: true });
  });

  socket.on('start_game', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const room = rooms[code];

    if (!room) {
      const response = { ok: false, message: 'Room not found.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const hostPlayer = room.players.find((p) => p.playerId === playerId);
    if (hostPlayer) bindPlayerSocket(code, hostPlayer, socket);

    if (!playerId || playerId !== room.hostPlayerId) {
      const response = { ok: false, message: 'Only the host can start the game.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const connectedPlayers = room.players.filter((p) => p.connected !== false);
    const requiredPlayers = normaliseTableSize(room.tableSize);
    if (connectedPlayers.length < requiredPlayers) {
      const response = { ok: false, message: requiredPlayers === 6 ? 'This is a 6-player table. All 6 players must be seated before the host starts.' : 'Both players must be connected before the host starts.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    if (games[code]) {
      ack?.({ ok: true, code, alreadyStarted: true });
      broadcastGameState(code);
      return;
    }

    io.to(code).emit('game_starting', { code, countdown: START_COUNTDOWN_SECONDS });
    ack?.({ ok: true, code, countdown: START_COUNTDOWN_SECONDS });

    setTimeout(() => {
      if (games[code] || !rooms[code]) return;
      const currentRoom = rooms[code];
      const players = currentRoom.players
        .filter((p) => p.connected !== false)
        .map((p, seatIndex) => ({ ...p, seatIndex }));
      if (players.length < normaliseTableSize(currentRoom.tableSize)) {
        io.to(code).emit('game_error', { message: 'A player disconnected before all required seats were ready.' });
        return;
      }

      const game = {
        players,
        scoresByPlayerId: Object.fromEntries(players.map((player) => [player.playerId, 0])),
        roundPointsByPlayerId: {},
        lastRoundPointsByPlayerId: Object.fromEntries(players.map((player) => [player.playerId, 0])),
        droppedPlayerIds: new Set(),
        lastDiscardByPlayerId: {},
        roundNumber: 0,
        dealerIndex: -1,
        winnerPlayerId: null,
        actionSequence: 0,
        lastAction: null,
        roundHistory: [],
        roundWinnerPlayerId: null,
        scoreWindowEndsAt: null,
        scoreWindowTimer: null,
        pendingScoreSubmissions: {},
        submittedScorePlayerIds: new Set(),
        splitConfirmedPlayerIds: new Set(),
        splitFinalized: false,
        splitResult: null,
        poolAmount: Math.max(0, Number(currentRoom.entryFee) || 0) * players.length,
      };
      games[code] = game;
      dealRound(game);

      broadcastGameState(code);
    }, START_COUNTDOWN_SECONDS * 1000);
  });

  socket.on('draw_card', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const fromDiscard = !!payload.fromDiscard;
    const game = games[code];

    if (!game) {
      const response = { ok: false, message: 'Game not found.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }
    if (game.state !== 'playing') {
      const response = { ok: false, message: 'This round is not accepting moves.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const actor = findGamePlayer(game, playerId, socket.id);
    const currentPlayer = game.players[game.turnIndex];
    if (!actor || !currentPlayer || actor.playerId !== currentPlayer.playerId || !isRoundActive(game, actor)) {
      const response = { ok: false, message: 'Not your turn.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    actor.id = socket.id;
    actor.connected = true;
    const hand = game.handsByPlayerId[actor.playerId] || [];
    if (hand.length !== 13) {
      const response = { ok: false, message: 'You must discard before drawing again.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    let card;
    if (fromDiscard) {
      if (game.discardPile.length === 0) {
        const response = { ok: false, message: 'Discard pile is empty.' };
        socket.emit('game_error', response);
        ack?.(response);
        return;
      }
      const openCard = game.discardPile[game.discardPile.length - 1];
      if (ruleIsJokerCard(openCard, game.wildJoker)) {
        const response = { ok: false, message: 'Joker cannot be picked from the open deck. Draw from the closed deck.' };
        socket.emit('game_error', response);
        ack?.(response);
        return;
      }
      card = game.discardPile.pop();
    } else {
      if (game.deck.length === 0) {
        if (game.discardPile.length <= 1) {
          const response = { ok: false, message: 'No cards left to draw.' };
          socket.emit('game_error', response);
          ack?.(response);
          return;
        }
        const top = game.discardPile.pop();
        game.deck = shuffle(game.discardPile);
        game.discardPile = top ? [top] : [];
      }
      card = game.deck.shift();
    }

    if (!card) {
      const response = { ok: false, message: 'No cards left.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    hand.push(card);
    game.drawnPlayerIds.add(actor.playerId);
    game.handsByPlayerId[actor.playerId] = hand;
    recordGameAction(game, {
      type: 'draw',
      playerId: actor.playerId,
      source: fromDiscard ? 'discard' : 'closed',
    });
    broadcastGameState(code);
    ack?.({ ok: true, cardId: card.id });
  });

  socket.on('discard_card', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const cardId = payload.cardId;
    const game = games[code];

    if (!game) {
      const response = { ok: false, message: 'Game not found.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }
    if (game.state !== 'playing') {
      const response = { ok: false, message: 'This round is not accepting moves.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const actor = findGamePlayer(game, playerId, socket.id);
    const currentPlayer = game.players[game.turnIndex];
    if (!actor || !currentPlayer || actor.playerId !== currentPlayer.playerId || !isRoundActive(game, actor)) {
      const response = { ok: false, message: 'Not your turn.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    actor.id = socket.id;
    actor.connected = true;
    const hand = game.handsByPlayerId[actor.playerId] || [];
    if (hand.length !== 14) {
      const response = { ok: false, message: 'Draw a card before discarding.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      const response = { ok: false, message: 'Card not in hand.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const [card] = hand.splice(cardIndex, 1);
    game.discardPile.push(card);
    game.lastDiscardByPlayerId[actor.playerId] = card;
    recordGameAction(game, {
      type: 'discard',
      playerId: actor.playerId,
      card,
    });
    const nextTurnIndex = nextPlayableIndex(game, game.turnIndex);
    if (nextTurnIndex < 0) {
      const response = { ok: false, message: 'No active player is available for the next turn.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }
    game.turnIndex = nextTurnIndex;
    broadcastGameState(code);
    ack?.({ ok: true, nextTurnPlayerId: game.players[game.turnIndex]?.playerId || null });
  });

  socket.on('drop_game', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const game = games[code];

    if (!game || game.state !== 'playing') {
      const response = { ok: false, message: 'No active round was found.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const actor = findGamePlayer(game, playerId, socket.id);
    const currentPlayer = game.players[game.turnIndex];
    if (!actor || !currentPlayer || actor.playerId !== currentPlayer.playerId || !isRoundActive(game, actor)) {
      const response = { ok: false, message: 'You can only drop on your turn.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const hand = game.handsByPlayerId[actor.playerId] || [];
    if (hand.length !== 13 && hand.length !== 14) {
      const response = { ok: false, message: 'Your hand is not in a droppable state.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const penalty = game.drawnPlayerIds.has(actor.playerId) ? 40 : 20;
    addPoints(game, actor.playerId, penalty);
    game.droppedPlayerIds.add(actor.playerId);
    io.to(code).emit('player_dropped', { code, playerId: actor.playerId, penalty });

    const stillPlaying = activeRoundPlayers(game);
    if (stillPlaying.length <= 1) {
      finishRound(code, {
        reason: 'last_player_after_drop',
        roundWinnerPlayerId: stillPlaying[0]?.playerId || null,
        message: stillPlaying.length === 1
          ? `${stillPlaying[0].name} wins the round after the other players dropped.`
          : 'Round ended because no active players remain.',
      });
      ack?.({ ok: true, penalty, roundOver: true });
      return;
    }

    const nextTurnIndex = nextPlayableIndex(game, game.turnIndex);
    if (nextTurnIndex < 0) {
      finishRound(code, { reason: 'no_connected_players', message: 'Round paused because no active player is connected.' });
      ack?.({ ok: true, penalty, roundOver: true });
      return;
    }

    game.turnIndex = nextTurnIndex;
    broadcastGameState(code);
    ack?.({ ok: true, penalty, roundOver: false, nextTurnPlayerId: game.players[game.turnIndex]?.playerId || null });
  });

  socket.on('declare', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const cardId = String(payload.cardId || '').trim();
    const game = games[code];

    if (!game || game.state !== 'playing') {
      const response = { ok: false, message: 'No active round was found.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const actor = findGamePlayer(game, playerId, socket.id);
    const currentPlayer = game.players[game.turnIndex];
    if (!actor || !currentPlayer || actor.playerId !== currentPlayer.playerId || !isRoundActive(game, actor)) {
      const response = { ok: false, message: 'You can only declare on your turn.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const hand = game.handsByPlayerId[actor.playerId] || [];
    if (hand.length !== 14) {
      const response = { ok: false, message: 'Draw a card before declaring.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const discardIndex = hand.findIndex((card) => card.id === cardId);
    if (discardIndex < 0) {
      const response = { ok: false, message: 'Select a card from your hand for the finish slot.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    const [discardedCard] = hand.splice(discardIndex, 1);
    game.discardPile.push(discardedCard);
    game.lastDiscardByPlayerId[actor.playerId] = discardedCard;
    game.handsByPlayerId[actor.playerId] = hand;

    const verdict = validateDeclaration(hand, game.wildJoker);

    io.to(code).emit('player_declared', {
      code,
      playerId: actor.playerId,
      valid: verdict.valid,
      reason: verdict.reason,
    });

    if (!verdict.valid) {
      addPoints(game, actor.playerId, 80);
      game.droppedPlayerIds.add(actor.playerId);
      io.to(code).emit('player_dropped', { code, playerId: actor.playerId, penalty: 80, reason: 'wrong_declaration' });

      const stillPlaying = activeRoundPlayers(game);
      if (stillPlaying.length <= 1) {
        finishRound(code, {
          reason: 'wrong_declaration',
          message: `${actor.name} made a wrong declaration and received 80 points.`,
          declarerPlayerId: actor.playerId,
          validDeclaration: false,
          roundWinnerPlayerId: stillPlaying[0]?.playerId || null,
        });
        ack?.({ ok: true, valid: false, roundOver: true, reason: verdict.reason });
        return;
      }

      const nextTurnIndex = nextPlayableIndex(game, game.turnIndex);
      if (nextTurnIndex >= 0) game.turnIndex = nextTurnIndex;
      broadcastGameState(code);
      ack?.({ ok: true, valid: false, roundOver: false, reason: verdict.reason });
      return;
    }

    beginScoreWindow(code, {
      reason: 'valid_declaration',
      message: `${actor.name} made a valid declaration. 30-second score submission window started.`,
      declarerPlayerId: actor.playerId,
      validDeclaration: true,
      roundWinnerPlayerId: actor.playerId,
    });
    ack?.({
      ok: true,
      valid: true,
      roundOver: false,
      scoreWindow: true,
      scoreWindowEndsAt: game.scoreWindowEndsAt,
      reason: verdict.reason,
    });
  });

  socket.on('submit_round_score', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const game = games[code];
    if (!game || game.state !== 'score_window') {
      ack?.({ ok: false, message: 'The score window is not open.' });
      return;
    }
    if (!game.scoreWindowEndsAt || Date.now() >= game.scoreWindowEndsAt) {
      ack?.({ ok: false, message: 'The 30-second score window has expired.' });
      return;
    }
    const actor = findGamePlayer(game, playerId, socket.id);
    if (!actor) {
      ack?.({ ok: false, message: 'Player is not part of this game.' });
      return;
    }
    if (actor.playerId === game.roundWinnerPlayerId) {
      ack?.({ ok: false, message: 'The round winner has 0 points and does not submit a score.' });
      return;
    }
    if (game.droppedPlayerIds.has(actor.playerId)) {
      ack?.({ ok: false, message: 'Your drop/wrong-show penalty is already locked for this round.' });
      return;
    }
    if (game.submittedScorePlayerIds?.has(actor.playerId)) {
      ack?.({ ok: true, alreadySubmitted: true, score: game.pendingScoreSubmissions?.[actor.playerId] ?? 0 });
      return;
    }

    const score = calculateDeadwood(game.handsByPlayerId[actor.playerId] || [], game.wildJoker);
    game.pendingScoreSubmissions[actor.playerId] = score;
    game.submittedScorePlayerIds.add(actor.playerId);
    const event = {
      code,
      playerId: actor.playerId,
      score,
      submittedPlayerIds: [...game.submittedScorePlayerIds],
      scoreWindowEndsAt: game.scoreWindowEndsAt,
    };
    io.to(code).emit('score_submitted', event);
    broadcastGameState(code);
    ack?.({ ok: true, score, scoreWindowEndsAt: game.scoreWindowEndsAt });
  });

  socket.on('confirm_split', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const game = games[code];
    if (!game || game.state !== 'round_over' || game.splitFinalized) {
      ack?.({ ok: false, message: 'Split is not available right now.' });
      return;
    }
    const actor = findGamePlayer(game, playerId, socket.id);
    const offer = buildSplitOffer(game);
    if (!actor || !offer || !offer.playerIds.includes(actor.playerId)) {
      ack?.({ ok: false, message: 'You are not eligible for this split.' });
      return;
    }
    game.splitConfirmedPlayerIds = game.splitConfirmedPlayerIds || new Set();
    game.splitConfirmedPlayerIds.add(actor.playerId);
    const updated = buildSplitOffer(game);
    io.to(code).emit('split_update', { code, splitOffer: updated });
    const finalized = finalizeSplit(code);
    ack?.({ ok: true, finalized, splitOffer: finalized ? null : updated, splitResult: game.splitResult || null });
  });

  socket.on('start_next_round', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const game = games[code];

    if (!game) {
      ack?.({ ok: false, message: 'Game not found.' });
      return;
    }
    if (!findGamePlayer(game, playerId, socket.id)) {
      ack?.({ ok: false, message: 'Player is not part of this game.' });
      return;
    }
    if (game.state === 'finished') {
      ack?.({ ok: false, message: 'The game is already finished.', winnerPlayerId: game.winnerPlayerId });
      return;
    }
    if (game.state !== 'round_over') {
      ack?.({ ok: false, message: 'The next round is not ready yet.' });
      return;
    }

    if (game.nextRoundTimer) {
      clearTimeout(game.nextRoundTimer);
      game.nextRoundTimer = null;
    }
    dealRound(game);
    io.to(code).emit('round_started', { code, roundNumber: game.roundNumber });
    broadcastGameState(code);
    ack?.({ ok: true, code, roundNumber: game.roundNumber });
  });

  socket.on('disconnect', () => {
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) continue;

      const stoppedActiveGame = stopActiveGameForExit(code, player.playerId, player.name, 'connection_closed');
      player.connected = false;
      const gamePlayer = games[code]?.players.find((p) => p.playerId === player.playerId);
      if (gamePlayer) gamePlayer.connected = false;
      emitRoomUpdate(code);

      clearDisconnectTimer(code, player.playerId);
      if (stoppedActiveGame) {
        // During an active real-player game, a closed connection ends the hand
        // immediately and frees the seat so the friend can start a fresh game.
        removePlayerAfterGrace(code, player.playerId);
        continue;
      }

      const key = timerKey(code, player.playerId);
      const timer = setTimeout(() => {
        disconnectTimers.delete(key);
        removePlayerAfterGrace(code, player.playerId);
      }, RECONNECT_GRACE_MS);
      disconnectTimers.set(key, timer);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Rummy server running on port ${PORT}`);
});
