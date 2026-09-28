// App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { Colors } from './src/constants/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/auth/AuthScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import { initDatabase, getUser } from './src/services/database';
import { isSupabaseConfigured, supabase } from './src/services/supabase';
import { getMyProfile, onAuthStateChange } from './src/services/authService';
import { syncPendingAttempts } from './src/services/syncService';
import { AppRole } from './src/constants/types';

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const appState = useRef(AppState.currentState);
  // Shared so the auth listener can wait for the local DB before reading it.
  const dbReady = useRef<Promise<void> | null>(null);

  useEffect(() => {
    dbReady.current = initDatabase();
    bootstrap();

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      console.log('Notification tapped:', data?.type);
    });

    // If the backend isn't configured, skip auth entirely — the app still
    // works fully offline/local, just without the admin dashboard.
    const unsubscribeAuth = isSupabaseConfigured
      ? onAuthStateChange(async userId => {
          setSignedIn(!!userId);
          if (userId) {
            setCheckingProfile(true);
            try {
              const [profile] = await Promise.all([getMyProfile(), dbReady.current]);
              setRole(profile?.role ?? 'student');
              // Re-check onboarding for THIS account every time the signed-in
              // user changes. Checking only once at app start meant a new
              // account inherited the previous account's "onboarded" flag,
              // skipped onboarding, and landed on an empty profile.
              const user = await getUser();
              setOnboarded(!!user?.onboardingComplete);
            } catch (e) {
              console.error('Auth profile check failed', e);
            } finally {
              setCheckingProfile(false);
            }
            syncPendingAttempts();
          } else {
            setRole(null);
            setOnboarded(false);
          }
        })
      : undefined;

    // Password-reset deep link: the emailed link opens the app with recovery
    // tokens in the URL fragment. Exchange them for a session and show the
    // "set a new password" screen.
    const handleUrl = async (url: string | null) => {
      if (!url || !url.includes('#')) return;
      const params = new URLSearchParams(url.split('#')[1]);

      if (params.get('error_description')) {
        Alert.alert(
          'Reset link problem',
          'This reset link is invalid or has expired. Please request a new one from the login screen.'
        );
        return;
      }
      if (params.get('type') !== 'recovery') return;

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) return;

      setRecovering(true);
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        setRecovering(false);
        Alert.alert('Reset link problem', 'Could not verify this reset link. Please request a new one.');
      }
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const linkSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        syncPendingAttempts();
      }
      appState.current = next;
    });

    return () => {
      sub.remove();
      unsubscribeAuth?.();
      linkSub.remove();
      appStateSub.remove();
    };
  }, []);

  const bootstrap = async () => {
    try {
      await dbReady.current;
      // With a backend configured, onboarding is decided per signed-in user
      // in the auth listener above. Local-only mode has no accounts, so
      // check the single local profile here.
      if (!isSupabaseConfigured) {
        const user = await getUser();
        setOnboarded(!!user?.onboardingComplete);
      }
    } catch (e) {
      console.error('Bootstrap error', e);
    } finally {
      setReady(true);
    }
  };

  if (!ready || (checkingProfile && !recovering)) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (recovering) {
    return (
      <SafeAreaProvider>
        <ResetPasswordScreen onDone={() => setRecovering(false)} />
      </SafeAreaProvider>
    );
  }

  // No backend configured (or not yet signed in): fall back to the original
  // local-only flow so the app remains fully usable during development.
  if (isSupabaseConfigured && !signedIn) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  if (isSupabaseConfigured && role === 'admin') {
    return (
      <SafeAreaProvider>
        <AdminNavigator />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {onboarded ? (
          <AppNavigator />
        ) : (
          <OnboardingScreen onComplete={() => setOnboarded(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
