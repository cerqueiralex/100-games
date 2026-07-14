import type { TutorialStep } from '../../platform/types';

function TutCrown() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" width="13" height="13">
      <path d="M4 18h16l1-9-5 3.2L12 5 8 12.2 3 9z" />
      <rect x="4" y="18.4" width="16" height="2.6" rx="1.3" />
    </svg>
  );
}

/** one dark board square, optionally holding a disc, a target dot or a marker */
function Sq({
  disc,
  dot,
  cap,
  king
}: {
  disc?: 'r' | 'b';
  dot?: boolean;
  cap?: boolean;
  king?: boolean;
}) {
  return (
    <span className={`tut-cell chk-tut dk ${dot ? 'dot' : ''} ${cap ? 'cap' : ''}`}>
      {disc && <span className={`chk-tut-disc ${disc}`}>{king && <TutCrown />}</span>}
    </span>
  );
}

const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gap: 4 } as const;

export const checkersTutorial: TutorialStep[] = [
  {
    title: 'Move diagonally',
    text: 'Men slide one dark square diagonally forward. Tap a piece to light up where it can go, then tap a square — or just drag it there.',
    art: (
      <div style={grid3}>
        <Sq />
        <Sq dot />
        <Sq />
        <Sq />
        <Sq />
        <Sq dot />
        <Sq />
        <Sq disc="r" />
        <Sq />
      </div>
    )
  },
  {
    title: 'Jump to capture',
    text: 'Hop over a touching enemy into the empty square beyond to capture it. The jumped piece pops off the board.',
    art: (
      <div style={grid3}>
        <Sq />
        <Sq />
        <Sq dot />
        <Sq />
        <Sq disc="b" cap />
        <Sq />
        <Sq disc="r" />
        <Sq />
        <Sq />
      </div>
    )
  },
  {
    title: 'Captures are forced',
    text: 'If any jump is on offer you must take one — and if the landing lets you jump again, the multi-jump keeps going until it can’t.',
    art: (
      <div className="tut-row">
        <span className="chip bad">Jump available</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">You must capture</span>
      </div>
    )
  },
  {
    title: 'Crown a King',
    text: 'Reach the far row to crown a King. Kings move and jump in every diagonal direction — a big advantage.',
    art: (
      <div style={grid3}>
        <Sq dot />
        <Sq />
        <Sq dot />
        <Sq />
        <Sq disc="r" king />
        <Sq />
        <Sq dot />
        <Sq />
        <Sq dot />
      </div>
    )
  },
  {
    title: 'Win it — with or without help',
    text: 'Capture every enemy piece, or leave them with no move. Move hints light up your options; a Hint suggests a strong move against the robot. Both count as help, so a clean win is all yours.',
    art: (
      <div className="tut-row">
        <span className="chip good">Board cleared</span>
        <span className="tut-arrow">=</span>
        <span className="chip accent">You win</span>
      </div>
    )
  }
];
