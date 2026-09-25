// src/screens/OnboardingScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { Button } from '../components/UIComponents';
import { upsertUser } from '../services/database';
import { registerForPushNotificationsAsync, scheduleDailyCheckIn } from '../services/notifications';
import { requestLocationPermission } from '../services/locationService';
import { UserProfile } from '../constants/types';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🧠',
    title: 'Welcome to CogniCare Dyslexia',
    subtitle:
      'A quick, private way to screen for common dyslexia indicators — reading, spelling, phonological awareness, and more.',
    color: Colors.primary,
  },
  {
    id: '2',
    emoji: '📝',
    title: 'Five Short Tests',
    subtitle:
      'Each test takes just a few minutes. Work through them at your own pace, whenever suits you — you can pick up where you left off.',
    color: Colors.secondary,
  },
  {
    id: '3',
    emoji: '📊',
    title: 'Understand Your Results',
    subtitle:
      'After each test you get a clear risk band — low, moderate, or high — plus practical next steps if support is recommended.',
    color: Colors.accent,
  },
  {
    id: '4',
    emoji: '🏛️',
    title: 'Connect With Support',
    subtitle:
      'See your progress over time, and find your institution\u2019s Disability Unit and nearby learning support resources when you need them.',
    color: Colors.warning,
  },
  {
    id: '5',
    emoji: '👤',
    title: "Let's Get Started",
    subtitle: 'Tell us a bit about yourself so we can personalise your experience.',
    color: Colors.primary,
    isForm: true,
  },
];

const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Form state
  const [name, setName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [notifGranted, setNotifGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [saving, setSaving] = useState(false);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(i => i + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const enableNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await scheduleDailyCheckIn();
        setNotifGranted(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // If token is null the registerFor... function already showed an Alert
    } catch (e) {
      console.error('enableNotifications error:', e);
    }
  };

  const enableLocation = async () => {
    const granted = await requestLocationPermission();
    if (granted) {
      setLocationGranted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const finish = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const user: UserProfile = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      caregiverName: caregiverName.trim() || undefined,
      onboardingComplete: true,
      notificationsEnabled: notifGranted,
      locationEnabled: locationGranted,
      preferredLanguage: 'en',
      dailyGoalTasks: 5,
      dailyGoalExercises: 3,
    };
    await upsertUser(user);
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const renderSlide = ({ item }: { item: (typeof SLIDES)[0] }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.emojiCircle, { backgroundColor: item.color + '20' }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>

      {item.isForm && (
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Your Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sarah"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Caregiver / Support Person (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mom, Dr. Smith"
              placeholderTextColor={Colors.textMuted}
              value={caregiverName}
              onChangeText={setCaregiverName}
            />
          </View>

          <Text style={styles.permissionsTitle}>App Permissions</Text>

          <TouchableOpacity
            style={[styles.permBtn, notifGranted && styles.permBtnGranted]}
            onPress={enableNotifications}
          >
            <Ionicons
              name={notifGranted ? 'checkmark-circle' : 'notifications-outline'}
              size={22}
              color={notifGranted ? Colors.success : Colors.primary}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.permLabel}>Push Notifications</Text>
              <Text style={styles.permSub}>Reminders, AI alerts, daily check-ins</Text>
            </View>
            <Text
              style={[styles.permStatus, { color: notifGranted ? Colors.success : Colors.primary }]}
            >
              {notifGranted ? 'Enabled ✓' : 'Enable'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.permBtn, locationGranted && styles.permBtnGranted]}
            onPress={enableLocation}
          >
            <Ionicons
              name={locationGranted ? 'checkmark-circle' : 'location-outline'}
              size={22}
              color={locationGranted ? Colors.success : Colors.primary}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.permLabel}>Location</Text>
              <Text style={styles.permSub}>Find nearby Disability Unit & learning support</Text>
            </View>
            <Text
              style={[
                styles.permStatus,
                { color: locationGranted ? Colors.success : Colors.primary },
              ]}
            >
              {locationGranted ? 'Enabled ✓' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { width: dotWidth, opacity, backgroundColor: SLIDES[currentIndex].color },
              ]}
            />
          );
        })}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        {isLast ? (
          <Button
            title="Get Started 🚀"
            onPress={finish}
            loading={saving}
            disabled={!name.trim()}
            size="lg"
            style={{ flex: 1 }}
          />
        ) : (
          <Button title="Next →" onPress={goNext} size="lg" style={{ flex: 1 }} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 40,
  },
  emojiCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emoji: { fontSize: 56 },
  slideTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideSubtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  form: { width: '100%', marginTop: Spacing.xl },
  field: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  permissionsTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: 10,
  },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  permBtnGranted: { borderColor: Colors.success, backgroundColor: Colors.successLight },
  permLabel: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  permSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  permStatus: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.lg,
  },
  dot: { height: 8, borderRadius: 4 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
  },
});

export default OnboardingScreen;
