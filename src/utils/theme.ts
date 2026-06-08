/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UITheme } from '../types';

export const THEME_MAP: Record<UITheme, {
  name: string;
  color: string;
  text: string;
  textLight: string;
  textHover: string;
  bg: string;
  bgHover: string;
  bgLight: string;
  border: string;
  borderFocus: string;
  borderHover: string;
  accent: string;
  ring: string;
  glow: string;
}> = {
  indigo: {
    name: 'Twilight Indigo',
    color: '#6366f1',
    text: 'text-indigo-400',
    textLight: 'text-indigo-300',
    textHover: 'hover:text-indigo-300',
    bg: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-500',
    bgLight: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    borderFocus: 'focus:border-indigo-500',
    borderHover: 'hover:border-indigo-500',
    accent: 'accent-indigo-500',
    ring: 'ring-indigo-500/30',
    glow: 'rgba(99, 102, 241, 0.4)'
  },
  emerald: {
    name: 'Sylvan Emerald',
    color: '#10b981',
    text: 'text-emerald-400',
    textLight: 'text-emerald-300',
    textHover: 'hover:text-emerald-300',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-500',
    bgLight: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    borderFocus: 'focus:border-emerald-500',
    borderHover: 'hover:border-emerald-500',
    accent: 'accent-emerald-500',
    ring: 'ring-emerald-500/30',
    glow: 'rgba(16, 185, 129, 0.4)'
  },
  rose: {
    name: 'Velvet Rose',
    color: '#f43f5e',
    text: 'text-rose-400',
    textLight: 'text-rose-300',
    textHover: 'hover:text-rose-300',
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-500',
    bgLight: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    borderFocus: 'focus:border-rose-500',
    borderHover: 'hover:border-rose-500',
    accent: 'accent-rose-500',
    ring: 'ring-rose-500/30',
    glow: 'rgba(244, 63, 94, 0.4)'
  },
  amber: {
    name: 'Solar Amber',
    color: '#f59e0b',
    text: 'text-amber-400',
    textLight: 'text-amber-300',
    textHover: 'hover:text-amber-300',
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-500',
    bgLight: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    borderFocus: 'focus:border-amber-500',
    borderHover: 'hover:border-amber-500',
    accent: 'accent-amber-500',
    ring: 'ring-amber-500/30',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  violet: {
    name: 'Cosmic Violet',
    color: '#8b5cf6',
    text: 'text-violet-400',
    textLight: 'text-violet-300',
    textHover: 'hover:text-violet-300',
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-500',
    bgLight: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    borderFocus: 'focus:border-violet-500',
    borderHover: 'hover:border-violet-500',
    accent: 'accent-violet-500',
    ring: 'ring-violet-500/30',
    glow: 'rgba(139, 92, 246, 0.4)'
  },
  cyan: {
    name: 'Arctic Cyan',
    color: '#06b6d4',
    text: 'text-cyan-400',
    textLight: 'text-cyan-300',
    textHover: 'hover:text-cyan-300',
    bg: 'bg-cyan-600',
    bgHover: 'hover:bg-cyan-500',
    bgLight: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    borderFocus: 'focus:border-cyan-500',
    borderHover: 'hover:border-cyan-500',
    accent: 'accent-cyan-500',
    ring: 'ring-cyan-500/30',
    glow: 'rgba(6, 182, 212, 0.4)'
  },
  custom: {
    name: 'Personal Space 🎨',
    color: 'var(--ui-accent)',
    text: 'custom-text',
    textLight: 'custom-text-light',
    textHover: 'hover:custom-text',
    bg: 'custom-bg',
    bgHover: 'hover:custom-bg-hover',
    bgLight: 'custom-bg-light',
    border: 'custom-border',
    borderFocus: 'focus:custom-border-focus',
    borderHover: 'hover:custom-border-hover',
    accent: 'custom-accent',
    ring: 'custom-ring',
    glow: 'var(--ui-accent)'
  }
};
