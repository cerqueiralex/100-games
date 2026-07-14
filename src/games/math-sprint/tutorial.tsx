import type { TutorialStep } from '../../platform/types';

export const mathSprintTutorial: TutorialStep[] = [
  {
    title: 'Solve the equation',
    text: 'A stream of arithmetic problems appears one at a time. Tap the digit pad to build the missing number, then press the green check to submit.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-big">7 + 5 =</span>
          <span className="tut-cell sel">12</span>
        </div>
        <div className="tut-row">
          <span className="tut-key">1</span>
          <span className="tut-key">2</span>
          <span className="tut-key active">✓</span>
        </div>
      </div>
    )
  },
  {
    title: 'Hit the target',
    text: 'Every correct answer counts toward the round target. Reach the target before the top countdown bar empties and you win — run out of time first and the round is lost.',
    art: (
      <div className="tut-col">
        <span className="tut-big">15 / 15</span>
        <span className="chip accent">beat the target before time runs out</span>
      </div>
    )
  },
  {
    title: 'Build a streak',
    text: 'Answers in a row without a miss light the flame and multiply your points: three straight scores ×1.5, six ×2, and it climbs to ×3. The faster you answer, the bigger the speed bonus.',
    art: (
      <div className="tut-row">
        <span className="chip accent">streak ×1.5</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">×3</span>
      </div>
    )
  },
  {
    title: 'Wrong or too slow costs',
    text: 'A wrong answer flashes the correct one and resets your streak, and each problem has a soft timer — let it run out and it counts as a miss. Both nick a few seconds off the clock.',
    art: (
      <div className="tut-row">
        <span className="tut-big">6 × 4 =</span>
        <span className="tut-cell bad">25</span>
        <span className="chip bad">−3s</span>
      </div>
    )
  },
  {
    title: 'It gets harder — and help',
    text: 'Problems grow tougher as your streak climbs, up to two-step sums and missing numbers. More time and Simple mode ease the run, Skip jumps a problem, and Nudge reveals a hint about the answer — all count as help.',
    art: (
      <div className="tut-row">
        <span className="tut-big">3 × 4 − 2</span>
        <span className="tut-key wide">Skip</span>
        <span className="tut-key wide">Nudge</span>
      </div>
    )
  }
];
