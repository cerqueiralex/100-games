/*
 * Bridges (Hashi) solver — constraint propagation over per-link [lo, hi]
 * bridge domains plus count-to-2 backtracking. The generator uses it to
 * prove every published puzzle has EXACTLY one valid solution (island sums
 * exact, no crossings, whole network connected), which also proves the
 * puzzle is guess-free at the "counting" level. Pure TS, no React.
 */

export interface HashiSolveInput {
  /** required bridge count per island (1..8) */
  degrees: number[];
  /** candidate island pairs (indices into degrees), straight clear lines */
  links: { a: number; b: number }[];
  /** per link: indices of perpendicular links sharing an interior cell */
  crossings: number[][];
}

export interface HashiSolveResult {
  /** number of valid solutions found, capped at the requested limit */
  count: number;
  /** the first full solution found (bridge count per link) */
  solution: number[] | null;
}

export function countHashiSolutions(input: HashiSolveInput, limit = 2): HashiSolveResult {
  const { degrees, links, crossings } = input;
  const ni = degrees.length;
  const m = links.length;
  const linksAt: number[][] = Array.from({ length: ni }, () => []);
  links.forEach((l, e) => {
    linksAt[l.a].push(e);
    linksAt[l.b].push(e);
  });

  const result: HashiSolveResult = { count: 0, solution: null };
  if (ni === 0) return result;

  /**
   * Tighten domains to a fixpoint. Rules:
   *  - island sum window: lo_e ≥ n - Σ hi(others), hi_e ≤ n - Σ lo(others)
   *  - crossing exclusion: a definite bridge zeroes every crossing link
   * Returns false on contradiction. Mutates lo/hi in place.
   */
  const propagate = (lo: Int8Array, hi: Int8Array): boolean => {
    for (;;) {
      let changed = false;
      for (let i = 0; i < ni; i++) {
        const at = linksAt[i];
        let slo = 0;
        let shi = 0;
        for (const e of at) {
          slo += lo[e];
          shi += hi[e];
        }
        if (slo > degrees[i] || shi < degrees[i]) return false;
        for (const e of at) {
          const nhi = degrees[i] - slo + lo[e];
          const nlo = degrees[i] - shi + hi[e];
          if (nhi < hi[e]) {
            hi[e] = nhi;
            changed = true;
          }
          if (nlo > lo[e]) {
            lo[e] = nlo;
            changed = true;
          }
          if (lo[e] > hi[e]) return false;
        }
      }
      for (let e = 0; e < m; e++) {
        if (lo[e] < 1) continue;
        for (const f of crossings[e]) {
          if (lo[f] >= 1) return false;
          if (hi[f] !== 0) {
            hi[f] = 0;
            changed = true;
          }
        }
      }
      if (!changed) return true;
    }
  };

  /** all islands reachable through links whose bound allows ≥ 1 bridge */
  const connectedOver = (bound: Int8Array): boolean => {
    const seen = new Uint8Array(ni);
    const stack = [0];
    seen[0] = 1;
    let cnt = 1;
    while (stack.length) {
      const i = stack.pop()!;
      for (const e of linksAt[i]) {
        if (bound[e] < 1) continue;
        const j = links[e].a === i ? links[e].b : links[e].a;
        if (!seen[j]) {
          seen[j] = 1;
          cnt++;
          stack.push(j);
        }
      }
    }
    return cnt === ni;
  };

  const search = (lo: Int8Array, hi: Int8Array): void => {
    if (result.count >= limit) return;
    if (!propagate(lo, hi)) return;
    // connectivity heuristic: if even the optimistic graph splits, prune
    if (!connectedOver(hi)) return;
    let pick = -1;
    let best = 99;
    for (let e = 0; e < m; e++) {
      const span = hi[e] - lo[e];
      if (span > 0 && span < best) {
        best = span;
        pick = e;
        if (span === 1) break;
      }
    }
    if (pick === -1) {
      // fully decided — island sums are exact (propagate proved it);
      // a real solution must additionally be one connected network
      if (!connectedOver(lo)) return;
      result.count++;
      if (!result.solution) result.solution = Array.from(lo);
      return;
    }
    // denser branches first: bridges connect, so they fail (or finish) faster
    for (let v = hi[pick]; v >= lo[pick]; v--) {
      const lo2 = lo.slice();
      const hi2 = hi.slice();
      lo2[pick] = v;
      hi2[pick] = v;
      search(lo2, hi2);
      if (result.count >= limit) return;
    }
  };

  const lo0 = new Int8Array(m);
  const hi0 = new Int8Array(m).fill(2);
  search(lo0, hi0);
  return result;
}
