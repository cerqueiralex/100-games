import type { TutorialStep } from '../../platform/types';

const Tile = ({ v }: { v: string }) => <span className="tut-cell">{v}</span>;
const Slot = ({ c = '' }: { c?: string }) => <span className={`tut-cell ghost ${c}`} />;

export const missingVowelsTutorial: TutorialStep[] = [
  {
    title: 'The vowels vanished',
    text: 'A phrase appears with every A E I O U removed. The consonants stay put and each missing vowel leaves an empty slot.',
    art: (
      <div className="tut-row">
        <Tile v="P" />
        <Slot />
        <Tile v="Z" />
        <Tile v="Z" />
        <Tile v="L" />
        <Slot />
      </div>
    )
  },
  {
    title: 'Tap a slot, tap a vowel',
    text: 'Pick an empty slot, then tap one of the five vowel keys to drop it in. Delete and Clear fix mistakes.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Tile v="P" />
          <Slot c="sel" />
          <Tile v="Z" />
        </div>
        <div className="tut-row">
          <span className="tut-key">A</span>
          <span className="tut-key">E</span>
          <span className="tut-key">I</span>
          <span className="tut-key active">U</span>
          <span className="tut-key">O</span>
        </div>
      </div>
    )
  },
  {
    title: 'Solve the whole row',
    text: 'Fill a phrase correctly and its vowels light up green, then the next one deals in. Clear the pip row to win.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Tile v="P" />
          <span className="tut-cell good">U</span>
          <Tile v="Z" />
          <Tile v="Z" />
          <Tile v="L" />
          <span className="tut-cell good">E</span>
        </div>
        <span className="tut-label">3 of 6 solved</span>
      </div>
    )
  },
  {
    title: 'Mistakes and the clock',
    text: 'A wrong guess shakes the bad slots. On Pro and Extreme a run of mistakes ends the game — and Extreme adds a per-phrase timer with no category shown.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Tile v="C" />
          <span className="tut-cell bad">O</span>
          <Tile v="T" />
          <span className="tut-arrow">→</span>
          <span className="chip bad">shake</span>
        </div>
        <div className="tut-row">
          <span className="tut-label">time</span>
          <span className="tut-key wide" style={{ position: 'relative', overflow: 'hidden' }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                right: '40%',
                background: 'var(--accent-soft)'
              }}
            />
          </span>
        </div>
      </div>
    )
  },
  {
    title: 'Helpers count as help',
    text: 'Category names the theme (and reveals it on Extreme), Reveal fills one slot for you, and Keep correct locks the vowels you got right after a wrong guess. Using them means it is not a clean win.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Category</span>
        <span className="chip accent">Reveal</span>
        <span className="chip">Keep correct</span>
      </div>
    )
  }
];
