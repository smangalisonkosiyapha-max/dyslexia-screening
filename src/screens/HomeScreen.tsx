// src/screens/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { SCROLL_BOTTOM_PADDING } from '../constants/layout';
import { Task, AIInsight } from '../constants/types';
import { Card, Button, SectionHeader, ProgressBar, EmptyState } from '../components/UIComponents';
import {
  getTodaysTasks,
  updateTaskCompletion,
  getUser,
  getMoodEntries,
  getExerciseSessions,
} from '../services/database';
import {
  generatePersonalizedReminder,
  generateMotivationalMessage,
  detectBehaviouralPatterns,
  buildInsightObject,
} from '../services/aiService';
import { scheduleTaskReminder } from '../services/notifications';
import { CATEGORY_INFO, MOOD_LABELS } from '../constants/exercises';

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState('Friend');
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [motivationMsg, setMotivationMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [streakDays, setStreakDays] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [todayTasks, user, moods, sessions] = await Promise.all([
        getTodaysTasks(),
        getUser(),
        getMoodEntries(7),
        getExerciseSessions(7),
      ]);
      setTasks(todayTasks);
      if (user) {
        setUserName(user.name.split(' ')[0]);
        // Simple streak calculation
        const streak = sessions.reduce((acc, s) => {
          const d = new Date(s.startedAt);
          const today = new Date();
          const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
          return diff < 7 ? acc + 1 : acc;
        }, 0);
        setStreakDays(streak);
      }

      // Load AI insights asynchronously
      setAiLoading(true);
      const completed = todayTasks.filter(t => t.isCompleted).length;
      const [reminder, pattern] = await Promise.all([
        generatePersonalizedReminder({
          userName: userName,
          recentTasks: todayTasks,
          moodEntries: moods,
          exerciseSessions: sessions,
          stats: {},
        }).catch(() => null),
        detectBehaviouralPatterns({
          userName: userName,
          recentTasks: todayTasks,
          moodEntries: moods,
          exerciseSessions: sessions,
          stats: {},
        }).catch(() => null),
      ]);
      if (pattern) setInsight(buildInsightObject(pattern, 'alert'));
      else if (reminder) setInsight(buildInsightObject(reminder, 'reminder'));

      const motivation = await generateMotivationalMessage(
        userName,
        completed,
        todayTasks.length,
        streakDays
      ).catch(() => '');
      setMotivationMsg(motivation);
    } catch (e) {
      console.error('loadData error', e);
    } finally {
      setLoading(false);
      setAiLoading(false);
      setRefreshing(false);
    }
  }, [userName, streakDays]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleTask = async (task: Task) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !task.isCompleted;
    await updateTaskCompletion(task.id, newState);
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, isCompleted: newState } : t)));
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progress = tasks.length > 0 ? completedCount / tasks.length : 0;
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

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

        {/* Streak Banner */}
        {streakDays > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>{streakDays} day streak! Keep it up!</Text>
          </View>
        )}

        {/* AI Insight Card */}
        {insight && !insight.dismissed && (
          <Card style={[styles.insightCard, insight.type === 'alert' && styles.alertCard]}>
            <View style={styles.insightRow}>
              <Text style={styles.insightIcon}>{insight.type === 'alert' ? '⚠️' : '🧠'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightLabel}>
                  {insight.type === 'alert' ? 'AI Alert' : 'AI Insight'}
                </Text>
                <Text style={styles.insightText}>{insight.message}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setInsight(prev => (prev ? { ...prev, dismissed: true } : null))}
              >
                <Ionicons name="close" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Motivation Message */}
        {motivationMsg ? (
          <Card style={styles.motivationCard}>
            <Text style={styles.motivationText}>✨ {motivationMsg}</Text>
          </Card>
        ) : null}

        {/* Today's Progress */}
        <Card>
          <SectionHeader
            title="Today's Progress"
            subtitle={`${completedCount} of ${tasks.length} tasks done`}
          />
          <ProgressBar progress={progress} color={Colors.primary} height={10} />
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>{completedCount}</Text>
              <Text style={styles.statLbl}>Done</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={[styles.statNum, { color: Colors.warning }]}>
                {tasks.length - completedCount}
              </Text>
              <Text style={styles.statLbl}>Remaining</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={[styles.statNum, { color: Colors.accent }]}>{streakDays}</Text>
              <Text style={styles.statLbl}>Day Streak</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { label: 'Add Task', icon: 'add-circle', color: Colors.primary, screen: 'AddTask' },
            { label: 'Log Mood', icon: 'happy', color: Colors.secondary, screen: 'MoodLog' },
            { label: 'Exercise', icon: 'fitness', color: Colors.accent, screen: 'Exercises' },
            { label: 'Screening', icon: 'school', color: Colors.warning, screen: 'Screening' },
          ].map(q => (
            <TouchableOpacity
              key={q.screen}
              style={styles.quickBtn}
              onPress={() => navigation.navigate(q.screen)}
            >
              <View style={[styles.quickIcon, { backgroundColor: q.color + '20' }]}>
                <Ionicons name={q.icon as any} size={24} color={q.color} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Tasks */}
        <SectionHeader
          title="Today's Tasks"
          subtitle={new Date().toLocaleDateString('en-ZA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
          action={{ label: 'View all', onPress: () => navigation.navigate('Tasks') }}
        />

        {tasks.length === 0 ? (
          <EmptyState
            emoji="📋"
            title="No tasks today"
            subtitle="Add tasks to stay organised and on track"
            action={{ label: 'Add First Task', onPress: () => navigation.navigate('AddTask') }}
          />
        ) : (
          tasks
            .slice(0, 5)
            .map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} />)
        )}

        {tasks.length > 5 && (
          <Button
            title={`View all ${tasks.length} tasks`}
            onPress={() => navigation.navigate('Tasks')}
            variant="outline"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Task Item Component ────────────────────────────────────────────────────

const TaskItem: React.FC<{ task: Task; onToggle: (t: Task) => void }> = ({ task, onToggle }) => {
  const cat = CATEGORY_INFO[task.category] ?? CATEGORY_INFO.other;
  const time = new Date(task.scheduledTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={[styles.taskItem, task.isCompleted && styles.taskItemDone]}
      onPress={() => onToggle(task)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.taskCheck,
          task.isCompleted && { backgroundColor: Colors.primary, borderColor: Colors.primary },
        ]}
      >
        {task.isCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, task.isCompleted && styles.taskTitleDone]}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          <Text style={styles.taskTime}>⏰ {time}</Text>
          <View style={[styles.catBadge, { backgroundColor: cat.color + '20' }]}>
            <Text style={[styles.catText, { color: cat.color }]}>
              {cat.icon} {cat.label}
            </Text>
          </View>
        </View>
      </View>
      {task.priority === 'high' && <View style={styles.priorityDot} />}
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
  streakBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.warning + '20',
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakEmoji: { fontSize: 20 },
  streakText: { fontSize: Fonts.sizes.sm, color: Colors.warning, fontWeight: '600' },
  insightCard: { marginHorizontal: Spacing.lg, backgroundColor: Colors.primaryLight },
  alertCard: { backgroundColor: Colors.warningLight },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  insightIcon: { fontSize: 20, marginTop: 2 },
  insightLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: { fontSize: Fonts.sizes.sm, color: Colors.text, lineHeight: 20 },
  motivationCard: { marginHorizontal: Spacing.lg, backgroundColor: Colors.accentLight },
  motivationText: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.md },
  statPill: { alignItems: 'center' },
  statNum: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.primary },
  statLbl: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.text },
  taskItem: {
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
  taskItemDone: { opacity: 0.65 },
  taskCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  taskTime: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full },
  catText: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
});

export default HomeScreen;
