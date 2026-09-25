// src/screens/ProgressScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { TestAttempt, RiskBand } from '../constants/types';
import { getAllAttempts, getRiskBandCounts } from '../services/database';
import { DYSLEXIA_TESTS, RISK_BAND_INFO } from '../constants/dyslexiaTests';

const RISK_COLOR: Record<string, string> = {
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.danger,
};

const ProgressScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [riskCounts, setRiskCounts] = useState<Record<RiskBand, number>>({
    low: 0,
    moderate: 0,
    high: 0,
  });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    setLoading(true);
    const [allAttempts, counts] = await Promise.all([getAllAttempts(50), getRiskBandCounts()]);
    setAttempts(allAttempts);
    setRiskCounts(counts);
    setLoading(false);
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const completedTestTypes = new Set(attempts.map(a => a.testType));
  const testsCompleted = completedTestTypes.size;
  const avgAccuracy =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + a.accuracy, 0) / attempts.length) * 100)
      : 0;

  const latestRiskBand: RiskBand | null = attempts.find(a => a.riskBand)?.riskBand ?? null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>Your screening history</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.primary} />
            <Text style={styles.statValue}>
              {testsCompleted}/{DYSLEXIA_TESTS.length}
            </Text>
            <Text style={styles.statLabel}>Tests Done</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.success + '15' }]}>
            <Ionicons name="trending-up" size={28} color={Colors.success} />
            <Text style={styles.statValue}>{avgAccuracy}%</Text>
            <Text style={styles.statLabel}>Avg Accuracy</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.warning + '15' }]}>
            <Ionicons name="flag" size={28} color={Colors.warning} />
            <Text style={styles.statValue}>{attempts.length}</Text>
            <Text style={styles.statLabel}>Attempts</Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: latestRiskBand
                  ? RISK_COLOR[RISK_BAND_INFO[latestRiskBand].color] + '15'
                  : Colors.border + '30',
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={28}
              color={
                latestRiskBand ? RISK_COLOR[RISK_BAND_INFO[latestRiskBand].color] : Colors.textMuted
              }
            />
            <Text style={styles.statValue}>
              {latestRiskBand ? RISK_BAND_INFO[latestRiskBand].label.replace(' risk', '') : '—'}
            </Text>
            <Text style={styles.statLabel}>Latest Risk</Text>
          </View>
        </View>

        {/* Risk Band Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Bands Across Attempts</Text>
          <View style={styles.chartCard}>
            {attempts.length === 0 ? (
              <View style={styles.emptyChart}>
                <Ionicons name="bar-chart-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No screenings yet</Text>
                <Text style={styles.emptySubtext}>Complete a test to see your results here</Text>
              </View>
            ) : (
              <View style={styles.riskBars}>
                {(['low', 'moderate', 'high'] as RiskBand[]).map(band => {
                  const info = RISK_BAND_INFO[band];
                  const count = riskCounts[band];
                  const max = Math.max(riskCounts.low, riskCounts.moderate, riskCounts.high, 1);
                  const widthPct = (count / max) * 100;
                  return (
                    <View key={band} style={styles.riskBarRow}>
                      <Text style={styles.riskBarLabel}>{info.label}</Text>
                      <View style={styles.riskBarTrack}>
                        <View
                          style={[
                            styles.riskBarFill,
                            {
                              width: `${widthPct}%` as any,
                              backgroundColor: RISK_COLOR[info.color],
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.riskBarCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Test History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test History</Text>
          {attempts.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No attempts recorded yet</Text>
            </View>
          ) : (
            attempts.map(a => {
              const meta = DYSLEXIA_TESTS.find(t => t.type === a.testType);
              const risk = a.riskBand ? RISK_BAND_INFO[a.riskBand] : null;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={styles.historyRow}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('Screening', {
                      screen: 'Results',
                      params: { attemptId: a.id, testType: a.testType },
                    })
                  }
                >
                  <Text style={styles.historyIcon}>{meta?.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{meta?.title ?? a.testType}</Text>
                    <Text style={styles.historyMeta}>
                      {new Date(a.startedAt).toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' · '}
                      {Math.round(a.accuracy * 100)}% accuracy
                    </Text>
                  </View>
                  {risk && (
                    <View
                      style={[styles.riskBadge, { backgroundColor: RISK_COLOR[risk.color] + '20' }]}
                    >
                      <Text style={[styles.riskBadgeText, { color: RISK_COLOR[risk.color] }]}>
                        {risk.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },

  cardRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: 4,
    ...Shadows.sm,
  },
  statValue: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 9, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  emptyChart: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { fontSize: Fonts.sizes.md, color: Colors.textMuted, marginTop: 8 },
  emptySubtext: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, marginTop: 4 },
  emptyList: { alignItems: 'center', paddingVertical: Spacing.lg },

  riskBars: { gap: Spacing.md },
  riskBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskBarLabel: {
    width: 90,
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  riskBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  riskBarFill: { height: '100%', borderRadius: Radii.full },
  riskBarCount: {
    width: 24,
    textAlign: 'right',
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.text,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: 8,
    gap: 12,
    ...Shadows.sm,
  },
  historyIcon: { fontSize: 24 },
  historyTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
  historyMeta: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full },
  riskBadgeText: { fontSize: Fonts.sizes.xs, fontWeight: '700' },
});

export default ProgressScreen;
