// navigation/BottomTabs.js

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Platform, useColorScheme } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import {
  Home,
  Wallet,
  GraduationCap,
  Compass,
  User2,
} from 'lucide-react-native';

// Bottom tab screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import BudgetScreen from '../screens/Budget/BudgetScreen';
import ScholarshipScreen from '../screens/Scholarships/ScholarshipScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

// Budget sub-screens (hidden from tab bar but accessible via navigation)
import BudgetSetupWizard from '../screens/Budget/BudgetSetupWizard';
import ExpenseDetailScreen from '../screens/Budget/ExpenseDetailScreen';
import AddExpenseModal from '../screens/Budget/AddExpenseModal';
import AIAdvisorScreen from '../screens/Budget/AIAdvisorScreen';
import NotificationScreen from '../screens/Notifications/NotificationScreen';

// Academics sub‑screens (Planner)
import AcademicScreen from '../screens/Academics/AcademicScreen';
import AssignmentScreen from '../screens/Academics/AssignmentScreen';
import CourseDetailsScreen from '../screens/Academics/CourseDetailsScreen';
import GPATrackerScreen from '../screens/Academics/GPATrackerScreen';

const Tab = createBottomTabNavigator();
const PlannerTopTab = createMaterialTopTabNavigator();

// Static Themes matching your reference design
const THEMES = {
  light: {
    primary: '#3B82F6',
    text: '#0A0A0A',
    muted: '#7B8794',
    pillBackground: 'rgba(255, 255, 255, 0.85)',
    pillBorder: 'rgba(255, 255, 255, 0.9)',
    topTabBg: '#F8FAFC',
    topTabBorder: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
  },
  dark: {
    primary: '#3B82F6',
    text: '#FFFFFF',
    muted: '#9AA5B1',
    pillBackground: 'rgba(28, 28, 30, 0.85)',
    pillBorder: 'rgba(44, 44, 46, 0.8)',
    topTabBg: '#121212',
    topTabBorder: '#2C2C2E',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
  },
};

// Static configuration declared outside components to prevent garbage collection cycles
const NAV_CONFIG = {
  Home: { icon: Home, label: 'Home', isHome: true },
  Budget: { icon: Wallet, label: 'Budget' },
  Scholarships: { icon: GraduationCap, label: 'Scholar' },
  Planner: { icon: Compass, label: 'Planner' },
  Profile: { icon: User2, label: 'Profile' },
};

// ---------- Planner top tabs ----------
function PlannerTabs() {
  const scheme = useColorScheme();
  const colors = THEMES[scheme] || THEMES.light;

  return (
    <PlannerTopTab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.topTabBg,
          paddingTop: Platform.OS === 'ios' ? 48 : 28,
          height: Platform.OS === 'ios' ? 98 : 78,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.topTabBorder,
        },
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
          height: 3,
          borderRadius: 1.5,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '700',
          textTransform: 'none',
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarPressColor: 'transparent',
        tabBarItemStyle: {
          justifyContent: 'center',
        },
        lazy: true,
        swipeEnabled: true,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <PlannerTopTab.Screen
        name="Overview"
        component={AcademicScreen}
        options={{ tabBarLabel: 'Overview' }}
      />
      <PlannerTopTab.Screen
        name="Assignments"
        component={AssignmentScreen}
        options={{ tabBarLabel: 'Tasks' }}
      />
      <PlannerTopTab.Screen
        name="Courses"
        component={CourseDetailsScreen}
        options={{ tabBarLabel: 'Courses' }}
      />
      <PlannerTopTab.Screen
        name="GPA"
        component={GPATrackerScreen}
        options={{ tabBarLabel: 'GPA' }}
      />
    </PlannerTopTab.Navigator>
  );
}

// ---------- Tab Item Component (Modified for Conditional Labels) ----------
function TabItem({ isFocused, onPress, icon: Icon, label, isHome, colors }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.12 : 1, {
      damping: 14,
      stiffness: 210,
    });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeTintColor = isHome ? colors.primary : colors.text;

  return (
    <Pressable 
      onPress={onPress} 
      style={bottomStyles.tab}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      android_ripple={{ borderless: true, radius: 28 }}
    >
      <Animated.View
        style={[
          bottomStyles.iconCircle,
          isFocused && {
            backgroundColor: colors.primary + '1A', // 10% Alpha opacity fill
            marginBottom: 2, // Slight gap push only when text label is present
          },
          isHome && bottomStyles.homeSpecialCircle,
          animatedIconStyle,
        ]}
      >
        <Icon
          size={isHome ? 24 : 22}
          color={isFocused ? activeTintColor : colors.muted}
          strokeWidth={isFocused ? 2.5 : 2}
        />
      </Animated.View>

      {/* Conditional rendering: Text shows ONLY on the focused tab */}
      {isFocused && (
        <Text
          numberOfLines={1}
          style={[
            bottomStyles.label,
            { color: activeTintColor, fontWeight: '800' },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// ---------- Custom Tab Bar Container ----------
function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = THEMES[scheme] || THEMES.light;

  const dynamicBottomInset = Math.max(insets.bottom, 16);

  // Filter routes to only show the 5 main tabs in the tab bar
  const mainTabRoutes = ['Home', 'Budget', 'Scholarships', 'Planner', 'Profile'];

  return (
    <View style={[bottomStyles.wrapper, { bottom: dynamicBottomInset }]}>
      <View 
        style={[
          bottomStyles.pill, 
          { 
            backgroundColor: colors.pillBackground, 
            borderColor: colors.pillBorder,
            shadowColor: colors.shadowColor,
            shadowOpacity: colors.shadowOpacity,
          }
        ]}
      >
        {state.routes
          .filter(route => mainTabRoutes.includes(route.name))
          .map((route, index) => {
            const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);
            const config = NAV_CONFIG[route.name] || { icon: Home, label: route.name };

            const handlePress = useCallback(() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }, [isFocused, navigation, route.key, route.name]);

            return (
              <TabItem
                key={route.key}
                isFocused={isFocused}
                onPress={handlePress}
                icon={config.icon}
                label={config.label}
                isHome={config.isHome}
                colors={colors}
              />
            );
          })}
      </View>
    </View>
  );
}

// ---------- Main Navigator Component ----------
export default function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ 
        headerShown: false, 
        lazy: true 
      }}
      backBehavior="initialRoute"
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Scholarships" component={ScholarshipScreen} />
      <Tab.Screen name="Planner" component={PlannerTabs} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      
      {/* Budget sub-screens - hidden from tab bar, accessible via navigation */}
      <Tab.Screen 
        name="BudgetSetupWizard" 
        component={BudgetSetupWizard}
        options={{
          tabBarButton: () => null, // Hide from tab bar
          tabBarStyle: { display: 'none' }, // Hide tab bar when on this screen
        }}
      />
      <Tab.Screen 
        name="ExpenseDetail" 
        component={ExpenseDetailScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
          tabBarStyle: { display: 'none' }, // Hide tab bar when on this screen
        }}
      />
      <Tab.Screen 
        name="AddExpenseModal" 
        component={AddExpenseModal}
        options={{
          tabBarButton: () => null, // Hide from tab bar
          tabBarStyle: { display: 'none' }, // Hide tab bar when on this screen
        }}
      />
      <Tab.Screen 
        name="AIAdvisor" 
        component={AIAdvisorScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
          tabBarStyle: { display: 'none' }, // Hide tab bar when on this screen
        }}
      />
      <Tab.Screen 
        name="NotificationSettings" 
        component={NotificationScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
          tabBarStyle: { display: 'none' }, // Hide tab bar when on this screen
        }}
      />
    </Tab.Navigator>
  );
}

// ---------- Stylesheet Configuration ----------
const bottomStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 32,
    paddingHorizontal: 6,
    height: 66,
    width: '100%',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0, // Cleared default margin so hidden label items center perfectly
  },
  homeSpecialCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  label: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
});