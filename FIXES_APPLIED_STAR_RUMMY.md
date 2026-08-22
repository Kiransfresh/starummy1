# Star Rummy multiplayer + table fixes

Fixed private room creation/join flow, reconnect-safe multiplayer identity, mobile Socket.IO fallback, card touch/drag behavior, responsive card overlap, table transparency, action-bar alignment, and two-deck multiplayer dealing.

IMPORTANT: Deploy the included updated server.js to the configured Railway backend to get the reconnect-safe hand identity, room fee, collision protection, two-deck deal, and authoritative multiplayer fixes. The client also keeps compatibility fallbacks for older room event responses.

Validation: local Socket.IO tests passed for 2-player create/join/draw/discard, reconnect with the exact same hand and turn, and a 6-player 13-card deal with remaining deck/discard/wild joker.
