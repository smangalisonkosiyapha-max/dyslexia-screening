// src/navigation/AdminNavigator.tsx
// Separate top-level navigator for the Disability Unit role — deliberately
// not a tab inside the student AppNavigator, since an admin never needs the
// student-facing screens (Tasks, Exercises, Mood, etc.).

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import StudentDetailScreen from '../screens/admin/StudentDetailScreen';

const Stack = createStackNavigator();

export const AdminNavigator: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);
