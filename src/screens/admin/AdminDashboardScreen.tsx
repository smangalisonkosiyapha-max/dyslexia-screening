// src/screens/admin/AdminDashboardScreen.tsx
// Disability Unit view: aggregated risk-band counts across all students,
// plus a per-student list. Everything here is scoped by Supabase RLS
// (public.is_admin()) — this screen just renders what the query returns.

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../../constants/theme';
import { SCROLL_BOTTOM_PADDING } from '../../constants/layout';
import { StudentSummary, RiskBand } from '../../constants/types';
import { RISK_BAND_INFO } from '../../constants/dyslexiaTests';
import { StatCard, Badge, EmptyState } from '../../components/UIComponents';
import { getAdminRiskBandCounts, getStudentSummaries } from '../../services/adminService';
import { signOut } from '../../services/authService';

const RISK_COLORS: Record<RiskBand, { color: string; bg: string }> = {
  low: { color: Colors.success, bg: Colors.successLight },
  moderate: { color: Colors.warning, bg: Colors.warningLight },
  high: { color: Colors.danger, bg: Colors.dangerLight },
};

const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [counts, setCounts] = useState<Record<RiskBand, number>>({ low: 0, moderate: 0, high: 0 });
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([getAdminRiskBandCounts(), getStudentSummaries()]);
    setCounts(c);
    setStudents(s);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const total = counts.low + counts.moderate + counts.high;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Disability Unit</Text>
          <Text style={styles.subtitle}>Aggregated screening overview</Text>
        </View>
        <TouchableOpacity onPress={() => signOut()} hitSlop={12}>
          <Ionicons name="log-out-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING, paddingHorizontal: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.statsRow}>
          <StatCard label="Low risk" value={counts.low} icon="🟢" color={Colors.success} />
          <StatCard label="Moderate" value={counts.moderate} icon="🟡" color={Colors.warning} />
          <StatCard label="High risk" value={counts.high} icon="🔴" color={Colors.danger} />
        </View>

        <Text style={styles.sectionTitle}>Students ({students.length})</Text>

        {!loading && students.length === 0 && (
          <EmptyState
            emoji="📋"
            title="No screenings yet"
            subtitle="Once students complete a test, their results will appear here."
          />
        )}

        {students.map(s => {
          const risk = s.lastRiskBand ? RISK_COLORS[s.lastRiskBand] : null;
          return (
            <TouchableOpacity
              key={s.studentId}
              style={styles.studentRow}
              onPress={() => navigation.navigate('StudentDetail', { studentId: s.studentId, name: s.name })}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentMeta}>
                  {s.attemptCount} attempt{s.attemptCount === 1 ? '' : 's'}
                  {s.lastAttemptAt ? ` · last ${s.lastAttemptAt.toLocaleDateString()}` : ''}
                </Text>
              </View>
              {s.lastRiskBand && risk && (
                <Badge label={RISK_BAND_INFO[s.lastRiskBand].label} color={risk.color} bgColor={risk.bg} />
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={{ marginLeft: Spacing.sm }} />
            </TouchableOpacity>
          );
        })}

        {total === 0 && !loading && (
          <Text style={styles.hint}>
            Tip: sign up a second account as a student and complete a test to see data appear here.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.lg,
  },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  studentName: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
  studentMeta: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  hint: {
    fontSize: Fonts.sizes.xs, color: Colors.textMuted, textAlign: 'center',
    marginTop: Spacing.lg, lineHeight: 16, paddingHorizontal: Spacing.lg,
  },
});

export default AdminDashboardScreen;
