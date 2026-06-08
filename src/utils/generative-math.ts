/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TurtleSegment, BoundingBox, Point, CAType, ContiguousPath } from '../types';

/**
 * Simple Mulberry32 generator for reproducible pseudo-random numbers based on a seed.
 */
export function createPRNG(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/**
 * Expands an L-System axiom string based on replacement rules for a given number of iterations.
 * @param axiom Starting string
 * @param rules Matching map of replacements
 * @param iterations Count of reproduction steps
 * @param stochastic Probability (0 to 0.5) of skip actions
 * @param seed Optional seed value for stable random evaluation
 */
export function expandLSystem(
  axiom: string,
  rules: { [key: string]: string },
  iterations: number,
  stochastic: number = 0,
  seed: number = 42
): string {
  const rng = createPRNG(seed);
  let str = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of str) {
      if (rules[ch]) {
        if (stochastic > 0 && rng() < stochastic) {
          next += ch; // Skip mutation stochastically
        } else {
          next += rules[ch];
        }
      } else {
        next += ch;
      }
    }
    str = next;
    if (str.length > 500000) {
      str = str.substring(0, 500000); // safety length boundary
      break; 
    }
  }
  return str;
}

/**
 * Sweeps the entire instructions string to identify coordinates bounding box, used to center-fit.
 */
export function computeBounds(
  str: string,
  angleRad: number,
  segLen: number,
  decay: number
): BoundingBox {
  let x = 0;
  let y = 0;
  let dir = -Math.PI / 2;
  const stack: { x: number; y: number; dir: number; len: number; depth: number }[] = [];
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  let len = segLen;
  let depth = 0;

  for (const ch of str) {
    switch (ch) {
      case 'F':
      case 'G':
        x += Math.cos(dir) * len;
        y += Math.sin(dir) * len;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        break;
      case '+':
        dir += angleRad;
        break;
      case '-':
        dir -= angleRad;
        break;
      case '[':
        stack.push({ x, y, dir, len, depth });
        depth++;
        len *= decay;
        break;
      case ']':
        if (stack.length) {
          const s = stack.pop()!;
          x = s.x;
          y = s.y;
          dir = s.dir;
          len = s.len;
          depth = s.depth;
        }
        break;
    }
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Traces the turtle movements to assemble final segments representing lines.
 */
export function collectSegments(
  str: string,
  angleRad: number,
  segLen: number,
  decay: number,
  startX: number,
  startY: number,
  rotationRad: number,
  stochastic: number = 0,
  seed: number = 42
): TurtleSegment[] {
  let x = startX;
  let y = startY;
  let dir = -Math.PI / 2 + rotationRad;
  const stack: { x: number; y: number; dir: number; len: number; depth: number }[] = [];
  let len = segLen;
  let depth = 0;
  const segments: TurtleSegment[] = [];
  const rng = createPRNG(seed);

  for (const ch of str) {
    switch (ch) {
      case 'F':
      case 'G': {
        const jitterFact = stochastic > 0 ? (1.0 + (rng() - 0.5) * stochastic * 0.45) : 1.0;
        const currentLen = len * jitterFact;
        const nx = x + Math.cos(dir) * currentLen;
        const ny = y + Math.sin(dir) * currentLen;
        segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth, len: currentLen });
        x = nx;
        y = ny;
        break;
      }
      case 'f': {
        const jitterFact = stochastic > 0 ? (1.0 + (rng() - 0.5) * stochastic * 0.45) : 1.0;
        const currentLen = len * jitterFact;
        x += Math.cos(dir) * currentLen;
        y += Math.sin(dir) * currentLen;
        break;
      }
      case '+': {
        const jitterAng = stochastic > 0 ? (rng() - 0.5) * stochastic * 1.5 : 0;
        dir += angleRad + jitterAng;
        break;
      }
      case '-': {
        const jitterAng = stochastic > 0 ? (rng() - 0.5) * stochastic * 1.5 : 0;
        dir -= (angleRad + jitterAng);
        break;
      }
      case '|':
        dir += Math.PI;
        break;
      case '[':
        stack.push({ x, y, dir, len, depth });
        depth++;
        len *= decay;
        break;
      case ']':
        if (stack.length) {
          const s = stack.pop()!;
          x = s.x;
          y = s.y;
          dir = s.dir;
          len = s.len;
          depth = s.depth;
        }
        break;
    }
  }
  return segments;
}

/**
 * Computes multiple tiers of end-tips/buds recursively on a list of parent segments.
 */
export function computeAllBudSegments(
  baseSegs: TurtleSegment[],
  budIterations: number[],
  axiom: string,
  rulesMap: { [key: string]: string },
  stochastic: number,
  seed: number,
  angleRad: number,
  decay: number
): TurtleSegment[] {
  let segs = [...baseSegs];
  let currentLayerSegs = [...baseSegs];

  if (!budIterations || budIterations.length === 0) return segs;

  budIterations.forEach((iterationsVal, tierIndex) => {
    if (iterationsVal <= 0 || currentLayerSegs.length === 0) {
      return;
    }

    const budExpandedString = expandLSystem(axiom, rulesMap, iterationsVal, stochastic, seed + 1337 + tierIndex);

    const startPoints = new Set<string>();
    for (const s of segs) {
      startPoints.add(`${s.x1.toFixed(1)},${s.y1.toFixed(1)}`);
    }

    const terminalTips: { x2: number; y2: number; dir: number; depth: number; len: number }[] = [];
    for (const s of currentLayerSegs) {
      const endKey = `${s.x2.toFixed(1)},${s.y2.toFixed(1)}`;
      if (!startPoints.has(endKey)) {
        const dir = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        terminalTips.push({ x2: s.x2, y2: s.y2, dir, depth: s.depth, len: s.len });
      }
    }

    const tierBudSegs: TurtleSegment[] = [];
    for (const tip of terminalTips) {
      const perturbedSeed = seed + 5000 + tierIndex + Math.round(tip.x2 + tip.y2);
      const localBudSegs = collectSegments(
        budExpandedString,
        angleRad,
        tip.len * decay,
        decay,
        tip.x2,
        tip.y2,
        tip.dir + Math.PI / 2,
        stochastic,
        perturbedSeed
      );
      for (const b of localBudSegs) {
        b.depth = tip.depth + 1 + b.depth;
        b.isBud = true;
      }
      tierBudSegs.push(...localBudSegs);
    }

    segs = [...segs, ...tierBudSegs];
    currentLayerSegs = tierBudSegs;
  });

  return segs;
}

/**
 * Prepares a fresh 2D array representing grid nodes initialized based on densities.
 */
export function init2DGrid(cols: number, rows: number, density: number, type: CAType, seed: number = 42): number[][] {
  const rng = createPRNG(seed);
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      if (type === 'brian') {
        grid[r][c] = rng() < density ? (rng() < 0.5 ? 1 : 2) : 0;
      } else if (type === 'cyclic') {
        grid[r][c] = Math.floor(rng() * 4);
      } else {
        grid[r][c] = rng() < density ? 1 : 0;
      }
    }
  }
  return grid;
}

/**
 * Calculates numbers of neighbors surrounding coordinates (supports wrapping bounds).
 */
export function countNeighbors(grid: number[][], r: number, c: number, rows: number, cols: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = (r + dr + rows) % rows;
      const nc = (c + dc + cols) % cols;
      if (grid[nr] && grid[nr][nc] > 0) count++;
    }
  }
  return count;
}

/**
 * Computes next generation of cellular states based on neighborhood counts and model species.
 */
export function step2DGrid(grid: number[][], type: CAType): number[][] {
  const rows = grid.length;
  if (rows === 0) return grid;
  const cols = grid[0].length;
  const next = grid.map(r => [...r]);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const neighbors = countNeighbors(grid, r, c, rows, cols);
      const cell = grid[r][c];

      if (type === 'gol') {
        if (cell === 1) {
          next[r][c] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          next[r][c] = neighbors === 3 ? 1 : 0;
        }
      } else if (type === 'brian') {
        if (cell === 0 && neighbors === 2) {
          next[r][c] = 1;
        } else if (cell === 1) {
          next[r][c] = 2; // dying state
        } else {
          next[r][c] = 0;
        }
      } else if (type === 'seeds') {
        if (cell === 0 && neighbors === 2) {
          next[r][c] = 1;
        } else {
          next[r][c] = 0;
        }
      } else if (type === 'cyclic') {
        const target = (cell + 1) % 4;
        let targetCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = (r + dr + rows) % rows;
            const nc = (c + dc + cols) % cols;
            if (grid[nr] && grid[nr][nc] === target) targetCount++;
          }
        }
        if (targetCount >= 1) {
          next[r][c] = target;
        }
      }
    }
  }
  return next;
}

/**
 * Optimally groups discrete lines/segments into contiguous paths of points.
 * Minimizes WebGL-style attribute changes or 2D stroke operations.
 */
export function groupSegmentsToPaths(segs: TurtleSegment[]): ContiguousPath[] {
  const paths: ContiguousPath[] = [];
  if (segs.length === 0) return paths;

  let currentPath: Point[] = [];
  let currentDepth = -1;

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (currentPath.length === 0) {
      currentPath.push({ x: seg.x1, y: seg.y1 });
      currentPath.push({ x: seg.x2, y: seg.y2 });
      currentDepth = seg.depth;
    } else if (
      Math.abs(seg.x1 - currentPath[currentPath.length - 1].x) < 0.0001 &&
      Math.abs(seg.y1 - currentPath[currentPath.length - 1].y) < 0.0001 &&
      seg.depth === currentDepth
    ) {
      currentPath.push({ x: seg.x2, y: seg.y2 });
    } else {
      paths.push({ points: currentPath, depth: currentDepth });
      currentPath = [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }];
      currentDepth = seg.depth;
    }
  }
  if (currentPath.length > 0) {
    paths.push({ points: currentPath, depth: currentDepth });
  }

  return paths;
}

