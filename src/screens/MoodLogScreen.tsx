// src/screens/MoodLogScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { MoodEntry, MoodLevel } from '../constants/types';
import { Button } from '../components/UIComponents';
import { insertMoodEntry } from '../services/database';
import { MOOD_LABELS } from '../constants/exercises';

const MOOD_FACTORS = [
  'Good sleep',
  'Poor sleep',
  'Exercise done',
  'Skipped meds',
  'Social interaction',
  'Felt isolated',
  'Completed goals',
  'Overwhelmed',
  'Ate well',
  'Skipped meals',
  'Felt calm',
  'Felt anxious',
];

const MoodLogScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleFactor = (f: string) => {
    setSelectedFactors(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]));
  };

  const speak = (text: string) => Speech.speak(text, { rate: 0.85 });

  const save = async () => {
    if (!mood || !energy) {
      Alert.alert('Please rate both your mood and energy level');
      return;
    }
    setSaving(true);
    const entry: MoodEntry = {
      id: `mood_${Date.now()}`,
      date: new Date(),
      mood,
      energy,
      notes: notes.trim() || undefined,
      factors: selectedFactors.length > 0 ? selectedFactors : undefined,
    };
    await insertMoodEntry(entry);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speak(`Mood logged. You rated your mood as ${MOOD_LABELS[mood].label}.`);
    setSaving(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>How are you feeling?</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-ZA', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>

        {/* Mood Scale */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Mood</Text>
          <View style={styles.moodRow}>
            {([1, 2, 3, 4, 5] as MoodLevel[]).map(m => {
              const ml = MOOD_LABELS[m];
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.moodBtn,
                    mood === m && {
                      backgroundColor: ml.color + '25',
                      borderColor: ml.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    setMood(m);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    speak(ml.label);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.moodEmoji}>{ml.emoji}</Text>
                  <Text style={[styles.moodLabel, mood === m && { color: ml.color }]}>
                    {ml.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Energy Scale */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Energy Level</Text>
          <View style={styles.energyRow}>
            {[1, 2, 3, 4, 5].map(e => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.energyBtn,
                  energy === e && {
                    backgroundColor: Colors.warning + '25',
                    borderColor: Colors.warning,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  setEnergy(e);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.energyNum}>{e}</Text>
                <Text style={styles.energyBar}>{'⚡'.repeat(e)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.energyScale}>
            <Text style={styles.scaleLabel}>Very Low</Text>
            <Text style={styles.scaleLabel}>Very High</Text>
          </View>
        </View>

        {/* Factors */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What influenced your mood?</Text>
          <View style={styles.factorsGrid}>
            {MOOD_FACTORS.map(f => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.factorChip,
                  selectedFactors.includes(f) && styles.factorChipSelected,
                ]}
                onPress={() => toggleFactor(f)}
              >
                <Text
                  style={[
                    styles.factorText,
                    selectedFactors.includes(f) && styles.factorTextSelected,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="How was your day? Any thoughts to share..."
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button — uses insets so it always clears the tab bar */}
        <View style={[styles.saveBtn, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          <Button
            title="Save Mood Entry"
            onPress={save}
            loading={saving}
            disabled={!mood || !energy}
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg },
  back: { fontSize: Fonts.sizes.md, color: Colors.primary, marginBottom: 12 },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  date: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  moodEmoji: { fontSize: 24, marginBottom: 4 },
  moodLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  energyRow: { flexDirection: 'row', gap: 8 },
  energyBtn: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  energyNum: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.text },
  energyBar: { fontSize: 10, marginTop: 2 },
  energyScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  scaleLabel: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },
  factorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  factorChipSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  factorText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  factorTextSelected: { color: Colors.primary, fontWeight: '700' },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
  },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});

export default MoodLogScreen;
