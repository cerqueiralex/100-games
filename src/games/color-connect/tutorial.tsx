import type { TutorialStep } from '../../platform/types';

const Dot = ({ c }: { c: number }) => (
  <span className="tut-cell">
    <span className={`fl-dot fl-c${c}`} style={{ position: 'static' }} />
  </span>
);
const Path = ({ c }: { c: number }) => <span className={`tut-cell fl-demo fl-c${c}`} />;

export const colorConnectTutorial: TutorialStep[] = [
  {
    title: 'Pair up the dots',
    text: 'Every color has two dots. Drag from one dot to its partner to draw a pipe between them.',
    art: (
      <div className="tut-row">
        <Dot c={0} />
        <Path c={0} />
        <Path c={0} />
        <Dot c={0} />
      </div>
    )
  },
  {
    title: 'Pipes cannot cross',
    text: 'Drawing through another pipe cuts it — you will have to redraw the damaged one. Plan routes so every color has room.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Path c={1} />
          <Path c={1} />
          <Path c={1} />
        </div>
        <span className="chip bad">crossed = cut</span>
      </div>
    )
  },
  {
    title: 'Fill the whole board',
    text: 'You win when every pair is connected AND every square is covered by a pipe. Empty squares mean a route needs to take the scenic way.',
    art: (
      <div className="tut-col">
        <span className="tut-big">100%</span>
        <span className="chip good">board filled — you win</span>
      </div>
    )
  },
  {
    title: 'Stuck? Solve a color',
    text: 'The hint button draws one complete pipe for you (−50 points, counts as help). Fewer moves means a higher score, and finishing under par earns a bonus.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Solve a color</span>
        <span className="chip">−50 pts</span>
      </div>
    )
  }
];
