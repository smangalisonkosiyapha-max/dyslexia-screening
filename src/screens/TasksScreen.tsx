// src/screens/TasksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { SCROLL_BOTTOM_PADDING } from '../constants/layout';
import { Task, TaskCategory } from '../constants/types';
import { Card, Button, SectionHeader, EmptyState, Badge } from '../components/UIComponents';
import {
  getTodaysTasks,
  getAllTasks,
  insertTask,
  updateTaskCompletion,
  deleteTask,
} from '../services/database';
import {
  scheduleTaskReminder,
  scheduleTaskDueAlert,
  scheduleMissedTaskAlert,
  cancelNotification,
} from '../services/notifications';
import { CATEGORY_INFO } from '../constants/exercises';

// Track missed-alert notification IDs so we can cancel them on completion
const missedAlertIds = new Map<string, string>();

const TasksScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'today' | 'all' | 'completed'>('today');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const t = filter === 'today' ? await getTodaysTasks() : await getAllTasks();
    const filtered = filter === 'completed' ? t.filter(x => x.isCompleted) : t;
    setTasks(filtered);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [filter]);

  const toggle = async (task: Task) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowCompleted = !task.isCompleted;
    await updateTaskCompletion(task.id, nowCompleted);
    // If marking as complete, cancel the pending missed-task alert
    if (nowCompleted) {
      const missedId = missedAlertIds.get(task.id);
      if (missedId) {
        await cancelNotification(missedId);
        missedAlertIds.delete(task.id);
      }
    }
    load();
  };

  const remove = (task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          load();
        },
      },
    ]);
  };

  const onTaskAdded = () => {
    setShowAdd(false);
    load();
  };

  const priorityColor = { low: Colors.success, medium: Colors.warning, high: Colors.danger };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {(['today', 'all', 'completed'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
      >
        {tasks.length === 0 ? (
          <EmptyState
            emoji="✅"
            title={filter === 'completed' ? 'No completed tasks yet' : 'No tasks here'}
            subtitle="Tap + to add a new task"
            action={{ label: 'Add Task', onPress: () => setShowAdd(true) }}
          />
        ) : (
          tasks.map(task => {
            const cat = CATEGORY_INFO[task.category] ?? CATEGORY_INFO.other;
            return (
              <View
                key={task.id}
                style={[styles.taskCard, task.isCompleted && styles.taskCardCompleted]}
              >
                {task.isCompleted && (
                  <View style={styles.completedBanner}>
                    <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                    <Text style={styles.completedBannerText}>Completed</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.taskLeft} onPress={() => toggle(task)}>
                  <View
                    style={[
                      styles.check,
                      task.isCompleted && {
                        backgroundColor: Colors.primary,
                        borderColor: Colors.primary,
                      },
                    ]}
                  >
                    {task.isCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <View style={styles.taskTitleRow}>
                    <Text style={[styles.taskTitle, task.isCompleted && styles.done]}>
                      {task.title}
                    </Text>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: priorityColor[task.priority] + '20' },
                      ]}
                    >
                      <Text style={[styles.priorityText, { color: priorityColor[task.priority] }]}>
                        {task.priority}
                      </Text>
                    </View>
                  </View>
                  {task.description ? (
                    <Text style={styles.taskDesc}>{task.description}</Text>
                  ) : null}
                  <View style={styles.taskMeta}>
                    <Text style={styles.metaText}>
                      ⏰{' '}
                      {new Date(task.scheduledTime).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      {new Date(task.scheduledTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <View style={[styles.catChip, { backgroundColor: cat.color + '15' }]}>
                      <Text style={[styles.catText, { color: cat.color }]}>
                        {cat.icon} {cat.label}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => remove(task)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <AddTaskForm onClose={() => setShowAdd(false)} onSaved={onTaskAdded} />
      </Modal>
    </SafeAreaView>
  );
};

// ── Add Task Form ─────────────────────────────────────────────────────────

const AddTaskForm: React.FC<{ onClose: () => void; onSaved: () => void }> = ({
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const defaultDate = new Date();
  defaultDate.setHours(defaultDate.getHours() + 1, 0, 0, 0); // default: 1 hour from now
  const [date, setDate] = useState(defaultDate);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [reminder, setReminder] = useState(10);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Please enter a task title');
      return;
    }
    setSaving(true);
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      description: desc.trim() || undefined,
      scheduledTime: date,
      isCompleted: false,
      isRecurring: recurring,
      category,
      priority,
      reminderMinutes: reminder,
      createdAt: new Date(),
    };
    await insertTask(task);
    await scheduleTaskReminder(task); // fires X min before task time
    await scheduleTaskDueAlert(task); // fires exactly at task time (rings the phone)
    const missedId = await scheduleMissedTaskAlert(task); // fires 15 min after if not completed
    if (missedId) missedAlertIds.set(task.id, missedId);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    onSaved();
  };

  return (
    <SafeAreaView style={styles.formContainer}>
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.formCancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.formTitle}>New Task</Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          <Text style={[styles.formSave, saving && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 80 }}
      >
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Task Title *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Take morning medication"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Add details..."
            placeholderTextColor={Colors.textMuted}
            value={desc}
            onChangeText={setDesc}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.keys(CATEGORY_INFO) as TaskCategory[]).map(c => {
                const info = CATEGORY_INFO[c];
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.catBtn,
                      category === c && {
                        borderColor: info.color,
                        backgroundColor: info.color + '15',
                      },
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={{ fontSize: 16 }}>{info.icon}</Text>
                    <Text style={[styles.catBtnText, category === c && { color: info.color }]}>
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['low', 'medium', 'high'] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityBtnText, priority === p && { color: Colors.primary }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date & Time</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.dateBtnText}>
              {date.toLocaleDateString('en-ZA', {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTime(true)}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.dateBtnText}>
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </View>

        {showDate && (
          <DateTimePicker
            value={date}
            mode="date"
            onChange={(_, d) => {
              setShowDate(false);
              if (d) setDate(prev => new Date(d.setHours(prev.getHours(), prev.getMinutes())));
            }}
            minimumDate={new Date()}
          />
        )}
        {showTime && (
          <DateTimePicker
            value={date}
            mode="time"
            onChange={(_, d) => {
              setShowTime(false);
              if (d) setDate(prev => new Date(prev.setHours(d.getHours(), d.getMinutes())));
            }}
          />
        )}

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Reminder {reminder} min before</Text>
          <View style={styles.reminderBtns}>
            {[5, 10, 15, 30].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.remBtn, reminder === m && styles.remBtnActive]}
                onPress={() => setReminder(m)}
              >
                <Text style={[styles.remBtnText, reminder === m && { color: Colors.primary }]}>
                  {m}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Recurring daily</Text>
          <Switch
            value={recurring}
            onValueChange={setRecurring}
            trackColor={{ true: Colors.primary }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: 8,
    gap: 12,
    ...Shadows.sm,
  },
  taskCardCompleted: {
    opacity: 0.75,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    backgroundColor: Colors.success + '08',
  },
  completedBanner: {
    position: 'absolute',
    top: 8,
    right: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.success + '18',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  completedBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  taskLeft: { paddingTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  taskTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text, flex: 1 },
  done: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskDesc: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  catChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full },
  catText: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full },
  priorityText: { fontSize: Fonts.sizes.xs, fontWeight: '600', textTransform: 'capitalize' },
  deleteBtn: { padding: 4 },
  formContainer: { flex: 1, backgroundColor: Colors.background },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  formCancel: { fontSize: Fonts.sizes.md, color: Colors.textSecondary },
  formTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text },
  formSave: { fontSize: Fonts.sizes.md, color: Colors.primary, fontWeight: '700' },
  field: { marginBottom: Spacing.lg },
  fieldLabel: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  catBtnText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  priorityBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  priorityBtnText: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textSecondary },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateBtnText: { fontSize: Fonts.sizes.md, color: Colors.text },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  reminderBtns: { flexDirection: 'row', gap: 6 },
  remBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  remBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  remBtnText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textSecondary },
});

export default TasksScreen;
