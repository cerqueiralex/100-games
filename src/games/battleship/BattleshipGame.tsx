import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, EraseIcon, RestartIcon, TargetIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  COLS,
  FLEET,
  GRID,
  canPlace,
  cellsOf,
  occupiedBy,
  randomFleet,
  surroundingCells,
  type Dir,
  type Placed
} from './logic/fleet';
import { pickShot, type ShotResult } from './logic/ai';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = { easy: 4 * 60, medium: 6 * 60, hard: 8 * 60, pro: 10 * 60, extreme: 12 * 60 };
/** misses the enemy may take per turn — pro/extreme fire multi-shot salvos */
const SALVO: Record<Difficulty, number> = { easy: 1, medium: 1, hard: 1, pro: 2, extreme: 3 };
const HIT_PTS = 20;
const SUNK_PTS = 60;
const HINT_PENALTY = 40;
const INTACT_PTS = 25;

type Phase = 'place' | 'battle';
type Turn = 'me' | 'enemy';

interface BsSave {
  phase: Phase;
  myFleet: Placed[];
  orient: Dir;
  enemyFleet: Placed[];
  myShots: ShotResult[];
  enemyShots: ShotResult[];
  turn: Turn;
  hintsUsed: number;
  pings: number[];
  assistsUsed: string[];
}

const emptyShots = (): ShotResult[] => new Array<ShotResult>(GRID * GRID).fill(0);

/** cells of every placement whose segments are all hit */
function sunkCellsOf(fleet: Placed[], shots: ShotResult[]): Set<number> {
  const out = new Set<number>();
  for (const p of fleet) {
    const cells = cellsOf(p)!;
    if (cells.every((c) => shots[c] === 2)) for (const c of cells) out.add(c);
  }
  return out;
}

export function BattleshipGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  const saved = savedState as BsSave | undefined;

  const [phase, setPhase] = useState<Phase>(saved?.phase ?? 'place');
  const [myFleet, setMyFleet] = useState<Placed[]>(saved?.myFleet ?? []);
  const [orient, setOrient] = useState<Dir>(saved?.orient ?? 'h');
  const [selShip, setSelShip] = useState(0);
  const [enemyFleet] = useState<Placed[]>(() => saved?.enemyFleet ?? randomFleet());
  const [myShots, setMyShots] = useState<ShotResult[]>(saved?.myShots ?? emptyShots);
  const [enemyShots, setEnemyShots] = useState<ShotResult[]>(saved?.enemyShots ?? emptyShots);
  const [turn, setTurn] = useState<Turn>(saved?.turn ?? 'me');
  const [enemySalvo, setEnemySalvo] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [pings, setPings] = useState<Set<number>>(() => new Set(saved?.pings ?? []));
  const [myLast, setMyLast] = useState<number | null>(null);
  const [enemyLast, setEnemyLast] = useState<number | null>(null);
  const [badCell, setBadCell] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const done = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const badTimer = useRef<number | null>(null);
  const myBoardRef = useRef<HTMLDivElement | null>(null);
  const wheelAt = useRef(0);
  const enemyMisses = useRef(0);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // the clock only runs once the battle starts
  useEffect(() => {
    holdClock(phase === 'place');
  }, [phase, holdClock]);

  // passive assist: counts as help whenever enabled during battle
  useEffect(() => {
    if (phase === 'battle' && assists.autoWater) assistsUsed.current.add('autoWater');
  }, [phase, assists.autoWater]);

  const enemyCells = useMemo(() => occupiedBy(enemyFleet), [enemyFleet]);
  const myCells = useMemo(() => occupiedBy(myFleet), [myFleet]);
  const enemySunkCells = useMemo(() => sunkCellsOf(enemyFleet, myShots), [enemyFleet, myShots]);
  const mySunkCells = useMemo(() => sunkCellsOf(myFleet, enemyShots), [myFleet, enemyShots]);

  const enemyShipsSunk = enemyFleet.filter((p) => cellsOf(p)!.every((c) => myShots[c] === 2)).length;
  const hitsTaken = [...myCells].filter((c) => enemyShots[c] === 2).length;
  const myHits = [...enemyCells].filter((c) => myShots[c] === 2).length;

  const liveScore = Math.max(
    0,
    (myHits * HIT_PTS + enemyShipsSunk * SUNK_PTS) * MULT[difficulty] - hintsUsed * HINT_PENALTY
  );

  const shotsFired = myShots.filter((s) => s !== 0).length;

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors: hitsTaken,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { phase, enemyShipsSunk, hitsTaken, shots: shotsFired }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveScore, hitsTaken, hintsUsed, phase, enemyShipsSunk, shotsFired, events]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1700);
  }, []);

  const finish = useCallback(
    (outcome: 'won' | 'lost', finalScoreBase: number, errs: number, h: number) => {
      if (done.current) return;
      done.current = true;
      const intact = [...myCells].filter((c) => enemyShots[c] !== 2).length;
      const bonus =
        outcome === 'won'
          ? (intact * INTACT_PTS + Math.max(0, PAR_SEC[difficulty] - elapsedRef.current)) * MULT[difficulty]
          : 0;
      events.onFinish({
        outcome,
        score: Math.max(0, finalScoreBase + bonus),
        errors: errs,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { enemyShipsSunk: outcome === 'won' ? FLEET.length : enemyShipsSunk, hitsTaken: errs }
      });
    },
    [myCells, enemyShots, difficulty, events, enemyShipsSunk]
  );

  /* ---------- placement ---------- */

  const placedIdxs = useMemo(() => new Set(myFleet.map((p) => p.shipIdx)), [myFleet]);

  // ghost of the ship being positioned, anchored under the pointer
  const preview = useMemo(() => {
    if (phase !== 'place' || hoverCell === null || placedIdxs.has(selShip)) return null;
    const row = Math.floor(hoverCell / GRID);
    const col = hoverCell % GRID;
    const cells: number[] = [];
    let valid = true;
    for (let k = 0; k < FLEET[selShip].size; k++) {
      const r = orient === 'v' ? row + k : row;
      const c = orient === 'h' ? col + k : col;
      if (r >= GRID || c >= GRID) {
        valid = false;
        break;
      }
      cells.push(r * GRID + c);
    }
    const occupied = occupiedBy(myFleet);
    if (cells.some((c) => occupied.has(c))) valid = false;
    return { cells: new Set(cells), valid };
  }, [phase, hoverCell, placedIdxs, selShip, orient, myFleet]);

  // mouse wheel over your grid flips the ship between across and down
  useEffect(() => {
    const el = myBoardRef.current;
    if (!el || phase !== 'place') return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now - wheelAt.current < 140) return;
      wheelAt.current = now;
      sfx.tap();
      setOrient((o) => (o === 'h' ? 'v' : 'h'));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [phase]);

  const flashBad = (i: number) => {
    sfx.error();
    setBadCell(i);
    if (badTimer.current) clearTimeout(badTimer.current);
    badTimer.current = window.setTimeout(() => setBadCell(null), 400);
  };

  const tapPlaceCell = (i: number) => {
    if (paused) return;
    const r = Math.floor(i / GRID);
    const c = i % GRID;
    // tapping one of my placed ships picks it up again
    const grabbed = myFleet.find((p) => cellsOf(p)!.includes(i));
    if (grabbed) {
      sfx.tap();
      setMyFleet((f) => f.filter((p) => p !== grabbed));
      setSelShip(grabbed.shipIdx);
      return;
    }
    if (placedIdxs.has(selShip)) return;
    const p: Placed = { shipIdx: selShip, row: r, col: c, dir: orient };
    if (!canPlace(p, occupiedBy(myFleet))) {
      flashBad(i);
      return;
    }
    sfx.place();
    const next = [...myFleet, p];
    setMyFleet(next);
    const unplaced = FLEET.findIndex((_, s) => s !== selShip && !next.some((q) => q.shipIdx === s));
    if (unplaced !== -1) setSelShip(unplaced);
  };

  const startBattle = () => {
    if (myFleet.length !== FLEET.length) return;
    sfx.pop();
    setPhase('battle');
    showToast('Battle stations — fire at the enemy grid!');
  };

  /* ---------- my shots ---------- */

  const applySunkWater = useCallback(
    (p: Placed, shots: ShotResult[]): ShotResult[] => {
      if (!assists.autoWater) return shots;
      // ships may touch, so only stamp cells that are genuinely water —
      // mismarking a neighbouring ship segment would strand the game
      const next = [...shots];
      for (const c of surroundingCells(p)) if (next[c] === 0 && !enemyCells.has(c)) next[c] = 1;
      return next;
    },
    [assists.autoWater, enemyCells]
  );

  const fire = (i: number) => {
    if (paused || done.current || phase !== 'battle' || turn !== 'me' || myShots[i] !== 0) return;
    const hit = enemyCells.has(i);
    let shots = [...myShots];
    shots[i] = hit ? 2 : 1;
    setMyLast(i);

    if (hit) {
      sfx.boom();
      const ship = enemyFleet.find((p) => cellsOf(p)!.includes(i))!;
      const sunk = cellsOf(ship)!.every((c) => shots[c] === 2);
      if (sunk) {
        shots = applySunkWater(ship, shots);
        showToast(`You sunk the enemy ${FLEET[ship.shipIdx].name}!`);
      }
      setMyShots(shots);
      if ([...enemyCells].every((c) => shots[c] === 2)) {
        const base =
          ((myHits + 1) * HIT_PTS + FLEET.length * SUNK_PTS) * MULT[difficulty] - hintsUsed * HINT_PENALTY;
        finish('won', Math.max(0, base), hitsTaken, hintsUsed);
      }
      return; // a hit earns another shot
    }
    sfx.splash();
    setMyShots(shots);
    enemyMisses.current = 0;
    setTurn('enemy');
  };

  /* ---------- enemy turn (timeout keyed on pause — see CLAUDE.md) ---------- */

  useEffect(() => {
    if (phase !== 'battle' || turn !== 'enemy' || paused || done.current) return;
    const t = window.setTimeout(() => {
      const remaining = myFleet
        .filter((p) => !cellsOf(p)!.every((c) => enemyShots[c] === 2))
        .map((p) => FLEET[p.shipIdx].size);
      const target = pickShot(enemyShots, mySunkCells, remaining, difficulty);
      const hit = myCells.has(target);
      const shots = [...enemyShots];
      shots[target] = hit ? 2 : 1;
      setEnemyLast(target);
      setEnemyShots(shots);

      if (!hit) {
        sfx.splash();
        // pro/extreme salvo: the enemy keeps firing until it has missed
        // SALVO times this turn
        enemyMisses.current += 1;
        if (enemyMisses.current >= SALVO[difficulty]) {
          enemyMisses.current = 0;
          setTurn('me');
        } else {
          setEnemySalvo((s) => s + 1);
        }
        return;
      }
      sfx.boom();
      const ship = myFleet.find((p) => cellsOf(p)!.includes(target))!;
      if (cellsOf(ship)!.every((c) => shots[c] === 2)) {
        showToast(`Your ${FLEET[ship.shipIdx].name} was sunk!`);
      }
      if ([...myCells].every((c) => shots[c] === 2)) {
        finish('lost', liveScore, hitsTaken + 1, hintsUsed);
        return;
      }
      setEnemySalvo((s) => s + 1); // enemy hit — it fires again
    }, 750);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn, enemySalvo, paused]);

  /* ---------- radar assist ---------- */

  const radar = useCallback(() => {
    if (paused || done.current || phase !== 'battle' || !assists.radar) return;
    const candidates = [...enemyCells].filter((c) => myShots[c] === 0 && !pings.has(c));
    if (candidates.length === 0) return;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    assistsUsed.current.add('radar');
    setHintsUsed((h) => h + 1);
    setPings((p) => new Set(p).add(target));
    sfx.hint();
  }, [paused, phase, assists.radar, enemyCells, myShots, pings]);

  useEffect(() => {
    registerSnapshot(() => ({
      phase,
      myFleet,
      orient,
      enemyFleet,
      myShots,
      enemyShots,
      turn,
      hintsUsed,
      pings: [...pings],
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------- boards ---------- */

  const renderBoard = (
    kind: 'mine' | 'enemy',
    shots: ShotResult[],
    onCell: (i: number) => void
  ) => {
    const shipCells = kind === 'mine' ? myCells : enemyCells;
    const sunk = kind === 'mine' ? mySunkCells : enemySunkCells;
    const last = kind === 'mine' ? enemyLast : myLast;
    // finished boards reveal the surviving enemy fleet for review
    const revealShips = kind === 'mine' || phase === 'place' || done.current;
    const placing = kind === 'mine' && phase === 'place';
    return (
      <div
        className="bs-board"
        role="grid"
        aria-label={kind === 'mine' ? 'Your grid' : 'Enemy grid'}
        onPointerLeave={placing ? () => setHoverCell(null) : undefined}
      >
        <span className="bs-label" />
        {COLS.split('').map((l) => (
          <span key={l} className="bs-label">
            {l}
          </span>
        ))}
        {Array.from({ length: GRID }, (_, r) => (
          <Fragment key={r}>
            <span className="bs-label">{r + 1}</span>
            {Array.from({ length: GRID }, (_, c) => {
              const i = r * GRID + c;
              const cls = [
                'bs-cell',
                revealShips && shipCells.has(i) && shots[i] !== 2 ? 'ship' : '',
                shots[i] === 1 ? 'miss' : '',
                shots[i] === 2 ? (sunk.has(i) ? 'sunk' : 'hit') : '',
                kind === 'enemy' && pings.has(i) && shots[i] === 0 ? 'ping' : '',
                last === i ? 'last' : '',
                badCell === i && kind === 'mine' ? 'bad-flash' : '',
                placing && preview?.cells.has(i) ? (preview.valid ? 'ghost' : 'ghost-bad') : ''
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={c}
                  className={cls}
                  onClick={() => onCell(i)}
                  onPointerEnter={placing ? () => setHoverCell(i) : undefined}
                  aria-label={`${COLS[c]}${r + 1}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    );
  };

  /* ---------- fleet panel ---------- */

  const fleetColumn = (kind: 'mine' | 'enemy') => {
    const shots = kind === 'mine' ? enemyShots : myShots;
    const fleet = kind === 'mine' ? myFleet : enemyFleet;
    return (
      <div className="bs-fleet-col">
        <span className="bs-fleet-title">{kind === 'mine' ? 'Your fleet' : 'Enemy fleet'}</span>
        {FLEET.map((def, s) => {
          const p = fleet.find((q) => q.shipIdx === s);
          const cells = p ? cellsOf(p)! : [];
          const isSunk = p !== undefined && cells.every((c) => shots[c] === 2);
          const dockState =
            phase === 'place' && kind === 'mine'
              ? placedIdxs.has(s)
                ? 'placed'
                : selShip === s
                  ? 'sel'
                  : ''
              : '';
          const row = (
            <>
              <span className="bs-ship-name">{def.name}</span>
              <span className="bs-pips">
                {Array.from({ length: def.size }, (_, k) => {
                  const damaged =
                    kind === 'mine' ? (p ? shots[cells[k]] === 2 : false) : isSunk;
                  return <span key={k} className={`bs-pip ${kind} ${damaged ? 'dmg' : ''}`} />;
                })}
              </span>
            </>
          );
          return phase === 'place' && kind === 'mine' ? (
            <button
              key={def.id}
              className={`bs-ship-row dock ${dockState}`}
              onClick={() => {
                sfx.tap();
                setSelShip(s);
              }}
            >
              {row}
            </button>
          ) : (
            <span key={def.id} className={`bs-ship-row ${isSunk ? 'sunkrow' : ''}`}>
              {row}
            </span>
          );
        })}
      </div>
    );
  };

  /* ---------- render ---------- */

  const activePings = [...pings].filter((c) => myShots[c] === 0);

  return (
    <div className={`battleship ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        {phase === 'place' ? (
          <span className="info-item">
            Deploy: <b>{myFleet.length} / {FLEET.length}</b> ships
          </span>
        ) : (
          <>
            <span className={`info-item ${turn === 'me' ? '' : 'bad'}`}>
              <b>{done.current ? 'Battle over' : turn === 'me' ? 'Your turn' : 'Enemy firing…'}</b>
            </span>
            <span className="info-item">
              <b>{liveScore.toLocaleString()}</b> pts
            </span>
            <span className="info-item">
              Sunk: <b>{enemyShipsSunk} / {FLEET.length}</b>
            </span>
          </>
        )}
      </div>

      {phase === 'battle' && (
        <div className="bs-board-card fx-card">
          <span className="bs-board-caption">Enemy waters</span>
          {renderBoard('enemy', myShots, fire)}
        </div>
      )}

      <div className="bs-panel fx-card">
        {fleetColumn('mine')}
        {phase === 'battle' && fleetColumn('enemy')}
        {phase === 'place' && (
          <p className="bs-place-help">
            Pick a ship, then tap your grid to place it. Tap a placed ship to move it. The
            Across/Down button — or your mouse wheel over the grid — rotates the ship.
          </p>
        )}
      </div>

      <div className="bs-board-card fx-card" ref={myBoardRef}>
        <span className="bs-board-caption">{phase === 'place' ? 'Place your fleet' : 'Your waters'}</span>
        {renderBoard('mine', enemyShots, phase === 'place' ? tapPlaceCell : () => undefined)}
      </div>

      {(phase === 'place' || assists.radar) && (
      <div className="game-tools fx-card">
        {phase === 'place' ? (
          <div className="sudoku-controls">
            <PadTool onClick={() => setOrient((o) => (o === 'h' ? 'v' : 'h'))}>
              <RestartIcon />
              <span>{orient === 'h' ? 'Across' : 'Down'}</span>
            </PadTool>
            <PadTool
              silent
              onClick={() => {
                sfx.place();
                setMyFleet(randomFleet());
              }}
            >
              <TargetIcon />
              <span>Random</span>
            </PadTool>
            <PadTool onClick={() => setMyFleet([])} disabled={myFleet.length === 0}>
              <EraseIcon />
              <span>Clear</span>
            </PadTool>
            <PadTool active silent onClick={startBattle} disabled={myFleet.length !== FLEET.length}>
              <CheckIcon />
              <span>To battle</span>
            </PadTool>
          </div>
        ) : (
          <>
            <div className="sudoku-controls">
              <PadTool silent onClick={radar} disabled={turn !== 'me' || done.current}>
                <BulbIcon />
                <span>Radar ping</span>
              </PadTool>
            </div>
            {activePings.length > 0 && (
              <p className="bs-radar-note">
                <span className="bs-radar-dot" />
                Radar contact at{' '}
                {activePings.map((c) => `${COLS[c % GRID]}${Math.floor(c / GRID) + 1}`).join(' · ')}
              </p>
            )}
          </>
        )}
      </div>
      )}

      {toast && <div className="bs-toast">{toast}</div>}
    </div>
  );
}

