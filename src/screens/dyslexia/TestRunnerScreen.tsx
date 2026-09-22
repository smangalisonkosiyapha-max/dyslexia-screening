// src/screens/dyslexia/TestRunnerScreen.tsx
// One generic engine drives all five tests — each TestItem carries its own
// optional memorisation "stimulus" phase, so reading/grammar/scenario/maths
// (plain question+options) and memory (stimulus, then question) share the
// exact same runner instead of five separate screens.
//
// This is the "Submit Assessment" flow from the Sequence Diagram slide:
// answer items -> score -> save attempt+responses -> classify risk band.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../../constants/theme';
import { getItemsForTest, DYSLEXIA_TESTS } from '../../constants/dyslexiaTests';
import { DyslexiaTestType, ItemResponse, TestAttempt } from '../../constants/types';
import { ProgressBar } from '../../components/UIComponents';
import { insertTestAttempt, insertItemResponse } from '../../services/database';
import { classifyRisk } from '../../services/dyslexiaService';
import { syncAttempt } from '../../services/syncService';

type Phase = 'stimulus' | 'question';

const TestRunnerScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const testType: DyslexiaTestType = route.params.testType;
  const items = useMemo(() => getItemsForTest(testType), [testType]);
  const meta = DYSLEXIA_TESTS.find(t => t.type === testType)!;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('stimulus');
  const [selected, setSelected] = useState<string | null>(null);
  const responses = useRef<Omit<ItemResponse, 'id' | 'attemptId'>[]>([]);
  const itemStartedAt = useRef<number>(Date.now());
  const attemptStartedAt = useRef<Date>(new Date());

  const item = items[index];

  useEffect(() => {
    itemStartedAt.current = Date.now();
    setSelected(null);
    if (item?.stimulus) {
      setPhase('stimulus');
      const t = setTimeout(() => {
        setPhase('question');
        itemStartedAt.current = Date.now();
        Speech.speak(item.prompt, { rate: 0.9 });
      }, item.stimulusDisplayMs ?? 3000);
      return () => clearTimeout(t);
    } else {
      setPhase('question');
      Speech.speak(item.prompt, { rate: 0.9 });
    }
  }, [index]);

  if (!item) return null;

  const choose = async (option: string) => {
    if (selected) return; // prevent double-tap
    setSelected(option);
    const isCorrect = option === item.correctAnswer;
    responses.current.push({
      itemId: item.id,
      studentAnswer: option,
      isCorrect,
      responseTimeMs: Date.now() - itemStartedAt.current,
    });
    await Haptics.notificationAsync(
      isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );

    setTimeout(() => {
      if (index + 1 < items.length) {
        setIndex(index + 1);
      } else {
        finishAttempt();
      }
    }, 500);
  };

  const finishAttempt = async () => {
    const rawScore = responses.current.filter(r => r.isCorrect).length;
    const maxScore = items.length;
    const accuracy = maxScore > 0 ? rawScore / maxScore : 0;
    const riskBand = classifyRisk(accuracy);
    const durationSeconds = Math.round((Date.now() - attemptStartedAt.current.getTime()) / 1000);

    const attempt: TestAttempt = {
      id: `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      testType,
      startedAt: attemptStartedAt.current,
      completedAt: new Date(),
      rawScore, maxScore, accuracy, riskBand,
      durationSeconds,
    };

    await insertTestAttempt(attempt);
    const savedResponses: ItemResponse[] = [];
    for (const r of responses.current) {
      const full: ItemResponse = {
        id: `resp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        attemptId: attempt.id,
        ...r,
      };
      await insertItemResponse(full);
      savedResponses.push(full);
    }

    // Best-effort push to the Disability Unit backend — never blocks the
    // student from seeing their result, and safe to retry later if offline.
    syncAttempt(attempt, savedResponses);

    navigation.replace('Results', { attemptId: attempt.id, testType });
  };

  const progress = (index + (phase === 'question' && selected ? 1 : 0)) / items.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{meta.title}</Text>
        <Text style={styles.headerCount}>{index + 1}/{items.length}</Text>
      </View>
      <View style={styles.progressWrap}>
        <ProgressBar progress={progress} color={Colors.primary} height={6} />
      </View>

      <View style={styles.body}>
        {phase === 'stimulus' && item.stimulus ? (
          <View style={styles.stimulusWrap}>
            <Text style={styles.stimulusLabel}>Remember this:</Text>
            <Text style={styles.stimulusText}>{item.stimulus}</Text>
          </View>
        ) : (
          <>
            <View style={styles.promptCard}>
              <Text style={styles.promptText}>{item.prompt}</Text>
            </View>
            <View style={styles.optionsWrap}>
              {item.options.map(opt => {
                const isSelected = selected === opt;
                const isCorrectOpt = selected && opt === item.correctAnswer;
                const isWrongSelected = isSelected && opt !== item.correctAnswer;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionBtn,
                      isCorrectOpt && styles.optionCorrect,
                      isWrongSelected && styles.optionWrong,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => choose(opt)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        (isCorrectOpt || isWrongSelected) && styles.optionTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
  headerCount: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, fontWeight: '600' },
  progressWrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  body: { flex: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center' },
  stimulusWrap: {
    backgroundColor: Colors.primaryLight, borderRadius: Radii.xl,
    paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.lg, alignItems: 'center',
  },
  stimulusLabel: { fontSize: Fonts.sizes.md, color: Colors.primary, fontWeight: '600', marginBottom: Spacing.md },
  stimulusText: { fontSize: 30, fontWeight: '800', color: Colors.primaryDark, letterSpacing: 1, textAlign: 'center' },
  promptCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadows.sm,
  },
  promptText: { fontSize: Fonts.sizes.lg, fontWeight: '600', color: Colors.text, lineHeight: 26 },
  optionsWrap: { gap: Spacing.md },
  optionBtn: {
    backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1.5,
    borderColor: Colors.border, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
  },
  optionCorrect: { backgroundColor: Colors.successLight, borderColor: Colors.success },
  optionWrong: { backgroundColor: Colors.dangerLight, borderColor: Colors.danger },
  optionText: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  optionTextActive: { color: Colors.text },
});

export default TestRunnerScreen;
