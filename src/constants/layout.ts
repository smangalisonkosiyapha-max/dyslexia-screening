// src/constants/layout.ts
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Base (content) height of the bottom tab bar, excluding the device's
 * safe-area inset — must match AppNavigator's tabBarStyle.height formula
 * (currently `60 + insets.bottom`).
 */
export const TAB_BAR_BASE_HEIGHT = 60;

/**
 * Safe bottom padding for ScrollViews inside tab screens, so content is
 * never hidden behind the navigation bar. Unlike a static guess, this
 * always matches the device's real safe-area inset (important on phones
 * with tall gesture-nav bars, where a fixed padding falls short).
 */
export const useScrollBottomPadding = () => {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + insets.bottom + 24;
};
