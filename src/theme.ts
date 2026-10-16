/**
 * Meeting Timeline — Theme & Design Tokens (OOP Architecture)
 *
 * Encapsulates dynamic Light and Dark mode design systems, color tokens,
 * and user preferences with persistent storage.
 *
 * Developer: Rizbi Islam • AeroTech
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { SimpleStorage } from './services/storage';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceSubtle: string;
  surfaceCard: string;
  inputBg: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentHover: string;
  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  qCardBg: string;
  qBadgeBg: string;
  qBadgeText: string;
  aCardBg: string;
  aBadgeBg: string;
  aBadgeText: string;
  statusBar: 'light' | 'dark';
}

/**
 * Object-Oriented Theme Token Registry
 */
export class ThemeRegistry {
  public static readonly DARK: ThemeColors = {
    bg: '#0A0C12',
    surface: '#0F131D',
    surfaceSubtle: '#121622',
    surfaceCard: '#111520',
    inputBg: '#0A0D15',
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(99, 102, 241, 0.22)',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    muted: '#94A3B8',
    accent: '#3B82F6',
    accentSoft: 'rgba(59, 130, 246, 0.15)',
    accentHover: '#2563EB',
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.12)',
    error: '#F87171',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    qCardBg: '#181E2E',
    qBadgeBg: 'rgba(59, 130, 246, 0.25)',
    qBadgeText: '#60A5FA',
    aCardBg: '#121622',
    aBadgeBg: 'rgba(16, 185, 129, 0.2)',
    aBadgeText: '#34D399',
    statusBar: 'light',
  };

  public static readonly LIGHT: ThemeColors = {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfaceCard: '#FFFFFF',
    inputBg: '#F8FAFC',
    border: '#E2E8F0',
    borderSubtle: 'rgba(59, 130, 246, 0.25)',
    text: '#0F172A',
    textSecondary: '#334155',
    muted: '#64748B',
    accent: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.1)',
    accentHover: '#1D4ED8',
    success: '#059669',
    successBg: 'rgba(5, 150, 105, 0.1)',
    error: '#DC2626',
    errorBg: 'rgba(220, 38, 38, 0.1)',
    qCardBg: '#EFF6FF',
    qBadgeBg: 'rgba(37, 99, 235, 0.18)',
    qBadgeText: '#1D4ED8',
    aCardBg: '#F0FDF4',
    aBadgeBg: 'rgba(5, 150, 105, 0.15)',
    aBadgeText: '#047857',
    statusBar: 'dark',
  };

  public static getColors(mode: ThemeMode): ThemeColors {
    return mode === 'dark' ? this.DARK : this.LIGHT;
  }
}

export const DARK_COLORS = ThemeRegistry.DARK;
export const LIGHT_COLORS = ThemeRegistry.LIGHT;
export const COLORS = DARK_COLORS;

export const FONTS = {
  regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  bold: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
};

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  colors: ThemeRegistry.DARK,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = '_mt_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    SimpleStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
      }
    });
  }, []);

  function setTheme(mode: ThemeMode) {
    setThemeState(mode);
    SimpleStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  const isDark = theme === 'dark';
  const colors = ThemeRegistry.getColors(theme);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, isDark, colors, toggleTheme, setTheme } },
    children
  );
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
