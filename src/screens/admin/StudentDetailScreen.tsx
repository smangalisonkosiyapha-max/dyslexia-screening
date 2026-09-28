// src/screens/admin/StudentDetailScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../../constants/theme';
import { useScrollBottomPadding } from '../../constants/layout';
import { RISK_BAND_INFO, DYSLEXIA_TESTS } from '../../constants/dyslexiaTests';
import { RiskBand } from '../../constants/types';
import {
  getAttemptsForStudent,
  getStudentContact,
  AdminAttemptRow,
  StudentContact,
} from '../../services/adminService';
import { getNotesForStudent, addNoteForStudent, StudentNote } from '../../services/notesService';
import { Badge, Button } from '../../components/UIComponents';

const RISK_COLORS: Record<RiskBand, { color: string; bg: string }> = {
  low: { color: Colors.success, bg: Colors.successLight },
  moderate: { color: Colors.warning, bg: Colors.warningLight },
  high: { color: Colors.danger, bg: Colors.dangerLight },
};

const StudentDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const bottomPadding = useScrollBottomPadding();
  const { studentId, name } = route.params;
  const [attempts, setAttempts] = useState<AdminAttemptRow[]>([]);
  const [contact, setContact] = useState<StudentContact | null>(null);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const [a, c, n] = await Promise.allSettled([
      getAttemptsForStudent(studentId),
      getStudentContact(studentId),
      getNotesForStudent(studentId),
    ]);

    if (a.status === 'fulfilled') setAttempts(a.value);
    else console.warn('getAttemptsForStudent failed:', a.reason);

    if (c.status === 'fulfilled') setContact(c.value);
    else console.warn('getStudentContact failed:', c.reason);

    if (n.status === 'fulfilled') setNotes(n.value);
    else console.warn('getNotesForStudent failed:', n.reason);

    if (a.status === 'rejected' && c.status === 'rejected' && n.status === 'rejected') {
      setLoadError('Could not load student details. Pull down to retry.');
    }
    setLoading(false);
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const emailStudent = () => {
    if (!contact?.email) return;
    Linking.openURL(`mailto:${contact.email}`);
  };

  const callEmergencyContact = () => {
    if (!contact?.emergencyContactPhone) return;
    Linking.openURL(`tel:${contact.emergencyContactPhone}`);
  };

  const sendNote = async () => {
    if (!noteText.trim()) return;
    setSending(true);
    const ok = await addNoteForStudent(studentId, noteText);
    setSending(false);
    if (ok) {
      setNoteText('');
      load();
    } else {
      Alert.alert('Could not send note', 'Please check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{name}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{loadError}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: Spacing.lg }}
        >
          {/* Contact card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            {contact?.email ? (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={emailStudent}
                activeOpacity={0.7}
              >
                <Ionicons name="mail" size={18} color={Colors.primary} />
                <Text style={styles.contactText}>{contact.email}</Text>
                <Text style={styles.contactAction}>Email</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.contactMissing}>No email on file yet.</Text>
            )}

            {contact?.emergencyContactName || contact?.emergencyContactPhone ? (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={callEmergencyContact}
                activeOpacity={contact?.emergencyContactPhone ? 0.7 : 1}
              >
                <Ionicons name="call" size={18} color={Colors.primary} />
                <Text style={styles.contactText}>
                  {contact.emergencyContactName ?? 'Emergency contact'}
                  {contact.emergencyContactPhone ? ` · ${contact.emergencyContactPhone}` : ''}
                </Text>
                {contact.emergencyContactPhone && <Text style={styles.contactAction}>Call</Text>}
              </TouchableOpacity>
            ) : (
              <Text style={styles.contactMissing}>No emergency contact on file.</Text>
            )}
          </View>

          {/* Notes / follow-up */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes to student</Text>
            <Text style={styles.cardSubtitle}>
              The student sees this on their Home screen next time they open the app.
            </Text>
            <View style={styles.noteComposer}>
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="e.g. Please stop by the Disability Unit this week to discuss your results."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
              <Button
                title={sending ? 'Sending…' : 'Send note'}
                onPress={sendNote}
                disabled={sending || !noteText.trim()}
              />
            </View>

            {notes.map(n => (
              <View key={n.id} style={styles.noteRow}>
                <Text style={styles.noteMessage}>{n.message}</Text>
                <View style={styles.noteMetaRow}>
                  <Text style={styles.noteMeta}>
                    {n.createdAt.toLocaleDateString()}{' '}
                    {n.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text
                    style={[
                      styles.noteStatus,
                      { color: n.readAt ? Colors.success : Colors.warning },
                    ]}
                  >
                    {n.readAt ? 'Read' : 'Unread'}
                  </Text>
                </View>
              </View>
            ))}
            {notes.length === 0 && <Text style={styles.empty}>No notes sent yet.</Text>}
          </View>

          {/* Test history */}
          <Text style={styles.sectionLabel}>Test History</Text>
          {attempts.map(a => {
            const meta = DYSLEXIA_TESTS.find(t => t.type === a.testType);
            const risk = a.riskBand ? RISK_COLORS[a.riskBand] : null;
            return (
              <View key={a.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {meta?.icon} {meta?.title ?? a.testType}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {a.startedAt.toLocaleDateString()} · {Math.round(a.accuracy * 100)}% accuracy
                  </Text>
                </View>
                {a.riskBand && risk && (
                  <Badge
                    label={RISK_BAND_INFO[a.riskBand].label}
                    color={risk.color}
                    bgColor={risk.bg}
                  />
                )}
              </View>
            );
          })}
          {attempts.length === 0 && <Text style={styles.empty}>No attempts recorded yet.</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  title: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginBottom: Spacing.sm },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  contactText: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.text },
  contactAction: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.primary },
  contactMissing: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, paddingVertical: 6 },

  noteComposer: { gap: 8, marginBottom: Spacing.sm },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    minHeight: 70,
    fontSize: Fonts.sizes.sm,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  noteRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.sm },
  noteMessage: { fontSize: Fonts.sizes.sm, color: Colors.text },
  noteMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  noteMeta: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },
  noteStatus: { fontSize: Fonts.sizes.xs, fontWeight: '700' },

  sectionLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  rowTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  rowMeta: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  empty: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
});

export default StudentDetailScreen;
