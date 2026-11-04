import type { LandmarkDef } from '../progress/progress';

/** Hand-drawn 24 × 24 sprites. Both SVG and exported cards paint these same
 * opaque pixel runs: no font rasterization, curves, gradients or image assets. */
export const LANDMARK_GRID = 24;
export interface PixelRun { x: number; y: number; width: number; color: string }

const GLYPHS: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
  '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001111', '?': '111001011000010',
  I: '111010010010111', V: '101101101101010', L: '100100100100111',
  W: '101101101111101', M: '101111111101101', F: '111100110100100',
  N: '101111111111101', S: '111100111001111', R: '110101110101101'
};
const ROMAN: Record<string, string> = { easy: 'I', medium: 'II', hard: 'III', pro: 'IV', extreme: 'V' };

export function landmarkPixels(def: LandmarkDef, hidden = false): PixelRun[] {
  const ink = '#24383d';
  const white = '#fff2d5';
  // Hidden secrets share ALL pixels and colors, regardless of their real kind.
  const main = hidden ? '#839c9b' : def.kind === 'level' ? `var(--rank-${def.rank})` : `var(--play-${def.slot})`;
  const shade = `color-mix(in srgb, ${main} 65%, ${ink})`;
  const light = `color-mix(in srgb, ${main} 55%, ${white})`;
  const gold = 'var(--play-6)';
  const grid: (string | undefined)[][] = Array.from({ length: LANDMARK_GRID }, () => Array(LANDMARK_GRID));
  const rect = (x: number, y: number, w: number, h: number, c: string | undefined) => {
    for (let py = Math.max(0, y); py < Math.min(24, y + h); py++)
      for (let px = Math.max(0, x); px < Math.min(24, x + w); px++) grid[py][px] = c;
  };
  // Rasterize at pixel centers. Diagonals become intentional stair steps.
  const poly = (points: number[][], c: string | undefined) => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i]; const [xj, yj] = points[j];
        if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) grid[y][x] = c;
    }
  };
  const label = (value: string, y: number, c = white) => {
    const start = Math.floor((24 - (value.length * 4 - 1)) / 2);
    [...value].forEach((letter, i) => [...(GLYPHS[letter] ?? GLYPHS['?'])].forEach((bit, p) => {
      if (bit === '1') rect(start + i * 4 + p % 3, y + Math.floor(p / 3), 1, 1, c);
    }));
  };
  const sparkle = (x: number, y: number, c = white) => {
    rect(x + 1, y, 1, 5, c); rect(x - 1, y + 2, 5, 1, c);
  };
  const check = (y: number, c = white) => poly([[6,y+2],[9,y+5],[16,y-2],[18,y],[9,y+9],[4,y+4]], c);
  const disc = (c = main) => {
    poly([[8,2],[16,2],[16,3],[19,3],[19,5],[21,5],[21,8],[22,8],[22,17],[20,17],[20,20],[17,20],[17,22],[7,22],[7,20],[4,20],[4,17],[2,17],[2,8],[3,8],[3,5],[5,5],[5,3],[8,3]], ink);
    poly([[8,3],[16,3],[16,4],[19,4],[19,7],[21,7],[21,16],[19,16],[19,19],[16,19],[16,21],[8,21],[8,19],[5,19],[5,16],[3,16],[3,8],[4,8],[4,6],[6,6],[6,4],[8,4]], shade);
    poly([[8,3],[16,3],[16,4],[18,4],[18,6],[20,6],[20,15],[18,15],[18,18],[15,18],[15,20],[8,20],[8,18],[5,18],[5,15],[3,15],[3,8],[4,8],[4,6],[6,6],[6,4],[8,4]], c);
    rect(7,4,7,1,light); rect(5,6,2,3,light);
  };
  const egg = () => {
    poly([[10,1],[14,1],[14,2],[16,2],[16,4],[18,4],[18,7],[20,7],[20,11],[21,11],[21,18],[19,18],[19,21],[16,21],[16,23],[8,23],[8,21],[5,21],[5,18],[3,18],[3,11],[4,11],[4,7],[6,7],[6,4],[8,4],[8,2],[10,2]], ink);
    poly([[10,2],[14,2],[14,3],[16,3],[16,5],[18,5],[18,8],[19,8],[19,12],[20,12],[20,18],[18,18],[18,20],[16,20],[16,22],[8,22],[8,20],[6,20],[6,18],[4,18],[4,12],[5,12],[5,8],[7,8],[7,5],[9,5],[9,3],[10,3]], shade);
    poly([[10,2],[13,2],[13,3],[15,3],[15,5],[17,5],[17,9],[18,9],[18,17],[16,17],[16,20],[8,20],[8,19],[6,19],[6,17],[4,17],[4,12],[5,12],[5,8],[7,8],[7,5],[9,5],[9,3],[10,3]], main);
    rect(8,6,2,4,light); rect(7,10,2,3,light);
  };
  const calendar = () => {
    rect(3,4,18,18,ink); rect(4,5,16,16,shade); rect(4,5,15,14,white);
    rect(4,5,15,5,main); rect(4,5,15,1,light);
    rect(7,2,2,5,ink); rect(15,2,2,5,ink); rect(7,2,1,3,light); rect(15,2,1,3,light);
  };
  const star = () => {
    poly([[10,2],[14,2],[16,8],[22,8],[22,12],[18,15],[20,22],[16,22],[12,19],[8,22],[4,22],[6,15],[2,12],[2,8],[8,8]], ink);
    poly([[11,3],[13,3],[15,9],[21,9],[21,11],[16,14],[18,21],[12,17],[6,21],[8,14],[3,11],[3,9],[9,9]], shade);
    poly([[11,3],[13,3],[15,9],[20,9],[15,13],[16,18],[12,16],[7,19],[9,13],[4,10],[10,10]], main);
    rect(10,7,2,3,light); rect(7,10,3,1,light);
  };

  if (hidden) {
    egg(); rect(9,9,7,9,ink); label('?', 11, white);
  } else switch (def.kind) {
    case 'first':
      star(); rect(9,12,2,2,ink); rect(14,12,2,2,ink); sparkle(19,1,gold); break;
    case 'streak':
      poly([[12,1],[15,4],[15,8],[18,6],[21,12],[22,17],[20,21],[16,23],[8,23],[4,21],[2,17],[3,12],[6,7],[7,11],[10,7]], ink);
      poly([[12,2],[14,5],[14,10],[18,8],[20,13],[21,17],[19,20],[16,22],[8,22],[5,20],[3,17],[4,12],[6,9],[7,13],[11,8]], shade);
      poly([[12,3],[13,6],[13,12],[17,10],[19,14],[18,19],[15,21],[8,21],[5,18],[5,14],[8,15],[11,10]], main);
      rect(10,10,2,3,light); rect(5,14,14,6,ink); label(String(def.days),15); break;
    case 'plays':
      // the front board is 19 wide so the top rung's "1000" (15px of label)
      // fits its panel; a 16-wide board spilled the outer digits onto the
      // face and the outline. The back board peeks out above and right.
      rect(6,1,17,16,ink); rect(7,2,15,14,shade); rect(2,5,19,17,ink); rect(3,6,17,15,main);
      rect(3,6,17,2,light); rect(4,10,15,8,ink); label(String(def.count),12); rect(6,19,11,1,light); break;
    case 'clean-wins':
    case 'difficulty':
      poly([[3,3],[21,3],[21,15],[18,19],[12,23],[6,19],[3,15]],ink);
      poly([[4,4],[20,4],[20,15],[17,18],[12,22],[7,18],[4,15]],shade);
      poly([[4,4],[18,4],[18,14],[15,18],[11,20],[7,17],[4,14]],main); rect(5,4,13,2,light);
      if (def.kind === 'difficulty') label(ROMAN[def.difficulty!],10);
      else { check(7); rect(4,14,16,6,ink); label(String(def.count),15); } break;
    case 'level':
      rect(3,18,18,4,ink); rect(4,18,16,3,shade);
      poly([[2,5],[7,9],[11,2],[13,2],[17,9],[22,5],[20,18],[4,18]],ink);
      poly([[3,7],[7,11],[12,3],[17,11],[21,7],[19,17],[5,17]],main);
      poly([[4,8],[7,12],[12,5],[12,8],[8,14],[5,12]],light);
      rect(5,17,14,2,light); rect(6,20,12,1,main); rect(11,11,2,4,white); rect(7,13,2,2,shade); rect(15,13,2,2,shade); break;
    case 'daily-first':
      calendar(); rect(9,14,6,4,gold); rect(10,13,4,1,gold); rect(6,18,12,1,ink);
      rect(11,11,2,1,main); rect(6,13,2,1,main); rect(16,13,2,1,main); break;
    case 'daily-streak': calendar(); label(String(def.days),13,ink); break;
    case 'daily-collector': calendar(); check(12,main); break;
    case 'all-played':
      [[3,3,4],[13,3,3],[3,13,1],[13,13,2]].forEach(([x,y,slot]) => {
        rect(x,y,8,8,ink); rect(x+1,y+1,6,6,`var(--play-${slot})`); rect(x+1,y+1,5,1,white);
      }); break;
    case 'category':
      poly([[6,14],[11,15],[9,23],[6,21],[3,23]],shade); poly([[13,15],[18,14],[21,23],[17,21],[15,23]],main);
      poly([[8,1],[16,1],[16,3],[19,3],[19,6],[21,6],[21,13],[19,13],[19,16],[16,16],[16,18],[8,18],[8,16],[5,16],[5,13],[3,13],[3,6],[5,6],[5,3],[8,3]],ink);
      rect(8,2,8,15,shade); rect(5,6,14,7,shade); rect(6,5,12,9,main); rect(8,3,8,13,main); rect(8,3,8,1,light);
      label(def.category![0].toUpperCase(),7); break;
    case 'clean-streak':
      poly([[10,1],[14,1],[16,4],[20,3],[20,7],[23,10],[21,14],[22,18],[18,19],[16,23],[12,21],[8,23],[6,19],[2,18],[3,14],[1,10],[4,7],[4,3],[8,4]],ink);
      poly([[10,3],[14,3],[15,6],[18,5],[18,8],[21,10],[19,14],[20,16],[16,17],[15,21],[12,19],[9,21],[8,17],[4,16],[5,14],[3,10],[6,8],[6,5],[9,6]],main);
      rect(6,8,12,9,shade); rect(7,8,10,1,light); label(String(def.count),10); break;
    case 'flawless':
      poly([[7,3],[17,3],[23,10],[12,23],[1,10]],ink);
      poly([[7,4],[17,4],[21,10],[12,21],[3,10]],main);
      poly([[7,4],[11,4],[7,10],[3,10]],light); poly([[12,4],[16,4],[19,9],[9,9]],white);
      poly([[3,11],[8,11],[12,21]],shade); poly([[14,11],[21,11],[12,21]],shade); sparkle(20,0); break;
    case 'speed':
      disc(); rect(9,0,6,2,ink); rect(11,2,2,2,ink); rect(19,3,3,3,ink);
      rect(11,5,1,2,white); rect(18,11,2,1,white); rect(11,18,1,2,white); label(String(def.seconds),10); break;
    case 'time-of-day':
      if (def.moment === 'night') {
        disc(); poly([[12,0],[24,0],[24,17],[17,17],[17,16],[13,16],[13,14],[10,14],[10,11],[9,11],[9,6],[10,6],[10,3],[12,3]],undefined);
        rect(5,10,2,3,light); sparkle(18,3,gold); rect(16,13,2,2,white);
      } else {
        poly([[8,9],[16,9],[16,11],[19,11],[19,14],[21,14],[21,19],[3,19],[3,14],[5,14],[5,11],[8,11]],ink);
        rect(6,12,12,6,main); rect(9,10,6,8,main); rect(8,12,3,2,light);
        rect(11,2,2,4,gold); rect(3,6,3,3,gold); rect(18,6,3,3,gold); rect(1,20,22,2,shade);
      } break;
    case 'comeback': {
      rect(2,3,20,19,ink); rect(3,4,18,16,main); rect(3,4,18,1,light);
      const points = def.count === 1 ? [[5,9],[10,16],[18,7]] : [[4,9],[8,15],[11,11],[14,17],[19,7]];
      for (let i=1;i<points.length;i++) {
        const [ax,ay]=points[i-1]; const [bx,by]=points[i]; const steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
        for(let s=0;s<=steps;s++) rect(Math.round(ax+(bx-ax)*s/steps),Math.round(ay+(by-ay)*s/steps),2,2,white);
      }
      rect(16,6,4,2,white); rect(18,6,2,5,white); break;
    }
    case 'genre-hopper':
      rect(5,6,3,2,light); rect(8,3,3,2,light); rect(16,5,3,2,light); rect(19,8,3,2,light);
      rect(11,1,4,4,ink); rect(12,2,2,2,main);
      rect(1,15,6,6,ink); rect(2,16,4,4,'var(--play-4)');
      rect(9,13,6,8,ink); rect(10,14,4,6,'var(--play-3)');
      poly([[19,12],[24,21],[15,21]],ink); poly([[19,15],[22,20],[17,20]],'var(--play-1)'); break;
    case 'deep-cut':
      disc(ink); rect(5,9,1,6,shade); rect(7,6,3,1,light); rect(17,9,1,6,shade); rect(14,17,3,1,light);
      rect(9,8,6,8,main); rect(8,10,8,4,main); rect(11,11,2,2,white); break;
    case 'share':
      if(def.feat === 'share-app') {
        poly([[1,10],[23,1],[18,23],[11,17],[7,21],[7,14]],ink);
        poly([[3,10],[21,3],[8,13]],light); poly([[21,4],[17,21],[11,16]],main); poly([[8,14],[19,5],[10,16],[8,19]],shade);
        rect(1,17,4,1,white); rect(2,20,3,1,white);
      } else {
        rect(3,5,14,18,ink); rect(4,6,12,15,main); rect(4,6,12,2,light);
        poly([[10,9],[12,12],[15,12],[13,15],[14,18],[10,16],[6,18],[7,15],[5,12],[8,12]],white);
        rect(17,4,5,2,gold); rect(20,4,2,6,gold); rect(16,8,3,2,gold);
      } break;
    case 'backup': {
      rect(2,13,20,9,ink); rect(3,14,18,6,main); rect(3,14,18,1,light); rect(5,17,2,2,white); rect(10,17,8,1,shade);
      const out=def.feat === 'backup-export';
      poly(out ? [[11,1],[4,8],[9,8],[9,12],[14,12],[14,8],[19,8],[12,1]] : [[9,1],[14,1],[14,6],[19,6],[12,13],[11,13],[4,6],[9,6]],ink);
      poly(out ? [[11,3],[7,7],[10,7],[10,11],[13,11],[13,7],[16,7],[12,3]] : [[10,2],[13,2],[13,7],[16,7],[12,11],[11,11],[7,7],[10,7]],main); break;
    }
    case 'renaissance':
      disc(); rect(15,16,4,4,ink); rect(16,17,2,2,undefined);
      [[7,7,1],[12,5,3],[17,8,4],[6,13,8],[11,16,6]].forEach(([x,y,c]) => {rect(x-1,y-1,4,4,ink); rect(x,y,2,2,`var(--play-${c})`);}); break;
    case 'full-house':
      poly([[11,1],[13,1],[23,11],[20,11],[20,23],[4,23],[4,11],[1,11]],ink);
      poly([[12,3],[20,10],[18,10],[18,21],[6,21],[6,10],[4,10]],main);
      poly([[12,3],[13,4],[6,11],[4,10]],light); rect(6,20,12,2,shade);
      [[8,11],[14,11],[8,16],[14,16]].forEach(([x,y])=>{rect(x,y,3,3,ink);rect(x,y,2,2,white);}); break;
    case 'egg':
      egg();
      for(let x=5;x<19;x++) rect(x,12+(Math.floor((x-5)/2)%2)*2,1,2,white);
      rect(9,6,2,2,white); rect(13,8,2,2,gold); rect(8,18,2,2,gold); rect(14,18,2,2,white); break;
    default: { const exhaustive: never = def.kind; throw new Error(`Missing landmark art: ${exhaustive}`); }
  }
  const runs: PixelRun[] = [];
  grid.forEach((row,y) => {
    for(let x=0;x<24;) {
      const color=row[x]; let end=x+1;
      while(end<24 && row[end]===color) end++;
      if(color) runs.push({x,y,width:end-x,color});
      x=end;
    }
  });
  return runs;
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/**
 * A sprite color as a plain `rgb()` a canvas can take: tokens looked up,
 * then `color-mix(in srgb, …)` mixed here. Canvas `fillStyle` silently KEEPS
 * the previous color when it rejects a value, and engines differ on CSS color
 * functions, so the share card must never depend on the browser parsing a
 * mix — a rejected one would paint the shade and highlight runs in whatever
 * color came before. Pure, so validate resolves every sprite with it.
 */
export function resolvePixelColor(color: string, token: (name: string) => string): string {
  const flat = color.replace(/var\((--[\w-]+)\)/g, (_, name: string) => token(name).trim());
  const mix = /^color-mix\(in srgb,\s*(#[0-9a-f]{6})\s+(\d+(?:\.\d+)?)%,\s*(#[0-9a-f]{6})\)$/i.exec(flat);
  if (mix) {
    const p = Number(mix[2]) / 100;
    const a = hexRgb(mix[1]);
    const b = hexRgb(mix[3]);
    return `rgb(${a.map((v, i) => Math.round(v * p + b[i] * (1 - p))).join(', ')})`;
  }
  return /^#[0-9a-f]{6}$/i.test(flat) ? `rgb(${hexRgb(flat).join(', ')})` : flat;
}

/** Canvas uses integer-sized pixels, centered in the requested emblem box. */
export function drawLandmarkPixels(ctx: CanvasRenderingContext2D, def: LandmarkDef, x: number, y: number, size: number) {
  const scale = Math.max(1, Math.floor(size / LANDMARK_GRID));
  const offset = Math.floor((size - scale * LANDMARK_GRID) / 2);
  const styles = getComputedStyle(document.documentElement);
  const resolved = new Map<string, string>();
  ctx.save();
  for(const pixel of landmarkPixels(def)) {
    let fill = resolved.get(pixel.color);
    if (fill === undefined) {
      fill = resolvePixelColor(pixel.color, (name) => styles.getPropertyValue(name));
      resolved.set(pixel.color, fill);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(x + offset + pixel.x * scale, y + offset + pixel.y * scale, pixel.width * scale, scale);
  }
  ctx.restore();
}
