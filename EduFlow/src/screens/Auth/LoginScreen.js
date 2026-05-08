// LoginScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
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
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Fingerprint, ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Constants
const STRINGS = {
  errors: {
    invalidCredentials: 'Invalid email or password',
    networkError: 'Network error. Please check your connection.',
    fillAllFields: 'Please enter both email and password',
    invalidEmail: 'Please enter a valid email address',
    biometricNoSavedLogin: 'No Saved Login',
    biometricNoSavedLoginMsg: 'Please login normally first to enable biometric login.',
    biometricLoginFailed: 'Biometric Login Failed',
    forgotPasswordNoEmail: 'Forgot Password',
    forgotPasswordNoEmailMsg: 'Enter your email first.',
    resetEmailSent: 'Reset email sent',
    resetEmailSentMsg: 'Check your inbox for reset instructions.',
    resetFailed: 'Reset failed',
  },
  labels: {
    email: 'EMAIL',
    password: 'PASSWORD',
    signIn: 'Sign In',
    forgotPassword: 'Forgot Password?',
    continueWithGoogle: 'Continue with Google',
    createAccount: 'Create Account',
    newToEduFlow: 'New to EduFlow?',
    faceId: 'Face ID',
    fingerprint: 'Fingerprint',
    backToLogin: 'Back to Login',
  },
  validation: {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  storage: {
    userEmail: 'userEmail',
    userId: 'userId',
    lastLoginAt: 'lastLoginAt',
    biometricEnabled: 'biometricEnabled',
    biometricToken: 'biometricToken',
  }
};

// Simple token generation
const generateSimpleToken = (userId, email) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${userId}_${email}_${timestamp}_${randomString}`;
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    initializeBiometrics();
  }, []);

  const initializeBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const enabled = await SecureStore.getItemAsync(STRINGS.storage.biometricEnabled);
      
      setBiometricAvailable(compatible && enrolled);
      setBiometricEnabled(enabled === 'true');
    } catch (error) {
      console.log('Biometric check error:', error);
      setBiometricAvailable(false);
      setBiometricEnabled(false);
    }
  };

  const validateEmail = (email) => {
    return STRINGS.validation.emailRegex.test(email);
  };

  const storeBiometricToken = async (userId, email) => {
    try {
      const token = generateSimpleToken(userId, email);
      await SecureStore.setItemAsync(STRINGS.storage.biometricToken, token);
      await SecureStore.setItemAsync(STRINGS.storage.biometricEnabled, 'true');
      setBiometricEnabled(true);
    } catch (error) {
      console.log('Error storing biometric token:', error);
    }
  };

  const verifyBiometricToken = async (userId, email) => {
    try {
      const storedToken = await SecureStore.getItemAsync(STRINGS.storage.biometricToken);
      const expectedToken = generateSimpleToken(userId, email);
      
      const storedParts = storedToken?.split('_');
      const expectedParts = expectedToken.split('_');
      
      if (!storedParts || storedParts.length < 2) return false;
      
      return storedParts[0] === expectedParts[0] && storedParts[1] === expectedParts[1];
    } catch (error) {
      console.log('Token verification error:', error);
      return false;
    }
  };

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError(STRINGS.errors.fillAllFields);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError(STRINGS.errors.invalidEmail);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setLoading(true);
      setError('');

      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      await SecureStore.setItemAsync(STRINGS.storage.userEmail, trimmedEmail);
      await SecureStore.setItemAsync(STRINGS.storage.userId, userCredential.user.uid);
      await SecureStore.setItemAsync(STRINGS.storage.lastLoginAt, Date.now().toString());
      await storeBiometricToken(userCredential.user.uid, trimmedEmail);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // App.js conditionally switches authenticated navigator based on auth state.
      // navigation.replace('Main') can fail due to nested navigator routing.
      
      return;


    } catch (err) {
      console.log('Login error:', err?.code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (err.code === 'auth/network-request-failed') {
        setError(STRINGS.errors.networkError);
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError(STRINGS.errors.invalidCredentials);
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(STRINGS.errors.invalidCredentials);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, navigation]);

  const handleBiometricLogin = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!compatible || !enrolled) {
        Alert.alert('Biometric Auth', 'Please set up Face ID / Fingerprint in your device settings.');
        return;
      }

      const biometricEnabled = await SecureStore.getItemAsync(STRINGS.storage.biometricEnabled);
      if (biometricEnabled !== 'true') {
        Alert.alert(
          STRINGS.errors.biometricNoSavedLogin,
          'Please login with password first to enable biometric login.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to EduFlow',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        if (result.error === 'user_cancel') {
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setLoading(true);

      const savedEmail = await SecureStore.getItemAsync(STRINGS.storage.userEmail);
      const savedUserId = await SecureStore.getItemAsync(STRINGS.storage.userId);
      const lastLogin = await SecureStore.getItemAsync(STRINGS.storage.lastLoginAt);

      if (!savedEmail || !savedUserId) {
        await SecureStore.deleteItemAsync(STRINGS.storage.biometricEnabled);
        await SecureStore.deleteItemAsync(STRINGS.storage.biometricToken);
        Alert.alert(
          STRINGS.errors.biometricNoSavedLogin,
          'Session expired. Please login with password again.'
        );
        setLoading(false);
        return;
      }

      const isValidToken = await verifyBiometricToken(savedUserId, savedEmail);
      
      if (!isValidToken) {
        Alert.alert('Security Error', 'Invalid biometric session. Please login with password.');
        await SecureStore.deleteItemAsync(STRINGS.storage.biometricEnabled);
        await SecureStore.deleteItemAsync(STRINGS.storage.biometricToken);
        setLoading(false);
        return;
      }

      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (lastLogin && (Date.now() - parseInt(lastLogin) > thirtyDays)) {
        Alert.alert(
          'Session Expired',
          'For security, please login with your password again.',
          [{ text: 'OK' }]
        );
        await SecureStore.deleteItemAsync(STRINGS.storage.biometricEnabled);
        await SecureStore.deleteItemAsync(STRINGS.storage.biometricToken);
        setLoading(false);
        return;
      }

      await SecureStore.setItemAsync(STRINGS.storage.lastLoginAt, Date.now().toString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      navigation.replace('Main');

    } catch (err) {
      console.log('Biometric error:', err);
      Alert.alert(STRINGS.errors.biometricLoginFailed, err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  const handleForgotPassword = useCallback(async () => {
    const currentEmail = email.trim();
    
    if (!currentEmail) {
      Alert.alert(
        STRINGS.errors.forgotPasswordNoEmail,
        STRINGS.errors.forgotPasswordNoEmailMsg
      );
      return;
    }

    if (!validateEmail(currentEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      const { resetPassword } = await import('../../services/firebase');
      await resetPassword(currentEmail);
      
      Alert.alert(
        STRINGS.errors.resetEmailSent,
        STRINGS.errors.resetEmailSentMsg,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.log('Forgot password error:', err);
      
      let errorMessage = 'Please try again.';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      Alert.alert(STRINGS.errors.resetFailed, errorMessage);
    }
  }, [email]);

  const handleGoogleSignIn = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setLoading(true);
      const { signInWithGoogle } = await import('../../services/firebase');
      const userCredential = await signInWithGoogle();
      
      if (userCredential) {
        await SecureStore.setItemAsync(STRINGS.storage.userEmail, userCredential.user.email);
        await SecureStore.setItemAsync(STRINGS.storage.userId, userCredential.user.uid);
        await SecureStore.setItemAsync(STRINGS.storage.lastLoginAt, Date.now().toString());
        await storeBiometricToken(userCredential.user.uid, userCredential.user.email);
        
        navigation.replace('Main');
      }
    } catch (error) {
      console.log('Google sign in error:', error);
      Alert.alert('Google Sign In Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  return (
    <LinearGradient colors={['#e2e8f0', '#cbd5e1', '#94a3b8']} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardView}
        >
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.welcomeTitle}>Welcome{"\n"}Back</Text>
              <Text style={styles.welcomeSubtitle}>Your student life operating system</Text>
            </View>

            <View style={styles.form}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{STRINGS.labels.email}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="youremail@gmail.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{STRINGS.labels.password}</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.rawInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    editable={!loading}
                  />
                  <Pressable 
                    onPress={() => setShowPassword(!showPassword)} 
                    style={styles.eyeIcon}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                  </Pressable>
                </View>
              </View>

              <View style={styles.forgotRow}>
                <Pressable
                  onPress={handleForgotPassword}
                  style={styles.forgotLink}
                  disabled={loading}
                >
                  <Text style={styles.forgotLinkText}>{STRINGS.labels.forgotPassword}</Text>
                </Pressable>
              </View>

              <Pressable onPress={handleLogin} disabled={loading}>
                <LinearGradient colors={['#4a616c', '#334155']} style={styles.signInButton}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signInButtonText}>{STRINGS.labels.signIn}</Text>}
                </LinearGradient>
              </Pressable>

              {biometricAvailable && biometricEnabled && (
                <View style={styles.biometricRow}>
                  <Pressable style={styles.bioBtn} onPress={handleBiometricLogin} disabled={loading}>
                    <ShieldCheck color="#475569" size={20} />
                    <Text style={styles.bioText}>{Platform.OS === 'ios' ? 'Face ID' : 'Biometric'}</Text>
                  </Pressable>
                  <Pressable style={styles.bioBtn} onPress={handleBiometricLogin} disabled={loading}>
                    <Fingerprint color="#475569" size={20} />
                    <Text style={styles.bioText}>{STRINGS.labels.fingerprint}</Text>
                  </Pressable>
                </View>
              )}

              <Pressable 
                style={styles.socialButton} 
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Image source={require('../../assets/images/google.png')} style={styles.googleIcon} />
                <Text style={styles.socialButtonText}>{STRINGS.labels.continueWithGoogle}</Text>
              </Pressable>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>{STRINGS.labels.newToEduFlow}</Text>
                <Pressable 
                  onPress={() => navigation.navigate('Signup')}
                  disabled={loading}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={styles.signupLink}>{STRINGS.labels.createAccount}</Text>
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
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 48,
    lineHeight: 52,
    color: '#1e293b',
    fontFamily: 'JosefinSans-Bold',
  },
  welcomeSubtitle: {
    fontSize: 17,
    color: '#64748b',
    fontFamily: 'JosefinSans-Bold',
    marginTop: 10,
  },
  form: {
    gap: 18,
  },
  inputGroup: {},
  inputLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 1,
    fontFamily: 'JosefinSans-Bold',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    height: 60,
    borderRadius: 22,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#1e293b',
    fontFamily: 'JosefinSans-Bold',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  rawInput: {
    flex: 1,
    height: 60,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#1e293b',
    fontFamily: 'JosefinSans-Bold',
  },
  eyeIcon: {
    paddingHorizontal: 18,
  },
  signInButton: {
    height: 62,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'JosefinSans-Bold',
  },
  biometricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bioBtn: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  bioText: {
    color: '#475569',
    fontFamily: 'JosefinSans-Bold',
  },
  socialButton: {
    height: 58,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginTop: 6,
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  socialButtonText: {
    color: '#475569',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 15,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  signupText: {
    color: '#64748b',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 14,
  },
  signupLink: {
    color: '#334155',
    fontFamily: 'JosefinSans-Bold',
    marginLeft: 4,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 10,
  },
  forgotLink: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  forgotLinkText: {
    color: '#334155',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 13,
  },
});