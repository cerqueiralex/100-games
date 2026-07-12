import type { ReactNode } from 'react';

/*
 * Game identity icons — colorful "sticker" SVGs for the home cards.
 * Style formula (see DESIGN.md "Game icons"): 64×64 viewBox, thick warm
 * ink outline, flat saturated fills, one soft highlight. These are game
 * CONTENT (like memory-card faces), so they deliberately use their own
 * fixed palette instead of theme tokens and look identical on every
 * theme. UI controls keep using the monochrome icons in icons.tsx.
 */

const INK = '#312e28';

/** shared fills, kept to a small palette so the set reads as one family */
const C = {
  red: '#ff5a4e',
  orange: '#ff9f0a',
  yellow: '#ffc933',
  green: '#58c552',
  blue: '#3d9bff',
  sky: '#dff2fb',
  pink: '#ff5d8f',
  paper: '#f2e3c4',
  wood: '#a9764b',
  steel: '#9aa4af',
  white: '#ffffff'
};

const base = {
  width: 42,
  height: 42,
  viewBox: '0 0 64 64',
  'aria-hidden': true as const,
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const sudoku = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="7" fill={C.white} stroke={INK} strokeWidth="3" />
    <rect x="12" y="12" width="13" height="13" rx="3" fill={C.red} />
    <rect x="25.5" y="25.5" width="13" height="13" rx="3" fill={C.yellow} />
    <rect x="39" y="39" width="13" height="13" rx="3" fill={C.blue} />
    <path d="M24.7 11v42M39.3 11v42M11 24.7h42M11 39.3h42" stroke={INK} strokeWidth="2" />
    <text x="18.5" y="19.4" fontSize="10" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">1</text>
    <text x="32" y="32.9" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">5</text>
    <text x="45.5" y="46.4" fontSize="10" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">9</text>
  </svg>
);

const crossword = (
  <svg {...base}>
    <rect x="25.5" y="26" width="13" height="13" rx="3" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="25.5" y="39" width="13" height="13" rx="3" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="38.5" y="26" width="13" height="13" rx="3" fill={INK} stroke={INK} strokeWidth="2.5" />
    <rect x="12.5" y="13" width="13" height="13" rx="3" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="25.5" y="13" width="13" height="13" rx="3" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="38.5" y="13" width="13" height="13" rx="3" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <text x="19" y="20" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">C</text>
    <text x="32" y="20" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">A</text>
    <text x="45" y="20" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">T</text>
    <text x="32" y="33" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">P</text>
    <text x="32" y="46" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">E</text>
  </svg>
);

const wordWheel = (
  <svg {...base}>
    <circle cx="32" cy="32" r="22" fill={C.white} stroke={INK} strokeWidth="3" />
    <path d="M32 10v13M51 43l-11.3-6.5M13 43l11.3-6.5" stroke={INK} strokeWidth="2" />
    <text x="43" y="24.5" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">T</text>
    <text x="21" y="24.5" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">E</text>
    <text x="32" y="46" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">N</text>
    <circle cx="32" cy="32" r="9.5" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <text x="32" y="32.7" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">O</text>
  </svg>
);

const memoryMatch = (
  <svg {...base}>
    <g transform="rotate(-8 25 27)">
      <rect x="14" y="12" width="22" height="29" rx="4" fill={C.blue} stroke={INK} strokeWidth="3" />
      <circle cx="21" cy="20" r="1.9" fill={C.white} opacity="0.6" />
      <circle cx="29" cy="20" r="1.9" fill={C.white} opacity="0.6" />
      <circle cx="21" cy="27" r="1.9" fill={C.white} opacity="0.6" />
      <circle cx="29" cy="27" r="1.9" fill={C.white} opacity="0.6" />
      <circle cx="21" cy="34" r="1.9" fill={C.white} opacity="0.6" />
      <circle cx="29" cy="34" r="1.9" fill={C.white} opacity="0.6" />
    </g>
    <g transform="rotate(8 39 37)">
      <rect x="28" y="22" width="22" height="29" rx="4" fill={C.white} stroke={INK} strokeWidth="3" />
      <path
        d="M39 30.5 L40.9 35 L45.2 35 L41.7 37.9 L43 42.3 L39 39.6 L35 42.3 L36.3 37.9 L32.8 35 L37.1 35 Z"
        fill={C.yellow}
        stroke={INK}
        strokeWidth="2"
      />
    </g>
  </svg>
);

const simon = (
  <svg {...base}>
    <path d="M32 32 L32 10 A22 22 0 0 1 54 32 Z" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <path d="M32 32 L54 32 A22 22 0 0 1 32 54 Z" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <path d="M32 32 L32 54 A22 22 0 0 1 10 32 Z" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <path d="M32 32 L10 32 A22 22 0 0 1 32 10 Z" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <circle cx="32" cy="32" r="7" fill={C.white} stroke={INK} strokeWidth="2.5" />
  </svg>
);

/** brain-cloud shared by the two n-back games */
const BRAIN_PATH =
  'M20 46 a9.5 9.5 0 0 1 -2.5 -18.6 A11.5 11.5 0 0 1 32 16.5 a11.5 11.5 0 0 1 14.5 10.9 A9.5 9.5 0 0 1 44 46 Z';

const nback = (
  <svg {...base}>
    <path d={BRAIN_PATH} fill={C.pink} stroke={INK} strokeWidth="3" />
    <path d="M32 17.5v28M24 30c2.5 1.5 2.5 4.5 0 6M40 27c-2.5 1.5-2.5 4.5 0 6M38.5 38.5c2 1 4.5 0.5 5.5-1" stroke={INK} strokeWidth="2" opacity="0.55" />
    <path d="M51 12 l1.3 3.2 3.2 1.3 -3.2 1.3 -1.3 3.2 -1.3 -3.2 -3.2 -1.3 3.2 -1.3 Z" fill={C.yellow} stroke={INK} strokeWidth="1.6" />
  </svg>
);

const dualNback = (
  <svg {...base}>
    <defs>
      <clipPath id="gi-dnb-left">
        <rect x="6" y="6" width="26" height="52" />
      </clipPath>
    </defs>
    <path d={BRAIN_PATH} fill={C.pink} stroke={INK} strokeWidth="3" />
    <path d={BRAIN_PATH} fill={C.blue} clipPath="url(#gi-dnb-left)" />
    <path d={BRAIN_PATH} stroke={INK} strokeWidth="3" />
    <path d="M32 17.5v28M23 30c2.5 1.5 2.5 4.5 0 6M41 30c-2.5 1.5-2.5 4.5 0 6" stroke={INK} strokeWidth="2" opacity="0.55" />
    <circle cx="47" cy="46" r="8.5" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <text x="47" y="46.7" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">2</text>
  </svg>
);

const numberMerge = (
  <svg {...base}>
    <rect x="12" y="13" width="25" height="25" rx="6" fill={C.green} stroke={INK} strokeWidth="3" />
    <text x="24.5" y="26.2" fontSize="14" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">2</text>
    <rect x="26" y="26" width="27" height="27" rx="6" fill={C.yellow} stroke={INK} strokeWidth="3" />
    <text x="39.5" y="40.2" fontSize="15" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">4</text>
  </svg>
);

const colorConnect = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="8" fill={C.white} stroke={INK} strokeWidth="3" />
    <path d="M20 21 h13 a7 7 0 0 1 7 7 v15" stroke={C.green} strokeWidth="7" />
    <circle cx="20" cy="21" r="5.5" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <circle cx="40" cy="43" r="5.5" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <circle cx="46" cy="19" r="4.5" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <circle cx="20" cy="43" r="4.5" fill={C.blue} stroke={INK} strokeWidth="2.5" />
  </svg>
);

const ticTacToe = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="8" fill={C.white} stroke={INK} strokeWidth="3" />
    <path d="M24.7 11v42M39.3 11v42M11 24.7h42M11 39.3h42" stroke={INK} strokeWidth="2" />
    <path d="M14.5 14.5 l6.5 6.5 M21 14.5 l-6.5 6.5" stroke={C.red} strokeWidth="3.5" />
    <circle cx="32" cy="32" r="4.6" stroke={C.blue} strokeWidth="3.5" />
    <path d="M43.5 43.5 l6.5 6.5 M50 43.5 l-6.5 6.5" stroke={C.red} strokeWidth="3.5" />
  </svg>
);

const imagePuzzle = (
  <svg {...base}>
    <path
      d="M13 22 h8.5 c-1.5 -7 3 -10 7.5 -10 c4.5 0 9 3 7.5 10 H45 v8.5 c7 -1.5 10 3 10 7.5 c0 4.5 -3 9 -10 7.5 V54 H13 Z"
      fill={C.blue}
      stroke={INK}
      strokeWidth="3"
    />
    <rect x="18" y="27" width="9" height="4.5" rx="2.25" fill={C.white} opacity="0.55" transform="rotate(-18 22.5 29)" />
  </svg>
);

const maze = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="10" fill={C.green} stroke={INK} strokeWidth="3" />
    <path d="M32 54 V44 H20 V20 H44 V34 H32" stroke={C.white} strokeWidth="4" fill="none" />
    <circle cx="26" cy="27" r="3.6" fill={C.red} stroke={INK} strokeWidth="2" />
  </svg>
);

const cryptogram = (
  <svg {...base}>
    <rect x="7" y="21" width="21" height="21" rx="5" fill={C.paper} stroke={INK} strokeWidth="3" />
    <path
      d="M17.5 24.5 L19.4 29 L23.7 29 L20.2 31.9 L21.5 36.3 L17.5 33.6 L13.5 36.3 L14.8 31.9 L11.3 29 L15.6 29 Z"
      fill={C.orange}
      stroke={INK}
      strokeWidth="1.8"
    />
    <path d="M31.5 28.5 h6 M31.5 34.5 h6" stroke={INK} strokeWidth="3" />
    <rect x="41" y="21" width="21" height="21" rx="5" fill={C.white} stroke={INK} strokeWidth="3" />
    <text x="51.5" y="32.2" fontSize="13" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">A</text>
  </svg>
);

const minesweeper = (
  <svg {...base}>
    <path d="M30 19 v-6 M30 53 v6 M13 36 h-6 M47 36 h6 M18 24 l-4.3 -4.3 M42 48 l4.3 4.3 M18 48 l-4.3 4.3 M42 24 l4.3 -4.3" stroke={INK} strokeWidth="4" />
    <circle cx="30" cy="36" r="13.5" fill="#4a453d" stroke={INK} strokeWidth="3" />
    <circle cx="25" cy="31" r="3.6" fill={C.white} opacity="0.85" />
    <path d="M47 10 v14" stroke={INK} strokeWidth="2.5" />
    <path d="M47 10 L56 13.75 L47 17.5 Z" fill={C.red} stroke={INK} strokeWidth="2" />
  </svg>
);

const battleship = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="10" fill={C.blue} stroke={INK} strokeWidth="3" />
    <path d="M15.5 38 h33 l-5 8.5 h-23 Z" fill={C.steel} stroke={INK} strokeWidth="2.5" />
    <rect x="27" y="29" width="11" height="9" rx="1.5" fill={C.steel} stroke={INK} strokeWidth="2.5" />
    <path d="M20 34.5 h5.5 M23 34.5 v3.5" stroke={INK} strokeWidth="2.5" />
    <circle cx="32.5" cy="26" r="2.4" fill={C.yellow} stroke={INK} strokeWidth="1.8" />
    <path d="M15 50.5 c3 -2.5 6 -2.5 9 0 M27 50.5 c3 -2.5 6 -2.5 9 0" stroke={C.white} strokeWidth="2.5" opacity="0.8" fill="none" />
    <path d="M45 16.5 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 Z" fill={C.red} stroke={INK} strokeWidth="1.7" />
  </svg>
);

const logicGrid = (
  <svg {...base}>
    <path d="M40 40 L51 51" stroke={INK} strokeWidth="10" />
    <path d="M41 41 L49.5 49.5" stroke={C.wood} strokeWidth="5" />
    <circle cx="27" cy="27" r="15" fill={C.blue} stroke={INK} strokeWidth="3" />
    <circle cx="27" cy="27" r="9.5" fill={C.sky} stroke={INK} strokeWidth="2" />
    <path d="M22.8 27.5 l3 3 l5.5 -6.5" stroke={C.green} strokeWidth="3" />
    <circle cx="22.5" cy="21.5" r="2" fill={C.white} opacity="0.9" />
  </svg>
);

/** keyed by GameDefinition.id */
export const gameIcons: Record<string, ReactNode> = {
  sudoku,
  crossword,
  'word-wheel': wordWheel,
  'memory-match': memoryMatch,
  simon,
  'n-back': nback,
  'dual-n-back': dualNback,
  'number-merge': numberMerge,
  'color-connect': colorConnect,
  'tic-tac-toe': ticTacToe,
  'image-puzzle': imagePuzzle,
  maze,
  cryptogram,
  minesweeper,
  'logic-grid': logicGrid,
  battleship
};
