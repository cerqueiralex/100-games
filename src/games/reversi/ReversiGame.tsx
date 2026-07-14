import { useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  DARK,
  LIGHT,
  applyMove,
  countDiscs,
  flipLines,
  hasMove,
  initialBoard,
  isGameOver,
  isLegal,
  legalMoves,
  opponent,
  type Player
} from './logic/board';
import { chooseMove, suggestMove } from './logic/ai';

type Mode = 'bot' | 'friend';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_BASE = 400;
const MARGIN_PTS = 12;
const HINT_PENALTY = 60;

/** delay between successive discs flipping along a captured line (ms) */
const FLIP_STAGGER = 60;
const FLIP_DUR = 340;
const DROP_LEAD = 120;
const THINK_MS = 460;

interface RevConfig {
  mode: Mode;
  /** vs Robot: the disc the human plays. vs Friend: always Dark (device owner). */
  myDisc: Player;
}

interface RevSave extends RevConfig {
  board: number[];
  toMove: Player;
  hintsUsed: number;
  assistsUsed: string[];
}

/** transient flip/drop animation for the last committed move */
interface Anim {
  placed: number;
  flips: Record<number, Player>;
  delay: Record<number, number>;
}

const discName = (p: Player) => (p === DARK ? 'Dark' : 'Light');

export function ReversiGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  const saved = savedState && (savedState as RevSave).board ? (savedState as RevSave) : undefined;

  const [config, setConfig] = useState<RevConfig | null>(
    saved ? { mode: saved.mode, myDisc: saved.myDisc } : null
  );
  // pre-game menu picks
  const [pickMode, setPickMode] = useState<Mode>('bot');
  const [pickDisc, setPickDisc] = useState<Player>(DARK);

  const [board, setBoard] = useState<number[]>(() => (saved ? [...saved.board] : initialBoard()));
  const [toMove, setToMove] = useState<Player>(saved?.toMove ?? DARK);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [badCell, setBadCell] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const animTimer = useRef<number | null>(null);
  const popTimers = useRef<number[]>([]);
  const badTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (animTimer.current) clearTimeout(animTimer.current);
      if (badTimer.current) clearTimeout(badTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      popTimers.current.forEach(clearTimeout);
    },
    []
  );

  // the clock only runs once the match is configured — not on the menu
  useEffect(() => {
    holdClock(config === null);
  }, [config, holdClock]);

  const botDisc = config ? opponent(config.myDisc) : LIGHT;
  const ownerDisc = config?.myDisc ?? DARK;
  const humanTurn = config
    ? config.mode === 'friend' || toMove === config.myDisc
    : false;

  const legalSet = useMemo(() => new Set(legalMoves(board, toMove)), [board, toMove]);
  const counts = useMemo(() => countDiscs(board), [board]);

  // passive assists count as help whenever enabled during a live game
  useEffect(() => {
    if (config && !done.current && assists['legal-dots']) assistsUsed.current.add('legal-dots');
  }, [config, assists]);
  useEffect(() => {
    if (config && !done.current && assists['disc-count']) assistsUsed.current.add('disc-count');
  }, [config, assists]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1700);
  };

  /* ---------- live stats + finish ---------- */

  useEffect(() => {
    if (!config) return;
    const my = ownerDisc === DARK ? counts.dark : counts.light;
    const opp = ownerDisc === DARK ? counts.light : counts.dark;
    const live = Math.max(0, Math.round((my - opp) * MARGIN_PTS * MULT[difficulty] - hintsUsed * HINT_PENALTY));
    events.onStats({
      score: live,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { dark: counts.dark, light: counts.light, you: my, opponent: opp, mode: config.mode }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, hintsUsed, config, events]);

  const finishGame = (b: number[]) => {
    if (done.current || !config) return;
    done.current = true;
    const { dark, light } = countDiscs(b);
    const my = ownerDisc === DARK ? dark : light;
    const opp = ownerDisc === DARK ? light : dark;
    const won = my > opp;
    const tie = my === opp;
    const margin = my - opp;
    const score = won
      ? Math.max(0, Math.round((WIN_BASE + margin * MARGIN_PTS) * MULT[difficulty] - hintsUsed * HINT_PENALTY))
      : 0;

    let headline: string;
    let subline: string;
    if (config.mode === 'friend') {
      headline = tie ? "It's a tie!" : dark > light ? 'Dark wins!' : 'Light wins!';
      subline = `Discs ${dark}–${light}`;
    } else {
      headline = tie ? "It's a tie" : won ? 'You win!' : 'Robot wins';
      subline = won ? `Discs ${my}–${opp} · +${score.toLocaleString()} pts` : `Discs ${my}–${opp}`;
    }

    events.onFinish({
      outcome: won ? 'won' : 'lost',
      score,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      hideStats: true,
      headline,
      subline,
      extra: { dark, light, mode: config.mode, difficulty }
    });
  };

  // finish once the board is settled and neither side can move
  useEffect(() => {
    if (!config || done.current || anim) return;
    if (isGameOver(board)) finishGame(board);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, anim, config]);

  /* ---------- move commit + flip animation ---------- */

  const advanceTurn = (nb: number[], justMoved: Player) => {
    const opp = opponent(justMoved);
    if (hasMove(nb, opp)) {
      setToMove(opp);
      return;
    }
    if (hasMove(nb, justMoved)) {
      // opponent has no legal move — it passes, same side plays again
      setToMove(justMoved);
      showToast(
        config?.mode === 'bot'
          ? opp === botDisc
            ? 'Robot has no move — you play again'
            : 'No move — Robot plays again'
          : `${discName(opp)} has no move — passes`
      );
      return;
    }
    // neither can move → game over (handled by the finish effect)
    setToMove(opp);
  };

  const commitMove = (i: number, player: Player) => {
    const lines = flipLines(board, i, player);
    const nb = applyMove(board, i, player);

    const flips: Record<number, Player> = {};
    const delay: Record<number, number> = {};
    let maxDelay = 0;
    for (const line of lines) {
      line.forEach((cell, k) => {
        flips[cell] = player;
        const d = k * FLIP_STAGGER;
        delay[cell] = d;
        if (d > maxDelay) maxDelay = d;
      });
    }

    setBoard(nb);
    setLastMove(i);
    setHintCell(null);
    setAnim({ placed: i, flips, delay });
    sfx.place();

    // one pop per outward ring, capped so a big capture doesn't machine-gun
    const rings = [...new Set(Object.values(delay))].sort((a, z) => a - z);
    popTimers.current.forEach(clearTimeout);
    popTimers.current = [];
    rings.slice(0, 6).forEach((d) => {
      popTimers.current.push(window.setTimeout(() => sfx.pop(), DROP_LEAD + d));
    });

    if (animTimer.current) clearTimeout(animTimer.current);
    animTimer.current = window.setTimeout(() => {
      setAnim(null);
      advanceTurn(nb, player);
    }, DROP_LEAD + maxDelay + FLIP_DUR + 40);
  };

  /* ---------- robot turn (deferred off the render path, pause-aware) ---------- */

  useEffect(() => {
    if (!config || config.mode !== 'bot' || done.current || paused || anim) return;
    if (toMove !== botDisc || !hasMove(board, botDisc)) return;
    const t = window.setTimeout(() => {
      const mv = chooseMove(board, botDisc, difficulty);
      if (mv !== null) commitMove(mv, botDisc);
    }, THINK_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toMove, config, paused, anim, board]);

  /* ---------- input ---------- */

  const flashBad = (i: number) => {
    sfx.error();
    setBadCell(i);
    if (badTimer.current) clearTimeout(badTimer.current);
    badTimer.current = window.setTimeout(() => setBadCell(null), 320);
  };

  const tap = (i: number) => {
    if (!config || paused || done.current || anim) return;
    if (!humanTurn || isGameOver(board)) return;
    if (board[i] !== 0) return;
    if (!isLegal(board, i, toMove)) {
      flashBad(i);
      return;
    }
    commitMove(i, toMove);
  };

  const useHint = () => {
    if (!config || config.mode !== 'bot' || paused || done.current || anim) return;
    if (toMove !== config.myDisc || !assists.hint) return;
    const m = suggestMove(board, config.myDisc);
    if (m === null) return;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    setHintCell(m);
  };

  /* ---------- save / resume ---------- */

  useEffect(() => {
    registerSnapshot(() => {
      if (!config) return null;
      // mid-animation the move is already committed to `board` but the turn
      // hasn't advanced — snapshot the settled next mover so a resume can't
      // let the same side move twice
      let snapToMove = toMove;
      if (anim) {
        const opp = opponent(toMove);
        snapToMove = hasMove(board, opp) ? opp : toMove;
      }
      return {
        mode: config.mode,
        myDisc: config.myDisc,
        board,
        toMove: snapToMove,
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      } satisfies RevSave;
    });
  });

  /* ---------- pre-game menu ---------- */

  if (!config) {
    return (
      <div className="reversi">
        <div className="rev-setup fx-card">
          <h3 className="rev-setup-title">Opponent</h3>
          <div className="rev-opt-row cols-2">
            <button
              className={`rev-opt ${pickMode === 'bot' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('bot');
              }}
            >
              Robot
            </button>
            <button
              className={`rev-opt ${pickMode === 'friend' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('friend');
              }}
            >
              2 players · one phone
            </button>
          </div>

          {pickMode === 'bot' && (
            <>
              <h3 className="rev-setup-title">Your disc</h3>
              <div className="rev-opt-row cols-2">
                <button
                  className={`rev-opt disc-pick ${pickDisc === DARK ? 'active' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    setPickDisc(DARK);
                  }}
                >
                  <span className="rev-swatch dark" /> Dark
                </button>
                <button
                  className={`rev-opt disc-pick ${pickDisc === LIGHT ? 'active' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    setPickDisc(LIGHT);
                  }}
                >
                  <span className="rev-swatch light" /> Light
                </button>
              </div>
              <p className="rev-setup-note">Dark always moves first.</p>
            </>
          )}
          {pickMode === 'friend' && (
            <p className="rev-setup-note">
              Pass the phone each turn. Dark moves first; most discs at the end wins.
            </p>
          )}

          <button
            className="primary-btn"
            onClick={() => {
              sfx.place();
              setConfig({ mode: pickMode, myDisc: pickMode === 'bot' ? pickDisc : DARK });
              setBoard(initialBoard());
              setToMove(DARK);
            }}
          >
            Start game
          </button>
        </div>
      </div>
    );
  }

  /* ---------- play ---------- */

  const discCountOn = !!assists['disc-count'];
  const legalDotsOn = !!assists['legal-dots'];

  const nameA = config.mode === 'bot' ? (ownerDisc === DARK ? 'You' : 'Robot') : 'Dark';
  const nameB = config.mode === 'bot' ? (ownerDisc === DARK ? 'Robot' : 'You') : 'Light';

  const status = done.current
    ? 'Game over'
    : config.mode === 'bot'
      ? toMove === config.myDisc
        ? 'Your move'
        : 'Robot is thinking…'
      : `${discName(toMove)} to move`;

  return (
    <div className={`reversi ${paused ? 'board-hidden' : ''}`}>
      <div className="rev-score">
        <div className={`rev-tally ${toMove === DARK ? 'active' : ''}`}>
          <span className="rev-swatch dark" />
          <span className="rev-tally-name">{nameA}</span>
          {discCountOn && <b>{counts.dark}</b>}
        </div>
        <span className="rev-turn">{status}</span>
        <div className={`rev-tally ${toMove === LIGHT ? 'active' : ''}`}>
          {discCountOn && <b>{counts.light}</b>}
          <span className="rev-tally-name">{nameB}</span>
          <span className="rev-swatch light" />
        </div>
      </div>

      <div className="rev-board-card fx-card">
        <div className="rev-board" role="grid" aria-label="Reversi board">
          {board.map((v, i) => {
            const flipTo = anim?.flips[i];
            const showLegal = legalDotsOn && humanTurn && !anim && !done.current && legalSet.has(i);
            const cls = [
              'rev-cell',
              lastMove === i ? 'last' : '',
              hintCell === i ? 'hint' : '',
              badCell === i ? 'bad' : ''
            ]
              .filter(Boolean)
              .join(' ');
            const discCls = [
              'rev-disc',
              v === DARK ? 'dark' : 'light',
              anim?.placed === i ? 'placing' : '',
              flipTo ? `flipping to-${flipTo === DARK ? 'dark' : 'light'}` : ''
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button key={i} className={cls} onClick={() => tap(i)} aria-label={`cell ${i}`}>
                {v !== 0 && (
                  <span
                    className={discCls}
                    style={flipTo !== undefined ? { animationDelay: `${anim!.delay[i]}ms` } : undefined}
                  />
                )}
                {showLegal && <span className={`rev-dot ${toMove === DARK ? 'dark' : 'light'}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {config.mode === 'bot' && assists.hint && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool
              silent
              onClick={useHint}
              disabled={toMove !== config.myDisc || !!anim || done.current}
            >
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          </div>
        </div>
      )}

      {toast && <div className="rev-toast">{toast}</div>}
    </div>
  );
}
