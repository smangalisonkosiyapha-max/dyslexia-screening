// src/screens/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { SCROLL_BOTTOM_PADDING } from '../constants/layout';
import { TestAttempt } from '../constants/types';
import { Card, Button, SectionHeader, EmptyState } from '../components/UIComponents';
import { getUser, getAllAttempts } from '../services/database';
import { DYSLEXIA_TESTS, RISK_BAND_INFO } from '../constants/dyslexiaTests';

const RISK_COLOR: Record<string, string> = {
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.danger,
};

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [userName, setUserName] = useState('Friend');
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [user, allAttempts] = await Promise.all([getUser(), getAllAttempts(10)]);
      if (user) setUserName(user.name.split(' ')[0]);
      setAttempts(allAttempts);
    } catch (e) {
      console.error('HomeScreen loadData error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const completedTestTypes = new Set(attempts.map(a => a.testType));
  const remainingTests = DYSLEXIA_TESTS.filter(t => !completedTestTypes.has(t.type));
  const latestAttempt = attempts[0];

  const goToResults = (attempt: TestAttempt) => {
    navigation.navigate('Screening', {
      screen: 'Results',
      params: { attemptId: attempt.id, testType: attempt.testType },
    });
  };

  const goToScreening = () => navigation.navigate('Screening');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{userName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Start Screening CTA */}
        <Card style={styles.ctaCard}>
          <View style={styles.ctaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>
                {attempts.length === 0
                  ? 'Take your first screening'
                  : remainingTests.length > 0
                    ? `${remainingTests.length} screening${remainingTests.length === 1 ? '' : 's'} left`
                    : 'All screenings complete'}
              </Text>
              <Text style={styles.ctaSubtitle}>
                {attempts.length === 0
                  ? 'Five short tests, about 15 minutes in total.'
                  : remainingTests.length > 0
                    ? 'Keep going to get a fuller picture.'
                    : 'You can retake any test any time.'}
              </Text>
            </View>
            <Ionicons name="school" size={36} color={Colors.primary} />
          </View>
          <Button
            title={attempts.length === 0 ? 'Start screening' : 'Go to screening'}
            onPress={goToScreening}
          />
        </Card>

        {/* Latest Result Summary */}
        {latestAttempt && (
          <Card style={styles.latestCard} onPress={() => goToResults(latestAttempt)}>
            <SectionHeader title="Your latest result" />
            <LatestResultRow attempt={latestAttempt} />
          </Card>
        )}

        {/* Recent Screenings */}
        <SectionHeader
          title="Recent screenings"
          action={
            attempts.length > 0
              ? { label: 'View all', onPress: () => navigation.navigate('Progress') }
              : undefined
          }
        />

        {loading ? null : attempts.length === 0 ? (
          <EmptyState
            emoji="🧩"
            title="No screenings yet"
            subtitle="Start with any test — results and progress will show up here."
            action={{ label: 'Start screening', onPress: goToScreening }}
          />
        ) : (
          attempts
            .slice(0, 5)
            .map(a => <AttemptRow key={a.id} attempt={a} onPress={() => goToResults(a)} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Latest Result Row ───────────────────────────────────────────────────────

const LatestResultRow: React.FC<{ attempt: TestAttempt }> = ({ attempt }) => {
  const meta = DYSLEXIA_TESTS.find(t => t.type === attempt.testType);
  const risk = attempt.riskBand ? RISK_BAND_INFO[attempt.riskBand] : null;

  return (
    <View style={styles.latestRow}>
      <Text style={styles.latestIcon}>{meta?.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.latestTitle}>{meta?.title ?? attempt.testType}</Text>
        <Text style={styles.latestMeta}>{Math.round(attempt.accuracy * 100)}% accuracy</Text>
      </View>
      {risk && (
        <View style={[styles.riskBadge, { backgroundColor: RISK_COLOR[risk.color] + '20' }]}>
          <Text style={[styles.riskBadgeText, { color: RISK_COLOR[risk.color] }]}>
            {risk.label}
          </Text>
        </View>
      )}
    </View>
  );
};

// ── Attempt Row Component ───────────────────────────────────────────────────

const AttemptRow: React.FC<{ attempt: TestAttempt; onPress: () => void }> = ({
  attempt,
  onPress,
}) => {
  const meta = DYSLEXIA_TESTS.find(t => t.type === attempt.testType);
  const risk = attempt.riskBand ? RISK_BAND_INFO[attempt.riskBand] : null;
  const date = new Date(attempt.startedAt).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity style={styles.attemptRow} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.attemptIcon}>{meta?.icon}</Text>
      <View style={styles.attemptContent}>
        <Text style={styles.attemptTitle}>{meta?.title ?? attempt.testType}</Text>
        <Text style={styles.attemptMeta}>
          {date} · {Math.round(attempt.accuracy * 100)}% accuracy
        </Text>
      </View>
      {risk && (
        <View style={[styles.riskBadge, { backgroundColor: RISK_COLOR[risk.color] + '20' }]}>
          <Text style={[styles.riskBadgeText, { color: RISK_COLOR[risk.color] }]}>
            {risk.label}
          </Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  greeting: { fontSize: Fonts.sizes.md, color: Colors.textSecondary },
  userName: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  avatarBtn: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: '#fff' },

  ctaCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  ctaTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.text },
  ctaSubtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },

  latestCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  latestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  latestIcon: { fontSize: 28 },
  latestTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
  latestMeta: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },

  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: 8,
    gap: 12,
    ...Shadows.sm,
  },
  attemptIcon: { fontSize: 24 },
  attemptContent: { flex: 1 },
  attemptTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  attemptMeta: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full },
  riskBadgeText: { fontSize: Fonts.sizes.xs, fontWeight: '700' },
});

export default HomeScreen;
