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
        <svg viewBox="0 0 100 100" className="w-5 h-5 stroke-white fill-none stroke-[6.5]" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.4))' }}>
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
