import { useEffect, useMemo, useState } from 'react';
import { getGame } from '../registry';
import { formatDuration } from '../stats';
import {
  dailyStreakInfo,
  ensureTodayAssigned,
  loadDaily,
  todayKey,
  type DailyChallengeRecord
} from '../daily/store';
import { CheckIcon, ChevronIcon, ClockIcon, FlameIcon } from '../design/icons';
import { Chip, Modal } from './ui';
import { sfx } from '../audio';

/**
 * The Daily Challenge card — the feature's front door, above the game list.
 *
 * It shows today's game, the fixed tier, how long is left to play it and
 * where the run stands. The countdown is the point: the challenge expires
 * at local midnight, and a card that just said "Play" would not tell the
 * player that waiting costs them the streak.
 */

/** "Aug 24" from a local date key (see GameShell.formatDailyDate for why
    this never goes through `new Date(key)`) */
function shortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "6h 12m" / "12m" / "40s" — coarse on purpose, it is not a stopwatch */
function untilMidnight(now: number): string {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const secs = Math.max(0, Math.floor((next.getTime() - now) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

export function DailyChallengeCard({
  onPlay
}: {
  onPlay: (record: DailyChallengeRecord) => void;
}) {
  /**
   * Assigned once, on mount, and persisted — see daily/store. Recomputing
   * per render would be harmless today but is exactly the habit that lets a
   * registry change rewrite a day someone already played.
   */
  const [record, setRecord] = useState<DailyChallengeRecord | null>(() => ensureTodayAssigned());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      const stamp = Date.now();
      setNow(stamp);
      // rolled past midnight with the app open: pick up the new day's
      // assignment instead of leaving yesterday's card on screen
      setRecord((cur) => (cur && cur.date === todayKey(stamp) ? cur : ensureTodayAssigned(stamp)));
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const streak = useMemo(() => dailyStreakInfo(loadDaily(), todayKey(now)), [now, record]);

  if (!record) return null;
  const game = getGame(record.gameId);
  if (!game) return null;

  const done = record.status === 'completed';
  const result = record.result;

  return (
    <button
      className={`daily-card fx-card ${done ? 'done' : ''}`}
      onClick={() => {
        sfx.tap();
        onPlay(record);
      }}
    >
      <span className="daily-card-icon">{game.icon}</span>
      <span className="daily-card-body">
        <span className="daily-card-kicker">
          Daily Challenge
          {streak.current > 0 && (
            <span className="daily-card-streak">
              <FlameIcon size={11} /> {streak.current}
            </span>
          )}
        </span>
        <span className="daily-card-name">{game.name}</span>
        <span className="daily-card-meta">
          {done && result ? (
            <>
              <CheckIcon size={12} /> Done in {formatDuration(result.timeSec)}
              {result.cleanWin ? ' · no help' : ''}
            </>
          ) : (
            <>
              <ClockIcon size={12} />
              {record.status === 'in_progress' ? 'In progress · ' : ''}
              {untilMidnight(now)} left
            </>
          )}
        </span>
      </span>
      <span className="daily-card-go">
        {done ? <CheckIcon size={18} /> : <ChevronIcon size={18} />}
      </span>
    </button>
  );
}

/* ---------- profile: the last four weeks of dailies ---------- */

const GRID_DAYS = 28;

/**
 * A read-only calendar of recent Daily Challenges.
 *
 * Deliberately NOT a way to replay a past day: today's board is the one
 * shared source of truth, and offering a live re-run of an old date would
 * raise "which attempt counts?" for every trophy and streak that reads
 * these records. Tapping a day shows what happened, nothing more.
 */
export function DailyHistorySection() {
  /* Read once at mount, which is enough: the profile tab unmounts whenever
     the player leaves it, so a daily finished this session is already in
     the store by the time this runs again. */
  const [store] = useState(() => loadDaily());
  const [selected, setSelected] = useState<DailyChallengeRecord | null>(null);
  const today = todayKey();
  const streak = dailyStreakInfo(store, today);

  const days = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const out: { key: string; record?: DailyChallengeRecord; isToday: boolean }[] = [];
    for (let back = GRID_DAYS - 1; back >= 0; back--) {
      const date = new Date(y, m - 1, d - back);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const key = `${date.getFullYear()}-${mm}-${dd}`;
      out.push({ key, record: store.records[key], isToday: back === 0 });
    }
    return out;
  }, [store, today]);

  const solved = days.filter((d) => d.record?.status === 'completed').length;

  return (
    <section className="setup-section">
      <h3 className="section-title lm-head">
        Daily Challenge
        <span className="lm-count">
          {streak.current} day{streak.current === 1 ? '' : 's'} · best {streak.best}
        </span>
      </h3>
      <div className="daily-grid-card fx-card">
        <div className="daily-grid">
          {days.map((day) => {
            const status = day.record?.status ?? 'none';
            const clean = day.record?.result?.cleanWin;
            return (
              <button
                key={day.key}
                className={`daily-cell ${status} ${clean ? 'clean' : ''} ${day.isToday ? 'today' : ''}`}
                title={`${shortDate(day.key)}${day.record ? ` — ${getGame(day.record.gameId)?.name ?? day.record.gameId}` : ''}`}
                aria-label={`${shortDate(day.key)}: ${status === 'completed' ? 'completed' : 'not completed'}`}
                disabled={!day.record}
                onClick={() => {
                  if (!day.record) return;
                  sfx.tap();
                  setSelected(day.record);
                }}
              >
                {status === 'completed' && (
                  <span className="daily-cell-check" aria-hidden>
                    <CheckIcon size={10} />
                  </span>
                )}
                {new Date(
                  Number(day.key.slice(0, 4)),
                  Number(day.key.slice(5, 7)) - 1,
                  Number(day.key.slice(8, 10))
                ).getDate()}
              </button>
            );
          })}
        </div>
        <p className="daily-grid-note">
          {solved} of the last {GRID_DAYS} days solved
        </p>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? shortDate(selected.date) : undefined}
      >
        {selected && (
          <div className="daily-detail">
            <p className="daily-detail-game">{getGame(selected.gameId)?.name ?? selected.gameId}</p>
            {selected.result ? (
              <>
                <p className="daily-detail-stats">
                  {formatDuration(selected.result.timeSec)} · {selected.result.hintsUsed} hint
                  {selected.result.hintsUsed === 1 ? '' : 's'}
                  {selected.result.assistsUsed.length > 0
                    ? ` · ${selected.result.assistsUsed.length} assist${selected.result.assistsUsed.length === 1 ? '' : 's'}`
                    : ''}
                </p>
                <div className="lm-status">
                  {selected.result.cleanWin ? (
                    <Chip tone="good">Solved with no help</Chip>
                  ) : (
                    <Chip tone="muted">Solved with help</Chip>
                  )}
                  {!selected.result.onTime && <Chip tone="muted">Played late</Chip>}
                </div>
              </>
            ) : (
              <div className="lm-status">
                <Chip tone="muted">
                  {selected.status === 'in_progress' ? 'Started, not finished' : 'Not played'}
                </Chip>
              </div>
            )}
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
