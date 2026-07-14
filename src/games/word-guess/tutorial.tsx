import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

export const wordGuessTutorial: TutorialStep[] = [
  {
    title: 'Find the hidden word',
    text: 'A secret word is waiting. You get six tries (seven on easy) to guess it — every guess must be a real word of the right length.',
    art: (
      <div className="tut-row">
        <Cell />
        <Cell />
        <Cell />
        <Cell />
        <Cell />
      </div>
    )
  },
  {
    title: 'Type and enter',
    text: 'Tap the on-screen keyboard (or type on a real one) to fill a row, then press Enter to submit your guess.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="C" />
          <Cell v="R" />
          <Cell v="A" />
          <Cell v="N" />
          <Cell v="E" c="sel" />
        </div>
        <div className="tut-row">
          <span className="tut-key">R</span>
          <span className="tut-key">S</span>
          <span className="tut-key wide">ENTER</span>
        </div>
      </div>
    )
  },
  {
    title: 'Read the colors',
    text: 'Green means right letter, right spot. The accent color means the letter is in the word but somewhere else. Dim means the letter is not in the word at all.',
    art: (
      <div className="tut-row">
        <Cell v="C" c="good" />
        <Cell v="R" c="same" />
        <Cell v="A" c="dim" />
        <Cell v="N" c="dim" />
        <Cell v="E" c="good" />
      </div>
    )
  },
  {
    title: 'Repeated letters',
    text: 'A letter is only coloured as many times as it truly appears. Guess a double letter and only the copies that exist light up — the rest go dim.',
    art: (
      <div className="tut-row">
        <Cell v="E" c="good" />
        <Cell v="E" c="dim" />
        <Cell v="R" c="same" />
        <Cell v="I" c="dim" />
        <Cell v="E" c="dim" />
      </div>
    )
  },
  {
    title: 'Helpers count as help',
    text: 'Keyboard hints tint keys you have tried. Starter fills a strong opening word; Reveal shows one correct letter. All three are recorded as help, and keyboard hints are off on Extreme.',
    art: (
      <div className="tut-row">
        <span className="tut-key active">A</span>
        <span className="tut-key">S</span>
        <span className="chip accent">Starter</span>
        <span className="chip">Reveal</span>
      </div>
    )
  }
];
