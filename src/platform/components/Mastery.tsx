import type { GameDefinition, MasteryArt } from '../types';

/* cell codes that paint instead of printing (see MasteryArt in types.ts) */
const CELL_FILL: Record<string, string> = {
  a: 'var(--accent)',
  g: 'var(--good)',
  b: 'var(--bad)',
  y: 'var(--play-8)',
  u: 'var(--play-4)',
  p: 'var(--play-7)',
  o: 'var(--play-6)'
};

/** Theme-aware section illustration, drawn from compact data specs. */
function MasteryArtView({ art }: { art: MasteryArt }) {
  if (art.kind === 'banner') {
    return (
      <figure className="mst-art">
        <div className="mst-art-banner" aria-hidden>
          {art.emojis}
        </div>
        {art.caption && <figcaption>{art.caption}</figcaption>}
      </figure>
    );
  }

  if (art.kind === 'row') {
    return (
      <figure className="mst-art">
        <div className="mst-art-row" aria-hidden>
          {art.items.map((it, i) =>
            it === '>' ? (
              <span key={i} className="mst-art-arrow">
                →
              </span>
            ) : (
              <span key={i} className="mst-art-chip">
                {it}
              </span>
            )
          )}
        </div>
        {art.caption && <figcaption>{art.caption}</figcaption>}
      </figure>
    );
  }

  const cols = Math.max(...art.rows.map((r) => [...r].length));
  return (
    <figure className="mst-art">
      <div
        className="mst-art-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, var(--mst-cell))` }}
        aria-hidden
      >
        {art.rows.flatMap((row, r) => {
          const chars = [...row];
          while (chars.length < cols) chars.push(' ');
          return chars.map((ch, c) => {
            const key = `${r}-${c}`;
            if (ch === ' ') return <span key={key} className="mst-cell gap" />;
            if (ch === '.') return <span key={key} className="mst-cell" />;
            if (ch === '#') return <span key={key} className="mst-cell dark" />;
            if (ch === 'h') return <span key={key} className="mst-cell hl" />;
            if (ch === 'x')
              return (
                <span key={key} className="mst-cell mark">
                  ✕
                </span>
              );
            if (ch === '·')
              return (
                <span key={key} className="mst-cell mark">
                  •
                </span>
              );
            const fill = CELL_FILL[ch];
            if (fill)
              return <span key={key} className="mst-cell fill" style={{ background: fill }} />;
            return (
              <span key={key} className="mst-cell text">
                {ch}
              </span>
            );
          });
        })}
      </div>
      {art.caption && <figcaption>{art.caption}</figcaption>}
    </figure>
  );
}

/** "🔍 tip text" → emoji marker + text (falls back to a plain dot).
    Also accepts keycap (1️⃣) and flag sequences, which are emoji but not
    Extended_Pictographic. */
function splitBullet(b: string): { marker: string | null; text: string } {
  const sp = b.indexOf(' ');
  if (sp > 0 && sp <= 8) {
    const head = b.slice(0, sp);
    if (/\p{Extended_Pictographic}|[⃣\u{1F1E6}-\u{1F1FF}]/u.test(head)) {
      return { marker: head, text: b.slice(sp + 1) };
    }
  }
  return { marker: null, text: b };
}

/**
 * The "How to master {game}" reader. Where TutorialModal teaches the
 * rules step by step, this is a scrollable long-form strategy guide:
 * origins of the game, what mastery looks like, illustrated named
 * techniques and planning heuristics, and trustworthy further-reading
 * links. Content comes from GameDefinition.mastery (a required field —
 * see DESIGN.md "Mastery guides").
 */
export function MasteryModal({ game, onClose }: { game: GameDefinition; onClose: () => void }) {
  const m = game.mastery;
  return (
    <div className="tut-backdrop" onClick={onClose}>
      <div className="mst-card fx-card" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <header className="tut-header">
          <span className="tut-title">How to master {game.name}</span>
          <button className="tut-close" onClick={onClose} aria-label="Close mastery guide">
            ×
          </button>
        </header>

        <div className="mst-scroll">
          <section className="mst-origins">
            <h3 className="mst-kicker">Origins</h3>
            <p>{m.origins}</p>
          </section>

          <p className="mst-intro">{m.intro}</p>

          {m.sections.map((s) => (
            <section key={s.title} className="mst-section">
              <h3>{s.title}</h3>
              {s.art && <MasteryArtView art={s.art} />}
              {s.paragraphs?.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {s.bullets && (
                <ul>
                  {s.bullets.map((b, i) => {
                    const { marker, text } = splitBullet(b);
                    return (
                      <li key={i} className={marker ? 'has-emoji' : ''}>
                        {marker && (
                          <span className="mst-li-emoji" aria-hidden>
                            {marker}
                          </span>
                        )}
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}

          {m.references.length > 0 && (
            <section className="mst-section mst-refs">
              <h3>Go deeper</h3>
              <ul>
                {m.references.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.label}
                    </a>
                    {r.note && <span className="mst-ref-note"> — {r.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
