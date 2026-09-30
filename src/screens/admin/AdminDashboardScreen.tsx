// src/screens/admin/AdminDashboardScreen.tsx
// Disability Unit view: aggregated risk-band counts across all students,
// plus a per-student list. Everything here is scoped by Supabase RLS
// (public.is_admin()) — this screen just renders what the query returns.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../../constants/theme';
import { useScrollBottomPadding } from '../../constants/layout';
import { StudentSummary, RiskBand } from '../../constants/types';
import { RISK_BAND_INFO } from '../../constants/dyslexiaTests';
import { StatCard, Badge, EmptyState } from '../../components/UIComponents';
import { countLatestRiskBands, getStudentSummaries } from '../../services/adminService';
import { signOut } from '../../services/authService';

const RISK_COLORS: Record<RiskBand, { color: string; bg: string }> = {
  low: { color: Colors.success, bg: Colors.successLight },
  moderate: { color: Colors.warning, bg: Colors.warningLight },
  high: { color: Colors.danger, bg: Colors.dangerLight },
};

const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const bottomPadding = useScrollBottomPadding();
  const [counts, setCounts] = useState<Record<RiskBand, number>>({ low: 0, moderate: 0, high: 0 });
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskBand | 'all' | 'not_started'>('all');

  const load = useCallback(async () => {
    const s = await getStudentSummaries();
    setCounts(countLatestRiskBands(s));
    setStudents(s);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const total = counts.low + counts.moderate + counts.high;

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(search.trim().toLowerCase());
    const matchesRisk =
      riskFilter === 'all'
        ? true
        : riskFilter === 'not_started'
          ? s.attemptCount === 0
          : s.lastRiskBand === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const RISK_FILTERS: { key: RiskBand | 'all' | 'not_started'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'low', label: 'Low' },
    { key: 'moderate', label: 'Moderate' },
    { key: 'high', label: 'High' },
    { key: 'not_started', label: 'Not started' },
  ];

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
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: Spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.statsRow}>
          <StatCard label="Low risk" value={counts.low} icon="🟢" color={Colors.success} />
          <StatCard label="Moderate" value={counts.moderate} icon="🟡" color={Colors.warning} />
          <StatCard label="High risk" value={counts.high} icon="🔴" color={Colors.danger} />
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {RISK_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, riskFilter === f.key && styles.filterChipActive]}
              onPress={() => setRiskFilter(f.key)}
            >
              <Text
                style={[styles.filterChipText, riskFilter === f.key && styles.filterChipTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          Students ({filteredStudents.length}
          {filteredStudents.length !== students.length ? ` of ${students.length}` : ''})
        </Text>

        {!loading && students.length === 0 && (
          <EmptyState
            emoji="📋"
            title="No students yet"
            subtitle="Students appear here as soon as they sign up, even before they take a test."
          />
        )}

        {!loading && students.length > 0 && filteredStudents.length === 0 && (
          <Text style={styles.hint}>No students match this search/filter.</Text>
        )}

        {filteredStudents.map(s => {
          const risk = s.lastRiskBand ? RISK_COLORS[s.lastRiskBand] : null;
          return (
            <TouchableOpacity
              key={s.studentId}
              style={styles.studentRow}
              onPress={() =>
                navigation.navigate('StudentDetail', { studentId: s.studentId, name: s.name })
              }
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentMeta}>
                  {s.attemptCount === 0
                    ? `No tests yet${s.registeredAt ? ` · joined ${s.registeredAt.toLocaleDateString()}` : ''}`
                    : `${s.attemptCount} attempt${s.attemptCount === 1 ? '' : 's'}` +
                      (s.lastAttemptAt ? ` · last ${s.lastAttemptAt.toLocaleDateString()}` : '')}
                </Text>
              </View>
              {s.lastRiskBand && risk ? (
                <Badge
                  label={RISK_BAND_INFO[s.lastRiskBand].label}
                  color={risk.color}
                  bgColor={risk.bg}
                />
              ) : (
                s.attemptCount === 0 && (
                  <Badge
                    label="Not started"
                    color={Colors.textSecondary}
                    bgColor={Colors.textMuted + '22'}
                  />
                )
              )}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textMuted}
                style={{ marginLeft: Spacing.sm }}
              />
            </TouchableOpacity>
          );
        })}

        {total === 0 && !loading && (
          <Text style={styles.hint}>
            Risk-band counts above fill in once students complete their first test.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  studentName: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
  studentMeta: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  searchInput: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.text },
  filterRow: { marginBottom: Spacing.md },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    marginRight: 8,
    ...Shadows.sm,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: '#FFFFFF' },
  hint: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 16,
    paddingHorizontal: Spacing.lg,
  },
});

export default AdminDashboardScreen;
