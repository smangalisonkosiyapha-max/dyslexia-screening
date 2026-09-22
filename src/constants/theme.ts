// src/constants/theme.ts

export const Colors = {
  primary: '#6C63FF',
  primaryLight: '#EEF0FF',
  primaryDark: '#4B44CC',
  secondary: '#FF6584',
  secondaryLight: '#FFECEF',
  accent: '#43D9B0',
  accentLight: '#E8FBF6',
  warning: '#FFB347',
  warningLight: '#FFF3E0',
  danger: '#FF5252',
  dangerLight: '#FFEBEE',
  success: '#4CAF50',
  successLight: '#E8F5E9',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F8',
  text: '#1A1D2E',
  textSecondary: '#6B7080',
  textMuted: '#A0A7B8',
  border: '#E8EAF0',
  shadow: 'rgba(108, 99, 255, 0.12)',
};

export const Fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
};
