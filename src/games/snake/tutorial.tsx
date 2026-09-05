import type { TutorialStep } from '../../platform/types';

export const snakeTutorial: TutorialStep[] = [
  {
    title: 'Eat the apples',
    text: 'Steer the snake into the apple. Every apple makes the snake one segment longer and a touch faster — reach the tier’s apple count to win.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel" />
        <span className="tut-cell sel" />
        <span className="tut-cell sel">◉</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell bad">●</span>
        <span className="tut-label">+1 segment</span>
      </div>
    )
  },
  {
    title: 'Steer',
    text: 'Swipe on the board, tap the D-pad, or use the arrow keys / WASD. Quick turns queue up, so a corner tapped early still lands on the right cell.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-key">▲</span>
        </div>
        <div className="tut-row">
          <span className="tut-key">◀</span>
          <span className="tut-key">▼</span>
          <span className="tut-key">▶</span>
        </div>
      </div>
    )
  },
  {
    title: 'Walls and tails bite',
    text: 'Running into a wall or into your own body ends the run. You can never turn straight back into your neck — that input is simply ignored.',
    art: (
      <div className="tut-row">
        <span className="tut-cell blank" />
        <span className="tut-cell sel">◉</span>
        <span className="tut-cell bad">▮</span>
        <span className="tut-label">crash</span>
      </div>
    )
  },
  {
    title: 'Chain apples for combos',
    text: 'Apples eaten within a couple of seconds of each other build a combo that pays extra points. The speed meter shows how fast the snake has become.',
    art: (
      <div className="tut-row">
        <span className="chip accent">+10</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">+12 ×2</span>
        <span className="tut-arrow">→</span>
        <span className="chip good">+14 ×3</span>
      </div>
    )
  },
  {
    title: 'Assists',
    text: 'Slow pace keeps the snake a third slower for the whole run; Wall wrap carries the snake through a wall to the opposite side. Both count as help when on.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel">◉</span>
        <span className="tut-cell ghost" />
        <span className="tut-arrow">↔</span>
        <span className="tut-cell ghost" />
        <span className="tut-cell sel" />
        <span className="tut-label">wrap</span>
      </div>
    )
  }
];
