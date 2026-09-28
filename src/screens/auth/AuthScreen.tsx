// src/screens/auth/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../../constants/theme';
import { Button } from '../../components/UIComponents';
import { isSupabaseConfigured } from '../../services/supabase';
import { signIn, signUp, resetPassword } from '../../services/authService';

type Mode = 'login' | 'signup';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(name.trim(), email.trim(), password);
        Alert.alert('Account created', 'You can now log in.');
        setMode('login');
        setConfirmPassword('');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password?" again.');
      return;
    }
    setError(null);
    setResetLoading(true);
    try {
      await resetPassword(email.trim());
      Alert.alert(
        'Check your email',
        `We've sent a password reset link to ${email.trim()}. Open it to set a new password.`
      );
    } catch (e: any) {
      setError(e?.message ?? 'Could not send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>🧠</Text>
          <Text style={styles.title}>CogniCare Dyslexia</Text>
          <Text style={styles.subtitle}>Screening & Support</Text>

          {!isSupabaseConfigured && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Backend not configured yet — set EXPO_PUBLIC_SUPABASE_URL and
                EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see supabase/README.md).
              </Text>
            </View>
          )}

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password"
            />
          )}

          {mode === 'login' && (
            <TouchableOpacity
              onPress={forgotPassword}
              disabled={resetLoading}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>
                {resetLoading ? 'Sending…' : 'Forgot password?'}
              </Text>
            </TouchableOpacity>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            title={mode === 'login' ? 'Log In' : 'Create Account'}
            onPress={submit}
            loading={loading}
            style={{ marginTop: Spacing.md }}
          />

          <Text style={styles.note}>
            New students land in the screening app. Disability Unit staff are promoted to the admin
            dashboard by an administrator.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
  },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: Spacing.sm },
  title: { fontSize: Fonts.sizes.xxxl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  warningBox: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  warningText: { fontSize: Fonts.sizes.xs, color: Colors.warning, lineHeight: 16 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radii.md,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.sm, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.surface, ...Shadows.sm },
  tabText: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.text },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  errorText: { fontSize: Fonts.sizes.sm, color: Colors.danger, marginBottom: Spacing.sm },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: Spacing.sm, marginTop: -Spacing.sm },
  forgotText: { fontSize: Fonts.sizes.sm, color: Colors.primary, fontWeight: '600' },
  note: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
  },
});

export default AuthScreen;
