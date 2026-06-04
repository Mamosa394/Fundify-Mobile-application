// src/screens/Dashboard/DashboardScreen.js

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { BlurView } from 'expo-blur';

import { LinearGradient } from 'expo-linear-gradient';

import * as Haptics from 'expo-haptics';

import {
  Ionicons,
} from '@expo/vector-icons';

import { useIsFocused } from '@react-navigation/native';

import NeuralCore from '../../components/three/NeuralCore';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

// Import Firestore and Auth
import { auth } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Import services for data fetching
import { getCurrentBudget } from '../../../src/services/budgetService';
import { getModules, getGPAAnalytics } from '../../../src/services/academicService';
import { fetchStudentProfile } from '../../../src/services/profileService';

const { width, height } =
  Dimensions.get('window');

const isSmallDevice =
  width < 390;

const COLORS = {
  bg: '#ECEFF1',
  surface: 'rgba(255,255,255,0.62)',
  surfaceStrong: 'rgba(255,255,255,0.78)',
  border: 'rgba(255,255,255,0.42)',
  text: '#0A0A0A',
  muted: '#6B7280',
  black: '#080808',
  cyan: '#7dd4fc6d',
  violet: '#C4B5FD',
  pink: '#f855af52',
  green: '#86EFAC',
  orange: '#fdbb746c',
};

function fmtMoney(n) {
  return `M${Number(
    n || 0
  ).toLocaleString()}`;
}

// Helper function to safely get initials
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'ST';
  
  const parts = name.trim().split(' ');
  const initials = parts
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  
  return initials || 'ST';
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [loading, setLoading] =
    useState(true);

  const [dashboard, setDashboard] =
    useState(null);

  const [activeWidget, setActiveWidget] =
    useState('financial');

  const [balanceInput, setBalanceInput] =
    useState('');

  const [savingBalance, setSavingBalance] =
    useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No authenticated user');
        setDashboard(null);
        return;
      }

      const uid = currentUser.uid;
      console.log('[Dashboard] Loading data for user:', uid);

      // Fetch all data in parallel with error handling for each
      let studentProfile = null;
      let budgetData = null;
      let academicData = null;
      let gpaAnalytics = null;

      try {
        [studentProfile, budgetData, academicData, gpaAnalytics] = await Promise.all([
          fetchStudentProfile(uid).catch(err => {
            console.log('[Dashboard] Profile fetch error:', err);
            return null;
          }),
          getCurrentBudget(uid).catch(err => {
            console.log('[Dashboard] Budget fetch error:', err);
            return null;
          }),
          getModules().catch(err => {
            console.log('[Dashboard] Modules fetch error:', err);
            return { modules: [], gpa: 0, totalCredits: 0 };
          }),
          getGPAAnalytics().catch(err => {
            console.log('[Dashboard] GPA fetch error:', err);
            return { currentGPA: 0, totalModules: 0, totalCredits: 0 };
          }),
        ]);
      } catch (error) {
        console.log('[Dashboard] Parallel fetch error:', error);
      }

      // Calculate daily safe spend and remaining days
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const currentDay = new Date().getDate();
      const remainingDays = daysInMonth - currentDay;
      
      const totalBudget = budgetData?.totalBudget || 0;
      const dailySafeSpend = budgetData?.dailySafeSpend || 
        (totalBudget > 0 && remainingDays > 0 ? Math.floor(totalBudget / remainingDays) : 0);

      // Build dashboard object from real data with safe fallbacks
      const dashboardData = {
        profile: {
          name: studentProfile?.name || currentUser?.displayName || 'Student',
          email: studentProfile?.email || currentUser?.email || '',
          studentNumber: studentProfile?.studentNumber || '',
          university: studentProfile?.university || '',
          fundingType: studentProfile?.fundingType || '',
          profileImage: studentProfile?.profileImageLocal || studentProfile?.profileImage || null,
        },
        financial: {
          currentBalance: budgetData?.remainingBudget || 0,
          totalBudget: totalBudget,
          spentTotal: budgetData?.spentTotal || 0,
          dailySafeSpend: dailySafeSpend,
          remainingDays: budgetData?.remainingDays || remainingDays,
          categories: budgetData?.categories || {},
        },
        academic: {
          gpa: gpaAnalytics?.currentGPA || academicData?.gpa || 0,
          attendancePct: 85,
          totalCredits: academicData?.totalCredits || gpaAnalytics?.totalCredits || 0,
          modules: academicData?.modules || [],
          totalModules: gpaAnalytics?.totalModules || academicData?.modules?.length || 0,
          atRiskModules: gpaAnalytics?.atRiskModules || [],
        },
        scholarship: {
          nextDeadlineDays: calculateNextDeadline(academicData?.modules || []),
          activeApplications: 0,
        },
        needsBalanceSetup: !budgetData || !budgetData.totalBudget || budgetData.totalBudget === 0,
      };

      console.log('[Dashboard] Dashboard data built successfully');
      setDashboard(dashboardData);
    } catch (err) {
      console.log('[Dashboard] Load error:', err);
      Alert.alert(
        'Error',
        'Failed to load dashboard data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Helper function to calculate next assignment/assessment deadline
  function calculateNextDeadline(modules) {
    if (!modules || modules.length === 0) return 0;

    const now = new Date();
    let closestDeadline = null;

    modules.forEach((module) => {
      (module.assignments || []).forEach((assignment) => {
        if (assignment.dueDate) {
          const dueDate = new Date(assignment.dueDate);
          if (dueDate > now) {
            const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            if (!closestDeadline || daysDiff < closestDeadline) {
              closestDeadline = daysDiff;
            }
          }
        }
      });

      (module.assessments || []).forEach((assessment) => {
        const examDate = new Date(assessment.date || assessment.examDate);
        if (examDate && examDate > now) {
          const daysDiff = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
          if (!closestDeadline || daysDiff < closestDeadline) {
            closestDeadline = daysDiff;
          }
        }
      });
    });

    return closestDeadline || 0;
  }

  async function handleInitializeBudget() {
    try {
      if (!balanceInput) {
        Alert.alert(
          'Missing Balance',
          'Please enter your available balance.'
        );
        return;
      }

      setSavingBalance(true);

      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('No authenticated user');

      const { initializeUserBudget } = require('../../../src/services/budgetService');
      await initializeUserBudget(uid, Number(balanceInput));

      await loadDashboard();
      setBalanceInput('');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('[Dashboard] Budget init error:', error);
      Alert.alert(
        'Error',
        'Failed to initialize budget. Please try again.'
      );
    } finally {
      setSavingBalance(false);
    }
  }

  // Calculate metrics for NeuralCore
  const metrics = useMemo(() => {
    if (!dashboard) {
      return {
        budgetProgress: 0,
        scholarshipUrgency: 0,
        academicRisk: 0,
        engagementIntensity: 0,
      };
    }

    const budgetProgress = dashboard.financial.totalBudget > 0
      ? Math.min(100, (dashboard.financial.spentTotal / dashboard.financial.totalBudget) * 100)
      : 0;

    const scholarshipUrgency = dashboard.scholarship.nextDeadlineDays > 0
      ? Math.max(0, Math.min(100, 100 - (dashboard.scholarship.nextDeadlineDays / 30) * 100))
      : 0;

    const academicRisk = dashboard.academic.gpa > 0
      ? Math.max(0, Math.min(100, ((4.0 - dashboard.academic.gpa) / 4.0) * 100))
      : 50;

    const engagementIntensity = dashboard.academic.attendancePct || 50;

    return {
      budgetProgress,
      scholarshipUrgency,
      academicRisk,
      engagementIntensity,
    };
  }, [dashboard]);

  function onSelectWidget(key) {
    setActiveWidget(key);
    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>
          Initializing Neural Core
        </Text>
      </SafeAreaView>
    );
  }

  if (!dashboard) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text>Failed to load dashboard</Text>
      </SafeAreaView>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | BALANCE SETUP SCREEN
  |--------------------------------------------------------------------------
  */

  if (dashboard?.needsBalanceSetup) {
    return (
      <ScreenWrapper
        backgroundColor={COLORS.bg}
        barStyle="dark-content"
        keyboardAvoiding
      >
        <StatusBar barStyle="dark-content" />
        <View style={styles.cyanGlow} />
        <View style={styles.violetGlow} />
        <View style={styles.greenGlow} />

        <View style={styles.setupContainer}>
          <BlurView
            intensity={40}
            tint="light"
            style={styles.setupCard}
          >
            <LinearGradient
              colors={[
                'rgba(125,211,252,0.18)',
                'rgba(196,181,253,0.08)',
                'transparent',
              ]}
              style={styles.commandGlow}
            />

            <View style={styles.setupHeader}>
              <View style={styles.setupIconWrap}>
                <LinearGradient
                  colors={[COLORS.cyan, COLORS.violet]}
                  style={styles.setupIconGradient}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={28}
                    color="#000"
                  />
                </LinearGradient>
              </View>

              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  SMART MODE
                </Text>
              </View>
            </View>

            <Text style={styles.setupTitle}>
              Smart Budget Calibration
            </Text>

            <Text style={styles.setupText}>
              Enter your current available balance to calibrate your budget 
              intelligence for the rest of the month.
            </Text>

            <View style={styles.inputShell}>
              <Text style={styles.currencyPrefix}>M</Text>
              <TextInput
                value={balanceInput}
                onChangeText={setBalanceInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#999"
                style={styles.balanceInput}
              />
            </View>

            <Pressable
              disabled={savingBalance}
              onPress={handleInitializeBudget}
              style={styles.saveButton}
            >
              <LinearGradient
                colors={[COLORS.cyan, COLORS.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButtonGradient}
              >
                {savingBalance ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color="#000"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.saveButtonText}>
                      Initialize Budget
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Text style={styles.setupFooter}>
              Your budget adapts dynamically throughout the month.
            </Text>
          </BlurView>
        </View>
      </ScreenWrapper>
    );
  }

  const { profile } = dashboard;

  const telemetry = [
    {
      key: 'academic',
      label: 'ACADEMIC',
      value: dashboard?.academic?.gpa || 0,
      sub: 'Current GPA',
      color: COLORS.violet,
      icon: 'sparkles-outline',
    },
    {
      key: 'financial',
      label: 'BALANCE',
      value: fmtMoney(dashboard?.financial?.currentBalance),
      sub: 'Available funds',
      color: COLORS.cyan,
      icon: 'wallet-outline',
    },
    {
      key: 'engagement',
      label: 'ATTENDANCE',
      value: `${dashboard?.academic?.attendancePct || 0}%`,
      sub: 'Live presence',
      color: COLORS.green,
      icon: 'pulse-outline',
    },
    {
      key: 'scholarship',
      label: 'DEADLINE',
      value: `${dashboard?.scholarship?.nextDeadlineDays || 0}d`,
      sub: 'Submission window',
      color: COLORS.pink,
      icon: 'timer-outline',
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.cyanGlow} />
      <View style={styles.violetGlow} />
      <View style={styles.greenGlow} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={styles.brandDot} />
            <Text style={styles.brand}>EDUFLOW</Text>
          </View>
            <View style={styles.topRight}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                
                {/* Interactive Icon Wrapper */}
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Notificationscreen')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={18} color="black" />
                </TouchableOpacity>
              </View>


            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(profile?.name)}
              </Text>
            </View>
          </View>
        </View>

        {/* USER */}
        <View style={styles.userRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Welcome back,</Text>
            <Text numberOfLines={1} style={styles.user}>
              {profile?.name || 'Student'}
            </Text>
          </View>

          <View style={styles.statusBlock}>
            <Text style={styles.statusLabel}>SYSTEM STATUS</Text>
            <Text style={styles.statusValue}>Stable</Text>
          </View>
        </View>

        {/* COMMAND CARD */}
        <BlurView intensity={40} tint="light" style={styles.commandCard}>
          <LinearGradient
            colors={[
              'rgba(125,211,252,0.18)',
              'rgba(196,181,253,0.08)',
              'transparent',
            ]}
            style={styles.commandGlow}
          />

          <View style={styles.commandTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.commandLabel}>COMMAND CENTER</Text>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={styles.commandValue}
              >
                {fmtMoney(dashboard?.financial?.currentBalance)}
              </Text>
              <Text style={styles.commandSub}>
                Available monthly balance
              </Text>
            </View>

            <View style={styles.ringWrap}>
              <View style={styles.outerRing} />
              <View style={styles.middleRing} />
              <LinearGradient
                colors={[COLORS.cyan, COLORS.violet]}
                style={styles.coreRing}
              />
            </View>
          </View>

          <View style={styles.graph}>
            {[40, 58, 48, 74, 62, 88].map((h, i) => (
              <View key={i} style={[styles.graphBar, { height: h }]} />
            ))}
          </View>

          <View style={styles.commandFooter}>
            <View style={styles.footerMetric}>
              <Text style={styles.footerLabel}>Daily Safe Spend</Text>
              <Text style={styles.footerValue}>
                {fmtMoney(dashboard?.financial?.dailySafeSpend)}
              </Text>
            </View>

            <View style={styles.footerMetric}>
              <Text style={styles.footerLabel}>Remaining Days</Text>
              <Text style={styles.footerValue}>
                {dashboard?.financial?.remainingDays}
              </Text>
            </View>

            <View style={styles.footerMetric}>
              <Text style={styles.footerLabel}>Risk</Text>
              <Text style={styles.footerValue}>Low</Text>
            </View>
          </View>
        </BlurView>

        {/* TELEMETRY */}
        <View style={styles.telemetryWrap}>
          {telemetry.map((item) => {
            const active = activeWidget === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => onSelectWidget(item.key)}
                style={[
                  styles.telemetryCard,
                  active && {
                    borderColor: item.color,
                    transform: [{ translateY: -4 }],
                  },
                ]}
              >
                <LinearGradient
                  colors={[`${item.color}25`, 'transparent']}
                  style={styles.telemetryGradient}
                />

                <View style={styles.telemetryTop}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${item.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={item.color}
                    />
                  </View>

                  <View
                    style={[
                      styles.activeIndicator,
                      { backgroundColor: item.color },
                    ]}
                  />
                </View>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.telemetryValue}
                >
                  {item.value}
                </Text>

                <Text style={styles.telemetryLabel}>{item.label}</Text>
                <Text style={styles.telemetrySub}>{item.sub}</Text>

                <View style={styles.telemetryLine}>
                  <View
                    style={[
                      styles.telemetryLineFill,
                      { backgroundColor: item.color },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* NEURAL CORE */}
        <View style={styles.coreSection}>
          <View style={styles.coreTop}>
            <View>
              <Text style={styles.coreTitle}>NEURAL CORE</Text>
              <Text style={styles.coreSub}>
                Adaptive intelligence engine
              </Text>
            </View>

            <View style={styles.coreBadge}>
              <Text style={styles.coreBadgeText}>AI ACTIVE</Text>
            </View>
          </View>

          <View style={styles.coreCard}>
            {isFocused && (
              <NeuralCore
                mode={activeWidget}
                budgetProgress={metrics.budgetProgress}
                scholarshipUrgency={metrics.scholarshipUrgency}
                academicRisk={metrics.academicRisk}
                engagement={metrics.engagementIntensity}
              />
            )}

            <View style={styles.hudTop}>
              <View style={styles.hudBox}>
                <Text style={styles.hudLabel}>FINANCIAL LOAD</Text>
                <Text style={styles.hudValue}>Moderate</Text>
              </View>

              <View style={styles.hudBox}>
                <Text style={styles.hudLabel}>ATTENDANCE</Text>
                <Text style={styles.hudValue}>
                  {dashboard?.academic?.attendancePct}%
                </Text>
              </View>
            </View>

            <View style={styles.hudBottom}>
              <View style={styles.signal}>
                {[18, 30, 42, 28].map((bar, index) => (
                  <View key={index} style={[styles.signalBar, { height: bar }]} />
                ))}
              </View>

              <Text style={styles.syncText}>
                SYNCHRONIZING LIVE STUDENT DATA
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 100,
  },
  cyanGlow: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 999,
    backgroundColor: 'rgba(39, 63, 73, 0.18)',
    top: 120,
    right: -120,
  },
  violetGlow: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: 999,
    backgroundColor: 'rgba(39, 35, 55, 0.14)',
    top: 420,
    left: -120,
  },
  greenGlow: {
    position: 'absolute',
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: 999,
    backgroundColor: 'rgba(35, 57, 43, 0.12)',
    bottom: 120,
    right: -80,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'JosefinSans-Bold',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.cyan,
    marginRight: 12,
  },
  brand: {
    fontSize: 13,
    letterSpacing: 3,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.green,
    marginRight: 8,
  },
  liveText: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  avatar: {
    width: isSmallDevice ? 48 : 54,
    height: isSmallDevice ? 48 : 54,
    borderRadius: 18,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'JosefinSans-Bold',
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 18,
    color: COLORS.muted,
    fontFamily: 'JosefinSans-Regular',
  },
  user: {
    marginTop: 6,
    fontSize: isSmallDevice ? 34 : 42,
    lineHeight: isSmallDevice ? 38 : 42,
    letterSpacing: -2,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  statusBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  statusLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.muted,
    marginBottom: 6,
    fontFamily: 'JosefinSans-Bold',
  },
  statusValue: {
    fontSize: 22,
    lineHeight: 24,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  commandCard: {
    overflow: 'hidden',
    borderRadius: 36,
    padding: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 26,
  },
  commandGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  commandTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commandLabel: {
    fontSize: 12,
    letterSpacing: 2,
    color: COLORS.muted,
    fontFamily: 'JosefinSans-Bold',
  },
  commandValue: {
    marginTop: 18,
    fontSize: isSmallDevice ? 38 : 50,
    lineHeight: isSmallDevice ? 42 : 56,
    letterSpacing: -4,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  commandSub: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.muted,
    fontFamily: 'JosefinSans-Regular',
  },
  ringWrap: {
    width: isSmallDevice ? 100 : 130,
    height: isSmallDevice ? 100 : 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  middleRing: {
    position: 'absolute',
    width: '68%',
    height: '68%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  coreRing: {
    width: 34,
    height: 34,
    borderRadius: 999,
  },
  graph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 34,
  },
  graphBar: {
    width: 20,
    borderRadius: 999,
    backgroundColor: COLORS.black,
    marginRight: 10,
  },
  commandFooter: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerMetric: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.muted,
    marginBottom: 8,
    fontFamily: 'JosefinSans-Bold',
  },
  footerValue: {
    fontSize: isSmallDevice ? 16 : 18,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  telemetryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  telemetryCard: {
    width: width < 420 ? '100%' : (width - 56) / 2,
    minHeight: 180,
    borderRadius: 32,
    padding: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceStrong,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    marginBottom: 16,
  },
  telemetryGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  telemetryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  telemetryValue: {
    marginTop: 26,
    fontSize: 28,
    letterSpacing: -1.5,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  telemetryLabel: {
    marginTop: 12,
    fontSize: 12,
    letterSpacing: 1.5,
    color: COLORS.muted,
    fontFamily: 'JosefinSans-Bold',
  },
  telemetrySub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.muted,
    fontFamily: 'JosefinSans-Regular',
  },
  telemetryLine: {
    marginTop: 18,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  telemetryLineFill: {
    width: '70%',
    height: '100%',
    borderRadius: 999,
  },
  coreSection: {
    marginTop: 6,
  },
  coreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  coreTitle: {
    fontSize: isSmallDevice ? 24 : 30,
    letterSpacing: -2,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  coreSub: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.muted,
    fontFamily: 'JosefinSans-Regular',
  },
  coreBadge: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
  },
  coreBadgeText: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: 'JosefinSans-Bold',
  },
  coreCard: {
    minHeight: height * 0.62,
    borderRadius: 42,
    overflow: 'hidden',
    backgroundColor: COLORS.black,
  },
  hudTop: {
    position: 'absolute',
    top: 22,
    left: 22,
    right: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudBox: {
    width: width * 0.32,
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hudLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#8B8B8B',
    fontFamily: 'JosefinSans-Bold',
  },
  hudValue: {
    marginTop: 12,
    fontSize: 20,
    color: '#fff',
    fontFamily: 'JosefinSans-Bold',
  },
  hudBottom: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  signalBar: {
    width: 8,
    borderRadius: 999,
    backgroundColor: COLORS.cyan,
    marginRight: 6,
  },
  syncText: {
    width: 140,
    fontSize: 11,
    lineHeight: 18,
    letterSpacing: 1.5,
    textAlign: 'right',
    color: '#8B8B8B',
    fontFamily: 'JosefinSans-Bold',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  setupCard: {
    width: '100%',
    borderRadius: 36,
    padding: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  setupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  setupIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
  },
  setupIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupTitle: {
    fontSize: 28,
    letterSpacing: -1,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
    marginBottom: 12,
  },
  setupText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.muted,
    fontFamily: 'JosefinSans-Regular',
    marginBottom: 24,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  currencyPrefix: {
    fontSize: 24,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
    marginRight: 12,
  },
  balanceInput: {
    flex: 1,
    fontSize: 24,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Regular',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'JosefinSans-Bold',
  },
  setupFooter: {
    marginTop: 20,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    fontFamily: 'JosefinSans-Regular',
  },
});