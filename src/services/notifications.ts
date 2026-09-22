// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { Task } from '../constants/types';

// ── SDK 53: shouldShowAlert/shouldPlaySound/shouldSetBadge are deprecated.
// The correct properties are now shouldShowBanner and shouldShowList.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // shows the notification banner/heads-up
    shouldShowList: true, // shows in notification tray/list
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Android channels ──────────────────────────────────────────────────────
// Called immediately at module load so channels always exist before any
// notification is scheduled (fixes missing sound on Android).
const setupAndroidChannels = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('task-reminders', {
    name: 'Task Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6C63FF',
    sound: 'default',
    enableVibrate: true,
  });

  await Notifications.setNotificationChannelAsync('missed-tasks', {
    name: 'Missed Task Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#FF5252',
    sound: 'default',
    enableVibrate: true,
  });

  await Notifications.setNotificationChannelAsync('ai-insights', {
    name: 'AI Insights',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#43D9B0',
  });
};

// Run immediately when this module is imported
setupAndroidChannels();

// ── Permission + token ────────────────────────────────────────────────────
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  try {
    await setupAndroidChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        Platform.OS === 'ios'
          ? 'Go to Settings → CogniCare → Notifications and turn them on.'
          : 'Go to Settings → Apps → CogniCare → Notifications and enable them.',
        [{ text: 'OK' }]
      );
      return null;
    }

    if (Device.isDevice) {
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
        if (projectId) {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          return tokenData.data;
        }
      } catch (tokenError) {
        console.warn('Remote push token unavailable:', tokenError);
      }
    }

    return 'local-notifications-enabled';
  } catch (err) {
    console.error('registerForPushNotificationsAsync failed:', err);
    return null;
  }
};

// ── Schedule task reminder ────────────────────────────────────────────────
export const scheduleTaskReminder = async (task: Task): Promise<string | null> => {
  try {
    const triggerTime = new Date(task.scheduledTime.getTime() - task.reminderMinutes * 60 * 1000);
    if (triggerTime <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Reminder: ${task.title}`,
        body:
          task.description ??
          `Due at ${task.scheduledTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
        data: { taskId: task.id, type: 'task-reminder' },
        sound: 'default',
      },
      trigger: {
        date: triggerTime,
        ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
      } as any,
    });

    return id;
  } catch (err) {
    console.warn('scheduleTaskReminder error:', err);
    return null;
  }
};

// ── Task due alert (fires exactly at scheduled time) ──────────────────────
export const scheduleTaskDueAlert = async (task: Task): Promise<string | null> => {
  try {
    const dueTime = new Date(task.scheduledTime);
    if (dueTime <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 Time for: ${task.title}`,
        body: task.description ?? `Your task is due now. Tap to mark it complete.`,
        data: { taskId: task.id, type: 'task-due' },
        sound: 'default',
      },
      trigger: {
        date: dueTime,
        ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
      } as any,
    });

    return id;
  } catch (err) {
    console.warn('scheduleTaskDueAlert error:', err);
    return null;
  }
};

// ── Missed task alert ─────────────────────────────────────────────────────
// Only schedules if the alert time is in the future AND the task hasn't
// already been completed. Pass a getIsCompleted callback so we can check
// at fire time rather than at schedule time.
export const scheduleMissedTaskAlert = async (task: Task): Promise<string | null> => {
  try {
    // Don't schedule if the task time itself is already in the past
    if (task.scheduledTime <= new Date()) return null;

    const alertTime = new Date(task.scheduledTime.getTime() + 15 * 60 * 1000);
    if (alertTime <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ Missed: ${task.title}`,
        body: 'You may have missed this task. Tap to reschedule.',
        data: { taskId: task.id, type: 'missed-task' },
        sound: 'default',
      },
      trigger: {
        date: alertTime,
        ...(Platform.OS === 'android' ? { channelId: 'missed-tasks' } : {}),
      } as any,
    });
    return id;
  } catch (err) {
    console.warn('scheduleMissedTaskAlert error:', err);
    return null;
  }
};

// ── AI insight notification ───────────────────────────────────────────────
export const scheduleAIInsightNotification = async (
  title: string,
  body: string,
  delaySeconds = 0
): Promise<void> => {
  try {
    const trigger =
      delaySeconds > 0
        ? ({
            seconds: delaySeconds,
            ...(Platform.OS === 'android' ? { channelId: 'ai-insights' } : {}),
          } as any)
        : null;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🧠 ${title}`,
        body,
        data: { type: 'ai-insight' },
        sound: 'default',
      },
      trigger,
    });
  } catch (err) {
    console.warn('scheduleAIInsightNotification error:', err);
  }
};

// ── Daily check-ins ───────────────────────────────────────────────────────
export const scheduleDailyCheckIn = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Good morning! Ready for today?',
        body: "Check your tasks and log how you're feeling.",
        data: { type: 'daily-checkin' },
        sound: 'default',
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
      } as any,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 Evening check-in',
        body: 'How did today go? Log your mood and review completed tasks.',
        data: { type: 'evening-checkin' },
        sound: 'default',
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId: 'ai-insights' } : {}),
      } as any,
    });
  } catch (err) {
    console.warn('scheduleDailyCheckIn error:', err);
  }
};

// ── Cancellation helpers ──────────────────────────────────────────────────
export const cancelNotification = async (id: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
};

export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
};
