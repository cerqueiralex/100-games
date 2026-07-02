import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { EyeIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';

const SIZE: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const SHUFFLE_MOVES: Record<Difficulty, number> = { easy: 50, medium: 140, hard: 280 };
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const PAR_SEC: Record<Difficulty, number> = { easy: 2 * 60, medium: 5 * 60, hard: 10 * 60 };

/**
 * Images live in /public/puzzles/. To add your own: drop a square-ish
 * image into that folder and list its filename in manifest.json.
 */
async function pickImage(): Promise<string | null> {
  try {
    const base = import.meta.env.BASE_URL;
    const res = await fetch(`${base}puzzles/manifest.json`);
    const data = (await res.json()) as { images: string[] };
    if (!data.images?.length) return null;
    return `${base}puzzles/${data.images[Math.floor(Math.random() * data.images.length)]}`;
  } catch {
    return null;
  }
}

/** Shuffle by random legal blank moves — the result is always solvable. */
function shuffle(n: number, count: number): number[] {
  const perm = Array.from({ length: n * n }, (_, i) => i);
  let blank = n * n - 1;
  let prev = -1;
  for (let k = 0; k < count; k++) {
    const r = Math.floor(blank / n);
    const c = blank % n;
    const options = [
      r > 0 ? blank - n : -1,
      r < n - 1 ? blank + n : -1,
      c > 0 ? blank - 1 : -1,
      c < n - 1 ? blank + 1 : -1
    ].filter((i) => i >= 0 && i !== prev);
    const pick = options[Math.floor(Math.random() * options.length)];
    perm[blank] = perm[pick];
    perm[pick] = n * n - 1;
    prev = blank;
    blank = pick;
  }
  return perm;
}

interface PuzzleSave {
  perm: number[];
  img: string | null;
  moves: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function ImagePuzzleGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const n = SIZE[difficulty];
  const blankTile = n * n - 1;
  const saved = savedState as PuzzleSave | undefined;

  // perm[position] = tile that currently sits there
  const [perm, setPerm] = useState<number[]>(() =>
    saved ? [...saved.perm] : shuffle(n, SHUFFLE_MOVES[difficulty])
  );
  const [img, setImg] = useState<string | null>(saved?.img ?? null);
  const [imgReady, setImgReady] = useState(!!saved);
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [previewing, setPreviewing] = useState(false);

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.showNumbers ? ['showNumbers'] : [])])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  useEffect(() => {
    if (saved) return; // resumed games keep their saved image
    let alive = true;
    void pickImage().then((url) => {
      if (!alive) return;
      setImg(url);
      setImgReady(true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    events.onStats({
      score: 0,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { moves, image: img?.split('/').pop() ?? 'pattern' }
    });
  }, [moves, hintsUsed, img, events]);

  const finish = useCallback(
    (mv: number, h: number) => {
      if (done.current) return;
      done.current = true;
      const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      const score = Math.max(50, 800 * MULT[difficulty] - mv * 2) + bonus;
      events.onFinish({
        outcome: 'won',
        score,
        errors: 0,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { moves: mv, image: img?.split('/').pop() ?? 'pattern' }
      });
    },
    [difficulty, events, img]
  );

  const slide = useCallback(
    (pos: number) => {
      if (paused || done.current) return;
      const blankPos = perm.indexOf(blankTile);
      const r = Math.floor(pos / n);
      const c = pos % n;
      const br = Math.floor(blankPos / n);
      const bc = blankPos % n;
      if (Math.abs(r - br) + Math.abs(c - bc) !== 1) return;
      const next = [...perm];
      next[blankPos] = next[pos];
      next[pos] = blankTile;
      setPerm(next);
      const mv = moves + 1;
      setMoves(mv);
      sfx.tap();
      if (next.every((t, i) => t === i)) {
        sfx.place();
        finish(mv, hintsUsed);
      }
    },
    [paused, perm, blankTile, n, moves, hintsUsed, finish]
  );

  // arrow keys slide the neighbouring tile into the blank
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.key.startsWith('Arrow') || paused || done.current) return;
      e.preventDefault();
      const blankPos = perm.indexOf(blankTile);
      const br = Math.floor(blankPos / n);
      const bc = blankPos % n;
      // ArrowUp slides the tile below the blank upward, etc.
      const target =
        e.key === 'ArrowUp' && br < n - 1 ? blankPos + n
        : e.key === 'ArrowDown' && br > 0 ? blankPos - n
        : e.key === 'ArrowLeft' && bc < n - 1 ? blankPos + 1
        : e.key === 'ArrowRight' && bc > 0 ? blankPos - 1
        : -1;
      if (target >= 0) slide(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [perm, blankTile, n, slide, paused]);

  const preview = () => {
    if (paused || done.current || !assists.preview || previewing) return;
    assistsUsed.current.add('preview');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    setPreviewing(true);
    window.setTimeout(() => setPreviewing(false), 2000);
  };

  const tileStyle = (tile: number): React.CSSProperties => {
    if (!img) {
      return {};
    }
    const r = Math.floor(tile / n);
    const c = tile % n;
    return {
      backgroundImage: `url(${img})`,
      backgroundSize: `${n * 100}% ${n * 100}%`,
      backgroundPosition: `${(c / (n - 1)) * 100}% ${(r / (n - 1)) * 100}%`
    };
  };

  const solvedCount = useMemo(() => perm.filter((t, i) => t === i).length, [perm]);

  useEffect(() => {
    registerSnapshot(() => ({
      perm,
      img,
      moves,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  return (
    <div className={`imgpuzzle ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Moves: <b>{moves}</b>
        </span>
        <span className="info-item">
          In place: <b>{solvedCount} / {n * n}</b>
        </span>
      </div>

      <div className="ip-wrap">
        <div className="ip-board" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {!imgReady
            ? null
            : perm.map((tile, pos) =>
                tile === blankTile && !previewing ? (
                  <div key={pos} className="ip-blank" />
                ) : (
                  <button
                    key={pos}
                    className={`ip-tile ${img ? '' : 'pattern'} ${tile === pos ? 'placed' : ''}`}
                    style={tileStyle(tile)}
                    onClick={() => slide(pos)}
                  >
                    {(assists.showNumbers || !img) && <span className="ip-num">{tile + 1}</span>}
                  </button>
                )
              )}
        </div>
        {previewing && img && (
          <div className="ip-preview" style={{ backgroundImage: `url(${img})` }} />
        )}
      </div>

      {assists.preview && (
        <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool silent onClick={preview}>
            <EyeIcon />
            <span>Preview image</span>
          </PadTool>
        </div>
        </div>
      )}
    </div>
  );
}
