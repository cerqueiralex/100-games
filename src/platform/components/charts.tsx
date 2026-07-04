import { useMemo, useState } from 'react';
import type { CategoryId, GameResult } from '../types';
import { GAMES } from '../registry';
import { categoryColor, categoryName, gameCategory } from '../categories';
import { formatDuration } from '../stats';
import { sfx } from '../audio';

/* Dependency-free SVG charts, colored from the design-system content
   palette so they follow themes. One stable color per registered game. */

/* Palette slots charts may use. --play-9 (white) is excluded: it is invisible
   against the card surfaces in the light theme (and black would be in dark). */
const CHART_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 13, 10, 11, 12, 14, 15, 16];

export function gameColor(gameId: string): string {
  const i = GAMES.findIndex((g) => g.id === gameId);
  return `var(--play-${CHART_SLOTS[(i < 0 ? 0 : i) % CHART_SLOTS.length]})`;
}

const gameName = (gameId: string) => GAMES.find((g) => g.id === gameId)?.name ?? gameId;

function lastDays(n: number): { key: string; label: string; end: number }[] {
  const out: { key: string; label: string; end: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({
      key: d.toDateString(),
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      end: d.getTime() + 86400000
    });
  }
  return out;
}

const dayKey = (ts: number) => new Date(ts).toDateString();

function Legend({ ids, counts }: { ids: string[]; counts?: Map<string, number> }) {
  return (
    <div className="chart-legend">
      {ids.map((id) => (
        <span key={id} className="legend-item">
          <span className="legend-dot" style={{ background: gameColor(id) }} />
          {gameName(id)}
          {counts && <b>{counts.get(id)}</b>}
        </span>
      ))}
    </div>
  );
}

/* ---------- donut: most played games ---------- */

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function donutSlice(cx: number, cy: number, rO: number, rI: number, a0: number, a1: number) {
  const sweep = Math.min(a1 - a0, 359.98);
  const end = a0 + sweep;
  const large = sweep > 180 ? 1 : 0;
  const [x0, y0] = polar(cx, cy, rO, a0);
  const [x1, y1] = polar(cx, cy, rO, end);
  const [x2, y2] = polar(cx, cy, rI, end);
  const [x3, y3] = polar(cx, cy, rI, a0);
  return `M ${x0} ${y0} A ${rO} ${rO} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rI} ${rI} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function GamesPieChart({ history }: { history: GameResult[] }) {
  const { slices, total, counts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of history) counts.set(r.gameId, (counts.get(r.gameId) ?? 0) + 1);
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const total = history.length;
    let angle = 0;
    const slices = entries.map(([id, count]) => {
      const a0 = angle;
      angle += (count / total) * 360;
      return { id, count, a0, a1: angle };
    });
    return { slices, total, counts };
  }, [history]);

  if (total === 0) {
    return <p className="empty-note">Play some games to see your split.</p>;
  }

  return (
    <div className="pie-wrap">
      <svg viewBox="0 0 180 180" className="pie-svg" role="img" aria-label="Most played games">
        {slices.map((s) => (
          <path key={s.id} d={donutSlice(90, 90, 82, 52, s.a0, s.a1)} fill={gameColor(s.id)} />
        ))}
        <text x="90" y="85" textAnchor="middle" className="pie-total">
          {total}
        </text>
        <text x="90" y="104" textAnchor="middle" className="pie-label">
          games
        </text>
      </svg>
      <Legend ids={slices.map((s) => s.id)} counts={counts} />
    </div>
  );
}

/* ---------- horizontal bars: plays per category ---------- */

export function CategoryBarChart({ history }: { history: GameResult[] }) {
  const rows = useMemo(() => {
    const counts = new Map<CategoryId, number>();
    for (const r of history) {
      const cat = gameCategory(r.gameId);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [history]);

  if (rows.length === 0) {
    return <p className="empty-note">Play some games to see your category split.</p>;
  }

  const W = 600;
  const ROW = 32;
  const H = rows.length * ROW;
  const labelW = 116;
  const countW = 56;
  const max = rows[0][1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="chart-svg"
      role="img"
      aria-label="Plays per category"
    >
      {rows.map(([cat, count], i) => {
        const y = i * ROW;
        const w = Math.max(8, (count / max) * (W - labelW - countW));
        return (
          <g key={cat}>
            <text x={labelW - 12} y={y + ROW / 2 + 4} textAnchor="end" className="catbar-name">
              {categoryName(cat)}
            </text>
            <rect
              x={labelW}
              y={y + 7.5}
              width={w}
              height={ROW - 15}
              rx={(ROW - 15) / 2}
              fill={categoryColor(cat)}
            />
            <text x={labelW + w + 10} y={y + ROW / 2 + 4} className="catbar-count">
              {count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- stacked bars: 30-day activity ---------- */

export function ActivityChart({ history }: { history: GameResult[] }) {
  const days = useMemo(() => lastDays(30), []);
  const { perDay, gameIds, max } = useMemo(() => {
    const start = days[0].end - 86400000;
    const perDay = new Map<string, Map<string, number>>();
    const gameIds: string[] = [];
    for (const r of history) {
      if (r.finishedAt < start) continue;
      const key = dayKey(r.finishedAt);
      const m = perDay.get(key) ?? new Map<string, number>();
      m.set(r.gameId, (m.get(r.gameId) ?? 0) + 1);
      perDay.set(key, m);
      if (!gameIds.includes(r.gameId)) gameIds.push(r.gameId);
    }
    let max = 1;
    perDay.forEach((m) => {
      let t = 0;
      m.forEach((c) => (t += c));
      max = Math.max(max, t);
    });
    return { perDay, gameIds: gameIds.sort(), max };
  }, [history, days]);

  if (perDay.size === 0) {
    return <p className="empty-note">No games in the last 30 days.</p>;
  }

  const W = 600;
  const H = 170;
  const bottom = 146;
  const chartH = 130;
  const step = W / 30;
  const barW = step - 4;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Games per day">
        {days.map((d, i) => {
          const m = perDay.get(d.key);
          if (!m) return null;
          let y = bottom;
          return (
            <g key={d.key}>
              {gameIds.map((id) => {
                const count = m.get(id) ?? 0;
                if (count === 0) return null;
                const h = (count / max) * chartH;
                y -= h;
                return (
                  <rect
                    key={id}
                    x={i * step + 2}
                    y={y}
                    width={barW}
                    height={Math.max(h - 1.5, 1)}
                    rx={2}
                    fill={gameColor(id)}
                  />
                );
              })}
            </g>
          );
        })}
        {[0, 10, 20, 29].map((i) => (
          <text key={i} x={i * step + step / 2} y={H - 6} textAnchor="middle" className="axis-label">
            {days[i].label}
          </text>
        ))}
      </svg>
      <Legend ids={gameIds} />
    </div>
  );
}

/* ---------- per-game improvement trend ---------- */

type MetricId = 'score' | 'time' | 'winrate' | 'errors';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const decided = (r: GameResult) => r.outcome !== 'abandoned';

const METRICS: { id: MetricId; name: string; value: (rs: GameResult[]) => number | null; fmt: (v: number) => string }[] = [
  {
    id: 'score',
    name: 'Score',
    value: (rs) => avg(rs.filter(decided).map((r) => r.score)),
    fmt: (v) => Math.round(v).toLocaleString()
  },
  {
    id: 'time',
    name: 'Win time',
    value: (rs) => avg(rs.filter((r) => r.outcome === 'won').map((r) => r.durationSec)),
    fmt: (v) => formatDuration(v)
  },
  {
    id: 'winrate',
    name: 'Win %',
    value: (rs) => {
      const d = rs.filter(decided);
      return d.length ? (d.filter((r) => r.outcome === 'won').length / d.length) * 100 : null;
    },
    fmt: (v) => `${Math.round(v)}%`
  },
  {
    id: 'errors',
    name: 'Errors',
    value: (rs) => avg(rs.map((r) => r.errors)),
    fmt: (v) => `${Math.round(v * 10) / 10}`
  }
];

export function TrendChart({ results }: { results: GameResult[] }) {
  const [metricId, setMetricId] = useState<MetricId>('score');
  const metric = METRICS.find((m) => m.id === metricId)!;
  const days = useMemo(() => lastDays(30), []);

  const points = useMemo(() => {
    const byDay = new Map<string, GameResult[]>();
    for (const r of results) {
      const key = dayKey(r.finishedAt);
      byDay.set(key, [...(byDay.get(key) ?? []), r]);
    }
    return days.map((d, i) => {
      const rs = byDay.get(d.key);
      const v = rs ? metric.value(rs) : null;
      return { i, label: d.label, v };
    });
  }, [results, days, metric]);

  const live = points.filter((p) => p.v !== null) as { i: number; label: string; v: number }[];

  const W = 600;
  const H = 200;
  const padL = 52;
  const padR = 10;
  const padT = 12;
  const padB = 26;

  let body: React.ReactNode;
  if (live.length < 2) {
    body = <p className="empty-note">Play on a few different days to see a trend.</p>;
  } else {
    let min = Math.min(...live.map((p) => p.v));
    let max = Math.max(...live.map((p) => p.v));
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const x = (i: number) => padL + (i / 29) * (W - padL - padR);
    const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const line = live.map((p, k) => `${k === 0 ? 'M' : 'L'} ${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
    const area = `${line} L ${x(live[live.length - 1].i).toFixed(1)} ${H - padB} L ${x(live[0].i).toFixed(1)} ${H - padB} Z`;
    const gridVals = [min, (min + max) / 2, max];

    body = (
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={`${metric.name} trend`}>
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} className="grid-line" />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" className="axis-label">
              {metric.fmt(v)}
            </text>
          </g>
        ))}
        <path d={area} className="trend-area" />
        <path d={line} className="trend-line" fill="none" />
        {live.map((p) => (
          <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={3.4} className="trend-dot" />
        ))}
        {[0, 10, 20, 29].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="axis-label">
            {days[i].label}
          </text>
        ))}
      </svg>
    );
  }

  return (
    <div>
      <div className="metric-chips">
        {METRICS.map((m) => (
          <button
            key={m.id}
            className={`metric-chip ${m.id === metricId ? 'active' : ''}`}
            onClick={() => {
              sfx.tap();
              setMetricId(m.id);
            }}
          >
            {m.name}
          </button>
        ))}
      </div>
      {body}
    </div>
  );
}
