/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Dices, 
  Play, 
  Square, 
  Download, 
  RotateCw, 
  Compass, 
  Terminal,
  Grid,
  Settings
} from 'lucide-react';
import { AppMode, UITheme } from '../types';
import { THEME_MAP } from '../utils/theme';

interface ToolbarProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  animating: boolean;
  onToggleAnimation: () => void;
  onRandomise: () => void;
  onGenerate: () => void;
  onSavePng: () => void;
  uiTheme: UITheme;
  setUiTheme: (theme: UITheme) => void;
}

export default function Toolbar({
  mode,
  setMode,
  animating,
  onToggleAnimation,
  onRandomise,
  onGenerate,
  onSavePng,
  uiTheme,
  setUiTheme,
}: ToolbarProps) {
  const tc = THEME_MAP[uiTheme] || THEME_MAP.indigo;

  return (
    <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 py-2 px-4 shrink-0 flex flex-col xl:flex-row items-center justify-between gap-3 z-20 shadow-lg select-none">
      
      {/* LEFT BRAND IDENTIFIER */}
      <div className="flex items-center gap-2">
        <Compass className={`w-4 h-4 ${tc.text} opacity-90 shrink-0`} />
        <h1 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          L-Systems & Automata
          <span className={`text-[9px] uppercase font-mono px-2 py-0.5 bg-white/5 border ${tc.border} ${tc.textLight} rounded-full tracking-wider font-semibold`}>
            v2.2
          </span>
        </h1>
      </div>

      {/* CENTER SEGMENTED TAB SELECTORS */}
      <div className="flex items-center bg-slate-900 border border-slate-800 p-[3px] rounded-lg shadow-inner">
        {(['lsystem', 'ca', 'combined', 'pen', 'kaleidoscope'] as const).map((m) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-250 active:scale-95 ${
                isActive
                  ? 'bg-white text-black font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/20'
              }`}
            >
              {m === 'lsystem' ? 'L-System' : m === 'ca' ? 'Automata' : m === 'combined' ? 'Combined' : m === 'pen' ? 'Symmetric Pen' : 'Kaleidoscope'}
            </button>
          );
        })}
      </div>

      {/* RIGHT ACTION DASHBOARD AND ENGINE TRIGGERS */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        
        {/* RANDOMISE BUTTON */}
        <button
          onClick={onRandomise}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md font-mono text-[10px] text-slate-300 hover:text-white transition active:scale-95"
          title="Tweak parameters instantly with high randomness factor"
        >
          <Dices className="w-3.5 h-3.5 text-pink-400" />
          <span>Randomise</span>
        </button>

        {/* SWEEPING ANIME STEPPER */}
        {mode !== 'pen' && (
          <button
            onClick={onToggleAnimation}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md font-mono text-[10px] transition active:scale-95 ${
              animating
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Sustain angular rotations sequentially"
          >
            {animating ? (
              <>
                <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span>Stop Sweep</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-450" />
                <span>Animate</span>
              </>
            )}
          </button>
        )}

        {/* SAVE Snapshot */}
        <button
          onClick={onSavePng}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-mono text-[10px] font-bold transition active:scale-95 shadow-lg shadow-black/30"
          title="Compile PNG format snapshot"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save PNG</span>
        </button>
      </div>
    </header>
  );
}
