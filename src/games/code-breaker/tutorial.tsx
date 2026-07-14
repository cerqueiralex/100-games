import type { TutorialStep } from '../../platform/types';
import { PegGlyph } from './CodeBreakerGame';

export const codeBreakerTutorial: TutorialStep[] = [
  {
    title: 'Crack the code',
    text: 'A secret code of colored pegs hides behind the cover. Compose guesses to work it out before your guesses run out — 3 pegs on Easy up to 6 on Extreme.',
    art: (
      <div className="tut-col">
        <div className="cbk-tut-row">
          <span className="cbk-tut-q">?</span>
          <span className="cbk-tut-q">?</span>
          <span className="cbk-tut-q">?</span>
        </div>
        <span className="tut-arrow">↓</span>
        <div className="cbk-tut-row">
          <span className="cbk-peg cbk-c1">
            <PegGlyph c={1} />
          </span>
          <span className="cbk-peg cbk-c2">
            <PegGlyph c={2} />
          </span>
          <span className="cbk-peg cbk-c3">
            <PegGlyph c={3} />
          </span>
        </div>
      </div>
    )
  },
  {
    title: 'Read the feedback',
    text: 'Each guess is answered with feedback pegs: a filled peg means right color in the right spot; a hollow peg means right color, wrong spot. They never say WHICH peg is right.',
    art: (
      <div className="tut-col">
        <div className="cbk-tut-row">
          <span className="cbk-peg cbk-c0">
            <PegGlyph c={0} />
          </span>
          <span className="cbk-peg cbk-c2">
            <PegGlyph c={2} />
          </span>
          <span className="cbk-peg cbk-c4">
            <PegGlyph c={4} />
          </span>
          <span className="tut-arrow">→</span>
          <span className="cbk-tut-fb">
            <i className="cbk-fbpeg exact in" />
            <i className="cbk-fbpeg present in" />
            <i className="cbk-fbpeg none" />
          </span>
        </div>
        <span className="chip good">Filled = right color, right spot</span>
        <span className="chip muted">Hollow = right color, wrong spot</span>
      </div>
    )
  },
  {
    title: 'Compose your guess',
    text: 'Tap a slot, then tap a color from the palette (each color also has its own little shape). Erase to clear a peg; Submit unlocks once every slot is filled.',
    art: (
      <div className="tut-col">
        <div className="cbk-tut-row">
          <span className="cbk-tut-slot sel" />
          <span className="tut-arrow">←</span>
          <span className="cbk-peg cbk-c5">
            <PegGlyph c={5} />
          </span>
          <span className="cbk-peg cbk-c6">
            <PegGlyph c={6} />
          </span>
          <span className="cbk-peg cbk-c7">
            <PegGlyph c={7} />
          </span>
        </div>
        <span className="tut-key wide active">Submit</span>
      </div>
    )
  },
  {
    title: 'Mind the repeats',
    text: 'From Hard difficulty up, the code may repeat a color — a "Repeats allowed" chip reminds you. Winning early pays: every unused guess adds a bonus.',
    art: (
      <div className="tut-col">
        <div className="cbk-tut-row">
          <span className="cbk-peg cbk-c3">
            <PegGlyph c={3} />
          </span>
          <span className="cbk-peg cbk-c3">
            <PegGlyph c={3} />
          </span>
          <span className="cbk-peg cbk-c1">
            <PegGlyph c={1} />
          </span>
          <span className="cbk-peg cbk-c3">
            <PegGlyph c={3} />
          </span>
        </div>
        <span className="chip accent">Repeats allowed</span>
        <span className="chip good">+150 × difficulty · + bonus per unused guess</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Rule-out notes let you strike eliminated colors; the contradiction check paints an impossible guess red before you submit; a Hint reveals and locks one peg (max 2, −40 each).',
    art: (
      <div className="tut-col">
        <div className="cbk-tut-row">
          <span className="cbk-note off cbk-c2">
            <PegGlyph c={2} />
          </span>
          <span className="cbk-note cbk-c0">
            <PegGlyph c={0} />
          </span>
          <span className="cbk-note cbk-c4">
            <PegGlyph c={4} />
          </span>
        </div>
        <span className="chip bad">Guess contradicts earlier feedback</span>
        <span className="chip accent">Hint locks a correct peg · counts as help</span>
      </div>
    )
  }
];
