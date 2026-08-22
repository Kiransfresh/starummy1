import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

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

function publicPlayers(players) {
  return players.map((p) => ({
    id: p.id,
    playerId: p.playerId,
    name: p.name,
    connected: p.connected !== false,
  }));
}

function emitRoomUpdate(code) {
  const room = rooms[code];
  if (!room) return;
  io.to(code).emit('room_update', { code, players: publicPlayers(room.players) });
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
    handSize: (game.handsByPlayerId[p.playerId] || []).length,
  }));

  const current = game.players[game.turnIndex] || null;

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
  };
}

function sendGameStateToPlayer(code, player) {
  const game = games[code];
  if (!game || !player?.connected || !player.id) return;
  io.to(player.id).emit('game_state', { code, ...buildSnapshot(game, player.playerId) });
}

function broadcastGameState(code) {
  const game = games[code];
  if (!game) return;
  for (const player of game.players) sendGameStateToPlayer(code, player);
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
    const removedGameIndex = game.players.findIndex((p) => p.playerId === playerId);
    if (removedGameIndex >= 0) {
      game.players.splice(removedGameIndex, 1);
      delete game.handsByPlayerId[playerId];

      if (game.players.length === 0) {
        delete games[code];
      } else {
        if (removedGameIndex < game.turnIndex) game.turnIndex -= 1;
        if (game.turnIndex >= game.players.length) game.turnIndex = 0;
        broadcastGameState(code);
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
      socket.emit('room_registered', { code, resumed: true });
      emitRoomUpdate(code);
      const response = { ok: true, code, resumed: true, entryFee: existing.entryFee || 0, players: publicPlayers(existing.players) };
      ack?.(response);
      return;
    }

    rooms[code] = {
      host: socket.id,
      hostPlayerId: playerId,
      entryFee,
      players: [{ id: socket.id, playerId, name: playerName, connected: true }],
    };
    socket.join(code);
    socket.emit('room_registered', { code, resumed: false });
    emitRoomUpdate(code);
    ack?.({ ok: true, code, resumed: false, entryFee: rooms[code].entryFee || 0, players: publicPlayers(rooms[code].players) });
  });

  socket.on('validate_room', (payload = {}, ack) => {
    const code = normaliseCode(payload.code);
    const room = rooms[code];
    const valid = !!room && !games[code] && room.players.length < MAX_PLAYERS;
    const response = { code, valid, entryFee: room?.entryFee || 0, playerCount: room?.players?.length || 0 };
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
    if (!player && room.players.length >= MAX_PLAYERS) {
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

    if (games[code]) sendGameStateToPlayer(code, findGamePlayer(games[code], playerId, socket.id));

    ack?.({ ok: true, code, entryFee: room.entryFee || 0, players: publicPlayers(room.players), resumed: !!games[code] });
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
    if (gamePlayer) sendGameStateToPlayer(code, gamePlayer);

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
    if (connectedPlayers.length < 2) {
      const response = { ok: false, message: 'At least 2 connected players are required.' };
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
        .map((p) => ({ ...p }));
      if (players.length < 2) {
        io.to(code).emit('game_error', { message: 'A player disconnected before the game started.' });
        return;
      }

      const deck = shuffle(buildTwoDecks());
      const handsByPlayerId = {};
      let cursor = 0;
      for (const player of players) {
        handsByPlayerId[player.playerId] = deck.slice(cursor, cursor + 13);
        cursor += 13;
      }

      const remaining = deck.slice(cursor);
      const firstDiscard = remaining.shift();
      const wildJoker = remaining.shift() || firstDiscard || null;

      games[code] = {
        players,
        deck: remaining,
        handsByPlayerId,
        discardPile: firstDiscard ? [firstDiscard] : [],
        wildJoker,
        turnIndex: 0,
        state: 'playing',
      };

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

    const actor = findGamePlayer(game, playerId, socket.id);
    const currentPlayer = game.players[game.turnIndex];
    if (!actor || !currentPlayer || actor.playerId !== currentPlayer.playerId) {
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
    game.handsByPlayerId[actor.playerId] = hand;
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

    const actor = findGamePlayer(game, playerId, socket.id);
    const currentPlayer = game.players[game.turnIndex];
    if (!actor || !currentPlayer || actor.playerId !== currentPlayer.playerId) {
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
    game.turnIndex = (game.turnIndex + 1) % game.players.length;
    broadcastGameState(code);
    ack?.({ ok: true, nextTurnPlayerId: game.players[game.turnIndex]?.playerId || null });
  });

  socket.on('disconnect', () => {
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) continue;

      player.connected = false;
      const gamePlayer = games[code]?.players.find((p) => p.playerId === player.playerId);
      if (gamePlayer) gamePlayer.connected = false;
      emitRoomUpdate(code);

      clearDisconnectTimer(code, player.playerId);
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
