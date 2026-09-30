// src/screens/dyslexia/ResultsScreen.tsx
// Shows the risk band + per-marker breakdown for one attempt, and — only
// for Moderate/High results — offers an AI-generated remedial exercise.
// (Low-risk attempts skip generation entirely: see the "alt" fragment on
// the Sequence Diagram slide.)

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../../constants/theme';
import { useScrollBottomPadding } from '../../constants/layout';
import { RISK_BAND_INFO, DYSLEXIA_TESTS } from '../../constants/dyslexiaTests';
import { MarkerBreakdown, RemedialExercise, TestAttempt } from '../../constants/types';
import { Card, Button, ProgressBar, Badge } from '../../components/UIComponents';
import {
  getAttemptById, getMarkerBreakdown, getRemedialExercisesForAttempt, insertRemedialExercise,
  markExerciseComplete,
} from '../../services/database';
import { generateRemedialProgram, weakestMarker } from '../../services/dyslexiaService';
import { syncRemedialExercise } from '../../services/syncService';
import { Ionicons } from '@expo/vector-icons';

const RISK_COLORS = {
  low: { color: Colors.success, bg: Colors.successLight },
  moderate: { color: Colors.warning, bg: Colors.warningLight },
  high: { color: Colors.danger, bg: Colors.dangerLight },
} as const;

const MARKER_LABELS: Record<string, string> = {
  decoding_fluency: 'Decoding & Fluency',
  phonological_mapping: 'Spelling & Phonological Mapping',
  working_memory: 'Working Memory',
  applied_comprehension: 'Applied Comprehension',
  numeracy_comorbidity: 'Numeracy',
};

const ResultsScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const bottomPadding = useScrollBottomPadding();
  const { attemptId, testType } = route.params;
  const meta = DYSLEXIA_TESTS.find(t => t.type === testType)!;

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [breakdown, setBreakdown] = useState<MarkerBreakdown[]>([]);
  const [exercises, setExercises] = useState<RemedialExercise[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const [a, b, ex] = await Promise.all([
        getAttemptById(attemptId),
        getMarkerBreakdown(attemptId),
        getRemedialExercisesForAttempt(attemptId),
      ]);
      setAttempt(a);
      setBreakdown(b);
      setExercises(ex);
    })();
  }, [attemptId]);

  const handleGenerate = async () => {
    const weak = weakestMarker(breakdown);
    if (!weak || !attempt) return;
    setGenerating(true);
    try {
      const steps = await generateRemedialProgram(weak.marker, weak.correct / weak.total);
      const newRecords: RemedialExercise[] = steps.map((step, i) => ({
        id: `remex_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        attemptId: attempt.id,
        marker: weak.marker,
        content: step.content,
        generatedAt: new Date(),
        source: step.source,
        stepIndex: i,
        completed: false,
      }));
      for (const record of newRecords) {
        await insertRemedialExercise(record);
        syncRemedialExercise(record); // best-effort, non-blocking
      }
      setExercises(prev => [...prev, ...newRecords]);
    } finally {
      setGenerating(false);
    }
  };

  const toggleStepComplete = async (ex: RemedialExercise) => {
    const nextCompleted = !ex.completed;
    setExercises(prev => prev.map(e => (e.id === ex.id ? { ...e, completed: nextCompleted } : e)));
    await markExerciseComplete(ex.id, nextCompleted);
    syncRemedialExercise({ ...ex, completed: nextCompleted }); // best-effort, non-blocking
  };

  if (!attempt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const riskInfo = attempt.riskBand ? RISK_BAND_INFO[attempt.riskBand] : null;
  const riskColors = attempt.riskBand ? RISK_COLORS[attempt.riskBand] : null;
  const showRemediation = attempt.riskBand === 'moderate' || attempt.riskBand === 'high';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: Spacing.lg }}
      >
        <Text style={styles.title}>{meta.title}</Text>
        <Text style={styles.subtitle}>Here's how it went</Text>

        {riskInfo && riskColors && (
          <View style={[styles.riskBanner, { backgroundColor: riskColors.bg }]}>
            <Badge label={riskInfo.label} color={riskColors.color} bgColor="#FFFFFF" />
            <Text style={[styles.riskDesc, { color: riskColors.color }]}>{riskInfo.description}</Text>
          </View>
        )}

        <Card>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{attempt.rawScore}/{attempt.maxScore}</Text>
              <Text style={styles.scoreLabel}>Correct</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{Math.round(attempt.accuracy * 100)}%</Text>
              <Text style={styles.scoreLabel}>Accuracy</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{attempt.durationSeconds}s</Text>
              <Text style={styles.scoreLabel}>Time taken</Text>
            </View>
          </View>
        </Card>

        {breakdown.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Breakdown</Text>
            {breakdown.map(b => (
              <View key={b.marker} style={{ marginBottom: Spacing.md }}>
                <ProgressBar
                  progress={b.total > 0 ? b.correct / b.total : 0}
                  color={Colors.primary}
                  label={MARKER_LABELS[b.marker] ?? b.marker}
                />
              </View>
            ))}
          </Card>
        )}

        {showRemediation && (
          <Card>
            <Text style={styles.sectionTitle}>Personalised Practice Program</Text>
            {exercises.length === 0 ? (
              <Text style={styles.helperText}>
                Get a 3-step practice program targeting the area you found trickiest — each step a little harder than the last.
              </Text>
            ) : (
              <>
                <Text style={styles.helperText}>
                  {exercises.filter(e => e.completed).length} of {exercises.length} steps done. Tick a step off as you complete it.
                </Text>
                {(() => {
                  // Group into batches wherever stepIndex resets to 0 — each
                  // "Get a Different Set" click starts a new batch, so this
                  // labels them clearly instead of showing one long,
                  // confusing continuous list of "Step 1/2/3" repeating.
                  const batches: RemedialExercise[][] = [];
                  exercises.forEach(ex => {
                    if ((ex.stepIndex ?? 0) === 0 || batches.length === 0) batches.push([]);
                    batches[batches.length - 1].push(ex);
                  });
                  return batches.map((batch, batchIndex) => (
                    <View key={batchIndex} style={styles.batchGroup}>
                      {batches.length > 1 && (
                        <Text style={styles.batchLabel}>
                          Set {batchIndex + 1}{batchIndex === batches.length - 1 ? ' (current)' : ''}
                        </Text>
                      )}
                      {batch.map(ex => (
                        <View key={ex.id} style={styles.exerciseBox}>
                          <View style={styles.exerciseHeader}>
                            <Text style={styles.exerciseMarker}>
                              Step {(ex.stepIndex ?? 0) + 1} · {MARKER_LABELS[ex.marker] ?? ex.marker}
                            </Text>
                            <TouchableOpacity onPress={() => toggleStepComplete(ex)} hitSlop={8}>
                              <Ionicons
                                name={ex.completed ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={ex.completed ? Colors.success : Colors.textMuted}
                              />
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.exerciseContent, ex.completed && styles.exerciseContentDone]}>
                            {ex.content}
                          </Text>
                          {ex.source === 'fallback' && (
                            <Text style={styles.fallbackNote}>Shown offline — AI suggestion unavailable right now.</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ));
                })()}
              </>
            )}
            <Button
              title={
                generating
                  ? 'Generating…'
                  : exercises.length === 0
                    ? 'Generate Practice Program'
                    : 'Get a Different Set'
              }
              onPress={handleGenerate}
              loading={generating}
              variant={exercises.length === 0 ? 'primary' : 'outline'}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}

        <Button
          title="Back to Screening"
          variant="outline"
          onPress={() => navigation.navigate('ScreeningMain')}
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  subtitle: { fontSize: Fonts.sizes.md, color: Colors.textSecondary, marginBottom: Spacing.lg },
  riskBanner: { borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  riskDesc: { fontSize: Fonts.sizes.sm, marginTop: Spacing.sm, lineHeight: 19, fontWeight: '500' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-around' },
  scoreItem: { alignItems: 'center' },
  scoreValue: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.text },
  scoreLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  helperText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, lineHeight: 19 },
  exerciseBox: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.sm },
  batchGroup: { marginBottom: Spacing.sm },
  batchLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  exerciseMarker: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', flex: 1 },
  exerciseContent: { fontSize: Fonts.sizes.sm, color: Colors.text, lineHeight: 20 },
  exerciseContentDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  fallbackNote: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' },
});

export default ResultsScreen;
