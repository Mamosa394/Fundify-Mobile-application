// App.js
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/services/firebase';

import WelcomeScreen from './src/screens/Auth/WelcomeScreen';
import LoginScreen from './src/screens/Auth/LoginScreen';
import SignupScreen from './src/screens/Auth/SignupScreen';
import AppNavigator from './src/navigation/AppNavigator';


import { useFonts } from 'expo-font';
import {
  JosefinSans_400Regular,
  JosefinSans_500Medium,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
} from '@expo-google-fonts/josefin-sans';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    'JosefinSans-Regular': JosefinSans_400Regular,
    'JosefinSans-Medium': JosefinSans_500Medium,
    'JosefinSans-SemiBold': JosefinSans_600SemiBold,
    'JosefinSans-Bold': JosefinSans_700Bold,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Important: do not block the entire navigation flow on auth initialization.
  // If Firebase persistence crashes on boot, you still need to reach Welcome/Login/Signup.
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a616c" />
        <Text style={styles.loadingText}>Loading EduFlow...</Text>
      </View>
    );
  }


  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <>
              <Stack.Screen name="Welcome">
                {(props) => <WelcomeScreen {...props} />}
              </Stack.Screen>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} />}
              </Stack.Screen>
              <Stack.Screen name="Signup">
                {(props) => <SignupScreen {...props} />}
              </Stack.Screen>
            </>
          ) : (
              <Stack.Screen name="Main">
                {() => <AppNavigator />}
              </Stack.Screen>
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
    backgroundColor: '#e2e8f0',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'JosefinSans-Medium',
    color: '#334155',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e2e8f0',
  },
  welcomeText: {
    fontSize: 28,
    fontFamily: 'JosefinSans-Bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  userText: {
    fontSize: 16,
    fontFamily: 'JosefinSans-Regular',
    color: '#64748b',
  },
});
