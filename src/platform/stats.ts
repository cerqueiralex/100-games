import type { Difficulty, GameResult } from './types';
import { DIFFICULTIES } from './types';

export interface DifficultyStats {
  played: number;
  won: number;
  bestTime: number | null;
  bestScore: number | null;
}

export interface GameStats {
  played: number;
  won: number;
  lost: number;
  abandoned: number;
  winRate: number; // 0..1 over decided games (won+lost)
  bestTime: number | null; // seconds, won games only
  avgTime: number | null; // seconds, won games only
  totalTimeSec: number;
  bestScore: number | null;
  avgScore: number | null;
  totalErrors: number;
  avgErrors: number | null;
  totalHints: number;
  cleanWins: number;
  assistedWins: number;
  currentStreak: number; // consecutive wins, most recent first
  bestStreak: number;
  perDifficulty: Record<Difficulty, DifficultyStats>;
}

const emptyDifficulty = (): DifficultyStats => ({
  played: 0,
  won: 0,
  bestTime: null,
  bestScore: null
});

export function computeStats(results: GameResult[]): GameStats {
  const perDifficulty = {
    easy: emptyDifficulty(),
    medium: emptyDifficulty(),
    hard: emptyDifficulty(),
    pro: emptyDifficulty(),
    extreme: emptyDifficulty()
  } as Record<Difficulty, DifficultyStats>;

  let won = 0;
  let lost = 0;
  let abandoned = 0;
  let totalTimeSec = 0;
  let totalErrors = 0;
  let totalHints = 0;
  let cleanWins = 0;
  let bestTime: number | null = null;
  let bestScore: number | null = null;
  let wonTimeSum = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const r of results) {
    totalTimeSec += r.durationSec;
    totalErrors += r.errors;
    totalHints += r.hintsUsed;

    const d = perDifficulty[r.difficulty] ?? emptyDifficulty();
    d.played += 1;

    if (r.outcome === 'won') {
      won += 1;
      d.won += 1;
      wonTimeSum += r.durationSec;
      if (bestTime === null || r.durationSec < bestTime) bestTime = r.durationSec;
      if (d.bestTime === null || r.durationSec < d.bestTime) d.bestTime = r.durationSec;
      if (r.cleanWin) cleanWins += 1;
    } else if (r.outcome === 'lost') {
      lost += 1;
    } else {
      abandoned += 1;
    }

    if (r.outcome !== 'abandoned') {
      scoreSum += r.score;
      scoreCount += 1;
      if (bestScore === null || r.score > bestScore) bestScore = r.score;
      if (d.bestScore === null || r.score > d.bestScore) d.bestScore = r.score;
    }
  }

  // results are stored most-recent-first
  let currentStreak = 0;
  for (const r of results) {
    if (r.outcome === 'abandoned') continue;
    if (r.outcome === 'won') currentStreak += 1;
    else break;
  }
  let bestStreak = 0;
  let run = 0;
  for (const r of results) {
    if (r.outcome === 'abandoned') continue;
    if (r.outcome === 'won') {
      run += 1;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 0;
    }
  }

  const decided = won + lost;
  const played = results.length;
  return {
    played,
    won,
    lost,
    abandoned,
    winRate: decided > 0 ? won / decided : 0,
    bestTime,
    avgTime: won > 0 ? wonTimeSum / won : null,
    totalTimeSec,
    bestScore,
    avgScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    totalErrors,
    avgErrors: played > 0 ? totalErrors / played : null,
    totalHints,
    cleanWins,
    assistedWins: won - cleanWins,
    currentStreak,
    bestStreak,
    perDifficulty
  };
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export { DIFFICULTIES };
