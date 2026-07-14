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

const housePuzzles = (
  <svg {...base}>
    <path d="M8 52 h48" stroke={INK} strokeWidth="3" />
    <rect x="9" y="34" width="14" height="18" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <path d="M7 35 L16 26.5 L25 35 Z" fill={C.red} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="13.5" y="42" width="5" height="10" rx="1" fill={INK} opacity="0.55" />
    <rect x="25" y="30" width="15" height="22" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <path d="M23 31 L32.5 22 L42 31 Z" fill={C.yellow} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="29.5" y="36" width="6" height="5" rx="1" fill={C.white} stroke={INK} strokeWidth="1.6" />
    <rect x="41.5" y="34" width="14" height="18" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <path d="M39.5 35 L48.5 26.5 L57.5 35 Z" fill={C.blue} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="45.5" y="39" width="5.5" height="5" rx="1" fill={C.white} stroke={INK} strokeWidth="1.6" />
    <path d="M13 14 l1.5 3.7 3.7 1.5 -3.7 1.5 -1.5 3.7 -1.5 -3.7 -3.7 -1.5 3.7 -1.5 Z" fill={C.yellow} stroke={INK} strokeWidth="1.7" />
    <text x="48" y="15" fontSize="12" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">?</text>
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

const klondike = (
  <svg {...base}>
    <g transform="rotate(-17 30 38)">
      <rect x="11" y="18" width="24" height="34" rx="4" fill={C.blue} stroke={INK} strokeWidth="3" />
      <rect x="14.5" y="21.5" width="8" height="3" rx="1.5" fill={C.white} opacity="0.45" />
    </g>
    <g transform="rotate(-3 32 36)">
      <rect x="18" y="15" width="24" height="34" rx="4" fill={C.paper} stroke={INK} strokeWidth="3" />
    </g>
    <g transform="rotate(13 39 32)">
      <rect x="27" y="14" width="25" height="35" rx="4.5" fill={C.white} stroke={INK} strokeWidth="3" />
      <text x="32.5" y="21" fontSize="8.5" fontWeight="800" fill={C.red} textAnchor="middle" dominantBaseline="central">
        A
      </text>
      <g transform="translate(27.9 22.6) scale(0.36)">
        <path d="M12 21 C 3 14, 4 6, 9 6 C 11 6, 12 8, 12 9 C 12 8, 13 6, 15 6 C 20 6, 21 14, 12 21 Z" fill={C.red} stroke={INK} strokeWidth="2.2" />
      </g>
      <g transform="translate(29.7 24.6) scale(0.82)">
        <path d="M12 21 C 3 14, 4 6, 9 6 C 11 6, 12 8, 12 9 C 12 8, 13 6, 15 6 C 20 6, 21 14, 12 21 Z" fill={C.red} stroke={INK} strokeWidth="2.4" />
      </g>
    </g>
  </svg>
);

const pegSolitaire = (
  <svg {...base}>
    <rect x="5" y="36" width="54" height="21" rx="7" fill={C.wood} stroke={INK} strokeWidth="3" />
    <ellipse cx="16" cy="46" rx="5" ry="3.6" fill={INK} opacity="0.38" />
    <ellipse cx="32" cy="46" rx="5" ry="3.6" fill={INK} opacity="0.38" />
    <ellipse cx="48" cy="46" rx="5" ry="3.6" fill={INK} opacity="0.38" />
    <circle cx="32" cy="44" r="6.5" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <path d="M16 41 Q32 12 48 41" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="3 3.5" opacity="0.7" />
    <circle cx="32" cy="16" r="8.5" fill={C.red} stroke={INK} strokeWidth="3" />
    <circle cx="29" cy="13" r="2.6" fill={C.white} opacity="0.6" />
  </svg>
);

const dotsBoxes = (
  <svg {...base}>
    <rect x="8" y="8" width="48" height="48" rx="11" fill={C.paper} stroke={INK} strokeWidth="3" />
    <rect x="19.5" y="19.5" width="11" height="11" rx="2.5" fill={C.blue} />
    <path
      d="M18 18 H32 M18 32 H32 M18 18 V32 M32 18 V32 M32 18 H46"
      stroke={C.orange}
      strokeWidth="3.4"
      strokeLinecap="round"
    />
    <rect x="22.4" y="22.4" width="5.2" height="5.2" rx="1.2" transform="rotate(45 25 25)" fill={C.white} />
    <circle cx="18" cy="18" r="2.8" fill={INK} />
    <circle cx="32" cy="18" r="2.8" fill={INK} />
    <circle cx="46" cy="18" r="2.8" fill={INK} />
    <circle cx="18" cy="32" r="2.8" fill={INK} />
    <circle cx="32" cy="32" r="2.8" fill={INK} />
    <circle cx="46" cy="32" r="2.8" fill={INK} />
    <circle cx="18" cy="46" r="2.8" fill={INK} />
    <circle cx="32" cy="46" r="2.8" fill={INK} />
    <circle cx="46" cy="46" r="2.8" fill={INK} />
    <circle cx="14" cy="13" r="3" fill={C.white} opacity="0.5" />
  </svg>
);

const connectFour = (
  <svg {...base}>
    <path d="M24.5 13l-1.6 3.4M39.5 13l1.6 3.4" stroke={INK} strokeWidth="2" opacity="0.45" strokeLinecap="round" />
    <circle cx="32" cy="9.5" r="6.2" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <circle cx="29.8" cy="7.4" r="1.7" fill={C.white} opacity="0.85" />
    <rect x="12" y="20" width="40" height="34" rx="6" fill={C.blue} stroke={INK} strokeWidth="3" />
    <rect x="15.5" y="23" width="8" height="28" rx="4" fill={C.white} opacity="0.12" />
    <circle cx="22" cy="32" r="5.4" fill={C.sky} stroke={INK} strokeWidth="2" />
    <circle cx="32" cy="32" r="5.4" fill={C.sky} stroke={INK} strokeWidth="2" />
    <circle cx="42" cy="32" r="5.4" fill={C.red} stroke={INK} strokeWidth="2" />
    <circle cx="22" cy="45" r="5.4" fill={C.red} stroke={INK} strokeWidth="2" />
    <circle cx="32" cy="45" r="5.4" fill={C.yellow} stroke={INK} strokeWidth="2" />
    <circle cx="42" cy="45" r="5.4" fill={C.yellow} stroke={INK} strokeWidth="2" />
  </svg>
);

const checkers = (
  <svg {...base}>
    <rect x="9" y="9" width="46" height="46" rx="9" fill={C.paper} stroke={INK} strokeWidth="3" />
    <g fill={C.wood}>
      <rect x="11" y="11" width="10.7" height="10.7" />
      <rect x="32.4" y="11" width="10.7" height="10.7" />
      <rect x="21.7" y="21.7" width="10.7" height="10.7" />
      <rect x="43.1" y="21.7" width="10.7" height="10.7" />
      <rect x="11" y="32.4" width="10.7" height="10.7" />
      <rect x="32.4" y="32.4" width="10.7" height="10.7" />
      <rect x="21.7" y="43.1" width="10.7" height="10.7" />
    </g>
    <circle cx="21.5" cy="42" r="8" fill={INK} stroke={INK} strokeWidth="2.5" />
    <ellipse cx="19" cy="39.4" rx="3" ry="1.8" fill={C.white} opacity="0.28" />
    <circle cx="39" cy="21" r="9.5" fill={C.red} stroke={INK} strokeWidth="3" />
    <circle cx="35.6" cy="17.8" r="2.6" fill={C.white} opacity="0.35" />
    <path
      d="M32 22 L31 14.5 L35.4 18 L39 13 L42.6 18 L47 14.5 L46 22 Z"
      fill={C.yellow}
      stroke={INK}
      strokeWidth="2"
    />
  </svg>
);

const reversi = (
  <svg {...base}>
    <rect x="8" y="8" width="48" height="48" rx="8" fill={C.green} stroke={INK} strokeWidth="3" />
    <path d="M8 24h48M8 40h48M24 8v48M40 8v48" stroke={INK} strokeWidth="1.6" opacity="0.4" />
    <circle cx="16" cy="16" r="6" fill={INK} stroke={INK} strokeWidth="2.5" />
    <circle cx="48" cy="48" r="6" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <path d="M32 21.5 A2.6 10.5 0 0 0 32 42.5 Z" fill={C.white} />
    <path d="M32 21.5 A2.6 10.5 0 0 1 32 42.5 Z" fill={INK} />
    <ellipse cx="32" cy="32" rx="2.6" ry="10.5" fill="none" stroke={INK} strokeWidth="2.5" />
    <circle cx="45.6" cy="45.2" r="1.9" fill={C.white} opacity="0.85" />
  </svg>
);

const tangram = (
  <svg {...base}>
    <polygon points="32,32 32,12 12,32" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <polygon points="32,32 12,32 32,52" fill={C.orange} stroke={INK} strokeWidth="2.5" />
    <polygon points="32,22 42,22 32,12" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <polygon points="32,22 42,22 42,32 32,32" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <polygon points="42,32 42,42 32,52 32,42" fill={C.sky} stroke={INK} strokeWidth="2.5" />
    <polygon points="32,32 42,32 32,42" fill={C.pink} stroke={INK} strokeWidth="2.5" />
    <polygon points="42,42 42,22 52,32" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <polygon points="32,12 52,32 32,52 12,32" fill="none" stroke={INK} strokeWidth="3" />
    <path d="M24 20 L31 13" stroke={C.white} strokeWidth="2.4" opacity="0.5" strokeLinecap="round" />
  </svg>
);

const gridlock = (
  <svg {...base}>
    <rect x="9" y="10" width="46" height="44" rx="8" fill={C.steel} stroke={INK} strokeWidth="3" />
    <rect x="23" y="13" width="9" height="16" rx="3" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <rect x="24.5" y="14.5" width="6" height="4" rx="1.2" fill={C.sky} stroke={INK} strokeWidth="1.3" />
    <rect x="40" y="21" width="9" height="21" rx="3" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <rect x="41.5" y="22.5" width="6" height="4" rx="1.2" fill={C.sky} stroke={INK} strokeWidth="1.3" />
    <rect x="12" y="30" width="21" height="9.6" rx="3" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <rect x="26" y="31.7" width="5" height="6.2" rx="1.3" fill={C.sky} stroke={INK} strokeWidth="1.3" />
    <rect x="13" y="31.4" width="19" height="2.6" rx="1.3" fill={C.white} opacity="0.24" />
    <path d="M50 34.8 h7" stroke={C.yellow} strokeWidth="3.2" strokeLinecap="round" />
    <path d="M54 30.9 l4.2 3.9 -4.2 3.9" fill="none" stroke={INK} strokeWidth="2.6" />
  </svg>
);

const jigsaw = (
  <svg {...base}>
    <path
      d="M 4.5 4.5 L 22.5 4.5 L 22.5 10.8 C 22.5 13.5 27.9 9.36 27.9 13.5 C 27.9 17.64 22.5 13.5 22.5 16.2 L 22.5 22.5 L 4.5 22.5 L 4.5 4.5 Z"
      transform="translate(9 28)"
      fill={C.green}
      stroke={INK}
      strokeWidth="2.5"
    />
    <path
      d="M 4.5 4.5 L 22.5 4.5 L 22.5 22.5 L 4.5 22.5 L 4.5 16.2 C 4.5 13.5 9.9 17.64 9.9 13.5 C 9.9 9.36 4.5 13.5 4.5 10.8 L 4.5 4.5 Z"
      transform="translate(27 28)"
      fill={C.blue}
      stroke={INK}
      strokeWidth="2.5"
    />
    <g transform="translate(15 6) rotate(-10 15 15)">
      <path
        d="M 5 5 L 12 5 C 15 5 10.4 -1 15 -1 C 19.6 -1 15 5 18 5 L 25 5 L 25 12 C 25 15 31 10.4 31 15 C 31 19.6 25 15 25 18 L 25 25 L 5 25 L 5 5 Z"
        fill={C.red}
        stroke={INK}
        strokeWidth="2.5"
      />
      <rect x="8.5" y="9" width="7.5" height="4" rx="2" fill={C.white} opacity="0.5" />
    </g>
  </svg>
);

const untangle = (
  <svg {...base}>
    <rect x="8" y="8" width="48" height="48" rx="12" fill={C.sky} stroke={INK} strokeWidth="3" />
    <path d="M20 20 H44 M44 20 V44 M44 44 H20 M20 44 V20" stroke={C.blue} strokeWidth="3.4" />
    <path d="M20 20 L44 44 M44 20 L20 44" stroke={C.red} strokeWidth="3.4" />
    <circle cx="20" cy="20" r="6.6" fill={C.yellow} stroke={INK} strokeWidth="2.7" />
    <circle cx="44" cy="20" r="6.6" fill={C.green} stroke={INK} strokeWidth="2.7" />
    <circle cx="20" cy="44" r="6.6" fill={C.green} stroke={INK} strokeWidth="2.7" />
    <circle cx="44" cy="44" r="6.6" fill={C.yellow} stroke={INK} strokeWidth="2.7" />
    <rect x="16.5" y="16.8" width="6" height="3" rx="1.5" fill={C.white} opacity="0.6" transform="rotate(-40 19.5 18.3)" />
  </svg>
);

const sokoban = (
  <svg {...base}>
    <circle cx="42" cy="40" r="15" fill={C.green} opacity="0.22" />
    <rect x="31" y="34" width="22" height="22" rx="4" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <path d="M42 34v22M31 45h22" stroke={INK} strokeWidth="1.6" opacity="0.5" />
    <rect x="31" y="27" width="22" height="22" rx="3" fill={C.wood} stroke={INK} strokeWidth="3" />
    <path d="M31 38h22M42 27v22" stroke={INK} strokeWidth="2" />
    <rect x="34" y="30" width="6" height="4" rx="1" fill={C.white} opacity="0.4" />
    <rect x="7" y="34" width="17" height="17" rx="7" fill={C.blue} stroke={INK} strokeWidth="3" />
    <circle cx="13" cy="41" r="1.7" fill={C.white} />
    <circle cx="19" cy="41" r="1.7" fill={C.white} />
    <path d="M25 30h6M31 30l-2.4-2.4M31 30l-2.4 2.4" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const laserMirrors = (
  <svg {...base}>
    <rect x="6" y="6" width="52" height="52" rx="9" fill={C.paper} stroke={INK} strokeWidth="3" />
    <path d="M15 46 H34 V19" fill="none" stroke={C.red} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 46 H34 V19" fill="none" stroke={C.yellow} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="40" width="13" height="13" rx="3" fill={C.orange} stroke={INK} strokeWidth="2.5" />
    <circle cx="14.5" cy="46.5" r="2.6" fill={C.yellow} />
    <rect x="27" y="39" width="14" height="14" rx="3" fill={C.steel} stroke={INK} strokeWidth="2.5" />
    <line x1="30" y1="50" x2="38" y2="42" stroke={C.white} strokeWidth="2.6" strokeLinecap="round" />
    <g transform="rotate(45 34 14)">
      <rect x="28" y="8" width="12" height="12" rx="2.5" fill={C.green} stroke={INK} strokeWidth="2.5" />
    </g>
    <circle cx="34" cy="14" r="2.3" fill={C.white} />
    <circle cx="13" cy="13" r="3" fill={C.white} opacity="0.5" />
  </svg>
);

const sequenceCracker = (
  <svg {...base}>
    <rect x="30" y="30" width="28" height="28" rx="9" fill="none" stroke={C.yellow} strokeWidth="3" opacity="0.4" />
    <path d="M56 30l3-3M58 44h4M45 58v4" stroke={C.yellow} strokeWidth="2.5" opacity="0.7" />
    <rect x="9" y="9" width="22" height="22" rx="5" fill={C.blue} stroke={INK} strokeWidth="3" />
    <rect x="33" y="9" width="22" height="22" rx="5" fill={C.green} stroke={INK} strokeWidth="3" />
    <rect x="9" y="33" width="22" height="22" rx="5" fill={C.orange} stroke={INK} strokeWidth="3" />
    <rect x="33" y="33" width="22" height="22" rx="5" fill={C.yellow} stroke={INK} strokeWidth="3" />
    <rect x="12.5" y="12.5" width="8" height="4" rx="2" fill={C.white} opacity="0.5" />
    <text x="20" y="21" fontSize="13" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">2</text>
    <text x="44" y="21" fontSize="13" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">4</text>
    <text x="20" y="45" fontSize="13" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">8</text>
    <text x="44" y="45" fontSize="14" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">?</text>
  </svg>
);

const pipes = (
  <svg {...base}>
    <path
      d="M11 46 L34 46 L34 22 L53 22"
      fill="none"
      stroke={INK}
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 46 L34 46 L34 22 L53 22"
      fill="none"
      stroke={C.blue}
      strokeWidth="10.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 46 L34 46 L34 22 L51 22"
      fill="none"
      stroke={C.sky}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    <path d="M29.5 42 L29.5 27" stroke={C.white} strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
    <path
      d="M54 30 C54 30 49.5 35.5 49.5 39 a4.5 4.5 0 0 0 9 0 C58.5 35.5 54 30 54 30 Z"
      fill={C.sky}
      stroke={INK}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <circle cx="52.6" cy="38.5" r="1.3" fill={C.white} opacity="0.8" />
  </svg>
);

const towerOfHanoi = (
  <svg {...base}>
    <rect x="6" y="50" width="52" height="9" rx="3.5" fill={C.wood} stroke={INK} strokeWidth="3" />
    <rect x="15" y="22" width="4" height="29" rx="2" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="30" y="22" width="4" height="29" rx="2" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="45" y="22" width="4" height="29" rx="2" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="3" y="42.5" width="28" height="8" rx="4" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <rect x="6" y="34.5" width="22" height="8" rx="4" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <rect x="9" y="26.5" width="16" height="8" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="12" y="18.5" width="10" height="8" rx="4" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <rect x="14" y="20" width="4" height="2" rx="1" fill={C.white} opacity="0.6" />
  </svg>
);

const targetNumber = (
  <svg {...base}>
    <rect x="7" y="7" width="50" height="21" rx="6" fill={C.yellow} stroke={INK} strokeWidth="3" />
    <rect x="10" y="10" width="44" height="6" rx="3" fill={C.white} opacity="0.35" />
    <text
      x="32"
      y="18.6"
      fontSize="14"
      fontWeight="800"
      fill={INK}
      textAnchor="middle"
      dominantBaseline="central"
    >
      532
    </text>
    <g stroke={INK} strokeWidth="2.5">
      <rect x="8" y="34" width="14" height="12" rx="3" fill={C.red} />
      <rect x="25" y="34" width="14" height="12" rx="3" fill={C.green} />
      <rect x="42" y="34" width="14" height="12" rx="3" fill={C.blue} />
      <rect x="8" y="49" width="14" height="12" rx="3" fill={C.orange} />
      <rect x="25" y="49" width="14" height="12" rx="3" fill={C.pink} />
      <rect x="42" y="49" width="14" height="12" rx="3" fill={C.sky} />
    </g>
    <g fontSize="8" fontWeight="800" textAnchor="middle" dominantBaseline="central">
      <text x="15" y="40.4" fill={C.white}>5</text>
      <text x="32" y="40.4" fill={C.white}>6</text>
      <text x="49" y="40.4" fill={C.white}>3</text>
      <text x="15" y="55.4" fill={C.white}>1</text>
      <text x="32" y="55.4" fill={C.white}>9</text>
      <text x="49" y="55.4" fill={INK}>8</text>
    </g>
  </svg>
);

const make24 = (
  <svg {...base}>
    <rect x="4" y="9" width="13" height="19" rx="3" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <rect x="18" y="9" width="13" height="19" rx="3" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="32" y="9" width="13" height="19" rx="3" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <rect x="46" y="9" width="13" height="19" rx="3" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <text x="10.5" y="19" fontSize="11" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">4</text>
    <text x="24.5" y="19" fontSize="11" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">6</text>
    <text x="38.5" y="19" fontSize="11" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">8</text>
    <text x="52.5" y="19" fontSize="11" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">3</text>
    <rect x="9" y="37" width="46" height="19" rx="9" fill={C.orange} stroke={INK} strokeWidth="3" />
    <ellipse cx="22" cy="42.5" rx="8" ry="2.4" fill={C.white} opacity="0.4" />
    <text x="32" y="47" fontSize="13" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">=24</text>
  </svg>
);

const game2048 = (
  <svg {...base}>
    <rect x="8" y="7" width="15" height="15" rx="4" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <text x="15.5" y="15" fontSize="9" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">2</text>
    <rect x="24.5" y="7" width="15" height="15" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <text x="32" y="15" fontSize="9" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">4</text>
    <rect x="41" y="7" width="15" height="15" rx="4" fill={C.orange} stroke={INK} strokeWidth="2.5" />
    <text x="48.5" y="15" fontSize="9" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">8</text>
    <rect x="8" y="26" width="48" height="30" rx="7" fill={C.blue} stroke={INK} strokeWidth="3" />
    <ellipse cx="19" cy="33" rx="7" ry="3.2" fill={C.white} opacity="0.28" />
    <text x="32" y="42" fontSize="13.5" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">2048</text>
  </svg>
);

const mathSprint = (
  <svg {...base}>
    <rect x="5" y="17" width="42" height="34" rx="6" fill={C.wood} stroke={INK} strokeWidth="3" />
    <rect x="9" y="21" width="34" height="26" rx="3" fill={C.green} />
    <rect x="12" y="24" width="12" height="3" rx="1.5" fill={C.white} opacity="0.35" />
    <text x="26" y="34" fontSize="11" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">7×8</text>
    <text x="26" y="43.5" fontSize="9" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">= ?</text>
    <rect x="49" y="8.5" width="8" height="4" rx="2" transform="rotate(22 53 10.5)" fill={C.steel} stroke={INK} strokeWidth="2" />
    <circle cx="49" cy="22" r="13" fill={C.red} stroke={INK} strokeWidth="3" />
    <circle cx="49" cy="22" r="8.5" fill={C.white} />
    <path d="M49 22 V16.5 M49 22 L53 24.5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="49" cy="22" r="1.6" fill={INK} />
    <ellipse cx="45" cy="18" rx="2.4" ry="3.4" fill={C.white} opacity="0.5" />
  </svg>
);

const magicSquare = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="7" fill={C.white} stroke={INK} strokeWidth="3" />
    <rect x="12" y="12" width="13" height="13" rx="3" fill={C.red} />
    <rect x="39" y="12" width="13" height="13" rx="3" fill={C.blue} />
    <rect x="25.5" y="25.5" width="13" height="13" rx="3" fill={C.yellow} />
    <path d="M24.7 11v42M39.3 11v42M11 24.7h42M11 39.3h42" stroke={INK} strokeWidth="2" />
    <rect x="10" y="10" width="44" height="44" rx="7" fill="none" stroke={INK} strokeWidth="3" />
    <text x="18.5" y="19.4" fontSize="10" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">2</text>
    <text x="45.5" y="19.4" fontSize="10" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">6</text>
    <text x="32" y="32.9" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">5</text>
    <circle cx="15" cy="15" r="1.5" fill={C.white} opacity="0.6" />
    <rect x="30" y="44" width="26" height="15" rx="7" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <text x="43" y="52" fontSize="8.5" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">=15</text>
  </svg>
);

const countCompare = (
  <svg {...base}>
    <circle cx="19" cy="20" r="10" fill={C.blue} stroke={INK} strokeWidth="3" />
    <circle cx="15.5" cy="16.5" r="2.6" fill={C.white} opacity="0.85" />
    <path d="M44 9 L57 31 L31 31 Z" fill={C.red} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    <path
      d="M22 37 L23.94 42.33 L29.61 42.53 L25.14 46.02 L26.7 51.47 L22 48.3 L17.3 51.47 L18.86 46.02 L14.39 42.53 L20.06 42.33 Z"
      fill={C.yellow}
      stroke={INK}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <text
      x="46"
      y="47"
      fontSize="26"
      fontWeight="800"
      fill={INK}
      textAnchor="middle"
      dominantBaseline="central"
    >
      ?
    </text>
  </svg>
);

const movingCups = (
  <svg {...base}>
    <path d="M7 49 H57" stroke={INK} strokeWidth="2.6" />
    <path d="M9 47 L22 47 L20 24 L11 24 Z" fill={C.blue} stroke={INK} strokeWidth="2.6" />
    <path d="M42 47 L55 47 L53 24 L44 24 Z" fill={C.blue} stroke={INK} strokeWidth="2.6" />
    <circle cx="32" cy="44" r="5.6" fill={C.yellow} stroke={INK} strokeWidth="2.4" />
    <path d="M25 40 L39 40 L37 16 L27 16 Z" fill={C.red} stroke={INK} strokeWidth="2.6" />
    <path d="M29.5 19 L31.5 19 L30.7 35 L28.7 35 Z" fill={C.white} opacity="0.34" />
  </svg>
);

const missingVowels = (
  <svg {...base}>
    <rect x="4" y="23" width="9.6" height="18" rx="2.5" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="27.2" y="23" width="9.6" height="18" rx="2.5" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="38.8" y="23" width="9.6" height="18" rx="2.5" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="50.4" y="23" width="9.6" height="18" rx="2.5" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="15.6" y="23" width="9.6" height="18" rx="2.5" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="17.2" y="25" width="6.4" height="4" rx="1.6" fill={C.white} opacity="0.5" />
    <rect x="17.4" y="35" width="6" height="1.8" rx="0.9" fill={INK} />
    <text x="8.8" y="32.6" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">P</text>
    <text x="32" y="32.6" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">Z</text>
    <text x="43.6" y="32.6" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">Z</text>
    <text x="55.2" y="32.6" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">L</text>
  </svg>
);

const stroopMatch = (
  <svg {...base}>
    <rect x="6" y="9" width="52" height="30" rx="7" fill={C.paper} stroke={INK} strokeWidth="3" />
    <rect x="10" y="12.5" width="20" height="4" rx="2" fill={C.white} opacity="0.55" />
    <text
      x="32"
      y="25"
      fontSize="15"
      fontWeight="800"
      fill={C.blue}
      stroke={INK}
      strokeWidth="0.6"
      textAnchor="middle"
      dominantBaseline="central"
    >
      RED
    </text>
    <rect x="28.5" y="33" width="8.5" height="18" rx="4.25" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="24" y="46" width="19" height="13" rx="6" fill={C.wood} stroke={INK} strokeWidth="2.5" />
    <path d="M40 41 q4 -1 6 2 M41.5 46 q5 0 7 4" stroke={C.orange} strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const letterHunt = (
  <svg {...base}>
    <rect x="8" y="9" width="48" height="46" rx="10" fill={C.sky} stroke={INK} strokeWidth="3" />
    <rect x="13" y="14" width="17" height="17" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="34" y="14" width="17" height="17" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="13" y="35" width="17" height="17" rx="4" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <rect x="34" y="35" width="17" height="17" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <path
      d="M21.5 22.5 L42.5 22.5 L42.5 43.5"
      fill="none"
      stroke={C.orange}
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.4"
    />
    <path
      d="M21.5 22.5 L42.5 22.5 L42.5 43.5"
      fill="none"
      stroke={C.red}
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text x="21.5" y="23" fontSize="11" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">C</text>
    <text x="42.5" y="23" fontSize="11" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">A</text>
    <text x="21.5" y="44" fontSize="11" fontWeight="800" fill={INK} opacity="0.4" textAnchor="middle" dominantBaseline="central">S</text>
    <text x="42.5" y="44" fontSize="11" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">T</text>
    <rect x="16" y="17" width="7" height="3" rx="1.5" fill={C.white} opacity="0.55" />
  </svg>
);

const oddOneOut = (
  <svg {...base}>
    <rect x="9" y="9" width="46" height="46" rx="8" fill={C.paper} stroke={INK} strokeWidth="3" />
    <rect x="14" y="14" width="11" height="11" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2" />
    <rect x="26.5" y="14" width="11" height="11" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2" />
    <rect x="39" y="14" width="11" height="11" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2" />
    <rect x="14" y="26.5" width="11" height="11" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2" />
    <rect x="26.5" y="26.5" width="11" height="11" rx="2.5" fill={C.sky} stroke={INK} strokeWidth="2" />
    <rect x="39" y="26.5" width="11" height="11" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2" />
    <rect x="14" y="39" width="11" height="11" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2" />
    <rect x="26.5" y="39" width="11" height="11" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2" />
    <rect x="39" y="39" width="11" height="11" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2" />
    <circle cx="32" cy="32" r="8" fill="none" stroke={INK} strokeWidth="2.5" />
    <rect x="16.2" y="16.2" width="4" height="2.4" rx="1.2" fill={C.white} opacity="0.5" />
  </svg>
);

const schulteTable = (
  <svg {...base}>
    <rect x="9" y="9" width="46" height="46" rx="9" fill={C.paper} stroke={INK} strokeWidth="3" />
    <rect x="12" y="12" width="40" height="9" rx="5" fill={C.white} opacity="0.55" />
    <rect x="13" y="13" width="11.5" height="11.5" rx="3" fill={C.orange} stroke={INK} strokeWidth="2" />
    <rect x="26.25" y="13" width="11.5" height="11.5" rx="3" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="39.5" y="13" width="11.5" height="11.5" rx="3" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="13" y="26.25" width="11.5" height="11.5" rx="3" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="26.25" y="26.25" width="11.5" height="11.5" rx="3" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="39.5" y="26.25" width="11.5" height="11.5" rx="3" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="13" y="39.5" width="11.5" height="11.5" rx="3" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="26.25" y="39.5" width="11.5" height="11.5" rx="3" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="39.5" y="39.5" width="11.5" height="11.5" rx="3" fill={C.white} stroke={INK} strokeWidth="2" />
    <text x="18.75" y="18.75" fontSize="8.5" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">1</text>
    <text x="32" y="18.75" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">7</text>
    <text x="45.25" y="18.75" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">3</text>
    <text x="18.75" y="32" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">9</text>
    <text x="32" y="32" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">2</text>
    <text x="45.25" y="32" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">5</text>
    <text x="18.75" y="45.25" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">8</text>
    <text x="32" y="45.25" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">4</text>
    <text x="45.25" y="45.25" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">6</text>
  </svg>
);

const numberTrail = (
  <svg {...base}>
    <rect x="25.5" y="9" width="13.5" height="13.5" rx="3.5" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="42" y="9" width="13.5" height="13.5" rx="3.5" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="9" y="25.5" width="13.5" height="13.5" rx="3.5" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="42" y="25.5" width="13.5" height="13.5" rx="3.5" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="9" y="42" width="13.5" height="13.5" rx="3.5" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="25.5" y="42" width="13.5" height="13.5" rx="3.5" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="9" y="9" width="13.5" height="13.5" rx="3.5" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <rect x="25.5" y="25.5" width="13.5" height="13.5" rx="3.5" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="42" y="42" width="13.5" height="13.5" rx="3.5" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <ellipse cx="13.7" cy="12.6" rx="3.1" ry="1.7" fill={C.white} opacity="0.55" />
    <text x="15.75" y="16.4" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">1</text>
    <text x="32.25" y="32.9" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">2</text>
    <text x="48.75" y="49.4" fontSize="9.5" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">3</text>
  </svg>
);

const backwardsSpan = (
  <svg {...base}>
    <path d="M48 30 C 48 12, 16 12, 16 30" fill="none" stroke={INK} strokeWidth="3" />
    <path d="M16 31 l -4.8 -4.2 M16 31 l 3 -5.4" stroke={INK} strokeWidth="3" />
    <rect x="8" y="34" width="15.5" height="17" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="24.3" y="34" width="15.5" height="17" rx="4" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="40.6" y="34" width="15.5" height="17" rx="4" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <ellipse cx="12.5" cy="38.5" rx="3.4" ry="1.7" fill={C.white} opacity="0.5" />
    <text x="15.7" y="43.3" fontSize="10.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">3</text>
    <text x="32" y="43.3" fontSize="10.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">1</text>
    <text x="48.3" y="43.3" fontSize="10.5" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">7</text>
  </svg>
);

const patternRecall = (
  <svg {...base}>
    <rect x="8" y="8" width="48" height="48" rx="9" fill={C.paper} stroke={INK} strokeWidth="3" />
    <rect x="12" y="12" width="11" height="11" rx="2.5" fill={C.yellow} stroke={INK} strokeWidth="2" />
    <rect x="26.5" y="12" width="11" height="11" rx="2.5" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="41" y="12" width="11" height="11" rx="2.5" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="12" y="26.5" width="11" height="11" rx="2.5" fill={C.yellow} stroke={INK} strokeWidth="2" />
    <rect x="26.5" y="26.5" width="11" height="11" rx="2.5" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="41" y="26.5" width="11" height="11" rx="2.5" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="12" y="41" width="11" height="11" rx="2.5" fill={C.yellow} stroke={INK} strokeWidth="2" />
    <rect x="26.5" y="41" width="11" height="11" rx="2.5" fill={C.orange} stroke={INK} strokeWidth="2" />
    <rect x="41" y="41" width="11" height="11" rx="2.5" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="14.4" y="14.4" width="4.5" height="2.4" rx="1.2" fill={C.white} opacity="0.7" />
  </svg>
);

const nurikabe = (
  <svg {...base}>
    <rect x="6" y="6" width="52" height="52" rx="10" fill={C.blue} stroke={INK} strokeWidth="3" />
    <path
      d="M11 44c3 2.6 6 2.6 9 0s6-2.6 9 0 6 2.6 9 0 6-2.6 9 0"
      stroke={C.white}
      strokeWidth="2"
      opacity="0.55"
      fill="none"
    />
    <path
      d="M13 51c2.6 2 5.2 2 7.8 0s5.2-2 7.8 0"
      stroke={C.white}
      strokeWidth="2"
      opacity="0.4"
      fill="none"
    />
    <path d="M20 42c0-7 5-12 12-12s12 5 12 12Z" fill={C.paper} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M24 42c0-5 3.6-9 8-9s8 4 8 9Z" fill={C.green} stroke="none" />
    <path d="M32 33V15" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M32 15h13l-3 4 3 4H32Z" fill={C.red} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    <text x="38" y="19.6" fontSize="9" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">3</text>
    <rect x="12" y="12" width="12" height="5" rx="2.5" fill={C.white} opacity="0.35" />
  </svg>
);

const anagramSprint = (
  <svg {...base}>
    <g transform="rotate(-9 19 47)">
      <rect x="10" y="39" width="17" height="17" rx="4" fill={C.blue} stroke={INK} strokeWidth="2.6" />
      <text x="18.5" y="48" fontSize="10" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">R</text>
    </g>
    <g transform="rotate(8 40 49)">
      <rect x="31" y="41" width="17" height="17" rx="4" fill={C.green} stroke={INK} strokeWidth="2.6" />
      <text x="39.5" y="50" fontSize="10" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">G</text>
    </g>
    <g transform="rotate(-4 52 42)">
      <rect x="45" y="35" width="15" height="15" rx="4" fill={C.paper} stroke={INK} strokeWidth="2.6" />
      <text x="52.5" y="42.8" fontSize="9" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">M</text>
    </g>
    <path d="M20 15 C 24 4, 42 4, 45 13" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="2.4 3" strokeLinecap="round" />
    <path d="M45 13 l-1.5 -4 m1.5 4 l-4 -1" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M44 27 C 40 36, 23 36, 20 26" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="2.4 3" strokeLinecap="round" opacity="0.55" />
    <path d="M20 26 l1.5 4 m-1.5 -4 l4 1" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    <g transform="rotate(-13 19 21)">
      <rect x="11" y="13" width="17" height="17" rx="4" fill={C.red} stroke={INK} strokeWidth="2.7" />
      <rect x="14" y="16" width="7" height="3" rx="1.5" fill={C.white} opacity="0.5" />
      <text x="19.5" y="22.2" fontSize="10.5" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">A</text>
    </g>
    <g transform="rotate(13 46 19)">
      <rect x="38" y="11" width="17" height="17" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.7" />
      <rect x="41" y="14" width="7" height="3" rx="1.5" fill={C.white} opacity="0.55" />
      <text x="46.5" y="20.2" fontSize="10.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">N</text>
    </g>
  </svg>
);

const hangman = (
  <svg {...base}>
    <path d="M30 34 L28 45M34 34 L36 45" stroke={INK} strokeWidth="1.8" />
    <ellipse cx="32" cy="19" rx="14" ry="16" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <path d="M32 4 Q42 19 32 35 Q22 19 32 4 Z" fill={C.yellow} />
    <path d="M32 4 Q42 19 32 35M32 4 Q22 19 32 35" stroke={INK} strokeWidth="1.4" fill="none" />
    <ellipse cx="25.5" cy="13" rx="4" ry="6" fill={C.white} opacity="0.5" />
    <path d="M28 33 L36 33 L34 39 L30 39 Z" fill={C.red} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <rect x="27" y="43" width="10" height="7" rx="2" fill={C.wood} stroke={INK} strokeWidth="2.5" />
    <rect x="4" y="52" width="16" height="11" rx="3" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="24" y="52" width="16" height="11" rx="3" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="44" y="52" width="16" height="11" rx="3" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <text x="12" y="58" fontSize="9" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">W</text>
    <text x="32" y="58" fontSize="9" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">I</text>
    <text x="52" y="58" fontSize="9" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">N</text>
  </svg>
);

const kakuro = (
  <svg {...base}>
    <rect x="9" y="9" width="22" height="22" rx="4" fill={C.steel} stroke={INK} strokeWidth="2.5" />
    <path d="M9 9 L31 31" stroke={INK} strokeWidth="2" />
    <text x="25" y="16" fontSize="9" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">16</text>
    <text x="15" y="25" fontSize="9" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">17</text>
    <rect x="33" y="9" width="22" height="22" rx="4" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <text x="44" y="21" fontSize="14" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">7</text>
    <rect x="9" y="33" width="22" height="22" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <text x="20" y="45" fontSize="14" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">9</text>
    <rect x="33" y="33" width="22" height="22" rx="4" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <text x="44" y="45" fontSize="14" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">8</text>
    <rect x="36" y="12" width="6" height="4" rx="2" fill={C.white} opacity="0.6" />
  </svg>
);

const wordLadder = (
  <svg {...base}>
    <path
      d="M18 12v40M46 12v40"
      stroke={INK}
      strokeWidth="3"
      strokeLinecap="round"
    />
    <rect x="14" y="14" width="36" height="14" rx="4" fill={C.orange} stroke={INK} strokeWidth="2.5" />
    <text x="21.5" y="21.4" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">C</text>
    <text x="32" y="21.4" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">A</text>
    <text x="42.5" y="21.4" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">T</text>
    <rect x="14" y="37" width="36" height="14" rx="4" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <rect x="26.5" y="37" width="11" height="14" fill={C.yellow} opacity="0.55" />
    <text x="21.5" y="44.4" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">D</text>
    <text x="32" y="44.4" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">O</text>
    <text x="42.5" y="44.4" fontSize="8.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">G</text>
    <path d="M32 27.5v9" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M28.5 33l3.5 3.5 3.5-3.5" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="24" cy="17" r="1.6" fill={C.white} opacity="0.7" />
  </svg>
);

const wordGuess = (
  <svg {...base}>
    <rect x="3.8" y="25.5" width="10" height="13" rx="2.6" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <rect x="15.4" y="25.5" width="10" height="13" rx="2.6" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="27" y="25.5" width="10" height="13" rx="2.6" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="38.6" y="25.5" width="10" height="13" rx="2.6" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="50.2" y="25.5" width="10" height="13" rx="2.6" fill={C.white} stroke={INK} strokeWidth="2.5" />
    <rect x="5.6" y="27.4" width="6.4" height="3" rx="1.5" fill={C.white} opacity="0.5" />
    <text x="8.8" y="32.4" fontSize="8" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">G</text>
    <text x="20.4" y="32.4" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">U</text>
    <text x="32" y="32.4" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">E</text>
    <text x="43.6" y="32.4" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">S</text>
    <text x="55.2" y="32.4" fontSize="8" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">S</text>
  </svg>
);

const fleetSolitaire = (
  <svg {...base}>
    <rect x="8" y="12" width="48" height="40" rx="8" fill={C.blue} stroke={INK} strokeWidth="3" />
    <path
      d="M24 13v38M40 13v38M9 25.5h46M9 38.5h46"
      stroke={INK}
      strokeWidth="1.6"
      opacity="0.45"
    />
    <rect x="19" y="30" width="26" height="8.5" rx="4.25" fill={C.steel} stroke={INK} strokeWidth="2.5" />
    <rect x="30" y="22.5" width="7" height="8" rx="1.5" fill={C.steel} stroke={INK} strokeWidth="2.2" />
    <circle cx="24" cy="34.25" r="1.4" fill={C.white} opacity="0.85" />
    <path d="M13 46 c2 -2 4 -2 6 0 M43 46 c2 -2 4 -2 6 0" stroke={C.white} strokeWidth="2" opacity="0.75" fill="none" />
    <circle cx="49" cy="16" r="10.5" fill={C.yellow} stroke={INK} strokeWidth="3" />
    <text x="49" y="16.8" fontSize="12" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">3</text>
  </svg>
);

const slitherlink = (
  <svg {...base}>
    {[14, 32, 50].map((y) =>
      [14, 32, 50].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill={C.steel} />)
    )}
    <path
      d="M14 14 H50 V32 H32 V50 H14 Z"
      fill="none"
      stroke={C.orange}
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 14 H50 V32 H32 V50 H14 Z"
      fill="none"
      stroke={INK}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.35"
    />
    <rect x="34" y="34" width="16" height="16" rx="4" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="36.5" y="36.5" width="5" height="2.6" rx="1.3" fill={C.white} opacity="0.6" />
    <text x="42" y="42.6" fontSize="11" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">
      3
    </text>
  </svg>
);

const codeBreaker = (
  <svg {...base}>
    <rect x="6" y="16" width="52" height="22" rx="11" fill={C.paper} stroke={INK} strokeWidth="3" />
    <circle cx="15" cy="27" r="5.5" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <circle cx="26" cy="27" r="5.5" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <circle cx="37" cy="27" r="5.5" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <circle cx="48" cy="27" r="5.5" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <circle cx="49" cy="9" r="3.2" fill={INK} />
    <circle cx="57" cy="9" r="3.2" fill={C.white} stroke={INK} strokeWidth="2" />
    <path d="M52.4 51.4L58 57" stroke={INK} strokeWidth="5.5" />
    <circle cx="44" cy="43" r="11.5" fill={C.sky} stroke={INK} strokeWidth="3" />
    <circle cx="44" cy="43" r="6.5" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <rect x="35.5" y="35" width="8" height="4" rx="2" fill={C.white} opacity="0.7" transform="rotate(-32 39.5 37)" />
  </svg>
);

const wordSearch = (
  <svg {...base}>
    <rect x="9" y="9" width="46" height="46" rx="8" fill={C.white} stroke={INK} strokeWidth="3" />
    <text x="19" y="18.5" fontSize="9.5" fontWeight="800" fill={INK} opacity="0.45" textAnchor="middle" dominantBaseline="central">S</text>
    <text x="31" y="18.5" fontSize="9.5" fontWeight="800" fill={INK} opacity="0.45" textAnchor="middle" dominantBaseline="central">U</text>
    <text x="43" y="18.5" fontSize="9.5" fontWeight="800" fill={INK} opacity="0.45" textAnchor="middle" dominantBaseline="central">N</text>
    <rect x="12.5" y="24.5" width="37" height="13" rx="6.5" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <rect x="16" y="27" width="10" height="3.5" rx="1.75" fill={C.white} opacity="0.55" />
    <text x="19" y="31.2" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">F</text>
    <text x="31" y="31.2" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">O</text>
    <text x="43" y="31.2" fontSize="9.5" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">X</text>
    <text x="19" y="45" fontSize="9.5" fontWeight="800" fill={INK} opacity="0.45" textAnchor="middle" dominantBaseline="central">T</text>
    <circle cx="40" cy="44" r="10.5" fill={C.sky} stroke={INK} strokeWidth="3" />
    <text x="40" y="44.6" fontSize="12" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">E</text>
    <path d="M48 52l7 7" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
    <path d="M48 52l7 7" stroke={C.red} strokeWidth="3" strokeLinecap="round" />
    <path d="M33.5 40.5a8 8 0 0 1 3.5-3.6" stroke={C.white} strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

const killerSudoku = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="7" fill={C.white} stroke={INK} strokeWidth="3" />
    <path d="M24.7 11v42M39.3 11v42M11 24.7h42M11 39.3h42" stroke={INK} strokeWidth="2" />
    <path
      d="M14.5 28.5 v-14 h20 v14 h-10 v10 h-10 Z"
      fill="none"
      stroke={C.orange}
      strokeWidth="2.6"
      strokeDasharray="3.4 3"
    />
    <path
      d="M43 29.5 h7 v20 h-20 v-10 h13 Z"
      fill="none"
      stroke={C.blue}
      strokeWidth="2.6"
      strokeDasharray="3.4 3"
    />
    <text x="45.5" y="19.5" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">7</text>
    <text x="18.5" y="46.5" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">3</text>
    <circle cx="14" cy="14" r="8.5" fill={C.red} stroke={INK} strokeWidth="2.5" />
    <text x="14" y="14.7" fontSize="8.5" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">12</text>
    <circle cx="11.5" cy="11" r="2" fill={C.white} opacity="0.55" />
  </svg>
);

const hashi = (
  <svg {...base}>
    <rect x="6" y="15" width="52" height="34" rx="11" fill={C.blue} stroke={INK} strokeWidth="3" />
    <path d="M14 43.5c2.6-2.4 5.4 2.4 8 0M40 21.5c2.6-2.4 5.4 2.4 8 0" stroke={C.sky} strokeWidth="2.5" opacity="0.75" />
    <path d="M23 28.5h18M23 35.5h18" stroke={INK} strokeWidth="7.5" />
    <path d="M23 28.5h18M23 35.5h18" stroke={C.wood} strokeWidth="4" />
    <circle cx="17" cy="32" r="10" fill={C.paper} stroke={INK} strokeWidth="3" />
    <circle cx="47" cy="32" r="10" fill={C.paper} stroke={INK} strokeWidth="3" />
    <rect x="11.5" y="26" width="6" height="3" rx="1.5" fill={C.white} opacity="0.7" />
    <text x="17" y="32.8" fontSize="11" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">2</text>
    <text x="47" y="32.8" fontSize="11" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">2</text>
  </svg>
);

const binaryGrid = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="7" fill={C.sky} stroke={INK} strokeWidth="3" />
    <path d="M54 17v30a7 7 0 0 1-7 7H17z" fill={C.blue} />
    <path d="M17 54L54 17" stroke={INK} strokeWidth="2" />
    <rect x="10" y="10" width="44" height="44" rx="7" fill="none" stroke={INK} strokeWidth="3" />
    <g stroke={C.yellow} strokeWidth="2.4" strokeLinecap="round">
      <path d="M24 12.6v3M24 32.4v3M12.6 24h3M32.4 24h3M16 16l2.1 2.1M29.9 29.9l2.1 2.1M32 16l-2.1 2.1M18.1 29.9L16 32" />
    </g>
    <circle cx="24" cy="24" r="6.2" fill={C.yellow} stroke={INK} strokeWidth="2.5" />
    <circle cx="48.5" cy="24.5" r="1.4" fill={C.white} />
    <circle cx="35" cy="47" r="1.4" fill={C.white} />
    <path
      d="M47.8 41.7A7.2 7.2 0 1 1 40 33.9 5.6 5.6 0 0 0 47.8 41.7z"
      fill={C.paper}
      stroke={INK}
      strokeWidth="2.5"
    />
    <circle cx="21.8" cy="21.6" r="1.6" fill={C.white} opacity="0.8" />
  </svg>
);

const aquarium = (
  <svg {...base}>
    <rect x="11" y="11" width="42" height="42" rx="8" fill={C.sky} stroke={INK} strokeWidth="3" />
    <path
      d="M12.5 33 q5.25 -4 10.5 0 t10.5 0 t10.5 0 q3.75 -2.85 7.5 0 v11.5 a6.5 6.5 0 0 1 -6.5 6.5 h-26 a6.5 6.5 0 0 1 -6.5 -6.5 Z"
      fill={C.blue}
    />
    <path d="M12.5 33 q5.25 -4 10.5 0 t10.5 0 t10.5 0 q3.75 -2.85 7.5 0" fill="none" stroke={INK} strokeWidth="2" />
    <circle cx="40" cy="41" r="3.4" fill={C.white} stroke={INK} strokeWidth="2" />
    <circle cx="33" cy="46.5" r="2.1" fill={C.white} stroke={INK} strokeWidth="2" />
    <rect x="11" y="11" width="42" height="42" rx="8" fill="none" stroke={INK} strokeWidth="3" />
    <path d="M16.5 17.5 q0 -1.5 1.5 -1.5 h7" stroke={C.white} strokeWidth="3" opacity="0.65" fill="none" />
  </svg>
);

const skyscrapers = (
  <svg {...base}>
    <rect x="10" y="30" width="14" height="23" rx="2.5" fill={C.blue} stroke={INK} strokeWidth="2.5" />
    <rect x="40" y="23" width="14" height="30" rx="2.5" fill={C.green} stroke={INK} strokeWidth="2.5" />
    <path d="M32 6.5V12" stroke={INK} strokeWidth="2.5" />
    <circle cx="32" cy="5.5" r="2" fill={C.red} stroke={INK} strokeWidth="1.6" />
    <rect x="24" y="12" width="16" height="41" rx="2.5" fill={C.orange} stroke={INK} strokeWidth="3" />
    <rect x="28" y="17" width="8" height="4" rx="1.3" fill={C.yellow} />
    <rect x="28" y="24.5" width="8" height="4" rx="1.3" fill={C.yellow} />
    <rect x="28" y="32" width="8" height="4" rx="1.3" fill={C.yellow} />
    <rect x="13.5" y="34" width="7" height="3.5" rx="1.2" fill={C.sky} />
    <rect x="13.5" y="40.5" width="7" height="3.5" rx="1.2" fill={C.sky} />
    <rect x="43.5" y="27.5" width="7" height="3.5" rx="1.2" fill={C.white} />
    <rect x="43.5" y="34" width="7" height="3.5" rx="1.2" fill={C.white} />
    <path d="M8 53h48" stroke={INK} strokeWidth="3" />
    <rect x="26" y="40.5" width="3.2" height="9" rx="1.6" fill={C.white} opacity="0.5" />
  </svg>
);

const tents = (
  <svg {...base}>
    <path d="M6 52 h52" stroke={INK} strokeWidth="3" />
    <rect x="44.5" y="39" width="6" height="13" rx="2" fill={C.wood} stroke={INK} strokeWidth="2.5" />
    <circle cx="47.5" cy="28.5" r="11.5" fill={C.green} stroke={INK} strokeWidth="3" />
    <circle cx="43.2" cy="24.2" r="2.6" fill={C.white} opacity="0.85" />
    <path d="M20 13.5 L36.5 52 H3.5 Z" fill={C.orange} stroke={INK} strokeWidth="3" />
    <path d="M20 27 L27.5 52 H12.5 Z" fill={C.paper} stroke={INK} strokeWidth="2.5" />
    <path d="M20 13.5 v13.5" stroke={INK} strokeWidth="2.5" />
  </svg>
);

const mathdoku = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="7" fill={C.white} stroke={INK} strokeWidth="3" />
    <path d="M12 18 A6 6 0 0 1 18 12 H39.3 V24.7 H24.7 V39.3 H12 Z" fill={C.yellow} />
    <path d="M39.3 12 H46 A6 6 0 0 1 52 18 V39.3 H39.3 Z" fill={C.blue} />
    <path d="M24.7 39.3 H52 V46 A6 6 0 0 1 46 52 H24.7 Z" fill={C.green} />
    <path d="M24.7 11 V24.7 M11 24.7 H24.7 M39.3 24.7 H53" stroke={INK} strokeWidth="1.6" />
    <path d="M24.7 24.7 H39.3 M24.7 24.7 V53 M39.3 11 V39.3 M11 39.3 H53" stroke={INK} strokeWidth="3" />
    <text x="13.8" y="18.6" fontSize="8" fontWeight="800" fill={INK}>12×</text>
    <text x="32" y="32.6" fontSize="10" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">3</text>
    <text x="45.6" y="46" fontSize="10" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">4</text>
    <rect x="41.5" y="14.5" width="7.5" height="3.5" rx="1.75" fill={C.white} opacity="0.55" />
  </svg>
);

const futoshiki = (
  <svg {...base}>
    <g transform="rotate(-6 17 32)">
      <rect x="6" y="21" width="21" height="21" rx="5" fill={C.yellow} stroke={INK} strokeWidth="3" />
      <text x="16.5" y="32.4" fontSize="12" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">2</text>
      <rect x="9.5" y="24.5" width="6.5" height="3" rx="1.5" fill={C.white} opacity="0.55" />
    </g>
    <g transform="rotate(6 47 32)">
      <rect x="37" y="21" width="21" height="21" rx="5" fill={C.blue} stroke={INK} strokeWidth="3" />
      <text x="47.5" y="32.4" fontSize="12" fontWeight="800" fill={C.white} textAnchor="middle" dominantBaseline="central">5</text>
    </g>
    <path d="M35.5 25.5 L29 31.5 L35.5 37.5" stroke={INK} strokeWidth="3.5" fill="none" />
  </svg>
);

const nonogram = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="7" fill={C.white} stroke={INK} strokeWidth="3" />
    <path
      d="M20 12h8v8h-8Z M36 12h8v8h-8Z M12 20h40v16h-40Z M20 36h24v8h-24Z M28 44h8v8h-8Z"
      fill={C.red}
    />
    <rect x="15" y="23" width="9" height="4.5" rx="2.25" fill={C.white} opacity="0.5" transform="rotate(-16 19.5 25)" />
    <path d="M20 11v42M28 11v42M36 11v42M44 11v42M11 20h42M11 28h42M11 36h42M11 44h42" stroke={INK} strokeWidth="1.5" opacity="0.45" />
    <path d="M13.5 13.5l5 5M18.5 13.5l-5 5M45.5 45.5l5 5M50.5 45.5l-5 5" stroke={INK} strokeWidth="2" opacity="0.5" />
  </svg>
);

const lightsOut = (
  <svg {...base}>
    <rect x="10" y="10" width="44" height="44" rx="9" fill={C.steel} stroke={INK} strokeWidth="3" />
    <rect x="14.5" y="14.5" width="10.5" height="10.5" rx="3.5" fill={INK} />
    <rect x="26.75" y="14.5" width="10.5" height="10.5" rx="3.5" fill={C.yellow} stroke={INK} strokeWidth="2" />
    <rect x="39" y="14.5" width="10.5" height="10.5" rx="3.5" fill={INK} />
    <rect x="14.5" y="26.75" width="10.5" height="10.5" rx="3.5" fill={INK} />
    <rect x="26.75" y="26.75" width="10.5" height="10.5" rx="3.5" fill={INK} />
    <rect x="39" y="26.75" width="10.5" height="10.5" rx="3.5" fill={INK} />
    <rect x="14.5" y="39" width="10.5" height="10.5" rx="3.5" fill={C.yellow} stroke={INK} strokeWidth="2" />
    <rect x="26.75" y="39" width="10.5" height="10.5" rx="3.5" fill={INK} />
    <rect x="39" y="39" width="10.5" height="10.5" rx="3.5" fill={INK} />
    <circle cx="32" cy="19.75" r="9" fill={C.yellow} opacity="0.32" />
    <circle cx="19.75" cy="44.25" r="9" fill={C.yellow} opacity="0.32" />
    <circle cx="30" cy="17.5" r="1.7" fill={C.white} opacity="0.85" />
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
  battleship,
  'house-puzzles': housePuzzles,
  'lights-out': lightsOut,
  futoshiki,
  nonogram,
  tents,
  mathdoku,
  aquarium,
  skyscrapers,
  'binary-grid': binaryGrid,
  hashi,
  'killer-sudoku': killerSudoku,
  'word-search': wordSearch,
  'code-breaker': codeBreaker,
  slitherlink,
  'fleet-solitaire': fleetSolitaire,
  'word-guess': wordGuess,
  'word-ladder': wordLadder,
  kakuro,
  hangman,
  'anagram-sprint': anagramSprint,
  nurikabe,
  'pattern-recall': patternRecall,
  'number-trail': numberTrail,
  'backwards-span': backwardsSpan,
  'schulte-table': schulteTable,
  'moving-cups': movingCups,
  'missing-vowels': missingVowels,
  'stroop-match': stroopMatch,
  'letter-hunt': letterHunt,
  'odd-one-out': oddOneOut,
  'count-compare': countCompare,
  'magic-square': magicSquare,
  game2048,
  'math-sprint': mathSprint,
  'make-24': make24,
  'tower-of-hanoi': towerOfHanoi,
  'target-number': targetNumber,
  pipes,
  'sequence-cracker': sequenceCracker,
  'laser-mirrors': laserMirrors,
  sokoban,
  untangle,
  jigsaw,
  gridlock,
  tangram,
  reversi,
  checkers,
  'connect-four': connectFour,
  'dots-boxes': dotsBoxes,
  klondike,
  'peg-solitaire': pegSolitaire
};
