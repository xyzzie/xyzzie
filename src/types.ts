/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppMode = 'lsystem' | 'ca' | 'combined' | 'pen' | 'kaleidoscope';

export type UITheme = 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'cyan' | 'custom';


export type CAType = 'rule' | 'gol' | 'brian' | 'seeds' | 'cyclic';

export type DrawStyle = 'lines' | 'glow' | 'dots' | 'gradient' | 'neon' | 'extrude' | 'silhouette';

export interface LSystemPreset {
  id: string;
  name: string;
  axiom: string;
  angle: number;
  iterations: number;
  length: number;
  decay: number;
  rules: { from: string; to: string }[];
}

export interface RuleMap {
  [key: string]: string;
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface TurtleSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
  len: number;
  isSprout?: boolean;
  isBud?: boolean;
}

export interface Suggestion {
  segs: TurtleSegment[];
  snapPt: Point;
  label: string;
  off: number;
}

export interface ContiguousPath {
  points: Point[];
  depth: number;
}

export interface PlacedSprout {
  anchor: Point;
  dir: number;
  axiom: string;
  rules: { from: string; to: string }[];
  depth: number;
  len: number;
  decay: number;
  angle: number;
}

export interface CAShape {
  id: string;
  type: 'freehand' | 'rectangle' | 'triangle' | 'circle';
  points: Point[];
  caRule: number;
  caRule2: number;
  caBlendMode: string;
  caSeedType: string;
  caSymmetry: string;
  cellSize: number;
  caPaletteColors: string[];
  activePalette: string;
  customPalette: string[];
}

export interface CombinedLSystem {
  id: string;
  name: string;
  axiom: string;
  rules: { from: string; to: string }[];
  iterations: number;
  angle: number;
  length: number;
  decay: number;
  lineWidth: number;
  offset: { x: number; y: number };
  activePalette: string;
  customPalette: string[];
  scale?: number;
  segments?: any[];
  paths?: any[];
  budIterations?: number[];
  stochastic?: number;
  seed?: number;
}




