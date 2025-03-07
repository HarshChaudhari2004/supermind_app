export type ColorMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  primaryVariant: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface AppTheme {
  dark: boolean;
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
    pill: number;
  };
}

const darkTheme: AppTheme = {
  dark: true,
  colors: {
    background: '#171717',
    surface: '#1a1a1a',
    surfaceVariant: '#2a2a2a',
    primary: '#bc10e3',
    primaryVariant: '#9c0cbd',
    secondary: '#4a9afa',
    text: '#ffffff',
    textSecondary: '#bbbbbb',
    border: '#333',
    error: '#ff4444',
    success: '#4CAF50',
    warning: '#FFC107',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    pill: 24,
  },
};

const lightTheme: AppTheme = {
  dark: false,
  colors: {
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceVariant: '#f0f0f0',
    primary: '#9c27b0',
    primaryVariant: '#6a0080',
    secondary: '#2196F3',
    text: '#000000',
    textSecondary: '#666666',
    border: '#e0e0e0',
    error: '#d32f2f',
    success: '#388e3c',
    warning: '#f57c00',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    pill: 24,
  },
};

export const getTheme = (mode: ColorMode): AppTheme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};
