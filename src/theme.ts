/**
 * AeroTech — Design Tokens / Theme
 *
 * Central color palette and font definitions.
 * Dark mode, premium dark surface aesthetic.
 */

import { Platform } from 'react-native';

export const COLORS = {
  // Backgrounds
  bg: '#0F1117',
  surface: '#1A1D27',
  inputBg: '#13151E',

  // Text
  text: '#F0F2F8',
  muted: '#7A7F9A',

  // Accent — AeroTech signature blue-violet
  accent: '#6366F1',
  accentSoft: '#6366F120',

  // Borders
  border: '#252836',

  // Status
  error: '#F87171',
  errorBg: '#F8717120',
  success: '#34D399',
  successBg: '#34D39920',
};

export const FONTS = {
  regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  bold: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
};
