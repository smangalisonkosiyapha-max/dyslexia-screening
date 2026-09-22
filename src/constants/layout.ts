// src/constants/layout.ts
import { Platform } from 'react-native';

/**
 * Height of the bottom tab bar.
 * Every ScrollView's contentContainerStyle needs at least this much
 * paddingBottom so content is never hidden behind the navigation bar.
 */
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;

/** Safe bottom padding for ScrollViews inside tab screens */
export const SCROLL_BOTTOM_PADDING = TAB_BAR_HEIGHT + 16;
