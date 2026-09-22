// src/screens/ProgressScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { MoodEntry, Task } from '../constants/types';
import { getMoodEntries, getAllTasks } from '../services/database';
import { MOOD_LABELS } from '../constants/exercises';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ProgressScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    setLoading(true);
    const [moods, allTasks] = await Promise.all([getMoodEntries(7), getAllTasks()]);
    setMoodEntries(moods);
    setTasks(allTasks);
    setLoading(false);
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const avgMood =
    moodEntries.length > 0
      ? (moodEntries.reduce((s, e) => s + e.mood, 0) / moodEntries.length).toFixed(1)
      : '—';

  const avgEnergy =
    moodEntries.length > 0
      ? (moodEntries.reduce((s, e) => s + e.energy, 0) / moodEntries.length).toFixed(1)
      : '—';

  // Last 7 days mood chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const entry = moodEntries.find(e => {
      const ed = new Date(e.date);
      return ed.toDateString() === d.toDateString();
    });
    return { day: DAYS[d.getDay()], mood: entry?.mood ?? null };
  });

  const maxBarHeight = 80;

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
          <Text style={styles.subtitle}>Your last 7 days</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.primary} />
            <Text style={styles.statValue}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.success + '15' }]}>
            <Ionicons name="trending-up" size={28} color={Colors.success} />
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.warning + '15' }]}>
            <Ionicons name="happy" size={28} color={Colors.warning} />
            <Text style={styles.statValue}>{avgMood}</Text>
            <Text style={styles.statLabel}>Avg Mood</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.accent + '15' }]}>
            <Ionicons name="flash" size={28} color={Colors.accent} />
            <Text style={styles.statValue}>{avgEnergy}</Text>
            <Text style={styles.statLabel}>Avg Energy</Text>
          </View>
        </View>

        {/* Mood Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood This Week</Text>
          <View style={styles.chartCard}>
            {moodEntries.length === 0 ? (
              <View style={styles.emptyChart}>
                <Ionicons name="bar-chart-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No mood entries yet</Text>
                <Text style={styles.emptySubtext}>Log your mood from the Home screen</Text>
              </View>
            ) : (
              <View style={styles.barChart}>
                {last7Days.map(({ day, mood }, i) => {
                  const barH = mood ? (mood / 5) * maxBarHeight : 4;
                  const color = mood ? MOOD_LABELS[mood].color : Colors.border;
                  return (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barWrapper}>
                        {mood ? (
                          <Text style={styles.barEmoji}>{MOOD_LABELS[mood].emoji}</Text>
                        ) : null}
                        <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
                      </View>
                      <Text style={styles.barDay}>{day}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Recent Mood Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Mood Logs</Text>
          {moodEntries.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No mood entries yet</Text>
            </View>
          ) : (
            moodEntries.slice(0, 5).map(entry => {
              const ml = MOOD_LABELS[entry.mood];
              return (
                <View key={entry.id} style={styles.moodRow}>
                  <Text style={styles.moodEmoji}>{ml.emoji}</Text>
                  <View style={styles.moodInfo}>
                    <Text style={styles.moodLabel}>{ml.label}</Text>
                    <Text style={styles.moodDate}>
                      {new Date(entry.date).toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    {entry.notes ? (
                      <Text style={styles.moodNotes} numberOfLines={1}>
                        {entry.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.energyBadge}>
                    <Text style={styles.energyText}>⚡{entry.energy}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Task Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Breakdown</Text>
          <View style={styles.chartCard}>
            <View style={styles.taskStats}>
              <View style={styles.taskStatItem}>
                <Text style={[styles.taskStatNum, { color: Colors.primary }]}>{tasks.length}</Text>
                <Text style={styles.taskStatLabel}>Total</Text>
              </View>
              <View style={styles.taskDivider} />
              <View style={styles.taskStatItem}>
                <Text style={[styles.taskStatNum, { color: Colors.success }]}>
                  {completedTasks}
                </Text>
                <Text style={styles.taskStatLabel}>Completed</Text>
              </View>
              <View style={styles.taskDivider} />
              <View style={styles.taskStatItem}>
                <Text style={[styles.taskStatNum, { color: Colors.warning }]}>
                  {tasks.length - completedTasks}
                </Text>
                <Text style={styles.taskStatLabel}>Pending</Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${completionRate}%` as any }]} />
            </View>
            <Text style={styles.progressLabel}>{completionRate}% completion rate</Text>
          </View>
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

  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barCol: { alignItems: 'center', flex: 1 },
  barWrapper: { alignItems: 'center', justifyContent: 'flex-end', height: 100 },
  barEmoji: { fontSize: 12, marginBottom: 2 },
  bar: { width: 20, borderRadius: 4, minHeight: 4 },
  barDay: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },

  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: 8,
    ...Shadows.sm,
  },
  moodEmoji: { fontSize: 28, marginRight: 12 },
  moodInfo: { flex: 1 },
  moodLabel: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
  moodDate: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  moodNotes: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, marginTop: 2 },
  energyBadge: {
    backgroundColor: Colors.warning + '20',
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  energyText: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.warning },

  emptyList: { alignItems: 'center', paddingVertical: Spacing.lg },

  taskStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md },
  taskStatItem: { alignItems: 'center' },
  taskStatNum: { fontSize: Fonts.sizes.xxl, fontWeight: '800' },
  taskStatLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  taskDivider: { width: 1, backgroundColor: Colors.border },

  progressBarBg: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
  },
  progressLabel: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default ProgressScreen;
