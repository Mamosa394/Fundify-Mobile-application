// navigation/AppNavigator.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabs from './BottomTabs';

// Budget & Scholarship screens
import BudgetScreen from '../screens/Budget/BudgetScreen';
import ScholarshipScreen from '../screens/Scholarships/ScholarshipScreen';
import ScholarshipDetailsScreen from '../screens/Scholarships/ScholarshipDetailsScreen';
import FundingTrackerScreen from '../screens/Scholarships/FundingTrackerScreen';

// Profile screens
import ProfileScreen from '../screens/Profile/ProfileScreen';
import EditProfileScreen from '../screens/Profile/EditProfileScreen';
import NotificationsScreen from '../screens/Profile/NotificationsScreen';
import HelpCenterScreen from '../screens/Profile/HelpCenterScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';
import TermsOfServiceScreen from '../screens/Profile/TermsOfServiceScreen';
import AboutEduFlowScreen from '../screens/Profile/AboutEduFlowScreen';
import PrivacyScreen from '../screens/Profile/PrivacyScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main Tab Navigator */}
      <Stack.Screen name="Tabs" component={BottomTabs} />

      {/* Budget & Scholarship direct screens */}
      <Stack.Screen name="Budget" component={BudgetScreen} />
      <Stack.Screen name="Scholarships" component={ScholarshipScreen} />
      <Stack.Screen name="ScholarshipDetails" component={ScholarshipDetailsScreen} />
      <Stack.Screen name="FundingTracker" component={FundingTrackerScreen} />

      {/* Profile section */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="AboutEduFlow" component={AboutEduFlowScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </Stack.Navigator>
  );
}