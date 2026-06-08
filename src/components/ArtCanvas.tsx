/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  AppMode, 
  CAType, 
  DrawStyle, 
  Point, 
  TurtleSegment, 
  Suggestion,
  ContiguousPath,
  PlacedSprout,
  UITheme,
  CAShape,
  CombinedLSystem
} from '../types';
import { Compass, Plus, Trash2, Minus } from 'lucide-react';
import { 
  expandLSystem, 
  computeBounds, 
  collectSegments, 
  init2DGrid, 
  step2DGrid,
  groupSegmentsToPaths,
  computeAllBudSegments,
  createPRNG
} from '../utils/generative-math';
import { PALETTES } from '../data/presets';
import { THEME_MAP } from '../utils/theme';

interface ArtCanvasProps {
  mode: AppMode;
  axiom: string;
  rules: { from: string; to: string }[];
  iterations: number;
  budIterations: number[];
  angle: number;
  length: number;
  decay: number;
  lineWidth: number;
  stochastic: number;

  caType: CAType;
  caRule: number;
  caRule2?: number;
  caBlendMode?: string;
  caSeedType?: string;
  caSymmetry?: string;
  cellSize: number;
  caSpeed: number;
  caDensity: number;

  drawStyle: DrawStyle;
  extrudeDepth: number;
  extrudeAngle: number;
  extrudeLw: number;
  extrudeConn: number;

  activePalette: string;
  customPalette?: string[];
  separateColors?: boolean;
  lsActivePalette?: string;
  lsCustomPalette?: string[];
  caActivePalette?: string;
  caCustomPalette?: string[];
  activeBg: string;
  bgType?: 'solid' | 'linear' | 'radial';
  bgGradientColor1?: string;
  bgGradientColor2?: string;
  bgGradientAngle?: number;
  bgGradientStop1?: number;
  bgGradientStop2?: number;
  flipHorizontal?: boolean;
  opacity: number;
  rotation: number;
  scale: number;

  penDepth: number;
  penLen: number;
  adjustDrawn: boolean;
  generateKey: number;
  seed: number;
  smoothCurves: boolean;
  
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  setInfoText: (text: string) => void;
  // Prop callbacks to allow app.tsx to trigger undo/clear inside canvas or pass refs
  penTriggerUndoRef: React.MutableRefObject<(() => void) | null>;
  penTriggerClearRef: React.MutableRefObject<(() => void) | null>;
  exportPngRef: React.MutableRefObject<((options: { ratio: string; scale: number; transparent: boolean; fitContent: boolean }) => void) | null>;

  kaleidoscopeSegments: number;
  kaleidoscopeMode: 'mirror' | 'spin';
  kaleidoscopeDoubleMirror?: boolean;
  kaleidoscopeSource: 'draw' | 'lsystem' | 'ca' | 'combined' | 'pen';
  uiTheme: UITheme;
  kaleidoscopeMirrorAxis: 'horizontal' | 'vertical';
  setScale?: (val: number) => void;
  kaleidoscopeElementRotation?: number;
  kaleidoscopeElementAnchor?: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'origin';

  caDrawMode?: 'grid' | 'shapes';
  setCaDrawMode?: (val: 'grid' | 'shapes') => void;
  caActiveTool?: 'freehand' | 'rectangle' | 'triangle' | 'circle' | 'move';
  setCaActiveTool?: (val: 'freehand' | 'rectangle' | 'triangle' | 'circle' | 'move') => void;
  caShapes?: CAShape[];
  setCaShapes?: React.Dispatch<React.SetStateAction<CAShape[]>>;
  selectedCAShapeId?: string | null;
  setSelectedCAShapeId?: (val: string | null) => void;

  setAxiom?: (val: string) => void;
  setRules?: (val: { from: string; to: string }[]) => void;
  setIterations?: (val: number) => void;
  setAngle?: (val: number) => void;
  setLength?: (val: number) => void;
  setDecay?: (val: number) => void;
  setLineWidth?: (val: number) => void;
  setLsActivePalette?: (val: string) => void;
  setLsCustomPalette?: (val: string[]) => void;
  setBudIterations?: (val: number[]) => void;
  setStochastic?: (val: number) => void;
  setSeed?: (val: number) => void;
}

export default function ArtCanvas({
  mode,
  axiom,
  rules,
  iterations,
  budIterations,
  angle,
  length,
  decay,
  lineWidth,
  stochastic,

  caType,
  caRule,
  caRule2 = 90,
  caBlendMode = 'none',
  caSeedType = 'single',
  caSymmetry = 'none',
  cellSize,
  caSpeed,
  caDensity,

  drawStyle,
  extrudeDepth,
  extrudeAngle,
  extrudeLw,
  extrudeConn,

  activePalette,
  customPalette,
  separateColors = false,
  lsActivePalette = 'neon',
  lsCustomPalette = ['#00f5ff', '#ff00a0'],
  caActivePalette = 'fire',
  caCustomPalette = ['#ff3300', '#ffaa00'],
  activeBg,
  bgType = 'solid',
  bgGradientColor1 = '#0d0d1e',
  bgGradientColor2 = '#1e0d2d',
  bgGradientAngle = 135,
  bgGradientStop1 = 0,
  bgGradientStop2 = 100,
  flipHorizontal = false,
  opacity,
  rotation,
  scale,
  setScale,

  penDepth,
  penLen,
  adjustDrawn,
  generateKey,
  seed,
  smoothCurves,

  canvasRef,
  setInfoText,
  penTriggerUndoRef,
  penTriggerClearRef,
  exportPngRef,

  kaleidoscopeSegments,
  kaleidoscopeMode,
  kaleidoscopeDoubleMirror = false,
  kaleidoscopeSource,
  uiTheme,
  kaleidoscopeMirrorAxis,
  kaleidoscopeElementRotation = 0,
  kaleidoscopeElementAnchor = 'center',

  caDrawMode = 'grid',
  setCaDrawMode,
  caActiveTool = 'freehand',
  setCaActiveTool,
  caShapes = [],
  setCaShapes,
  selectedCAShapeId = null,
  setSelectedCAShapeId,

  setAxiom,
  setRules,
  setIterations,
  setAngle,
  setLength,
  setDecay,
  setLineWidth,
  setLsActivePalette,
  setLsCustomPalette,
  setBudIterations,
  setStochastic,
  setSeed,
}: ArtCanvasProps) {

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const offscreenCARenderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tc = THEME_MAP[uiTheme] || THEME_MAP.indigo;

  // Viewport states: Zooom + Panning translation
  const [vpZoom, setVpZoom] = useState<number>(1.0);
  const [vpPanX, setVpPanX] = useState<number>(0);
  const [vpPanY, setVpPanY] = useState<number>(0);

  // Logical canvas dimensions computed dynamically
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  // Local interaction states
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isDrawingKaleidoscope, setIsDrawingKaleidoscope] = useState<boolean>(false);
  const [isDrawingCAShape, setIsDrawingCAShape] = useState<boolean>(false);
  const [caShapeDraftPoints, setCaShapeDraftPoints] = useState<Point[]>([]);
  const startDragPtRef = useRef<Point | null>(null);
  const [panOriginOnCanvas, setPanOriginOnCanvas] = useState<boolean>(false);
  const [isMovingCAShape, setIsMovingCAShape] = useState<boolean>(false);
  const lastMovingCAShapePtRef = useRef<Point | null>(null);

  // L-System caching variables
  const [cachedLString, setCachedLString] = useState<string>('');
  const [cachedSegments, setCachedSegments] = useState<TurtleSegment[]>([]);
  const [cachedPaths, setCachedPaths] = useState<ContiguousPath[]>([]);
  const [cachedFitScale, setCachedFitScale] = useState<number>(1.0);
  const [cachedStartX, setCachedStartX] = useState<number>(0);
  const [cachedStartY, setCachedStartY] = useState<number>(0);

  // States to track dragging/zooming interactions for performance throttling
  const [isZooming, setIsZooming] = useState<boolean>(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPropsChangedRef = useRef<number>(0);
  const prevPropsRef = useRef({ angle, length, decay, lineWidth, rotation, scale });

  // Refs for tracking drag-to-pan in real viewport coordinates
  const startVpPanXRef = useRef<number>(0);
  const startVpPanYRef = useRef<number>(0);
  const startMouseXRef = useRef<number>(0);
  const startMouseYRef = useRef<number>(0);

  // Combined mode manual manipulation offsets
  const [combinedDragTarget, setCombinedDragTarget] = useState<'viewport' | 'lsystem' | 'ca'>('lsystem');
  const [lsManOffset, setLsManOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [caManOffset, setCaManOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDraggingCombined, setIsDraggingCombined] = useState<boolean>(false);
  const startCombinedOffsetXRef = useRef<number>(0);
  const startCombinedOffsetYRef = useRef<number>(0);

  // Multiple L-systems & resizing inside Combined mode
  const [combinedLSystems, setCombinedLSystems] = useState<CombinedLSystem[]>([]);
  const [selectedCombinedLSystemId, setSelectedCombinedLSystemId] = useState<string | null>(null);
  const [caScale, setCaScale] = useState<number>(1.0);
  const [activeDragAction, setActiveDragAction] = useState<'pan' | 'move' | 'resize' | null>(null);
  const [isLayersPanelCollapsed, setIsLayersPanelCollapsed] = useState<boolean>(false);
  
  const startScaleRef = useRef<number>(1.0);
  const startBoxWidthRef = useRef<number>(0);
  const startBoxHeightRef = useRef<number>(0);
  const startShapePointsRef = useRef<Point[]>([]);
  const startShapeOriginRef = useRef<Point>({ x: 0, y: 0 });

  const lastSelectSyncRef = useRef<{
    id: string;
    axiom: string;
    rules: { from: string; to: string }[];
    iterations: number;
    angle: number;
    length: number;
    decay: number;
    lineWidth: number;
    activePalette: string;
    customPalette: string[];
    budIterations: number[];
    stochastic: number;
    seed: number;
  } | null>(null);

  // Cellular Automata running states
  const [caState, setCaState] = useState<number[][] | null>(null);
  const caTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Symmetric Pen states
  const [penPaths, setPenPaths] = useState<Point[][]>([]);
  const [penCurrent, setPenCurrent] = useState<Point[] | null>(null);
  const [penPreview, setPenPreview] = useState<Point | null>(null);
  const [placedSprouts, setPlacedSprouts] = useState<PlacedSprout[]>([]);
  const [penSegments, setPenSegments] = useState<TurtleSegment[]>([]);
  const [penHistory, setPenHistory] = useState<{
    penPaths: Point[][];
    penCurrent: Point[] | null;
    penSegments: TurtleSegment[];
    placedSprouts: PlacedSprout[];
  }[]>([]);
  const [shiftHeld, setShiftHeld] = useState<boolean>(false);
  const [ctrlLocked, setCtrlLocked] = useState<boolean>(false);

  const [penSuggestions, setPenSuggestions] = useState<Suggestion[]>([]);
  const [hoveredSuggIdx, setHoveredSuggIdx] = useState<number>(0);
  const [snappedPoint, setSnappedPoint] = useState<Point | null>(null);

  // --- TRANSFORMS & HELPERS ---

  const getElementBounds = useCallback((): { minX: number; maxX: number; minY: number; maxY: number } | null => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    if (kaleidoscopeSource === 'lsystem' || kaleidoscopeSource === 'combined') {
      if (cachedSegments && cachedSegments.length > 0) {
        for (const seg of cachedSegments) {
          minX = Math.min(minX, seg.x1, seg.x2);
          maxX = Math.max(maxX, seg.x1, seg.x2);
          minY = Math.min(minY, seg.y1, seg.y2);
          maxY = Math.max(maxY, seg.y1, seg.y2);
        }
      }
    }
    
    if (kaleidoscopeSource === 'draw' || kaleidoscopeSource === 'pen' || kaleidoscopeSource === 'combined') {
      if (penSegments && penSegments.length > 0) {
        for (const seg of penSegments) {
          minX = Math.min(minX, seg.x1, seg.x2);
          maxX = Math.max(maxX, seg.x1, seg.x2);
          minY = Math.min(minY, seg.y1, seg.y2);
          maxY = Math.max(maxY, seg.y1, seg.y2);
        }
      }
      if (penCurrent && penCurrent.length > 0) {
        for (const pt of penCurrent) {
          minX = Math.min(minX, pt.x);
          maxX = Math.max(maxX, pt.x);
          minY = Math.min(minY, pt.y);
          maxY = Math.max(maxY, pt.y);
        }
      }
    }

    if (kaleidoscopeSource === 'ca' || kaleidoscopeSource === 'combined') {
      if (caState) {
        const rows = caState.length;
        const cols = rows > 0 ? caState[0].length : 0;
        const width = cols * cellSize;
        const height = rows * cellSize;
        minX = Math.min(minX, 0);
        maxX = Math.max(maxX, width);
        minY = Math.min(minY, 0);
        maxY = Math.max(maxY, height);
      }
    }

    if (minX === Infinity) {
      return null;
    }
    return { minX, maxX, minY, maxY };
  }, [kaleidoscopeSource, cachedSegments, penSegments, penCurrent, caState, cellSize]);

  const screenToWorld = useCallback((sx: number, sy: number): Point => {
    // 1. Undo viewport rotation around center (cx, cy)
    let rx = sx;
    let ry = sy;
    
    let totalRotDeg = rotation;
    if (mode === 'kaleidoscope' && kaleidoscopeSegments !== 2) {
      let baseOffsetDeg = 0;
      if (kaleidoscopeMirrorAxis === 'horizontal') {
        baseOffsetDeg = 90;
      }
      totalRotDeg += baseOffsetDeg;
    }

    if (totalRotDeg !== 0) {
      const cx = canvasSize.width / 2;
      const cy = canvasSize.height / 2;
      const negRotRad = (-totalRotDeg * Math.PI) / 180;
      const cosVal = Math.cos(negRotRad);
      const sinVal = Math.sin(negRotRad);
      
      const dx = sx - cx;
      const dy = sy - cy;
      
      rx = dx * cosVal - dy * sinVal + cx;
      ry = dx * sinVal + dy * cosVal + cy;
    }

    // 2. Undo the zoom and pan translation
    const worldPoint = {
      x: (rx - vpPanX) / vpZoom,
      y: (ry - vpPanY) / vpZoom
    };

    // 3. Undo element rotation if inside kaleidoscope mode and rotation is active
    if (mode === 'kaleidoscope' && kaleidoscopeElementRotation !== 0) {
      const bounds = getElementBounds();
      if (bounds) {
        let px = (bounds.minX + bounds.maxX) / 2;
        let py = (bounds.minY + bounds.maxY) / 2;

        if (kaleidoscopeElementAnchor === 'left') {
          px = bounds.minX;
        } else if (kaleidoscopeElementAnchor === 'right') {
          px = bounds.maxX;
        } else if (kaleidoscopeElementAnchor === 'top') {
          py = bounds.minY;
        } else if (kaleidoscopeElementAnchor === 'bottom') {
          py = bounds.maxY;
        } else if (kaleidoscopeElementAnchor === 'origin') {
          px = 0;
          py = 0;
        }

        const negElemRotRad = (-kaleidoscopeElementRotation * Math.PI) / 180;
        const cosE = Math.cos(negElemRotRad);
        const sinE = Math.sin(negElemRotRad);

        const dx = worldPoint.x - px;
        const dy = worldPoint.y - py;

        worldPoint.x = dx * cosE - dy * sinE + px;
        worldPoint.y = dx * sinE + dy * cosE + py;
      }
    }

    return worldPoint;
  }, [
    vpPanX,
    vpPanY,
    vpZoom,
    rotation,
    mode,
    kaleidoscopeMirrorAxis,
    canvasSize,
    kaleidoscopeElementRotation,
    kaleidoscopeElementAnchor,
    getElementBounds
  ]);

  const pointInShape = useCallback((pt: Point, shape: CAShape): boolean => {
    if (shape.type === 'rectangle') {
      if (shape.points.length < 2) return false;
      const p1 = shape.points[0];
      const p2 = shape.points[1];
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
    }
    if (shape.type === 'circle') {
      if (shape.points.length < 2) return false;
      const center = shape.points[0];
      const rim = shape.points[1];
      const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
      const dx = pt.x - center.x;
      const dy = pt.y - center.y;
      return (dx * dx + dy * dy) <= r * r;
    }
    if (shape.type === 'triangle') {
      if (shape.points.length < 3) return false;
      const p0 = shape.points[0];
      const p1 = shape.points[1];
      const p2 = shape.points[2];
      const A = 1/2 * (-p1.y * p2.x + p0.y * (-p1.x + p2.x) + p0.x * (p1.y - p2.y) + p1.x * p2.y);
      const sign = A < 0 ? -1 : 1;
      const s = (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * pt.x + (p0.x - p2.x) * pt.y) * sign;
      const t = (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * pt.x + (p1.x - p0.x) * pt.y) * sign;
      return s >= 0 && t >= 0 && (s + t) <= 2 * A * sign;
    }
    if (shape.type === 'freehand') {
      let inside = false;
      const poly = shape.points;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi > pt.y) !== (yj > pt.y))
            && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }
    return false;
  }, []);

  const getSnapPoint = useCallback((pt: Point, sx: number, sy: number) => {
    let bestCandidate: Point | null = null;
    let bestDist = 15; // Snapping threshold: 15 screen pixels
    
    // Collect all existing vertices
    const points: Point[] = [];
    penPaths.forEach(path => {
      path.forEach(p => points.push(p));
    });
    if (penCurrent) {
      // Don't snap to the exact last point of penCurrent (the current segment origin)
      for (let i = 0; i < penCurrent.length - 1; i++) {
        points.push(penCurrent[i]);
      }
    }
    
    // Create list of snap candidates (original and optional extruded points)
    const candidates: Point[] = [];
    points.forEach(cp => {
      candidates.push(cp);
      if (drawStyle === 'extrude') {
        const exRad = (extrudeAngle * Math.PI) / 180;
        const ex = Math.cos(exRad) * extrudeDepth;
        const ey = Math.sin(exRad) * extrudeDepth;
        candidates.push({ x: cp.x + ex, y: cp.y + ey });
      }
    });
    
    candidates.forEach(cp => {
      // Calculate distance in local coordinate space and translate to screen pixels via vpZoom
      const dist = Math.hypot(pt.x - cp.x, pt.y - cp.y) * vpZoom;
      if (dist < bestDist) {
        bestDist = dist;
        bestCandidate = cp;
      }
    });
    
    return bestCandidate || pt;
  }, [penPaths, penCurrent, vpZoom, drawStyle, extrudeAngle, extrudeDepth]);

  const resetViewport = () => {
    setVpZoom(1.0);
    setVpPanX(0);
    setVpPanY(0);
  };

  const getRulesMap = useCallback(() => {
    const map: { [key: string]: string } = {};
    rules.forEach(r => {
      const f = r.from.trim();
      const t = r.to.trim();
      if (f && t) map[f] = t;
    });
    return map;
  }, [rules]);

  // --- INTUITIVE DRAWING MATH PROCEDURES ---

  const turtleToSegments = useCallback((
    str: string,
    angleRad: number,
    segLen: number,
    decayVal: number,
    startX: number,
    startY: number,
    startDir: number,
    stochasticVal: number = 0,
    seedVal: number = 42
  ): TurtleSegment[] => {
    let x = startX, y = startY, dir = startDir;
    const stack: { x: number; y: number; dir: number; len: number; dep: number }[] = [];
    let len = segLen, dep = 0;
    const segs: TurtleSegment[] = [];
    const rng = createPRNG(seedVal);

    for (const ch of str) {
      switch (ch) {
        case 'F':
        case 'G': {
          const jitterFact = stochasticVal > 0 ? (1.0 + (rng() - 0.5) * stochasticVal * 0.45) : 1.0;
          const currentLen = len * jitterFact;
          const nx = x + Math.cos(dir) * currentLen;
          const ny = y + Math.sin(dir) * currentLen;
          segs.push({ x1: x, y1: y, x2: nx, y2: ny, depth: dep, len: currentLen });
          x = nx; y = ny; break;
        }
        case 'f': {
          const jitterFact = stochasticVal > 0 ? (1.0 + (rng() - 0.5) * stochasticVal * 0.45) : 1.0;
          const currentLen = len * jitterFact;
          x += Math.cos(dir) * currentLen; y += Math.sin(dir) * currentLen; break;
        }
        case '+': {
          const jitterAng = stochasticVal > 0 ? (rng() - 0.5) * stochasticVal * 1.5 : 0;
          dir += angleRad + jitterAng; break;
        }
        case '-': {
          const jitterAng = stochasticVal > 0 ? (rng() - 0.5) * stochasticVal * 1.5 : 0;
          dir -= (angleRad + jitterAng); break;
        }
        case '[': stack.push({ x, y, dir, len, dep }); dep++; len *= decayVal; break;
        case ']':
          if (stack.length) { 
            const s = stack.pop()!; 
            x=s.x; y=s.y; dir=s.dir; len=s.len; dep=s.dep; 
          }
          break;
      }
    }
    return segs;
  }, []);

  // --- PEN STRAW ACTIONS ---

  const rebuildPenSegments = useCallback((
    currentPath: Point[] | null, 
    pathsList: Point[][],
    sprouts: PlacedSprout[] = placedSprouts
  ) => {
    const rebuilt: TurtleSegment[] = [];

    // 1. Generate L-system sprout branches dynamically
    for (const sprout of sprouts) {
      const finalAxiom = adjustDrawn ? axiom : sprout.axiom;
      const finalRules = adjustDrawn ? rules : sprout.rules;
      const finalAngle = adjustDrawn ? angle : sprout.angle;
      const finalDepth = adjustDrawn ? penDepth : sprout.depth;
      const finalLen = adjustDrawn ? penLen : sprout.len;
      const finalDecay = adjustDrawn ? decay : sprout.decay;

      const finalAngleRad = (finalAngle * Math.PI) / 180;
      
      const subMap: { [key: string]: string } = {};
      finalRules.forEach(r => {
        const f = r.from.trim();
        const t = r.to.trim();
        if (f && t) subMap[f] = t;
      });

      const str = expandLSystem(finalAxiom, subMap, finalDepth, stochastic, seed);
      const sproutSeed = seed + Math.round(sprout.anchor.x * 123 + sprout.anchor.y);
      let segs = turtleToSegments(str, finalAngleRad, finalLen, finalDecay, sprout.anchor.x, sprout.anchor.y, sprout.dir, stochastic, sproutSeed);
      segs = computeAllBudSegments(
        segs,
        budIterations,
        finalAxiom,
        subMap,
        stochastic,
        sproutSeed,
        finalAngleRad,
        finalDecay
      );
      segs.forEach(s => {
        s.isSprout = true;
      });
      rebuilt.push(...segs);
    }

    // 2. Add freehand tracks
    const all = currentPath ? [...pathsList, currentPath] : pathsList;
    for (const path of all) {
      for (let i = 0; i < path.length - 1; i++) {
        rebuilt.push({
          x1: path[i].x,
          y1: path[i].y,
          x2: path[i+1].x,
          y2: path[i+1].y,
          depth: 0,
          len: Math.hypot(path[i+1].x - path[i].x, path[i+1].y - path[i].y)
        });
      }
    }
    setPenSegments(rebuilt);
  }, [axiom, angle, penDepth, penLen, decay, rules, placedSprouts, adjustDrawn, turtleToSegments, budIterations, stochastic, seed]);

  // Synchronically repaint/rebuild sprouts in real-time when sliders or modes are updated on parameters dashboard
  useEffect(() => {
    if (mode === 'pen' || mode === 'kaleidoscope') {
      rebuildPenSegments(penCurrent, penPaths, placedSprouts);
    }
  }, [
    mode,
    kaleidoscopeSource,
    penCurrent,
    penPaths,
    placedSprouts,
    adjustDrawn,
    axiom,
    rules,
    angle,
    penDepth,
    penLen,
    decay,
    budIterations,
    stochastic,
    seed,
    rebuildPenSegments
  ]);

  const pushToHistory = useCallback(() => {
    setPenHistory(prev => {
      const next = [...prev, {
        penPaths: penPaths.map(p => [...p]),
        penCurrent: penCurrent ? [...penCurrent] : null,
        penSegments: [...penSegments],
        placedSprouts: placedSprouts.map(s => ({ ...s, rules: s.rules.map(r => ({ ...r })) }))
      }];
      if (next.length > 50) {
        next.shift();
      }
      return next;
    });
  }, [penPaths, penCurrent, penSegments, placedSprouts]);

  const handlePenUndo = useCallback(() => {
    if (penHistory.length > 0) {
      const prevState = penHistory[penHistory.length - 1];
      setPenHistory(prev => prev.slice(0, -1));
      setPenPaths(prevState.penPaths);
      setPenCurrent(prevState.penCurrent);
      setPenSegments(prevState.penSegments);
      if (prevState.placedSprouts) {
        setPlacedSprouts(prevState.placedSprouts);
      } else {
        setPlacedSprouts([]);
      }
    }
  }, [penHistory]);

  const handlePenClearAll = useCallback(() => {
    pushToHistory();
    setPenPaths([]);
    setPenCurrent(null);
    setPenPreview(null);
    setPenSegments([]);
    setPlacedSprouts([]);
    setPenSuggestions([]);
    setHoveredSuggIdx(0);
  }, [pushToHistory]);

  // Wire back parent callback references
  useEffect(() => {
    penTriggerUndoRef.current = handlePenUndo;
    penTriggerClearRef.current = handlePenClearAll;
  }, [handlePenUndo, handlePenClearAll, penTriggerUndoRef, penTriggerClearRef]);

  // Handle keys (Shift, Control, ESC, Ctrl+Z) for Pen system
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.code === 'KeyZ');
      if (isUndo) {
        e.preventDefault();
        handlePenUndo();
        return;
      }

      if (mode !== 'pen' && !(mode === 'kaleidoscope' && kaleidoscopeSource === 'pen')) return;
      if (e.key === 'Shift') {
        setShiftHeld(true);
        setCtrlLocked(false);
      }
      if (e.key === 'Control' && e.shiftKey) {
        setCtrlLocked(true);
      }
      if (e.key === 'Escape') {
        pushToHistory();
        setPenCurrent(null);
        setPenPreview(null);
        setPenSuggestions([]);
        setCtrlLocked(false);
        rebuildPenSegments(null, penPaths);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftHeld(false);
        setCtrlLocked(false);
        setPenSuggestions([]);
        setHoveredSuggIdx(0);
      }
      if (e.key === 'Control') {
        setCtrlLocked(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, kaleidoscopeSource, shiftHeld, penPaths, rebuildPenSegments, pushToHistory, handlePenUndo]);

  // --- DRAWING PROCEDURES AND PHASES ---

  const buildSuggestions = useCallback((from: Point, cursorPt: Point): Suggestion[] => {
    const angleRad = (angle * Math.PI) / 180;
    const map = getRulesMap();
    const str = expandLSystem(axiom, map, penDepth, stochastic, seed);

    const dx = cursorPt.x - from.x;
    const dy = cursorPt.y - from.y;
    const baseDir = Math.atan2(dy, dx) - Math.PI / 2;

    const offsets = [0, angleRad, -angleRad, angleRad * 2, -angleRad * 2];
    const labels = ['→ straight', '↗ branch +1', '↙ branch −1', '↗↗ wide +2', '↙↙ wide −2'];

    return offsets.map((off, i) => {
      const dir = baseDir + off;
      const suggSeed = seed + Math.round(from.x * 123 + from.y + i * 456);
      let segs = turtleToSegments(str, angleRad, penLen, decay, from.x, from.y, dir, stochastic, suggSeed);
      segs = computeAllBudSegments(
        segs,
        budIterations,
        axiom,
        map,
        stochastic,
        suggSeed,
        angleRad,
        decay
      );
      segs.forEach(s => {
        s.isSprout = true;
      });
      const snapPt = {
        x: from.x + Math.cos(baseDir + off) * penLen,
        y: from.y + Math.sin(baseDir + off) * penLen
      };
      return { segs, snapPt, label: labels[i], off };
    });
  }, [axiom, angle, getRulesMap, penDepth, penLen, decay, turtleToSegments, budIterations, stochastic, seed]);

  const sproutAt = useCallback((tip: Point, prev: Point) => {
    const dir = Math.atan2(tip.y - prev.y, tip.x - prev.x) - Math.PI / 2;
    const newSprout: PlacedSprout = {
      anchor: tip,
      dir,
      axiom,
      rules: rules.map(r => ({ ...r })),
      depth: penDepth,
      len: penLen,
      decay,
      angle
    };
    setPlacedSprouts(prevSprouts => [...prevSprouts, newSprout]);
  }, [axiom, angle, rules, penDepth, penLen, decay]);

  const findHoveredSugg = useCallback((cursorPt: Point, suggs: Suggestion[]): number => {
    if (!suggs.length) return 0;
    let best = 0, bestDist = Infinity;
    suggs.forEach((s, i) => {
      const d = Math.hypot(cursorPt.x - s.snapPt.x, cursorPt.y - s.snapPt.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }, []);

  // Sync pen suggestions in real-time when L-system parameters/sliders change on the panel
  useEffect(() => {
    const isPenActive = mode === 'pen' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'pen');
    if (isPenActive && shiftHeld && penCurrent && penCurrent.length > 0 && penPreview) {
      const last = penCurrent[penCurrent.length - 1];
      const freshSuggs = buildSuggestions(last, penPreview);
      setPenSuggestions(freshSuggs);
      
      if (ctrlLocked) {
        // If control is locked, find coordinates of closest hovered suggestion
        const hoverIdx = findHoveredSugg(penPreview, freshSuggs);
        setHoveredSuggIdx(hoverIdx);
      }
    }
  }, [
    mode,
    kaleidoscopeSource,
    shiftHeld,
    penCurrent,
    penPreview,
    ctrlLocked,
    buildSuggestions,
    findHoveredSugg
  ]);

  // --- CORE SYSTEM RENDERING ---

  const drawExtruded = useCallback((
    ctx: CanvasRenderingContext2D,
    segs: TurtleSegment[],
    ex: number,
    ey: number,
    frontWidth: number,
    backWidth: number,
    connWidth: number,
    paletteColors: string[]
  ) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const connected = new Set<string>();

    // Group segments by depth
    const depthGroups = new Map<number, TurtleSegment[]>();
    for (const seg of segs) {
      let list = depthGroups.get(seg.depth);
      if (!list) {
        list = [];
        depthGroups.set(seg.depth, list);
      }
      list.push(seg);
    }

    // 1. Rear isometric offset segments
    ctx.globalAlpha = 0.5;
    depthGroups.forEach((groupSegs, dep) => {
      const col = paletteColors[dep % paletteColors.length];
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(0.001, backWidth);
      ctx.beginPath();
      for (const seg of groupSegs) {
        ctx.moveTo(seg.x1 + ex, seg.y1 + ey);
        ctx.lineTo(seg.x2 + ex, seg.y2 + ey);
      }
      ctx.stroke();
    });

    // 2. Joining connect lines between rear and front layers
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = Math.max(0.001, connWidth);
    depthGroups.forEach((groupSegs, dep) => {
      const col = paletteColors[dep % paletteColors.length];
      ctx.strokeStyle = col;
      ctx.beginPath();
      for (const seg of groupSegs) {
        const { x1, y1, x2, y2 } = seg;
        const k1 = `${Math.round(x1)},${Math.round(y1)}`;
        const k2 = `${Math.round(x2)},${Math.round(y2)}`;

        if (!connected.has(k1)) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 + ex, y1 + ey);
          connected.add(k1);
        }
        if (!connected.has(k2)) {
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 + ex, y2 + ey);
          connected.add(k2);
        }
      }
      ctx.stroke();
    });

    // 3. Front pristine foreground segments
    ctx.globalAlpha = 1.0;
    depthGroups.forEach((groupSegs, dep) => {
      const col = paletteColors[dep % paletteColors.length];
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(0.001, frontWidth * Math.pow(0.85, dep));
      ctx.beginPath();
      for (const seg of groupSegs) {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      }
      ctx.stroke();
    });

    ctx.globalAlpha = 1.0;
  }, []);

  const draw1DRuleAutomata = useCallback((
    ctx: CanvasRenderingContext2D,
    rule: number,
    cols: number,
    rows: number,
    cellSz: number,
    paletteColors: string[],
    opac: number,
    overrides?: {
      caRule2?: number;
      caBlendMode?: string;
      caSeedType?: string;
      caSymmetry?: string;
      caDensity?: number;
    }
  ) => {
    if (cols <= 0 || rows <= 0) return;

    // Constrain rendering size dynamically to avoid potential browser context crashes
    const MAX_DIM = 2048;
    const renderCols = Math.min(cols, MAX_DIM);
    const renderRows = Math.min(rows, MAX_DIM);

    const activeRule2 = overrides?.caRule2 !== undefined ? overrides.caRule2 : (caRule2 ?? 90);
    const activeBlendMode = overrides?.caBlendMode !== undefined ? overrides.caBlendMode : caBlendMode;
    const activeSeedType = overrides?.caSeedType !== undefined ? overrides.caSeedType : caSeedType;
    const activeSymmetry = overrides?.caSymmetry !== undefined ? overrides.caSymmetry : caSymmetry;
    const activeDensity = overrides?.caDensity !== undefined ? overrides.caDensity : caDensity;

    const mulberry32 = (a: number) => {
      return () => {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    const rule1Bits = rule.toString(2).padStart(8, '0').split('').reverse().map(Number);
    const rule2Bits = activeRule2.toString(2).padStart(8, '0').split('').reverse().map(Number);
    
    let row = new Array(renderCols).fill(0);
    
    if (activeSeedType === 'single') {
      row[Math.floor(renderCols / 2)] = 1;
    } else if (activeSeedType === 'triple') {
      row[Math.floor(renderCols / 4)] = 1;
      row[Math.floor(renderCols / 2)] = 1;
      row[Math.floor(renderCols * 3 / 4)] = 1;
    } else if (activeSeedType === 'periodic') {
      for (let i = 0; i < renderCols; i++) {
        if (i % 8 === 0) row[i] = 1;
      }
    } else if (activeSeedType === 'random') {
      const rng = mulberry32(seed || 42);
      for (let i = 0; i < renderCols; i++) {
        if (rng() < activeDensity) row[i] = 1;
      }
    } else {
      row[Math.floor(renderCols / 2)] = 1;
    }

    // Allocate / retrieve offscreen cache
    if (!offscreenCARenderCanvasRef.current) {
      offscreenCARenderCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCARenderCanvasRef.current;
    offCanvas.width = renderCols;
    offCanvas.height = renderRows;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    // Reset buffer image
    offCtx.clearRect(0, 0, renderCols, renderRows);
    const imgData = offCtx.createImageData(renderCols, renderRows);
    const data = imgData.data;

    // Parse the palette color strings to cached RGBA values to bypass continuous context matching
    const parsedPalette = paletteColors.map(color => {
      if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16) || 0;
          const g = parseInt(hex[1] + hex[1], 16) || 0;
          const b = parseInt(hex[2] + hex[2], 16) || 0;
          return [r, g, b, 255];
        } else {
          const r = parseInt(hex.substring(0, 2), 16) || 0;
          const g = parseInt(hex.substring(2, 4), 16) || 0;
          const b = parseInt(hex.substring(4, 6), 16) || 0;
          return [r, g, b, 255];
        }
      } else if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
          const r = parseInt(matches[0]) || 0;
          const g = parseInt(matches[1]) || 0;
          const b = parseInt(matches[2]) || 0;
          const a = matches[3] ? Math.round(parseFloat(matches[3]) * 255) : 255;
          return [r, g, b, a];
        }
      }
      return [255, 255, 255, 255];
    });

    for (let r = 0; r < renderRows; r++) {
      const next = new Array(renderCols).fill(0);
      for (let c = 0; c < renderCols; c++) {
        const l = row[(c - 1 + renderCols) % renderCols];
        const m = row[c];
        const ri = row[(c + 1) % renderCols];
        const idx = (l << 2) | (m << 1) | ri;
        
        const out1 = rule1Bits[idx] || 0;
        const out2 = rule2Bits[idx] || 0;
        
        let out = out1;
        if (activeBlendMode === 'xor') {
          out = out1 ^ out2;
        } else if (activeBlendMode === 'and') {
          out = out1 & out2;
        } else if (activeBlendMode === 'or') {
          out = out1 | out2;
        } else if (activeBlendMode === 'stripe_alt') {
          out = (r % 2 === 0) ? out1 : out2;
        } else if (activeBlendMode === 'stripe_cols') {
          out = (c % 2 === 0) ? out1 : out2;
        } else if (activeBlendMode === 'screen_split') {
          out = (c < renderCols / 2) ? out1 : out2;
        }
        
        next[c] = out;
 
        let active = row[c];
        if (activeSymmetry === 'mirror_left') {
          if (c >= renderCols / 2) {
            active = row[renderCols - 1 - c];
          }
        } else if (activeSymmetry === 'mirror_right') {
          if (c < renderCols / 2) {
            active = row[renderCols - 1 - c];
          }
        } else if (activeSymmetry === 'mirror_center') {
          active = row[c] | row[renderCols - 1 - c];
        }
 
        if (active) {
          const colIdx = Math.floor(((c / renderCols) * 0.75 + (r / renderRows) * 0.25) * parsedPalette.length);
          const [pr, pg, pb, pa] = parsedPalette[colIdx % parsedPalette.length];
          const pixelIdx = (r * renderCols + c) * 4;
          data[pixelIdx] = pr;
          data[pixelIdx + 1] = pg;
          data[pixelIdx + 2] = pb;
          data[pixelIdx + 3] = pa;
        }
      }
      row = next;
    }

    offCtx.putImageData(imgData, 0, 0);

    // Dynamic scale output onto physical canvas viewport
    ctx.save();
    ctx.globalAlpha = opac;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offCanvas, 0, 0, cols * cellSz, rows * cellSz);
    ctx.restore();
  }, [caRule2, caBlendMode, caSeedType, caSymmetry, seed, caDensity]);

  const draw2DGridCells = useCallback((
    ctx: CanvasRenderingContext2D,
    grid: number[][],
    cellSz: number,
    paletteColors: string[],
    opac: number,
    automType: CAType
  ) => {
    const rows = grid.length;
    if (rows === 0) return;
    const cols = grid[0].length;
    
    if (!offscreenCARenderCanvasRef.current) {
      offscreenCARenderCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCARenderCanvasRef.current;
    offCanvas.width = cols;
    offCanvas.height = rows;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    // Reset buffer image
    offCtx.clearRect(0, 0, cols, rows);
    const imgData = offCtx.createImageData(cols, rows);
    const data = imgData.data;

    const parsedPalette = paletteColors.map(color => {
      if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16) || 0;
          const g = parseInt(hex[1] + hex[1], 16) || 0;
          const b = parseInt(hex[2] + hex[2], 16) || 0;
          return [r, g, b, 255];
        } else {
          const r = parseInt(hex.substring(0, 2), 16) || 0;
          const g = parseInt(hex.substring(2, 4), 16) || 0;
          const b = parseInt(hex.substring(4, 6), 16) || 0;
          return [r, g, b, 255];
        }
      } else if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
          const r = parseInt(matches[0]) || 0;
          const g = parseInt(matches[1]) || 0;
          const b = parseInt(matches[2]) || 0;
          const a = matches[3] ? Math.round(parseFloat(matches[3]) * 255) : 255;
          return [r, g, b, a];
        }
      }
      return [255, 255, 255, 255];
    });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c];
        if (v === 0) continue;

        let [pr, pg, pb, pa] = [255, 255, 255, 255];
        if (automType === 'brian') {
          const colorObj = v === 1 ? parsedPalette[0] : parsedPalette[Math.min(2, parsedPalette.length - 1)];
          if (colorObj) [pr, pg, pb, pa] = colorObj;
        } else if (automType === 'cyclic') {
          const colorObj = parsedPalette[v % parsedPalette.length];
          if (colorObj) [pr, pg, pb, pa] = colorObj;
        } else {
          const colorObj = parsedPalette[0];
          if (colorObj) [pr, pg, pb, pa] = colorObj;
        }

        const pixelIdx = (r * cols + c) * 4;
        data[pixelIdx] = pr;
        data[pixelIdx + 1] = pg;
        data[pixelIdx + 2] = pb;
        data[pixelIdx + 3] = pa;
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalAlpha = opac;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offCanvas, 0, 0, cols * cellSz, rows * cellSz);
    ctx.restore();
  }, []);

  const renderSegsOfPen = useCallback((
    ctx: CanvasRenderingContext2D,
    segs: TurtleSegment[],
    frontW: number,
    backW: number,
    connW: number,
    paletteColors: string[],
    ex: number,
    ey: number,
    opac: number,
    prebuiltPaths?: ContiguousPath[]
  ) => {
    ctx.globalAlpha = opac;
    if (drawStyle === 'extrude') {
      drawExtruded(ctx, segs, ex, ey, frontW, backW, connW, paletteColors);
      ctx.globalAlpha = 1.0;
      return;
    }

    if (drawStyle === 'silhouette') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Build a set of all start coordinates to find terminal branch ends
      const startPoints = new Set<string>();
      for (const seg of segs) {
        startPoints.add(`${seg.x1.toFixed(1)},${seg.y1.toFixed(1)}`);
      }

      for (const seg of segs) {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const dlen = Math.sqrt(dx * dx + dy * dy);
        if (dlen < 0.01) continue;

        const nx = -dy / dlen;
        const ny = dx / dlen;

        ctx.fillStyle = paletteColors[seg.depth % paletteColors.length];
        ctx.strokeStyle = paletteColors[seg.depth % paletteColors.length];

        // Base illustrative width proportional to brush frontW and decay based on tree depth
        const baseWidth = frontW * 1.5;
        const w1 = Math.max(0.001, baseWidth * Math.pow(0.85, seg.depth));
        const w2 = Math.max(0.001, baseWidth * Math.pow(0.85, seg.depth + 1));

        // Draw tapered woody trunk / branch polygon
        ctx.beginPath();
        ctx.moveTo(seg.x1 + nx * w1, seg.y1 + ny * w1);
        ctx.lineTo(seg.x2 + nx * w2, seg.y2 + ny * w2);
        ctx.lineTo(seg.x2 - nx * w2, seg.y2 - ny * w2);
        ctx.lineTo(seg.x1 - nx * w1, seg.y1 - ny * w1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke(); // Draw tiny stroke to smooth overlapping polygonal seams

        // Check if this segment represents a bud, sprout or is an outer terminal end tip
        const endKey = `${seg.x2.toFixed(1)},${seg.y2.toFixed(1)}`;
        const isTerminalTip = !startPoints.has(endKey);

        if (seg.isBud || seg.isSprout || isTerminalTip) {
          ctx.save();
          ctx.translate(seg.x2, seg.y2);

          const angle = Math.atan2(dy, dx);
          ctx.rotate(angle);

          // Scale leaves appropriately with the local stem thickness so they aren't massive on paper-thin twigs
          const scaleFactor = Math.min(1.2, Math.max(0.01, frontW / 1.5));
          const leafLen = Math.max(0.05, seg.len * 1.4 * scaleFactor);
          const leafWidth = Math.max(0.02, w1 * 2.8 * scaleFactor);

          // Draw exquisite dual-sided organic leaf silhouette shape
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(leafLen * 0.4, leafWidth, leafLen, 0);
          ctx.quadraticCurveTo(leafLen * 0.4, -leafWidth, 0, 0);
          ctx.closePath();

          // Set fill color to next color step in active color array for beautiful accentuation
          const leafColIndex = (seg.depth + 1) % paletteColors.length;
          ctx.fillStyle = paletteColors[leafColIndex];
          ctx.fill();

          // Add a tiny inner glowing core for the bud blossom details
          ctx.beginPath();
          ctx.arc(leafLen * 0.35, 0, leafWidth * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = paletteColors[(seg.depth + 2) % paletteColors.length];
          ctx.fill();

          ctx.restore();
        }
      }
      ctx.globalAlpha = 1.0;
      return;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Setup shadow styling for glow/neon styles
    if (drawStyle === 'glow' || drawStyle === 'neon') {
      ctx.shadowBlur = drawStyle === 'neon' ? 18 : 8;
      ctx.shadowColor = paletteColors[0];
    } else {
      ctx.shadowBlur = 0;
    }

    // 2. Handle Dots draw style at high speed
    if (drawStyle === 'dots') {
      const rad = Math.max(0.005, frontW * 0.5);
      const colorGroups = new Map<number, { x: number; y: number }[]>();
      for (const seg of segs) {
        const colIdx = seg.depth % paletteColors.length;
        if (!colorGroups.has(colIdx)) {
          colorGroups.set(colIdx, []);
        }
        colorGroups.get(colIdx)!.push({ x: seg.x1, y: seg.y1 });
        colorGroups.get(colIdx)!.push({ x: seg.x2, y: seg.y2 });
      }

      colorGroups.forEach((points, colIdx) => {
        ctx.fillStyle = paletteColors[colIdx];
        for (const pt of points) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      return;
    }

    // 3. Obtain contiguous branch paths
    let paths: ContiguousPath[];
    if (prebuiltPaths) {
      paths = prebuiltPaths;
    } else {
      paths = [];
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
    }

    // 4. Handle gradient draw style (requires individual path gradients)
    if (drawStyle === 'gradient') {
      for (const p of paths) {
        const points = p.points;
        if (points.length < 2) continue;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        if (smoothCurves) {
          if (points.length === 2) {
            ctx.lineTo(points[1].x, points[1].y);
          } else {
            for (let i = 1; i < points.length - 1; i++) {
              const xc = (points[i].x + points[i + 1].x) / 2;
              const yc = (points[i].y + points[i + 1].y) / 2;
              ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
          }
        } else {
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
        }

        const grad = ctx.createLinearGradient(points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
        grad.addColorStop(0, paletteColors[0]);
        grad.addColorStop(1, paletteColors[p.depth % paletteColors.length]);
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(0.001, frontW * Math.pow(0.85, p.depth));
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      return;
    }

    // 5. Handle standard drawing profiles ('lines', 'glow', 'neon') using GPU contiguous batching
    const pathsByDepth = new Map<number, typeof paths>();
    for (const p of paths) {
      if (!pathsByDepth.has(p.depth)) {
        pathsByDepth.set(p.depth, []);
      }
      pathsByDepth.get(p.depth)!.push(p);
    }

    pathsByDepth.forEach((depthPaths, dep) => {
      ctx.strokeStyle = paletteColors[dep % paletteColors.length];
      ctx.lineWidth = Math.max(0.001, frontW * Math.pow(0.85, dep));
      ctx.beginPath();

      for (const p of depthPaths) {
        const points = p.points;
        if (points.length < 2) continue;

        ctx.moveTo(points[0].x, points[0].y);

        if (smoothCurves) {
          if (points.length === 2) {
            ctx.lineTo(points[1].x, points[1].y);
          } else {
            for (let i = 1; i < points.length - 1; i++) {
              const xc = (points[i].x + points[i + 1].x) / 2;
              const yc = (points[i].y + points[i + 1].y) / 2;
              ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
          }
        } else {
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
        }
      }
      ctx.stroke();
    });

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  }, [drawStyle, drawExtruded, smoothCurves]);

  // Main draw coordinator
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const paletteColors = activePalette === 'custom' && customPalette
      ? customPalette
      : (PALETTES[activePalette] || PALETTES.white);

    const lsPaletteColors = separateColors
      ? (lsActivePalette === 'custom' && lsCustomPalette ? lsCustomPalette : (PALETTES[lsActivePalette] || PALETTES.white))
      : paletteColors;

    const caPaletteColors = separateColors
      ? (caActivePalette === 'custom' && caCustomPalette ? caCustomPalette : (PALETTES[caActivePalette] || PALETTES.white))
      : paletteColors;

    // Clear/Fill background with Solid/Linear/Radial support
    if (bgType === 'solid') {
      ctx.fillStyle = activeBg;
      ctx.fillRect(0, 0, canvasSize.width * dpr, canvasSize.height * dpr);
    } else {
      let grad: CanvasGradient;
      const w = canvasSize.width * dpr;
      const h = canvasSize.height * dpr;
      if (bgType === 'linear') {
        const angleRad = (bgGradientAngle * Math.PI) / 180;
        const x1 = w / 2 - Math.cos(angleRad) * w / 2;
        const y1 = h / 2 - Math.sin(angleRad) * h / 2;
        const x2 = w / 2 + Math.cos(angleRad) * w / 2;
        const y2 = h / 2 + Math.sin(angleRad) * h / 2;
        grad = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.max(cx, cy);
        grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      }
      const stop1Safe = Math.min(Math.max(bgGradientStop1 / 100, 0), 1);
      const stop2Safe = Math.min(Math.max(bgGradientStop2 / 100, 0), 1);
      grad.addColorStop(stop1Safe, bgGradientColor1);
      grad.addColorStop(stop2Safe, bgGradientColor2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    const exRad = (extrudeAngle * Math.PI) / 180;
    const ex = Math.cos(exRad) * extrudeDepth;
    const ey = Math.sin(exRad) * extrudeDepth;
    const rotRad = (rotation * Math.PI) / 180;

    if (mode === 'kaleidoscope') {
      const cx = canvasSize.width / 2;
      const cy = canvasSize.height / 2;
      const alpha = (2 * Math.PI) / kaleidoscopeSegments;

      let baseOffset = 0;
      if (kaleidoscopeMirrorAxis === 'horizontal') {
        baseOffset = Math.PI / 2;
      }

      for (let i = 0; i < kaleidoscopeSegments; i++) {
        // For mirror mode, draw both normal and reflected halves of the sector
        const passes = kaleidoscopeMode === 'mirror'
          ? (kaleidoscopeDoubleMirror ? [false, true] : [i % 2 === 1])
          : [false];
        
        for (const isMirrored of passes) {
          ctx.save();
          // Handle Retina displays crisp resolution
          ctx.scale(dpr, dpr);

          // Center on screen center, apply kaleidoscope symmetry rotation/reflection
          ctx.translate(cx, cy);

          if (kaleidoscopeSegments === 2) {
            // Apply viewport pitch rotation
            ctx.rotate(rotRad);

            // In mirror mode, the mirrored pass is drawn relative to the original sector
            // In spin mode, the second sector is purely rotated by 180 degrees
            if (kaleidoscopeMode === 'spin') {
              if (i === 1) {
                ctx.rotate(Math.PI);
              }
            } else {
              // Mirror mode
              if (i === 1 && !isMirrored) {
                ctx.rotate(Math.PI);
              }
            }

            // Apply mirror/reflection scaling
            if (isMirrored) {
              if (kaleidoscopeMirrorAxis === 'horizontal') {
                ctx.scale(-1, 1); // Horizontal reflection across vertical divider
              } else {
                ctx.scale(1, -1); // Vertical reflection across horizontal divider
              }
            }
          } else {
            // Apply viewport pitch rotation and alignment offset to the entire kaleidoscope
            ctx.rotate(baseOffset + rotRad);
            
            ctx.rotate(i * alpha);
            if (isMirrored) {
              ctx.scale(1, -1);
            }
          }
          ctx.translate(-cx, -cy);

          // Apply zoom and panning translations inside of each mirrored wedge
          ctx.translate(vpPanX, vpPanY);
          ctx.scale(vpZoom, vpZoom);

        // ROTATE AND/OR FLIP ACTIVE ELEMENT AROUND PIVOT
        if (kaleidoscopeElementRotation !== 0 || flipHorizontal) {
          const bounds = getElementBounds();
          if (bounds) {
            let px = (bounds.minX + bounds.maxX) / 2;
            let py = (bounds.minY + bounds.maxY) / 2;

            if (kaleidoscopeElementAnchor === 'left') {
              px = bounds.minX;
            } else if (kaleidoscopeElementAnchor === 'right') {
              px = bounds.maxX;
            } else if (kaleidoscopeElementAnchor === 'top') {
              py = bounds.minY;
            } else if (kaleidoscopeElementAnchor === 'bottom') {
              py = bounds.maxY;
            } else if (kaleidoscopeElementAnchor === 'origin') {
              px = 0;
              py = 0;
            }

            ctx.translate(px, py);
            if (kaleidoscopeElementRotation !== 0) {
              const elemRotRad = (kaleidoscopeElementRotation * Math.PI) / 180;
              ctx.rotate(elemRotRad);
            }
            if (flipHorizontal) {
              ctx.scale(-1, 1);
            }
            ctx.translate(-px, -py);
          }
        }

        // DRAW ACTIVE SOURCE CONTENT
        if (kaleidoscopeSource === 'lsystem' || kaleidoscopeSource === 'combined') {
          let finalSegs = cachedSegments;
          let finalPaths = cachedPaths;
          if (finalSegs.length > 0) {
            renderSegsOfPen(
              ctx,
              finalSegs,
              lineWidth,
              extrudeLw,
              extrudeConn,
              paletteColors,
              ex,
              ey,
              opacity,
              finalPaths
            );
          }
        }

        if ((kaleidoscopeSource === 'ca' || kaleidoscopeSource === 'combined') && caState) {
          if (caDrawMode === 'shapes') {
            if (caShapes && caShapes.length > 0) {
              for (const shape of caShapes) {
                ctx.save();
                ctx.beginPath();
                if (shape.type === 'freehand') {
                  const poly = shape.points;
                  if (poly.length > 0) {
                    ctx.moveTo(poly[0].x, poly[0].y);
                    for (let i = 1; i < poly.length; i++) {
                      ctx.lineTo(poly[i].x, poly[i].y);
                    }
                  }
                } else if (shape.type === 'rectangle') {
                  if (shape.points.length >= 2) {
                    const p1 = shape.points[0];
                    const p2 = shape.points[1];
                    const minX = Math.min(p1.x, p2.x);
                    const maxX = Math.max(p1.x, p2.x);
                    const minY = Math.min(p1.y, p2.y);
                    const maxY = Math.max(p1.y, p2.y);
                    ctx.rect(minX, minY, maxX - minX, maxY - minY);
                  }
                } else if (shape.type === 'circle') {
                  if (shape.points.length >= 2) {
                    const center = shape.points[0];
                    const rim = shape.points[1];
                    const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
                    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
                  }
                } else if (shape.type === 'triangle') {
                  const poly = shape.points;
                  if (poly.length >= 3) {
                    ctx.moveTo(poly[0].x, poly[0].y);
                    ctx.lineTo(poly[1].x, poly[1].y);
                    ctx.lineTo(poly[2].x, poly[2].y);
                  }
                }
                ctx.closePath();
                ctx.clip();

                // Compute bounding box
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (const pt of shape.points) {
                  if (pt.x < minX) minX = pt.x;
                  if (pt.x > maxX) maxX = pt.x;
                  if (pt.y < minY) minY = pt.y;
                  if (pt.y > maxY) maxY = pt.y;
                }
                if (minX !== Infinity) {
                  ctx.translate(minX, minY);
                  const w = maxX - minX;
                  const h = maxY - minY;
                  const shapeCellSize = shape.cellSize || cellSize;
                  const cols = Math.max(1, Math.floor(w / shapeCellSize));
                  const rows = Math.max(1, Math.floor(h / shapeCellSize));
                  
                  draw1DRuleAutomata(
                    ctx,
                    shape.caRule,
                    cols,
                    rows,
                    shapeCellSize,
                    shape.caPaletteColors,
                    opacity,
                    {
                      caRule2: shape.caRule2,
                      caBlendMode: shape.caBlendMode,
                      caSeedType: shape.caSeedType,
                      caSymmetry: shape.caSymmetry,
                      caDensity: caDensity
                    }
                  );
                }
                ctx.restore();

                // Draw subtle selection outline for selected shape
                if (shape.id === selectedCAShapeId) {
                  ctx.save();
                  ctx.beginPath();
                  if (shape.type === 'freehand') {
                    const poly = shape.points;
                    if (poly.length > 0) {
                      ctx.moveTo(poly[0].x, poly[0].y);
                      for (let i = 1; i < poly.length; i++) {
                        ctx.lineTo(poly[i].x, poly[i].y);
                      }
                    }
                  } else if (shape.type === 'rectangle') {
                    if (shape.points.length >= 2) {
                      const p1 = shape.points[0];
                      const p2 = shape.points[1];
                      const minX = Math.min(p1.x, p2.x);
                      const maxX = Math.max(p1.x, p2.x);
                      const minY = Math.min(p1.y, p2.y);
                      const maxY = Math.max(p1.y, p2.y);
                      ctx.rect(minX, minY, maxX - minX, maxY - minY);
                    }
                  } else if (shape.type === 'circle') {
                    if (shape.points.length >= 2) {
                      const center = shape.points[0];
                      const rim = shape.points[1];
                      const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
                      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
                    }
                  } else if (shape.type === 'triangle') {
                    const poly = shape.points;
                    if (poly.length >= 3) {
                      ctx.moveTo(poly[0].x, poly[0].y);
                      ctx.lineTo(poly[1].x, poly[1].y);
                      ctx.lineTo(poly[2].x, poly[2].y);
                    }
                  }
                  ctx.closePath();
                  ctx.strokeStyle = '#22c55e'; // Green selection boundary
                  ctx.lineWidth = 1.5;
                  ctx.setLineDash([4, 4]); // Dashed line
                  ctx.stroke();
                  ctx.restore();
                }
              }
            }

            // Draw active CA Shape Draft outline inside Kaleidoscope mirrors in real-time
            if (isDrawingCAShape && caShapeDraftPoints.length > 0) {
              ctx.save();
              ctx.beginPath();
              if (caActiveTool === 'freehand') {
                ctx.moveTo(caShapeDraftPoints[0].x, caShapeDraftPoints[0].y);
                for (let i = 1; i < caShapeDraftPoints.length; i++) {
                  ctx.lineTo(caShapeDraftPoints[i].x, caShapeDraftPoints[i].y);
                }
              } else if (caActiveTool === 'rectangle') {
                if (caShapeDraftPoints.length >= 2) {
                  const p1 = caShapeDraftPoints[0];
                  const p2 = caShapeDraftPoints[1];
                  const minX = Math.min(p1.x, p2.x);
                  const maxX = Math.max(p1.x, p2.x);
                  const minY = Math.min(p1.y, p2.y);
                  const maxY = Math.max(p1.y, p2.y);
                  ctx.rect(minX, minY, maxX - minX, maxY - minY);
                }
              } else if (caActiveTool === 'circle') {
                if (caShapeDraftPoints.length >= 2) {
                  const center = caShapeDraftPoints[0];
                  const rim = caShapeDraftPoints[1];
                  const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
                  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
                }
              } else if (caActiveTool === 'triangle') {
                if (caShapeDraftPoints.length >= 3) {
                  ctx.moveTo(caShapeDraftPoints[0].x, caShapeDraftPoints[0].y);
                  ctx.lineTo(caShapeDraftPoints[1].x, caShapeDraftPoints[1].y);
                  ctx.lineTo(caShapeDraftPoints[2].x, caShapeDraftPoints[2].y);
                }
              }
              ctx.closePath();
              ctx.strokeStyle = '#22c55e'; // Green feedback line
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'; // Ambient fill
              ctx.fill();
              ctx.restore();
            }
          } else {
            if (caType === 'rule') {
              const cols = Math.floor(canvasSize.width / cellSize);
              const rows = Math.floor(canvasSize.height / cellSize);
              draw1DRuleAutomata(ctx, caRule, cols, rows, cellSize, caPaletteColors, opacity);
            } else {
              draw2DGridCells(ctx, caState, cellSize, caPaletteColors, opacity, caType);
            }
          }
        }

        if (kaleidoscopeSource === 'draw' || kaleidoscopeSource === 'pen') {
          if (penSegments.length > 0) {
            renderSegsOfPen(
              ctx,
              penSegments,
              lineWidth,
              extrudeLw,
              extrudeConn,
              paletteColors,
              ex,
              ey,
              opacity
            );
          }

          if (penCurrent && penCurrent.length > 0) {
            const tempSegs: TurtleSegment[] = [];
            for (let k = 0; k < penCurrent.length - 1; k++) {
              tempSegs.push({
                x1: penCurrent[k].x,
                y1: penCurrent[k].y,
                x2: penCurrent[k+1].x,
                y2: penCurrent[k+1].y,
                depth: 0,
                len: Math.hypot(penCurrent[k+1].x - penCurrent[k].x, penCurrent[k+1].y - penCurrent[k].y)
              });
            }
            if (tempSegs.length > 0) {
              renderSegsOfPen(
                ctx,
                tempSegs,
                lineWidth,
                extrudeLw,
                extrudeConn,
                paletteColors,
                ex,
                ey,
                opacity
              );
            }
          }
        }

        ctx.restore();
        }
      }

      // Draw subtle guideline overlays over the kaleidoscope
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(cx, cy);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 8]);
      const r = Math.max(canvasSize.width, canvasSize.height) * 2;
      
      for (let i = 0; i < kaleidoscopeSegments; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const theta = baseOffset + rotRad + i * alpha;
        ctx.lineTo(r * Math.cos(theta), r * Math.sin(theta));
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
      ctx.restore();

      // If we are in Kaleidoscope mode and the active source is the Symmetric Pen,
      // draw the master interactive overlays (active pen vertices, suggestions, rubberband line, snapped indicator)
      // purely in un-mirrored screen space so it perfectly tracks user interactions and cursor snapping!
      if (kaleidoscopeSource === 'pen') {
        const exRad = (extrudeAngle * Math.PI) / 180;
        const ex = Math.cos(exRad) * extrudeDepth;
        const ey = Math.sin(exRad) * extrudeDepth;

        ctx.save();
        ctx.scale(dpr, dpr);

        // Apply viewport rotation and baseOffset alignment centered on the canvas
        const cxTarget = canvasSize.width / 2;
        const cyTarget = canvasSize.height / 2;
        ctx.translate(cxTarget, cyTarget);
        let baseOffset = 0;
        if (kaleidoscopeMirrorAxis === 'horizontal' && kaleidoscopeSegments !== 2) {
          baseOffset = Math.PI / 2;
        }
        ctx.rotate(baseOffset + rotRad);
        ctx.translate(-cxTarget, -cyTarget);

        // Apply zooming + pan translations
        ctx.translate(vpPanX, vpPanY);
        ctx.scale(vpZoom, vpZoom);

        // ROTATE ACTIVE ELEMENT OVERLAYS ACCORDING TO THE ROTATION PARAMETER FOR THE MASTER COMPONENT
        if (kaleidoscopeElementRotation !== 0) {
          const bounds = getElementBounds();
          if (bounds) {
            let px = (bounds.minX + bounds.maxX) / 2;
            let py = (bounds.minY + bounds.maxY) / 2;

            if (kaleidoscopeElementAnchor === 'left') {
              px = bounds.minX;
            } else if (kaleidoscopeElementAnchor === 'right') {
              px = bounds.maxX;
            } else if (kaleidoscopeElementAnchor === 'top') {
              py = bounds.minY;
            } else if (kaleidoscopeElementAnchor === 'bottom') {
              py = bounds.maxY;
            } else if (kaleidoscopeElementAnchor === 'origin') {
              px = 0;
              py = 0;
            }

            const elemRotRad = (kaleidoscopeElementRotation * Math.PI) / 180;
            ctx.translate(px, py);
            ctx.rotate(elemRotRad);
            ctx.translate(-px, -py);
          }
        }

        // 1. Draw shift candidates preview fanned branches
        if (shiftHeld && penSuggestions.length > 0) {
          penSuggestions.forEach((sugg, i) => {
            const isHot = i === hoveredSuggIdx;
            renderSegsOfPen(
              ctx,
              sugg.segs,
              isHot ? lineWidth * 1.15 : lineWidth * 0.55,
              extrudeLw,
              extrudeConn,
              paletteColors,
              ex,
              ey,
              isHot ? 0.75 : 0.2
            );

            // Render alternative target dot
            ctx.beginPath();
            ctx.arc(sugg.snapPt.x, sugg.snapPt.y, (isHot ? 6.5 : 4) / vpZoom, 0, Math.PI * 2);
            ctx.fillStyle = isHot ? '#ffffff' : paletteColors[0];
            ctx.globalAlpha = isHot ? 0.95 : 0.35;
            ctx.fill();

            // Text text overlay
            if (isHot) {
              ctx.globalAlpha = 0.85;
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.max(8, 12 / vpZoom)}px SF Mono, monospace`;
              ctx.fillText(sugg.label, sugg.snapPt.x + 10 / vpZoom, sugg.snapPt.y - 8 / vpZoom);
            }
          });

          // Direction guidelines connecting anchors
          if (penCurrent && penCurrent.length > 0) {
            const last = penCurrent[penCurrent.length - 1];
            const snap = penSuggestions[hoveredSuggIdx].snapPt;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(snap.x, snap.y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.25 / vpZoom;
            ctx.setLineDash([4 / vpZoom, 4 / vpZoom]);
            ctx.globalAlpha = 0.45;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // 2. Live rubberband guidelines when not executing branches
        if (!shiftHeld && penCurrent && penCurrent.length > 0 && penPreview) {
          const last = penCurrent[penCurrent.length - 1];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(penPreview.x, penPreview.y);
          ctx.strokeStyle = paletteColors[0];
          ctx.lineWidth = Math.max(0.001, lineWidth * 0.5);
          ctx.setLineDash([5 / vpZoom, 5 / vpZoom]);
          ctx.globalAlpha = 0.35;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 3. Render active pen tip handle
        if (penCurrent && penCurrent.length > 0) {
          const pt = penCurrent[penCurrent.length - 1];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5.5 / vpZoom, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 1.0;
          ctx.fill();
        }

        // 4. Render snapped point visual indicator
        if (snappedPoint) {
          ctx.beginPath();
          ctx.arc(snappedPoint.x, snappedPoint.y, 10 / vpZoom, 0, Math.PI * 2);
          ctx.strokeStyle = '#22c55e'; // emerald green
          ctx.lineWidth = 1.8 / vpZoom;
          ctx.globalAlpha = 0.9;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(snappedPoint.x, snappedPoint.y, 4 / vpZoom, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.globalAlpha = 1.0;
          ctx.fill();
        }

        ctx.restore();
      }
    } else {
      ctx.save();
      // Handle Retina displays crisp resolution
      ctx.scale(dpr, dpr);

      // Apply viewport rotation centered on the canvas
      const cx = canvasSize.width / 2;
      const cy = canvasSize.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rotRad);
      ctx.translate(-cx, -cy);

      // Apply zooming + pan translations
      ctx.translate(vpPanX, vpPanY);
      ctx.scale(vpZoom, vpZoom);

      // ROTATE AND/OR FLIP ACTIVE ELEMENT AROUND PIVOT
      if (kaleidoscopeElementRotation !== 0 || flipHorizontal) {
        const bounds = getElementBounds();
        if (bounds) {
          let px = (bounds.minX + bounds.maxX) / 2;
          let py = (bounds.minY + bounds.maxY) / 2;

          if (kaleidoscopeElementAnchor === 'left') {
            px = bounds.minX;
          } else if (kaleidoscopeElementAnchor === 'right') {
            px = bounds.maxX;
          } else if (kaleidoscopeElementAnchor === 'top') {
            py = bounds.minY;
          } else if (kaleidoscopeElementAnchor === 'bottom') {
            py = bounds.maxY;
          } else if (kaleidoscopeElementAnchor === 'origin') {
            px = 0;
            py = 0;
          }

          ctx.translate(px, py);
          if (kaleidoscopeElementRotation !== 0) {
            const elemRotRad = (kaleidoscopeElementRotation * Math.PI) / 180;
            ctx.rotate(elemRotRad);
          }
          if (flipHorizontal) {
            ctx.scale(-1, 1);
          }
          ctx.translate(-px, -py);
        }
      }

      // A. COMBINED OR PEN DRAWING PHASES
      if (mode === 'pen') {
        const exRad = (extrudeAngle * Math.PI) / 180;
        const ex = Math.cos(exRad) * extrudeDepth;
        const ey = Math.sin(exRad) * extrudeDepth;

        // Draw all accumulated sketch segments
        if (penSegments.length > 0) {
          renderSegsOfPen(ctx, penSegments, lineWidth, extrudeLw, extrudeConn, paletteColors, ex, ey, opacity);
        }

        // Draw shift candidates preview fanned branches
        if (shiftHeld && penSuggestions.length > 0) {
          penSuggestions.forEach((sugg, i) => {
            const isHot = i === hoveredSuggIdx;
            renderSegsOfPen(
              ctx,
              sugg.segs,
              isHot ? lineWidth * 1.15 : lineWidth * 0.55,
              extrudeLw,
              extrudeConn,
              paletteColors,
              ex,
              ey,
              isHot ? 0.75 : 0.2
            );

            // Render alternative target dot
            ctx.beginPath();
            ctx.arc(sugg.snapPt.x, sugg.snapPt.y, (isHot ? 6.5 : 4) / vpZoom, 0, Math.PI * 2);
            ctx.fillStyle = isHot ? '#ffffff' : paletteColors[0];
            ctx.globalAlpha = isHot ? 0.95 : 0.35;
            ctx.fill();

            // Text metrics overlay
            if (isHot) {
              ctx.globalAlpha = 0.85;
              ctx.fillStyle = '#ffffff';
              ctx.font = `${Math.max(8, 12 / vpZoom)}px SF Mono, monospace`;
              ctx.fillText(sugg.label, sugg.snapPt.x + 10 / vpZoom, sugg.snapPt.y - 8 / vpZoom);
            }
          });

          // Direction guidelines connecting anchors
          if (penCurrent && penCurrent.length > 0) {
            const last = penCurrent[penCurrent.length - 1];
            const snap = penSuggestions[hoveredSuggIdx].snapPt;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(snap.x, snap.y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.25 / vpZoom;
            ctx.setLineDash([4 / vpZoom, 4 / vpZoom]);
            ctx.globalAlpha = 0.45;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Live rubberband guidelines when not executing branches
        if (!shiftHeld && penCurrent && penCurrent.length > 0 && penPreview) {
          const last = penCurrent[penCurrent.length - 1];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(penPreview.x, penPreview.y);
          ctx.strokeStyle = paletteColors[0];
          ctx.lineWidth = Math.max(0.001, lineWidth * 0.5);
          ctx.setLineDash([5 / vpZoom, 5 / vpZoom]);
          ctx.globalAlpha = 0.35;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Render active pen tip handle
        if (penCurrent && penCurrent.length > 0) {
          const pt = penCurrent[penCurrent.length - 1];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5.5 / vpZoom, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 1.0;
          ctx.fill();
        }

        // Render snapped point visual indicator
        if (snappedPoint) {
          ctx.beginPath();
          ctx.arc(snappedPoint.x, snappedPoint.y, 10 / vpZoom, 0, Math.PI * 2);
          ctx.strokeStyle = '#22c55e'; // emerald green
          ctx.lineWidth = 1.8 / vpZoom;
          ctx.globalAlpha = 0.9;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(snappedPoint.x, snappedPoint.y, 4 / vpZoom, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.globalAlpha = 1.0;
          ctx.fill();
        }
      } 
      // B. PURE SYSTEM RENDER (L-SYSTEM, CA, OR COMBINED)
      else {
        // 1. Draw Cellular Automata Grid if active
        if ((mode === 'ca' || mode === 'combined') && caState) {
          ctx.save();
          if (mode === 'combined') {
            ctx.translate(caManOffset.x, caManOffset.y);
            ctx.scale(caScale, caScale);
          }

          if (caDrawMode === 'shapes') {
            // Under 'shapes' target, we draw each committed shape in caShapes
            if (caShapes && caShapes.length > 0) {
              for (const shape of caShapes) {
                ctx.save();
                ctx.beginPath();
                if (shape.type === 'freehand') {
                  const poly = shape.points;
                  if (poly.length > 0) {
                    ctx.moveTo(poly[0].x, poly[0].y);
                    for (let i = 1; i < poly.length; i++) {
                      ctx.lineTo(poly[i].x, poly[i].y);
                    }
                  }
                } else if (shape.type === 'rectangle') {
                  if (shape.points.length >= 2) {
                    const p1 = shape.points[0];
                    const p2 = shape.points[1];
                    const minX = Math.min(p1.x, p2.x);
                    const maxX = Math.max(p1.x, p2.x);
                    const minY = Math.min(p1.y, p2.y);
                    const maxY = Math.max(p1.y, p2.y);
                    ctx.rect(minX, minY, maxX - minX, maxY - minY);
                  }
                } else if (shape.type === 'circle') {
                  if (shape.points.length >= 2) {
                    const center = shape.points[0];
                    const rim = shape.points[1];
                    const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
                    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
                  }
                } else if (shape.type === 'triangle') {
                  const poly = shape.points;
                  if (poly.length >= 3) {
                    ctx.moveTo(poly[0].x, poly[0].y);
                    ctx.lineTo(poly[1].x, poly[1].y);
                    ctx.lineTo(poly[2].x, poly[2].y);
                  }
                }
                ctx.closePath();
                ctx.clip(); // Clip everything drawn hereafter to this shape boundary!

                // Compute bounding box
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (const pt of shape.points) {
                  if (pt.x < minX) minX = pt.x;
                  if (pt.x > maxX) maxX = pt.x;
                  if (pt.y < minY) minY = pt.y;
                  if (pt.y > maxY) maxY = pt.y;
                }
                if (minX !== Infinity) {
                  // Translate to the bounding box of the shape to render the CA
                  ctx.translate(minX, minY);
                  const w = maxX - minX;
                  const h = maxY - minY;
                  const shapeCellSize = shape.cellSize || cellSize;
                  const cols = Math.max(1, Math.floor(w / shapeCellSize));
                  const rows = Math.max(1, Math.floor(h / shapeCellSize));
                  
                  // Render Wolfram Automaton inside the shape!
                  draw1DRuleAutomata(
                    ctx,
                    shape.caRule,
                    cols,
                    rows,
                    shapeCellSize,
                    shape.caPaletteColors,
                    opacity,
                    {
                      caRule2: shape.caRule2,
                      caBlendMode: shape.caBlendMode,
                      caSeedType: shape.caSeedType,
                      caSymmetry: shape.caSymmetry,
                      caDensity: caDensity
                    }
                  );
                }
                ctx.restore();

                // Draw a subtle border outline or selection handle around selection
                if (shape.id === selectedCAShapeId) {
                  ctx.save();
                  ctx.beginPath();
                  if (shape.type === 'freehand') {
                    const poly = shape.points;
                    if (poly.length > 0) {
                      ctx.moveTo(poly[0].x, poly[0].y);
                      for (let i = 1; i < poly.length; i++) {
                        ctx.lineTo(poly[i].x, poly[i].y);
                      }
                    }
                  } else if (shape.type === 'rectangle') {
                    if (shape.points.length >= 2) {
                      const p1 = shape.points[0];
                      const p2 = shape.points[1];
                      const minX = Math.min(p1.x, p2.x);
                      const maxX = Math.max(p1.x, p2.x);
                      const minY = Math.min(p1.y, p2.y);
                      const maxY = Math.max(p1.y, p2.y);
                      ctx.rect(minX, minY, maxX - minX, maxY - minY);
                    }
                  } else if (shape.type === 'circle') {
                    if (shape.points.length >= 2) {
                      const center = shape.points[0];
                      const rim = shape.points[1];
                      const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
                      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
                    }
                  } else if (shape.type === 'triangle') {
                    const poly = shape.points;
                    if (poly.length >= 3) {
                      ctx.moveTo(poly[0].x, poly[0].y);
                      ctx.lineTo(poly[1].x, poly[1].y);
                      ctx.lineTo(poly[2].x, poly[2].y);
                    }
                  }
                  ctx.closePath();
                  ctx.strokeStyle = '#22c55e'; // Green selection boundary
                  ctx.lineWidth = 1.5;
                  ctx.setLineDash([4, 4]); // Dashed line
                  ctx.stroke();
                  ctx.setLineDash([]); // Reset line dash

                  // Draw resize circle handle on the top-right corner of the shape bounding box
                  let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
                  for (const pt of shape.points) {
                    if (pt.x < sMinX) sMinX = pt.x;
                    if (pt.x > sMaxX) sMaxX = pt.x;
                    if (pt.y < sMinY) sMinY = pt.y;
                    if (pt.y > sMaxY) sMaxY = pt.y;
                  }
                  if (sMinX !== Infinity) {
                    ctx.beginPath();
                    ctx.arc(sMaxX, sMinY, 5 / vpZoom, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#22c55e';
                    ctx.lineWidth = 2 / vpZoom;
                    ctx.fill();
                    ctx.stroke();
                  }

                  ctx.restore();
                }
              }
            }
          } else {
            // Default grid drawing
            if (caType === 'rule') {
              const cols = Math.floor(canvasSize.width / cellSize);
              const rows = Math.floor(canvasSize.height / cellSize);
              draw1DRuleAutomata(ctx, caRule, cols, rows, cellSize, caPaletteColors, opacity);
            } else {
              draw2DGridCells(ctx, caState, cellSize, caPaletteColors, opacity, caType);
            }
          }
          ctx.restore();
        }

        // Draw active CA Shape Draft outline
        if (mode === 'ca' && isDrawingCAShape && caShapeDraftPoints.length > 0) {
          ctx.save();
          ctx.beginPath();
          if (caActiveTool === 'freehand') {
            ctx.moveTo(caShapeDraftPoints[0].x, caShapeDraftPoints[0].y);
            for (let i = 1; i < caShapeDraftPoints.length; i++) {
              ctx.lineTo(caShapeDraftPoints[i].x, caShapeDraftPoints[i].y);
            }
          } else if (caActiveTool === 'rectangle') {
            if (caShapeDraftPoints.length >= 2) {
              const p1 = caShapeDraftPoints[0];
              const p2 = caShapeDraftPoints[1];
              const minX = Math.min(p1.x, p2.x);
              const maxX = Math.max(p1.x, p2.x);
              const minY = Math.min(p1.y, p2.y);
              const maxY = Math.max(p1.y, p2.y);
              ctx.rect(minX, minY, maxX - minX, maxY - minY);
            }
          } else if (caActiveTool === 'circle') {
            if (caShapeDraftPoints.length >= 2) {
              const center = caShapeDraftPoints[0];
              const rim = caShapeDraftPoints[1];
              const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
              ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
            }
          } else if (caActiveTool === 'triangle') {
            if (caShapeDraftPoints.length >= 3) {
              ctx.moveTo(caShapeDraftPoints[0].x, caShapeDraftPoints[0].y);
              ctx.lineTo(caShapeDraftPoints[1].x, caShapeDraftPoints[1].y);
              ctx.lineTo(caShapeDraftPoints[2].x, caShapeDraftPoints[2].y);
            }
          }
          ctx.closePath();
          ctx.strokeStyle = '#22c55e'; // Green feedback line
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'; // Ambient fill
          ctx.fill();
          ctx.restore();
        }

        // 2. Draw L-system fractal vectors if active
        if (mode === 'lsystem') {
          ctx.save();
          const exRad = (extrudeAngle * Math.PI) / 180;
          const ex = Math.cos(exRad) * extrudeDepth;
          const ey = Math.sin(exRad) * extrudeDepth;

          // Interactive status: are sliders being dragged, canvas panned or wheel zoomed?
          const isInteractive = isPanning || isZooming || (Date.now() - lastPropsChangedRef.current < 250);

          let finalSegs = cachedSegments;
          let finalPaths = cachedPaths;

          if (isInteractive && cachedSegments.length > 20000) {
            // Count geometry density per recursion depth to budget operations under 15,000 counts
            const depthCounts: number[] = [];
            for (const seg of cachedSegments) {
              depthCounts[seg.depth] = (depthCounts[seg.depth] || 0) + 1;
            }
            let cumulative = 0;
            let maxAllowedDepth = 0;
            for (let d = 0; d < depthCounts.length; d++) {
              const count = depthCounts[d] || 0;
              if (cumulative + count > 15000) {
                break;
              }
              cumulative += count;
              maxAllowedDepth = d;
            }
            maxAllowedDepth = Math.max(2, maxAllowedDepth);

            finalSegs = cachedSegments.filter(seg => seg.depth <= maxAllowedDepth);
            finalPaths = cachedPaths.filter(path => path.depth <= maxAllowedDepth);
          }

          renderSegsOfPen(
            ctx,
            finalSegs,
            lineWidth,
            extrudeLw,
            extrudeConn,
            lsPaletteColors,
            ex,
            ey,
            opacity,
            finalPaths
          );
          ctx.restore();
        } else if (mode === 'combined') {
          // Render multiple L-systems layers in Combined Mode!
          for (const item of combinedLSystems) {
            ctx.save();
            ctx.translate(item.offset.x, item.offset.y);
            ctx.scale(item.scale ?? 1.0, item.scale ?? 1.0);

            const exRad = (extrudeAngle * Math.PI) / 180;
            const ex = Math.cos(exRad) * extrudeDepth;
            const ey = Math.sin(exRad) * extrudeDepth;

            const isInteractive = isPanning || isZooming || isDraggingCombined;

            let segs = item.segments || [];
            let paths = item.paths || [];

            // Simple budget for performance if interactive
            if (isInteractive && segs.length > 20000) {
              segs = segs.filter(s => s.depth <= 3);
              paths = paths.filter(p => p.depth <= 3);
            }

            const itemPaletteColors = separateColors
              ? (item.activePalette === 'custom' && item.customPalette && item.customPalette.length > 0
                ? item.customPalette
                : (PALETTES[item.activePalette as keyof typeof PALETTES] || PALETTES.white))
              : paletteColors;

            renderSegsOfPen(
              ctx,
              segs,
              item.lineWidth || lineWidth,
              extrudeLw,
              extrudeConn,
              itemPaletteColors,
              ex,
              ey,
              opacity,
              paths
            );
            ctx.restore();
          }
        }

        // 3. Interactive selection borders in Combined mode
        if (mode === 'combined') {
          if (combinedDragTarget === 'lsystem' && selectedCombinedLSystemId) {
            const item = combinedLSystems.find(x => x.id === selectedCombinedLSystemId);
            if (item && item.segments && item.segments.length > 0) {
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              for (const seg of item.segments) {
                minX = Math.min(minX, seg.x1, seg.x2);
                maxX = Math.max(maxX, seg.x1, seg.x2);
                minY = Math.min(minY, seg.y1, seg.y2);
                maxY = Math.max(maxY, seg.y1, seg.y2);
              }
              if (minX !== Infinity) {
                ctx.save();
                ctx.translate(item.offset.x, item.offset.y);
                ctx.strokeStyle = tc.color || '#6366f1';
                ctx.globalAlpha = isDraggingCombined ? 0.75 : 0.4;
                ctx.setLineDash([4 / vpZoom, 4 / vpZoom]);
                ctx.lineWidth = 1.2 / vpZoom;
                
                // Boundaries adjusted by item local scale
                const sc = item.scale ?? 1.0;
                ctx.strokeRect(minX * sc - 12, minY * sc - 12, (maxX - minX) * sc + 24, (maxY - minY) * sc + 24);
                ctx.setLineDash([]);
                
                // Draw small corner control ticks
                ctx.fillStyle = tc.color || '#6366f1';
                const tickSz = 5 / vpZoom;
                ctx.fillRect(minX * sc - 12 - tickSz/2, minY * sc - 12 - tickSz/2, tickSz, tickSz); // Top-left
                ctx.fillRect(minX * sc - 12 - tickSz/2, maxY * sc + 12 - tickSz/2, tickSz, tickSz); // Bottom-left
                ctx.fillRect(maxX * sc + 12 - tickSz/2, maxY * sc + 12 - tickSz/2, tickSz, tickSz); // Bottom-right
                
                // Resize corner top-right handle (draw as highlighted circle!)
                ctx.beginPath();
                ctx.arc(maxX * sc + 12, minY * sc - 12, 6 / vpZoom, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = tc.color || '#6366f1';
                ctx.lineWidth = 2 / vpZoom;
                ctx.globalAlpha = 1.0;
                ctx.fill();
                ctx.stroke();

                // Label indicator (Only show object name, omit scale value as requested)
                ctx.fillStyle = tc.color || '#6366f1';
                ctx.font = `${Math.max(9, 10 / vpZoom)}px monospace`;
                ctx.fillText(`${item.name || 'L-System'}`, minX * sc - 12, minY * sc - 18);
                ctx.restore();
              }
            }
          } else if (combinedDragTarget === 'ca' && caState) {
            const width = canvasSize.width;
            const height = canvasSize.height;
            ctx.save();
            ctx.translate(caManOffset.x, caManOffset.y);
            ctx.strokeStyle = '#ef4444'; 
            ctx.globalAlpha = isDraggingCombined ? 0.75 : 0.4;
            ctx.setLineDash([4 / vpZoom, 4 / vpZoom]);
            ctx.lineWidth = 1.2 / vpZoom;
            
            // Scaled grid boundary
            ctx.strokeRect(-8, -8, width * caScale + 16, height * caScale + 16);
            ctx.setLineDash([]);

            // Draw corner control ticks
            ctx.fillStyle = '#ef4444';
            const tickSz = 5 / vpZoom;
            ctx.fillRect(-8 - tickSz/2, -8 - tickSz/2, tickSz, tickSz); // Top-left
            ctx.fillRect(-8 - tickSz/2, height * caScale + 8 - tickSz/2, tickSz, tickSz); // Bottom-left
            ctx.fillRect(width * caScale + 8 - tickSz/2, height * caScale + 8 - tickSz/2, tickSz, tickSz); // Bottom-right

            // Resize handle on top-right corner!
            ctx.beginPath();
            ctx.arc(width * caScale + 8, -8, 6 / vpZoom, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2 / vpZoom;
            ctx.globalAlpha = 1.0;
            ctx.fill();
            ctx.stroke();

            // Label indicator
            ctx.fillStyle = '#ef4444';
            ctx.font = `${Math.max(9, 10 / vpZoom)}px monospace`;
            ctx.fillText(`Automata Grid`, -8, -14);
            ctx.restore();
          }
        }
      }
      ctx.restore();
    }
  }, [
    mode,
    activeBg,
    bgType,
    bgGradientColor1,
    bgGradientColor2,
    bgGradientAngle,
    bgGradientStop1,
    bgGradientStop2,
    flipHorizontal,
    activePalette,
    customPalette,
    separateColors,
    lsActivePalette,
    lsCustomPalette,
    caActivePalette,
    caCustomPalette,
    angle,
    rotation,
    cachedLString,
    cachedSegments,
    cachedPaths,
    isPanning,
    isZooming,
    length,
    cachedFitScale,
    decay,
    lineWidth,
    drawStyle,
    extrudeAngle,
    extrudeDepth,
    extrudeLw,
    extrudeConn,
    cellSize,
    caRule,
    caType,
    caState,
    opacity,
    penSegments,
    penPaths,
    penCurrent,
    penPreview,
    shiftHeld,
    penSuggestions,
    hoveredSuggIdx,
    vpZoom,
    vpPanX,
    vpPanY,
    canvasRef,
    canvasSize,
    cachedStartX,
    cachedStartY,
    draw1DRuleAutomata,
    draw2DGridCells,
    renderSegsOfPen,
    snappedPoint,
    smoothCurves,
    kaleidoscopeSegments,
    kaleidoscopeMode,
    kaleidoscopeSource,
    kaleidoscopeMirrorAxis,
    kaleidoscopeElementRotation,
    kaleidoscopeElementAnchor,
    isDrawingKaleidoscope,
    lsManOffset,
    caManOffset,
    combinedDragTarget,
    isDraggingCombined,
    caDrawMode,
    caActiveTool,
    caShapes,
    selectedCAShapeId,
    isDrawingCAShape,
    caShapeDraftPoints,
    caDensity,
    kaleidoscopeDoubleMirror,
    getElementBounds,
    combinedLSystems,
    caScale
  ]);

  // Set up high DPI context and resize observer
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width, height });
        }
      }
    });

    resizeObserver.observe(wrap);
    return () => resizeObserver.disconnect();
  }, []);

  // Memoize the expanded L-system string so that dragging angle/length/decay controls DOES NOT re-trigger string expansion
  const lSystemExpandedString = useMemo(() => {
    if (mode === 'pen' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'pen')) return '';
    const map = getRulesMap();
    return expandLSystem(axiom, map, iterations, stochastic, seed);
  }, [axiom, getRulesMap, iterations, stochastic, seed, mode, kaleidoscopeSource, generateKey]);

  // Calculate L-System transformations & center-alignment scale
  useEffect(() => {
    if (mode === 'pen' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'pen')) return;

    const angleRad = (angle * Math.PI) / 180;
    const bounds = computeBounds(lSystemExpandedString, angleRad, length, decay);

    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const fit = Math.min(
      (canvasSize.width * 0.85) / (bounds.maxX - bounds.minX || 1),
      (canvasSize.height * 0.85) / (bounds.maxY - bounds.minY || 1)
    ) * scale;

    const startX = cx - ((bounds.minX + bounds.maxX) / 2) * fit;
    const startY = cy - ((bounds.minY + bounds.maxY) / 2) * fit;

    setCachedLString(lSystemExpandedString);
    setCachedFitScale(fit);
    setCachedStartX(startX);
    setCachedStartY(startY);

    // Compute and cache L-system segments
    let segs = collectSegments(
      lSystemExpandedString,
      angleRad,
      length * fit,
      decay,
      startX,
      startY,
      0,
      stochastic,
      seed
    );

    segs = computeAllBudSegments(
      segs,
      budIterations,
      axiom,
      getRulesMap(),
      stochastic,
      seed,
      angleRad,
      decay
    );

    setCachedSegments(segs);

    // Pre-group segments into contiguous paths of points for ultra-fast rendering on redraws
    const paths = groupSegmentsToPaths(segs);
    setCachedPaths(paths);
  }, [
    lSystemExpandedString,
    scale,
    mode,
    kaleidoscopeSource,
    canvasSize,
    angle,
    length,
    decay,
    rotation,
    budIterations,
    axiom,
    getRulesMap,
    stochastic,
    seed
  ]);

  // Compiled cache rebuiler helper for individual Combined L-systems
  const rebuildLSystemCache = useCallback((item: CombinedLSystem): CombinedLSystem => {
    const rulesMap: { [key: string]: string } = {};
    for (const r of item.rules) {
      rulesMap[r.from] = r.to;
    }
    const itemStochastic = item.stochastic !== undefined ? item.stochastic : stochastic;
    const itemSeed = item.seed !== undefined ? item.seed : seed;
    const expanded = expandLSystem(item.axiom, rulesMap, item.iterations, itemStochastic, itemSeed);
    const angleRad = (item.angle * Math.PI) / 180;
    
    const bounds = computeBounds(expanded, angleRad, item.length, item.decay);
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const fit = Math.min(
      (canvasSize.width * 0.85) / (bounds.maxX - bounds.minX || 1),
      (canvasSize.height * 0.85) / (bounds.maxY - bounds.minY || 1)
    );

    const startX = cx - ((bounds.minX + bounds.maxX) / 2) * fit;
    const startY = cy - ((bounds.minY + bounds.maxY) / 2) * fit;

    let segs = collectSegments(
      expanded,
      angleRad,
      item.length * fit,
      item.decay,
      startX - cx, // Shift relative to centered (0,0) origin
      startY - cy,
      0,
      itemStochastic,
      itemSeed
    );

    const itemBudIterations = item.budIterations || budIterations || [0];
    segs = computeAllBudSegments(
      segs,
      itemBudIterations,
      item.axiom,
      rulesMap,
      itemStochastic,
      itemSeed,
      angleRad,
      item.decay
    );

    const paths = groupSegmentsToPaths(segs);
    return {
      ...item,
      segments: segs,
      paths: paths
    };
  }, [stochastic, seed, budIterations, canvasSize]);

  // Add multiple L-systems helper
  const addCombinedLSystem = useCallback(() => {
    const fresh: CombinedLSystem = {
      id: 'ls-' + Date.now(),
      name: `L-System ${combinedLSystems.length + 1}`,
      axiom: axiom,
      rules: rules.map(r => ({ ...r })),
      iterations: iterations,
      angle: angle,
      length: length,
      decay: decay,
      lineWidth: lineWidth,
      offset: { x: (combinedLSystems.length % 3) * 40 - 40, y: (combinedLSystems.length % 3) * 40 - 40 },
      scale: 1.0,
      activePalette: lsActivePalette,
      customPalette: [...lsCustomPalette],
      budIterations: [...budIterations],
      stochastic: stochastic,
      seed: seed
    };
    const compiled = rebuildLSystemCache(fresh);
    setCombinedLSystems(prev => [...prev, compiled]);
    setSelectedCombinedLSystemId(compiled.id);
    setCombinedDragTarget('lsystem');
  }, [axiom, rules, iterations, angle, length, decay, lineWidth, lsActivePalette, lsCustomPalette, budIterations, stochastic, seed, combinedLSystems, rebuildLSystemCache]);

  // Remove selected Combined L-system layers (keeping at least one)
  const deleteSelectedLSystem = useCallback(() => {
    if (combinedLSystems.length <= 1) return;
    const remaining = combinedLSystems.filter(item => item.id !== selectedCombinedLSystemId);
    setCombinedLSystems(remaining);
    setSelectedCombinedLSystemId(remaining[remaining.length - 1].id);
  }, [combinedLSystems, selectedCombinedLSystemId]);

  // Auto-initializer of a primary L-system layer when entering Combined mode
  useEffect(() => {
    if (mode === 'combined' && combinedLSystems.length === 0) {
      const defaultItem: CombinedLSystem = {
        id: 'ls-default',
        name: 'Primary L-System',
        axiom: axiom,
        rules: rules.map(r => ({ ...r })),
        iterations: iterations,
        angle: angle,
        length: length,
        decay: decay,
        lineWidth: lineWidth,
        offset: { x: 0, y: 0 },
        scale: 1.0,
        activePalette: lsActivePalette,
        customPalette: [...lsCustomPalette],
        budIterations: [...budIterations],
        stochastic: stochastic,
        seed: seed
      };
      
      const compiled = rebuildLSystemCache(defaultItem);
      setCombinedLSystems([compiled]);
      setSelectedCombinedLSystemId(compiled.id);
    }
  }, [mode, axiom, rules, iterations, angle, length, decay, lineWidth, lsActivePalette, lsCustomPalette, budIterations, stochastic, seed, rebuildLSystemCache, combinedLSystems.length]);

  // Sync from selected layer to sidebar inputs
  useEffect(() => {
    if (mode === 'combined' && selectedCombinedLSystemId) {
      const item = combinedLSystems.find(x => x.id === selectedCombinedLSystemId);
      if (item) {
        // Prevent infinite overwrite loop or stale overwriting:
        // Set lastSelectSyncRef BEFORE updating the parent states.
        const itemBuds = item.budIterations || [0];
        const itemStochastic = item.stochastic !== undefined ? item.stochastic : 0;
        const itemSeed = item.seed !== undefined ? item.seed : 42;
        lastSelectSyncRef.current = {
          id: item.id,
          axiom: item.axiom,
          rules: item.rules.map(r => ({ ...r })),
          iterations: item.iterations,
          angle: item.angle,
          length: item.length,
          decay: item.decay,
          lineWidth: item.lineWidth,
          activePalette: item.activePalette,
          customPalette: [...item.customPalette],
          budIterations: [...itemBuds],
          stochastic: itemStochastic,
          seed: itemSeed
        };

        if (setAxiom) setAxiom(item.axiom);
        if (setRules) setRules(item.rules.map(r => ({ ...r })));
        if (setIterations) setIterations(item.iterations);
        if (setAngle) setAngle(item.angle);
        if (setLength) setLength(item.length);
        if (setDecay) setDecay(item.decay);
        if (setLineWidth) setLineWidth(item.lineWidth);
        if (setLsActivePalette) setLsActivePalette(item.activePalette);
        if (setLsCustomPalette) setLsCustomPalette([...item.customPalette]);
        if (setBudIterations) setBudIterations([...itemBuds]);
        if (setStochastic) setStochastic(itemStochastic);
        if (setSeed) setSeed(itemSeed);
      }
    }
  }, [selectedCombinedLSystemId, mode]);

  // Sync from sidebar inputs to selected layer
  useEffect(() => {
    if (mode === 'combined' && selectedCombinedLSystemId) {
      const sync = lastSelectSyncRef.current;
      if (sync && sync.id === selectedCombinedLSystemId) {
        const isAxiomSame = sync.axiom === axiom;
        const isRulesSame = JSON.stringify(sync.rules) === JSON.stringify(rules);
        const isIterationsSame = sync.iterations === iterations;
        const isAngleSame = sync.angle === angle;
        const isLengthSame = sync.length === length;
        const isDecaySame = sync.decay === decay;
        const isLineWidthSame = sync.lineWidth === lineWidth;
        const isActivePaletteSame = sync.activePalette === lsActivePalette;
        const isCustomPaletteSame = JSON.stringify(sync.customPalette) === JSON.stringify(lsCustomPalette);
        const isBudIterationsSame = JSON.stringify(sync.budIterations || [0]) === JSON.stringify(budIterations);
        const isStochasticSame = sync.stochastic === stochastic;
        const isSeedSame = sync.seed === seed;

        if (
          isAxiomSame &&
          isRulesSame &&
          isIterationsSame &&
          isAngleSame &&
          isLengthSame &&
          isDecaySame &&
          isLineWidthSame &&
          isActivePaletteSame &&
          isCustomPaletteSame &&
          isBudIterationsSame &&
          isStochasticSame &&
          isSeedSame
        ) {
          return;
        }
      }

      setCombinedLSystems(prev => prev.map(item => {
        if (item.id === selectedCombinedLSystemId) {
          const updated = {
            ...item,
            axiom,
            rules: rules.map(r => ({ ...r })),
            iterations,
            angle,
            length,
            decay,
            lineWidth,
            activePalette: lsActivePalette,
            customPalette: [...lsCustomPalette],
            budIterations: [...budIterations],
            stochastic,
            seed
          };

          lastSelectSyncRef.current = {
            id: selectedCombinedLSystemId,
            axiom,
            rules: rules.map(r => ({ ...r })),
            iterations,
            angle,
            length,
            decay,
            lineWidth,
            activePalette: lsActivePalette,
            customPalette: [...lsCustomPalette],
            budIterations: [...budIterations],
            stochastic,
            seed
          };

          return rebuildLSystemCache(updated);
        }
        return item;
      }));
    }
  }, [axiom, rules, iterations, angle, length, decay, lineWidth, lsActivePalette, lsCustomPalette, budIterations, stochastic, seed, selectedCombinedLSystemId, mode, rebuildLSystemCache]);

  // Cellular Automata running ticker interval
  useEffect(() => {
    if (caTimerRef.current) {
      clearTimeout(caTimerRef.current);
      caTimerRef.current = null;
    }

    const needsCA = 
      mode === 'ca' || 
      mode === 'combined' || 
      (mode === 'kaleidoscope' && (kaleidoscopeSource === 'ca' || kaleidoscopeSource === 'combined'));

    if (!needsCA) {
      setCaState(null);
      return;
    }
    if (caType === 'rule') {
      setCaState([]); // Not animated 1D rules
      return;
    }

    const cols = Math.floor(canvasSize.width / cellSize);
    const rows = Math.floor(canvasSize.height / cellSize);
    let currentGrid = init2DGrid(cols, rows, caDensity, caType, seed);
    setCaState(currentGrid);

    const stepSimulation = () => {
      currentGrid = step2DGrid(currentGrid, caType);
      setCaState(currentGrid);
      caTimerRef.current = setTimeout(stepSimulation, 1000 / caSpeed);
    };

    caTimerRef.current = setTimeout(stepSimulation, 1000 / caSpeed);

    return () => {
      if (caTimerRef.current) {
        clearTimeout(caTimerRef.current);
      }
    };
  }, [mode, caType, cellSize, caSpeed, caDensity, canvasSize, generateKey, seed, kaleidoscopeSource]);

  // Track continuous slider adjustments for real-time LOD downscaling
  useEffect(() => {
    const prev = prevPropsRef.current;
    if (
      prev.angle !== angle ||
      prev.length !== length ||
      prev.decay !== decay ||
      prev.lineWidth !== lineWidth ||
      prev.rotation !== rotation ||
      prev.scale !== scale
    ) {
      lastPropsChangedRef.current = Date.now();
      prevPropsRef.current = { angle, length, decay, lineWidth, rotation, scale };
    }
  });

  // Cleanup active zooming timeouts
  useEffect(() => {
    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  // Trigger scene redraw of frames
  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Dynamically update default cursor based on active mode/tool
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if ((mode === 'ca' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'ca')) && caDrawMode === 'shapes' && caActiveTool === 'move') {
      canvas.style.cursor = 'grab';
    } else if (mode === 'combined') {
      canvas.style.cursor = 'default';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }, [mode, caDrawMode, caActiveTool]);

  // Sync state stats reporting back to app.tsx header label
  useEffect(() => {
    const zoomPct = Math.round(vpZoom * 100);
    let text = '';
    
    if (mode === 'pen' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'pen')) {
      text = shiftHeld
        ? ctrlLocked
          ? `symmetric pen · CTRL locked — hover option, click to append · zoom: ${zoomPct}%`
          : `symmetric pen · SHIFT active — rotation options active · hold CTRL to lock hover · zoom: ${zoomPct}%`
        : `symmetric pen · click: add vertex · SHIFT: branch options · alt+click: sprout · dblclick: commit path · zoom: ${zoomPct}%`;
    } else {
      const lenStr = cachedLString ? cachedLString.length.toLocaleString() : '0';
      text = `mode: ${mode} · fractal grammar size: ${lenStr} instructions · zoom: ${zoomPct}% · drag to scroll · mouse wheel to zoom · double click to center`;
    }
    
    setInfoText(text);
  }, [mode, kaleidoscopeSource, cachedLString, vpZoom, shiftHeld, ctrlLocked, setInfoText]);

  // --- DRAW EVENTS ---

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const isPenDraw = (mode === 'pen' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'pen')) && e.button === 0;
    const isKaleidoscopeDraw = mode === 'kaleidoscope' && kaleidoscopeSource === 'draw' && e.button === 0;

    // Combined mode manual manipulation left-drag triggers with auto-detection on click
    if (mode === 'combined' && e.button === 0) {
      const pt = screenToWorld(sx, sy);

      // A. Check if clicked on the top-right resize handle of selected L-System
      if (combinedDragTarget === 'lsystem' && selectedCombinedLSystemId) {
        const item = combinedLSystems.find(x => x.id === selectedCombinedLSystemId);
        if (item && item.segments && item.segments.length > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (const seg of item.segments) {
            minX = Math.min(minX, seg.x1, seg.x2);
            maxX = Math.max(maxX, seg.x1, seg.x2);
            minY = Math.min(minY, seg.y1, seg.y2);
            maxY = Math.max(maxY, seg.y1, seg.y2);
          }
          if (minX !== Infinity) {
            const sc = item.scale ?? 1.0;
            const hx = item.offset.x + maxX * sc + 12 / vpZoom;
            const hy = item.offset.y + minY * sc - 12 / vpZoom;
            const distPx = Math.sqrt((pt.x - hx) ** 2 + (pt.y - hy) ** 2) * vpZoom;
            if (distPx <= 22) {
              setActiveDragAction('resize');
              setIsDraggingCombined(true);
              startScaleRef.current = sc;
              const distStart = Math.sqrt((hx - item.offset.x) ** 2 + (hy - item.offset.y) ** 2);
              startBoxWidthRef.current = distStart || 1;
              startMouseXRef.current = e.clientX;
              startMouseYRef.current = e.clientY;
              canvas.style.cursor = 'ne-resize';
              e.preventDefault();
              return;
            }
          }
        }
      }

      // B. Check if clicked on the top-right resize handle of CA grid
      if (combinedDragTarget === 'ca' && caState) {
        const width = canvasSize.width;
        const height = canvasSize.height;
        const hx = caManOffset.x + width * caScale + 8 / vpZoom;
        const hy = caManOffset.y - 8 / vpZoom;
        const distPx = Math.sqrt((pt.x - hx) ** 2 + (pt.y - hy) ** 2) * vpZoom;
        if (distPx <= 22) {
          setActiveDragAction('resize');
          setIsDraggingCombined(true);
          startScaleRef.current = caScale;
          const distStart = Math.sqrt((hx - caManOffset.x) ** 2 + (hy - caManOffset.y) ** 2);
          startBoxWidthRef.current = distStart || 1;
          startMouseXRef.current = e.clientX;
          startMouseYRef.current = e.clientY;
          canvas.style.cursor = 'ne-resize';
          e.preventDefault();
          return;
        }
      }

      // C. Check if clicked on the top-right resize handle of SELECTED CA shape inside Combined mode
      if (caDrawMode === 'shapes' && selectedCAShapeId && caShapes && setCaShapes) {
        const shape = caShapes.find(s => s.id === selectedCAShapeId);
        if (shape && shape.points && shape.points.length > 0) {
          let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
          for (const polyPt of shape.points) {
            if (polyPt.x < sMinX) sMinX = polyPt.x;
            if (polyPt.x > sMaxX) sMaxX = polyPt.x;
            if (polyPt.y < sMinY) sMinY = polyPt.y;
            if (polyPt.y > sMaxY) sMaxY = polyPt.y;
          }
          if (sMinX !== Infinity) {
            const hx = caManOffset.x + sMaxX * caScale;
            const hy = caManOffset.y + sMinY * caScale;
            const distPx = Math.sqrt((pt.x - hx) ** 2 + (pt.y - hy) ** 2) * vpZoom;
            if (distPx <= 22) {
              setActiveDragAction('resize');
              setIsDraggingCombined(true);
              startShapePointsRef.current = shape.points.map(p => ({ ...p }));
              startShapeOriginRef.current = { x: sMinX, y: sMinY };
              startBoxWidthRef.current = sMaxX - sMinX || 1;
              startBoxHeightRef.current = sMaxY - sMinY || 1;
              startMouseXRef.current = e.clientX;
              startMouseYRef.current = e.clientY;
              canvas.style.cursor = 'ne-resize';
              e.preventDefault();
              return;
            }
          }
        }
      }

      // D. Now check if clicked inside any individual CA shape to drag/move it!
      if (caDrawMode === 'shapes' && caShapes && caShapes.length > 0) {
        const localPt = { x: pt.x - caManOffset.x, y: pt.y - caManOffset.y };
        let foundShape: CAShape | null = null;
        for (let i = caShapes.length - 1; i >= 0; i--) {
          const s = caShapes[i];
          if (pointInShape(localPt, s)) {
            foundShape = s;
            break;
          }
        }
        if (foundShape) {
          if (setSelectedCAShapeId) setSelectedCAShapeId(foundShape.id);
          setIsMovingCAShape(true);
          lastMovingCAShapePtRef.current = pt;
          canvas.style.cursor = 'grabbing';
          e.preventDefault();
          return;
        } else {
          if (setSelectedCAShapeId) setSelectedCAShapeId(null);
        }
      }

      // E. Check clicking on any of the L-systems in Combined mode list!
      let clickedLSystemId: string | null = null;
      let clickedLSystemObj: CombinedLSystem | null = null;
      for (let i = combinedLSystems.length - 1; i >= 0; i--) {
        const item = combinedLSystems[i];
        if (item.segments && item.segments.length > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (const seg of item.segments) {
            minX = Math.min(minX, seg.x1, seg.x2);
            maxX = Math.max(maxX, seg.x1, seg.x2);
            minY = Math.min(minY, seg.y1, seg.y2);
            maxY = Math.max(maxY, seg.y1, seg.y2);
          }
          if (minX !== Infinity) {
            const sc = item.scale ?? 1.0;
            const checkX = pt.x - item.offset.x;
            const checkY = pt.y - item.offset.y;
            if (checkX >= minX * sc - 30 && checkX <= maxX * sc + 30 && checkY >= minY * sc - 30 && checkY <= maxY * sc + 30) {
              clickedLSystemId = item.id;
              clickedLSystemObj = item;
              break;
            }
          }
        }
      }

      // F. Check if clicked on the Automata grid
      let clickedAutomata = false;
      if (caState) {
        const checkX = pt.x - caManOffset.x;
        const checkY = pt.y - caManOffset.y;
        if (checkX >= 0 && checkX <= canvasSize.width * caScale && checkY >= 0 && checkY <= canvasSize.height * caScale) {
          clickedAutomata = true;
        }
      }

      // Priority goes to L-systems, then Automata grid, then camera viewport pan
      let target: 'viewport' | 'lsystem' | 'ca' = 'viewport';
      if (clickedLSystemId && clickedLSystemObj) {
        target = 'lsystem';
        setSelectedCombinedLSystemId(clickedLSystemId);
      } else if (clickedAutomata) {
        target = 'ca';
      }

      setCombinedDragTarget(target);
      setActiveDragAction('move');

      if (target === 'viewport') {
        setPanOriginOnCanvas(true);
        setIsPanning(true);
        startVpPanXRef.current = vpPanX;
        startVpPanYRef.current = vpPanY;
        startMouseXRef.current = e.clientX;
        startMouseYRef.current = e.clientY;
        canvas.style.cursor = 'grabbing';
      } else {
        setIsDraggingCombined(true);
        if (target === 'lsystem' && clickedLSystemObj) {
          startCombinedOffsetXRef.current = clickedLSystemObj.offset.x;
          startCombinedOffsetYRef.current = clickedLSystemObj.offset.y;
        } else {
          startCombinedOffsetXRef.current = caManOffset.x;
          startCombinedOffsetYRef.current = caManOffset.y;
        }
        startMouseXRef.current = e.clientX;
        startMouseYRef.current = e.clientY;
        canvas.style.cursor = 'grabbing';
      }
      e.preventDefault();
      return;
    }

    // Normal dragging pan triggers when left-clicked in other modes or using aux buttons
    const isCAModeShapes = (mode === 'ca' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'ca')) && caDrawMode === 'shapes';
    if ((!isPenDraw && !isKaleidoscopeDraw && !isCAModeShapes) || e.button === 1 || e.button === 2) {
      setPanOriginOnCanvas(true);
      setIsPanning(true);
      startVpPanXRef.current = vpPanX;
      startVpPanYRef.current = vpPanY;
      startMouseXRef.current = e.clientX;
      startMouseYRef.current = e.clientY;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    // Interactive shape drawing inside CA Mode Shapes Target or select/move
    if (isCAModeShapes && e.button === 0) {
      const pt = screenToWorld(sx, sy);
      
      if (caActiveTool === 'move') {
        let foundShape: CAShape | null = null;
        if (caShapes && caShapes.length > 0) {
          for (let i = caShapes.length - 1; i >= 0; i--) {
            const s = caShapes[i];
            if (pointInShape(pt, s)) {
              foundShape = s;
              break;
            }
          }
        }
        if (foundShape) {
          if (setSelectedCAShapeId) setSelectedCAShapeId(foundShape.id);
          setIsMovingCAShape(true);
          lastMovingCAShapePtRef.current = pt;
          canvas.style.cursor = 'grabbing';
        } else {
          if (setSelectedCAShapeId) setSelectedCAShapeId(null);
        }
        e.preventDefault();
        return;
      }

      setIsDrawingCAShape(true);
      startDragPtRef.current = pt;
      setCaShapeDraftPoints([pt]);
      e.preventDefault();
      return;
    }

    // Interactive direct brush click inside Kaleidoscope mode
    if (isKaleidoscopeDraw) {
      pushToHistory();
      const pt = screenToWorld(sx, sy);
      setIsDrawingKaleidoscope(true);
      setPenCurrent([pt]);
      e.preventDefault();
      return;
    }

    // Interactive symmetric pen click paths append
    if (isPenDraw) {
      pushToHistory();
      let pt = screenToWorld(sx, sy);
      pt = getSnapPoint(pt, sx, sy);

      // Shift + click commits chosen suggestions
      if (shiftHeld && penCurrent && penSuggestions.length > 0) {
        const sugg = penSuggestions[hoveredSuggIdx];
        const last = penCurrent[penCurrent.length - 1];

        // Determine base direction angle of the sprout
        const refPt = penPreview || sugg.snapPt;
        const baseDir = Math.atan2(refPt.y - last.y, refPt.x - last.x) - Math.PI / 2;
        const finalDir = baseDir + sugg.off;

        const newSprout: PlacedSprout = {
          anchor: last,
          dir: finalDir,
          axiom,
          rules: rules.map(r => ({ ...r })),
          depth: penDepth,
          len: penLen,
          decay,
          angle
        };

        setPlacedSprouts(prevSprouts => [...prevSprouts, newSprout]);

        const updated = [...penCurrent, sugg.snapPt];
        setPenCurrent(updated);
        setPenSuggestions([]);
        setCtrlLocked(false);
        if (penPreview) {
          const freshSuggs = buildSuggestions(sugg.snapPt, penPreview);
          setPenSuggestions(freshSuggs);
          setHoveredSuggIdx(0);
        }
        return;
      }

      if (!penCurrent) {
        setPenCurrent([pt]);
      } else if (e.altKey) {
        const lastPt = penCurrent[penCurrent.length - 1];
        sproutAt(pt, lastPt || pt);
        setPenCurrent(null);
      } else {
        setPenCurrent(prev => [...prev!, pt]);
      }
      setTimeout(() => rebuildPenSegments(penCurrent ? [...penCurrent, pt] : [pt], penPaths), 10);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle moving/dragging individual CA shape
    if (isMovingCAShape && selectedCAShapeId) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const pt = screenToWorld(sx, sy);
      if (lastMovingCAShapePtRef.current) {
        const dx = pt.x - lastMovingCAShapePtRef.current.x;
        const dy = pt.y - lastMovingCAShapePtRef.current.y;
        if (setCaShapes) {
          setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? {
            ...s,
            points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          } : s));
        }
      }
      lastMovingCAShapePtRef.current = pt;
      return;
    }

    // Handle manual drag coordinates shifting or resizing inside Combined Mode
    if (isDraggingCombined) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const pt = screenToWorld(sx, sy);

      if (activeDragAction === 'resize') {
        if (combinedDragTarget === 'lsystem' && selectedCombinedLSystemId) {
          const item = combinedLSystems.find(x => x.id === selectedCombinedLSystemId);
          if (item) {
            const distCurrent = Math.sqrt((pt.x - item.offset.x) ** 2 + (pt.y - item.offset.y) ** 2);
            const ratio = distCurrent / (startBoxWidthRef.current || 1);
            const newScale = Math.max(0.1, Math.min(10, startScaleRef.current * ratio));
            setCombinedLSystems(prev => prev.map(x => x.id === selectedCombinedLSystemId ? { ...x, scale: newScale } : x));
          }
        } else if (combinedDragTarget === 'ca') {
          const distCurrent = Math.sqrt((pt.x - caManOffset.x) ** 2 + (pt.y - caManOffset.y) ** 2);
          const ratio = distCurrent / (startBoxWidthRef.current || 1);
          const newScale = Math.max(0.1, Math.min(10, startScaleRef.current * ratio));
          setCaScale(newScale);
        } else if (selectedCAShapeId && caShapes && setCaShapes) {
          const origin = startShapeOriginRef.current;
          const startW = startBoxWidthRef.current;
          const startH = startBoxHeightRef.current;
          const sc = caScale;
          const localPtX = (pt.x - caManOffset.x) / sc;
          const localPtY = (pt.y - caManOffset.y) / sc;

          const ratioX = Math.max(0.1, (localPtX - origin.x) / (startW || 1));
          const ratioY = Math.max(0.1, (localPtY - origin.y) / (startH || 1));

          setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? {
            ...s,
            points: startShapePointsRef.current.map(p => ({
              x: origin.x + (p.x - origin.x) * ratioX,
              y: origin.y + (p.y - origin.y) * ratioY
            }))
          } : s));
        }
      } else {
        // Move drag action
        const deltaX = (e.clientX - startMouseXRef.current) / vpZoom;
        const deltaY = (e.clientY - startMouseYRef.current) / vpZoom;

        if (combinedDragTarget === 'lsystem' && selectedCombinedLSystemId) {
          setCombinedLSystems(prev => prev.map(item => item.id === selectedCombinedLSystemId ? {
            ...item,
            offset: {
              x: startCombinedOffsetXRef.current + deltaX,
              y: startCombinedOffsetYRef.current + deltaY
            }
          } : item));
        } else if (combinedDragTarget === 'ca') {
          setCaManOffset({
            x: startCombinedOffsetXRef.current + deltaX,
            y: startCombinedOffsetYRef.current + deltaY,
          });
        }
      }
      return;
    }

    // Interactive custom CA shape drawing
    if ((mode === 'ca' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'ca')) && isDrawingCAShape && startDragPtRef.current) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const pt = screenToWorld(sx, sy);

      if (caActiveTool === 'freehand') {
        const last = caShapeDraftPoints[caShapeDraftPoints.length - 1];
        if (last) {
          const dx = pt.x - last.x;
          const dy = pt.y - last.y;
          if (Math.sqrt(dx * dx + dy * dy) > 1.5 / vpZoom) {
            setCaShapeDraftPoints(prev => [...prev, pt]);
          }
        } else {
          setCaShapeDraftPoints([pt]);
        }
      } else if (caActiveTool === 'rectangle' || caActiveTool === 'circle') {
        setCaShapeDraftPoints([startDragPtRef.current, pt]);
      } else if (caActiveTool === 'triangle') {
        const pStart = startDragPtRef.current;
        const p1 = { x: (pStart.x + pt.x) / 2, y: pStart.y };
        const p2 = { x: pStart.x, y: pt.y };
        const p3 = { x: pt.x, y: pt.y };
        setCaShapeDraftPoints([p1, p2, p3]);
      }
      return;
    }

    // A. Handle simple panning drag scroll
    if (isPanning && panOriginOnCanvas) {
      const deltaX = e.clientX - startMouseXRef.current;
      const deltaY = e.clientY - startMouseYRef.current;

      setVpPanX(startVpPanXRef.current + deltaX);
      setVpPanY(startVpPanYRef.current + deltaY);
      return;
    }

    // Kaleidoscope direct brush move drawing
    if (mode === 'kaleidoscope' && isDrawingKaleidoscope && penCurrent) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const pt = screenToWorld(sx, sy);
      
      const last = penCurrent[penCurrent.length - 1];
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Keep points relative to zoom representation
      if (dist > 1.5 / vpZoom) {
        setPenCurrent(prev => prev ? [...prev, pt] : [pt]);
      }
      return;
    }

    // B. Update custom Pen tracking markers
    if (mode === 'pen' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'pen')) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      let pt = screenToWorld(sx, sy);
      
      const snap = getSnapPoint(pt, sx, sy);
      const isSnappedNow = snap !== pt;
      setSnappedPoint(isSnappedNow ? snap : null);
      pt = snap;

      setPenPreview(pt);

      if (shiftHeld && penCurrent && penCurrent.length > 0) {
        if (ctrlLocked) {
          // Locked - only find coordinates of closest hovered suggestion
          const hoverIdx = findHoveredSugg(pt, penSuggestions);
          setHoveredSuggIdx(hoverIdx);
        } else {
          // Free rotate option lists
          const last = penCurrent[penCurrent.length - 1];
          const freshSuggs = buildSuggestions(last, pt);
          setPenSuggestions(freshSuggs);
          setHoveredSuggIdx(0);
        }
      } else {
        setPenSuggestions([]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isMovingCAShape) {
      setIsMovingCAShape(false);
      lastMovingCAShapePtRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = caActiveTool === 'move' ? 'grab' : 'crosshair';
      }
      return;
    }

    if ((mode === 'ca' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'ca')) && isDrawingCAShape) {
      setIsDrawingCAShape(false);
      startDragPtRef.current = null;

      // Check if it's a click or a drag
      let isClick = false;
      if (caShapeDraftPoints.length === 0) {
        isClick = true;
      } else if (caShapeDraftPoints.length === 1) {
        isClick = true;
      } else if (caShapeDraftPoints.length === 2 && caActiveTool !== 'rectangle' && caActiveTool !== 'circle') {
        const p1 = caShapeDraftPoints[0];
        const p2 = caShapeDraftPoints[1];
        const d = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        if (d < 4) isClick = true;
      }

      if (isClick && caShapeDraftPoints.length > 0) {
        // It's a click! Let's try to select an existing shape
        const clickPt = caShapeDraftPoints[0];
        let foundShape = false;
        if (caShapes && clickPt) {
          for (let i = caShapes.length - 1; i >= 0; i--) {
            const shape = caShapes[i];
            if (pointInShape(clickPt, shape)) {
              if (setSelectedCAShapeId) setSelectedCAShapeId(shape.id);
              foundShape = true;
              break;
            }
          }
        }
        if (!foundShape && setSelectedCAShapeId) {
          setSelectedCAShapeId(null);
        }
      } else {
        // It's a drag/draw! Let's commit the new shape
        let valid = false;
        if (caActiveTool === 'freehand' && caShapeDraftPoints.length >= 3) {
          valid = true;
        } else if ((caActiveTool === 'rectangle' || caActiveTool === 'circle') && caShapeDraftPoints.length >= 2) {
          valid = true;
        } else if (caActiveTool === 'triangle' && caShapeDraftPoints.length >= 3) {
          valid = true;
        }

        if (valid) {
          const basePalette = activePalette === 'custom' && customPalette ? customPalette : (PALETTES[activePalette] || PALETTES.white);
          const activePaletteName = separateColors ? caActivePalette : activePalette;
          const currentPaletteColors = separateColors
            ? (caActivePalette === 'custom' && caCustomPalette ? caCustomPalette : (PALETTES[caActivePalette] || PALETTES.white))
            : basePalette;

          const shapeId = 'ca-shape-' + Date.now();
          const newShape: CAShape = {
            id: shapeId,
            type: caActiveTool as any,
            points: [...caShapeDraftPoints],
            caRule,
            caRule2,
            caBlendMode,
            caSeedType,
            caSymmetry,
            cellSize,
            caPaletteColors: [...currentPaletteColors],
            activePalette: activePaletteName,
            customPalette: separateColors ? [...caCustomPalette] : [...customPalette]
          };

          if (setCaShapes) {
            setCaShapes(prev => [...prev, newShape]);
          }
          if (setSelectedCAShapeId) {
            setSelectedCAShapeId(shapeId);
          }
        }
      }

      setCaShapeDraftPoints([]);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = caActiveTool === 'move' ? 'grab' : 'crosshair';
      }
      return;
    }

    if (mode === 'kaleidoscope' && isDrawingKaleidoscope && penCurrent) {
      if (penCurrent.length >= 2) {
        setPenPaths(prev => [...prev, penCurrent]);
      }
      setPenCurrent(null);
      setIsDrawingKaleidoscope(false);
    }

    setIsPanning(false);
    setPanOriginOnCanvas(false);
    setIsDraggingCombined(false);
    setActiveDragAction(null);
    setSnappedPoint(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'crosshair';
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set zooming status for dynamic LOD acceleration
    setIsZooming(true);
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    zoomTimeoutRef.current = setTimeout(() => {
      setIsZooming(false);
    }, 400);

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05;

    // Standard wheel scroll (no Shift) always adjusts viewport zoom (vpZoom).
    // Shift + wheel adjusts drawing parameter scale ('scale').
    const isScaleScroll = e.shiftKey;

    if (isScaleScroll && setScale) {
      const newScale = Math.max(0.05, Math.min(10.0, scale * factor));
      setScale(parseFloat(newScale.toFixed(3)));
    } else {
      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZoom = Math.max(0.05, Math.min(50, vpZoom * zoomFactor));
      setVpPanX(mx - (mx - vpPanX) * (newZoom / vpZoom));
      setVpPanY(my - (my - vpPanY) * (newZoom / vpZoom));
      setVpZoom(newZoom);
    }
  };

  const handleDblClick = () => {
    if ((mode === 'pen' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'pen')) && penCurrent && penCurrent.length >= 2) {
      pushToHistory();
      const nextPaths = [...penPaths, [...penCurrent]];
      setPenPaths(nextPaths);
      setPenCurrent(null);
      setPenPreview(null);
      setPenSuggestions([]);
      rebuildPenSegments(null, nextPaths);
    } else {
      resetViewport();
    }
  };

  const handleExportPng = useCallback((options: { ratio: string; scale: number; transparent: boolean; fitContent: boolean }) => {
    const { ratio, scale, transparent, fitContent } = options;
    
    // Choose base dimensions based on aspect ratio
    let baseWidth = canvasSize.width;
    let baseHeight = canvasSize.height;
    
    if (ratio === '1:1') {
      baseWidth = 2048;
      baseHeight = 2048;
    } else if (ratio === '9:16') {
      baseWidth = 1152;
      baseHeight = 2048;
    } else if (ratio === '4:5') {
      baseWidth = 1638;
      baseHeight = 2048;
    } else if (ratio === '16:9') {
      baseWidth = 2048;
      baseHeight = 1152;
    } else if (ratio === '3:4') {
      baseWidth = 1536;
      baseHeight = 2048;
    }
    
    const exportWidth = Math.round(baseWidth * scale);
    const exportHeight = Math.round(baseHeight * scale);
    
    const offCanvas = document.createElement('canvas');
    offCanvas.width = exportWidth;
    offCanvas.height = exportHeight;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;
    
    // Fill/clear background with Solid/Linear/Radial support
    if (!transparent) {
      if (bgType === 'solid') {
        offCtx.fillStyle = activeBg;
        offCtx.fillRect(0, 0, exportWidth, exportHeight);
      } else {
        let grad: CanvasGradient;
        const w = exportWidth;
        const h = exportHeight;
        if (bgType === 'linear') {
          const angleRad = (bgGradientAngle * Math.PI) / 180;
          const x1 = w / 2 - Math.cos(angleRad) * w / 2;
          const y1 = h / 2 - Math.sin(angleRad) * h / 2;
          const x2 = w / 2 + Math.cos(angleRad) * w / 2;
          const y2 = h / 2 + Math.sin(angleRad) * h / 2;
          grad = offCtx.createLinearGradient(x1, y1, x2, y2);
        } else {
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.max(cx, cy);
          grad = offCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        }
        const stop1Safe = Math.min(Math.max(bgGradientStop1 / 100, 0), 1);
        const stop2Safe = Math.min(Math.max(bgGradientStop2 / 100, 0), 1);
        grad.addColorStop(stop1Safe, bgGradientColor1);
        grad.addColorStop(stop2Safe, bgGradientColor2);
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, w, h);
      }
    } else {
      offCtx.clearRect(0, 0, exportWidth, exportHeight);
    }
    
    const paletteColors = activePalette === 'custom' && customPalette
      ? customPalette
      : (PALETTES[activePalette] || PALETTES.white);

    const lsPaletteColors = separateColors
      ? (lsActivePalette === 'custom' && lsCustomPalette ? lsCustomPalette : (PALETTES[lsActivePalette] || PALETTES.white))
      : paletteColors;

    const caPaletteColors = separateColors
      ? (caActivePalette === 'custom' && caCustomPalette ? caCustomPalette : (PALETTES[caActivePalette] || PALETTES.white))
      : paletteColors;

    const angleRad = (angle * Math.PI) / 180;
    const rotRad = (rotation * Math.PI) / 180;
    
    offCtx.save();
    
    if (mode === 'kaleidoscope') {
      const alpha = (2 * Math.PI) / kaleidoscopeSegments;
      const exRad = (extrudeAngle * Math.PI) / 180;
      const ex = Math.cos(exRad) * extrudeDepth;
      const ey = Math.sin(exRad) * extrudeDepth;

      // Map base/screen dimensions to export width and height
      const scaleX = exportWidth / canvasSize.width;
      const scaleY = exportHeight / canvasSize.height;
      const scaleToFit = Math.min(scaleX, scaleY);

      const screenCx = canvasSize.width / 2;
      const screenCy = canvasSize.height / 2;

      let baseOffset = 0;
      if (kaleidoscopeMirrorAxis === 'horizontal') {
        baseOffset = Math.PI / 2;
      }

      for (let i = 0; i < kaleidoscopeSegments; i++) {
        // For mirror mode, draw both normal and reflected halves of the sector
        const passes = kaleidoscopeMode === 'mirror'
          ? (kaleidoscopeDoubleMirror ? [false, true] : [i % 2 === 1])
          : [false];
        
        for (const isMirrored of passes) {
          offCtx.save();
          
          // Map export coordinate space back to the virtual screen coordinate space
          offCtx.translate(exportWidth / 2, exportHeight / 2);
          offCtx.scale(scaleToFit, scaleToFit);
          offCtx.translate(-screenCx, -screenCy);

          // Center on screen center, apply kaleidoscope symmetry rotation/reflection
          offCtx.translate(screenCx, screenCy);

          if (kaleidoscopeSegments === 2) {
            // Apply viewport pitch rotation
            offCtx.rotate(rotRad);

            // In mirror mode, the mirrored pass is drawn relative to the original sector
            // In spin mode, the second sector is purely rotated by 180 degrees
            if (kaleidoscopeMode === 'spin') {
              if (i === 1) {
                offCtx.rotate(Math.PI);
              }
            } else {
              // Mirror mode
              if (i === 1 && !isMirrored) {
                offCtx.rotate(Math.PI);
              }
            }

            // Apply mirror/reflection scaling
            if (isMirrored) {
              if (kaleidoscopeMirrorAxis === 'horizontal') {
                offCtx.scale(-1, 1); // Horizontal reflection across vertical divider
              } else {
                offCtx.scale(1, -1); // Vertical reflection across horizontal divider
              }
            }
          } else {
            // Apply viewport pitch rotation and alignment offset to the entire kaleidoscope
            offCtx.rotate(baseOffset + rotRad);

            offCtx.rotate(i * alpha);
            if (isMirrored) {
              offCtx.scale(1, -1);
            }
          }
          offCtx.translate(-screenCx, -screenCy);

        // Apply zoom and panning translations
        offCtx.translate(vpPanX, vpPanY);
        offCtx.scale(vpZoom, vpZoom);

        // ROTATE AND/OR FLIP ACTIVE ELEMENT AROUND PIVOT
        if (kaleidoscopeElementRotation !== 0 || flipHorizontal) {
          const bounds = getElementBounds();
          if (bounds) {
            let px = (bounds.minX + bounds.maxX) / 2;
            let py = (bounds.minY + bounds.maxY) / 2;

            if (kaleidoscopeElementAnchor === 'left') {
              px = bounds.minX;
            } else if (kaleidoscopeElementAnchor === 'right') {
              px = bounds.maxX;
            } else if (kaleidoscopeElementAnchor === 'top') {
              py = bounds.minY;
            } else if (kaleidoscopeElementAnchor === 'bottom') {
              py = bounds.maxY;
            } else if (kaleidoscopeElementAnchor === 'origin') {
              px = 0;
              py = 0;
            }

            offCtx.translate(px, py);
            if (kaleidoscopeElementRotation !== 0) {
              const elemRotRad = (kaleidoscopeElementRotation * Math.PI) / 180;
              offCtx.rotate(elemRotRad);
            }
            if (flipHorizontal) {
              offCtx.scale(-1, 1);
            }
            offCtx.translate(-px, -py);
          }
        }

        // Render targets
        if (kaleidoscopeSource === 'lsystem' || kaleidoscopeSource === 'combined') {
          if (cachedSegments.length > 0) {
            renderSegsOfPen(
              offCtx,
              cachedSegments,
              lineWidth,
              extrudeLw,
              extrudeConn,
              lsPaletteColors,
              ex,
              ey,
              opacity,
              cachedPaths
            );
          }
        }

        if ((kaleidoscopeSource === 'ca' || kaleidoscopeSource === 'combined') && caState) {
          if (caDrawMode === 'shapes') {
            if (caShapes && caShapes.length > 0) {
              for (const shape of caShapes) {
                offCtx.save();
                offCtx.beginPath();
                if (shape.type === 'freehand') {
                  const poly = shape.points;
                  if (poly.length > 0) {
                    offCtx.moveTo(poly[0].x, poly[0].y);
                    for (let i = 1; i < poly.length; i++) {
                      offCtx.lineTo(poly[i].x, poly[i].y);
                    }
                  }
                } else if (shape.type === 'rectangle') {
                  if (shape.points.length >= 2) {
                    const p1 = shape.points[0];
                    const p2 = shape.points[1];
                    const minX = Math.min(p1.x, p2.x);
                    const maxX = Math.max(p1.x, p2.x);
                    const minY = Math.min(p1.y, p2.y);
                    const maxY = Math.max(p1.y, p2.y);
                    offCtx.rect(minX, minY, maxX - minX, maxY - minY);
                  }
                } else if (shape.type === 'circle') {
                  if (shape.points.length >= 2) {
                    const center = shape.points[0];
                    const rim = shape.points[1];
                    const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
                    offCtx.arc(center.x, center.y, r, 0, Math.PI * 2);
                  }
                } else if (shape.type === 'triangle') {
                  const poly = shape.points;
                  if (poly.length >= 3) {
                    offCtx.moveTo(poly[0].x, poly[0].y);
                    offCtx.lineTo(poly[1].x, poly[1].y);
                    offCtx.lineTo(poly[2].x, poly[2].y);
                  }
                }
                offCtx.closePath();
                offCtx.clip();

                // Compute bounding box
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (const pt of shape.points) {
                  if (pt.x < minX) minX = pt.x;
                  if (pt.x > maxX) maxX = pt.x;
                  if (pt.y < minY) minY = pt.y;
                  if (pt.y > maxY) maxY = pt.y;
                }
                if (minX !== Infinity) {
                  offCtx.translate(minX, minY);
                  const w = maxX - minX;
                  const h = maxY - minY;
                  const shapeCellSize = shape.cellSize || cellSize;
                  const cols = Math.max(1, Math.floor(w / shapeCellSize));
                  const rows = Math.max(1, Math.floor(h / shapeCellSize));
                  
                  draw1DRuleAutomata(
                    offCtx,
                    shape.caRule,
                    cols,
                    rows,
                    shapeCellSize,
                    shape.caPaletteColors,
                    opacity,
                    {
                      caRule2: shape.caRule2,
                      caBlendMode: shape.caBlendMode,
                      caSeedType: shape.caSeedType,
                      caSymmetry: shape.caSymmetry,
                      caDensity: caDensity
                    }
                  );
                }
                offCtx.restore();
              }
            }
          } else {
            if (caType === 'rule') {
              const cols = Math.floor(canvasSize.width / cellSize);
              const rows = Math.floor(canvasSize.height / cellSize);
              draw1DRuleAutomata(offCtx, caRule, cols, rows, cellSize, caPaletteColors, opacity);
            } else {
              draw2DGridCells(offCtx, caState, cellSize, caPaletteColors, opacity, caType);
            }
          }
        }

        if (kaleidoscopeSource === 'draw' || kaleidoscopeSource === 'pen') {
          if (penSegments.length > 0) {
            renderSegsOfPen(
              offCtx,
              penSegments,
              lineWidth,
              extrudeLw,
              extrudeConn,
              paletteColors,
              ex,
              ey,
              opacity
            );
          }

          if (penCurrent && penCurrent.length > 0) {
            const tempSegs: TurtleSegment[] = [];
            for (let k = 0; k < penCurrent.length - 1; k++) {
              tempSegs.push({
                x1: penCurrent[k].x,
                y1: penCurrent[k].y,
                x2: penCurrent[k+1].x,
                y2: penCurrent[k+1].y,
                depth: 0,
                len: Math.hypot(penCurrent[k+1].x - penCurrent[k].x, penCurrent[k+1].y - penCurrent[k].y)
              });
            }
            if (tempSegs.length > 0) {
              renderSegsOfPen(
                offCtx,
                tempSegs,
                lineWidth,
                extrudeLw,
                extrudeConn,
                paletteColors,
                ex,
                ey,
                opacity
              );
            }
          }
        }

        offCtx.restore();
        }
      }
    } else if (mode === 'pen') {
      const exRad = (extrudeAngle * Math.PI) / 180;
      const ex = Math.cos(exRad) * extrudeDepth;
      const ey = Math.sin(exRad) * extrudeDepth;
      
      if (fitContent && penSegments.length > 0) {
        // Calculate bounding box of penSegments
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        penSegments.forEach(seg => {
          minX = Math.min(minX, seg.x1, seg.x2);
          maxX = Math.max(maxX, seg.x1, seg.x2);
          minY = Math.min(minY, seg.y1, seg.y2);
          maxY = Math.max(maxY, seg.y1, seg.y2);
        });
        
        const pw = maxX - minX;
        const ph = maxY - minY;
        
        let targetScale = scale;
        let transX = 0;
        let transY = 0;
        
        if (maxX > minX && maxY > minY && pw > 0 && ph > 0) {
          const padding = 0.85; // 85% of canv width/height for margins
          const fitScaleX = (exportWidth * padding) / pw;
          const fitScaleY = (exportHeight * padding) / ph;
          const fitScale = Math.min(fitScaleX, fitScaleY);
          
          targetScale = fitScale;
          transX = (exportWidth / 2) - ((minX + maxX) / 2) * fitScale;
          transY = (exportHeight / 2) - ((minY + maxY) / 2) * fitScale;
        }
        
        offCtx.translate(transX, transY);
        offCtx.scale(targetScale, targetScale);
        
        renderSegsOfPen(
          offCtx,
          penSegments,
          lineWidth,
          extrudeLw,
          extrudeConn,
          paletteColors,
          ex,
          ey,
          opacity
        );
      } else {
        // Non-fitContent layout (current viewport zoom & pan)
        offCtx.scale(scale, scale);
        
        // Apply viewport rotation centered on the canvas
        const cx = baseWidth / 2;
        const cy = baseHeight / 2;
        offCtx.translate(cx, cy);
        offCtx.rotate(rotRad);
        offCtx.translate(-cx, -cy);

        offCtx.translate(vpPanX, vpPanY);
        offCtx.scale(vpZoom, vpZoom);

        // ROTATE AND/OR FLIP ACTIVE ELEMENT AROUND PIVOT
        if (kaleidoscopeElementRotation !== 0 || flipHorizontal) {
          const bounds = getElementBounds();
          if (bounds) {
            let px = (bounds.minX + bounds.maxX) / 2;
            let py = (bounds.minY + bounds.maxY) / 2;

            if (kaleidoscopeElementAnchor === 'left') { px = bounds.minX; }
            else if (kaleidoscopeElementAnchor === 'right') { px = bounds.maxX; }
            else if (kaleidoscopeElementAnchor === 'top') { py = bounds.minY; }
            else if (kaleidoscopeElementAnchor === 'bottom') { py = bounds.maxY; }
            else if (kaleidoscopeElementAnchor === 'origin') { px = 0; py = 0; }

            offCtx.translate(px, py);
            if (kaleidoscopeElementRotation !== 0) {
              const elemRotRad = (kaleidoscopeElementRotation * Math.PI) / 180;
              offCtx.rotate(elemRotRad);
            }
            if (flipHorizontal) {
              offCtx.scale(-1, 1);
            }
            offCtx.translate(-px, -py);
          }
        }
        
        renderSegsOfPen(
          offCtx,
          penSegments,
          lineWidth,
          extrudeLw,
          extrudeConn,
          paletteColors,
          ex,
          ey,
          opacity
        );
      }
    } else {
      // B. SYSTEM DRAWING PHASES (lsystem, ca, combined)
      if (fitContent) {
        // Compute unified bounding box of the active content
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        // A. Get L-system bounds if active
        if (mode === 'lsystem' && cachedSegments.length > 0) {
          const lBounds = computeBounds(cachedLString, angleRad, length, decay);
          minX = Math.min(minX, lBounds.minX);
          maxX = Math.max(maxX, lBounds.maxX);
          minY = Math.min(minY, lBounds.minY);
          maxY = Math.max(maxY, lBounds.maxY);
        } else if (mode === 'combined') {
          for (const item of combinedLSystems) {
            if (item.segments && item.segments.length > 0) {
              let lMinX = Infinity, lMaxX = -Infinity, lMinY = Infinity, lMaxY = -Infinity;
              for (const seg of item.segments) {
                lMinX = Math.min(lMinX, seg.x1, seg.x2);
                lMaxX = Math.max(lMaxX, seg.x1, seg.x2);
                lMinY = Math.min(lMinY, seg.y1, seg.y2);
                lMaxY = Math.max(lMaxY, seg.y1, seg.y2);
              }
              if (lMinX !== Infinity) {
                const sc = item.scale ?? 1.0;
                minX = Math.min(minX, lMinX * sc + item.offset.x);
                maxX = Math.max(maxX, lMaxX * sc + item.offset.x);
                minY = Math.min(minY, lMinY * sc + item.offset.y);
                maxY = Math.max(maxY, lMaxY * sc + item.offset.y);
              }
            }
          }
        }

        // B. Get CA bounds if active
        if ((mode === 'ca' || mode === 'combined') && caState) {
          const ox = mode === 'combined' ? caManOffset.x : 0;
          const oy = mode === 'combined' ? caManOffset.y : 0;
          const sc = mode === 'combined' ? caScale : 1.0;
          if (caDrawMode === 'shapes' && caShapes && caShapes.length > 0) {
            for (const shape of caShapes) {
              for (const pt of shape.points) {
                minX = Math.min(minX, pt.x * sc + ox);
                maxX = Math.max(maxX, pt.x * sc + ox);
                minY = Math.min(minY, pt.y * sc + oy);
                maxY = Math.max(maxY, pt.y * sc + oy);
              }
            }
          } else {
            // Full grid bounds is from 0 to canvas width/height
            minX = Math.min(minX, ox);
            maxX = Math.max(maxX, canvasSize.width * sc + ox);
            minY = Math.min(minY, oy);
            maxY = Math.max(maxY, canvasSize.height * sc + oy);
          }
        }

        if (minX !== Infinity) {
          const bw = maxX - minX;
          const bh = maxY - minY;
          const padding = 0.88; // 88% dimensions ratio
          const fitScaleX = (exportWidth * padding) / (bw || 1);
          const fitScaleY = (exportHeight * padding) / (bh || 1);
          const fitScale = Math.min(fitScaleX, fitScaleY) / scale; // normalize back relative to context's base coordinate scaling

          offCtx.save();
          // Scale and center the entire context
          offCtx.translate(exportWidth / 2, exportHeight / 2);
          offCtx.scale(fitScale * scale, fitScale * scale);
          const midX = (minX + maxX) / 2;
          const midY = (minY + maxY) / 2;
          offCtx.translate(-midX, -midY);

          // 1. Draw Cellular Automata Grid if active in this layout context
          if ((mode === 'ca' || mode === 'combined') && caState) {
            offCtx.save();
            if (mode === 'combined') {
              offCtx.translate(caManOffset.x, caManOffset.y);
              offCtx.scale(caScale, caScale);
            }
            if (caDrawMode === 'shapes') {
              if (caShapes && caShapes.length > 0) {
                for (const shape of caShapes) {
                  offCtx.save();
                  offCtx.beginPath();
                  if (shape.type === 'freehand') {
                    const poly = shape.points;
                    if (poly.length > 0) {
                      offCtx.moveTo(poly[0].x, poly[0].y);
                      for (let i = 1; i < poly.length; i++) {
                        offCtx.lineTo(poly[i].x, poly[i].y);
                      }
                    }
                  } else if (shape.type === 'rectangle') {
                    if (shape.points.length >= 2) {
                      const p1 = shape.points[0];
                      const p2 = shape.points[1];
                      const sMinX = Math.min(p1.x, p2.x);
                      const sMaxX = Math.max(p1.x, p2.x);
                      const sMinY = Math.min(p1.y, p2.y);
                      const sMaxY = Math.max(p1.y, p2.y);
                      offCtx.rect(sMinX, sMinY, sMaxX - sMinX, sMaxY - sMinY);
                    }
                  } else if (shape.type === 'circle') {
                    if (shape.points.length >= 2) {
                      const center = shape.points[0];
                      const rim = shape.points[1];
                      const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
                      offCtx.arc(center.x, center.y, r, 0, Math.PI * 2);
                    }
                  } else if (shape.type === 'triangle') {
                    const poly = shape.points;
                    if (poly.length >= 3) {
                      offCtx.moveTo(poly[0].x, poly[0].y);
                      offCtx.lineTo(poly[1].x, poly[1].y);
                      offCtx.lineTo(poly[2].x, poly[2].y);
                    }
                  }
                  offCtx.closePath();
                  offCtx.clip();

                  // Compute bounding box
                  let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
                  for (const pt of shape.points) {
                    if (pt.x < sMinX) sMinX = pt.x;
                    if (pt.x > sMaxX) sMaxX = pt.x;
                    if (pt.y < sMinY) sMinY = pt.y;
                    if (pt.y > sMaxY) sMaxY = pt.y;
                  }
                  if (sMinX !== Infinity) {
                    offCtx.translate(sMinX, sMinY);
                    const sw = sMaxX - sMinX;
                    const sh = sMaxY - sMinY;
                    const shapeCellSize = shape.cellSize || cellSize;
                    const cols = Math.max(1, Math.floor(sw / shapeCellSize));
                    const rows = Math.max(1, Math.floor(sh / shapeCellSize));
                    
                    draw1DRuleAutomata(
                      offCtx,
                      shape.caRule,
                      cols,
                      rows,
                      shapeCellSize,
                      shape.caPaletteColors,
                      opacity,
                      {
                        caRule2: shape.caRule2,
                        caBlendMode: shape.caBlendMode,
                        caSeedType: shape.caSeedType,
                        caSymmetry: shape.caSymmetry,
                        caDensity: caDensity
                      }
                    );
                  }
                  offCtx.restore();
                }
              }
            } else {
              if (caType === 'rule') {
                const cols = Math.floor(canvasSize.width / cellSize);
                const rows = Math.floor(canvasSize.height / cellSize);
                draw1DRuleAutomata(offCtx, caRule, cols, rows, cellSize, caPaletteColors, opacity);
              } else {
                draw2DGridCells(offCtx, caState, cellSize, caPaletteColors, opacity, caType);
              }
            }
            offCtx.restore();
          }

          // 2. Draw L-system fractal vector with fit content in Combined mode or lsystem mode
          if (mode === 'lsystem' && cachedSegments.length > 0) {
            offCtx.save();
            const exRad = (extrudeAngle * Math.PI) / 180;
            const ex = Math.cos(exRad) * extrudeDepth;
            const ey = Math.sin(exRad) * extrudeDepth;
            // Compute standard segments (autoscaled by context's fitScale)
            let segs = collectSegments(cachedLString, angleRad, length, decay, 0, 0, 0, stochastic, seed);
            segs = computeAllBudSegments(
              segs,
              budIterations,
              axiom,
              getRulesMap(),
              stochastic,
              seed,
              angleRad,
              decay
            );

            renderSegsOfPen(
              offCtx,
              segs,
              lineWidth,
              extrudeLw,
              extrudeConn,
              lsPaletteColors,
              ex,
              ey,
              opacity,
              groupSegmentsToPaths(segs)
            );
            offCtx.restore();
          } else if (mode === 'combined') {
            for (const item of combinedLSystems) {
              if (item.segments && item.segments.length > 0) {
                offCtx.save();
                offCtx.translate(item.offset.x, item.offset.y);
                offCtx.scale(item.scale ?? 1.0, item.scale ?? 1.0);

                const itemPalette = separateColors
                  ? (item.activePalette === 'custom' && item.customPalette && item.customPalette.length > 0 ? item.customPalette : (PALETTES[item.activePalette] || PALETTES.white))
                  : paletteColors;

                const exRad = (extrudeAngle * Math.PI) / 180;
                const ex = Math.cos(exRad) * extrudeDepth;
                const ey = Math.sin(exRad) * extrudeDepth;

                renderSegsOfPen(
                  offCtx,
                  item.segments,
                  lineWidth,
                  extrudeLw,
                  extrudeConn,
                  itemPalette,
                  ex,
                  ey,
                  opacity,
                  item.paths || []
                );
                offCtx.restore();
              }
            }
          }

          offCtx.restore();
        }
      } else {
        // CURRENT VIEWPORT ZOOM AND PAN FOR BOTH CA AND L-SYSTEM
        offCtx.save();
        offCtx.scale(scale, scale);

        // Apply viewport rotation centered on the canvas
        const cx = baseWidth / 2;
        const cy = baseHeight / 2;
        offCtx.translate(cx, cy);
        offCtx.rotate(rotRad);
        offCtx.translate(-cx, -cy);

        offCtx.translate(vpPanX, vpPanY);
        offCtx.scale(vpZoom, vpZoom);

        // ROTATE AND/OR FLIP ACTIVE ELEMENT AROUND PIVOT
        if (kaleidoscopeElementRotation !== 0 || flipHorizontal) {
          const bounds = getElementBounds();
          if (bounds) {
            let px = (bounds.minX + bounds.maxX) / 2;
            let py = (bounds.minY + bounds.maxY) / 2;

            if (kaleidoscopeElementAnchor === 'left') { px = bounds.minX; }
            else if (kaleidoscopeElementAnchor === 'right') { px = bounds.maxX; }
            else if (kaleidoscopeElementAnchor === 'top') { py = bounds.minY; }
            else if (kaleidoscopeElementAnchor === 'bottom') { py = bounds.maxY; }
            else if (kaleidoscopeElementAnchor === 'origin') { px = 0; py = 0; }

            offCtx.translate(px, py);
            if (kaleidoscopeElementRotation !== 0) {
              const elemRotRad = (kaleidoscopeElementRotation * Math.PI) / 180;
              offCtx.rotate(elemRotRad);
            }
            if (flipHorizontal) {
              offCtx.scale(-1, 1);
            }
            offCtx.translate(-px, -py);
          }
        }

        // 1. Draw Cellular Automata Grid
        if ((mode === 'ca' || mode === 'combined') && caState) {
          offCtx.save();
          if (mode === 'combined') {
            offCtx.translate(caManOffset.x, caManOffset.y);
            offCtx.scale(caScale, caScale);
          }
          if (caDrawMode === 'shapes') {
            if (caShapes && caShapes.length > 0) {
              for (const shape of caShapes) {
                offCtx.save();
                offCtx.beginPath();
                if (shape.type === 'freehand') {
                  const poly = shape.points;
                  if (poly.length > 0) {
                    offCtx.moveTo(poly[0].x, poly[0].y);
                    for (let i = 1; i < poly.length; i++) {
                      offCtx.lineTo(poly[i].x, poly[i].y);
                    }
                  }
                } else if (shape.type === 'rectangle') {
                  if (shape.points.length >= 2) {
                    const p1 = shape.points[0];
                    const p2 = shape.points[1];
                    const minX = Math.min(p1.x, p2.x);
                    const maxX = Math.max(p1.x, p2.x);
                    const minY = Math.min(p1.y, p2.y);
                    const maxY = Math.max(p1.y, p2.y);
                    offCtx.rect(minX, minY, maxX - minX, maxY - minY);
                  }
                } else if (shape.type === 'circle') {
                  if (shape.points.length >= 2) {
                    const center = shape.points[0];
                    const rim = shape.points[1];
                    const r = Math.sqrt((rim.x - center.x) ** 2 + (rim.y - center.y) ** 2);
                    offCtx.arc(center.x, center.y, r, 0, Math.PI * 2);
                  }
                } else if (shape.type === 'triangle') {
                  const poly = shape.points;
                  if (poly.length >= 3) {
                    offCtx.moveTo(poly[0].x, poly[0].y);
                    offCtx.lineTo(poly[1].x, poly[1].y);
                    offCtx.lineTo(poly[2].x, poly[2].y);
                  }
                }
                offCtx.closePath();
                offCtx.clip();

                // Compute bounding box
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (const pt of shape.points) {
                  if (pt.x < minX) minX = pt.x;
                  if (pt.x > maxX) maxX = pt.x;
                  if (pt.y < minY) minY = pt.y;
                  if (pt.y > maxY) maxY = pt.y;
                }
                if (minX !== Infinity) {
                  offCtx.translate(minX, minY);
                  const w = maxX - minX;
                  const h = maxY - minY;
                  const shapeCellSize = shape.cellSize || cellSize;
                  const cols = Math.max(1, Math.floor(w / shapeCellSize));
                  const rows = Math.max(1, Math.floor(h / shapeCellSize));
                  
                  draw1DRuleAutomata(
                    offCtx,
                    shape.caRule,
                    cols,
                    rows,
                    shapeCellSize,
                    shape.caPaletteColors,
                    opacity,
                    {
                      caRule2: shape.caRule2,
                      caBlendMode: shape.caBlendMode,
                      caSeedType: shape.caSeedType,
                      caSymmetry: shape.caSymmetry,
                      caDensity: caDensity
                    }
                  );
                }
                offCtx.restore();
              }
            }
          } else {
            if (caType === 'rule') {
              const cols = Math.floor(baseWidth / cellSize);
              const rows = Math.floor(baseHeight / cellSize);
              draw1DRuleAutomata(offCtx, caRule, cols, rows, cellSize, caPaletteColors, opacity);
            } else {
              draw2DGridCells(offCtx, caState, cellSize, caPaletteColors, opacity, caType);
            }
          }
          offCtx.restore();
        }

        // 2. Draw L-system fractal vector
        if (mode === 'lsystem' && cachedSegments.length > 0) {
          offCtx.save();
          const exRad = (extrudeAngle * Math.PI) / 180;
          const ex = Math.cos(exRad) * extrudeDepth;
          const ey = Math.sin(exRad) * extrudeDepth;
          renderSegsOfPen(
            offCtx,
            cachedSegments,
            lineWidth,
            extrudeLw,
            extrudeConn,
            lsPaletteColors,
            ex,
            ey,
            opacity,
            cachedPaths
          );
          offCtx.restore();
        } else if (mode === 'combined') {
          for (const item of combinedLSystems) {
            if (item.segments && item.segments.length > 0) {
              offCtx.save();
              offCtx.translate(item.offset.x, item.offset.y);
              offCtx.scale(item.scale ?? 1.0, item.scale ?? 1.0);

              const itemPalette = separateColors
                ? (item.activePalette === 'custom' && item.customPalette && item.customPalette.length > 0 ? item.customPalette : (PALETTES[item.activePalette] || PALETTES.white))
                : paletteColors;

              const exRad = (extrudeAngle * Math.PI) / 180;
              const ex = Math.cos(exRad) * extrudeDepth;
              const ey = Math.sin(exRad) * extrudeDepth;

              renderSegsOfPen(
                offCtx,
                item.segments,
                lineWidth,
                extrudeLw,
                extrudeConn,
                itemPalette,
                ex,
                ey,
                opacity,
                item.paths || []
              );
              offCtx.restore();
            }
          }
        }
        offCtx.restore();
      }
    }
    
    offCtx.restore();
    
    // Convert to URL and download
    const link = document.createElement('a');
    link.download = `generative-art-${mode}-${ratio}-${exportWidth}x${exportHeight}.png`;
    link.href = offCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [
    canvasSize,
    activeBg,
    activePalette,
    customPalette,
    angle,
    rotation,
    mode,
    cachedLString,
    cachedSegments,
    cachedPaths,
    length,
    decay,
    lineWidth,
    drawStyle,
    extrudeAngle,
    extrudeDepth,
    extrudeLw,
    extrudeConn,
    cellSize,
    caRule,
    caType,
    caState,
    opacity,
    penSegments,
    vpPanX,
    vpPanY,
    vpZoom,
    cachedFitScale,
    cachedStartX,
    cachedStartY,
    draw1DRuleAutomata,
    draw2DGridCells,
    renderSegsOfPen,
    bgType,
    bgGradientAngle,
    bgGradientColor1,
    bgGradientColor2,
    bgGradientStop1,
    bgGradientStop2,
    separateColors,
    lsActivePalette,
    lsCustomPalette,
    caActivePalette,
    caCustomPalette,
    kaleidoscopeSegments,
    kaleidoscopeMode,
    kaleidoscopeDoubleMirror,
    kaleidoscopeMirrorAxis,
    kaleidoscopeSource,
    kaleidoscopeElementRotation,
    kaleidoscopeElementAnchor,
    flipHorizontal,
    getElementBounds,
    budIterations,
    axiom,
    getRulesMap,
    stochastic,
    seed,
    caDrawMode,
    caShapes,
    caDensity,
    lsManOffset,
    caManOffset
  ]);

  // Wire back parent callback references
  useEffect(() => {
    penTriggerUndoRef.current = handlePenUndo;
    penTriggerClearRef.current = handlePenClearAll;
    exportPngRef.current = handleExportPng;
  }, [handlePenUndo, handlePenClearAll, penTriggerUndoRef, penTriggerClearRef, handleExportPng, exportPngRef]);

  return (
    <div ref={wrapRef} id="canvas-wrap" className="flex-1 min-h-[400px] h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
      {/* Absolute zoom and combined manipulator overlay in top-left */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-3 select-none pointer-events-none">
        {/* Zoom Overlay (Ultra-Minimalist as requested) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="text-white font-mono text-xs font-bold bg-black/20 px-1.5 py-0.5 rounded select-none">
            {Math.round(vpZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => {
              setVpZoom(1.0);
              setVpPanX(0);
              setVpPanY(0);
            }}
            className="text-[10px] bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded transition cursor-pointer border border-slate-800 font-sans"
            title="Сбросить зум и перемещение (или дважды кликните по холсту)"
          >
            Сброс
          </button>
        </div>

        {/* Combined Mode Selector */}
        {mode === 'combined' && (
          <div className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800/80 shadow-lg text-slate-200 font-mono text-[11px] flex items-center gap-1.5 pointer-events-auto">
            <span className="text-slate-500 text-[9px] uppercase font-bold pr-1.5 border-r border-slate-800/80">ВЫДЕЛЕНИЕ / ACTIVE</span>
            
            <button
              type="button"
              onClick={() => setCombinedDragTarget('lsystem')}
              className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer font-sans border ${
                combinedDragTarget === 'lsystem'
                  ? 'bg-indigo-600/35 border-indigo-500 font-bold text-white'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
              title="Выбрать L-систему для перемещения"
            >
              L-Система
            </button>

            <button
              type="button"
              onClick={() => setCombinedDragTarget('ca')}
              className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer font-sans border ${
                combinedDragTarget === 'ca'
                  ? 'bg-rose-600/35 border-rose-500 font-bold text-white'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
              title="Выбрать Автомат для перемещения"
            >
              Автомат
            </button>

            <button
              type="button"
              onClick={() => {
                setCombinedDragTarget('viewport');
                if (setSelectedCAShapeId) setSelectedCAShapeId(null);
              }}
              className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer font-sans border ${
                combinedDragTarget === 'viewport'
                  ? 'bg-slate-800 border-slate-700 font-bold text-slate-200 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
              title="Снять выделение (перемещать камеру)"
            >
              Деселект / Deselect
            </button>

            <button
              type="button"
              onClick={() => {
                setLsManOffset({ x: 0, y: 0 });
                setCaManOffset({ x: 0, y: 0 });
              }}
              className="text-[9px] font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition font-mono ml-1"
              title="Сбросить все сдвиги в центр"
            >
              Сброс сдвигов
            </button>
          </div>
        )}
      </div>

      {/* Absolute multi-L-system manager in top-right */}
      {mode === 'combined' && (
        <div className="absolute top-4 right-4 z-40 w-72 bg-slate-950/90 backdrop-blur-md p-4 rounded-xl border border-slate-800/80 shadow-2xl flex flex-col gap-3 text-slate-200 pointer-events-auto select-none">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-rose-400 rotate-45" />
              <span className="font-sans font-bold text-[11px] uppercase tracking-wider text-slate-300">Слои и разметки (Combined)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsLayersPanelCollapsed(!isLayersPanelCollapsed)}
              className="p-1 text-slate-500 hover:text-slate-300 transition bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded hover:border-slate-850 flex items-center justify-center cursor-pointer"
              title={isLayersPanelCollapsed ? "Развернуть" : "Свернуть"}
            >
              {isLayersPanelCollapsed ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!isLayersPanelCollapsed && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Список L-систем ({combinedLSystems.length})</span>
                <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {combinedLSystems.map((item, idx) => {
                    const isSelected = item.id === selectedCombinedLSystemId && combinedDragTarget === 'lsystem';
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedCombinedLSystemId(item.id);
                          setCombinedDragTarget('lsystem');
                        }}
                        className={`flex items-center justify-between px-2 py-1.5 rounded border text-[10px] cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                            : 'bg-slate-900/60 hover:bg-slate-900 border-slate-850 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{item.name || `L-System ${idx + 1}`}</span>
                        <span className="font-mono text-[9px] text-slate-400">{(item.scale ?? 1.0).toFixed(2)}x</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scale Control for Selected Elements */}
              {combinedDragTarget === 'lsystem' && selectedCombinedLSystemId && (
                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-sans text-slate-400 font-semibold uppercase">Масштаб фрактала</span>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">
                      {((combinedLSystems.find(x => x.id === selectedCombinedLSystemId)?.scale ?? 1.0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCombinedLSystems(prev => prev.map(x => x.id === selectedCombinedLSystemId ? { ...x, scale: Math.max(0.1, (x.scale ?? 1.0) - 0.1) } : x));
                      }}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold rounded cursor-pointer text-xs"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.1"
                      max="4.0"
                      step="0.05"
                      value={combinedLSystems.find(x => x.id === selectedCombinedLSystemId)?.scale ?? 1.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCombinedLSystems(prev => prev.map(x => x.id === selectedCombinedLSystemId ? { ...x, scale: val } : x));
                      }}
                      className="flex-1 accent-indigo-500 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCombinedLSystems(prev => prev.map(x => x.id === selectedCombinedLSystemId ? { ...x, scale: Math.min(10, (x.scale ?? 1.0) + 0.1) } : x));
                      }}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold rounded cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Scale Control for CA Grid */}
              {combinedDragTarget === 'ca' && (
                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-sans text-slate-400 font-semibold uppercase">Масштаб автомата (CA)</span>
                    <span className="text-[10px] font-mono text-rose-400 font-bold">{(caScale * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCaScale(Math.max(0.1, caScale - 0.1))}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold rounded cursor-pointer text-xs"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.1"
                      max="4.0"
                      step="0.05"
                      value={caScale}
                      onChange={(e) => setCaScale(parseFloat(e.target.value))}
                      className="flex-1 accent-rose-500 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setCaScale(Math.min(10, caScale + 0.1))}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold rounded cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Action Layer Controls */}
              <div className="flex items-center gap-2 border-t border-slate-800/60 pt-3">
                <button
                  type="button"
                  onClick={addCombinedLSystem}
                  className="flex-1 text-[10px] font-medium bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 hover:opacity-95 active:scale-95 rounded-lg py-1.5 text-white shadow-md transition cursor-pointer font-sans text-center flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить L-систему</span>
                </button>

                <button
                  type="button"
                  onClick={deleteSelectedLSystem}
                  disabled={combinedLSystems.length <= 1}
                  className={`text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition border flex items-center justify-center gap-1 cursor-pointer ${
                    combinedLSystems.length <= 1
                      ? 'bg-slate-900 border-slate-850 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-red-400 hover:text-red-300 hover:border-red-500/20 active:scale-95'
                  }`}
                  title="Удалить выбранный слой L-системы"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={canvasSize.width * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
        height={canvasSize.height * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
        className="block touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDblClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
