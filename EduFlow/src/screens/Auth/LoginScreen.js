// LoginScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Keyboard,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

import {
  Fingerprint,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react-native';

import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';

import {
  loginStudent,
  biometricLogin,
  forgotPassword,
  signInWithGoogle,
} from '../../services/authService';

const STRINGS = {
  errors: {
    invalidCredentials: 'Invalid email or password',
    networkError: 'Network error. Please check your connection.',
    fillAllFields: 'Please enter both email and password',
    invalidEmail: 'Please enter a valid email address',
  },

  validation: {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

export default function LoginScreen({ navigation }) {
  const scrollViewRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const hasHardware =
        await LocalAuthentication.hasHardwareAsync();

      const enrolled =
        await LocalAuthentication.isEnrolledAsync();

      setBiometricAvailable(hasHardware && enrolled);
    } catch (err) {
      console.log(err);
    }
  };

  const validateEmail = (value) => {
    return STRINGS.validation.emailRegex.test(value);
  };

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );

      setError(STRINGS.errors.fillAllFields);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );

      setError(STRINGS.errors.invalidEmail);
      return;
    }

    try {
      setLoading(true);
      setError('');

      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );

      const result = await loginStudent(
        trimmedEmail,
        password
      );

      console.log('[LoginScreen] Login Success:', result);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      navigation.replace('Main');

    } catch (err) {
      console.log('[LoginScreen] Error:', err);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );

      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError(STRINGS.errors.invalidCredentials);
      } else if (
        err.code === 'auth/network-request-failed'
      ) {
        setError(STRINGS.errors.networkError);
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, navigation]);

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);

      const result =
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to continue',
          fallbackLabel: 'Use Password',
          disableDeviceFallback: false,
          cancelLabel: 'Cancel',
        });

      if (!result.success) {
        setLoading(false);
        return;
      }

      const loginResult = await biometricLogin();

      console.log(
        '[LoginScreen] Biometric Login:',
        loginResult
      );

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      navigation.replace('Main');

    } catch (err) {
      console.log('[Biometric Error]', err);

      Alert.alert(
        'Biometric Login Failed',
        err.message || 'Please login normally.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        Alert.alert(
          'Forgot Password',
          'Please enter your email first.'
        );
        return;
      }

      await forgotPassword(trimmedEmail);

      Alert.alert(
        'Reset Email Sent',
        'Check your inbox for reset instructions.'
      );
    } catch (err) {
      console.log(err);

      Alert.alert(
        'Reset Failed',
        err.message || 'Please try again.'
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      await signInWithGoogle();

      navigation.replace('Main');

    } catch (err) {
      console.log(err);

      Alert.alert(
        'Google Sign In Failed',
        err.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.welcomeTitle}>
                Welcome{'\n'}Back
              </Text>

              <Text style={styles.welcomeSubtitle}>
                Your student life operating system
              </Text>
            </View>

            <View style={styles.form}>
              {!!error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  EMAIL
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="youremail@gmail.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  PASSWORD
                </Text>

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.rawInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />

                  <Pressable
                    style={styles.eyeIcon}
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={20}
                        color="#64748B"
                      />
                    ) : (
                      <Eye
                        size={20}
                        color="#64748B"
                      />
                    )}
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={styles.forgotButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotText}>
                  Forgot Password?
                </Text>
              </Pressable>

              <Pressable
                disabled={loading}
                onPress={handleLogin}
              >
                <LinearGradient
                  colors={['#475569', '#334155']}
                  style={styles.signInButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signInButtonText}>
                      Sign In
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {biometricAvailable && (
                <View style={styles.biometricRow}>
                  <Pressable
                    style={styles.bioBtn}
                    onPress={handleBiometricLogin}
                  >
                    <ShieldCheck
                      size={20}
                      color="#475569"
                    />

                    <Text style={styles.bioText}>
                      Face ID
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.bioBtn}
                    onPress={handleBiometricLogin}
                  >
                    <Fingerprint
                      size={20}
                      color="#475569"
                    />

                    <Text style={styles.bioText}>
                      Fingerprint
                    </Text>
                  </Pressable>
                </View>
              )}

              <Pressable
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
              >
                <Image
                  source={require('../../assets/images/google.png')}
                  style={styles.googleIcon}
                />

                <Text style={styles.socialButtonText}>
                  Continue with Google
                </Text>
              </Pressable>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>
                  New to EduFlow?
                </Text>

                <Pressable
                  onPress={() =>
                    navigation.navigate('Signup')
                  }
                >
                  <Text style={styles.signupLink}>
                    Create Account
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 46,
  },

  welcomeTitle: {
    fontSize: 52,
    lineHeight: 56,
    color: '#0F172A',
    fontFamily: 'JosefinSans-Bold',
    letterSpacing: -1.5,
  },

  welcomeSubtitle: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'JosefinSans-SemiBold',
    lineHeight: 24,
  },

  form: {
    gap: 18,
  },

  inputGroup: {},

  inputLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    letterSpacing: 1.8,
    fontFamily: 'JosefinSans-Bold',
  },

  input: {
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.95)',
    color: '#0F172A',
    fontSize: 16,
    fontFamily: 'JosefinSans-SemiBold',

    shadowColor: '#CBD5E1',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,

    elevation: 4,
  },

  passwordContainer: {
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',

    shadowColor: '#CBD5E1',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,

    elevation: 4,
  },

  rawInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 22,
    color: '#0F172A',
    fontSize: 16,
    fontFamily: 'JosefinSans-SemiBold',
  },

  eyeIcon: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
    paddingVertical: 4,
  },

  forgotText: {
    color: '#334155',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 13,
    letterSpacing: 0.2,
  },

  signInButton: {
    height: 64,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,

    shadowColor: '#334155',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.28,
    shadowRadius: 20,

    elevation: 6,
  },

  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'JosefinSans-Bold',
    letterSpacing: 0.4,
  },

  biometricRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 2,
  },

  bioBtn: {
    flex: 1,
    height: 58,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,

    shadowColor: '#CBD5E1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 16,

    elevation: 3,
  },

  bioText: {
    color: '#475569',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 14,
  },

  socialButton: {
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,

    shadowColor: '#CBD5E1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,

    elevation: 3,
  },

  googleIcon: {
    width: 22,
    height: 22,
  },

  socialButtonText: {
    color: '#475569',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },

  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    paddingBottom: 10,
  },

  signupText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'JosefinSans-SemiBold',
  },

  signupLink: {
    marginLeft: 6,
    color: '#0F172A',
    fontSize: 14,
    fontFamily: 'JosefinSans-Bold',
  },

  errorContainer: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.12)',
  },

  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
});