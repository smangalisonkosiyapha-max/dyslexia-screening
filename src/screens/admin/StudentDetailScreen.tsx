// src/screens/admin/StudentDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../../constants/theme';
import { SCROLL_BOTTOM_PADDING } from '../../constants/layout';
import { RISK_BAND_INFO, DYSLEXIA_TESTS } from '../../constants/dyslexiaTests';
import { RiskBand } from '../../constants/types';
import { getAttemptsForStudent, AdminAttemptRow } from '../../services/adminService';
import { Badge } from '../../components/UIComponents';

const RISK_COLORS: Record<RiskBand, { color: string; bg: string }> = {
  low: { color: Colors.success, bg: Colors.successLight },
  moderate: { color: Colors.warning, bg: Colors.warningLight },
  high: { color: Colors.danger, bg: Colors.dangerLight },
};

const StudentDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { studentId, name } = route.params;
  const [attempts, setAttempts] = useState<AdminAttemptRow[]>([]);

  useEffect(() => {
    getAttemptsForStudent(studentId).then(setAttempts);
  }, [studentId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING, paddingHorizontal: Spacing.lg }}
      >
        {attempts.map(a => {
          const meta = DYSLEXIA_TESTS.find(t => t.type === a.testType);
          const risk = a.riskBand ? RISK_COLORS[a.riskBand] : null;
          return (
            <View key={a.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{meta?.icon} {meta?.title ?? a.testType}</Text>
                <Text style={styles.rowMeta}>
                  {a.startedAt.toLocaleDateString()} · {Math.round(a.accuracy * 100)}% accuracy
                </Text>
              </View>
              {a.riskBand && risk && (
                <Badge label={RISK_BAND_INFO[a.riskBand].label} color={risk.color} bgColor={risk.bg} />
              )}
            </View>
          );
        })}

        {attempts.length === 0 && (
          <Text style={styles.empty}>No attempts recorded yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.lg,
  },
  title: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  rowTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  rowMeta: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  empty: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
});

export default StudentDetailScreen;
