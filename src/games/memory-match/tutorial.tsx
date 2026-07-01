import type { TutorialStep } from '../../platform/types';

const Card = ({ face, c = '' }: { face?: string; c?: string }) => (
  <span className={`tut-mcard ${c}`}>
    {face ? <span className="tut-face">{face}</span> : <span className="tut-mdot" />}
  </span>
);

export const memoryMatchTutorial: TutorialStep[] = [
  {
    title: 'Flip two cards',
    text: 'All cards start face down. Flip any two — if they show the same picture, the pair stays open for good.',
    art: (
      <div className="tut-row">
        <Card face="🦊" c="good" />
        <Card face="🦊" c="good" />
        <Card />
        <Card />
      </div>
    )
  },
  {
    title: 'A miss flips back',
    text: 'Different pictures flip back over after a moment. Every miss is counted, so remember what you saw and where.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Card face="🐼" c="bad" />
          <Card face="🦊" c="bad" />
        </div>
        <span className="chip bad">Miss +1</span>
      </div>
    )
  },
  {
    title: 'Streaks pay off',
    text: 'Matching pairs back-to-back builds a streak — each consecutive match is worth more. Clearing the board fast earns a time bonus on top.',
    art: (
      <div className="tut-row">
        <span className="chip good">+50</span>
        <span className="tut-arrow">→</span>
        <span className="chip good">+60</span>
        <span className="tut-arrow">→</span>
        <span className="chip good">+70</span>
      </div>
    )
  },
  {
    title: 'Peek when stuck',
    text: 'The Peek button reveals every card for one second (−25 points). Opening peek shows the whole board at the start. Both count as help.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Card face="🐸" c="dim" />
          <Card face="⭐" c="dim" />
          <Card face="🚀" c="dim" />
        </div>
        <span className="chip accent">Peek · −25 pts</span>
      </div>
    )
  }
];
