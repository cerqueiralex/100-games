import { useEffect, useRef, useState } from 'react';

export type SceneState = 'flying' | 'won' | 'lost';

interface Props {
  /** 0 = full, 1 = fully deflated / lowest before the pop. */
  sink: number;
  state: SceneState;
  /** Bump this to play a one-off wobble (safe-first forgiveness). */
  wobbleNonce: number;
  /** Total lives this game — the envelope is drawn with one gore per life. */
  lives: number;
  /** Lives already gone — that many gores are greyed out, left to right. */
  livesLost: number;
}

/** gore palette (content colors; never --play-9 white) */
const GORE_COLORS = [
  'var(--play-4)',
  'var(--play-8)',
  'var(--play-2)',
  'var(--play-6)',
  'var(--play-7)',
  'var(--play-1)',
  'var(--play-5)',
  'var(--play-3)'
];

/**
 * The cheerful hot-air balloon that replaces the gallows. The envelope IS
 * the life meter: it has exactly `lives` colored gores and every wrong
 * guess visibly kills one (grey, deflated) — the balloon-world equivalent
 * of the classic gallows gaining a body part. Each miss also dips the
 * whole balloon a solid step and the rider's face degrades from happy to
 * worried to scared. A forgiven guess wobbles it (`wobbleNonce`), a win
 * soars off-screen waving, a loss pops the envelope while the basket
 * drifts down under a parachute — always friendly. All colors are tokens.
 */
export function BalloonScene({ sink, state, wobbleNonce, lives, livesLost }: Props) {
  const [wobble, setWobble] = useState(false);
  const [dip, setDip] = useState(false);
  const firstWobble = useRef(true);
  const firstLoss = useRef(true);

  useEffect(() => {
    if (firstWobble.current) {
      firstWobble.current = false;
      return;
    }
    setWobble(true);
    const t = setTimeout(() => setWobble(false), 520);
    return () => clearTimeout(t);
  }, [wobbleNonce]);

  // pronounced drop on every lost life (skipped when hydrating a save)
  useEffect(() => {
    if (firstLoss.current) {
      firstLoss.current = false;
      return;
    }
    if (livesLost === 0) return;
    setDip(true);
    const t = setTimeout(() => setDip(false), 560);
    return () => clearTimeout(t);
  }, [livesLost]);

  const sparks = [-70, -35, 0, 35, 70, 110];

  const goreCount = Math.max(1, lives);
  const gw = 80 / goreCount;
  const out = Math.min(goreCount, Math.max(0, livesLost));

  const ratio = (goreCount - out) / goreCount;
  const mood: 'happy' | 'worried' | 'scared' =
    state === 'won' ? 'happy' : state === 'lost' || ratio <= 0.34 ? 'scared' : ratio <= 0.67 ? 'worried' : 'happy';

  return (
    <div
      className={`hng-scene ${wobble ? 'wobble' : ''} ${dip ? 'dip' : ''}`}
      data-state={state}
      style={{ ['--sink' as string]: sink }}
    >
      <svg viewBox="0 0 140 200" className="hng-svg" aria-hidden>
        <defs>
          <clipPath id="hngEnvClip">
            <ellipse cx="70" cy="60" rx="40" ry="46" />
          </clipPath>
        </defs>

        {/* soft ground shadow that fades as the balloon rises */}
        <ellipse className="hng-shadow" cx="70" cy="192" rx="30" ry="6" />

        <g className="hng-lift">
          <g className="hng-bob">
            {/* ---- envelope: one gore per life ---- */}
            <g className="hng-envelope">
              <ellipse cx="70" cy="60" rx="40" ry="46" fill="var(--accent)" />
              <g clipPath="url(#hngEnvClip)">
                {Array.from({ length: goreCount }, (_, k) => (
                  <rect
                    key={k}
                    className={`hng-gore ${k < out ? 'out' : ''}`}
                    x={30 + k * gw}
                    y={12}
                    width={gw + 0.6}
                    height={96}
                    fill={GORE_COLORS[k % GORE_COLORS.length]}
                    stroke="var(--ink)"
                    strokeOpacity="0.12"
                    strokeWidth="1"
                  />
                ))}
                <ellipse cx="57" cy="44" rx="11" ry="17" fill="#ffffff" opacity="0.18" />
              </g>
              <ellipse cx="70" cy="60" rx="40" ry="46" fill="none" stroke="var(--ink)" strokeOpacity="0.18" strokeWidth="1.5" />
              {/* neck */}
              <path d="M62 102 L78 102 L74 112 L66 112 Z" fill="var(--accent)" />
              <path d="M62 102 L78 102 L74 112 L66 112 Z" fill="#000000" opacity="0.18" />
            </g>

            {/* ---- ropes ---- */}
            <g className="hng-ropes" stroke="var(--text-dim)" strokeWidth="1.4">
              <line x1="60" y1="110" x2="58" y2="150" />
              <line x1="80" y1="110" x2="82" y2="150" />
            </g>

            {/* ---- cabin: parachute (hidden until pop) + basket + character ---- */}
            <g className="hng-cabin">
              <g className="hng-parachute">
                <path d="M44 118 Q70 92 96 118 Z" fill="var(--play-6)" />
                <path d="M44 118 Q70 92 96 118" fill="none" stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="1.5" />
                <line x1="46" y1="117" x2="60" y2="150" stroke="var(--text-dim)" strokeWidth="1.2" />
                <line x1="94" y1="117" x2="80" y2="150" stroke="var(--text-dim)" strokeWidth="1.2" />
              </g>

              {/* character head peeking over the rim — face tracks the mood */}
              <g className="hng-char">
                <circle cx="70" cy="140" r="12" fill="var(--play-3)" stroke="var(--ink)" strokeWidth="2" />
                {mood === 'scared' ? (
                  <>
                    <circle cx="65.5" cy="137.5" r="2.6" fill="var(--ink)" />
                    <circle cx="74.5" cy="137.5" r="2.6" fill="var(--ink)" />
                    <circle cx="66.1" cy="136.9" r="0.8" fill="#ffffff" />
                    <circle cx="75.1" cy="136.9" r="0.8" fill="#ffffff" />
                    <ellipse cx="70" cy="145" rx="3" ry="3.8" fill="var(--ink)" />
                  </>
                ) : mood === 'worried' ? (
                  <>
                    <circle cx="65.5" cy="138" r="2" fill="var(--ink)" />
                    <circle cx="74.5" cy="138" r="2" fill="var(--ink)" />
                    <path d="M62.5 134.5 L68 133.2" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M77.5 134.5 L72 133.2" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M65.5 145 Q70 143 74.5 145" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <circle cx="65.5" cy="138" r="1.8" fill="var(--ink)" />
                    <circle cx="74.5" cy="138" r="1.8" fill="var(--ink)" />
                    <path d="M65 143 Q70 147 75 143" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
                <g className="hng-arm">
                  <line x1="80" y1="141" x2="91" y2="132" stroke="var(--play-3)" strokeWidth="5" strokeLinecap="round" />
                  <line x1="80" y1="141" x2="91" y2="132" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
                </g>
              </g>

              {/* basket */}
              <g className="hng-basket">
                <rect x="56" y="150" width="28" height="20" rx="5" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
                <rect x="56" y="164" width="28" height="6" rx="3" fill="#000000" opacity="0.16" />
              </g>
            </g>
          </g>

          {/* ---- pop sparks (only visible on loss) ---- */}
          <g className="hng-sparks">
            {sparks.map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <circle
                  key={i}
                  className="hng-spark"
                  cx="70"
                  cy="60"
                  r={i % 2 ? 3 : 4}
                  fill={i % 2 ? 'var(--play-8)' : 'var(--play-4)'}
                  style={{
                    ['--dx' as string]: `${Math.cos(rad) * 34}px`,
                    ['--dy' as string]: `${Math.sin(rad) * 34 - 6}px`
                  }}
                />
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
