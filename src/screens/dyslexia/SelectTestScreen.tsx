// src/screens/dyslexia/SelectTestScreen.tsx
// Entry point for the dyslexia screening module — lists the five tests
// (see Test Design & Justification slide) and each test's most recent
// result, if any.

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../../constants/theme';
import { SCROLL_BOTTOM_PADDING } from '../../constants/layout';
import { DYSLEXIA_TESTS, RISK_BAND_INFO } from '../../constants/dyslexiaTests';
import { DyslexiaTestType, TestAttempt } from '../../constants/types';
import { Card, Badge, StatCard } from '../../components/UIComponents';
import { getAllAttempts } from '../../services/database';

const COLOR_MAP = {
  primary: Colors.primary,
  secondary: Colors.secondary,
  accent: Colors.accent,
  warning: Colors.warning,
} as const;

const RISK_BADGE_COLORS = {
  low: { color: Colors.success, bg: Colors.successLight },
  moderate: { color: Colors.warning, bg: Colors.warningLight },
  high: { color: Colors.danger, bg: Colors.dangerLight },
} as const;

const SelectTestScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllAttempts(50).then(setAttempts);
    }, [])
  );

  const latestFor = (type: DyslexiaTestType) =>
    attempts.find(a => a.testType === type && a.completedAt);

  const totalCompleted = attempts.filter(a => a.completedAt).length;
  const highRiskCount = attempts.filter(a => a.riskBand === 'high').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dyslexia Screening</Text>
          <Text style={styles.subtitle}>Five quick checks, instant feedback</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Completed" value={totalCompleted} icon="✅" color={Colors.primary} />
          <StatCard label="Flagged" value={highRiskCount} icon="⚑" color={Colors.danger} subtitle="high risk" />
        </View>

        {DYSLEXIA_TESTS.map(test => {
          const last = latestFor(test.type);
          return (
            <Card
              key={test.type}
              onPress={() => navigation.navigate('TestRunner', { testType: test.type })}
              style={styles.testCard}
            >
              <View style={styles.testRow}>
                <View style={[styles.iconWrap, { backgroundColor: COLOR_MAP[test.color] + '20' }]}>
                  <Text style={styles.iconText}>{test.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testTitle}>{test.title}</Text>
                  <Text style={styles.testDesc}>{test.description}</Text>
                  <View style={styles.testMetaRow}>
                    <Text style={styles.testDuration}>~{test.durationMinutes} min</Text>
                    {last?.riskBand && (
                      <Badge
                        label={RISK_BAND_INFO[last.riskBand].label}
                        color={RISK_BADGE_COLORS[last.riskBand].color}
                        bgColor={RISK_BADGE_COLORS[last.riskBand].bg}
                      />
                    )}
                  </View>
                </View>
              </View>
            </Card>
          );
        })}

        <Text style={styles.disclaimer}>
          This is a screening and support tool, not a clinical diagnosis. A moderate or high
          result is a signal to speak with the Disability Unit for a full assessment.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.lg },
  title: { fontSize: Fonts.sizes.xxxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: Fonts.sizes.md, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  testCard: { marginHorizontal: Spacing.lg },
  testRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 48, height: 48, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  iconText: { fontSize: 24 },
  testTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text },
  testDesc: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  testMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  testDuration: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, fontWeight: '600' },
  disclaimer: {
    fontSize: Fonts.sizes.xs, color: Colors.textMuted, textAlign: 'center',
    paddingHorizontal: Spacing.xxl, marginTop: Spacing.md, lineHeight: 16,
  },
});

export default SelectTestScreen;
