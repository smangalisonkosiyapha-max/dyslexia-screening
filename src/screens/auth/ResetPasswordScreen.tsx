// src/screens/auth/ResetPasswordScreen.tsx
//
// Shown when the student taps the reset link in their email and the link
// opens the app (see the deep-link handling in App.tsx). By the time this
// screen is visible, App.tsx has already exchanged the link's tokens for a
// session, so updatePassword() is allowed to change this account's password.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing } from '../../constants/theme';
import { Button } from '../../components/UIComponents';
import { updatePassword } from '../../services/authService';

const ResetPasswordScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      Alert.alert('Password updated', 'Your password has been changed.');
      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'Could not update your password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>🔑</Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>Choose a new password for your account.</Text>

          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.textMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={{ marginTop: Spacing.sm }}>
            <Button
              title={loading ? 'Saving…' : 'Update password'}
              onPress={submit}
              disabled={loading}
            />
          </View>
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
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  errorText: { fontSize: Fonts.sizes.sm, color: Colors.danger, marginBottom: Spacing.sm },
});

export default ResetPasswordScreen;
