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
const START_TOSS_FLIGHT_MS = 320;
const START_TOSS_GAP_MS = 110;
const START_FLIP_MS = 400;
const START_HIGHEST_HOLD_MS = 1050;
const START_CROWN_MS = 620;
const START_DEALER_MS = 520;
const START_CLEAR_MS = 380;
const INITIAL_DEAL_FLIGHT_MS = 290;
const INITIAL_DEAL_GAP_MS = 95;
const SCORE_WINDOW_SECONDS = 30;
const ROUND_RESULT_SECONDS = 8;
const SPLIT_COUNTS = new Set([2, 3]);

function normaliseTableSize(value) {
  const parsed = Math.floor(Number(value) || MAX_PLAYERS);
  return Math.max(2, Math.min(MAX_PLAYERS, parsed));
}

function normaliseMinPlayers(value, tableSize = MAX_PLAYERS) {
  const maxSeats = normaliseTableSize(tableSize);
  const parsed = Math.floor(Number(value) || 2);
  return Math.max(2, Math.min(maxSeats, parsed));
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

function seatingRankValue(rank) {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return Number(rank) || 0;
}

function seatingSuitValue(suit) {
  // The project already defines its deterministic natural-suit order as
  // S, H, D, C. It is used only when two toss cards have the same rank so
  // the server can produce one shared ordering without a client-side tie.
  const index = SUITS.indexOf(suit);
  return index < 0 ? 0 : SUITS.length - index;
}

function createSeatingDraw(players = []) {
  // Exactly one card per real player is taken from one server-shuffled natural
  // 52-card deck. Rank is A > K > ... > 2. Equal ranks use the project's
  // deterministic S > H > D > C order; no client performs randomness or
  // winner comparison, and no toss card is silently replaced before reveal.
  const deck = shuffle(buildDeck(5000).filter((card) => RANKS.includes(card.rank)));
  const picks = players.map((player, index) => ({
    player,
    card: deck[index] || { id: `SEAT_${player.playerId}`, rank: '2', suit: 'C' },
  }));

  picks.sort((a, b) => {
    const rankDiff = seatingRankValue(b.card.rank) - seatingRankValue(a.card.rank);
    if (rankDiff) return rankDiff;
    return seatingSuitValue(b.card.suit) - seatingSuitValue(a.card.suit);
  });
  return picks.map(({ player, card }, rankOrder) => ({
    ...player,
    rankOrder,
    seatIndex: null,
    seatingCard: { id: card.id, rank: card.rank, suit: card.suit },
    hasCrown: rankOrder === 0,
  }));
}

function seatingDrawPayload(players = []) {
  return [...players]
    .sort((a, b) => (a.rankOrder ?? 99) - (b.rankOrder ?? 99))
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      rankOrder: p.rankOrder ?? null,
      seatIndex: p.seatIndex ?? null,
      card: p.seatingCard || null,
      hasCrown: !!p.hasCrown,
    }));
}

function finalizeAutomaticSeating(room) {
  if (!room) return [];
  const pending = (room.pendingSeatingOrder || [])
    .sort((a, b) => (a.rankOrder ?? 99) - (b.rankOrder ?? 99));
  if (!pending.length) return [];

  // Highest card owns seat-order priority. The next-highest is immediately to
  // the RIGHT, then the next, continuing clockwise. With the local-player
  // rotation used by the clients this also keeps 2-player rooms opposite and
  // 3/4/5/6-player rooms evenly distributed with no fake/empty game seats.
  const liveById = new Map((room.players || []).map((player) => [player.playerId, player]));
  const seated = pending.map((rankedPlayer, rankOrder) => {
    const live = liveById.get(rankedPlayer.playerId) || rankedPlayer;
    return {
      ...rankedPlayer,
      ...live,
      rankOrder,
      seatIndex: rankOrder,
      seatingCard: rankedPlayer.seatingCard,
      hasCrown: rankOrder === 0,
    };
  });

  room.players = seated;
  room.pendingSeatingOrder = null;
  room.seatChoiceRequiredPlayerId = null;
  room.highCardPlayerId = seated[0]?.playerId || null;
  room.initialDealerPlayerId = seated[seated.length - 1]?.playerId || null;
  return room.players;
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
  const previousRoundNumber = game.roundNumber || 0;
  game.roundNumber = incrementRound ? previousRoundNumber + 1 : (previousRoundNumber || 1);
  game.state = 'playing';
  game.winnerPlayerId = null;
  game.roundWinnerPlayerId = null;
  game.declarationPlayerId = null;
  game.declarationSubmitted = false;
  game.scoreWindowStage = null;
  game.scoreWindowEndsAt = null;
  game.pendingScoreSubmissions = {};
  game.submittedScorePlayerIds = new Set();
  game.splitConfirmedPlayerIds = new Set();
  game.lastRoundDetails = null;

  // First deal belongs to the LOWEST seating-card player (last seat).
  // Later rounds rotate the dealer one active seat to the right. The first turn
  // of each round is the active player immediately to the dealer's right.
  if (previousRoundNumber === 0 && Number.isInteger(game.initialDealerIndex)) {
    game.dealerIndex = game.initialDealerIndex;
  } else if (previousRoundNumber > 0) {
    const nextDealer = nextPlayableIndex(game, Number.isInteger(game.dealerIndex) ? game.dealerIndex : -1);
    if (nextDealer >= 0) game.dealerIndex = nextDealer;
  }
  const firstTurn = nextPlayableIndex(game, Number.isInteger(game.dealerIndex) ? game.dealerIndex : -1);
  game.turnIndex = firstTurn >= 0 ? firstTurn : (game.dealerIndex >= 0 ? game.dealerIndex : 0);
}

function publicPlayers(players) {
  return players.map((p) => ({
    id: p.id,
    playerId: p.playerId,
    name: p.name,
    connected: p.connected !== false,
    seatIndex: p.seatIndex ?? null,
    rankOrder: p.rankOrder ?? null,
    seatingCard: p.seatingCard || null,
    hasCrown: !!p.hasCrown,
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
  const phase = room.startSequence?.phase || null;
  const revealCards = ['revealed', 'highest', 'seat_order', 'dealer', 'cleanup', 'initial_deal', 'complete'].includes(phase);
  const revealHigh = ['highest', 'seat_order', 'dealer', 'cleanup', 'initial_deal', 'complete'].includes(phase);
  const revealDealer = ['dealer', 'cleanup', 'initial_deal', 'complete'].includes(phase);
  const pendingDraw = seatingDrawPayload(room.pendingSeatingOrder || []);
  const publicDraw = revealCards
    ? pendingDraw
    : phase === 'toss_flying'
      ? pendingDraw.map((pick) => ({ ...pick, card: null, hasCrown: false }))
      : [];

  io.to(code).emit('room_update', {
    code,
    hostPlayerId: room.hostPlayerId || null,
    tableSize: normaliseTableSize(room.tableSize),
    minPlayers: normaliseMinPlayers(room.minPlayers, room.tableSize),
    highCardPlayerId: revealHigh ? (room.highCardPlayerId || null) : null,
    dealerPlayerId: revealDealer ? (room.initialDealerPlayerId || null) : null,
    seatChoiceRequiredPlayerId: null,
    seatingDraw: publicDraw.length ? publicDraw : (room.pendingSeatingOrder ? [] : seatingDrawPayload(room.players)),
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

function scoreWindowRequiredPlayerIds(game) {
  if (!game || game.state !== 'score_window') return [];
  if (game.scoreWindowStage === 'declare') {
    return game.declarationPlayerId ? [game.declarationPlayerId] : [];
  }
  return game.players
    .filter((player) => player.playerId !== game.roundWinnerPlayerId)
    .filter((player) => !game.droppedPlayerIds.has(player.playerId))
    .filter((player) => !isEliminated(game, player.playerId))
    .map((player) => player.playerId);
}

function buildSnapshot(game, forPlayerId) {
  const playerMeta = game.players.map((p) => ({
    id: p.id,
    playerId: p.playerId,
    name: p.name,
    connected: p.connected !== false,
    seatIndex: p.seatIndex ?? game.players.indexOf(p),
    rankOrder: p.rankOrder ?? null,
    seatingCard: p.seatingCard || null,
    hasCrown: !!p.hasCrown,
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
    dealerPlayerId: game.players[game.dealerIndex]?.playerId || null,
    highCardPlayerId: game.highCardPlayerId || null,
    seatingDraw: game.seatingDraw || [],
    winnerPlayerId: game.winnerPlayerId || null,
    roundWinnerPlayerId: game.roundWinnerPlayerId || null,
    declarationPlayerId: game.declarationPlayerId || null,
    declarationSubmitted: !!game.declarationSubmitted,
    scoreWindowStage: game.scoreWindowStage || null,
    scoreWindowEndsAt: game.scoreWindowEndsAt || null,
    scoreWindowSeconds: SCORE_WINDOW_SECONDS,
    scoreWindowSecondsRemaining: game.scoreWindowEndsAt ? Math.max(0, Math.ceil((game.scoreWindowEndsAt - Date.now()) / 1000)) : null,
    requiredScorePlayerIds: scoreWindowRequiredPlayerIds(game),
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
    // Hands are revealed only in the completed round result so every client
    // receives the same reference-style scoreboard without leaking live cards.
    revealedHandsByPlayerId: Object.fromEntries(
      game.players.map((player) => [player.playerId, [...(game.handsByPlayerId[player.playerId] || [])]]),
    ),
    wildJoker: game.wildJoker || null,
    players: game.players.map((player) => ({
      id: player.id,
      playerId: player.playerId,
      name: player.name,
      connected: player.connected !== false,
      seatIndex: player.seatIndex ?? game.players.indexOf(player),
      rankOrder: player.rankOrder ?? null,
      seatingCard: player.seatingCard || null,
      hasCrown: !!player.hasCrown,
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
  if (game.scoreWindowInterval) {
    clearInterval(game.scoreWindowInterval);
    game.scoreWindowInterval = null;
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

  // The split option is optional and must never trap active players on the
  // result screen. Keep the offer visible during the normal result pause, but
  // automatically continue the game if all eligible players do not confirm it.
  // finalizeSplit() clears this timer when a split is accepted unanimously.
  if (game.state === 'round_over') {
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
  if (game.scoreWindowInterval) {
    clearInterval(game.scoreWindowInterval);
    game.scoreWindowInterval = null;
  }

  // If the player placed a card in FINISH but never pressed DECLARE SHOW,
  // the 30-second declaration window expires as a wrong show.
  if (game.scoreWindowStage === 'declare' && game.declarationPlayerId && !game.declarationSubmitted) {
    addPoints(game, game.declarationPlayerId, 80);
    game.droppedPlayerIds.add(game.declarationPlayerId);
    const declarer = game.players.find((player) => player.playerId === game.declarationPlayerId);
    game.pendingRoundDetails = {
      reason: 'declaration_timeout',
      message: `${declarer?.name || 'Player'} did not submit the declaration within 30 seconds and received 80 points.`,
      declarerPlayerId: game.declarationPlayerId,
      validDeclaration: false,
      roundWinnerPlayerId: null,
    };
    game.scoreWindowStage = 'score';
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
    reason: 'declaration_window_complete',
    message: 'The 30-second declaration window ended.',
    declarerPlayerId: game.declarationPlayerId || null,
    validDeclaration: !!winnerId,
    roundWinnerPlayerId: winnerId,
  };
  game.pendingRoundDetails = null;
  finishRound(code, { ...details, scoreWindowFinalized: true });
}

function emitDeclarationWindowState(code) {
  const game = games[code];
  if (!game || game.state !== 'score_window' || !game.scoreWindowEndsAt) return;
  const seconds = Math.max(0, Math.ceil((game.scoreWindowEndsAt - Date.now()) / 1000));
  io.to(code).emit('score_window_started', {
    code,
    roundNumber: game.roundNumber || 1,
    stage: game.scoreWindowStage || 'declare',
    declarerPlayerId: game.declarationPlayerId || null,
    winnerPlayerId: game.roundWinnerPlayerId || null,
    scoreWindowStartedAt: game.scoreWindowEndsAt - SCORE_WINDOW_SECONDS * 1000,
    scoreWindowEndsAt: game.scoreWindowEndsAt,
    seconds,
    requiredPlayerIds: scoreWindowRequiredPlayerIds(game),
    submittedPlayerIds: [...(game.submittedScorePlayerIds || new Set())],
    message: game.scoreWindowStage === 'declare'
      ? 'Finish confirmed. Arrange your 13 cards and press DECLARE SHOW before the 30-second timer reaches 0.'
      : 'Declaration submitted. Other players may group their cards and commit before the timer reaches 0.',
  });
}

function beginDeclarationWindow(code, actor, cardId) {
  const game = games[code];
  if (!game || !actor) return { ok: false, message: 'No active round was found.' };
  if (game.state !== 'playing') return { ok: false, message: 'The round is not accepting a finish right now.' };
  const currentPlayer = game.players[game.turnIndex];
  if (!currentPlayer || actor.playerId !== currentPlayer.playerId || !isRoundActive(game, actor)) {
    return { ok: false, message: 'You can only finish on your turn.' };
  }

  const hand = game.handsByPlayerId[actor.playerId] || [];
  if (hand.length !== 14) return { ok: false, message: 'Draw a card before using Finish.' };
  const discardIndex = hand.findIndex((card) => card.id === cardId);
  if (discardIndex < 0) return { ok: false, message: 'Select a card from your hand for the finish slot.' };

  const [discardedCard] = hand.splice(discardIndex, 1);
  game.discardPile.push(discardedCard);
  game.lastDiscardByPlayerId[actor.playerId] = discardedCard;
  game.handsByPlayerId[actor.playerId] = hand;
  game.state = 'score_window';
  game.scoreWindowStage = 'declare';
  game.declarationPlayerId = actor.playerId;
  game.declarationSubmitted = false;
  game.roundWinnerPlayerId = null;
  game.pendingRoundDetails = null;
  game.pendingScoreSubmissions = {};
  game.submittedScorePlayerIds = new Set();
  game.scoreWindowEndsAt = Date.now() + SCORE_WINDOW_SECONDS * 1000;

  if (game.nextRoundTimer) {
    clearTimeout(game.nextRoundTimer);
    game.nextRoundTimer = null;
  }
  if (game.scoreWindowTimer) clearTimeout(game.scoreWindowTimer);
  if (game.scoreWindowInterval) clearInterval(game.scoreWindowInterval);

  emitDeclarationWindowState(code);
  broadcastGameState(code);

  const emitTick = () => {
    const current = games[code];
    if (!current || current.state !== 'score_window' || !current.scoreWindowEndsAt) return;
    const seconds = Math.max(0, Math.ceil((current.scoreWindowEndsAt - Date.now()) / 1000));
    io.to(code).emit('score_window_tick', {
      code,
      roundNumber: current.roundNumber || 1,
      stage: current.scoreWindowStage || 'declare',
      declarerPlayerId: current.declarationPlayerId || null,
      winnerPlayerId: current.roundWinnerPlayerId || null,
      scoreWindowEndsAt: current.scoreWindowEndsAt,
      seconds,
      requiredPlayerIds: scoreWindowRequiredPlayerIds(current),
      submittedPlayerIds: [...(current.submittedScorePlayerIds || new Set())],
    });
    if (seconds <= 0 && current.scoreWindowInterval) {
      clearInterval(current.scoreWindowInterval);
      current.scoreWindowInterval = null;
    }
  };
  emitTick();
  game.scoreWindowInterval = setInterval(emitTick, 1000);
  game.scoreWindowTimer = setTimeout(() => finalizeScoreWindow(code), SCORE_WINDOW_SECONDS * 1000);

  return {
    ok: true,
    scoreWindow: true,
    stage: 'declare',
    declarerPlayerId: actor.playerId,
    scoreWindowEndsAt: game.scoreWindowEndsAt,
    discardedCard,
  };
}

function submitDeclarationShow(code, actor) {
  const game = games[code];
  if (!game || game.state !== 'score_window' || game.scoreWindowStage !== 'declare') {
    return { ok: false, message: 'The 30-second declaration window is not open.' };
  }
  if (!game.scoreWindowEndsAt || Date.now() >= game.scoreWindowEndsAt) {
    return { ok: false, message: 'The 30-second declaration window has expired.' };
  }
  if (!actor || actor.playerId !== game.declarationPlayerId) {
    return { ok: false, message: 'Only the player who used Finish can submit this declaration.' };
  }
  if (game.declarationSubmitted) return { ok: false, message: 'Declaration has already been submitted.' };

  const hand = game.handsByPlayerId[actor.playerId] || [];
  if (hand.length !== 13) return { ok: false, message: 'A declaration must contain exactly 13 cards.' };

  const verdict = validateDeclaration(hand, game.wildJoker);
  game.declarationSubmitted = true;
  game.submittedScorePlayerIds.add(actor.playerId);
  game.scoreWindowStage = 'score';

  io.to(code).emit('player_declared', {
    code,
    playerId: actor.playerId,
    valid: verdict.valid,
    reason: verdict.reason,
  });

  if (verdict.valid) {
    game.roundWinnerPlayerId = actor.playerId;
    game.pendingRoundDetails = {
      reason: 'valid_declaration',
      message: `${actor.name} made a valid declaration. Scores finalize when the 30-second timer reaches 0.`,
      declarerPlayerId: actor.playerId,
      validDeclaration: true,
      roundWinnerPlayerId: actor.playerId,
    };
  } else {
    addPoints(game, actor.playerId, 80);
    game.droppedPlayerIds.add(actor.playerId);
    game.roundWinnerPlayerId = null;
    game.pendingRoundDetails = {
      reason: 'wrong_declaration',
      message: `${actor.name} made a wrong declaration and received 80 points. Scores finalize when the timer reaches 0.`,
      declarerPlayerId: actor.playerId,
      validDeclaration: false,
      roundWinnerPlayerId: null,
    };
    io.to(code).emit('player_dropped', { code, playerId: actor.playerId, penalty: 80, reason: 'wrong_declaration' });
  }

  emitDeclarationWindowState(code);
  broadcastGameState(code);
  return {
    ok: true,
    valid: verdict.valid,
    reason: verdict.reason,
    scoreWindow: true,
    stage: 'score',
    scoreWindowEndsAt: game.scoreWindowEndsAt,
    winnerPlayerId: game.roundWinnerPlayerId || null,
  };
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


function clearSeatingChoiceTimer(room) {
  if (room?.seatingChoiceTimer) clearTimeout(room.seatingChoiceTimer);
  if (room) room.seatingChoiceTimer = null;
}

function cancelPendingSeating(code, message = 'Seating draw cancelled.') {
  const room = rooms[code];
  if (!room) return;
  clearSeatingChoiceTimer(room);
  room.pendingSeatingOrder = null;
  room.seatChoiceRequiredPlayerId = null;
  room.highCardPlayerId = null;
  room.initialDealerPlayerId = null;
  for (const p of room.players) {
    p.rankOrder = null;
    p.seatIndex = null;
    p.seatingCard = null;
    p.hasCrown = false;
  }
  emitRoomUpdate(code);
  io.to(code).emit('game_error', { message });
}

function clearStartSequenceTimers(room) {
  for (const timer of room?.startSequenceTimers || []) clearTimeout(timer);
  if (room) room.startSequenceTimers = [];
}

function storeStartSequence(room, phase, payload = {}) {
  if (!room) return;
  room.startSequence = {
    phase,
    updatedAt: Date.now(),
    ...payload,
  };
}

function emitStartSequenceEvent(code, eventName, phase, payload = {}) {
  const room = rooms[code];
  if (!room) return;
  const body = { code, ...payload };
  storeStartSequence(room, phase, body);
  io.to(code).emit(eventName, body);
}

function makeInitialGame(currentRoom, players) {
  const initialDealerIndex = players.findIndex((p) => p.playerId === currentRoom.initialDealerPlayerId);
  return {
    players,
    scoresByPlayerId: Object.fromEntries(players.map((player) => [player.playerId, 0])),
    roundPointsByPlayerId: {},
    lastRoundPointsByPlayerId: Object.fromEntries(players.map((player) => [player.playerId, 0])),
    droppedPlayerIds: new Set(),
    lastDiscardByPlayerId: {},
    roundNumber: 0,
    dealerIndex: initialDealerIndex >= 0 ? initialDealerIndex : Math.max(0, players.length - 1),
    initialDealerIndex: initialDealerIndex >= 0 ? initialDealerIndex : Math.max(0, players.length - 1),
    highCardPlayerId: currentRoom.highCardPlayerId || players.find((p) => p.hasCrown)?.playerId || null,
    seatingDraw: seatingDrawPayload(players),
    winnerPlayerId: null,
    actionSequence: 0,
    lastAction: null,
    roundHistory: [],
    roundWinnerPlayerId: null,
    declarationPlayerId: null,
    declarationSubmitted: false,
    scoreWindowStage: null,
    scoreWindowEndsAt: null,
    scoreWindowTimer: null,
    scoreWindowInterval: null,
    pendingScoreSubmissions: {},
    submittedScorePlayerIds: new Set(),
    splitConfirmedPlayerIds: new Set(),
    splitFinalized: false,
    splitResult: null,
    poolAmount: Math.max(0, Number(currentRoom.entryFee) || 0) * players.length,
  };
}

function initialDealOrder(game) {
  const active = game.players.filter((player) => !isEliminated(game, player.playerId));
  if (!active.length) return [];
  const dealerPlayerId = game.players[game.dealerIndex]?.playerId;
  const dealerActiveIndex = active.findIndex((player) => player.playerId === dealerPlayerId);
  const start = dealerActiveIndex >= 0 ? dealerActiveIndex : active.length - 1;
  const ordered = [];
  for (let offset = 1; offset <= active.length; offset += 1) {
    ordered.push(active[(start + offset) % active.length]);
  }
  return ordered;
}

function buildInitialDealPayload(code, game, playerId, common = {}) {
  const order = initialDealOrder(game);
  return {
    code,
    phase: 'initial_deal',
    players: publicPlayers(game.players),
    seatingDraw: game.seatingDraw || [],
    highCardPlayerId: game.highCardPlayerId || null,
    dealerPlayerId: game.players[game.dealerIndex]?.playerId || null,
    dealOrderPlayerIds: order.map((player) => player.playerId),
    cardsPerPlayer: 13,
    cardFlightMs: INITIAL_DEAL_FLIGHT_MS,
    cardGapMs: INITIAL_DEAL_GAP_MS,
    hand: [...(game.handsByPlayerId[playerId] || [])],
    ...common,
  };
}

function sendInitialDealToPlayer(code, game, player, common = {}) {
  if (!player?.id || player.connected === false) return;
  io.to(player.id).emit('initialDealStarted', buildInitialDealPayload(code, game, player.playerId, common));
}

function restoreStartOrGameState(code, room, player, socket) {
  if (room?.startSequence && room.startSequence.phase !== 'complete') {
    socket.emit('startSequenceState', { ...room.startSequence, code });
  }

  const game = games[code];
  const gamePlayer = findGamePlayer(game, player?.playerId, socket.id);
  if (!gamePlayer) return { inGame: false, state: null };

  gamePlayer.id = socket.id;
  gamePlayer.connected = true;
  if (game?.state === 'initial_deal') {
    const startedAt = game.initialDealStartedAt || Date.now();
    const endsAt = game.initialDealEndsAt || Date.now();
    sendInitialDealToPlayer(code, game, gamePlayer, {
      startedAt,
      endsAt,
      dealDurationMs: Math.max(0, endsAt - startedAt),
      resume: true,
    });
  } else {
    sendGameStateToPlayer(code, gamePlayer);
    sendLatestRoundResult(code, gamePlayer);
  }
  return { inGame: true, state: game?.state || null };
}

function scheduleGameStart(code) {
  const room = rooms[code];
  if (!room || games[code] || room.gameStartScheduled) return false;
  const connectedPlayers = room.players.filter((p) => p.connected !== false);
  const requiredPlayers = normaliseMinPlayers(room.minPlayers, room.tableSize);
  if (connectedPlayers.length < requiredPlayers) {
    cancelPendingSeating(code, `Need at least ${requiredPlayers} connected real players to start.`);
    return false;
  }

  const rankedPlayers = (room.pendingSeatingOrder || [])
    .filter((ranked) => connectedPlayers.some((player) => player.playerId === ranked.playerId))
    .sort((a, b) => (a.rankOrder ?? 99) - (b.rankOrder ?? 99));
  if (rankedPlayers.length !== connectedPlayers.length) return false;

  clearSeatingChoiceTimer(room);
  clearStartSequenceTimers(room);
  room.gameStartScheduled = true;
  room.startSequenceTimers = [];

  const participantIds = rankedPlayers.map((player) => player.playerId);
  const preSeatPlayers = connectedPlayers.map((player) => ({
    ...player,
    seatIndex: null,
    rankOrder: null,
    seatingCard: null,
    hasCrown: false,
  }));
  const fullSeatingDraw = seatingDrawPayload(rankedPlayers).map((pick) => ({ ...pick, seatIndex: null }));
  const backOnlyDraw = fullSeatingDraw.map((pick) => ({
    playerId: pick.playerId,
    name: pick.name,
    rankOrder: null,
    seatIndex: null,
    card: null,
    hasCrown: false,
  }));

  const countdownStartedAt = Date.now();
  const countdownEndsAt = countdownStartedAt + START_COUNTDOWN_SECONDS * 1000;
  const countdownPayload = {
    players: publicPlayers(preSeatPlayers),
    countdown: START_COUNTDOWN_SECONDS,
    countdownStartedAt,
    countdownEndsAt,
  };
  storeStartSequence(room, 'countdown', { code, ...countdownPayload });
  io.to(code).emit('gameStarting', { code, ...countdownPayload });
  // Legacy event retained so older APKs still show their existing countdown.
  io.to(code).emit('game_starting', { code, ...countdownPayload });

  const addTimer = (delayMs, fn) => {
    const timer = setTimeout(() => {
      const currentRoom = rooms[code];
      if (!currentRoom || !currentRoom.gameStartScheduled) return;
      fn(currentRoom);
    }, delayMs);
    room.startSequenceTimers.push(timer);
  };

  const playerCount = rankedPlayers.length;
  const tossFlightWindow = Math.max(START_TOSS_FLIGHT_MS, (playerCount - 1) * START_TOSS_GAP_MS + START_TOSS_FLIGHT_MS);
  const tossAt = START_COUNTDOWN_SECONDS * 1000;
  const revealAt = tossAt + tossFlightWindow + 260;
  const highestAt = revealAt + START_FLIP_MS + 220;
  const seatAt = highestAt + START_HIGHEST_HOLD_MS + START_CROWN_MS;
  const dealerAt = seatAt + 430;
  const clearAt = dealerAt + START_DEALER_MS + 720;
  const dealAt = clearAt + START_CLEAR_MS + 120;

  addTimer(tossAt, () => {
    emitStartSequenceEvent(code, 'tossCardsGenerated', 'toss_flying', {
      players: publicPlayers(preSeatPlayers),
      seatingDraw: backOnlyDraw,
      cardFlightMs: START_TOSS_FLIGHT_MS,
      cardGapMs: START_TOSS_GAP_MS,
      startedAt: Date.now(),
    });
  });

  addTimer(revealAt, () => {
    emitStartSequenceEvent(code, 'tossCardsRevealed', 'revealed', {
      players: publicPlayers(preSeatPlayers),
      seatingDraw: fullSeatingDraw,
      flipMs: START_FLIP_MS,
      startedAt: Date.now(),
    });
  });

  addTimer(highestAt, () => {
    const high = fullSeatingDraw.find((pick) => pick.playerId === room.highCardPlayerId) || fullSeatingDraw[0] || null;
    emitStartSequenceEvent(code, 'highestCardPlayer', 'highest', {
      players: publicPlayers(preSeatPlayers),
      seatingDraw: fullSeatingDraw,
      highCardPlayerId: room.highCardPlayerId,
      playerId: room.highCardPlayerId,
      card: high?.card || null,
      highlightMs: START_HIGHEST_HOLD_MS,
      crownTravelMs: START_CROWN_MS,
      startedAt: Date.now(),
    });
  });

  addTimer(seatAt, (currentRoom) => {
    finalizeAutomaticSeating(currentRoom);
    const seatedDraw = seatingDrawPayload(currentRoom.players);
    emitStartSequenceEvent(code, 'seatOrder', 'seat_order', {
      players: publicPlayers(currentRoom.players),
      seatingDraw: seatedDraw,
      highCardPlayerId: currentRoom.highCardPlayerId,
      seatOrderPlayerIds: currentRoom.players.map((player) => player.playerId),
      startedAt: Date.now(),
    });
    emitRoomUpdate(code);
  });

  addTimer(dealerAt, (currentRoom) => {
    const seatedDraw = seatingDrawPayload(currentRoom.players);
    const low = seatedDraw.find((pick) => pick.playerId === currentRoom.initialDealerPlayerId) || seatedDraw[seatedDraw.length - 1] || null;
    emitStartSequenceEvent(code, 'dealerPlayerId', 'dealer', {
      players: publicPlayers(currentRoom.players),
      seatingDraw: seatedDraw,
      highCardPlayerId: currentRoom.highCardPlayerId,
      dealerPlayerId: currentRoom.initialDealerPlayerId,
      playerId: currentRoom.initialDealerPlayerId,
      card: low?.card || null,
      dealerTravelMs: START_DEALER_MS,
      startedAt: Date.now(),
    });
  });

  addTimer(clearAt, (currentRoom) => {
    emitStartSequenceEvent(code, 'selectionCardsCleared', 'cleanup', {
      players: publicPlayers(currentRoom.players),
      seatingDraw: seatingDrawPayload(currentRoom.players),
      highCardPlayerId: currentRoom.highCardPlayerId,
      dealerPlayerId: currentRoom.initialDealerPlayerId,
      clearMs: START_CLEAR_MS,
      startedAt: Date.now(),
    });
  });

  addTimer(dealAt, (currentRoom) => {
    if (games[code]) return;
    const liveById = new Map(currentRoom.players.map((player) => [player.playerId, player]));
    const missingParticipant = participantIds.some((playerId) => liveById.get(playerId)?.connected === false || !liveById.has(playerId));
    if (missingParticipant) {
      currentRoom.gameStartScheduled = false;
      cancelPendingSeating(code, 'A player disconnected before the initial deal. Reconnect and start again.');
      return;
    }

    const players = currentRoom.players
      .filter((p) => participantIds.includes(p.playerId) && p.connected !== false)
      .sort((a, b) => (a.seatIndex ?? 99) - (b.seatIndex ?? 99))
      .map((p) => ({ ...p }));
    if (players.length < requiredPlayers) {
      currentRoom.gameStartScheduled = false;
      cancelPendingSeating(code, 'Too many players disconnected before the game started.');
      return;
    }

    const game = makeInitialGame(currentRoom, players);
    games[code] = game;
    dealRound(game);
    // dealRound creates the real hands/decks, but gameplay remains locked until
    // every visual card-flight has completed on all clients.
    game.state = 'initial_deal';
    const order = initialDealOrder(game);
    const totalCards = order.length * 13;
    const startedAt = Date.now();
    const dealDurationMs = Math.max(
      INITIAL_DEAL_FLIGHT_MS,
      Math.max(0, totalCards - 1) * INITIAL_DEAL_GAP_MS + INITIAL_DEAL_FLIGHT_MS + 300,
    );
    const endsAt = startedAt + dealDurationMs;
    game.initialDealStartedAt = startedAt;
    game.initialDealEndsAt = endsAt;
    const common = { startedAt, endsAt, dealDurationMs };
    const finalSeatingDraw = seatingDrawPayload(game.players);

    storeStartSequence(currentRoom, 'initial_deal', {
      code,
      players: publicPlayers(game.players),
      seatingDraw: finalSeatingDraw,
      highCardPlayerId: game.highCardPlayerId || null,
      dealerPlayerId: game.players[game.dealerIndex]?.playerId || null,
      dealOrderPlayerIds: order.map((player) => player.playerId),
      cardFlightMs: INITIAL_DEAL_FLIGHT_MS,
      cardGapMs: INITIAL_DEAL_GAP_MS,
      startedAt,
      endsAt,
    });
    for (const player of game.players) sendInitialDealToPlayer(code, game, player, common);

    const finishTimer = setTimeout(() => {
      const finalRoom = rooms[code];
      const finalGame = games[code];
      if (!finalRoom || !finalGame || finalGame.state !== 'initial_deal') return;
      finalGame.state = 'playing';
      finalRoom.gameStartScheduled = false;
      storeStartSequence(finalRoom, 'complete', {
        code,
        completedAt: Date.now(),
        highCardPlayerId: finalGame.highCardPlayerId || null,
        dealerPlayerId: finalGame.players[finalGame.dealerIndex]?.playerId || null,
        players: publicPlayers(finalGame.players),
        seatingDraw: finalGame.seatingDraw || [],
      });
      io.to(code).emit('initialDealCompleted', {
        code,
        completedAt: Date.now(),
        dealerPlayerId: finalGame.players[finalGame.dealerIndex]?.playerId || null,
      });
      io.to(code).emit('turnStarted', {
        code,
        playerId: finalGame.players[finalGame.turnIndex]?.playerId || null,
        turnIndex: finalGame.turnIndex,
        startedAt: Date.now(),
      });
      broadcastGameState(code);
    }, dealDurationMs);
    currentRoom.startSequenceTimers.push(finishTimer);
  });

  return true;
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
    const minPlayers = normaliseMinPlayers(payload.minPlayers, tableSize);

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
      if (!games[code] && !existing.gameStartScheduled) { existing.tableSize = tableSize; existing.minPlayers = minPlayers; }
      socket.emit('room_registered', { code, resumed: true });
      emitRoomUpdate(code);
      restoreStartOrGameState(code, existing, hostPlayer, socket);
      const response = { ok: true, code, resumed: true, hostPlayerId: existing.hostPlayerId || null, entryFee: existing.entryFee || 0, tableSize: existing.tableSize, minPlayers: normaliseMinPlayers(existing.minPlayers, existing.tableSize), players: publicPlayers(existing.players) };
      ack?.(response);
      return;
    }

    rooms[code] = {
      host: socket.id,
      hostPlayerId: playerId,
      entryFee,
      tableSize,
      minPlayers,
      players: [{ id: socket.id, playerId, name: playerName, connected: true }],
    };
    socket.join(code);
    socket.emit('room_registered', { code, resumed: false });
    emitRoomUpdate(code);
    ack?.({ ok: true, code, resumed: false, hostPlayerId: rooms[code].hostPlayerId || null, entryFee: rooms[code].entryFee || 0, tableSize, minPlayers, players: publicPlayers(rooms[code].players) });
  });

  socket.on('validate_room', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const room = rooms[code];
    const roomTableSize = normaliseTableSize(room?.tableSize);
    const valid = !!room && !games[code] && !room.gameStartScheduled && room.players.length < roomTableSize;
    const response = { code, valid, entryFee: room?.entryFee || 0, tableSize: roomTableSize, minPlayers: normaliseMinPlayers(room?.minPlayers, roomTableSize), playerCount: room?.players?.length || 0 };
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
    if (room.gameStartScheduled && !player) {
      const response = { ok: false, message: 'This game is starting. New seats are locked until the session is restarted.' };
      socket.emit('room_error', response);
      ack?.(response);
      return;
    }
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

    restoreStartOrGameState(code, room, player, socket);

    ack?.({ ok: true, code, hostPlayerId: room.hostPlayerId || null, entryFee: room.entryFee || 0, tableSize: normaliseTableSize(room.tableSize), minPlayers: normaliseMinPlayers(room.minPlayers, room.tableSize), players: publicPlayers(room.players), resumed: !!games[code] });
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

    const restored = restoreStartOrGameState(code, room, player, socket);

    socket.emit('room_rejoined', { code });
    ack?.({ ok: true, code, inGame: restored.inGame, startPhase: room.startSequence?.phase || null });
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

    if (game.state === 'initial_deal') {
      socket.emit('startSequenceState', { ...(rooms[code]?.startSequence || {}), code });
      sendInitialDealToPlayer(code, game, player, {
        startedAt: game.initialDealStartedAt || Date.now(),
        endsAt: game.initialDealEndsAt || Date.now(),
        dealDurationMs: Math.max(0, (game.initialDealEndsAt || Date.now()) - (game.initialDealStartedAt || Date.now())),
        resume: true,
      });
    } else {
      sendGameStateToPlayer(code, player);
      sendLatestRoundResult(code, player);
    }
    ack?.({ ok: true, state: game.state });
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
    const maxSeats = normaliseTableSize(room.tableSize);
    const requiredPlayers = normaliseMinPlayers(room.minPlayers, maxSeats);
    if (connectedPlayers.length < requiredPlayers) {
      const response = { ok: false, message: `Need at least ${requiredPlayers} connected real players to start. (${connectedPlayers.length}/${maxSeats} seated)` };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    if (games[code]) {
      ack?.({ ok: true, code, alreadyStarted: true });
      broadcastGameState(code);
      return;
    }

    if (room.gameStartScheduled) {
      ack?.({ ok: true, code, alreadyStarting: true, countdown: START_COUNTDOWN_SECONDS });
      return;
    }

    // Create the complete server-authoritative selection result once. Nothing
    // is broadcast yet: clients first see the locked 3 → 2 → 1 countdown.
    // Multiplayer rooms contain real players only; bots are never injected into multiplayer.
    const rankedPlayers = createSeatingDraw(connectedPlayers);
    room.pendingSeatingOrder = rankedPlayers;
    room.highCardPlayerId = rankedPlayers[0]?.playerId || null;
    room.initialDealerPlayerId = rankedPlayers[rankedPlayers.length - 1]?.playerId || null;
    room.seatChoiceRequiredPlayerId = null;
    clearSeatingChoiceTimer(room);

    const scheduled = scheduleGameStart(code);
    if (!scheduled) {
      const response = { ok: false, message: 'Could not schedule the synchronized game start.' };
      socket.emit('game_error', response);
      ack?.(response);
      return;
    }

    ack?.({ ok: true, code, countdown: START_COUNTDOWN_SECONDS });
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

  const handleBeginDeclaration = (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const cardId = String(payload.cardId || '').trim();
    const game = games[code];
    const actor = findGamePlayer(game, playerId, socket.id);
    const response = beginDeclarationWindow(code, actor, cardId);
    if (!response.ok) socket.emit('game_error', response);
    ack?.(response);
  };

  // New clients use begin_declare. Keep declare as a compatibility alias so an
  // older APK still gets the safe 30-second review window instead of instant validation.
  socket.on('begin_declare', handleBeginDeclaration);
  socket.on('declare', handleBeginDeclaration);

  socket.on('confirm_declaration', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const game = games[code];
    const actor = findGamePlayer(game, playerId, socket.id);
    const response = submitDeclarationShow(code, actor);
    if (!response.ok) socket.emit('game_error', response);
    ack?.(response);
  });

  socket.on('submit_round_score', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const playerId = String(payload.playerId || '').trim();
    const game = games[code];
    if (!game || game.state !== 'score_window' || game.scoreWindowStage !== 'score') {
      ack?.({ ok: false, message: game?.scoreWindowStage === 'declare' ? 'Wait for the finishing player to press DECLARE SHOW.' : 'The score window is not open.' });
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
    // A double tap or a slow acknowledgement can arrive after the server has
    // already dealt the next round. Treat that as success and re-send the
    // authoritative state instead of leaving the client stuck on the result UI.
    if (game.state === 'playing') {
      const actor = findGamePlayer(game, playerId, socket.id);
      if (actor) sendGameStateToPlayer(code, actor);
      ack?.({ ok: true, alreadyStarted: true, code, roundNumber: game.roundNumber });
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
