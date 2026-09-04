/**
 * Chess engine core — 0x88 board, full legality (castling, en passant,
 * promotion, pins), check/checkmate/stalemate, the draw rules a casual
 * game actually hits (fifty moves, threefold repetition, insufficient
 * material) and SAN for the move log.
 *
 * The 0x88 trick: squares are rank*16+file, so `sq & 0x88` is non-zero
 * exactly when a square is off the board — offset walks need no bounds
 * math. Rank 0 is White's back rank (a1 = 0, h8 = 119).
 *
 * `npm run validate` proves this file with perft counts on the classic
 * torture positions (castling, en-passant pins, underpromotion) — never
 * "fix" a failing perft by loosening the expectation.
 */

export type Color = 'w' | 'b';

/** unsigned piece kinds; board cells hold them signed (+white / −black) */
export const P = 1;
export const N = 2;
export const B = 3;
export const R = 4;
export const Q = 5;
export const K = 6;

export interface Position {
  /** 0x88 board of signed piece codes, 0 = empty */
  board: Int8Array;
  turn: Color;
  /** castling rights bitmask: 1 = wK, 2 = wQ, 4 = bK, 8 = bQ */
  castling: number;
  /** en-passant target square (0x88) or -1 */
  ep: number;
  /** halfmove clock for the fifty-move rule */
  halfmove: number;
  fullmove: number;
}

/* move flag bits */
export const F_CAPTURE = 1;
export const F_DOUBLE = 2;
export const F_EP = 4;
export const F_CASTLE_K = 8;
export const F_CASTLE_Q = 16;
export const F_PROMO = 32;

export interface Move {
  from: number;
  to: number;
  /** signed code of the moving piece */
  piece: number;
  /** signed code of the captured piece (the pawn itself for en passant), 0 = none */
  captured: number;
  /** unsigned promotion kind (N/B/R/Q) or 0 */
  promo: number;
  flags: number;
}

const N_OFFS = [31, 33, 14, 18, -31, -33, -14, -18];
const B_OFFS = [15, 17, -15, -17];
const R_OFFS = [1, -1, 16, -16];
const K_OFFS = [1, -1, 16, -16, 15, 17, -15, -17];

export const file = (sq: number) => sq & 15;
export const rank = (sq: number) => sq >> 4;
export const sqName = (sq: number) => 'abcdefgh'[file(sq)] + String(rank(sq) + 1);
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function initialPosition(): Position {
  const board = new Int8Array(128);
  const back = [R, N, B, Q, K, B, N, R];
  for (let f = 0; f < 8; f++) {
    board[f] = back[f];
    board[16 + f] = P;
    board[96 + f] = -P;
    board[112 + f] = -back[f];
  }
  return { board, turn: 'w', castling: 15, ep: -1, halfmove: 0, fullmove: 1 };
}

/** FEN reader — used by the validate perft suite; the game itself always
    starts from initialPosition(). */
export function fromFen(fen: string): Position {
  const [placement, turn, castle, ep, half, full] = fen.trim().split(/\s+/);
  const board = new Int8Array(128);
  const codes: Record<string, number> = { p: P, n: N, b: B, r: R, q: Q, k: K };
  let r = 7;
  let f = 0;
  for (const ch of placement) {
    if (ch === '/') {
      r--;
      f = 0;
    } else if (/\d/.test(ch)) {
      f += Number(ch);
    } else {
      const code = codes[ch.toLowerCase()];
      board[r * 16 + f] = ch === ch.toLowerCase() ? -code : code;
      f++;
    }
  }
  let castling = 0;
  if (castle?.includes('K')) castling |= 1;
  if (castle?.includes('Q')) castling |= 2;
  if (castle?.includes('k')) castling |= 4;
  if (castle?.includes('q')) castling |= 8;
  const epSq =
    ep && ep !== '-' ? (ep.charCodeAt(1) - 49) * 16 + (ep.charCodeAt(0) - 97) : -1;
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling,
    ep: epSq,
    halfmove: Number(half ?? 0) || 0,
    fullmove: Number(full ?? 1) || 1
  };
}

export function clonePosition(pos: Position): Position {
  return { ...pos, board: new Int8Array(pos.board) };
}

/**
 * FEN writer — the inverse of `fromFen`, and the form a UCI engine takes a
 * position in (`position fen …`). The en-passant field is written whenever
 * a double push just happened, which is what the rules above track; an
 * engine ignores it when no capture is actually possible.
 */
export function toFen(pos: Position): string {
  const glyph: Record<number, string> = { [P]: 'p', [N]: 'n', [B]: 'b', [R]: 'r', [Q]: 'q', [K]: 'k' };
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = pos.board[r * 16 + f];
      if (p === 0) {
        empty++;
        continue;
      }
      if (empty > 0) {
        row += empty;
        empty = 0;
      }
      const g = glyph[Math.abs(p)];
      row += p > 0 ? g.toUpperCase() : g;
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  const rights =
    (pos.castling & 1 ? 'K' : '') +
    (pos.castling & 2 ? 'Q' : '') +
    (pos.castling & 4 ? 'k' : '') +
    (pos.castling & 8 ? 'q' : '');
  return `${rows.join('/')} ${pos.turn} ${rights || '-'} ${pos.ep >= 0 ? sqName(pos.ep) : '-'} ${pos.halfmove} ${pos.fullmove}`;
}

const PROMO_LETTER: Record<number, string> = { [N]: 'n', [B]: 'b', [R]: 'r', [Q]: 'q' };

/** long algebraic ("e2e4", "e7e8q") — the move form every UCI engine speaks */
export function uciOf(move: Move): string {
  return sqName(move.from) + sqName(move.to) + (move.promo ? PROMO_LETTER[move.promo] : '');
}

/**
 * The engine's answer, resolved against OUR legal moves — so an engine move
 * is only ever applied through the same rules the player is held to, and a
 * malformed or illegal one is `null` rather than a corrupted board.
 */
export function moveFromUci(pos: Position, uci: string): Move | null {
  return legalMoves(pos).find((m) => uciOf(m) === uci) ?? null;
}

/** is `sq` attacked by side `by`? */
export function isAttacked(board: Int8Array, sq: number, by: Color): boolean {
  const sign = by === 'w' ? 1 : -1;
  // pawns attack "forward" from their own side: a white pawn on sq-17/sq-15 hits sq
  const pawnDir = by === 'w' ? -16 : 16;
  for (const side of [pawnDir - 1, pawnDir + 1]) {
    const from = sq + side;
    if (!(from & 0x88) && board[from] === sign * P) return true;
  }
  for (const o of N_OFFS) {
    const from = sq + o;
    if (!(from & 0x88) && board[from] === sign * N) return true;
  }
  for (const o of K_OFFS) {
    const from = sq + o;
    if (!(from & 0x88) && board[from] === sign * K) return true;
  }
  for (const o of B_OFFS) {
    let from = sq + o;
    while (!(from & 0x88)) {
      const p = board[from];
      if (p !== 0) {
        if (p === sign * B || p === sign * Q) return true;
        break;
      }
      from += o;
    }
  }
  for (const o of R_OFFS) {
    let from = sq + o;
    while (!(from & 0x88)) {
      const p = board[from];
      if (p !== 0) {
        if (p === sign * R || p === sign * Q) return true;
        break;
      }
      from += o;
    }
  }
  return false;
}

export function kingSquare(board: Int8Array, color: Color): number {
  const target = color === 'w' ? K : -K;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    if (board[sq] === target) return sq;
  }
  return -1;
}

export function inCheck(pos: Position, color: Color = pos.turn): boolean {
  return isAttacked(pos.board, kingSquare(pos.board, color), other(color));
}

/* ---------- move generation ---------- */

function pushPromos(moves: Move[], from: number, to: number, piece: number, captured: number) {
  const flags = F_PROMO | (captured ? F_CAPTURE : 0);
  for (const promo of [Q, N, R, B]) moves.push({ from, to, piece, captured, promo, flags });
}

/** pseudo-legal moves (may leave the king in check; `legalMoves` filters) */
export function pseudoMoves(pos: Position): Move[] {
  const { board, turn, castling, ep } = pos;
  const sign = turn === 'w' ? 1 : -1;
  const moves: Move[] = [];
  for (let from = 0; from < 128; from++) {
    if (from & 0x88) continue;
    const piece = board[from];
    if (piece === 0 || Math.sign(piece) !== sign) continue;
    const kind = Math.abs(piece);

    if (kind === P) {
      const fwd = from + 16 * sign;
      const promoRank = turn === 'w' ? 7 : 0;
      if (!(fwd & 0x88) && board[fwd] === 0) {
        if (rank(fwd) === promoRank) pushPromos(moves, from, fwd, piece, 0);
        else {
          moves.push({ from, to: fwd, piece, captured: 0, promo: 0, flags: 0 });
          const startRank = turn === 'w' ? 1 : 6;
          const dbl = from + 32 * sign;
          if (rank(from) === startRank && board[dbl] === 0)
            moves.push({ from, to: dbl, piece, captured: 0, promo: 0, flags: F_DOUBLE });
        }
      }
      for (const side of [15 * sign, 17 * sign]) {
        const to = from + side;
        if (to & 0x88) continue;
        const target = board[to];
        if (target !== 0 && Math.sign(target) === -sign) {
          if (rank(to) === promoRank) pushPromos(moves, from, to, piece, target);
          else moves.push({ from, to, piece, captured: target, promo: 0, flags: F_CAPTURE });
        } else if (to === ep) {
          moves.push({ from, to, piece, captured: -sign * P, promo: 0, flags: F_EP | F_CAPTURE });
        }
      }
      continue;
    }

    const offs = kind === N ? N_OFFS : kind === B ? B_OFFS : kind === R ? R_OFFS : K_OFFS;
    const sliding = kind === B || kind === R || kind === Q;
    for (const o of offs) {
      let to = from + o;
      while (!(to & 0x88)) {
        const target = board[to];
        if (target === 0) {
          moves.push({ from, to, piece, captured: 0, promo: 0, flags: 0 });
        } else {
          if (Math.sign(target) === -sign)
            moves.push({ from, to, piece, captured: target, promo: 0, flags: F_CAPTURE });
          break;
        }
        if (!sliding) break;
        to += o;
      }
    }
  }

  // castling: rights intact, path empty, king's three squares unattacked
  const home = turn === 'w' ? 0 : 112;
  const kSq = home + 4;
  const enemy = other(turn);
  if (board[kSq] === sign * K && !isAttacked(board, kSq, enemy)) {
    if (
      castling & (turn === 'w' ? 1 : 4) &&
      board[home + 5] === 0 &&
      board[home + 6] === 0 &&
      board[home + 7] === sign * R &&
      !isAttacked(board, home + 5, enemy) &&
      !isAttacked(board, home + 6, enemy)
    )
      moves.push({ from: kSq, to: home + 6, piece: sign * K, captured: 0, promo: 0, flags: F_CASTLE_K });
    if (
      castling & (turn === 'w' ? 2 : 8) &&
      board[home + 3] === 0 &&
      board[home + 2] === 0 &&
      board[home + 1] === 0 &&
      board[home] === sign * R &&
      !isAttacked(board, home + 3, enemy) &&
      !isAttacked(board, home + 2, enemy)
    )
      moves.push({ from: kSq, to: home + 2, piece: sign * K, captured: 0, promo: 0, flags: F_CASTLE_Q });
  }
  return moves;
}

interface Undo {
  captured: number;
  castling: number;
  ep: number;
  halfmove: number;
}

/** mutate `pos` by `move`; returns what `unmake` needs */
export function make(pos: Position, move: Move): Undo {
  const { board } = pos;
  const undo: Undo = { captured: move.captured, castling: pos.castling, ep: pos.ep, halfmove: pos.halfmove };
  const sign = pos.turn === 'w' ? 1 : -1;

  board[move.from] = 0;
  board[move.to] = move.promo ? sign * move.promo : move.piece;
  if (move.flags & F_EP) board[move.to - 16 * sign] = 0;
  if (move.flags & F_CASTLE_K) {
    board[move.to + 1] = 0;
    board[move.to - 1] = sign * R;
  } else if (move.flags & F_CASTLE_Q) {
    board[move.to - 2] = 0;
    board[move.to + 1] = sign * R;
  }

  // castling rights die when the king or a rook moves — or a rook is taken
  const CR: Record<number, number> = { 4: 3, 0: 2, 7: 1, 116: 12, 112: 8, 119: 4 };
  if (CR[move.from] !== undefined) pos.castling &= ~CR[move.from];
  if (CR[move.to] !== undefined) pos.castling &= ~CR[move.to];

  pos.ep = move.flags & F_DOUBLE ? move.from + 16 * sign : -1;
  pos.halfmove = Math.abs(move.piece) === P || move.captured ? 0 : pos.halfmove + 1;
  if (pos.turn === 'b') pos.fullmove++;
  pos.turn = other(pos.turn);
  return undo;
}

export function unmake(pos: Position, move: Move, undo: Undo): void {
  const { board } = pos;
  pos.turn = other(pos.turn);
  if (pos.turn === 'b') pos.fullmove--;
  pos.castling = undo.castling;
  pos.ep = undo.ep;
  pos.halfmove = undo.halfmove;
  const sign = pos.turn === 'w' ? 1 : -1;

  board[move.from] = move.piece;
  board[move.to] = 0;
  if (move.flags & F_EP) board[move.to - 16 * sign] = undo.captured;
  else if (undo.captured) board[move.to] = undo.captured;
  if (move.flags & F_CASTLE_K) {
    board[move.to + 1] = sign * R;
    board[move.to - 1] = 0;
  } else if (move.flags & F_CASTLE_Q) {
    board[move.to - 2] = sign * R;
    board[move.to + 1] = 0;
  }
}

export function legalMoves(pos: Position): Move[] {
  const mine = pos.turn;
  const out: Move[] = [];
  for (const move of pseudoMoves(pos)) {
    const undo = make(pos, move);
    if (!inCheck(pos, mine)) out.push(move);
    unmake(pos, move, undo);
  }
  return out;
}

/** immutable convenience for the UI layer */
export function applyMove(pos: Position, move: Move): Position {
  const next = clonePosition(pos);
  make(next, move);
  return next;
}

/* ---------- game status ---------- */

export type Status =
  | 'playing'
  | 'checkmate'
  | 'stalemate'
  | 'fifty-moves'
  | 'insufficient'
  | 'repetition';

/** compact key for threefold repetition (board + turn + rights + ep) */
export function posKey(pos: Position): string {
  let s = pos.turn + pos.castling + ',' + pos.ep + ',';
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    s += String.fromCharCode(64 + pos.board[sq] + 7);
  }
  return s;
}

function insufficientMaterial(board: Int8Array): boolean {
  // K vs K, K+B vs K, K+N vs K — nothing else counts as dead here
  let minors = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const kind = Math.abs(board[sq]);
    if (kind === 0 || kind === K) continue;
    if (kind === B || kind === N) {
      if (++minors > 1) return false;
    } else return false;
  }
  return true;
}

/** `keyCounts` maps posKey → times seen (the game layer maintains it) */
export function statusOf(pos: Position, keyCounts?: Map<string, number>): Status {
  if (legalMoves(pos).length === 0) return inCheck(pos) ? 'checkmate' : 'stalemate';
  if (pos.halfmove >= 100) return 'fifty-moves';
  if (insufficientMaterial(pos.board)) return 'insufficient';
  if (keyCounts && (keyCounts.get(posKey(pos)) ?? 0) >= 3) return 'repetition';
  return 'playing';
}

/* ---------- SAN ---------- */

const LETTER: Record<number, string> = { [N]: 'N', [B]: 'B', [R]: 'R', [Q]: 'Q', [K]: 'K' };

/** SAN for `move` from `pos` (move must be legal in `pos`) */
export function san(pos: Position, move: Move): string {
  let core: string;
  if (move.flags & F_CASTLE_K) core = 'O-O';
  else if (move.flags & F_CASTLE_Q) core = 'O-O-O';
  else {
    const kind = Math.abs(move.piece);
    const capture = move.flags & F_CAPTURE ? 'x' : '';
    if (kind === P) {
      core = (capture ? 'abcdefgh'[file(move.from)] + 'x' : '') + sqName(move.to);
    } else {
      // disambiguate against every other legal move of the same kind to the
      // same square: file first, rank if the file ties, both as last resort
      const rivals = legalMoves(pos).filter(
        (m) => m.to === move.to && m.piece === move.piece && m.from !== move.from
      );
      let dis = '';
      if (rivals.length > 0) {
        const sameFile = rivals.some((m) => file(m.from) === file(move.from));
        const sameRank = rivals.some((m) => rank(m.from) === rank(move.from));
        if (!sameFile) dis = 'abcdefgh'[file(move.from)];
        else if (!sameRank) dis = String(rank(move.from) + 1);
        else dis = sqName(move.from);
      }
      core = LETTER[kind] + dis + capture + sqName(move.to);
    }
    if (move.promo) core += '=' + LETTER[move.promo];
  }
  const after = applyMove(pos, move);
  if (inCheck(after)) core += legalMoves(after).length === 0 ? '#' : '+';
  return core;
}

/* ---------- perft (validate uses this to prove the generator) ---------- */

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const mine = pos.turn;
  let nodes = 0;
  for (const move of pseudoMoves(pos)) {
    const undo = make(pos, move);
    if (!inCheck(pos, mine)) nodes += depth === 1 ? 1 : perft(pos, depth - 1);
    unmake(pos, move, undo);
  }
  return nodes;
}
