// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { SCROLL_BOTTOM_PADDING } from '../constants/layout';
import { UserProfile } from '../constants/types';
import { Button, Card } from '../components/UIComponents';
import { getUser, upsertUser } from '../services/database';
import { isSupabaseConfigured } from '../services/supabase';
import { signOut } from '../services/authService';
import { registerForPushNotificationsAsync, scheduleDailyCheckIn } from '../services/notifications';
import {
  requestLocationPermission,
  getLocationAddress,
  getNearbyResources,
} from '../services/locationService';
import { NearbyResource } from '../services/locationService';

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverContact, setCaregiverContact] = useState('');
  const [notifs, setNotifs] = useState(true);
  const [location, setLocation] = useState(false);
  const [locationAddr, setLocationAddr] = useState('');
  const [resources, setResources] = useState<NearbyResource[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const user = await getUser();
    if (user) {
      setProfile(user);
      setName(user.name);
      setCaregiverName(user.caregiverName ?? '');
      setCaregiverContact(user.caregiverContact ?? '');
      setNotifs(user.notificationsEnabled);
      setLocation(user.locationEnabled);
      if (user.locationEnabled) loadLocation();
    }
  };

  const loadLocation = async () => {
    const addr = await getLocationAddress();
    if (addr) setLocationAddr(addr);
    const res = await getNearbyResources();
    setResources(res);
  };

  const toggleNotifications = async (val: boolean) => {
    setNotifs(val);
    if (val) {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) {
          // registerForPushNotificationsAsync already showed an Alert with instructions
          setNotifs(false);
          return;
        }
        await scheduleDailyCheckIn();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.error('toggleNotifications error:', e);
        setNotifs(false);
      }
    }
  };

  const toggleLocation = async (val: boolean) => {
    setLocation(val);
    if (val) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert('Location permission denied.');
        setLocation(false);
        return;
      }
      loadLocation();
    }
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Please enter your name');
      return;
    }
    setSaving(true);
    const updated: UserProfile = {
      id: profile?.id ?? `user_${Date.now()}`,
      name: name.trim(),
      caregiverName: caregiverName.trim() || undefined,
      caregiverContact: caregiverContact.trim() || undefined,
      onboardingComplete: true,
      notificationsEnabled: notifs,
      locationEnabled: location,
      preferredLanguage: 'en',
      dailyGoalTasks: 5,
      dailyGoalExercises: 3,
    };
    await upsertUser(updated);
    setProfile(updated);
    setEditing(false);
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resourceIcon = (type: NearbyResource['type']) =>
    ({
      disability_unit: '🏛️',
      learning_centre: '📚',
      educational_psychologist: '🧠',
      tutoring_centre: '✏️',
    })[type];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile & Settings</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Ionicons name={editing ? 'close' : 'pencil'} size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.avatarName}>{name || 'Set your name'}</Text>
          {locationAddr ? <Text style={styles.avatarLocation}>📍 {locationAddr}</Text> : null}
        </View>

        {/* Personal Info */}
        <Card style={{ marginHorizontal: Spacing.lg }}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          {editing ? (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Your Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Caregiver Name</Text>
                <TextInput
                  style={styles.input}
                  value={caregiverName}
                  onChangeText={setCaregiverName}
                  placeholder="Optional"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Caregiver Contact</Text>
                <TextInput
                  style={styles.input}
                  value={caregiverContact}
                  onChangeText={setCaregiverContact}
                  placeholder="Phone or email"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
              <Button title="Save Changes" onPress={save} loading={saving} />
            </>
          ) : (
            <>
              <InfoRow label="Name" value={name || '—'} />
              <InfoRow label="Caregiver" value={caregiverName || 'Not set'} />
              <InfoRow label="Contact" value={caregiverContact || 'Not set'} />
            </>
          )}
        </Card>

        {/* Settings */}
        <Card style={{ marginHorizontal: Spacing.lg }}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <SettingRow
            icon="notifications"
            label="Push Notifications"
            subtitle="Task reminders and AI alerts"
            value={notifs}
            onChange={toggleNotifications}
          />
          <SettingRow
            icon="location"
            label="Location Services"
            subtitle="Find nearby Disability Unit & learning support"
            value={location}
            onChange={toggleLocation}
          />
        </Card>

        {/* Nearby Resources */}
        {location && resources.length > 0 && (
          <Card style={{ marginHorizontal: Spacing.lg }}>
            <Text style={styles.cardTitle}>Nearby Support</Text>
            {resources.map((r, i) => (
              <View key={i} style={styles.resourceRow}>
                <Text style={styles.resourceIcon}>{resourceIcon(r.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resourceName}>{r.name}</Text>
                  <Text style={styles.resourceAddr}>{r.address}</Text>
                </View>
                <Text style={styles.resourceDist}>{r.distance}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* About */}
        <Card style={{ marginHorizontal: Spacing.lg }}>
          <Text style={styles.cardTitle}>About CogniCare Dyslexia</Text>
          <Text style={styles.about}>
            CogniCare Dyslexia offers short, evidence-informed screening tests for common dyslexia
            indicators, tracks your results over time, and connects you with your institution's
            Disability Unit and learning support resources.
          </Text>
          <Text style={[styles.about, { marginTop: 8, color: Colors.textMuted }]}>
            Version 1.0.0
          </Text>
        </Card>

        {isSupabaseConfigured && (
          <Button
            title="Sign Out"
            variant="outline"
            onPress={() => signOut()}
            style={{ marginHorizontal: Spacing.lg, marginTop: Spacing.md }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const SettingRow: React.FC<{
  icon: string;
  label: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon, label, subtitle, value, onChange }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingIcon}>
      <Ionicons name={icon as any} size={20} color={Colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingSubtitle}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: Colors.primary }}
      thumbColor="#fff"
    />
  </View>
);

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
  title: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarName: { fontSize: Fonts.sizes.xl, fontWeight: '700', color: Colors.text },
  avatarLocation: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
  cardTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  infoValue: { fontSize: Fonts.sizes.sm, color: Colors.text, fontWeight: '500' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  settingSubtitle: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  resourceIcon: { fontSize: 24 },
  resourceName: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.text },
  resourceAddr: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  resourceDist: { fontSize: Fonts.sizes.xs, color: Colors.primary, fontWeight: '600' },
  about: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, lineHeight: 22 },
});

export default ProfileScreen;
