// navigation/BottomTabs.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  LayoutGrid,
  Wallet,
  GraduationCap,
  Compass,
  User2,
  BarChart3,
  FileText,
  BookOpen,
  Target,
} from 'lucide-react-native';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import BudgetScreen from '../screens/Budget/BudgetScreen';
import ScholarshipScreen from '../screens/Scholarships/ScholarshipScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

// Academic Planner Screens
import AcademicScreen from '../screens/Academics/AcademicScreen';
import AssignmentScreen from '../screens/Academics/AssignmentScreen';
import CourseDetailsScreen from '../screens/Academics/CourseDetailsScreen';
import GPATrackerScreen from '../screens/Academics/GPATrackerScreen';

const Tab = createBottomTabNavigator();
const PlannerTopTab = createMaterialTopTabNavigator();

const COLORS = {
  bg: '#ECEFF1',
  text: '#0A0A0A',
  muted: '#7B8794',
  cyan: '#7DD3FC',
  violet: '#C4B5FD',
  green: '#86EFAC',
  orange: '#FDBA74',
  pink: '#F9A8D4',
  surface: '#FFFFFF',
  primary: '#3B82F6',
};

// Academic Planner Top Tab Navigator
function PlannerTopTabs() {
  return (
    <PlannerTopTab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#F8FAFC',
          paddingTop: Platform.OS === 'ios' ? 50 : 30,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        },
        tabBarIndicatorStyle: {
          backgroundColor: COLORS.green,
          height: 3,
          borderRadius: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'none',
          marginLeft: 4,
        },
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarPressColor: 'transparent',
        tabBarScrollEnabled: false,
        tabBarItemStyle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
          height: 48,
        },
        lazy: true,
        swipeEnabled: true,
      }}
    >
      <PlannerTopTab.Screen
        name="Overview"
        component={AcademicScreen}
        options={{
          tabBarLabel: 'Overview',
          tabBarIcon: ({ color }) => (
            <BarChart3 size={16} color={color} />
          ),
        }}
      />
      <PlannerTopTab.Screen
        name="AssignmentsTab"
        component={AssignmentScreen}
        options={{
          tabBarLabel: 'Assignments',
          tabBarIcon: ({ color }) => (
            <FileText size={16} color={color} />
          ),
        }}
      />
      <PlannerTopTab.Screen
        name="CoursesTab"
        component={CourseDetailsScreen}
        options={{
          tabBarLabel: 'Courses',
          tabBarIcon: ({ color }) => (
            <BookOpen size={16} color={color} />
          ),
        }}
      />
      <PlannerTopTab.Screen
        name="GPATab"
        component={GPATrackerScreen}
        options={{
          tabBarLabel: 'GPA',
          tabBarIcon: ({ color }) => (
            <Target size={16} color={color} />
          ),
        }}
      />
    </PlannerTopTab.Navigator>
  );
}

// Custom Bottom Tab Bar
function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.wrapper}>
      <BlurView intensity={55} tint="light" style={styles.blur}>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            let Icon = LayoutGrid;
            let activeColor = COLORS.cyan;

            switch (route.name) {
              case 'Budget':
                Icon = Wallet;
                activeColor = COLORS.orange;
                break;

              case 'Scholarships':
                Icon = GraduationCap;
                activeColor = COLORS.violet;
                break;

              case 'Planner':
                Icon = Compass;
                activeColor = COLORS.green;
                break;

              case 'Profile':
                Icon = User2;
                activeColor = COLORS.pink;
                break;

              default:
                Icon = LayoutGrid;
                activeColor = COLORS.cyan;
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
              >
                <View
                  style={[
                    styles.iconWrap,
                    isFocused && {
                      backgroundColor: '#FFFFFF',
                    },
                  ]}
                >
                  {isFocused && (
                    <View
                      style={[
                        styles.glow,
                        {
                          backgroundColor: activeColor,
                        },
                      ]}
                    />
                  )}

                  <Icon
                    size={22}
                    color={isFocused ? COLORS.text : COLORS.muted}
                    strokeWidth={isFocused ? 2.7 : 2.2}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
      />

      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
      />

      <Tab.Screen
        name="Scholarships"
        component={ScholarshipScreen}
      />

      <Tab.Screen
        name="Planner"
        component={PlannerTopTabs}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 22,
  },
  blur: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 999,
    opacity: 0.18,
  },
});