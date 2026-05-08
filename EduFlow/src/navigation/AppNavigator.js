import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabs from './BottomTabs';

import BudgetScreen from '../screens/Budget/BudgetScreen';
import ScholarshipScreen from '../screens/Scholarships/ScholarshipScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={BottomTabs} />

      {/* Fallback screens if you navigate directly */}
      <Stack.Screen name="Budget" component={BudgetScreen} />
      <Stack.Screen name="Scholarships" component={ScholarshipScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

