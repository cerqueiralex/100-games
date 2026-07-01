import { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { playNote, sfx } from '../../platform/audio';
import { RestartIcon } from '../../platform/design/icons';

interface Config {
  target: number;
  stepMs: number;
  mult: number;
}

const CONFIG: Record<Difficulty, Config> = {
  easy: { target: 8, stepMs: 620, mult: 1 },
  medium: { target: 12, stepMs: 480, mult: 2 },
  hard: { target: 16, stepMs: 370, mult: 3 }
};

/* one tone per pad: C4 E4 G4 C5 */
const FREQS = [261.63, 329.63, 392.0, 523.25];
const MAX_STRIKES = 2;

export function SimonGame({ difficulty, assists, paused, events }: GameProps) {
  const cfg = CONFIG[difficulty];

  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<'idle' | 'watch' | 'input'>('idle');
  const [lit, setLit] = useState<number | null>(null);
  const [inputPos, setInputPos] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  const done = useRef(false);
  const seqRef = useRef<number[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timeouts = useRef<number[]>([]);
  const wasPaused = useRef(false);
  const assistsUsed = useRef<Set<string>>(
    new Set(assists.slowPlayback ? ['slowPlayback'] : [])
  );

  const clearAll = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };
  const schedule = (fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms));
  };

  const playSequence = useCallback(
    (seq: number[]) => {
      clearAll();
      setPhase('watch');
      setLit(null);
      const step = cfg.stepMs * (assists.slowPlayback ? 1.5 : 1);
      seq.forEach((pad, i) => {
        schedule(() => {
          setLit(pad);
          playNote(FREQS[pad], step * 0.55, 'triangle');
        }, 500 + i * step);
        schedule(() => setLit(null), 500 + i * step + step * 0.6);
      });
      schedule(() => {
        setPhase('input');
        setInputPos(0);
      }, 500 + seq.length * step + 150);
    },
    [cfg.stepMs, assists.slowPlayback]
  );

  // first round
  useEffect(() => {
    const first = [Math.floor(Math.random() * 4)];
    seqRef.current = first;
    setSequence(first);
    playSequence(first);
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pausing mid-playback: stop, then replay the whole sequence on resume
  useEffect(() => {
    if (paused) {
      wasPaused.current = true;
      clearAll();
      setLit(null);
    } else if (wasPaused.current) {
      wasPaused.current = false;
      if (!done.current && phaseRef.current !== 'input' && seqRef.current.length > 0) {
        playSequence(seqRef.current);
      }
    }
  }, [paused, playSequence]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { round: seqRef.current.length }
    });
  }, [score, errors, hintsUsed, events]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', finalScore: number, e: number, h: number) => {
      if (done.current) return;
      done.current = true;
      clearAll();
      events.onFinish({
        outcome,
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { round: seqRef.current.length }
      });
    },
    [events]
  );

  const press = (pad: number) => {
    if (paused || done.current || phase !== 'input') return;
    setLit(pad);
    playNote(FREQS[pad], 220, 'triangle');
    schedule(() => setLit((l) => (l === pad ? null : l)), 200);

    if (pad === seqRef.current[inputPos]) {
      const nextPos = inputPos + 1;
      if (nextPos === seqRef.current.length) {
        const gained = seqRef.current.length * 10 * cfg.mult;
        const nextScore = score + gained;
        setScore(nextScore);
        if (seqRef.current.length >= cfg.target) {
          finish('won', nextScore, errors, hintsUsed);
          return;
        }
        const next = [...seqRef.current, Math.floor(Math.random() * 4)];
        seqRef.current = next;
        setSequence(next);
        setPhase('idle');
        schedule(() => playSequence(next), 800);
      } else {
        setInputPos(nextPos);
      }
    } else {
      const nextErrors = errors + 1;
      setErrors(nextErrors);
      sfx.error();
      if (assists.secondChance && strikes < MAX_STRIKES) {
        assistsUsed.current.add('secondChance');
        setStrikes(strikes + 1);
        setPhase('idle');
        schedule(() => playSequence(seqRef.current), 900);
      } else {
        finish('lost', score, nextErrors, hintsUsed);
      }
    }
  };

  const replay = () => {
    if (paused || done.current || phase !== 'input' || !assists.repeatSequence) return;
    assistsUsed.current.add('repeatSequence');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    playSequence(seqRef.current);
  };

  return (
    <div className={`simon ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Round: <b>{sequence.length} / {cfg.target}</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        {assists.secondChance && (
          <span className={`info-item ${strikes > 0 ? 'bad' : ''}`}>
            Lives: <b>{MAX_STRIKES + 1 - strikes}</b>
          </span>
        )}
      </div>

      <p className="simon-status">
        {phase === 'watch' ? 'Watch the sequence…' : phase === 'input' ? 'Your turn' : '…'}
      </p>

      <div className={`simon-board ${phase !== 'input' ? 'watching' : ''}`}>
        {[0, 1, 2, 3].map((pad) => (
          <button
            key={pad}
            className={`simon-pad p${pad} ${lit === pad ? 'lit' : ''}`}
            onClick={() => press(pad)}
            aria-label={`Pad ${pad + 1}`}
          />
        ))}
      </div>

      {assists.repeatSequence && (
        <div className="sudoku-controls">
          <button className="pad-tool" onClick={replay} disabled={phase !== 'input'}>
            <RestartIcon />
            <span>Replay</span>
          </button>
        </div>
      )}
    </div>
  );
}
