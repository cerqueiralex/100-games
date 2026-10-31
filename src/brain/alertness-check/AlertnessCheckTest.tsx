import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { BrainTestProps } from '../../platform/brain/types';
import { eventTime, now } from '../../platform/brain/timing';
import { Countdown, PhaseCard, useFeedback } from '../../platform/components/fx';
import { sfx } from '../../platform/audio';
import { DUR, haptic } from '../../platform/motion';
import { CheckIcon, InfoIcon, TargetIcon, WarnIcon } from '../../platform/design/icons';
import { PVT, PvtSession, practiceSeed, type PvtDisplay, type PvtPress } from './logic/protocol';
import { buildOutcome, scorePvt } from './logic/scoring';

/**
 * Alertness Check — the Reaction benchmark (SCIENCE.md §1.10, PVT-B).
 *
 *  first run → 20 s practice with coaching (unscored)
 *  every run → setup card → 3-2-1 → 180 s scored block → onFinish
 *
 * Timing (SCIENCE.md C2): ONE requestAnimationFrame loop feeds the pure
 * PvtSession machine (logic/protocol.ts) its frame timestamps; the counter is
 * revealed by an opacity write inside the callback whose timestamp becomes
 * the onset, and counts up every frame through direct DOM writes — never
 * React state, which would paint a frame late. Taps are read on pointerdown
 * with the event's own timestamp. Nothing in the stimulus box transitions.
 *
 * Feedback (C3): in the scored block only what the paradigm prescribes —
 * the frozen RT for 1 s, "FS", and "OVERRUN" with a sound. The practice adds
 * coaching, bursts and sounds. Interruption class A: the runner ends an
 * interrupted run itself, so there is no pause logic here.
 */

type Phase = 'practice-intro' | 'practice' | 'practice-done' | 'ready' | 'countdown' | 'block' | 'finishing';

interface Coach {
  id: number;
  tone: 'good' | 'warn' | 'info';
  text: string;
}


export function AlertnessCheckTest({ mode, firstRun, seed, ctx, onProgress, onFinish }: BrainTestProps) {
  const [phase, setPhase] = useState<Phase>(mode === 'practice' || firstRun ? 'practice-intro' : 'ready');
  const [coach, setCoach] = useState<Coach | null>(null);
  const [practiceNote, setPracticeNote] = useState('');
  const fb = useFeedback();

  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<HTMLSpanElement>(null);
  const digitsRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const capRef = useRef<HTMLSpanElement>(null);

  const sessRef = useRef<PvtSession | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const cb = useRef({ onProgress, onFinish });
  cb.current = { onProgress, onFinish };
  const fbRef = useRef(fb);
  fbRef.current = fb;
  const finished = useRef(false);
  const coachId = useRef(0);
  const timers = useRef<number[]>([]);
  const painted = useRef({ digits: '0', digitsOn: false, word: '', wordOn: false, cap: '', kind: '' });

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    cb.current.onProgress(0);
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  /** write what the panel shows — DOM only, and only what changed */
  const paint = useCallback((d: PvtDisplay, ts: number) => {
    const p = painted.current;
    let digits = p.digits;
    let digitsOn = false;
    let word = p.word;
    let wordOn = false;
    let cap = '';
    switch (d.kind) {
      case 'blank':
        digits = '0'; // pre-set while hidden, so the reveal is an opacity flip only
        break;
      case 'counter':
        digits = String(Math.max(0, Math.floor(ts - d.onset)));
        digitsOn = true;
        break;
      case 'rt':
        digits = String(Math.round(d.rt));
        digitsOn = true;
        break;
      case 'fs':
        word = 'FS';
        wordOn = true;
        cap = 'False start';
        break;
      case 'overrun':
        word = 'OVERRUN';
        wordOn = true;
        cap = 'No response for 30 seconds';
        break;
    }
    const dEl = digitsRef.current;
    const wEl = wordRef.current;
    const cEl = capRef.current;
    if (dEl) {
      if (p.digitsOn !== digitsOn && !digitsOn) dEl.style.opacity = '0';
      if (p.digits !== digits) dEl.textContent = digits;
      if (p.digitsOn !== digitsOn && digitsOn) dEl.style.opacity = '1';
    }
    if (wEl) {
      if (p.word !== word) wEl.textContent = word;
      if (p.wordOn !== wordOn) wEl.style.opacity = wordOn ? '1' : '0';
    }
    if (cEl && p.cap !== cap) cEl.textContent = cap;
    if (p.kind !== d.kind && rootRef.current) {
      rootRef.current.dataset.display = d.kind;
      rootRef.current.dataset.stim = d.kind === 'counter' ? '1' : '0';
    }
    painted.current = { digits, digitsOn, word, wordOn, cap, kind: d.kind };
  }, []);

  const say = useCallback((tone: Coach['tone'], text: string) => {
    coachId.current += 1;
    setCoach({ id: coachId.current, tone, text });
  }, []);

  /** practice only: corrective feedback on every tap */
  const coachFor = useCallback(
    (ev: PvtPress, at: { x: number; y: number } | undefined) => {
      const f = fbRef.current;
      if (ev.kind === 'false-start') {
        f.bad(at, { sound: false });
        sfx.early();
        say(
          'warn',
          ev.stimulus
            ? 'Faster than a reaction can be — that counts as a false start.'
            : 'False start — wait until the numbers appear.'
        );
      } else if (ev.lapse) {
        f.neutral(at);
        say('info', `${Math.round(ev.rt)} ms — slow enough to count as a lapse. Tap the moment it starts.`);
      } else {
        f.good(at);
        say('good', `${Math.round(ev.rt)} ms — that’s it. Stay ready for the next one.`);
      }
    },
    [say]
  );

  /** a tap or key press at `t` (performance.now() clock) */
  const respond = useCallback(
    (t: number, at?: { x: number; y: number }) => {
      const ph = phaseRef.current;
      const sess = sessRef.current;
      if ((ph !== 'practice' && ph !== 'block') || !sess) return;
      const ev = sess.press(t);
      if (!ev) return;
      paint(sess.display, t);
      if (ph === 'practice') coachFor(ev, at);
    },
    [paint, coachFor]
  );

  /** the block ended (its stop rule fired inside the machine) */
  const blockEnded = useCallback(
    (practice: boolean, sess: PvtSession) => {
      if (practice) {
        const s = scorePvt(sess.rows, sess.offsetMs);
        const parts = [`${s.valid} ${s.valid === 1 ? 'response' : 'responses'}`];
        if (Number.isFinite(s.medianRt)) parts.push(`median ${Math.round(s.medianRt)} ms`);
        parts.push(`${s.falseStarts} false ${s.falseStarts === 1 ? 'start' : 'starts'}`);
        setPracticeNote(`Practice: ${parts.join(' · ')}.`);
        say('good', 'Practice complete.');
        later(DUR.emphasis + 400, () => {
          paint({ kind: 'blank' }, 0); // the scored block starts on an empty box
          setPhase(mode === 'practice' ? 'practice-done' : 'ready');
        });
        return;
      }
      cb.current.onProgress(1);
      sfx.place(); // block locked — the results chime is the runner's
      setPhase('finishing');
      later(PVT.feedbackMs, () => {
        if (finished.current) return;
        finished.current = true;
        cb.current.onFinish(buildOutcome(sess.rows, sess.offsetMs));
      });
    },
    [later, mode, paint, say]
  );

  // the trial loop — one rAF loop per block (practice or scored)
  useEffect(() => {
    if (phase !== 'practice' && phase !== 'block') return;
    const practice = phase === 'practice';
    const sess = new PvtSession({
      seed: practice ? practiceSeed(seed) : seed,
      offsetMs: ctxRef.current.platformOffsetMs,
      durationMs: practice ? PVT.practiceMs : PVT.blockMs
    });
    sessRef.current = sess;
    const t0 = now();
    sess.begin(t0);
    paint(sess.display, t0);
    let alive = true;
    let raf = 0;
    let lastProgress = -Infinity;
    const tick = (ts: number) => {
      if (!alive) return;
      const f = sess.frame(ts);
      paint(sess.display, ts);
      if (f.timedOut) {
        sfx.wrong();
        haptic('bad');
        if (practice) say('warn', 'No tap for 30 seconds — that’s an overrun.');
      }
      if (!practice && ts - lastProgress >= 250) {
        lastProgress = ts;
        cb.current.onProgress(Math.min(0.99, Math.max(0, sess.elapsed(ts) / PVT.blockMs)));
      }
      if (sess.ended) {
        alive = false;
        blockEnded(practice, sess);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [phase, seed, paint, say, blockEnded]);

  // the space bar responds too (keyboard devices; the zone stays the touch target)
  useEffect(() => {
    if (phase !== 'practice' && phase !== 'block') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      e.preventDefault();
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      respond(eventTime(e));
      pressLook(zoneRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, respond]);

  const onZoneDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (phaseRef.current !== 'practice' && phaseRef.current !== 'block') return;
    const t = eventTime(e.nativeEvent);
    const root = rootRef.current;
    const rr = root?.getBoundingClientRect();
    const at = rr && rr.width > 0 ? { x: ((e.clientX - rr.left) / rr.width) * 100, y: ((e.clientY - rr.top) / rr.height) * 100 } : undefined;
    respond(t, at);
    pressLook(e.currentTarget);
    const host = ripplesRef.current;
    if (host) {
      const zr = e.currentTarget.getBoundingClientRect();
      ripple(host, e.clientX - zr.left, e.clientY - zr.top);
    }
  };

  const onPanelDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    // taps on the panel never count — the finger would cover the counter
    if (phaseRef.current === 'practice') say('info', 'Tap the zone below the panel, so your finger never hides the numbers.');
  };

  const finishPractice = () => {
    if (finished.current) return;
    finished.current = true;
    cb.current.onFinish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] });
  };

  const live = phase === 'practice' || phase === 'block' || phase === 'countdown' || phase === 'finishing';
  const card = cardFor(phase, {
    practiceNote,
    startPractice: () => setPhase('practice'),
    startBlock: () => setPhase('countdown'),
    finishPractice
  });

  return (
    <div ref={rootRef} className={`ac ac-${phase}`} data-phase={phase} data-display="blank" data-stim="0">
      <div className="ac-panel" onPointerDown={onPanelDown} onContextMenu={(e) => e.preventDefault()} role="img" aria-label="Stimulus panel: a red box where a yellow millisecond counter appears">
        {phase === 'practice' && <span className="ac-chip">Practice</span>}
        <div className="ac-box">
          <span ref={digitsRef} className="ac-digits">
            0
          </span>
          <span ref={wordRef} className="ac-word" />
        </div>
        <span ref={capRef} className="ac-cap" aria-live="polite" />
      </div>

      {live ? (
        <div
          ref={zoneRef}
          className={`ac-zone fx-card${phase === 'finishing' ? ' is-done' : ''}`}
          onPointerDown={onZoneDown}
          onContextMenu={(e) => e.preventDefault()}
          role="button"
          tabIndex={-1}
          aria-label="Response zone: tap here the moment the counter starts"
          data-ac-zone
        >
          <span ref={ripplesRef} className="ac-ripples" aria-hidden />
          {phase === 'practice' && coach && (
            <p key={coach.id} className={`ac-coach tone-${coach.tone}`} role="status">
              {coach.tone === 'good' ? <CheckIcon size={18} /> : coach.tone === 'warn' ? <WarnIcon size={18} /> : <InfoIcon size={18} />}
              <span>{coach.text}</span>
            </p>
          )}
          {/* the countdown veils the zone only: the panel stays in full view */}
          {phase === 'countdown' && <Countdown label="Eyes on the red box" onDone={() => setPhase('block')} />}
          {phase === 'finishing' ? (
            <div className="ac-face ac-face-done" role="status">
              <span className="ac-done-badge">
                <CheckIcon size={30} />
              </span>
              <span className="ac-face-label">Three minutes done</span>
              <span className="ac-face-sub">Your results are next</span>
            </div>
          ) : (
            <div className="ac-face" aria-hidden>
              <span className="ac-target">
                <span className="ac-target-ring" />
                <TargetIcon size={40} />
              </span>
              <span className="ac-face-label">Tap here</span>
              <span className="ac-face-sub">the moment the numbers start</span>
            </div>
          )}
        </div>
      ) : (
        <div className="ac-slot" key={phase}>
          {card}
        </div>
      )}

      {fb.layer}
    </div>
  );
}

/** the between-phase cards (C1: the same moments read the same way every run) */
function cardFor(
  phase: Phase,
  o: { practiceNote: string; startPractice: () => void; startBlock: () => void; finishPractice: () => void }
): ReactNode {
  if (phase === 'practice-intro') {
    return (
      <PhaseCard
        kicker="Practice · not scored"
        title="Try it for 20 seconds"
        body={
          <>
            Rest your index finger on the zone below the panel. When yellow numbers start counting inside the red box, tap at once
            — and not before.
          </>
        }
        action="Start practice"
        onAction={o.startPractice}
      />
    );
  }
  if (phase === 'practice-done') {
    return (
      <PhaseCard
        kicker="Practice complete"
        title="That’s the whole task"
        body={
          <>
            {o.practiceNote && <span className="ac-note">{o.practiceNote}</span>}
            The scored check runs exactly like this for three minutes.
          </>
        }
        action="Done"
        onAction={o.finishPractice}
      />
    );
  }
  // 'ready' — before every scored block
  return (
    <PhaseCard
      kicker="Scored · 3 minutes"
      title={o.practiceNote ? 'Now the real check' : 'Alertness Check'}
      body={
        <>
          {o.practiceNote && <span className="ac-note">{o.practiceNote}</span>}
          <ol className="ac-steps">
            <li>Phone flat on a table, in portrait.</li>
            <li>Index finger resting on the zone below.</li>
            <li>Tap the instant the numbers start — until the end.</li>
          </ol>
          <span className="ac-fine">Same posture each time · Do Not Disturb · sound on · not within 30 minutes of waking</span>
        </>
      }
      action="Start"
      onAction={o.startBlock}
    />
  );
}

/** a paint-only press look on the zone (works for touch, mouse and the space bar) */
function pressLook(el: HTMLElement | null) {
  if (!el) return;
  el.setAttribute('data-down', '');
  window.setTimeout(() => el.removeAttribute('data-down'), DUR.press + 60);
}

/** a neutral acknowledgement ring at the touch point — inside the zone, never over the panel */
function ripple(host: HTMLElement, x: number, y: number) {
  const s = document.createElement('span');
  s.className = 'ac-ripple';
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  host.appendChild(s);
  window.setTimeout(() => s.remove(), DUR.emphasis + 120);
}
