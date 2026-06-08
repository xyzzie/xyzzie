/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LSystemPreset } from '../types';

export const ESTABLISHED_PRESETS: LSystemPreset[] = [
  {
    id: 'tree',
    name: 'Symmetric Tree',
    axiom: 'F',
    angle: 25,
    iterations: 4,
    length: 6,
    decay: 0.65,
    rules: [{ from: 'F', to: 'FF+[+F-F-F]-[-F+F+F]' }]
  },
  {
    id: 'fern',
    name: 'Barnsley Fern',
    axiom: 'X',
    angle: 25,
    iterations: 5,
    length: 5,
    decay: 0.6,
    rules: [
      { from: 'X', to: 'F+[[X]-X]-F[-FX]+X' },
      { from: 'F', to: 'FF' }
    ]
  },
  {
    id: 'dragon',
    name: 'Dragon Curve',
    axiom: 'FX',
    angle: 90,
    iterations: 10,
    length: 5,
    decay: 1.0,
    rules: [
      { from: 'X', to: 'X+YF+' },
      { from: 'Y', to: '-FX-Y' }
    ]
  },
  {
    id: 'sierpinski',
    name: 'Sierpinski Gasket',
    axiom: 'F-G-G',
    angle: 120,
    iterations: 6,
    length: 8,
    decay: 0.5,
    rules: [
      { from: 'F', to: 'F-G+F+G-F' },
      { from: 'G', to: 'GG' }
    ]
  },
  {
    id: 'hilbert',
    name: 'Hilbert Curve Space',
    axiom: 'A',
    angle: 90,
    iterations: 5,
    length: 8,
    decay: 0.5,
    rules: [
      { from: 'A', to: '+BF-AFA-FB+' },
      { from: 'B', to: '-AF+BFB+FA-' }
    ]
  },
  {
    id: 'bush',
    name: 'Blowing Bush',
    axiom: 'Y',
    angle: 25.7,
    iterations: 4,
    length: 8,
    decay: 0.7,
    rules: [
      { from: 'X', to: 'X[-FFF][+FFF]FX' },
      { from: 'Y', to: 'YFX[+Y][-Y]' }
    ]
  },
  {
    id: 'snowflake',
    name: 'Koch Snowflake',
    axiom: 'F++F++F',
    angle: 60,
    iterations: 4,
    length: 8,
    decay: 0.33,
    rules: [{ from: 'F', to: 'F-F++F-F' }]
  },
  {
    id: 'coral',
    name: 'Underwater Coral',
    axiom: 'F',
    angle: 22.5,
    iterations: 4,
    length: 7,
    decay: 0.7,
    rules: [{ from: 'F', to: 'FF-[-F+F+F]+[+F-F-F]' }]
  },
  {
    id: 'vicsek_cross',
    name: 'Vicsek Bone',
    axiom: 'F-F-F-F',
    angle: 90,
    iterations: 4,
    length: 12,
    decay: 0.5,
    rules: [{ from: 'F', to: 'F-F+F+F-F' }]
  },
  {
    id: 'quadratic_cross',
    name: 'Quadratic Cross',
    axiom: 'F+F+F+F',
    angle: 90,
    iterations: 4,
    length: 10,
    decay: 0.5,
    rules: [{ from: 'F', to: 'F+F-F-F+F' }]
  },
  {
    id: 'sierpinski_arrow',
    name: 'Sierpinski Arrow',
    axiom: 'F',
    angle: 60,
    iterations: 5,
    length: 10,
    decay: 0.5,
    rules: [
      { from: 'F', to: 'G-F-G' },
      { from: 'G', to: 'F+G+F' }
    ]
  },
  {
    id: 'symmetric_dendrite',
    name: 'Symmetric Canopy',
    axiom: 'F-F-F-F',
    angle: 90,
    iterations: 4,
    length: 15,
    decay: 0.5,
    rules: [{ from: 'F', to: 'F[+F][-F]F' }]
  }
];

export const PALETTES: { [key: string]: string[] } = {
  white:    ['#ffffff', '#cccccc', '#888888', '#444444'],
  neon:     ['#00ffcc', '#ff00aa', '#ffee00', '#00aaff'],
  fire:     ['#ff4400', '#ff8800', '#ffcc00', '#ffffff'],
  forest:   ['#2d6a4f', '#52b788', '#b7e4c7', '#d8f3dc'],
  cosmic:   ['#7400b8', '#6930c3', '#5e60ce', '#48bfe3'],
  mono:     ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
};

export const BG_COLORS = ['#0d0d0d', '#000000', '#0a0a1a', '#1a0a0a', '#0a1a0a', '#ffffff'];
