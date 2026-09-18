/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const BudgetTheme = {
  color: {
    background: '#0D0D0F',
    surface: '#16161A',
    surfaceRaised: '#1B1B20',
    border: '#27272D',
    borderSoft: '#202025',
    text: '#F4F4F5',
    textMuted: '#92929D',
    textSubtle: '#5F5F69',
    accent: '#7DF9C2',
    positive: '#7DF9C2',
    warning: '#FFD166',
    negative: '#FF6B6B',
  },
  radius: {
    small: 12,
    medium: 16,
    large: 22,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;
