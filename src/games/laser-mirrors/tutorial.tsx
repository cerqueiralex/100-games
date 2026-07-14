import type { TutorialStep } from '../../platform/types';

export const laserMirrorsTutorial: TutorialStep[] = [
  {
    title: 'Light every target',
    text: 'A laser fires in a fixed direction. Steer its beam with mirrors so it passes through every target crystal on the board.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Laser</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell same">╲</span>
        <span className="tut-arrow">↓</span>
        <span className="tut-cell good">◎</span>
      </div>
    )
  },
  {
    title: 'Mirrors bend the beam',
    text: 'The beam travels straight and turns 90° when it strikes a mirror. A \\ mirror and a / mirror bend an incoming beam to opposite sides.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-arrow">→</span>
          <span className="tut-cell same">╲</span>
          <span className="tut-arrow">↓</span>
          <span className="tut-label">\ sends it down</span>
        </div>
        <div className="tut-row">
          <span className="tut-arrow">→</span>
          <span className="tut-cell same">╱</span>
          <span className="tut-arrow">↑</span>
          <span className="tut-label">/ sends it up</span>
        </div>
      </div>
    )
  },
  {
    title: 'Tap to rotate',
    text: 'Tap any mirror to flip it between / and \\. Watch the live beam re-trace instantly and count how many targets light up.',
    art: (
      <div className="tut-row">
        <span className="tut-cell same">╱</span>
        <span className="tut-arrow">⟳</span>
        <span className="tut-cell same">╲</span>
        <span className="chip accent">Tap to flip</span>
      </div>
    )
  },
  {
    title: 'Place from the tray',
    text: 'On harder puzzles some mirrors sit in a tray. Drag one onto any empty cell, then tap to rotate it. Walls block the beam completely.',
    art: (
      <div className="tut-row">
        <span className="chip muted">Tray</span>
        <span className="tut-cell same">╲</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell ghost" />
        <span className="tut-cell bad" />
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'The live beam and target glow guide your eye; Hint sets one mirror correctly. Winning without them is a clean win — fewer turns and under-par time score more.',
    art: (
      <div className="tut-col">
        <span className="chip accent">Beam shown live</span>
        <span className="chip good">Target glow</span>
        <span className="chip accent">Hint = help</span>
      </div>
    )
  }
];
