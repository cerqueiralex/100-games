import type { TutorialStep } from '../../platform/types';

export const pipesTutorial: TutorialStep[] = [
  {
    title: 'Make the water flow',
    text: 'Every board is a tangle of pipes fed by one water tank. Your goal: connect the tank to every outlet so water fills the whole network with no open ends.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell same">╺</span>
          <span className="tut-cell same">━</span>
          <span className="tut-cell same">┳</span>
          <span className="tut-cell">━</span>
          <span className="tut-cell">╸</span>
        </div>
        <span className="chip accent">Tank → every outlet, no leaks</span>
      </div>
    )
  },
  {
    title: 'Tap to rotate',
    text: 'Tapping a pipe turns it a quarter-turn clockwise. Keep tapping to line its connectors up with its neighbours — each tap counts as one turn.',
    art: (
      <div className="tut-row">
        <span className="tut-cell big">┗</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell big sel">┏</span>
        <span className="tut-label">tap = 90°</span>
      </div>
    )
  },
  {
    title: 'Watch the water spread',
    text: 'Pipes joined to the tank fill blue; anything still cut off stays grey — so the water creeps outward as you solve. Switch the flow preview off for a pure-logic challenge (it counts as help).',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell same">┃</span>
          <span className="tut-cell same">┗</span>
          <span className="tut-cell same">━</span>
          <span className="tut-cell dim">┓</span>
        </div>
        <span className="chip accent">Blue = connected · grey = open</span>
      </div>
    )
  },
  {
    title: 'Beat par',
    text: 'Par is the fewest turns that can untangle your board. Match it for the full efficiency bonus; extra turns shrink it. The Hint spins one pipe correct for you (−30, counts as help).',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell big">12</span>
          <span className="tut-label">par</span>
        </div>
        <span className="chip good">On par = full bonus</span>
        <span className="chip">Extra turns = smaller bonus</span>
      </div>
    )
  },
  {
    title: 'Extreme wraps around',
    text: 'On the 9×9 Extreme board the edges wrap: a pipe running off one side flows back in on the opposite side, like the board is bent into a doughnut. Watch the edge arrows.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell mini same">━</span>
          <span className="tut-cell mini same">╺</span>
          <span className="tut-arrow">⇥</span>
          <span className="tut-cell mini same">╸</span>
          <span className="tut-cell mini same">━</span>
        </div>
        <span className="chip accent">Left edge flows into the right</span>
      </div>
    )
  }
];
