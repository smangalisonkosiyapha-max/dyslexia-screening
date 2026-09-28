// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { getTipOfTheDay } from '../constants/dyslexiaTests';

// ── SDK 53+: shouldShowAlert/shouldPlaySound/shouldSetBadge are deprecated.
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

  await Notifications.setNotificationChannelAsync('screening-reminders', {
    name: 'Screening Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6C63FF',
    sound: 'default',
    enableVibrate: true,
  });

  await Notifications.setNotificationChannelAsync('ai-insights', {
    name: 'Insights & Alerts',
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
          ? 'Go to Settings → CogniCare Dyslexia → Notifications and turn them on.'
          : 'Go to Settings → Apps → CogniCare Dyslexia → Notifications and enable them.',
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
        // Expected in Expo Go on SDK 53+ — remote push requires a dev build there.
        console.warn('Remote push token unavailable (expected in Expo Go):', tokenError);
      }
    }

    return 'local-notifications-enabled';
  } catch (err) {
    console.error('registerForPushNotificationsAsync failed:', err);
    return null;
  }
};

// ── AI insight / result alert notification ─────────────────────────────────
export const scheduleInsightNotification = async (
  title: string,
  body: string,
  delaySeconds = 0
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🧠 ${title}`,
        body,
        data: { type: 'ai-insight' },
        sound: 'default',
      },
      trigger:
        delaySeconds > 0
          ? ({
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: delaySeconds,
              ...(Platform.OS === 'android' ? { channelId: 'ai-insights' } : {}),
            } as any)
          : null,
    });
  } catch (err) {
    console.warn('scheduleInsightNotification error:', err);
  }
};

// ── Daily screening check-in ────────────────────────────────────────────────
// A single daily reminder, not a morning/evening pair — one nudge to
// finish remaining screening tests or check the latest result.
//
// IMPORTANT: a repeating daily trigger on expo-notifications SDK 53+ must
// use { type: SchedulableTriggerInputTypes.DAILY, hour, minute } — the old
// bare { hour, minute, repeats: true } shape (no `type`) is not a valid
// schedulable trigger on current SDKs and can fire at the wrong time
// (e.g. immediately, regardless of hour/minute) instead of respecting the
// scheduled time. This was the cause of a "good morning" notification
// showing up in the evening.
export const scheduleDailyCheckIn = async (hour = 9, minute = 0): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // NOTE: this is a repeating trigger, so the tip text is fixed at the
    // moment it's scheduled — it won't silently rotate day to day on its
    // own. It refreshes whenever this function re-runs (e.g. toggling the
    // setting off/on, or re-registering on app start). For a tip that's
    // reliably fresh every single day regardless of notification settings,
    // see the "Tip of the day" card on the Home screen instead, which
    // re-picks getTipOfTheDay() on every visit.
    const tip = getTipOfTheDay();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Screening check-in',
        body: `Got a few minutes? Continue your dyslexia screening, or try today's tip: ${tip}`,
        data: { type: 'daily-checkin' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: 'screening-reminders' } : {}),
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
