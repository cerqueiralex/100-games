import type { TutorialStep } from '../../platform/types';

export const imagePuzzleTutorial: TutorialStep[] = [
  {
    title: 'Rebuild the picture',
    text: 'A photo is cut into tiles and scrambled, with one empty space. Restore the original image by sliding tiles around.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        {['1', '3', '2', '4', '', '5', '7', '8', '6'].map((v, i) => (
          <span key={i} className={`tut-cell ${v === '' ? 'blank' : 'hl'}`}>
            {v}
          </span>
        ))}
      </div>
    )
  },
  {
    title: 'Slide into the gap',
    text: 'Tap any tile next to the empty space to slide it in (arrow keys work on desktop). Only neighbours of the gap can move.',
    art: (
      <div className="tut-row">
        <span className="tut-cell hl">5</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell sel" />
      </div>
    )
  },
  {
    title: 'Fewer moves, better score',
    text: 'Every slide counts. Solve it in fewer moves and under par time for the best score. Tile numbers and the 2-second image preview both count as help.',
    art: (
      <div className="tut-row">
        <span className="chip good">−2 pts / move</span>
        <span className="chip accent">Preview = help</span>
      </div>
    )
  },
  {
    title: 'Add your own photos',
    text: 'The puzzle picks a random image from the puzzles folder. Drop your own square photo into public/puzzles/ and list it in manifest.json to play with it.',
    art: (
      <div className="tut-col">
        <span className="tut-key wide">puzzles/</span>
        <span className="tut-label">your-photo.jpg → manifest.json</span>
      </div>
    )
  }
];
