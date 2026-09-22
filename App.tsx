// App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { Colors } from './src/constants/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/auth/AuthScreen';
import { initDatabase, getUser } from './src/services/database';
import { isSupabaseConfigured } from './src/services/supabase';
import { getMyProfile, onAuthStateChange } from './src/services/authService';
import { syncPendingAttempts } from './src/services/syncService';
import { AppRole } from './src/constants/types';

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
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
            const profile = await getMyProfile();
            setRole(profile?.role ?? 'student');
            setCheckingProfile(false);
            syncPendingAttempts();
          } else {
            setRole(null);
          }
        })
      : undefined;

    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        syncPendingAttempts();
      }
      appState.current = next;
    });

    return () => {
      sub.remove();
      unsubscribeAuth?.();
      appStateSub.remove();
    };
  }, []);

  const bootstrap = async () => {
    try {
      await initDatabase();
      const user = await getUser();
      setOnboarded(!!user?.onboardingComplete);
    } catch (e) {
      console.error('Bootstrap error', e);
    } finally {
      setReady(true);
    }
  };

  if (!ready || checkingProfile) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
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
