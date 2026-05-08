import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, Wallet, GraduationCap, Compass, User } from 'lucide-react-native';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import BudgetScreen from '../screens/Budget/BudgetScreen';
import ScholarshipScreen from '../screens/Scholarships/ScholarshipScreen';
import AnalyticsScreen from '../screens/Dashboard/AnalyticsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabLabel({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#34d399',
        tabBarInactiveTintColor: 'rgba(226,232,240,0.6)',
      }}
    >

      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Sparkles size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel>{focused ? 'Home' : 'Home'}</TabLabel>,
        }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Wallet size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel>{focused ? 'Budget' : 'Budget'}</TabLabel>,
        }}
      />
      <Tab.Screen
        name="Scholarships"
        component={ScholarshipScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <GraduationCap size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel>{focused ? 'Scholarships' : 'Scholarships'}</TabLabel>,
        }}
      />
      <Tab.Screen
        name="Planner"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Compass size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel>{focused ? 'Planner' : 'Planner'}</TabLabel>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel>{focused ? 'Profile' : 'Profile'}</TabLabel>,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(7,10,18,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.16)',
  },
  label: {
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '700',
  },
});

