import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  LANDMARKS,
  landmarkMeter,
  type LandmarkDef,
  type PlayerProgress,
  type StreakInfo
} from '../progress/progress';
import { categoryName } from '../categories';
import { useAppState } from '../AppState';
import { FlameArt } from './Streak';
import { RankCrown } from './Level';
import { RANK_TIERS } from '../progress/xp';
import { Chip, Modal } from './ui';
import { LockIcon } from '../design/icons';
import {
  alpha,
  CARD_H,
  CARD_W,
  drawCardChrome,
  drawFooterWithAvatar,
  EMOJI_FONT,
  FONT,
  hexToRgb,
  pill,
  ShareImageModal
} from './ShareCard';
import { sfx } from '../audio';
import { loadAvatarSprite } from '../design/avatars';

/**
 * Landmarks — the profile trophy collection. Every landmark is always
 * visible: locked cards render their art grayscale at soft opacity behind a
 * padlock; unlocking colors them in. Art is drawn from the content palette
 * (--play-* tokens), so it stays colorful and identical across accent
 * themes, like game stickers — grayscale comes from a CSS filter, not from
 * separate art.
 */

const ROMAN: Record<string, string> = { easy: 'I', medium: 'II', hard: 'III', pro: 'IV', extreme: 'V' };

/** sticker-style SVG art per landmark kind, colored via --lm (set on the
    plate from the def's content-palette slot) */
export function LandmarkArt({
  def,
  size = 44,
  /** a secret that has not been found yet: mystery art, never the real
      emblem — the shape itself would give the trophy away */
  hidden = false
}: {
  def: LandmarkDef;
  size?: number;
  hidden?: boolean;
}) {
  const lm = `var(--play-${def.slot})`;
  /* An unfound secret draws the mystery plate WHATEVER its kind — the
     emblem's shape alone gives a trophy away (a paper plane says "share"
     before any title does), and Spread the Word is a secret with share art */
  if (hidden) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <path
          d="M32 5c11 0 21 16 21 29a21 21 0 0 1-42 0C11 21 21 5 32 5Z"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeDasharray="5 5"
        />
        <text x="32" y="45" textAnchor="middle" fontSize="27" fontWeight="800" fill="var(--ink)">
          ?
        </text>
      </svg>
    );
  }
  switch (def.kind) {
    case 'streak':
      return <FlameArt size={size} color={lm} label={String(def.days)} />;
    case 'first':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 10 L37.3 24.7 L52.9 25.2 L40.6 34.8 L44.9 49.8 L32 41 L19.1 49.8 L23.4 34.8 L11.1 25.2 L26.7 24.7 Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M53 6 L55.5 10.5 L53 15 L50.5 10.5 Z" fill="var(--play-6)" />
          <path d="M11 48 L13.5 52.5 L11 57 L8.5 52.5 Z" fill="var(--play-6)" />
        </svg>
      );
    case 'plays': {
      // a stack of finished boards; the rung's count is the whole message
      const n = String(def.count);
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="16" y="5" width="42" height="42" rx="10" fill={lm} opacity="0.4" />
          <rect x="6" y="14" width="45" height="45" rx="11" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <text
            x="28.5"
            y="43.5"
            textAnchor="middle"
            fontSize={n.length >= 4 ? 15 : 19}
            fontWeight="800"
            fill="var(--play-9)"
          >
            {n}
          </text>
        </svg>
      );
    }
    case 'clean-wins': {
      const n = String(def.count);
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 5 57 18.5 57 45.5 32 59 7 45.5 7 18.5Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* the tick is what separates this ladder from plays: these are
              the wins nobody helped with */}
          <path
            d="M23 24.5 29.5 31 41 19"
            fill="none"
            stroke="var(--play-9)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="32"
            y="49"
            textAnchor="middle"
            fontSize={n.length >= 4 ? 14 : 17}
            fontWeight="800"
            fill="var(--play-9)"
          >
            {n}
          </text>
        </svg>
      );
    }
    case 'level': {
      const tier = RANK_TIERS.find((t) => t.id === def.rank);
      return tier ? <RankCrown rank={tier} size={size} /> : null;
    }
    case 'daily-first':
      // the family's calendar chrome with a SUNRISE on the page: the first
      // daily is the family's daybreak. Deliberately not a number — a "1"
      // here would read as one more streak tier beside the real ones.
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="7" y="13" width="50" height="44" rx="8" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <path d="M7 26h50" stroke="var(--ink)" strokeWidth="3" />
          <rect x="18" y="5" width="6" height="13" rx="3" fill="var(--ink)" />
          <rect x="40" y="5" width="6" height="13" rx="3" fill="var(--ink)" />
          <path d="M22 50a10 10 0 0 1 20 0Z" fill="var(--play-9)" />
          <path
            d="M32 33v-4 M20 38.5l-2.8-2.8 M44 38.5l2.8-2.8"
            stroke="var(--play-9)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path d="M15 50h34" stroke="var(--play-9)" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    case 'daily-streak': {
      // a calendar page, NOT a flame: the play streak already owns the
      // flame, and two streaks that share art are two streaks nobody can
      // tell apart (see the spec's note on distinct badges)
      const n = String(def.days);
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="7" y="13" width="50" height="44" rx="8" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <path d="M7 26h50" stroke="var(--ink)" strokeWidth="3" />
          <rect x="18" y="5" width="6" height="13" rx="3" fill="var(--ink)" />
          <rect x="40" y="5" width="6" height="13" rx="3" fill="var(--ink)" />
          <text
            x="32"
            y="48"
            textAnchor="middle"
            fontSize={n.length >= 3 ? 16 : 19}
            fontWeight="800"
            fill="var(--play-9)"
          >
            {n}
          </text>
        </svg>
      );
    }
    case 'daily-collector':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="7" y="13" width="50" height="44" rx="8" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <path d="M7 26h50" stroke="var(--ink)" strokeWidth="3" />
          <rect x="18" y="5" width="6" height="13" rx="3" fill="var(--ink)" />
          <rect x="40" y="5" width="6" height="13" rx="3" fill="var(--ink)" />
          <path
            d="M19 41.5 27.5 50 46 31"
            fill="none"
            stroke="var(--play-9)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'all-played':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="9" y="9" width="21" height="21" rx="6" fill="var(--play-4)" stroke="var(--ink)" strokeWidth="3" />
          <rect x="34" y="9" width="21" height="21" rx="6" fill="var(--play-3)" stroke="var(--ink)" strokeWidth="3" />
          <rect x="9" y="34" width="21" height="21" rx="6" fill="var(--play-1)" stroke="var(--ink)" strokeWidth="3" />
          <rect x="34" y="34" width="21" height="21" rx="6" fill="var(--play-2)" stroke="var(--ink)" strokeWidth="3" />
        </svg>
      );
    case 'difficulty':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 6 L54 13 V33 C54 46 45 54 32 59 C19 54 10 46 10 33 V13 Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <text x="32" y="40" textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--play-9)">
            {ROMAN[def.difficulty!]}
          </text>
        </svg>
      );
    case 'category':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path d="M23 38 L18 58 L28 52 L30 41 Z" fill={lm} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M41 38 L46 58 L36 52 L34 41 Z" fill={lm} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="32" cy="26" r="17" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <circle
            cx="32"
            cy="26"
            r="11.5"
            fill="none"
            stroke="var(--play-9)"
            strokeWidth="2"
            strokeDasharray="2.5 3.2"
            opacity="0.75"
          />
          <text x="32" y="31.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--play-9)">
            {categoryName(def.category!)[0]}
          </text>
        </svg>
      );
    case 'clean-streak': {
      // a rosette, not another hexagon: this ladder counts wins in a ROW,
      // and it has to be tellable apart from the clean-wins total at 26px
      const n = String(def.count);
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32.0 4.0 37.6 11.2 46.0 7.8 47.2 16.8 56.2 18.0 52.8 26.4 60.0 32.0 52.8 37.6 56.2 46.0 47.2 47.2 46.0 56.2 37.6 52.8 32.0 60.0 26.4 52.8 18.0 56.2 16.8 47.2 7.8 46.0 11.2 37.6 4.0 32.0 11.2 26.4 7.8 18.0 16.8 16.8 18.0 7.8 26.4 11.2Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <text
            x="32"
            y="39"
            textAnchor="middle"
            fontSize={n.length >= 3 ? 17 : 21}
            fontWeight="800"
            fill="var(--play-9)"
          >
            {n}
          </text>
        </svg>
      );
    }
    case 'flawless':
      // a cut gem — "flawless" is a gem word, and it is the one shape in
      // the gallery that says "no inclusions" without a caption
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M20 11 H44 L56 26 L32 56 L8 26 Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M8 26 H56 M20 11 L26 26 L32 56 L38 26 L44 11"
            fill="none"
            stroke="var(--play-9)"
            strokeWidth="2.4"
            opacity="0.85"
          />
        </svg>
      );
    case 'speed': {
      // a stopwatch wearing the time to beat
      const n = String(def.seconds);
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="26" y="4" width="12" height="7" rx="2.5" fill="var(--ink)" />
          <rect x="46" y="10" width="9" height="6" rx="2.5" fill="var(--ink)" transform="rotate(38 50 13)" />
          <circle cx="32" cy="37" r="23" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <text x="32" y="44" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--play-9)">
            {n}
          </text>
        </svg>
      );
    }
    case 'time-of-day':
      return def.moment === 'night' ? (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M43 7a25 25 0 1 0 14 44A27 27 0 0 1 43 7Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M50 14 L52.5 19 L57.5 21.5 L52.5 24 L50 29 L47.5 24 L42.5 21.5 L47.5 19Z" fill="var(--play-6)" />
          <circle cx="24" cy="20" r="3" fill="var(--play-9)" opacity="0.85" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M11 42a21 21 0 0 1 42 0Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M32 8v7 M12 22l5 5 M52 22l-5 5 M4 42h7 M53 42h7"
            stroke={lm}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M6 50h52" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'comeback': {
      // the shape of the story: one dip per failure, then the climb. The
      // rung's count IS the number of dips, so both comebacks are one
      // drawing with one parameter.
      const line =
        def.count === 1 ? 'M11 21 L26 45 L53 15' : 'M8 22 L19 41 L30 33 L42 49 L56 13';
      const end = def.count === 1 ? [53, 15] : [56, 13];
      const dips = def.count === 1 ? [[26, 45]] : [[19, 41], [42, 49]];
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="5" y="5" width="54" height="54" rx="15" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <path
            d={line}
            fill="none"
            stroke="var(--play-9)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {dips.map(([x, y]) => (
            <circle key={`${x}`} cx={x} cy={y} r="4" fill="var(--ink)" />
          ))}
          <circle cx={end[0]} cy={end[1]} r="5.5" fill="var(--play-9)" />
        </svg>
      );
    }
    case 'genre-hopper':
      // four different shapes, one hop over them: the whole point is that
      // they are NOT the same thing
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M8 22 Q32 -2 56 22"
            fill="none"
            stroke={lm}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="4 5"
          />
          <circle cx="11" cy="44" r="8" fill="var(--play-4)" stroke="var(--ink)" strokeWidth="3" />
          <rect x="19" y="36" width="16" height="16" rx="3" fill="var(--play-3)" stroke="var(--ink)" strokeWidth="3" />
          <path d="M45 34 L53 50 L37 50Z" fill="var(--play-1)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="32" cy="13" r="5" fill={lm} stroke="var(--ink)" strokeWidth="3" />
        </svg>
      );
    case 'deep-cut':
      // a record: the deep cut is the track nobody plays
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r="26" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <circle cx="32" cy="32" r="20" fill="none" stroke="var(--play-9)" strokeWidth="1.8" opacity="0.7" />
          <circle cx="32" cy="32" r="15" fill="none" stroke="var(--play-9)" strokeWidth="1.8" opacity="0.7" />
          <circle cx="32" cy="32" r="9" fill="var(--play-9)" opacity="0.9" />
          <circle cx="32" cy="32" r="3" fill="var(--ink)" />
        </svg>
      );
    case 'share':
      // two shares, two drawings: the win card leaving for Show Off, a
      // paper plane carrying the LINK out for Spread the Word — one kind,
      // branched on the feat, exactly like the two backup directions
      if (def.feat === 'share-app') {
        return (
          <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
            {/* upper wing */}
            <path
              d="M58 9 L6 31 L25 38Z"
              fill={lm}
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* body and tail fold */}
            <path
              d="M58 9 L25 38 L29 55 L37 43Z"
              fill={lm}
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* the word, spreading behind it */}
            <path
              d="M8 46h11 M14 54h13 M44 52h10"
              stroke="var(--play-9)"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
        );
      }
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect
            x="9"
            y="14"
            width="36"
            height="44"
            rx="7"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            transform="rotate(-8 27 36)"
          />
          <path
            d="M27 26 L30.4 33.2 L38 34.1 L32.4 39.4 L33.9 47 L27 43.3 L20.1 47 L21.6 39.4 L16 34.1 L23.6 33.2Z"
            fill="var(--play-9)"
            transform="rotate(-8 27 36)"
          />
          <path
            d="M47 22 L60 12 L55 27 L52 21Z"
            fill="var(--play-6)"
            stroke="var(--ink)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'backup': {
      // one drive, two directions — the arrow is the whole difference
      const out = def.feat === 'backup-export';
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="7" y="30" width="50" height="28" rx="8" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <circle cx="17" cy="44" r="3.5" fill="var(--play-9)" />
          <path
            d={out ? 'M32 24 V6 M23 15 L32 6 L41 15' : 'M32 6 V24 M23 15 L32 24 L41 15'}
            fill="none"
            stroke={lm}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M28 44 H48" stroke="var(--play-9)" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        </svg>
      );
    }
    case 'renaissance':
      // a painter's palette: every colour on one board
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 6C16 6 5 17 5 30c0 11 9 19 19 19 5 0 6 3 6 5 0 2 2 4 5 4 14 0 24-12 24-27C59 17 47 6 32 6Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="41" cy="44" r="6.5" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2.5" />
          <circle cx="19" cy="22" r="4.4" fill="var(--play-1)" />
          <circle cx="32" cy="17" r="4.4" fill="var(--play-3)" />
          <circle cx="45" cy="22" r="4.4" fill="var(--play-4)" />
          <circle cx="49" cy="33" r="4.4" fill="var(--play-6)" />
          <circle cx="17" cy="35" r="4.4" fill="var(--play-8)" />
        </svg>
      );
    case 'full-house':
      // a house with every window lit — one category, finished
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 6 L58 26 H50 V56 H14 V26 H6 Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <rect x="20" y="30" width="9" height="9" rx="2" fill="var(--play-9)" />
          <rect x="35" y="30" width="9" height="9" rx="2" fill="var(--play-9)" />
          <rect x="20" y="43" width="9" height="9" rx="2" fill="var(--play-9)" />
          <rect x="35" y="43" width="9" height="9" rx="2" fill="var(--play-9)" />
          <rect x="27.5" y="17" width="9" height="7" rx="2" fill="var(--play-9)" />
        </svg>
      );
    case 'egg':
      // found: a decorated egg (the still-hidden mystery plate is above the switch)
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 5c11 0 21 16 21 29a21 21 0 0 1-42 0C11 21 21 5 32 5Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M13 32 L20 26 L27 32 L34 26 L41 32 L48 26 L52 30" fill="none" stroke="var(--play-9)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="22" cy="44" r="3.4" fill="var(--play-9)" />
          <circle cx="32" cy="49" r="3.4" fill="var(--play-9)" />
          <circle cx="42" cy="44" r="3.4" fill="var(--play-9)" />
        </svg>
      );
  }
}

/* ---------- shareable landmark card (canvas, same family as the win card) ---------- */

function resolvePlayColor(slot: number): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--play-${slot}`).trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#ff9f0a';
}

/** the card's headline number and its caption, one per landmark kind */
function cardStat(def: LandmarkDef, total: number): [string, string] {
  switch (def.kind) {
    case 'streak':
      return [String(def.days), 'DAY STREAK'];
    case 'first':
      return ['GO!', 'THE COLLECTION BEGINS'];
    case 'plays':
      return [String(def.count), 'GAMES FINISHED'];
    case 'clean-wins':
      return [String(def.count), 'WINS WITH NO HELP'];
    case 'level':
      return [String(def.level), `LEVEL · ${def.title.toUpperCase()}`];
    case 'daily-first':
      return ['DAY 1', 'THE DAILY HABIT BEGINS'];
    case 'daily-streak':
      return [String(def.days), 'DAILY CHALLENGES IN A ROW'];
    case 'daily-collector':
      return [String(total), 'GAMES SOLVED AS A DAILY'];
    case 'all-played':
      return [String(total), 'GAMES PLAYED'];
    case 'difficulty':
      return [String(total), `GAMES BEATEN ON ${def.difficulty!.toUpperCase()}`];
    case 'category':
      return [String(total), `${categoryName(def.category!).toUpperCase()} GAMES BEATEN`];
    case 'clean-streak':
      return [String(def.count), 'CLEAN WINS IN A ROW'];
    case 'flawless':
      return ['0', 'MISTAKES, NO HELP'];
    case 'speed':
      return [`${def.seconds}s`, 'CLEAN WIN, UNDER'];
    case 'time-of-day':
      return def.moment === 'night' ? ['4AM', 'STILL PLAYING BEFORE'] : ['6AM', 'ALREADY PLAYING BY'];
    case 'comeback':
      return def.count === 1 ? ['1', 'LOSS, THEN A WIN'] : ['3', 'RD TIME LUCKY'];
    case 'genre-hopper':
      return [String(total), 'CATEGORIES IN ONE DAY'];
    case 'deep-cut':
      return ['10%', 'THE BOTTOM OF THE PLAY COUNTS'];
    case 'share':
      return def.feat === 'share-app' ? ['1st', 'FRIEND GIVEN THE LINK'] : ['1st', 'WIN CARD MADE'];
    case 'backup':
      return def.feat === 'backup-export' ? ['OUT', 'DATA EXPORTED'] : ['IN', 'DATA BROUGHT HOME'];
    case 'renaissance':
      return [String(total), 'CATEGORIES, ALL WON CLEAN'];
    case 'full-house':
      return [String(total), 'GAMES SWEPT IN ONE CATEGORY'];
    case 'egg':
      return ['★', 'SECRET FOUND'];
  }
}

function renderLandmarkCard(
  def: LandmarkDef,
  unlockedAt: number,
  total: number,
  player: { name: string; emoji: string }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const COLOR = resolvePlayColor(def.slot);
  const RGB = hexToRgb(COLOR);
  const W = CARD_W;

  const t = drawCardChrome(ctx, RGB, RGB);

  // emblem
  ctx.font = `170px ${EMOJI_FONT}`;
  ctx.fillText(def.emoji, W / 2, 330);

  // headline
  ctx.fillStyle = COLOR;
  ctx.font = `700 38px ${FONT}`;
  ctx.fillText('L A N D M A R K   U N L O C K E D', W / 2, 478);

  // title
  ctx.fillStyle = t.text;
  ctx.font = `800 ${def.title.length > 12 ? 84 : 104}px ${FONT}`;
  ctx.fillText(def.title, W / 2, 588);

  // requirement pill
  pill(ctx, def.requirement.toUpperCase(), W / 2, 700, COLOR, `rgba(${RGB},0.14)`, `700 30px ${FONT}`, 34, 62);

  // the big middle stat — exhaustive on kind, never a fallback: a new
  // landmark kind falling into the category branch would read another
  // trophy's caption (and crash on the missing category name)
  const stat = cardStat(def, total);
  ctx.fillStyle = COLOR;
  ctx.font = `800 190px ${FONT}`;
  ctx.fillText(stat[0], W / 2, 905);
  ctx.fillStyle = alpha(t.text, 0.6);
  ctx.font = `700 33px ${FONT}`;
  ctx.fillText(stat[1], W / 2, 1030);

  // unlock date
  const date = new Date(unlockedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  pill(ctx, `★  UNLOCKED ${date.toUpperCase()}`, W / 2, 1150, '#30d158', 'rgba(48,209,88,0.13)', `700 29px ${FONT}`, 36, 62);

  // footer
  ctx.fillStyle = alpha(t.text, 0.6);
  ctx.font = `600 33px ${FONT}`;
  drawFooterWithAvatar(ctx, player.emoji, `${player.name}  ·  100 GAMES`, W / 2, 1256);

  return canvas;
}

/* ---------- earned badges (the panel inside the level card) ---------- */

/**
 * Every UNLOCKED landmark as a small plate, in catalogue order, shown at the
 * foot of the level card.
 *
 * Unlocked ONLY — this is the one surface in the app that is a display case
 * rather than a checklist. The gallery below already shows the whole
 * catalogue with locked art and live meters, which is what tells a player
 * what to chase; repeating the locked half here would make the level card a
 * second, worse copy of it. So the panel answers a different question: what
 * have I actually got? Catalogue order (not newest-first) keeps the families
 * grouped, so a wall of unlabelled 26px art still reads as a collection, and
 * it matches the gallery below rather than disagreeing with it.
 *
 * With nothing unlocked it renders nothing at all: an empty case with a "0"
 * over it is worse than no case.
 */
export function LandmarkBadges({ progress }: { progress: PlayerProgress }) {
  const [selected, setSelected] = useState<LandmarkDef | null>(null);
  const earned = LANDMARKS.filter((d) => progress.landmarks[d.id]);
  if (earned.length === 0) return null;

  const unlockedAt = selected ? progress.landmarks[selected.id]?.at : null;
  return (
    <div className="lm-badges">
      <p className="lm-badges-head">
        Badges earned
        <span>{earned.length}</span>
      </p>
      <div className="lm-badge-row">
        {earned.map((def) => (
          <button
            key={def.id}
            className="lm-badge"
            style={{ '--lm': `var(--play-${def.slot})` } as CSSProperties}
            onClick={() => {
              sfx.tap();
              setSelected(def);
            }}
            title={def.title}
            aria-label={`${def.title} — unlocked`}
          >
            <LandmarkArt def={def} size={26} />
          </button>
        ))}
      </div>

      {/* tappable, because a 26px emblem with no caption says nothing on a
          phone, where `title` never appears. Deliberately the short form —
          art, requirement, date: sharing lives in the gallery, and two Share
          buttons for one trophy is a choice nobody needs to make. */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title}>
        {selected && unlockedAt && (
          <div
            className="lm-detail"
            style={{ '--lm': `var(--play-${selected.slot})` } as CSSProperties}
          >
            <div className="lm-modal-art">
              <LandmarkArt def={selected} size={64} />
            </div>
            <p className="lm-req">{selected.requirement}</p>
            <div className="lm-status">
              <Chip tone="good">
                Unlocked{' '}
                {new Date(unlockedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Chip>
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------- the gallery ---------- */

function LandmarkCard({
  def,
  unlockedAt,
  meter,
  onClick
}: {
  def: LandmarkDef;
  unlockedAt: number | null;
  meter: { done: number; total: number };
  onClick: () => void;
}) {
  const locked = unlockedAt === null;
  /* A secret keeps its secret: no title, no meter, no emblem until it is
     found. The card still exists — knowing there IS something to find is
     the whole appeal of an easter egg; knowing what it is would end it. */
  const hidden = locked && !!def.secret;
  return (
    <button
      className={`lm-card fx-card ${locked ? 'locked' : ''}`}
      style={{ '--lm': `var(--play-${def.slot})` } as CSSProperties}
      onClick={onClick}
      aria-label={hidden ? 'Undiscovered secret' : `${def.title} — ${locked ? 'locked' : 'unlocked'}`}
    >
      {locked && (
        <span className="lm-lock" aria-hidden>
          <LockIcon size={14} />
        </span>
      )}
      <span className="lm-plate">
        <LandmarkArt def={def} size={40} hidden={hidden} />
      </span>
      <span className="lm-title">{hidden ? '???' : def.title}</span>
      <span className="lm-sub">
        {hidden
          ? 'Hidden'
          : locked
            ? `${meter.done}/${meter.total}`
            : new Date(unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </button>
  );
}

export function LandmarksSection({
  progress,
  streak,
  dailyCurrent
}: {
  progress: PlayerProgress;
  streak: StreakInfo;
  /** the live Daily Challenge streak — the daily meters show what the
      player can still act on, exactly as the play-streak meters do */
  dailyCurrent: number;
}) {
  const { profile } = useAppState();
  const [selected, setSelected] = useState<LandmarkDef | null>(null);
  const [sharing, setSharing] = useState<LandmarkDef | null>(null);

  /* Two galleries, one catalogue: the trophies you can read off and go
     earn, and the secrets you cannot. They are split HERE rather than in
     progress.ts — a secret is an ordinary landmark in every other way
     (unlocks, pays XP, shares), it is only presented differently. */
  const trophies = LANDMARKS.filter((d) => !d.secret);
  const secrets = LANDMARKS.filter((d) => d.secret);
  const unlockedCount = trophies.filter((d) => progress.landmarks[d.id]).length;
  const foundCount = secrets.filter((d) => progress.landmarks[d.id]).length;

  const selectedUnlock = selected ? (progress.landmarks[selected.id] ?? null) : null;
  const selectedHidden = !!selected?.secret && !selectedUnlock;
  const selectedMeter = selected
    ? landmarkMeter(selected, progress, streak, dailyCurrent)
    : null;

  const card = (def: LandmarkDef) => (
    <LandmarkCard
      key={def.id}
      def={def}
      unlockedAt={progress.landmarks[def.id]?.at ?? null}
      meter={landmarkMeter(def, progress, streak, dailyCurrent)}
      onClick={() => {
        sfx.tap();
        setSelected(def);
      }}
    />
  );

  return (
    <section className="setup-section">
      <h3 className="section-title lm-head">
        Landmarks
        <span className="lm-count">
          {unlockedCount} / {trophies.length}
        </span>
      </h3>
      <div className="lm-grid">{trophies.map(card)}</div>

      {secrets.length > 0 && (
        <>
          <h3 className="section-title lm-head lm-egg-head">
            Easter eggs
            <span className="lm-count">
              {foundCount} / {secrets.length}
            </span>
          </h3>
          <p className="lm-egg-note">
            Secrets hidden inside the games. No hints — you'll know when you find one.
          </p>
          <div className="lm-grid">{secrets.map(card)}</div>
        </>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selectedHidden ? 'Undiscovered' : selected?.title}
      >
        {selected && selectedMeter && (
          <div
            className="lm-detail"
            style={{ '--lm': `var(--play-${selected.slot})` } as CSSProperties}
          >
            <div className={`lm-modal-art ${selectedUnlock ? '' : 'locked'}`}>
              <LandmarkArt def={selected} size={64} hidden={selectedHidden} />
            </div>
            <p className="lm-req">
              {selectedHidden
                ? 'A secret somewhere in the app. Play around — it will find you.'
                : selected.requirement}
            </p>
            {selectedUnlock ? (
              <>
                <div className="lm-status">
                  <Chip tone="good">
                    Unlocked{' '}
                    {new Date(selectedUnlock.at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Chip>
                </div>
                <div className="modal-actions">
                  <button className="ghost-btn" onClick={() => setSelected(null)}>
                    Close
                  </button>
                  <button
                    className="primary-btn"
                    onClick={() => {
                      sfx.tap();
                      setSharing(selected);
                      setSelected(null);
                    }}
                  >
                    Share card
                  </button>
                </div>
              </>
            ) : selectedHidden ? (
              <>
                <div className="lm-status">
                  <Chip tone="muted">Not found yet</Chip>
                </div>
                <div className="modal-actions">
                  <button className="ghost-btn" onClick={() => setSelected(null)}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="lm-meter" role="progressbar" aria-valuenow={selectedMeter.done} aria-valuemax={selectedMeter.total}>
                  <div
                    className="lm-meter-fill"
                    style={{
                      width: `${Math.round((selectedMeter.done / Math.max(1, selectedMeter.total)) * 100)}%`
                    }}
                  />
                </div>
                <p className="lm-meter-text">
                  {selectedMeter.done} / {selectedMeter.total}
                  {selected.kind === 'streak' || selected.kind === 'daily-streak'
                    ? ' days'
                    : selected.kind === 'level'
                      ? ' levels'
                      : ''}
                </p>
                <div className="lm-status">
                  <Chip tone="muted">Locked</Chip>
                </div>
                <div className="modal-actions">
                  <button className="ghost-btn" onClick={() => setSelected(null)}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {sharing && progress.landmarks[sharing.id] && (
        <ShareImageModal
          // decode the sprite avatar first, then draw (see ShareCard)
          render={() =>
            loadAvatarSprite(profile.emoji).then(() =>
              renderLandmarkCard(
                sharing,
                progress.landmarks[sharing.id].at,
                landmarkMeter(sharing, progress, streak).total,
                { name: profile.name, emoji: profile.emoji }
              )
            )
          }
          filename="100-games-landmark.png"
          alt={`${sharing.title} landmark card`}
          onClose={() => setSharing(null)}
        />
      )}
    </section>
  );
}
