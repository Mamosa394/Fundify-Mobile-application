// SignupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail || !password || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Passwords do not match');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setLoading(true);
      setError('');

      await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Account Created',
        'Your account has been created successfully. Please login.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#e2e8f0', '#cbd5e1', '#94a3b8']} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color="#334155" />
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join EduFlow today</Text>
            </View>

            <View style={styles.form}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="youremail@gmail.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                    {showConfirmPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                  </Pressable>
                </View>
              </View>

              <Pressable onPress={handleSignup} disabled={loading}>
                <LinearGradient colors={['#4a616c', '#334155']} style={styles.signupButton}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupButtonText}>Sign Up</Text>}
                </LinearGradient>
              </Pressable>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <Pressable onPress={() => navigation.goBack()}>
                  <Text style={styles.loginLink}>Sign In</Text>
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
  background: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: { marginBottom: 40 },
  title: {
    fontSize: 32,
    color: '#1e293b',
    fontFamily: 'JosefinSans-Bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'JosefinSans-Regular',
  },
  form: { gap: 18 },
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
  passwordInput: {
    flex: 1,
    height: 60,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#1e293b',
    fontFamily: 'JosefinSans-Bold',
  },
  eyeIcon: { paddingHorizontal: 18 },
  signupButton: {
    height: 62,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'JosefinSans-Bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  loginText: {
    color: '#64748b',
    fontFamily: 'JosefinSans-Bold',
    fontSize: 14,
  },
  loginLink: {
    color: '#334155',
    fontFamily: 'JosefinSans-Bold',
    marginLeft: 4,
    fontSize: 14,
    textDecorationLine: 'underline',
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