import type { TutorialStep } from '../../platform/types';
import { B, K, N, P, Q, R } from './logic/engine';
import { ChessPiece } from './pieces';

/** one board square in the tutorial art, chess.com-green like the game */
function Sq({
  dark,
  piece,
  color,
  dot,
  ring,
  glow
}: {
  dark?: boolean;
  piece?: number;
  color?: 'w' | 'b';
  dot?: boolean;
  ring?: boolean;
  glow?: 'last' | 'check';
}) {
  return (
    <span className={`tut-cell chess-tut ${dark ? 'dk' : 'lt'} ${glow ?? ''}`}>
      {piece && <ChessPiece kind={piece} color={color ?? 'w'} />}
      {dot && <span className="chess-tut-dot" />}
      {ring && <span className="chess-tut-ring" />}
    </span>
  );
}

const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, 38px)', gap: 0 } as const;

export const chessTutorial: TutorialStep[] = [
  {
    title: 'Drag a piece to move',
    text: 'You play White; the robot — the Stockfish engine, held to the strength of the tier you picked, from a true beginner on easy to club level on extreme — answers as Black. Press a piece and drag it — every square it can legally reach lights up with a dot. Release on one to move (a tap-then-tap works too).',
    art: (
      <div style={grid3}>
        <Sq dot />
        <Sq dark />
        <Sq />
        <Sq dark dot />
        <Sq piece={N} color="w" />
        <Sq dark dot />
        <Sq />
        <Sq dark />
        <Sq dot />
      </div>
    )
  },
  {
    title: 'Capture and get captured',
    text: 'A reachable enemy piece wears a ring — land on it to capture. Everything taken, by you or the robot, collects in the trays above and below the board, with the material lead counted in pawns.',
    art: (
      <div style={grid3}>
        <Sq />
        <Sq dark piece={P} color="b" ring />
        <Sq />
        <Sq dark />
        <Sq dark />
        <Sq />
        <Sq piece={B} color="w" />
        <Sq dark />
        <Sq />
      </div>
    )
  },
  {
    title: 'Check!',
    text: 'When a king is attacked it is in CHECK — the square flares red and you MUST get out of it: move the king, block the attack, or capture the attacker. The robot’s last move is always highlighted so you can see what hit you.',
    art: (
      <div style={grid3}>
        <Sq piece={K} color="w" glow="check" />
        <Sq dark />
        <Sq glow="last" piece={R} color="b" />
        <Sq dark />
        <Sq />
        <Sq dark />
        <Sq />
        <Sq dark />
        <Sq />
      </div>
    )
  },
  {
    title: 'Checkmate ends it',
    text: 'Trap the enemy king so no move escapes check and the game is over — checkmate wins on the spot. No moves but no check is STALEMATE, a draw; so are three repetitions and fifty quiet moves.',
    art: (
      <div style={grid3}>
        <Sq dark piece={K} color="b" glow="check" />
        <Sq piece={Q} color="w" />
        <Sq dark />
        <Sq />
        <Sq dark piece={K} color="w" />
        <Sq />
        <Sq dark />
        <Sq />
        <Sq dark />
      </div>
    )
  },
  {
    title: 'The special moves',
    text: 'Castling (king slides two squares, rook hops over) needs both pieces unmoved and no check on the way. A pawn reaching the far rank PROMOTES — you pick the piece. And a pawn that just double-stepped past yours can be taken en passant. All three are in your move dots when legal.',
    art: (
      <div style={grid3}>
        <Sq piece={R} color="w" />
        <Sq dark dot />
        <Sq piece={K} color="w" />
        <Sq dark />
        <Sq />
        <Sq dark />
        <Sq piece={P} color="w" />
        <Sq dark dot />
        <Sq piece={Q} color="w" />
      </div>
    )
  }
];
