import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, FlagIcon, MineIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';

const CONFIG: Record<Difficulty, { size: number; mines: number }> = {
  easy: { size: 8, mines: 8 },
  medium: { size: 10, mines: 16 },
  hard: { size: 12, mines: 26 },
  pro: { size: 14, mines: 40 },
  extreme: { size: 16, mines: 58 }
};
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = { easy: 2 * 60, medium: 4 * 60, hard: 7 * 60, pro: 10 * 60, extreme: 14 * 60 };
const CELL_PTS = 5;
const WIN_PTS_PER_MINE = 20;
const HINT_PENALTY = 25;

interface MsSave {
  mines: number[] | null;
  revealed: number[];
  flagged: number[];
  hintsUsed: number;
  assistsUsed: string[];
}

export function MinesweeperGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const { size, mines: mineCount } = CONFIG[difficulty];
  const n = size * size;
  const saved = savedState as MsSave | undefined;

  const [mines, setMines] = useState<Set<number> | null>(() =>
    saved?.mines ? new Set(saved.mines) : null
  );
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(saved?.revealed ?? []));
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set(saved?.flagged ?? []));
  const [flagMode, setFlagMode] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [exploded, setExploded] = useState<number | null>(null);

  const done = useRef(false);
  const suppressClick = useRef(false);
  const pressTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.safeFirst ? ['safeFirst'] : [])])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // passive assist: counts as help whenever enabled while it can still act
  // (protection only applies before the first reveal places the mines)
  useEffect(() => {
    if (assists.safeFirst && !mines) assistsUsed.current.add('safeFirst');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assists.safeFirst]);

  const neighbors = useCallback(
    (i: number): number[] => {
      const r = Math.floor(i / size);
      const c = i % size;
      const out: number[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(nr * size + nc);
        }
      }
      return out;
    },
    [size]
  );

  const countAt = useCallback(
    (i: number, ms: Set<number>) => neighbors(i).filter((j) => ms.has(j)).length,
    [neighbors]
  );

  const liveScore = revealed.size * CELL_PTS * MULT[difficulty];

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { cleared: revealed.size, flags: flagged.size, mines: mineCount }
    });
  }, [liveScore, hintsUsed, revealed.size, flagged.size, mineCount, events]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', rev: Set<number>, h: number) => {
      if (done.current) return;
      done.current = true;
      const base = rev.size * CELL_PTS * MULT[difficulty] - h * HINT_PENALTY;
      const bonus =
        outcome === 'won'
          ? mineCount * WIN_PTS_PER_MINE * MULT[difficulty] +
            Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty]
          : 0;
      events.onFinish({
        outcome,
        score: Math.max(0, base + bonus),
        errors: outcome === 'lost' ? 1 : 0,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { cleared: rev.size, mines: mineCount }
      });
    },
    [difficulty, mineCount, events]
  );

  const placeMines = useCallback(
    (firstIdx: number, guaranteeSafe = false): Set<number> => {
      // `guaranteeSafe` keeps the target itself mine-free even with the
      // safe-first-tap assist off (the hint promises a safe cell)
      const excluded = new Set(
        assists.safeFirst ? [firstIdx, ...neighbors(firstIdx)] : guaranteeSafe ? [firstIdx] : []
      );
      const pool: number[] = [];
      for (let i = 0; i < n; i++) if (!excluded.has(i)) pool.push(i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const ms = new Set(pool.slice(0, mineCount));
      setMines(ms);
      return ms;
    },
    [assists.safeFirst, neighbors, n, mineCount]
  );

  const flood = useCallback(
    (start: number, ms: Set<number>, rev: Set<number>): Set<number> => {
      const out = new Set(rev);
      const queue = [start];
      while (queue.length) {
        const cur = queue.pop()!;
        if (out.has(cur) || ms.has(cur)) continue;
        out.add(cur);
        if (countAt(cur, ms) === 0) {
          for (const nb of neighbors(cur)) if (!out.has(nb)) queue.push(nb);
        }
      }
      return out;
    },
    [countAt, neighbors]
  );

  const explode = useCallback(
    (idx: number, rev: Set<number>) => {
      setExploded(idx);
      setRevealed(rev);
      finish('lost', rev, hintsUsed);
    },
    [finish, hintsUsed]
  );

  const winCheck = useCallback(
    // `h` lets callers that just spent a hint pass the fresh count — the
    // closed-over state still holds the pre-increment value
    (rev: Set<number>, h = hintsUsed) => {
      if (rev.size === n - mineCount) finish('won', rev, h);
    },
    [n, mineCount, finish, hintsUsed]
  );

  const reveal = useCallback(
    (idx: number) => {
      if (paused || done.current || flagged.has(idx) || revealed.has(idx)) return;
      const ms = mines ?? placeMines(idx);
      if (ms.has(idx)) {
        explode(idx, revealed);
        return;
      }
      const rev = flood(idx, ms, revealed);
      setRevealed(rev);
      sfx.tap();
      winCheck(rev);
    },
    [paused, flagged, revealed, mines, placeMines, flood, explode, winCheck]
  );

  const chord = useCallback(
    (idx: number) => {
      if (paused || done.current || !mines) return;
      const count = countAt(idx, mines);
      if (count === 0) return;
      const nb = neighbors(idx);
      if (nb.filter((j) => flagged.has(j)).length !== count) return;
      let rev = new Set(revealed);
      for (const j of nb) {
        if (flagged.has(j) || rev.has(j)) continue;
        if (mines.has(j)) {
          explode(j, rev);
          return;
        }
        rev = flood(j, mines, rev);
      }
      setRevealed(rev);
      sfx.tap();
      winCheck(rev);
    },
    [paused, mines, countAt, neighbors, flagged, revealed, flood, explode, winCheck]
  );

  const toggleFlag = useCallback(
    (idx: number) => {
      if (paused || done.current || revealed.has(idx)) return;
      sfx.tap();
      setFlagged((f) => {
        const next = new Set(f);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    },
    [paused, revealed]
  );

  const tap = (idx: number) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (revealed.has(idx)) chord(idx);
    else if (flagMode) toggleFlag(idx);
    else reveal(idx);
  };

  const startPress = (idx: number) => {
    pressTimer.current = window.setTimeout(() => {
      suppressClick.current = true;
      toggleFlag(idx);
    }, 420);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const hintSafe = useCallback(() => {
    if (paused || done.current || !assists.hintSafe) return;
    let ms = mines;
    let target: number | null = null;
    if (!ms) {
      target = Math.floor(Math.random() * n);
      ms = placeMines(target, true);
    } else {
      const candidates: number[] = [];
      for (let i = 0; i < n; i++) {
        if (!ms.has(i) && !revealed.has(i) && !flagged.has(i)) candidates.push(i);
      }
      if (candidates.length === 0) return;
      target = candidates[Math.floor(Math.random() * candidates.length)];
    }
    assistsUsed.current.add('hintSafe');
    const h = hintsUsed + 1;
    setHintsUsed(h);
    sfx.hint();
    const rev = flood(target, ms, revealed);
    setRevealed(rev);
    winCheck(rev, h);
  }, [paused, assists.hintSafe, mines, n, placeMines, revealed, flagged, flood, winCheck, hintsUsed]);

  useEffect(() => {
    registerSnapshot(() => ({
      mines: mines ? [...mines] : null,
      revealed: [...revealed],
      flagged: [...flagged],
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const cells = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);
  const lost = exploded !== null;

  return (
    <div className={`minesweeper ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Mines left: <b>{Math.max(0, mineCount - flagged.size)}</b>
        </span>
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Cleared: <b>{revealed.size} / {n - mineCount}</b>
        </span>
      </div>

      <div
        className="ms-board"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {cells.map((i) => {
          const isRevealed = revealed.has(i);
          const isMine = mines?.has(i) ?? false;
          const count = isRevealed && mines ? countAt(i, mines) : 0;
          const showMine = lost && isMine;
          return (
            <button
              key={i}
              className={[
                'ms-cell',
                isRevealed || showMine ? 'open' : '',
                showMine ? 'mine' : '',
                exploded === i ? 'boom' : '',
                count > 0 && !showMine ? `ms-n${count}` : ''
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => tap(i)}
              onPointerDown={() => startPress(i)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleFlag(i);
              }}
              aria-label={`Cell ${Math.floor(i / size) + 1},${(i % size) + 1}`}
            >
              {showMine ? (
                <MineIcon size={16} />
              ) : flagged.has(i) && !isRevealed ? (
                <FlagIcon size={13} />
              ) : isRevealed && count > 0 ? (
                count
              ) : (
                ''
              )}
            </button>
          );
        })}
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool active={flagMode} onClick={() => setFlagMode((m) => !m)}>
            <FlagIcon />
            <span>Flag mode</span>
          </PadTool>
          {assists.hintSafe && (
            <PadTool silent onClick={hintSafe}>
              <BulbIcon />
              <span>Safe cell</span>
            </PadTool>
          )}
        </div>
        <p className="ms-hint-text">Tap to reveal · long-press or flag mode to flag · tap a number to chord</p>
      </div>
    </div>
  );
}
