/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { AppMode, CAType, DrawStyle, LSystemPreset, UITheme, CAShape } from './types';
import { THEME_MAP } from './utils/theme';
import { ESTABLISHED_PRESETS } from './data/presets';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import ArtCanvas from './components/ArtCanvas';
import { Compass, RotateCw, X, Download, Check, Image, Monitor, Smartphone, Maximize2, Sparkles } from 'lucide-react';

export default function App() {
  const [uiTheme, setUiTheme] = useState<UITheme>('indigo');
  const [uiAccentColor, setUiAccentColor] = useState<string>('#6366f1');
  const [uiBgColor, setUiBgColor] = useState<string>('#212121');
  const [uiOpacity, setUiOpacity] = useState<number>(0.85);
  const [kaleidoscopeMirrorAxis, setKaleidoscopeMirrorAxis] = useState<'horizontal' | 'vertical'>('horizontal');

  // Convert hex color to custom rgba
  const hexToRgbaStr = (hexColor: string, alpha: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (!result) return `rgba(33, 33, 33, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // L-System parameters
  const [mode, setMode] = useState<AppMode>('lsystem');
  const handleSetMode = (m: AppMode) => {
    if (m === 'kaleidoscope') {
      setKaleidoscopeSegments(2);
    }
    setMode(m);
  };
  const [axiom, setAxiom] = useState<string>('F');
  const [rules, setRules] = useState<{ from: string; to: string }[]>([
    { from: 'F', to: 'FF+[+F-F-F]-[-F+F+F]' }
  ]);
  const [iterations, setIterations] = useState<number>(4);
  const [budIterations, setBudIterations] = useState<number[]>([0]);
  const [angle, setAngle] = useState<number>(25);
  const [length, setLength] = useState<number>(6);
  const [decay, setDecay] = useState<number>(0.65);
  const [lineWidth, setLineWidth] = useState<number>(1.5);
  const [stochastic, setStochastic] = useState<number>(0);
  const [seed, setSeed] = useState<number>(42);

  // Cellular Automata parameters
  const [caType, setCaType] = useState<CAType>('rule');
  const [caRule, setCaRule] = useState<number>(30);
  const [caRule2, setCaRule2] = useState<number>(90);
  const [caBlendMode, setCaBlendMode] = useState<string>('none');
  const [caSeedType, setCaSeedType] = useState<string>('single');
  const [caSymmetry, setCaSymmetry] = useState<string>('none');
  const [cellSize, setCellSize] = useState<number>(4);
  const [caSpeed, setCaSpeed] = useState<number>(30);
  const [caDensity, setCaDensity] = useState<number>(0.35);

  const [caDrawMode, setCaDrawMode] = useState<'grid' | 'shapes'>('grid');
  const [caActiveTool, setCaActiveTool] = useState<'freehand' | 'rectangle' | 'triangle' | 'circle' | 'move'>('freehand');
  const [caShapes, setCaShapes] = useState<CAShape[]>([]);
  const [selectedCAShapeId, setSelectedCAShapeId] = useState<string | null>(null);

  // Visual parameters
  const [drawStyle, setDrawStyle] = useState<DrawStyle>('lines');
  const [extrudeDepth, setExtrudeDepth] = useState<number>(8);
  const [extrudeAngle, setExtrudeAngle] = useState<number>(45);
  const [extrudeLw, setExtrudeLw] = useState<number>(0.6);
  const [extrudeConn, setExtrudeConn] = useState<number>(0.5);

  const [activePalette, setActivePalette] = useState<string>('white');
  const [customPalette, setCustomPalette] = useState<string[]>(['#ff5500', '#00aaff']);
  const [separateColors, setSeparateColors] = useState<boolean>(false);
  const [lsActivePalette, setLsActivePalette] = useState<string>('neon');
  const [lsCustomPalette, setLsCustomPalette] = useState<string[]>(['#00f5ff', '#ff00a0']);
  const [caActivePalette, setCaActivePalette] = useState<string>('fire');
  const [caCustomPalette, setCaCustomPalette] = useState<string[]>(['#ff3300', '#ffaa00']);
  const [activeBg, setActiveBg] = useState<string>('#0d0d0d');
  const [opacity, setOpacity] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [smoothCurves, setSmoothCurves] = useState<boolean>(false);

  // Pen parameters
  const [penDepth, setPenDepth] = useState<number>(2);
  const [penLen, setPenLen] = useState<number>(40);
  const [adjustDrawn, setAdjustDrawn] = useState<boolean>(true);

  // Kaleidoscope parameters
  const [kaleidoscopeSegments, setKaleidoscopeSegments] = useState<number>(2);
  const [kaleidoscopeMode, setKaleidoscopeMode] = useState<'mirror' | 'spin'>('mirror');
  const [kaleidoscopeDoubleMirror, setKaleidoscopeDoubleMirror] = useState<boolean>(false);
  const [kaleidoscopeSource, setKaleidoscopeSource] = useState<'draw' | 'lsystem' | 'ca' | 'combined' | 'pen'>('draw');
  const [kaleidoscopeElementRotation, setKaleidoscopeElementRotation] = useState<number>(0);
  const [kaleidoscopeElementAnchor, setKaleidoscopeElementAnchor] = useState<'center' | 'left' | 'right' | 'top' | 'bottom' | 'origin'>('center');

  // Element transform modification
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(false);

  // Gradient background states
  const [bgType, setBgType] = useState<'solid' | 'linear' | 'radial'>('solid');
  const [bgGradientColor1, setBgGradientColor1] = useState<string>('#0d0d1e');
  const [bgGradientColor2, setBgGradientColor2] = useState<string>('#1e0d2d');
  const [bgGradientAngle, setBgGradientAngle] = useState<number>(135);
  const [bgGradientStop1, setBgGradientStop1] = useState<number>(0);
  const [bgGradientStop2, setBgGradientStop2] = useState<number>(100);

  // App UI Helpers
  const [infoText, setInfoText] = useState<string>('Initializing systems...');
  const [animating, setAnimating] = useState<boolean>(false);
  const [generateKey, setGenerateKey] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Callback triggers for Pen system to be executed inside Sidebar
  const penUndoRef = useRef<(() => void) | null>(null);
  const penClearRef = useRef<(() => void) | null>(null);

  // Ref to canvas for Snapshot PNG
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportPngRef = useRef<((options: { ratio: string; scale: number; transparent: boolean; fitContent: boolean }) => void) | null>(null);

  // High-res Export States
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportRatio, setExportRatio] = useState<string>('viewport');
  const [exportScale, setExportScale] = useState<number>(2);
  const [exportTransparent, setExportTransparent] = useState<boolean>(false);
  const [exportFitContent, setExportFitContent] = useState<boolean>(true);

  // --- ACTIONS ---

  const handleApplyPreset = (preset: LSystemPreset) => {
    setAxiom(preset.axiom);
    setIterations(preset.iterations);
    setBudIterations([0]);
    setAngle(preset.angle);
    setLength(preset.length);
    setDecay(preset.decay);
    setRules(preset.rules);
    setPenDepth(Math.max(1, Math.min(6, preset.iterations)));
    setPenLen(Math.max(5, Math.min(200, Math.round(preset.length * 8))));
  };

  const handleRandomise = () => {
    // Selection of random preset
    const preset = ESTABLISHED_PRESETS[Math.floor(Math.random() * ESTABLISHED_PRESETS.length)];
    handleApplyPreset(preset);

    // Dynamic tweak
    const randAngle = Math.round(preset.angle + (Math.random() - 0.5) * 20);
    setAngle(Math.max(1, Math.min(180, randAngle)));

    const randDecay = Math.round((preset.decay + (Math.random() - 0.5) * 0.2) * 100) / 100;
    setDecay(Math.max(0.3, Math.min(1.0, randDecay)));

    // Choose random palette colors
    const palettesKeys = ['white', 'neon', 'fire', 'forest', 'cosmic', 'mono'];
    setActivePalette(palettesKeys[Math.floor(Math.random() * palettesKeys.length)]);
    setSeed(Math.floor(Math.random() * 10000));

    // If CA selected, choose random Wolfram rule
    if (caType === 'rule') {
      setCaRule(Math.floor(Math.random() * 256));
    }
  };

  // Synchronize dynamic style states with preset skins when changed
  useEffect(() => {
    if (uiTheme !== 'custom') {
      const preset = THEME_MAP[uiTheme];
      if (preset && preset.color && !preset.color.startsWith('var(')) {
        setUiAccentColor(preset.color);
        setUiBgColor('#212121'); // Beautiful, high contrast rich dark space background
        setUiOpacity(0.85);
      }
    }
  }, [uiTheme]);

  // Continuous loop that increases angle
  useEffect(() => {
    if (!animating) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let localAngle = angle;
    const animateLoop = () => {
      localAngle += 0.3;
      if (localAngle > 180) localAngle = 1;
      setAngle(parseFloat(localAngle.toFixed(1)));
      animationFrameRef.current = requestAnimationFrame(animateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(animateLoop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animating]);

  const handleToggleAnimation = () => {
    setAnimating(!animating);
  };

  // Keyboard shortcut listener for layout-independent F key (for Fullscreen)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea or select
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || activeElement.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

      // 'F' key layout-independent check (using e.code === 'KeyF' or fallback characters for Russian text layout)
      const keyLower = e.key ? e.key.toLowerCase() : '';
      if (e.code === 'KeyF' || keyLower === 'f' || e.key === 'а' || e.key === 'А') {
        e.preventDefault();
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        } catch (err) {
          console.error('Fullscreen toggle failed:', err);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, []);

  const handleSavePng = () => {
    setShowExportModal(true);
  };

  // Immediate full recompute of geometries/cellular states
  const handleGenerate = () => {
    if (mode === 'pen') return;
    setGenerateKey(k => k + 1);
  };

  return (
    <div className="h-screen bg-[#07070a] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* REAL-TIME FULL CUSTOM COLOR & ACCENT INTERFACE THEME STYLESHEET OVERRIDES */}
      <style>{`
        :root {
          --ui-accent: ${uiAccentColor};
          --ui-bg-base: ${uiBgColor};
          --ui-opacity: ${uiOpacity};
          --ui-panel-bg-final: ${hexToRgbaStr(uiBgColor, uiOpacity)};
          --ui-border-final: ${hexToRgbaStr(uiAccentColor, 0.2)};
          --ui-accent-hover: ${hexToRgbaStr(uiAccentColor, 0.9)};
          --ui-accent-light: ${hexToRgbaStr(uiAccentColor, 0.12)};
          --ui-accent-border: ${hexToRgbaStr(uiAccentColor, 0.3)};
        }

        /* Support custom classes mapped to state */
        .custom-text { color: var(--ui-accent) !important; }
        .custom-text-light { color: ${hexToRgbaStr(uiAccentColor, 0.8)} !important; }
        .hover\\:custom-text:hover { color: var(--ui-accent) !important; }
        .custom-bg { background-color: var(--ui-accent) !important; }
        .hover\\:custom-bg-hover:hover { background-color: var(--ui-accent-hover) !important; }
        .custom-bg-light { background-color: var(--ui-accent-light) !important; }
        .custom-border { border-color: var(--ui-accent-border) !important; }
        .focus\\:custom-border-focus:focus { border-color: var(--ui-accent) !important; }
        .hover\\:custom-border-hover:hover { border-color: var(--ui-accent) !important; }
        .custom-accent { accent-color: var(--ui-accent) !important; }
        .custom-ring { box-shadow: 0 0 0 3px ${hexToRgbaStr(uiAccentColor, 0.3)} !important; }

        /* Real-time skin overrides for the rest of the application UI! */
        #panel, .bg-slate-900 {
          background-color: var(--ui-panel-bg-final) !important;
          border-color: var(--ui-border-final) !important;
        }

        header, .bg-slate-950\\/80 {
          background-color: var(--ui-panel-bg-final) !important;
          border-color: var(--ui-border-final) !important;
        }

        #panel .bg-slate-950, 
        #panel .bg-slate-900, 
        #panel .bg-slate-900\\/40, 
        #panel .bg-slate-950\\/40, 
        #panel .bg-slate-950\\/85,
        #panel .bg-slate-950\\/90 {
          background-color: ${hexToRgbaStr(uiBgColor, Math.max(0.1, uiOpacity * 0.7))} !important;
          border-color: var(--ui-border-final) !important;
        }

        /* Input field highlights & selections */
        input[type="text"], select, textarea {
          border-color: var(--ui-border-final) !important;
        }
        input[type="text"]:focus, select:focus {
          border-color: var(--ui-accent) !important;
          box-shadow: 0 0 0 1px var(--ui-accent) !important;
        }
        
        /* Specific slider rules */
        input[type="range"]::-webkit-slider-thumb {
          background: var(--ui-accent) !important;
        }
        input[type="range"]::-moz-range-thumb {
          background: var(--ui-accent) !important;
        }
      `}</style>

      {/* HEADER CONTROLS NAVIGATION */}
      <Toolbar
        mode={mode}
        setMode={handleSetMode}
        animating={animating}
        onToggleAnimation={handleToggleAnimation}
        onRandomise={handleRandomise}
        onGenerate={handleGenerate}
        onSavePng={handleSavePng}
        uiTheme={uiTheme}
        setUiTheme={setUiTheme}
      />

      {/* CORE WORKSPACE SPLITTER */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CENTER INTERACTIVE DRAWING FRAME */}
        <div className="flex-1 h-full flex flex-col relative overflow-hidden bg-slate-950">
          <ArtCanvas
            mode={mode}
            axiom={axiom}
            rules={rules}
            iterations={iterations}
            budIterations={budIterations}
            angle={angle}
            length={length}
            decay={decay}
            lineWidth={lineWidth}
            stochastic={stochastic}
            seed={seed}
            smoothCurves={smoothCurves}
            caType={caType}
            caRule={caRule}
            caRule2={caRule2}
            caBlendMode={caBlendMode}
            caSeedType={caSeedType}
            caSymmetry={caSymmetry}
            cellSize={cellSize}
            caSpeed={caSpeed}
            caDensity={caDensity}
            drawStyle={drawStyle}
            extrudeDepth={extrudeDepth}
            extrudeAngle={extrudeAngle}
            extrudeLw={extrudeLw}
            extrudeConn={extrudeConn}
            activePalette={activePalette}
            customPalette={customPalette}
            separateColors={separateColors}
            lsActivePalette={lsActivePalette}
            lsCustomPalette={lsCustomPalette}
            caActivePalette={caActivePalette}
            caCustomPalette={caCustomPalette}
            activeBg={activeBg}
            bgType={bgType}
            bgGradientColor1={bgGradientColor1}
            bgGradientColor2={bgGradientColor2}
            bgGradientAngle={bgGradientAngle}
            bgGradientStop1={bgGradientStop1}
            bgGradientStop2={bgGradientStop2}
            opacity={opacity}
            rotation={rotation}
            scale={scale}
            setScale={setScale}
            penDepth={penDepth}
            penLen={penLen}
            adjustDrawn={adjustDrawn}
            generateKey={generateKey}
            canvasRef={canvasRef}
            setInfoText={setInfoText}
            penTriggerUndoRef={penUndoRef}
            penTriggerClearRef={penClearRef}
            exportPngRef={exportPngRef}
            kaleidoscopeSegments={kaleidoscopeSegments}
            kaleidoscopeMode={kaleidoscopeMode}
            kaleidoscopeDoubleMirror={kaleidoscopeDoubleMirror}
            kaleidoscopeSource={kaleidoscopeSource}
            uiTheme={uiTheme}
            kaleidoscopeMirrorAxis={kaleidoscopeMirrorAxis}
            kaleidoscopeElementRotation={kaleidoscopeElementRotation}
            kaleidoscopeElementAnchor={kaleidoscopeElementAnchor}
            flipHorizontal={flipHorizontal}

            caDrawMode={caDrawMode}
            setCaDrawMode={setCaDrawMode}
            caActiveTool={caActiveTool}
            setCaActiveTool={setCaActiveTool}
            caShapes={caShapes}
            setCaShapes={setCaShapes}
            selectedCAShapeId={selectedCAShapeId}
            setSelectedCAShapeId={setSelectedCAShapeId}

            setAxiom={setAxiom}
            setRules={setRules}
            setIterations={setIterations}
            setAngle={setAngle}
            setLength={setLength}
            setDecay={setDecay}
            setLineWidth={setLineWidth}
            setLsActivePalette={setLsActivePalette}
            setLsCustomPalette={setLsCustomPalette}
            setBudIterations={setBudIterations}
            setStochastic={setStochastic}
            setSeed={setSeed}
          />
        </div>

        {/* SIDE PANELS OPTIONS DOCK */}
        <Sidebar
          mode={mode}
          axiom={axiom}
          setAxiom={setAxiom}
          rules={rules}
          setRules={setRules}
          iterations={iterations}
          setIterations={setIterations}
          budIterations={budIterations}
          setBudIterations={setBudIterations}
          angle={angle}
          setAngle={setAngle}
          length={length}
          setLength={setLength}
          decay={decay}
          setDecay={setDecay}
          lineWidth={lineWidth}
          setLineWidth={setLineWidth}
          stochastic={stochastic}
          setStochastic={setStochastic}
          seed={seed}
          setSeed={setSeed}
          smoothCurves={smoothCurves}
          setSmoothCurves={setSmoothCurves}
          caType={caType}
          setCaType={setCaType}
          caRule={caRule}
          setCaRule={setCaRule}
          caRule2={caRule2}
          setCaRule2={setCaRule2}
          caBlendMode={caBlendMode}
          setCaBlendMode={setCaBlendMode}
          caSeedType={caSeedType}
          setCaSeedType={setCaSeedType}
          caSymmetry={caSymmetry}
          setCaSymmetry={setCaSymmetry}
          cellSize={cellSize}
          setCellSize={setCellSize}
          caSpeed={caSpeed}
          setCaSpeed={setCaSpeed}
          caDensity={caDensity}
          setCaDensity={setCaDensity}
          drawStyle={drawStyle}
          setDrawStyle={setDrawStyle}
          extrudeDepth={extrudeDepth}
          setExtrudeDepth={setExtrudeDepth}
          extrudeAngle={extrudeAngle}
          setExtrudeAngle={setExtrudeAngle}
          extrudeLw={extrudeLw}
          setExtrudeLw={setExtrudeLw}
          extrudeConn={extrudeConn}
          setExtrudeConn={setExtrudeConn}
          activePalette={activePalette}
          setActivePalette={setActivePalette}
          customPalette={customPalette}
          setCustomPalette={setCustomPalette}
          separateColors={separateColors}
          setSeparateColors={setSeparateColors}
          lsActivePalette={lsActivePalette}
          setLsActivePalette={setLsActivePalette}
          lsCustomPalette={lsCustomPalette}
          setLsCustomPalette={setLsCustomPalette}
          caActivePalette={caActivePalette}
          setCaActivePalette={setCaActivePalette}
          caCustomPalette={caCustomPalette}
          setCaCustomPalette={setCaCustomPalette}
          activeBg={activeBg}
          setActiveBg={setActiveBg}
          bgType={bgType}
          setBgType={setBgType}
          bgGradientColor1={bgGradientColor1}
          setBgGradientColor1={setBgGradientColor1}
          bgGradientColor2={bgGradientColor2}
          setBgGradientColor2={setBgGradientColor2}
          bgGradientAngle={bgGradientAngle}
          setBgGradientAngle={setBgGradientAngle}
          bgGradientStop1={bgGradientStop1}
          setBgGradientStop1={setBgGradientStop1}
          bgGradientStop2={bgGradientStop2}
          setBgGradientStop2={setBgGradientStop2}
          opacity={opacity}
          setOpacity={setOpacity}
          rotation={rotation}
          setRotation={setRotation}
          scale={scale}
          setScale={setScale}
          penDepth={penDepth}
          setPenDepth={setPenDepth}
          penLen={penLen}
          setPenLen={setPenLen}
          adjustDrawn={adjustDrawn}
          setAdjustDrawn={setAdjustDrawn}
          onPenUndo={() => penUndoRef.current?.()}
          onPenClear={() => penClearRef.current?.()}
          onApplyPreset={handleApplyPreset}
          triggerRecompute={handleGenerate}
          kaleidoscopeSegments={kaleidoscopeSegments}
          setKaleidoscopeSegments={setKaleidoscopeSegments}
          kaleidoscopeMode={kaleidoscopeMode}
          setKaleidoscopeMode={setKaleidoscopeMode}
          kaleidoscopeDoubleMirror={kaleidoscopeDoubleMirror}
          setKaleidoscopeDoubleMirror={setKaleidoscopeDoubleMirror}
          kaleidoscopeSource={kaleidoscopeSource}
          setKaleidoscopeSource={setKaleidoscopeSource}
          uiTheme={uiTheme}
          setUiTheme={setUiTheme}
          uiAccentColor={uiAccentColor}
          setUiAccentColor={setUiAccentColor}
          uiBgColor={uiBgColor}
          setUiBgColor={setUiBgColor}
          uiOpacity={uiOpacity}
          setUiOpacity={setUiOpacity}
          kaleidoscopeMirrorAxis={kaleidoscopeMirrorAxis}
          setKaleidoscopeMirrorAxis={setKaleidoscopeMirrorAxis}
          kaleidoscopeElementRotation={kaleidoscopeElementRotation}
          setKaleidoscopeElementRotation={setKaleidoscopeElementRotation}
          kaleidoscopeElementAnchor={kaleidoscopeElementAnchor}
          setKaleidoscopeElementAnchor={setKaleidoscopeElementAnchor}
          flipHorizontal={flipHorizontal}
          setFlipHorizontal={setFlipHorizontal}

          caDrawMode={caDrawMode}
          setCaDrawMode={setCaDrawMode}
          caActiveTool={caActiveTool}
          setCaActiveTool={setCaActiveTool}
          caShapes={caShapes}
          setCaShapes={setCaShapes}
          selectedCAShapeId={selectedCAShapeId}
          setSelectedCAShapeId={setSelectedCAShapeId}
        />
      </div>

      {/* BOTTOM CONSOLE STATUS AND METRICS LOG */}
      <footer className="bg-slate-950 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[10px] font-mono select-none shrink-0 z-10 text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-400 capitalize">Console Engine Operational</span>
        </div>
        <div className="truncate text-slate-400 pr-10 text-right">
          {infoText}
        </div>
      </footer>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              id="export-close-btn"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold font-mono text-white mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Параметры PNG экспорта</span>
            </h3>

            <div className="space-y-4 text-xs text-slate-300">
              {/* Aspect Ratio choice */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Соотношение сторон (Aspect Ratio)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'viewport', label: 'Экран', desc: 'Текущие пропорции' },
                    { id: '1:1', label: '1:1 Квадрат', desc: 'Симметричное арт-полотно' },
                    { id: '9:16', label: '9:16 Портрет', desc: 'Отлично для обоев телефона / деревьев' },
                    { id: '4:5', label: '4:5 Вертикальный', desc: 'Арт-пост' },
                    { id: '3:4', label: '3:4 Классика', desc: 'Художественная рама' },
                    { id: '16:9', label: '16:9 Пейзаж', desc: 'Широкоэкранные обои' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setExportRatio(r.id)}
                      className={`p-2.5 rounded-lg border transition text-left flex flex-col justify-between ${
                        exportRatio === r.id
                          ? 'border-emerald-500 bg-emerald-950/20 text-white'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                      id={`export-ratio-${r.id}`}
                    >
                      <span className="font-bold text-[10px] block">{r.label}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution / Scale factor sliders/buttons */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Качество разрешения (Размер)
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-lg">
                  {[
                    { val: 1, label: 'Standard', desc: '1X' },
                    { val: 1.5, label: 'HD Crisp', desc: '1.5X' },
                    { val: 3, label: '4K Master', desc: '3X' },
                    { val: 5, label: '8K Studio', desc: '5X' }
                  ].map((sc) => (
                    <button
                      key={sc.val}
                      onClick={() => setExportScale(sc.val)}
                      className={`py-1.5 rounded-md text-center transition flex flex-col items-center justify-center ${
                        exportScale === sc.val
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                      id={`export-scale-${sc.val}`}
                    >
                      <span className="text-[10px] font-mono leading-tight">{sc.label}</span>
                      <span className="text-[9px] opacity-60 font-medium">{sc.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame area / Crop range selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 font-mono">
                  Область кадрирования (Frame Area)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFitContent(true)}
                    className={`p-2.5 rounded-lg border transition text-left flex flex-col justify-between ${
                      exportFitContent
                        ? 'border-emerald-500 bg-emerald-950/20 text-white shadow-sm shadow-emerald-950/40'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                    id="export-mode-fit"
                  >
                    <span className="font-bold text-[10px] block text-emerald-400">✨ Весь рисунок (Auto-Fit)</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">
                      Масштабирует и центрирует весь рисунок в кадре, чтобы детали не терялись.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFitContent(false)}
                    className={`p-2.5 rounded-lg border transition text-left flex flex-col justify-between ${
                      !exportFitContent
                        ? 'border-emerald-500 bg-emerald-950/20 text-white shadow-sm shadow-emerald-950/40'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                    id="export-mode-viewport"
                  >
                    <span className="font-bold text-[10px] block text-indigo-400">🔍 Видимая область (Viewport)</span>
                    <span className="text-[9px] text-slate-500 mt-1 leading-normal">
                      Экспортирует картинку точно в вашем текущем масштабе и положении (сдвиге).
                    </span>
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                <label className="flex items-start gap-2.5 cursor-pointer selection:bg-transparent">
                  <input
                    type="checkbox"
                    checked={exportTransparent}
                    onChange={(e) => setExportTransparent(e.target.checked)}
                    className="rounded border-slate-800 text-emerald-600 focus:ring-emerald-500/30 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-[11px] text-slate-200 block">
                      Прозрачный фон (Transparent PNG)
                    </span>
                    <span className="text-[9px] text-slate-500 block leading-normal mt-0.5">
                      Позволяет скачать рисунок без черного фона для портфолио или интеграции.
                    </span>
                  </div>
                </label>
              </div>

              {/* Projected file sizes & warning */}
              <div className="bg-emerald-950/10 border border-emerald-900/30 p-2.5 rounded-lg font-mono text-[9px] text-emerald-400">
                <div className="flex justify-between mb-1">
                  <span>Формат:</span>
                  <span className="text-white">PNG Портативное изображение</span>
                </div>
                <div className="flex justify-between">
                  <span>Итоговый размер:</span>
                  <span className="text-white font-bold">
                    {(() => {
                      let bw = canvasRef.current ? canvasRef.current.clientWidth : 800;
                      let bh = canvasRef.current ? canvasRef.current.clientHeight : 600;
                      if (exportRatio === '1:1') { bw = 2048; bh = 2048; }
                      else if (exportRatio === '9:16') { bw = 1152; bh = 2048; }
                      else if (exportRatio === '4:5') { bw = 1638; bh = 2048; }
                      else if (exportRatio === '16:9') { bw = 2048; bh = 1152; }
                      else if (exportRatio === '3:4') { bw = 1536; bh = 2048; }
                      
                      const ew = Math.round(bw * exportScale);
                      const eh = Math.round(bh * exportScale);
                      return `${ew} x ${eh} px ${exportScale >= 3 ? '(PRO Details 🔥)' : ''}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-755 rounded-lg text-xs font-mono font-bold transition active:scale-95"
                id="export-close-btn-bottom"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (exportPngRef.current) {
                    exportPngRef.current({
                      ratio: exportRatio,
                      scale: exportScale,
                      transparent: exportTransparent,
                      fitContent: exportFitContent
                    });
                  }
                  setShowExportModal(false);
                }}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 leading-none shadow-lg shadow-emerald-900/20 text-white rounded-lg text-xs font-mono font-bold transition active:scale-95 flex items-center justify-center gap-1.5"
                id="export-download-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
