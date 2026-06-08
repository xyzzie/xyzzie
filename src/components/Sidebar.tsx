/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Settings2, 
  Layers, 
  HelpCircle, 
  Plus, 
  Minus,
  Trash2, 
  Palette, 
  Grid, 
  RefreshCw, 
  Compass, 
  PenTool, 
  Activity 
} from 'lucide-react';
import { AppMode, CAType, DrawStyle, LSystemPreset, UITheme, CAShape } from '../types';
import { THEME_MAP } from '../utils/theme';
import { ESTABLISHED_PRESETS, PALETTES, BG_COLORS } from '../data/presets';

// Color conversions helpers
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Convert RGB to HSV style
function rgbToHsv(r: number, g: number, b: number): { h: number, s: number, v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, v };
}

// Convert HSV to RGB string
function hsvToRgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

interface ColorPadProps {
  key?: number | string;
  color: string;
  onChange: (hex: string) => void;
}

function ColorPad({ color, onChange }: ColorPadProps) {
  const rgb = hexToRgb(color) || { r: 255, g: 255, b: 255 };
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  
  const [dragActive, setDragActive] = useState(false);
  const padRef = useRef<HTMLDivElement | null>(null);

  const updateColorFromCoords = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    
    // Saturation = X coordinate (0 -> 1)
    // Value = 1 - Y coordinate (1 at top, 0 at bottom)
    const s = x;
    const v = 1 - y;
    
    const newRgb = hsvToRgb(hsv.h, s, v);
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragActive(true);
    updateColorFromCoords(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!dragActive) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      updateColorFromCoords(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setDragActive(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragActive, hsv.h]);

  const pureHueHex = hsvToRgb(hsv.h, 1, 1);
  const pureHueColor = rgbToHex(pureHueHex.r, pureHueHex.g, pureHueHex.b);

  return (
    <div className="space-y-2">
      {/* 2D Saturation-Value Color pad workspace */}
      <div 
        ref={padRef}
        className="w-full h-24 rounded cursor-crosshair relative overflow-hidden flex select-none border border-slate-800"
        style={{
          backgroundColor: pureHueColor,
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div 
          className="absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow-md bg-transparent"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`
          }}
        />
      </div>

      {/* Hue selector */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
          <span>Спектр оттенков (Hue tone)</span>
          <span>{Math.round(hsv.h)}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={359}
          value={Math.round(hsv.h)}
          onChange={(e) => {
            const h = parseFloat(e.target.value);
            const newRgb = hsvToRgb(h, hsv.s, hsv.v);
            onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            WebkitAppearance: 'none'
          }}
        />
      </div>
    </div>
  );
}

interface SidebarProps {
  mode: AppMode;
  axiom: string;
  setAxiom: (val: string) => void;
  rules: { from: string; to: string }[];
  setRules: (val: { from: string; to: string }[]) => void;
  iterations: number;
  setIterations: (val: number) => void;
  budIterations: number[];
  setBudIterations: (val: number[]) => void;
  angle: number;
  setAngle: (val: number) => void;
  length: number;
  setLength: (val: number) => void;
  decay: number;
  setDecay: (val: number) => void;
  lineWidth: number;
  setLineWidth: (val: number) => void;
  stochastic: number;
  setStochastic: (val: number) => void;
  seed: number;
  setSeed: (val: number | ((prev: number) => number)) => void;
  smoothCurves: boolean;
  setSmoothCurves: (val: boolean) => void;
  
  // CA parameters
  caType: CAType;
  setCaType: (val: CAType) => void;
  caRule: number;
  setCaRule: (val: number) => void;
  caRule2?: number;
  setCaRule2?: (val: number) => void;
  caBlendMode?: string;
  setCaBlendMode?: (val: string) => void;
  caSeedType?: string;
  setCaSeedType?: (val: string) => void;
  caSymmetry?: string;
  setCaSymmetry?: (val: string) => void;
  cellSize: number;
  setCellSize: (val: number) => void;
  caSpeed: number;
  setCaSpeed: (val: number) => void;
  caDensity: number;
  setCaDensity: (val: number) => void;

  // Visual parameters
  drawStyle: DrawStyle;
  setDrawStyle: (val: DrawStyle) => void;
  extrudeDepth: number;
  setExtrudeDepth: (val: number) => void;
  extrudeAngle: number;
  setExtrudeAngle: (val: number) => void;
  extrudeLw: number;
  setExtrudeLw: (val: number) => void;
  extrudeConn: number;
  setExtrudeConn: (val: number) => void;
  
  activePalette: string;
  setActivePalette: (val: string) => void;
  customPalette: string[];
  setCustomPalette: (val: string[]) => void;
  separateColors?: boolean;
  setSeparateColors?: (val: boolean) => void;
  lsActivePalette?: string;
  setLsActivePalette?: (val: string) => void;
  lsCustomPalette?: string[];
  setLsCustomPalette?: (val: string[]) => void;
  caActivePalette?: string;
  setCaActivePalette?: (val: string) => void;
  caCustomPalette?: string[];
  setCaCustomPalette?: (val: string[]) => void;
  activeBg: string;
  setActiveBg: (val: string) => void;
  bgType?: 'solid' | 'linear' | 'radial';
  setBgType?: (val: 'solid' | 'linear' | 'radial') => void;
  bgGradientColor1?: string;
  setBgGradientColor1?: (val: string) => void;
  bgGradientColor2?: string;
  setBgGradientColor2?: (val: string) => void;
  bgGradientAngle?: number;
  setBgGradientAngle?: (val: number) => void;
  bgGradientStop1?: number;
  setBgGradientStop1?: (val: number) => void;
  bgGradientStop2?: number;
  setBgGradientStop2?: (val: number) => void;
  flipHorizontal?: boolean;
  setFlipHorizontal?: (val: boolean) => void;
  opacity: number;
  setOpacity: (val: number) => void;
  rotation: number;
  setRotation: (val: number) => void;
  scale: number;
  setScale: (val: number) => void;

  // Pen tool parameters
  penDepth: number;
  setPenDepth: (val: number) => void;
  penLen: number;
  setPenLen: (val: number) => void;
  onPenUndo: () => void;
  onPenClear: () => void;
  adjustDrawn: boolean;
  setAdjustDrawn: (val: boolean) => void;

  onApplyPreset: (preset: LSystemPreset) => void;
  triggerRecompute: () => void;

  kaleidoscopeSegments: number;
  setKaleidoscopeSegments: (val: number) => void;
  kaleidoscopeMode: 'mirror' | 'spin';
  setKaleidoscopeMode: (val: 'mirror' | 'spin') => void;
  kaleidoscopeDoubleMirror: boolean;
  setKaleidoscopeDoubleMirror: (val: boolean) => void;
  kaleidoscopeSource: 'draw' | 'lsystem' | 'ca' | 'combined' | 'pen';
  setKaleidoscopeSource: (val: 'draw' | 'lsystem' | 'ca' | 'combined' | 'pen') => void;
  uiTheme: UITheme;
  setUiTheme: (theme: UITheme) => void;
  uiAccentColor: string;
  setUiAccentColor: (val: string) => void;
  uiBgColor: string;
  setUiBgColor: (val: string) => void;
  uiOpacity: number;
  setUiOpacity: (val: number) => void;
  kaleidoscopeMirrorAxis: 'horizontal' | 'vertical';
  setKaleidoscopeMirrorAxis: (val: 'horizontal' | 'vertical') => void;
  kaleidoscopeElementRotation: number;
  setKaleidoscopeElementRotation: (val: number) => void;
  kaleidoscopeElementAnchor: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'origin';
  setKaleidoscopeElementAnchor: (val: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'origin') => void;

  caDrawMode?: 'grid' | 'shapes';
  setCaDrawMode?: (val: 'grid' | 'shapes') => void;
  caActiveTool?: 'freehand' | 'rectangle' | 'triangle' | 'circle' | 'move';
  setCaActiveTool?: (val: 'freehand' | 'rectangle' | 'triangle' | 'circle' | 'move') => void;
  caShapes?: CAShape[];
  setCaShapes?: React.Dispatch<React.SetStateAction<CAShape[]>>;
  selectedCAShapeId?: string | null;
  setSelectedCAShapeId?: (val: string | null) => void;
  blocksHue?: number;
}

export default function Sidebar({
  blocksHue = 250,
  mode,
  axiom,
  setAxiom,
  rules,
  setRules,
  iterations,
  setIterations,
  budIterations,
  setBudIterations,
  angle,
  setAngle,
  length,
  setLength,
  decay,
  setDecay,
  lineWidth,
  setLineWidth,
  stochastic,
  setStochastic,
  seed,
  setSeed,
  smoothCurves,
  setSmoothCurves,

  caType,
  setCaType,
  caRule,
  setCaRule,
  caRule2 = 90,
  setCaRule2 = () => {},
  caBlendMode = 'none',
  setCaBlendMode = () => {},
  caSeedType = 'single',
  setCaSeedType = () => {},
  caSymmetry = 'none',
  setCaSymmetry = () => {},
  cellSize,
  setCellSize,
  caSpeed,
  setCaSpeed,
  caDensity,
  setCaDensity,

  drawStyle,
  setDrawStyle,
  extrudeDepth,
  setExtrudeDepth,
  extrudeAngle,
  setExtrudeAngle,
  extrudeLw,
  setExtrudeLw,
  extrudeConn,
  setExtrudeConn,

  activePalette,
  setActivePalette,
  customPalette,
  setCustomPalette,
  separateColors = false,
  setSeparateColors = () => {},
  lsActivePalette = 'neon',
  setLsActivePalette = () => {},
  lsCustomPalette = ['#00f5ff', '#ff00a0'],
  setLsCustomPalette = () => {},
  caActivePalette = 'fire',
  setCaActivePalette = () => {},
  caCustomPalette = ['#ff3300', '#ffaa00'],
  setCaCustomPalette = () => {},
  activeBg,
  setActiveBg,
  bgType = 'solid',
  setBgType = () => {},
  bgGradientColor1 = '#0d0d1e',
  setBgGradientColor1 = () => {},
  bgGradientColor2 = '#1e0d2d',
  setBgGradientColor2 = () => {},
  bgGradientAngle = 135,
  setBgGradientAngle = () => {},
  bgGradientStop1 = 0,
  setBgGradientStop1 = () => {},
  bgGradientStop2 = 100,
  setBgGradientStop2 = () => {},
  flipHorizontal = false,
  setFlipHorizontal = () => {},
  opacity,
  setOpacity,
  rotation,
  setRotation,
  scale,
  setScale,

  penDepth,
  setPenDepth,
  penLen,
  setPenLen,
  adjustDrawn,
  setAdjustDrawn,
  onPenUndo,
  onPenClear,

  onApplyPreset,
  triggerRecompute,

  kaleidoscopeSegments,
  setKaleidoscopeSegments,
  kaleidoscopeMode,
  setKaleidoscopeMode,
  kaleidoscopeDoubleMirror,
  setKaleidoscopeDoubleMirror,
  kaleidoscopeSource,
  setKaleidoscopeSource,
  uiTheme,
  setUiTheme,
  uiAccentColor,
  setUiAccentColor,
  uiBgColor,
  setUiBgColor,
  uiOpacity,
  setUiOpacity,
  kaleidoscopeMirrorAxis,
  setKaleidoscopeMirrorAxis,
  kaleidoscopeElementRotation,
  setKaleidoscopeElementRotation,
  kaleidoscopeElementAnchor,
  setKaleidoscopeElementAnchor,

  caDrawMode = 'grid',
  setCaDrawMode = () => {},
  caActiveTool = 'freehand',
  setCaActiveTool = () => {},
  caShapes = [],
  setCaShapes = () => {},
  selectedCAShapeId = null,
  setSelectedCAShapeId = () => {},
}: SidebarProps) {

  const tc = THEME_MAP[uiTheme] || THEME_MAP.indigo;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => ({
    lsystem: mode !== 'lsystem' && mode !== 'combined',
    ca: mode !== 'ca' && mode !== 'combined',
    pen: mode !== 'pen' && mode !== 'combined',
    kaleidoscope: mode !== 'kaleidoscope',
    viewport: true,
    uiTheme: true,
  }));

  useEffect(() => {
    setCollapsed({
      lsystem: mode !== 'lsystem' && mode !== 'combined',
      ca: mode !== 'ca' && mode !== 'combined',
      pen: mode !== 'pen' && mode !== 'combined',
      kaleidoscope: mode !== 'kaleidoscope',
      viewport: true,
      uiTheme: true,
    });
  }, [mode]);

  const toggleSection = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const [openPalettePicker, setOpenPalettePicker] = useState(false);
  const [openBgPicker, setOpenBgPicker] = useState(false);
  const [activePaletteStep, setActivePaletteStep] = useState(0);
  const [colorTarget, setColorTarget] = useState<'lsystem' | 'ca'>('lsystem');

  const currentActivePalette = !separateColors 
    ? activePalette 
    : (colorTarget === 'lsystem' ? lsActivePalette : caActivePalette);

  const currentSetActivePalette = !separateColors
    ? setActivePalette
    : (colorTarget === 'lsystem' ? setLsActivePalette : setCaActivePalette);

  const currentCustomPalette = !separateColors
    ? customPalette
    : (colorTarget === 'lsystem' ? lsCustomPalette : caCustomPalette);

  const currentSetCustomPalette = !separateColors
    ? setCustomPalette
    : (colorTarget === 'lsystem' ? setLsCustomPalette : setCaCustomPalette);

  const addRuleRow = () => {
    setRules([...rules, { from: '', to: '' }]);
  };

  const updateRuleFrom = (idx: number, val: string) => {
    const next = [...rules];
    next[idx].from = val;
    setRules(next);
    triggerRecompute();
  };

  const updateRuleTo = (idx: number, val: string) => {
    const next = [...rules];
    next[idx].to = val;
    setRules(next);
    triggerRecompute();
  };

  const removeRuleRow = (idx: number) => {
    const next = rules.filter((_, i) => i !== idx);
    setRules(next);
    triggerRecompute();
  };

  return (
    <aside id="panel" className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto select-none shrink-0 scrollbar-thin scrollbar-thumb-slate-800">
      
      {/* SECTION: L-SYSTEM CONFIG (Hidden in CA only) */}
      {(mode === 'lsystem' || mode === 'combined' || mode === 'pen' || (mode === 'kaleidoscope' && (kaleidoscopeSource === 'lsystem' || kaleidoscopeSource === 'combined' || kaleidoscopeSource === 'pen'))) && (
        <div className="border-b border-slate-800/80 p-3 px-4">
          <div 
            className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center justify-between cursor-pointer select-none group"
            onClick={() => toggleSection('lsystem')}
            onDoubleClick={() => toggleSection('lsystem')}
            title="Двойной клик или клик для сворачивания / Double-click or click to collapse"
          >
            <div className="flex items-center gap-2 group-hover:text-slate-300 transition-colors">
              <svg viewBox="0 0 100 100" className="w-[15px] h-[15px] stroke-slate-300 fill-none stroke-[8.0]" strokeLinecap="round" strokeLinejoin="round">
                <line x1="50" y1="95" x2="50" y2="50" />
                <line x1="50" y1="50" x2="30" y2="30" />
                <line x1="50" y1="50" x2="70" y2="30" />
                <line x1="30" y1="30" x2="30" y2="15" />
                <line x1="30" y1="30" x2="15" y2="30" />
                <line x1="70" y1="30" x2="70" y2="15" />
                <line x1="70" y1="30" x2="85" y2="30" />
                <line x1="30" y1="15" x2="20" y2="5" />
                <line x1="30" y1="15" x2="40" y2="5" />
                <line x1="70" y1="15" x2="60" y2="5" />
                <line x1="70" y1="15" x2="80" y2="5" />
                <line x1="15" y1="30" x2="5" y2="20" />
                <line x1="15" y1="30" x2="5" y2="40" />
                <line x1="85" y1="30" x2="95" y2="20" />
                <line x1="85" y1="30" x2="95" y2="40" />
              </svg>
              <span>L-system Grammar</span>
            </div>
            <span className="text-slate-500 group-hover:text-slate-350 transition-colors">
              {collapsed.lsystem ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed.lsystem && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden space-y-4"
              >

          {/* Block 1: Axiom & Substitution Rules (styled by blocksHue - bright but dull/muted background & borders) */}
          <div 
            className="p-3 rounded-lg border shadow-sm space-y-3.5"
            style={{
              backgroundColor: `hsla(${blocksHue}, 40%, 12%, 0.22)`,
              borderColor: `hsla(${blocksHue}, 40%, 28%, 0.18)`
            }}
          >
            <div className="text-[9.5px] font-mono font-bold uppercase tracking-[0.14em]" style={{ color: `hsl(${blocksHue}, 60%, 75%)` }}>
              🖨️ Axiom & Substitution Grammar
            </div>

            {/* Quick L-system formulas preset library */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {ESTABLISHED_PRESETS.map((p) => {
                const isSelected = axiom === p.axiom && 
                  rules.length === p.rules.length && 
                  rules.every((r, idx) => r.from === p.rules[idx]?.from && r.to === p.rules[idx]?.to);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onApplyPreset(p);
                      triggerRecompute();
                    }}
                    className={`py-1 px-1.5 rounded text-[10px] text-left font-mono transition border truncate flex items-center justify-between ${
                      isSelected
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold shadow-sm'
                        : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:text-white hover:border-slate-800 hover:bg-slate-950/70'
                    }`}
                  >
                    <span>{p.name.replace(' Symmetric', '').replace(' Space', '').replace(' Curve', '')}</span>
                  </button>
                );
              })}
            </div>

            {/* Axiom Input */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="font-mono text-xs text-slate-400">Axiom (Seed)</span>
              <input
                type="text"
                value={axiom}
                onChange={(e) => {
                  setAxiom(e.target.value);
                  triggerRecompute();
                }}
                className="w-28 bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-center text-xs text-white uppercase focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            {/* Rules List */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">Substitutions Map</span>
                <button
                  onClick={addRuleRow}
                  className="flex items-center gap-1 text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Rule</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2.5">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex gap-1.5 items-center w-full">
                    <input
                      type="text"
                      value={rule.from}
                      placeholder="F"
                      maxLength={1}
                      onChange={(e) => updateRuleFrom(idx, e.target.value.toUpperCase())}
                      className="w-8 shrink-0 bg-slate-950 border border-slate-800 text-center rounded py-1 font-mono text-xs text-white uppercase focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-slate-600 text-xs font-mono shrink-0">→</span>
                    <input
                      type="text"
                      value={rule.to}
                      placeholder="Production stream"
                      onChange={(e) => updateRuleTo(idx, e.target.value)}
                      className="flex-1 min-w-0 bg-slate-950 border border-slate-800 px-2 rounded py-1 font-mono text-xs text-indigo-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => removeRuleRow(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer hover:bg-rose-500/10 rounded transition shrink-0"
                      title="Удалить правило"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Block 2: Iterations & Generations (styled with a shifted offset hue) */}
          <div 
            className="p-3 rounded-lg border shadow-sm space-y-3"
            style={{
              backgroundColor: `hsla(${(blocksHue + 120) % 360}, 40%, 12%, 0.22)`,
              borderColor: `hsla(${(blocksHue + 120) % 360}, 40%, 28%, 0.18)`
            }}
          >
            <div className="text-[9.5px] font-mono font-bold uppercase tracking-[0.14em]" style={{ color: `hsl(${(blocksHue + 120) % 360}, 60%, 75%)` }}>
              🌱 Iterations & Generations
            </div>

            <div className="flex gap-3 items-start py-1 select-none">
              {/* Left: Little L-System tree SVG logo (no background, transparent) */}
              <div className="w-5 h-5 shrink-0 flex items-center justify-center pt-[3px]">
                <svg viewBox="0 0 100 100" className="w-[15px] h-[15px] stroke-indigo-400 fill-none stroke-[8.0]" strokeLinecap="round" strokeLinejoin="round">
                  {/* Main Trunk */}
                  <line x1="50" y1="95" x2="50" y2="50" />
                  {/* First split Left & Right */}
                  <line x1="50" y1="50" x2="30" y2="30" />
                  <line x1="50" y1="50" x2="70" y2="30" />
                  {/* Left Split splits into vertical & horizontal */}
                  <line x1="30" y1="30" x2="30" y2="15" />
                  <line x1="30" y1="30" x2="15" y2="30" />
                  {/* Right Split splits into vertical & horizontal */}
                  <line x1="70" y1="30" x2="70" y2="15" />
                  <line x1="70" y1="30" x2="85" y2="30" />
                  {/* Top Left Vertical splits up-left & up-right */}
                  <line x1="30" y1="15" x2="20" y2="5" />
                  <line x1="30" y1="15" x2="40" y2="5" />
                  {/* Top Right Vertical splits up-left & up-right */}
                  <line x1="70" y1="15" x2="60" y2="5" />
                  <line x1="70" y1="15" x2="80" y2="5" />
                  {/* Outer Left Horizontal splits up-left & down-left */}
                  <line x1="15" y1="30" x2="5" y2="20" />
                  <line x1="15" y1="30" x2="5" y2="40" />
                  {/* Outer Right Horizontal splits up-right & down-right */}
                  <line x1="85" y1="30" x2="95" y2="20" />
                  <line x1="85" y1="30" x2="95" y2="40" />
                </svg>
              </div>

              {/* Right: Inline Controls */}
              <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                {/* Parent Iterations */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center font-mono text-[10.5px]">
                    <span className="text-slate-300 font-semibold">Parent (Base) iterations</span>
                    <span className="text-white font-bold bg-slate-950/40 px-1.5 py-0.5 rounded border border-slate-800/40">{iterations}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={iterations}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setIterations(val);
                      setPenDepth(Math.max(1, Math.min(6, val)));
                      triggerRecompute();
                    }}
                    className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: `hsl(${(blocksHue + 120) % 360}, 65%, 55%)` }}
                  />
                </div>

                {/* Child (Buds) iterations and + Add Child link/button */}
                <div className="space-y-2 border-t border-slate-800/40 pt-2.5">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const nextBuds = [...budIterations, 1];
                        setBudIterations(nextBuds);
                        triggerRecompute();
                      }}
                      className="flex items-center gap-1 text-[9px] cursor-pointer"
                      style={{ color: `hsl(${(blocksHue + 120) % 360}, 65%, 65%)` }}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Child</span>
                    </button>
                  </div>

                  {/* List of Buds child tiers */}
                  {budIterations.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      {budIterations.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-3 py-1 font-mono text-[10.5px]">
                          <span className="w-12 shrink-0 text-slate-400 font-semibold">
                            Tier {idx + 1}
                          </span>
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <input
                              type="range"
                              min={0}
                              max={5}
                              value={val}
                              onChange={(e) => {
                                const nextBuds = [...budIterations];
                                nextBuds[idx] = parseInt(e.target.value);
                                setBudIterations(nextBuds);
                                triggerRecompute();
                              }}
                              className="flex-1 h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer min-w-0"
                              style={{ accentColor: `hsl(${(blocksHue + 120) % 360}, 75%, 45%)` }}
                            />
                            <span className="text-[9.5px] font-mono font-bold shrink-0 min-w-[22px] text-right" style={{ color: `hsl(${(blocksHue + 120) % 360}, 65%, 65%)` }}>
                              {val === 0 ? 'OFF' : `${val}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextBuds = budIterations.filter((_, i) => i !== idx);
                              setBudIterations(nextBuds);
                              triggerRecompute();
                            }}
                            className="p-1 rounded text-red-400/85 hover:text-red-400 hover:bg-slate-950/20 transition-colors cursor-pointer shrink-0"
                            title="Remove tier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Turning Angle */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="text-slate-400">Angle Delta</span>
              <div className="flex items-center gap-1 bg-slate-950/20 p-0.5 rounded border border-slate-900/45">
                {[60, 90, 120].map((snapVal) => (
                  <button
                    key={snapVal}
                    type="button"
                    onClick={() => {
                      setAngle(snapVal);
                    }}
                    className={`px-1 rounded text-[10px] transition font-medium ${
                      angle === snapVal
                        ? 'bg-indigo-500 text-white font-bold shadow'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {snapVal}°
                  </button>
                ))}
                <span className="text-white font-bold ml-1 w-9 text-right font-mono">{angle}°</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={180}
              value={angle}
              onChange={(e) => {
                let val = parseFloat(e.target.value);
                // Snapping within a tolerance of 3.5 degrees
                const snapPoints = [60, 90, 120];
                for (const snap of snapPoints) {
                  if (Math.abs(val - snap) <= 3.5) {
                    val = snap;
                    break;
                  }
                }
                setAngle(val);
              }}
              className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Segment length */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-400">Vector Length</span>
              <span className="text-white font-bold">{length} px</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={0.5}
              value={length}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setLength(val);
                setPenLen(Math.max(5, Math.min(200, Math.round(val * 8))));
              }}
              className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Decay factor */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-400">Scale Decay</span>
              <span className="text-white font-bold">{decay}</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={1.0}
              step={0.01}
              value={decay}
              onChange={(e) => {
                setDecay(parseFloat(e.target.value));
              }}
              className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Line width */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="text-slate-400">Brush Thickness</span>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded">
                <input
                  type="number"
                  min={0.05}
                  max={25.0}
                  step={0.01}
                  value={lineWidth}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) {
                      setLineWidth(parsed);
                    }
                  }}
                  className="w-12 text-emerald-400 font-bold bg-transparent border-none outline-none text-right font-mono text-[11px] p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-slate-500 text-[10px]">px</span>
              </div>
            </div>
            <input
              type="range"
              min={0.05}
              max={15.0}
              step={0.01}
              value={lineWidth}
              onChange={(e) => setLineWidth(parseFloat(e.target.value))}
              className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Stochastic Variation */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-400">Stochastic Mutate</span>
              <span className="text-white font-bold">{stochastic}</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={stochastic}
              onChange={(e) => {
                setStochastic(parseFloat(e.target.value));
                triggerRecompute();
              }}
              className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Smooth Curves Switch */}
          <div className="flex items-center justify-between py-1 mt-1">
            <span className="text-xs font-mono text-slate-300 font-semibold">
              Smooth Branch
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={smoothCurves}
                onChange={(e) => {
                  setSmoothCurves(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-rose-500 peer-checked:after:bg-white transition-all"></div>
            </label>
          </div>

          {/* Seed Input for Repetitive Control */}
          <div className="space-y-2 pt-2 border-t border-slate-900/60 mt-3">
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="text-slate-400">Randomizer Seed</span>
            </div>
            
            {/* Quick pre-selected beautiful seeds */}
            <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
              {[
                { val: 42, label: '✨ Perfect Symm', mutRate: 0.0 },
                { val: 108, label: '🌀 Cosmic Spiral', mutRate: 0.12 },
                { val: 711, label: '🌿 Organic Weed', mutRate: 0.16 },
                { val: 1337, label: '❄️ Crystal Star', mutRate: 0.08 },
                { val: 3412, label: '🕸️ Neural Maze', mutRate: 0.15 },
                { val: 8888, label: '🛡️ Castle Fort', mutRate: 0.05 },
              ].map((seedPreset) => (
                <button
                  key={seedPreset.val}
                  type="button"
                  onClick={() => {
                    setSeed(seedPreset.val);
                    // Automatically turn on stochastic mutation if it's currently 0 so the user gets an instant feedback/change!
                    if (stochastic === 0 && seedPreset.mutRate > 0) {
                      setStochastic(seedPreset.mutRate);
                    } else if (seedPreset.val === 42) {
                      // Perfect symmetry resets stochastic to 0
                      setStochastic(0);
                    }
                    triggerRecompute();
                  }}
                  className={`py-1.5 px-1.5 rounded text-left transition truncate border flex items-center justify-between ${
                    seed === seedPreset.val
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold'
                      : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:border-slate-850 hover:bg-slate-950/80 hover:text-white'
                  }`}
                >
                  <span className="truncate">{seedPreset.label}</span>
                  <span className="text-[9px] opacity-60 text-slate-500">{seedPreset.val}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 items-center pt-1 animate-fadeIn">
              <input
                type="number"
                value={seed}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setSeed(val);
                  triggerRecompute();
                }}
                className="w-0 flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500"
                placeholder="Custom seed"
              />
              <button
                type="button"
                onClick={() => {
                  setSeed(prev => Math.max(0, prev - 1));
                  triggerRecompute();
                }}
                className="w-7 h-7 bg-slate-950 border border-slate-800 rounded hover:border-slate-700 font-mono text-xs text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => {
                  setSeed(prev => prev + 1);
                  triggerRecompute();
                }}
                className="w-7 h-7 bg-slate-950 border border-slate-800 rounded hover:border-slate-700 font-mono text-xs text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextSeed = Math.floor(Math.random() * 10000);
                  setSeed(nextSeed);
                  if (stochastic === 0) {
                    setStochastic(0.12);
                  }
                  triggerRecompute();
                }}
                title="Randomize Seed"
                className="w-7 h-7 bg-slate-950 border border-slate-800 rounded hover:border-indigo-500 hover:text-indigo-400 text-slate-400 flex items-center justify-center transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}

      {/* SECTION: CELLULAR AUTOMATA PANEL (Visible in CA/Combined) */}
      {(mode === 'ca' || mode === 'combined' || (mode === 'kaleidoscope' && (kaleidoscopeSource === 'ca' || kaleidoscopeSource === 'combined'))) && (
        <div className="border-b border-slate-800/80 p-5">
          <div 
            className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center justify-between cursor-pointer select-none group"
            onClick={() => toggleSection('ca')}
            onDoubleClick={() => toggleSection('ca')}
            title="Двойной клик или клик для сворачивания / Double-click or click to collapse"
          >
            <div className="flex items-center gap-1.5 group-hover:text-slate-300 transition-colors">
              <svg viewBox="0 0 100 100" className="w-[14px] h-[14px] fill-rose-400 group-hover:fill-rose-300 stroke-none transition-colors">
                <path d="M 0,100 L 50,100 L 25,56.7 Z" />
                <path d="M 50,100 L 100,100 L 75,56.7 Z" />
                <path d="M 25,56.7 L 75,56.7 L 50,13.4 Z" />
              </svg>
              <span>Cellular Automata / Клеточные Автоматы</span>
            </div>
            <span className="text-slate-500 group-hover:text-slate-350 transition-colors">
              {collapsed.ca ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed.ca && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden space-y-4"
              >

              {/* Draw Mode Switch: Grid vs Shapes */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-900/60 font-mono text-[11px] gap-1 shrink-0">
                <button
                  onClick={() => setCaDrawMode && setCaDrawMode('grid')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-center transition-all ${
                    caDrawMode === 'grid'
                      ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Grid Mode (Full)
                </button>
                <button
                  onClick={() => setCaDrawMode && setCaDrawMode('shapes')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-center transition-all ${
                    caDrawMode === 'shapes'
                      ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Shapes (Draw / Fill)
                </button>
              </div>

              {caDrawMode === 'grid' ? (
                <>
                  {/* Static Algorithm Title */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-900/60 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">Current Algorithm / Алгоритм</span>
                      <span className="text-xs text-emerald-400 font-bold font-sans">1D Rule (Wolfram Automata)</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">Static</span>
                  </div>

                  {/* Wolfram 1D Rule 1 Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-slate-400 font-medium">Primary Rule / Правило 1</span>
                      <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px]">Rule {caRule}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={caRule}
                      onChange={(e) => setCaRule(parseInt(e.target.value))}
                      className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Blend Mode Selection */}
                  <div className="space-y-1.5">
                    <span className="font-mono text-xs text-slate-400 block">Combination Mode / Метод совмещения</span>
                    <select
                      value={caBlendMode}
                      onChange={(e) => setCaBlendMode && setCaBlendMode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-indigo-500/80 transition-colors"
                    >
                      <option value="none">Single Rule Only (Правило 1)</option>
                      <option value="xor">XOR Blend Rules (Смешать по XOR)</option>
                      <option value="and">AND Match Rules (Смешать по AND)</option>
                      <option value="or">OR Combine Rules (Смешать по OR)</option>
                      <option value="stripe_alt">Alternate Rows (Чередовать строки)</option>
                      <option value="stripe_cols">Alternate Columns (Чередовать столбцы)</option>
                      <option value="screen_split">Horizontal Split Screens (Сплит холста)</option>
                    </select>
                  </div>

                  {/* Wolfram 1D Rule 2 Slider (Visible only if Combined) */}
                  {caBlendMode !== 'none' && (
                    <div className="space-y-1.5 animate-fadeIn p-2.5 rounded bg-slate-950 border border-indigo-500/10">
                      <div className="flex justify-between font-mono text-xs">
                        <span className="text-slate-400 font-medium">Secondary Rule / Правило 2</span>
                        <span className="text-pink-400 font-bold bg-pink-500/10 px-1.5 py-0.5 rounded text-[11px]">Rule {caRule2}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={255}
                        value={caRule2}
                        onChange={(e) => setCaRule2 && setCaRule2(parseInt(e.target.value))}
                        className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-pink-500"
                      />
                    </div>
                  )}

                  {/* Initial Seed Setup Selection */}
                  <div className="space-y-1.5">
                    <span className="font-mono text-xs text-slate-400 block">Initial Seed / Инициализация спауна</span>
                    <select
                      value={caSeedType}
                      onChange={(e) => setCaSeedType && setCaSeedType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-indigo-500/80 transition-colors"
                    >
                      <option value="single">Single Central Active Cell (Центр)</option>
                      <option value="triple">Triple Spikes (Три фокуса)</option>
                      <option value="periodic">Periodic Pulse Wave (Импульсы)</option>
                      <option value="random">Sparsely Seeded Noise (Шум спор)</option>
                    </select>
                  </div>

                  {/* Symmetries & Reflections */}
                  <div className="space-y-1.5">
                    <span className="font-mono text-xs text-slate-400 block">Geometric Symmetry / Отражение</span>
                    <select
                      value={caSymmetry}
                      onChange={(e) => setCaSymmetry && setCaSymmetry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-indigo-500/80 transition-colors"
                    >
                      <option value="none">Asymmetric (No reflection)</option>
                      <option value="mirror_left">Mirror Left to Right (Слева направо)</option>
                      <option value="mirror_right">Mirror Right to Left (Справа налево)</option>
                      <option value="mirror_center">Central Symmetry Overlay</option>
                    </select>
                  </div>

                  {/* Density seed density */}
                  {caSeedType === 'random' && (
                    <div className="space-y-1.5 animate-fadeIn p-2.5 rounded bg-slate-950 border border-slate-900">
                      <div className="flex justify-between font-mono text-xs">
                        <span className="text-slate-400 font-medium">Spawner Spores Density</span>
                        <span className="text-white font-bold">{Math.round(caDensity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.95}
                        step={0.01}
                        value={caDensity}
                        onChange={(e) => setCaDensity(parseFloat(e.target.value))}
                        className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  )}

                  {/* Cell resolution size */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-slate-400">Pixel Cell Size</span>
                      <span className="text-white font-bold">{cellSize} px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={cellSize}
                      onChange={(e) => setCellSize(parseInt(e.target.value))}
                      className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  {/* Shapes drawing tools box */}
                  <div className="space-y-3.5 p-3 bg-slate-950/40 rounded-lg border border-slate-900/80">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">Shape Type & Interaction</span>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { id: 'freehand', label: 'Pencil', icon: '✏️' },
                        { id: 'rectangle', label: 'Rect', icon: '⬜' },
                        { id: 'triangle', label: 'Tri', icon: '🔺' },
                        { id: 'circle', label: 'Circle', icon: '⚪' },
                        { id: 'move', label: 'Move', icon: '🖐️' }
                      ].map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => setCaActiveTool && setCaActiveTool(tool.id as any)}
                          className={`flex flex-col items-center gap-1 p-1 py-1.5 rounded-lg border text-xs transition-all ${
                            caActiveTool === tool.id
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-medium shadow-sm shadow-emerald-500/10'
                              : 'bg-slate-950 border-slate-900/50 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                          }`}
                        >
                          <span className="text-sm">{tool.icon}</span>
                          <span className="text-[9px] font-mono leading-tight">{tool.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                      Choose dynamic shape drawing tools, or select <b>Move (🖐️)</b> to drag shapes around the canvas. Select a shape to edit its specific Rule and colors.
                    </p>
                  </div>

                  {/* Shapes listing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-450">Your Shapes ({caShapes.length})</span>
                      {selectedCAShapeId && (
                        <button
                          onClick={() => {
                            if (setCaShapes) setCaShapes(prev => prev.filter(s => s.id !== selectedCAShapeId));
                            if (setSelectedCAShapeId) setSelectedCAShapeId(null);
                          }}
                          className="flex items-center gap-1 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded transition-all font-mono"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Delete Selected
                        </button>
                      )}
                    </div>
                    {caShapes.length === 0 ? (
                      <div className="p-3 text-center border border-dashed border-slate-800 rounded text-[10px] text-slate-500 font-mono">
                        No shapes drawn yet / Нет фигур
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1.5 bg-slate-950/40 rounded border border-slate-900/80">
                        {caShapes.map((shape, idx) => (
                          <button
                            key={shape.id}
                            onClick={() => setSelectedCAShapeId && setSelectedCAShapeId(shape.id)}
                            className={`px-2 py-1 rounded text-[10px] uppercase font-mono border transition-all ${
                              selectedCAShapeId === shape.id
                                ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400 font-bold'
                                : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                            }`}
                          >
                            {shape.type} {idx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Custom Shape settings modifier */}
                  {selectedCAShapeId && (() => {
                    const selectedShape = caShapes.find(s => s.id === selectedCAShapeId);
                    if (!selectedShape) return null;
                    return (
                      <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10 space-y-3.5 animate-fadeIn">
                        <div className="flex items-center justify-between pb-1 border-b border-emerald-500/10">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Modify Shape CA</span>
                          <span className="text-[10px] text-slate-500 font-mono capitalize">{selectedShape.type} active</span>
                        </div>

                        {/* Shape specific Rule */}
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-slate-400">Rule Number</span>
                            <span className="text-emerald-400 font-bold">Rule {selectedShape.caRule}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={255}
                            value={selectedShape.caRule}
                            onChange={(e) => {
                              const updatedRule = parseInt(e.target.value);
                              if (setCaShapes) {
                                setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? { ...s, caRule: updatedRule } : s));
                              }
                            }}
                            className="w-full h-1 bg-slate-905 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>

                        {/* Shape specific Blend Mode */}
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] text-slate-450 block">Pattern Blend Mode</span>
                          <select
                            value={selectedShape.caBlendMode || 'none'}
                            onChange={(e) => {
                              const blend = e.target.value;
                              if (setCaShapes) {
                                setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? { ...s, caBlendMode: blend } : s));
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none"
                          >
                            <option value="none">Single Rule</option>
                            <option value="xor">XOR Combine</option>
                            <option value="and">AND Combine</option>
                            <option value="or">OR Combine</option>
                            <option value="stripe_alt">Stripe Alternate Rows</option>
                            <option value="stripe_cols">Stripe Alternate Cols</option>
                            <option value="screen_split">Horizontal Screen Split</option>
                          </select>
                        </div>

                        {/* Shape specific Rule 2 */}
                        {selectedShape.caBlendMode && selectedShape.caBlendMode !== 'none' && (
                          <div className="space-y-1">
                            <div className="flex justify-between font-mono text-[10px]">
                              <span className="text-slate-400">Secondary Rule</span>
                              <span className="text-emerald-400 font-bold">Rule {selectedShape.caRule2 ?? 90}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={255}
                              value={selectedShape.caRule2 ?? 90}
                              onChange={(e) => {
                                const updatedRule = parseInt(e.target.value);
                                if (setCaShapes) {
                                  setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? { ...s, caRule2: updatedRule } : s));
                                }
                              }}
                              className="w-full h-1 bg-slate-905 rounded appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>
                        )}

                        {/* Shape specific Seed Type */}
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] text-slate-450 block">Initial State Seed</span>
                          <select
                            value={selectedShape.caSeedType || 'single'}
                            onChange={(e) => {
                              const seedType = e.target.value;
                              if (setCaShapes) {
                                setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? { ...s, caSeedType: seedType } : s));
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none"
                          >
                            <option value="single">Single Dot (Center)</option>
                            <option value="triple">Triple Dots</option>
                            <option value="periodic">Periodic Pulse</option>
                            <option value="random">Random Noise seed</option>
                          </select>
                        </div>

                        {/* Shape specific Cell Size */}
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-slate-400">Cell Dimension</span>
                            <span className="text-emerald-400 font-bold">{selectedShape.cellSize || cellSize}px</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={20}
                            value={selectedShape.cellSize || cellSize}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (setCaShapes) {
                                setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? { ...s, cellSize: val } : s));
                              }
                            }}
                            className="w-full h-1 bg-slate-905 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>

                        {/* Shape specific Symmetry */}
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] text-slate-455 block">Geometric Symmetry</span>
                          <select
                            value={selectedShape.caSymmetry || 'none'}
                            onChange={(e) => {
                              const sym = e.target.value;
                              if (setCaShapes) {
                                setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? { ...s, caSymmetry: sym } : s));
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none"
                          >
                            <option value="none">Asymmetric (No reflection)</option>
                            <option value="mirror_left">Mirror Left to Right</option>
                            <option value="mirror_right">Mirror Right to Left</option>
                            <option value="mirror_center">Central Symmetry Overlay</option>
                          </select>
                        </div>

                        {/* Shape specific active palette */}
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] text-slate-450 block">Shape Color Preset</span>
                          <select
                            value={selectedShape.activePalette || 'white'}
                            onChange={(e) => {
                              const palName = e.target.value;
                              const newPals = palName === 'custom' && selectedShape.customPalette ? selectedShape.customPalette : (PALETTES[palName] || PALETTES.white);
                              if (setCaShapes) {
                                setCaShapes(prev => prev.map(s => s.id === selectedCAShapeId ? { ...s, activePalette: palName, caPaletteColors: [...newPals] } : s));
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none"
                          >
                            {Object.keys(PALETTES).map(paletteName => (
                              <option key={paletteName} value={paletteName}>
                                {paletteName.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}

      {/* SECTION: PEN CONFIGURATION PANEL */}
      {(mode === 'pen' || (mode === 'kaleidoscope' && kaleidoscopeSource === 'pen')) && (
        <div className="border-b border-slate-800/80 p-5">
          <div 
            className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center justify-between cursor-pointer select-none group"
            onClick={() => toggleSection('pen')}
            onDoubleClick={() => toggleSection('pen')}
            title="Двойной клик или клик для сворачивания / Double-click or click to collapse"
          >
            <div className="flex items-center gap-1.5 group-hover:text-slate-300 transition-colors">
              <PenTool className="w-3.5 h-3.5 text-pink-400" />
              <span>Pen Sketch / Симметричное Перо</span>
            </div>
            <span className="text-slate-500 group-hover:text-slate-350 transition-colors">
              {collapsed.pen ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed.pen && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden space-y-4"
              >



          {/* Branch Depth */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-400">Axiom Depth</span>
              <span className="text-white font-bold">{penDepth}</span>
            </div>
            <input
              type="range"
              min={1}
              max={6}
              value={penDepth}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setPenDepth(val);
                setIterations(val);
              }}
              className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Sprout Length */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-400">Segment Step Length</span>
              <span className="text-white font-bold">{penLen} px</span>
            </div>
            <input
              type="range"
              min={5}
              max={200}
              value={penLen}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setPenLen(val);
                setLength(Math.max(1, Math.min(30, val / 8)));
              }}
              className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Dynamic adjustments toggle */}
          <div className="space-y-1.5 p-3 rounded-lg bg-indigo-950/15 border border-indigo-900/35">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-300 uppercase tracking-wider font-semibold">🔄 Режим Регулировки (Adjust Drawn)</span>
              <button
                type="button"
                onClick={() => setAdjustDrawn(!adjustDrawn)}
                className={`text-[9px] font-mono px-2 py-0.5 rounded border transition active:scale-95 flex items-center gap-1 ${
                  adjustDrawn 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold' 
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
                id="adjust-drawn-toggle"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${adjustDrawn ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span>{adjustDrawn ? 'АКТИВЕН' : 'ВЫКЛ'}</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-normal font-sans">
              {adjustDrawn 
                ? 'Слайдеры (угол, длина, глубина, затухание) мгновенно меняют форму всех нарисованных на канвасе фракталов!'
                : 'Каждый нарисованный фрактал "замораживается" со своими исходными параметрами и не меняется при движении слайдеров.'}
            </p>
          </div>

          {/* Undo Clear buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={onPenUndo}
              className="py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] leading-tight font-mono rounded"
            >
              Undo Step
            </button>
            <button
              onClick={onPenClear}
              className="py-1.5 bg-rose-950/20 border border-rose-900/30 text-rose-350 hover:bg-rose-900/30 text-[10px] leading-tight font-mono rounded"
            >
              Clear Hand
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}

      {/* SECTION: KALEIDOSCOPE CONFIGURATION PANEL */}
      {mode === 'kaleidoscope' && (
        <div className="border-b border-slate-800/80 p-5">
          <div 
            className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center justify-between cursor-pointer select-none group"
            onClick={() => toggleSection('kaleidoscope')}
            onDoubleClick={() => toggleSection('kaleidoscope')}
            title="Двойной клик или клик для сворачивания / Double-click or click to collapse"
          >
            <div className="flex items-center gap-1.5 group-hover:text-slate-300 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Kaleidoscope / Калейдоскоп</span>
            </div>
            <span className="text-slate-500 group-hover:text-slate-350 transition-colors">
              {collapsed.kaleidoscope ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed.kaleidoscope && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden space-y-4"
              >

          <p className="text-[11px] text-slate-400 leading-normal">
            MirrorLab-inspired radial symmetry engine that replicates and reflects any visual layer.
          </p>

          {/* Slices count */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-slate-400">Symmetry Slices / Segments</span>
              <span className="text-indigo-400 font-bold">{kaleidoscopeSegments}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setKaleidoscopeSegments(Math.max(2, kaleidoscopeSegments - 1))}
                className="w-7 h-7 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded flex items-center justify-center font-mono text-xs font-bold text-slate-300 active:scale-95 transition"
              >
                -
              </button>
              <input
                type="range"
                min={2}
                max={32}
                value={kaleidoscopeSegments}
                onChange={(e) => setKaleidoscopeSegments(parseInt(e.target.value))}
                className="flex-1 h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <button
                type="button"
                onClick={() => setKaleidoscopeSegments(Math.min(32, kaleidoscopeSegments + 1))}
                className="w-7 h-7 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 rounded flex items-center justify-center font-mono text-xs font-bold text-slate-300 active:scale-95 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Symmetry Mode */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Mirror Reflection Type</span>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800/60">
              <button
                type="button"
                onClick={() => setKaleidoscopeMode('mirror')}
                className={`py-1 text-[10px] font-mono rounded font-bold uppercase tracking-wider transition-colors ${
                  kaleidoscopeMode === 'mirror'
                    ? `${tc.bg} text-white shadow-sm font-black`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reflecting Mirror
              </button>
              <button
                type="button"
                onClick={() => setKaleidoscopeMode('spin')}
                className={`py-1 text-[10px] font-mono rounded font-bold uppercase tracking-wider transition-colors ${
                  kaleidoscopeMode === 'spin'
                    ? `${tc.bg} text-white shadow-sm font-black`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Rotational Spin
              </button>
            </div>
          </div>

          {/* Mirror Axis Selection for Reflections */}
          {kaleidoscopeMode === 'mirror' && (
            <div className="space-y-1.5 animate-fadeIn">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Mirror Reflection Axis</span>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setKaleidoscopeMirrorAxis('horizontal')}
                  className={`py-1 text-[10px] font-mono rounded font-bold uppercase tracking-wider transition-colors ${
                    kaleidoscopeMirrorAxis === 'horizontal'
                       ? `${tc.bg} text-white shadow-sm font-black`
                       : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Horizontal mirror (reflection across X axis)"
                >
                  Horizontal (X)
                </button>
                <button
                  type="button"
                  onClick={() => setKaleidoscopeMirrorAxis('vertical')}
                  className={`py-1 text-[10px] font-mono rounded font-bold uppercase tracking-wider transition-colors ${
                    kaleidoscopeMirrorAxis === 'vertical'
                       ? `${tc.bg} text-white shadow-sm font-black`
                       : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vertical mirror (reflection across Y axis)"
                >
                  Vertical (Y)
                </button>
              </div>
            </div>
          )}

          {/* Double mirror inside segment option */}
          {kaleidoscopeMode === 'mirror' && (
            <div className="space-y-1.5 animate-fadeIn p-2.5 rounded-lg bg-indigo-950/10 border border-indigo-900/30">
              <div className="flex items-center justify-between">
                <div className="flex flex-col pr-2">
                  <span className="font-mono text-[10px] text-slate-300 uppercase tracking-wide font-semibold">✨ Двустороннее Отражение (Double Mirror)</span>
                  <span className="text-[9px] text-slate-500 font-sans">Отрендерить по две зеркальные фигуры на каждый сектор калейдоскопа</span>
                </div>
                <button
                  type="button"
                  onClick={() => setKaleidoscopeDoubleMirror(!kaleidoscopeDoubleMirror)}
                  className={`text-[9.5px] font-mono px-2.5 py-1 rounded border transition active:scale-95 flex items-center gap-1 cursor-pointer shrink-0 ${
                    kaleidoscopeDoubleMirror 
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold' 
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${kaleidoscopeDoubleMirror ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span>{kaleidoscopeDoubleMirror ? 'ВКЛ' : 'ВЫКЛ'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Symmetry Source Layer Selector */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Target Source Layer</span>
            <select
              value={kaleidoscopeSource}
              onChange={(e) => setKaleidoscopeSource(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="draw">🎨 Interactive Brush Painting</option>
              <option value="lsystem">🌿 L-System Fractal Grammar</option>
              <option value="ca">🟩 2D Cellular Automata Grid</option>
              <option value="combined">🌀 Combined Multi-Layer / Смешанный режим</option>
              <option value="pen">🖊️ Symmetric Pen Vector Lines</option>
            </select>
          </div>

          {/* Element rotation and anchor configuration */}
          <div className="border-t border-slate-900/60 pt-4 space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-450">Element Transform / Вращение элемента</h4>
            
            {/* Element Rotation slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">Rotation Angle / Угол поворота</span>
                <span className="text-emerald-450 font-bold">{kaleidoscopeElementRotation}°</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={kaleidoscopeElementRotation}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const snaps = [0, 90, 180, 270, 360];
                    const snapThreshold = 8;
                    let snapped = val;
                    for (const snap of snaps) {
                      if (Math.abs(val - snap) <= snapThreshold) {
                        snapped = snap;
                        break;
                      }
                    }
                    setKaleidoscopeElementRotation(snapped);
                  }}
                  className="flex-1 h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <input
                  type="number"
                  min={0}
                  max={360}
                  value={kaleidoscopeElementRotation}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(360, parseInt(e.target.value) || 0));
                    setKaleidoscopeElementRotation(val);
                  }}
                  className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 font-mono text-[11px] text-emerald-400 text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
              {/* Presets and snapping for element rotation */}
              <div className="flex justify-between gap-1">
                {[0, 90, 180, 270, 360].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setKaleidoscopeElementRotation(deg)}
                    className={`flex-1 py-0.5 rounded font-mono text-[9px] border transition-all ${
                      kaleidoscopeElementRotation === deg
                        ? 'bg-emerald-500/20 text-emerald-300 shadow-sm font-bold border-emerald-500/30'
                        : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white hover:border-slate-800'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Pivot/Anchor point selection */}
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Pivot/Anchor Axis / Точка вращения</span>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/60">
                {(['center', 'origin', 'left', 'right', 'top', 'bottom'] as const).map((anchor) => (
                  <button
                    key={anchor}
                    type="button"
                    onClick={() => setKaleidoscopeElementAnchor(anchor)}
                    className={`py-1 text-[9px] font-mono rounded font-bold uppercase tracking-wide transition-colors ${
                      kaleidoscopeElementAnchor === anchor
                        ? `${tc.bg} text-white shadow-sm font-black`
                        : 'text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    {anchor}
                  </button>
                ))}
              </div>
            </div>

            {/* Flip Horizontally Toggle */}
            <div className="space-y-1.5 pt-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">Reflect Object / Отражение</span>
              <button
                type="button"
                onClick={() => setFlipHorizontal(!flipHorizontal)}
                className={`w-full py-2 px-3 rounded-lg font-mono text-[11px] border flex items-center justify-between transition-all ${
                  flipHorizontal
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35 font-bold shadow-sm'
                    : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white hover:border-slate-800'
                }`}
              >
                <span>Flip Horizontally / Отразить по горизонтали</span>
                <span className={`px-2 py-0.5 rounded text-[9px] ${flipHorizontal ? 'bg-emerald-500 text-black font-extrabold' : 'bg-slate-900 text-slate-500'}`}>
                  {flipHorizontal ? 'ACTIVE' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Draw Manual */}
          {kaleidoscopeSource === 'draw' && (
            <div className="bg-slate-950/45 border border-slate-800/70 p-3 rounded-lg text-[10px] leading-relaxed text-slate-400 space-y-1">
              <div className="text-white font-bold mb-1">🖌️ Brush Paint guides:</div>
              <div>• <strong className="text-indigo-400">Left-Click & Drag</strong> — Draw brush lines instantly reflected real-time into {kaleidoscopeSegments} wedges!</div>
              <div>• Works with <strong className="text-emerald-400">Render Formula</strong> styles (Spectral Glow, Neon, quantum dots, etc.) chosen below!</div>
            </div>
          )}

          {/* Quick Undo & Clear Buttons for custom paint layer */}
          {(kaleidoscopeSource === 'draw' || kaleidoscopeSource === 'pen') && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onPenUndo}
                className="py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] leading-tight font-mono rounded transition active:scale-95"
              >
                Undo Stroke
              </button>
              <button
                type="button"
                onClick={onPenClear}
                className="py-1.5 bg-rose-950/20 border border-rose-900/30 text-rose-350 hover:bg-rose-900/40 text-[10px] leading-tight font-mono rounded transition active:scale-95"
              >
                Clear Paint
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}

      {/* SECTION: VISUAL STYLE & FILTER OVERLAYS */}
      <div className="border-b border-slate-800/80 p-5">
        <div 
          className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center justify-between cursor-pointer select-none group"
          onClick={() => toggleSection('viewport')}
          onDoubleClick={() => toggleSection('viewport')}
          title="Двойной клик или клик для сворачивания / Double-click or click to collapse"
        >
          <div className="flex items-center gap-1.5 group-hover:text-slate-300 transition-colors font-mono">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Viewport Styling / Камера и Рендер</span>
          </div>
          <span className="text-slate-500 group-hover:text-slate-350 transition-colors">
            {collapsed.viewport ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed.viewport && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden space-y-4"
            >

        {/* Style Dropdown */}
        {mode !== 'ca' && (
          <div className="space-y-1.5">
            <span className="font-mono text-xs text-slate-400 block">Render Formula</span>
            <select
              value={drawStyle}
              onChange={(e) => setDrawStyle(e.target.value as DrawStyle)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="lines">Prism Lines (Classic)</option>
              <option value="glow">Spectral Blur (Glow)</option>
              <option value="dots">Sub-atomic Quantum Dots</option>
              <option value="gradient">Linear Gradient Vector</option>
              <option value="neon">Cosmic Cyber Neon</option>
              <option value="extrude">Solid Isometric Extrude 3D</option>
              <option value="silhouette">Alchemy Ink Silhouettes (Illustrative)</option>
            </select>
          </div>
        )}

        {/* Extrusion Parameters */}
        {drawStyle === 'extrude' && mode !== 'ca' && (
          <div className="bg-slate-950/40 border border-slate-800/40 p-3 rounded-lg space-y-3.5 animate-fadeIn">
            {/* Extrude Depth */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-slate-400">Extrude Depth</span>
                <span className="text-white font-bold">{extrudeDepth}</span>
              </div>
              <input
                type="range"
                min={1}
                max={40}
                step={0.5}
                value={extrudeDepth}
                onChange={(e) => setExtrudeDepth(parseFloat(e.target.value))}
                className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Extrude Angle */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-slate-400">Isometric Ray Angle</span>
                <span className="text-white font-bold">{extrudeAngle}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={extrudeAngle}
                onChange={(e) => setExtrudeAngle(parseInt(e.target.value))}
                className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Extrude Back width */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-slate-400">Sliver Back Width</span>
                <span className="text-white font-bold">{extrudeLw} px</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={8}
                step={0.1}
                value={extrudeLw}
                onChange={(e) => setExtrudeLw(parseFloat(e.target.value))}
                className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Extrude Connect width */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-slate-400">Sliver Wall Joint</span>
                <span className="text-white font-bold">{extrudeConn} px</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={8}
                step={0.1}
                value={extrudeConn}
                onChange={(e) => setExtrudeConn(parseFloat(e.target.value))}
                className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Palettes */}
        <div className="space-y-3">
          {/* Color Separation Switch */}
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-900 font-mono text-[9px]">
            <span className="text-slate-400 font-semibold uppercase">РАЗДЕЛЬНЫЕ ЦВЕТА СИСТЕМ / SEPARATE COLORS</span>
            <button
              type="button"
              onClick={() => {
                setSeparateColors(!separateColors);
                setOpenPalettePicker(false);
              }}
              className={`px-2 py-1 rounded transition-all border font-bold text-[9px] ${
                separateColors 
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {separateColors ? 'ВКЛ / ON' : 'ВЫКЛ / OFF'}
            </button>
          </div>

          {separateColors && (
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-0.5 rounded border border-slate-900 font-mono text-[9px] text-center">
              <button
                type="button"
                onClick={() => {
                  setColorTarget('lsystem');
                  setOpenPalettePicker(false);
                }}
                className={`py-1.5 rounded transition-all ${colorTarget === 'lsystem' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/35' : 'text-slate-500 hover:text-white border border-transparent'}`}
              >
                L-System / L-Система
              </button>
              <button
                type="button"
                onClick={() => {
                  setColorTarget('ca');
                  setOpenPalettePicker(false);
                }}
                className={`py-1.5 rounded transition-all ${colorTarget === 'ca' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/35' : 'text-slate-500 hover:text-white border border-transparent'}`}
              >
                Automata / Автомат
              </button>
            </div>
          )}

          <div className="flex justify-between items-center pb-0.5">
            <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase block">
              {separateColors 
                ? (colorTarget === 'lsystem' ? 'L-System colors / Цвета L-системы' : 'Automata colors / Цвета автомата')
                : 'Fluorescent Color Array'
              }
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(PALETTES).map(([name, colors]) => (
              <button
                key={name}
                onClick={() => {
                  currentSetActivePalette(name);
                  setOpenPalettePicker(false);
                }}
                className={`w-5 h-5 rounded relative flex items-center justify-center border transition-all hover:scale-110 ${
                  currentActivePalette === name 
                    ? 'border-white scale-105 ring-2 ring-indigo-500/30' 
                    : 'border-slate-800'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[colors.length - 1]} 100%)`
                }}
                title={name}
              />
            ))}

            {/* Custom Palette Option */}
            <button
              onClick={() => {
                currentSetActivePalette('custom');
                setOpenPalettePicker(!openPalettePicker);
                setOpenBgPicker(false);
              }}
              className={`w-5 h-5 rounded relative flex items-center justify-center border transition-all hover:scale-110 ${
                currentActivePalette === 'custom'
                  ? 'border-white scale-105 ring-2 ring-purple-500'
                  : 'border-dashed border-slate-700 bg-slate-950 text-slate-500 hover:text-white hover:border-slate-500'
              }`}
              style={{
                background: `linear-gradient(135deg, ${currentCustomPalette[0]} 0%, ${currentCustomPalette[currentCustomPalette.length - 1]} 100%)`
              }}
              title="Настроить свой цвет градиента"
            >
              <Plus className="w-3 h-3 text-white absolute bg-black/60 rounded-full p-0.5" />
            </button>
          </div>

          {/* Custom Palette Settings Dropdown Portal */}
          {openPalettePicker && currentActivePalette === 'custom' && (() => {
            const currentStepIndex = Math.min(activePaletteStep, currentCustomPalette.length - 1);
            return (
              <div className="bg-slate-950 border border-indigo-500/30 rounded-lg p-3 space-y-3.5 shadow-xl animate-fadeIn mt-2 text-slate-200">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-900 font-mono text-[10px]">
                  <span className="text-indigo-400 font-bold block">
                    ✨ {separateColors && colorTarget === 'lsystem' ? 'L-SYSTEM' : separateColors && colorTarget === 'ca' ? 'AUTOMATA' : 'SHARED'} COLOR BUILDER
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenPalettePicker(false)}
                    className="text-slate-500 hover:text-white text-xs font-bold font-mono"
                  >
                    ✕
                  </button>
                </div>

                {/* Palette stops selectors */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Palette Stops ({currentCustomPalette.length} steps)</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {currentCustomPalette.map((col, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePaletteStep(idx)}
                        className={`h-7 w-10 rounded relative border transition-all flex items-center justify-center overflow-hidden ${
                          currentStepIndex === idx
                            ? 'border-white scale-105 ring-1 ring-indigo-500'
                            : 'border-slate-800'
                        }`}
                        style={{ backgroundColor: col }}
                        title={`Step #${idx + 1}`}
                      >
                        <span className="text-[9px] bg-black/60 text-slate-300 font-mono font-bold rounded px-1 z-10">
                          #{idx + 1}
                        </span>
                      </button>
                    ))}
                    {currentCustomPalette.length < 8 && (
                      <button
                        type="button"
                        onClick={() => {
                          const lastColor = currentCustomPalette[currentCustomPalette.length - 1] || '#ffffff';
                          const newPalette = [...currentCustomPalette, lastColor];
                          currentSetCustomPalette(newPalette);
                          setActivePaletteStep(newPalette.length - 1);
                        }}
                        className="w-7 h-7 rounded border border-dashed border-slate-700 bg-slate-950 text-slate-500 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center"
                        title="Добавить стоп"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Editing palette color */}
                <div className="space-y-2 bg-slate-900/40 p-2 border border-slate-900/60 rounded">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-400">Editing Step <strong className="text-indigo-400">#{currentStepIndex + 1}</strong></span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{currentCustomPalette[currentStepIndex]}</span>
                      {currentCustomPalette.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPalette = currentCustomPalette.filter((_, idx) => idx !== currentStepIndex);
                            currentSetCustomPalette(newPalette);
                            setActivePaletteStep(Math.max(0, currentStepIndex - 1));
                          }}
                          className="text-red-400 hover:text-red-300 border border-red-950 bg-red-950/20 hover:bg-red-950/40 p-1 rounded transition flex items-center justify-center cursor-pointer"
                          title="Удалить этот цвет"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Draw rectangular ColorPad */}
                  <ColorPad
                    key={currentStepIndex}
                    color={currentCustomPalette[currentStepIndex]}
                    onChange={(newHex) => {
                      const newPal = [...currentCustomPalette];
                      newPal[currentStepIndex] = newHex;
                      currentSetCustomPalette(newPal);
                    }}
                  />

                  {/* Bottom line controls */}
                  <div className="flex items-center justify-between gap-1 mt-1 border-t border-slate-800/40 pt-1.5">
                    <div className="flex gap-1 items-center">
                      <label className="relative inline-flex inline-flex items-center cursor-pointer bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[9px] font-mono text-slate-400 hover:text-white transition">
                        <span>🎨 Выбрать</span>
                        <input
                          type="color"
                          value={currentCustomPalette[currentStepIndex]}
                          onChange={(e) => {
                            const newPal = [...currentCustomPalette];
                            newPal[currentStepIndex] = e.target.value;
                            currentSetCustomPalette(newPal);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                      <input
                        type="text"
                        value={currentCustomPalette[currentStepIndex]}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                            const newPal = [...currentCustomPalette];
                            newPal[currentStepIndex] = val;
                            currentSetCustomPalette(newPal);
                          }
                        }}
                        className="w-14 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[10px] font-mono text-white text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {currentCustomPalette.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const c1 = currentCustomPalette[0];
                          const cEnd = currentCustomPalette[currentCustomPalette.length - 1];
                          const startColor = hexToRgb(c1);
                          const endColor = hexToRgb(cEnd);
                          if (startColor && endColor) {
                            const newPal = [c1];
                            const steps = currentCustomPalette.length;
                            for (let i = 1; i < steps - 1; i++) {
                              const ratio = i / (steps - 1);
                              const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
                              const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
                              const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
                              newPal.push(rgbToHex(r, g, b));
                            }
                            newPal.push(cEnd);
                            currentSetCustomPalette(newPal);
                          }
                        }}
                        className="px-1.5 py-1 bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 hover:bg-indigo-900/40 hover:text-white font-mono text-[9px] rounded transition cursor-pointer"
                        title="Интерполировать промежуточные цвета между #1 и последним"
                      >
                        ⚡ Градиент
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Master Opacity */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-slate-400">Drawing Opacity / Прозрачность</span>
            <span className="text-white font-bold">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1.0}
            step={0.01}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full h-[3px] bg-slate-950 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: tc.color }}
          />
        </div>

        {/* Background Select */}
        <div className="space-y-2">
          <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase block">Workspace Canvas Medium / Заливка фона</span>
          
          {/* Fill Type Buttons */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded border border-slate-900 font-mono text-[9px] text-center">
            <button
              type="button"
              onClick={() => setBgType('solid')}
              className={`py-1 rounded transition-all ${bgType === 'solid' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              Solid
            </button>
            <button
              type="button"
              onClick={() => setBgType('linear')}
              className={`py-1 rounded transition-all ${bgType === 'linear' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              Linear
            </button>
            <button
              type="button"
              onClick={() => setBgType('radial')}
              className={`py-1 rounded transition-all ${bgType === 'radial' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              Radial
            </button>
          </div>

          {bgType === 'solid' ? (
            <div className="flex gap-2">
              {BG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setActiveBg(color);
                    setOpenBgPicker(false);
                  }}
                  className={`w-5 h-5 rounded relative flex items-center justify-center border transition-all hover:scale-110 ${
                    activeBg === color 
                      ? 'border-white scale-105 ring-2 ring-indigo-500/30' 
                      : 'border-transparent'
                  }`}
                  style={{ 
                    backgroundColor: color,
                    border: color === '#ffffff' ? '1px solid #444' : '1px solid #222'
                  }}
                  title={color}
                />
              ))}

              {/* Custom Background Option */}
              <button
                onClick={() => {
                  setOpenBgPicker(!openBgPicker);
                  setOpenPalettePicker(false);
                }}
                className={`w-5 h-5 rounded relative flex items-center justify-center border transition-all hover:scale-110 ${
                  !BG_COLORS.includes(activeBg) || openBgPicker
                    ? 'border-white scale-105 ring-2 ring-indigo-500/30'
                    : 'border-dashed border-slate-700 bg-slate-950 text-slate-500 hover:text-white'
                }`}
                style={{
                  backgroundColor: !BG_COLORS.includes(activeBg) ? activeBg : '#111122',
                }}
                title="Настроить свой цвет холста"
              >
                <Plus className="w-3 h-3 text-white absolute bg-black/60 rounded-full p-0.5" />
              </button>
            </div>
          ) : (
            /* Gradient Controls starting with 2 customizable colors & optional angle for linear */
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 space-y-3 shadow-xl animate-fadeIn">
              <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-900 pb-1.5">
                <span className="text-indigo-400 font-bold uppercase">🌈 Gradient Settings / Градиент</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Color 1 */}
                <div className="space-y-1">
                  <span className="font-mono text-[9px] text-slate-500 block">Color 1</span>
                  <div className="flex items-center gap-1.5 bg-slate-900/40 p-1 px-2 border border-slate-900 rounded">
                    <input
                      type="color"
                      value={bgGradientColor1}
                      onChange={(e) => setBgGradientColor1(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border border-slate-800 bg-transparent"
                    />
                    <input
                      type="text"
                      value={bgGradientColor1}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          setBgGradientColor1(val);
                        }
                      }}
                      className="w-16 bg-slate-950 border border-slate-800 rounded text-[9.5px] font-mono text-white text-center py-0.5 uppercase focus:outline-none focus:border-indigo-500 focus:text-white"
                    />
                  </div>
                </div>

                {/* Color 2 */}
                <div className="space-y-1">
                  <span className="font-mono text-[9px] text-slate-500 block">Color 2</span>
                  <div className="flex items-center gap-1.5 bg-slate-900/40 p-1 px-2 border border-slate-900 rounded">
                    <input
                      type="color"
                      value={bgGradientColor2}
                      onChange={(e) => setBgGradientColor2(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border border-slate-800 bg-transparent"
                    />
                    <input
                      type="text"
                      value={bgGradientColor2}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          setBgGradientColor2(val);
                        }
                      }}
                      className="w-16 bg-slate-950 border border-slate-800 rounded text-[9.5px] font-mono text-white text-center py-0.5 uppercase focus:outline-none focus:border-indigo-500 focus:text-white"
                    />
                  </div>
                </div>
              </div>

              {bgType === 'linear' && (
                <div className="space-y-1.5 pt-1 border-t border-slate-900/80">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">Angle / Угол градиента</span>
                    <span className="text-white font-bold">{bgGradientAngle}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={bgGradientAngle}
                      onChange={(e) => setBgGradientAngle(parseInt(e.target.value))}
                      className="flex-1 h-[3px] bg-slate-950 rounded appearance-none cursor-pointer"
                      style={{ accentColor: tc.color }}
                    />
                  </div>
                </div>
              )}

              {/* Color Stop Positions / Распределение цвета */}
              <div className="space-y-3 pt-2.5 border-t border-slate-900/80">
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">Color 1 Position / Точка цвета 1</span>
                    <span className="text-white font-bold">{bgGradientStop1}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bgGradientStop1}
                      onChange={(e) => setBgGradientStop1(parseInt(e.target.value))}
                      className="flex-1 h-[3px] bg-slate-950 rounded appearance-none cursor-pointer"
                      style={{ accentColor: tc.color }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">Color 2 Position / Точка цвета 2</span>
                    <span className="text-white font-bold">{bgGradientStop2}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bgGradientStop2}
                      onChange={(e) => setBgGradientStop2(parseInt(e.target.value))}
                      className="flex-1 h-[3px] bg-slate-950 rounded appearance-none cursor-pointer"
                      style={{ accentColor: tc.color }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Background Settings Panel */}
          {openBgPicker && (
            <div className="bg-slate-950 border border-indigo-500/30 rounded-lg p-3 space-y-3.5 shadow-xl animate-fadeIn mt-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-900 font-mono text-[10px]">
                <span className="text-indigo-400 font-bold block">🌌 CUSTOM CANVA SPATIAL MEDIUM</span>
                <button
                  type="button"
                  onClick={() => setOpenBgPicker(false)}
                  className="text-slate-500 hover:text-white text-xs font-bold font-mono"
                >
                  ✕
                </button>
              </div>

              {/* Active Color Preview & Picker */}
              <div className="space-y-2 bg-slate-900/40 p-2 border border-slate-900/60 rounded">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-400">Фоновый цвет</span>
                  <span className="text-white font-bold">{activeBg}</span>
                </div>

                {/* Advanced Color Picker Matrix UI */}
                <ColorPad
                  color={BG_COLORS.includes(activeBg) ? '#0d0d0d' : activeBg}
                  onChange={(newHex) => {
                    setActiveBg(newHex);
                  }}
                />

                {/* Native colorpicker fallback */}
                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-800/40">
                  <div className="flex gap-1 items-center w-full">
                    <label className="relative inline-flex items-center cursor-pointer bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[9px] font-mono text-slate-400 hover:text-white transition">
                      <span>🎨 Выбрать</span>
                      <input
                        type="color"
                        value={BG_COLORS.includes(activeBg) ? '#0d0d0d' : activeBg}
                        onChange={(e) => {
                          setActiveBg(e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <input
                      type="text"
                      value={activeBg}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          setActiveBg(val);
                        }
                      }}
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-white text-center focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBg('#0d0d0d');
                        setOpenBgPicker(false);
                      }}
                      className="ml-auto px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 font-mono text-[9px] text-slate-400 hover:text-white rounded transition"
                    >
                      Сброс
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    )}
    </AnimatePresence>
  </div>



</aside>
  );
}
