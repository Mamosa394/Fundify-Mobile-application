// src/screens/auth/SignupScreen.js

import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';

import { LinearGradient } from 'expo-linear-gradient';

import * as Haptics from 'expo-haptics';

import {
  ArrowLeft,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react-native';


import {
  registerStudent,
} from '../../services/authService';


const UNIVERSITIES = [
  'National University of Lesotho (NUL)',
  'Limkokwing University (LUCT)',
  'Botho University',
  'Lerotholi Polytechnic',
  'Lesotho College of Education (LCE)',
  'CAS',
  'NHTC',
];

const FUNDING_TYPES = [
  'NMDS',
  'Self-Funded',
  'Bursary',
  'Scholarship',
];

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function SignupScreen({
  navigation,
  onBack,
  onSignupComplete,
}) {
  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [form, setForm] =
    useState({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      studentNumber: '',
      university: '',
      fundingType: '',
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    uniModalVisible,
    setUniModalVisible,
  ] = useState(false);

  const [
    fundingModalVisible,
    setFundingModalVisible,
  ] = useState(false);

  const [strength, setStrength] =
    useState({
      score: 0,
      label: '',
      color: '#cbd5e1',
    });

  /*
  |--------------------------------------------------------------------------
  | PASSWORD STRENGTH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const pass = form.password;

    let score = 0;

    if (pass.length > 0) score = 1;

    if (pass.length >= 6) score = 2;

    if (
      /[A-Z]/.test(pass) &&
      /[0-9]/.test(pass)
    ) {
      score = 3;
    }

    if (
      /[!@#$%^&*]/.test(pass) &&
      pass.length >= 8
    ) {
      score = 4;
    }

    const levels = [
      {
        label: '',
        color: '#cbd5e1',
      },

      {
        label: 'Weak',
        color: '#ef4444',
      },

      {
        label: 'Fair',
        color: '#f59e0b',
      },

      {
        label: 'Good',
        color: '#3b82f6',
      },

      {
        label: 'Strong',
        color: '#10b981',
      },
    ];

    setStrength(levels[score]);
  }, [form.password]);

  /*
  |--------------------------------------------------------------------------
  | INPUT CHANGE
  |--------------------------------------------------------------------------
  */

  function updateField(
    key,
    value
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  /*
  |--------------------------------------------------------------------------
  | SIGNUP
  |--------------------------------------------------------------------------
  */

  async function handleSignup() {
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!form.name.trim()) {
      setError(
        'Please enter your full name'
      );

      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    }

    if (
      !form.email.trim() ||
      !emailRegex.test(
        form.email.trim()
      )
    ) {
      setError(
        'Please enter a valid email'
      );

      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    }

    if (
      !form.studentNumber.trim()
    ) {
      setError(
        'Please enter your student number'
      );

      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    }

    if (!form.university) {
      setError(
        'Please select your university'
      );

      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    }

    if (!form.fundingType) {
      setError(
        'Please select funding type'
      );

      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    }

    if (form.password.length < 6) {
      setError(
        'Password must be at least 6 characters'
      );

      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        'Passwords do not match'
      );

      return Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    }

    /*
    |--------------------------------------------------------------------------
    | REGISTER
    |--------------------------------------------------------------------------
    */

    try {
      setLoading(true);

      setError('');

      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );

      const result =
        await registerStudent(
          form.email.trim(),
          form.password,
          {
            name:
              form.name.trim(),

            studentNumber:
              form.studentNumber.trim(),

            university:
              form.university,

            fundingType:
              form.fundingType,
          }
        );

      console.log(
        '[SignupScreen] Registration success:',
        result
      );

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      /*
      |--------------------------------------------------------------------------
      | NAVIGATE
      |--------------------------------------------------------------------------
      */

      if (onSignupComplete) {
        onSignupComplete(
          result.user.uid
        );

        return;
      }

      navigation?.replace?.(
        'DashboardScreen'
      );
    } catch (err) {
      console.log(
        '[SignupScreen] Error:',
        err
      );

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );

      switch (err.code) {
        case 'auth/email-already-in-use':
          setError(
            'Email already exists'
          );
          break;

        case 'auth/invalid-email':
          setError(
            'Invalid email address'
          );
          break;

        case 'auth/weak-password':
          setError(
            'Password too weak'
          );
          break;

        case 'auth/network-request-failed':
          setError(
            'Check your internet connection'
          );
          break;

        case 'permission-denied':
        case 'firestore/permission-denied':
          setError(
            'Database permissions error'
          );
          break;

        default:
          setError(
            err.message ||
              'Signup failed'
          );
      }
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SELECTION ITEM
  |--------------------------------------------------------------------------
  */

  function SelectionItem({
    item,
    selectedValue,
    onSelect,
  }) {
    const active =
      selectedValue === item;

    return (
      <Pressable
        style={[
          styles.modalItem,
          active &&
            styles.modalItemActive,
        ]}
        onPress={() => {
          Haptics.selectionAsync();

          onSelect(item);
        }}
      >
        <Text
          style={[
            styles.modalItemText,

            active &&
              styles.modalItemTextActive,
          ]}
        >
          {item}
        </Text>

        {active && (
          <Check
            size={20}
            color="#334155"
          />
        )}
      </Pressable>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <LinearGradient
      colors={[
        '#e2e8f0',
        '#d7dee5',
        '#cbd5e1',
      ]}
      style={styles.container}
    >
      <SafeAreaView
        style={styles.safe}
      >
        <StatusBar style="dark" />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={
              styles.scroll
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {/* BACK BUTTON */}

            <Pressable
              style={styles.backBtn}
              onPress={() => {
                if (onBack)
                  return onBack();

                navigation?.goBack?.();
              }}
            >
              <ArrowLeft
                size={22}
                color="#334155"
              />
            </Pressable>

            {/* HEADER */}

            <View style={styles.header}>
              <Text style={styles.title}>
                Create{'\n'}Account
              </Text>

              <Text
                style={styles.subtitle}
              >
                Join the EduFlow
                student ecosystem
              </Text>
            </View>

            {/* FORM */}

            <View style={styles.form}>
              {!!error && (
                <Text
                  style={styles.error}
                >
                  {error}
                </Text>
              )}

              {/* NAME */}

              <View
                style={styles.group}
              >
                <Text
                  style={styles.label}
                >
                  FULL NAME
                </Text>

                <TextInput
                  value={form.name}
                  onChangeText={(
                    text
                  ) =>
                    updateField(
                      'name',
                      text
                    )
                  }
                  placeholder="Thabo Tlou"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>

              {/* STUDENT NUMBER */}

              <View
                style={styles.group}
              >
                <Text
                  style={styles.label}
                >
                  STUDENT NUMBER
                </Text>

                <TextInput
                  value={
                    form.studentNumber
                  }
                  onChangeText={(
                    text
                  ) =>
                    updateField(
                      'studentNumber',
                      text
                    )
                  }
                  placeholder="20240001"
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>

              {/* EMAIL */}

              <View
                style={styles.group}
              >
                <Text
                  style={styles.label}
                >
                  EMAIL
                </Text>

                <TextInput
                  value={form.email}
                  onChangeText={(
                    text
                  ) =>
                    updateField(
                      'email',
                      text
                    )
                  }
                  placeholder="student@gmail.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>

              {/* PASSWORD */}

              <View
                style={styles.group}
              >
                <Text
                  style={styles.label}
                >
                  PASSWORD
                </Text>

                <View
                  style={
                    styles.passwordWrap
                  }
                >
                  <TextInput
                    value={
                      form.password
                    }
                    onChangeText={(
                      text
                    ) =>
                      updateField(
                        'password',
                        text
                      )
                    }
                    placeholder="••••••••"
                    secureTextEntry={
                      !showPassword
                    }
                    placeholderTextColor="#94a3b8"
                    style={
                      styles.passwordInput
                    }
                  />

                  <Pressable
                    onPress={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    style={
                      styles.eyeBtn
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={20}
                        color="#64748b"
                      />
                    ) : (
                      <Eye
                        size={20}
                        color="#64748b"
                      />
                    )}
                  </Pressable>
                </View>

                {form.password
                  .length > 0 && (
                  <View
                    style={
                      styles.strengthRow
                    }
                  >
                    <View
                      style={
                        styles.barBg
                      }
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${
                              (strength.score /
                                4) *
                              100
                            }%`,
                            backgroundColor:
                              strength.color,
                          },
                        ]}
                      />
                    </View>

                    <Text
                      style={[
                        styles.strengthText,
                        {
                          color:
                            strength.color,
                        },
                      ]}
                    >
                      {
                        strength.label
                      }
                    </Text>
                  </View>
                )}
              </View>

              {/* CONFIRM PASSWORD */}

              <View
                style={styles.group}
              >
                <Text
                  style={styles.label}
                >
                  CONFIRM PASSWORD
                </Text>

                <View
                  style={
                    styles.passwordWrap
                  }
                >
                  <TextInput
                    value={
                      form.confirmPassword
                    }
                    onChangeText={(
                      text
                    ) =>
                      updateField(
                        'confirmPassword',
                        text
                      )
                    }
                    placeholder="••••••••"
                    secureTextEntry={
                      !showConfirmPassword
                    }
                    placeholderTextColor="#94a3b8"
                    style={
                      styles.passwordInput
                    }
                  />

                  <Pressable
                    onPress={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    style={
                      styles.eyeBtn
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff
                        size={20}
                        color="#64748b"
                      />
                    ) : (
                      <Eye
                        size={20}
                        color="#64748b"
                      />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* UNIVERSITY */}

              <View
                style={styles.group}
              >
                <Text
                  style={styles.label}
                >
                  UNIVERSITY
                </Text>

                <Pressable
                  style={styles.select}
                  onPress={() =>
                    setUniModalVisible(
                      true
                    )
                  }
                >
                  <Text
                    style={[
                      styles.selectText,

                      !form.university && {
                        color:
                          '#94a3b8',
                      },
                    ]}
                  >
                    {form.university ||
                      'Select institution'}
                  </Text>

                  <ChevronDown
                    size={20}
                    color="#64748b"
                  />
                </Pressable>
              </View>

              {/* FUNDING */}

              <View
                style={styles.group}
              >
                <Text
                  style={styles.label}
                >
                  FUNDING TYPE
                </Text>

                <Pressable
                  style={styles.select}
                  onPress={() =>
                    setFundingModalVisible(
                      true
                    )
                  }
                >
                  <Text
                    style={[
                      styles.selectText,

                      !form.fundingType && {
                        color:
                          '#94a3b8',
                      },
                    ]}
                  >
                    {form.fundingType ||
                      'Select funding'}
                  </Text>

                  <ChevronDown
                    size={20}
                    color="#64748b"
                  />
                </Pressable>
              </View>

              {/* BUTTON */}

              <Pressable
                onPress={
                  handleSignup
                }
                disabled={loading}
              >
                <LinearGradient
                  colors={[
                    '#4a616c',
                    '#334155',
                  ]}
                  style={styles.button}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={
                        styles.buttonText
                      }
                    >
                      Create Account
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>

          {/* UNIVERSITY MODAL */}

          <Modal
            visible={
              uniModalVisible
            }
            transparent
            animationType="fade"
          >
            <View
              style={
                styles.modalOverlay
              }
            >
              <View
                style={
                  styles.modalCard
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Choose University
                </Text>

                <FlatList
                  data={
                    UNIVERSITIES
                  }
                  keyExtractor={(
                    item
                  ) => item}
                  renderItem={({
                    item,
                  }) => (
                    <SelectionItem
                      item={item}
                      selectedValue={
                        form.university
                      }
                      onSelect={(
                        value
                      ) => {
                        updateField(
                          'university',
                          value
                        );

                        setUniModalVisible(
                          false
                        );
                      }}
                    />
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* FUNDING MODAL */}

          <Modal
            visible={
              fundingModalVisible
            }
            transparent
            animationType="fade"
          >
            <View
              style={
                styles.modalOverlay
              }
            >
              <View
                style={
                  styles.modalCard
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Funding Type
                </Text>

                <FlatList
                  data={
                    FUNDING_TYPES
                  }
                  keyExtractor={(
                    item
                  ) => item}
                  renderItem={({
                    item,
                  }) => (
                    <SelectionItem
                      item={item}
                      selectedValue={
                        form.fundingType
                      }
                      onSelect={(
                        value
                      ) => {
                        updateField(
                          'fundingType',
                          value
                        );

                        setFundingModalVisible(
                          false
                        );
                      }}
                    />
                  )}
                />
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safe: {
    flex: 1,
  },

  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 50,
  },

  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor:
      'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },

  header: {
    marginBottom: 30,
  },

  title: {
    fontSize: 46,
    fontWeight: '900',
    color: '#1e293b',
    lineHeight: 48,
  },

  subtitle: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },

  form: {},

  error: {
    color: '#ef4444',
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },

  group: {
    marginBottom: 18,
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 1,
  },

  input: {
    height: 62,
    borderRadius: 24,
    backgroundColor:
      'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor:
      'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '600',
  },

  passwordWrap: {
    height: 62,
    borderRadius: 24,
    backgroundColor:
      'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor:
      'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },

  eyeBtn: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  barBg: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor:
      'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    marginRight: 10,
  },

  barFill: {
    height: '100%',
    borderRadius: 999,
  },

  strengthText: {
    fontSize: 11,
    fontWeight: '700',
    width: 50,
  },

  select: {
    height: 62,
    borderRadius: 24,
    backgroundColor:
      'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor:
      'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  selectText: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 15,
  },

  button: {
    height: 64,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },

  modalCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 32,
    padding: 24,
    maxHeight: '70%',
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 18,
    textAlign: 'center',
  },

  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  modalItemActive: {
    backgroundColor:
      'rgba(226,232,240,0.7)',
  },

  modalItemText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 15,
  },

  modalItemTextActive: {
    color: '#1e293b',
    fontWeight: '800',
  },
});