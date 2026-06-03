// App.js

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/services/firebase';

import WelcomeScreen from './src/screens/Auth/WelcomeScreen';
import LoginScreen from './src/screens/Auth/LoginScreen';
import SignupScreen from './src/screens/Auth/SignupScreen';
import AppNavigator from './src/navigation/AppNavigator';

import { useNotifications } from './src/hooks/useNotifications';
import { createNotificationChannels } from './src/services/notificationService';

import { useFonts } from 'expo-font';
import {
  JosefinSans_400Regular,
  JosefinSans_500Medium,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
} from '@expo-google-fonts/josefin-sans';

LogBox.ignoreLogs(['AsyncStorage', 'Setting a timer']);

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigationRef = React.useRef(null);

  // Initialize notifications
  useNotifications(navigationRef);

  const [fontsLoaded] = useFonts({
    'JosefinSans-Regular': JosefinSans_400Regular,
    'JosefinSans-Medium': JosefinSans_500Medium,
    'JosefinSans-SemiBold': JosefinSans_600SemiBold,
    'JosefinSans-Bold': JosefinSans_700Bold,
  });

  useEffect(() => {
    // Create notification channels on startup
    createNotificationChannels();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show loading while fonts or auth are loading
  if (!fontsLoaded || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#475569" />
        <Text style={styles.loadingText}>Loading EduFlow...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            // Auth screens - NOT logged in
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </>
          ) : (
            // Main app - logged in
            <Stack.Screen name="Main" component={AppNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'JosefinSans-Medium',
    color: '#64748B',
  },
});