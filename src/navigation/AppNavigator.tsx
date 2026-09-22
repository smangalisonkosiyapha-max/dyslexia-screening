// src/navigation/AppNavigator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../constants/theme';
import HomeScreen from '../screens/HomeScreen';
import TasksScreen from '../screens/TasksScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ProgressScreen from '../screens/ProgressScreen';
import MoodLogScreen from '../screens/MoodLogScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SelectTestScreen from '../screens/dyslexia/SelectTestScreen';
import TestRunnerScreen from '../screens/dyslexia/TestRunnerScreen';
import ResultsScreen from '../screens/dyslexia/ResultsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Home Stack ────────────────────────────────────────────────────────────

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="MoodLog" component={MoodLogScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="AddTask" component={TasksScreen} />
  </Stack.Navigator>
);

// ── Tasks Stack ───────────────────────────────────────────────────────────

const TasksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TasksMain" component={TasksScreen} />
  </Stack.Navigator>
);

// ── Exercises Stack ───────────────────────────────────────────────────────

const ExercisesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExercisesMain" component={ExercisesScreen} />
  </Stack.Navigator>
);

// ── Progress Stack ────────────────────────────────────────────────────────

const ProgressStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProgressMain" component={ProgressScreen} />
  </Stack.Navigator>
);

// ── Dyslexia Screening Stack ─────────────────────────────────────────────

const ScreeningStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ScreeningMain" component={SelectTestScreen} />
    <Stack.Screen name="TestRunner" component={TestRunnerScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Results" component={ResultsScreen} />
  </Stack.Navigator>
);

// ── Tab Bar Icon ──────────────────────────────────────────────────────────

interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
  label: string;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, color, label }) => (
  <View style={styles.tabIconContainer}>
    <Ionicons name={name as any} size={24} color={color} />
    <Text style={[styles.tabLabel, { color }]}>{label}</Text>
  </View>
);

// ── Main Tab Navigator ────────────────────────────────────────────────────

export const AppNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 10,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? 'home' : 'home-outline'}
                focused={focused}
                color={color}
                label="Home"
              />
            ),
          }}
        />
        <Tab.Screen
          name="Tasks"
          component={TasksStack}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? 'checkbox' : 'checkbox-outline'}
                focused={focused}
                color={color}
                label="Tasks"
              />
            ),
          }}
        />
        <Tab.Screen
          name="Exercises"
          component={ExercisesStack}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? 'fitness' : 'fitness-outline'}
                focused={focused}
                color={color}
                label="Exercises"
              />
            ),
          }}
        />
        <Tab.Screen
          name="Progress"
          component={ProgressStack}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                focused={focused}
                color={color}
                label="Progress"
              />
            ),
          }}
        />
        <Tab.Screen
          name="Screening"
          component={ScreeningStack}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                name={focused ? 'school' : 'school-outline'}
                focused={focused}
                color={color}
                label="Screening"
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: { alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
});
