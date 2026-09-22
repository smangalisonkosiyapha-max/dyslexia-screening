// src/components/UIComponents.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ViewStyle, TextStyle, StyleProp,
} from 'react-native';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';

// ── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

// ── Button ────────────────────────────────────────────────────────────────

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', size = 'md',
  loading, disabled, icon, style,
}) => {
  const btnStyle = [
    styles.button,
    styles[`btn_${variant}`],
    styles[`btn_${size}`],
    (disabled || loading) && styles.btnDisabled,
    style,
  ];
  const textStyle = [styles.btnText, styles[`btnText_${variant}`], styles[`btnText_${size}`]];

  return (
    <TouchableOpacity style={btnStyle} onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primary} size="small" />
      ) : (
        <>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ── Section Header ────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <View style={styles.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {action && (
      <TouchableOpacity onPress={action.onPress}>
        <Text style={styles.sectionAction}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Badge ─────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label, color = Colors.primary, bgColor = Colors.primaryLight,
}) => (
  <View style={[styles.badge, { backgroundColor: bgColor }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

// ── Progress Bar ──────────────────────────────────────────────────────────

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  height?: number;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress, color = Colors.primary, height = 8, label,
}) => (
  <View>
    {label && (
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressLabel, { color }]}>{Math.round(progress * 100)}%</Text>
      </View>
    )}
    <View style={[styles.progressTrack, { height }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(100, Math.max(0, progress * 100))}%`, backgroundColor: color, height },
        ]}
      />
    </View>
  </View>
);

// ── Stat Card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = Colors.primary, subtitle }) => (
  <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// ── Empty State ───────────────────────────────────────────────────────────

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ emoji, title, subtitle, action }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action && (
      <Button title={action.label} onPress={action.onPress} variant="outline" style={{ marginTop: 16 }} />
    )}
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
  btn_primary: { backgroundColor: Colors.primary },
  btn_secondary: { backgroundColor: Colors.secondary },
  btn_outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  btn_ghost: { backgroundColor: Colors.primaryLight },
  btn_danger: { backgroundColor: Colors.danger },
  btn_sm: { paddingHorizontal: 14, paddingVertical: 8 },
  btn_md: { paddingHorizontal: 20, paddingVertical: 12 },
  btn_lg: { paddingHorizontal: 28, paddingVertical: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: '600' },
  btnText_primary: { color: '#fff' },
  btnText_secondary: { color: '#fff' },
  btnText_outline: { color: Colors.primary },
  btnText_ghost: { color: Colors.primary },
  btnText_danger: { color: '#fff' },
  btnText_sm: { fontSize: Fonts.sizes.sm },
  btnText_md: { fontSize: Fonts.sizes.md },
  btnText_lg: { fontSize: Fonts.sizes.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text },
  sectionSubtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  sectionAction: { fontSize: Fonts.sizes.sm, color: Colors.primary, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full },
  badgeText: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  progressTrack: { backgroundColor: Colors.border, borderRadius: Radii.full, overflow: 'hidden' },
  progressFill: { borderRadius: Radii.full },
  statCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    padding: Spacing.md, flex: 1, ...Shadows.sm,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: Fonts.sizes.xxl, fontWeight: '800' },
  statLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  statSubtitle: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: Fonts.sizes.md, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
});
