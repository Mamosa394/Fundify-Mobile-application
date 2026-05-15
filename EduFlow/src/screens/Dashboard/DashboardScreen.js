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
} from 'react-native';

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

import {
  getDashboardData,
  initializeUserBudget,
  calculateBudgetProgress,
  calculateScholarshipUrgency,
  calculateAcademicRisk,
  calculateEngagementIntensity,
} from '../../services/DashboardService';

const { width, height } =
  Dimensions.get('window');

const isSmallDevice =
  width < 390;

const COLORS = {
  bg: '#ECEFF1',

  surface: 'rgba(255,255,255,0.62)',

  surfaceStrong:
    'rgba(255,255,255,0.78)',

  border:
    'rgba(255,255,255,0.42)',

  text: '#0A0A0A',

  muted: '#6B7280',

  black: '#080808',

  cyan: '#7DD3FC',

  violet: '#C4B5FD',

  pink: '#F9A8D4',

  green: '#86EFAC',

  orange: '#FDBA74',
};

function fmtMoney(n) {
  return `M${Number(
    n || 0
  ).toLocaleString()}`;
}

export default function DashboardScreen() {
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

      const data =
        await getDashboardData();

      setDashboard(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
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

      await initializeUserBudget(
        Number(balanceInput)
      );

      const refreshed =
        await getDashboardData();

      setDashboard(refreshed);

      setBalanceInput('');
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Error',
        'Failed to initialize budget.'
      );
    } finally {
      setSavingBalance(false);
    }
  }

  const metrics = useMemo(() => {
    if (!dashboard) {
      return {
        budgetProgress: 0,
        scholarshipUrgency: 0,
        academicRisk: 0,
        engagementIntensity: 0,
      };
    }

    return {
      budgetProgress:
        calculateBudgetProgress(
          dashboard.financial
        ),

      scholarshipUrgency:
        calculateScholarshipUrgency(
          dashboard.scholarship
        ),

      academicRisk:
        calculateAcademicRisk(
          dashboard.academic
        ),

      engagementIntensity:
        calculateEngagementIntensity(
          dashboard.engagement
        ),
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
      <SafeAreaView
        style={styles.loading}
      >
        <ActivityIndicator
          size="large"
          color="#111"
        />

        <Text style={styles.loadingText}>
          Initializing Neural Core
        </Text>
      </SafeAreaView>
    );
  }

  if (!dashboard) {
    return (
      <SafeAreaView
        style={styles.loading}
      >
        <Text>
          Failed to load dashboard
        </Text>
      </SafeAreaView>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | BALANCE SETUP SCREEN
  |--------------------------------------------------------------------------
  */

  if (
    dashboard?.needsBalanceSetup
  ) {
    return (
      <ScreenWrapper
        backgroundColor={COLORS.bg}
        barStyle="dark-content"
        keyboardAvoiding
      >
        <StatusBar
          barStyle="dark-content"
        />

        <View
          style={styles.cyanGlow}
        />

        <View
          style={styles.violetGlow}
        />

        <View
          style={styles.greenGlow}
        />

        <View
          style={
            styles.setupContainer
          }
        >
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
              style={
                styles.commandGlow
              }
            />

            <View
              style={
                styles.setupHeader
              }
            >
              <View
                style={
                  styles.setupIconWrap
                }
              >
                <LinearGradient
                  colors={[
                    COLORS.cyan,
                    COLORS.violet,
                  ]}
                  style={
                    styles.setupIconGradient
                  }
                >
                  <Ionicons
                    name="wallet-outline"
                    size={28}
                    color="#000"
                  />
                </LinearGradient>
              </View>

              <View
                style={
                  styles.livePill
                }
              >
                <View
                  style={
                    styles.liveDot
                  }
                />

                <Text
                  style={
                    styles.liveText
                  }
                >
                  SMART MODE
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.setupTitle
              }
            >
              Smart Budget
              Calibration
            </Text>

            <Text
              style={
                styles.setupText
              }
            >
              Enter your current
              available balance to
              calibrate your budget
              intelligence for the
              rest of the month.
            </Text>

            <View
              style={
                styles.inputShell
              }
            >
              <Text
                style={
                  styles.currencyPrefix
                }
              >
                M
              </Text>

              <TextInput
                value={balanceInput}
                onChangeText={
                  setBalanceInput
                }
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#999"
                style={
                  styles.balanceInput
                }
              />
            </View>

            <Pressable
              disabled={
                savingBalance
              }
              onPress={
                handleInitializeBudget
              }
              style={
                styles.saveButton
              }
            >
              <LinearGradient
                colors={[
                  COLORS.cyan,
                  COLORS.violet,
                ]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
                style={
                  styles.saveButtonGradient
                }
              >
                {savingBalance ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color="#000"
                      style={{
                        marginRight: 10,
                      }}
                    />

                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Initialize
                      Budget
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Text
              style={
                styles.setupFooter
              }
            >
              Your budget adapts
              dynamically throughout
              the month.
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

      value:
        dashboard?.academic
          ?.gpa || 0,

      sub: 'Current GPA',

      color: COLORS.violet,

      icon: 'sparkles-outline',
    },

    {
      key: 'financial',

      label: 'BALANCE',

      value: fmtMoney(
        dashboard?.financial
          ?.currentBalance
      ),

      sub: 'Available funds',

      color: COLORS.cyan,

      icon: 'wallet-outline',
    },

    {
      key: 'engagement',

      label: 'ATTENDANCE',

      value: `${
        dashboard?.academic
          ?.attendancePct || 0
      }%`,

      sub: 'Live presence',

      color: COLORS.green,

      icon: 'pulse-outline',
    },

    {
      key: 'scholarship',

      label: 'DEADLINE',

      value: `${
        dashboard?.scholarship
          ?.nextDeadlineDays || 0
      }d`,

      sub: 'Submission window',

      color: COLORS.pink,

      icon: 'timer-outline',
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
      />

      <View style={styles.cyanGlow} />

      <View
        style={styles.violetGlow}
      />

      <View style={styles.greenGlow} />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* TOP BAR */}

        <View style={styles.topBar}>
          <View
            style={
              styles.brandWrap
            }
          >
            <View
              style={
                styles.brandDot
              }
            />

            <Text
              style={styles.brand}
            >
              EDUFLOW
            </Text>
          </View>

          <View
            style={
              styles.topRight
            }
          >
            <View
              style={
                styles.livePill
              }
            >
              <View
                style={
                  styles.liveDot
                }
              />

              <Text
                style={
                  styles.liveText
                }
              >
                LIVE
              </Text>
            </View>

            <View
              style={styles.avatar}
            >
              <Text
                style={
                  styles.avatarText
                }
              >
                {profile?.name
                  ?.split(' ')
                  ?.map(
                    (n) => n[0]
                  )
                  ?.join('')
                  ?.slice(0, 2)
                  ?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* USER */}

        <View style={styles.userRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              Welcome back,
            </Text>

            <Text
              numberOfLines={1}
              style={styles.user}
            >
              {profile?.name}
            </Text>
          </View>

          <View
            style={
              styles.statusBlock
            }
          >
            <Text
              style={
                styles.statusLabel
              }
            >
              SYSTEM STATUS
            </Text>

            <Text
              style={
                styles.statusValue
              }
            >
              Stable
            </Text>
          </View>
        </View>

        {/* COMMAND CARD */}

        <BlurView
          intensity={40}
          tint="light"
          style={styles.commandCard}
        >
          <LinearGradient
            colors={[
              'rgba(125,211,252,0.18)',
              'rgba(196,181,253,0.08)',
              'transparent',
            ]}
            style={styles.commandGlow}
          />

          <View
            style={
              styles.commandTop
            }
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.commandLabel
                }
              >
                COMMAND CENTER
              </Text>

              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={
                  styles.commandValue
                }
              >
                {fmtMoney(
                  dashboard
                    ?.financial
                    ?.currentBalance
                )}
              </Text>

              <Text
                style={
                  styles.commandSub
                }
              >
                Available monthly
                balance
              </Text>
            </View>

            <View
              style={
                styles.ringWrap
              }
            >
              <View
                style={
                  styles.outerRing
                }
              />

              <View
                style={
                  styles.middleRing
                }
              />

              <LinearGradient
                colors={[
                  COLORS.cyan,
                  COLORS.violet,
                ]}
                style={
                  styles.coreRing
                }
              />
            </View>
          </View>

          <View style={styles.graph}>
            {[40, 58, 48, 74, 62, 88].map(
              (h, i) => (
                <View
                  key={i}
                  style={[
                    styles.graphBar,
                    {
                      height: h,
                    },
                  ]}
                />
              )
            )}
          </View>

          <View
            style={
              styles.commandFooter
            }
          >
            <View
              style={
                styles.footerMetric
              }
            >
              <Text
                style={
                  styles.footerLabel
                }
              >
                Daily Safe Spend
              </Text>

              <Text
                style={
                  styles.footerValue
                }
              >
                {fmtMoney(
                  dashboard
                    ?.financial
                    ?.dailySafeSpend
                )}
              </Text>
            </View>

            <View
              style={
                styles.footerMetric
              }
            >
              <Text
                style={
                  styles.footerLabel
                }
              >
                Remaining Days
              </Text>

              <Text
                style={
                  styles.footerValue
                }
              >
                {
                  dashboard
                    ?.financial
                    ?.remainingDays
                }
              </Text>
            </View>

            <View
              style={
                styles.footerMetric
              }
            >
              <Text
                style={
                  styles.footerLabel
                }
              >
                Risk
              </Text>

              <Text
                style={
                  styles.footerValue
                }
              >
                Low
              </Text>
            </View>
          </View>
        </BlurView>

        {/* TELEMETRY */}

        <View
          style={
            styles.telemetryWrap
          }
        >
          {telemetry.map((item) => {
            const active =
              activeWidget ===
              item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() =>
                  onSelectWidget(
                    item.key
                  )
                }
                style={[
                  styles.telemetryCard,

                  active && {
                    borderColor:
                      item.color,
                    transform: [
                      {
                        translateY: -4,
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    `${item.color}25`,
                    'transparent',
                  ]}
                  style={
                    styles.telemetryGradient
                  }
                />

                <View
                  style={
                    styles.telemetryTop
                  }
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor:
                          `${item.color}20`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={
                        item.color
                      }
                    />
                  </View>

                  <View
                    style={[
                      styles.activeIndicator,
                      {
                        backgroundColor:
                          item.color,
                      },
                    ]}
                  />
                </View>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={
                    styles.telemetryValue
                  }
                >
                  {item.value}
                </Text>

                <Text
                  style={
                    styles.telemetryLabel
                  }
                >
                  {item.label}
                </Text>

                <Text
                  style={
                    styles.telemetrySub
                  }
                >
                  {item.sub}
                </Text>

                <View
                  style={
                    styles.telemetryLine
                  }
                >
                  <View
                    style={[
                      styles.telemetryLineFill,
                      {
                        backgroundColor:
                          item.color,
                      },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* NEURAL CORE */}

        <View
          style={styles.coreSection}
        >
          <View
            style={styles.coreTop}
          >
            <View>
              <Text
                style={
                  styles.coreTitle
                }
              >
                NEURAL CORE
              </Text>

              <Text
                style={
                  styles.coreSub
                }
              >
                Adaptive intelligence
                engine
              </Text>
            </View>

            <View
              style={
                styles.coreBadge
              }
            >
              <Text
                style={
                  styles.coreBadgeText
                }
              >
                AI ACTIVE
              </Text>
            </View>
          </View>

          <View style={styles.coreCard}>
            {isFocused && (
              <NeuralCore
                mode={activeWidget}
                budgetProgress={
                  metrics.budgetProgress
                }
                scholarshipUrgency={
                  metrics.scholarshipUrgency
                }
                academicRisk={
                  metrics.academicRisk
                }
                engagement={
                  metrics.engagementIntensity
                }
              />
            )}

            <View
              style={styles.hudTop}
            >
              <View
                style={
                  styles.hudBox
                }
              >
                <Text
                  style={
                    styles.hudLabel
                  }
                >
                  FINANCIAL LOAD
                </Text>

                <Text
                  style={
                    styles.hudValue
                  }
                >
                  Moderate
                </Text>
              </View>

              <View
                style={
                  styles.hudBox
                }
              >
                <Text
                  style={
                    styles.hudLabel
                  }
                >
                  ATTENDANCE
                </Text>

                <Text
                  style={
                    styles.hudValue
                  }
                >
                  {
                    dashboard
                      ?.academic
                      ?.attendancePct
                  }
                  %
                </Text>
              </View>
            </View>

            <View
              style={
                styles.hudBottom
              }
            >
              <View
                style={styles.signal}
              >
                {[18, 30, 42, 28].map(
                  (bar, index) => (
                    <View
                      key={index}
                      style={[
                        styles.signalBar,
                        {
                          height:
                            bar,
                        },
                      ]}
                    />
                  )
                )}
              </View>

              <Text
                style={
                  styles.syncText
                }
              >
                SYNCHRONIZING LIVE
                STUDENT DATA
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{ height: 120 }}
        />
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
    backgroundColor:
      'rgba(125,211,252,0.18)',
    top: 120,
    right: -120,
  },

  violetGlow: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: 999,
    backgroundColor:
      'rgba(196,181,253,0.14)',
    top: 420,
    left: -120,
  },

  greenGlow: {
    position: 'absolute',
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: 999,
    backgroundColor:
      'rgba(134,239,172,0.12)',
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
    fontFamily:
      'JosefinSans-Bold',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
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
    backgroundColor:
      COLORS.cyan,
    marginRight: 12,
  },

  brand: {
    fontSize: 13,
    letterSpacing: 3,
    color: COLORS.text,
    fontFamily:
      'JosefinSans-Bold',
  },

  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  livePill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor:
      'rgba(255,255,255,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor:
      COLORS.green,
    marginRight: 8,
  },

  liveText: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: COLORS.text,
    fontFamily:
      'JosefinSans-Bold',
  },

  avatar: {
    width: isSmallDevice
      ? 48
      : 54,
    height: isSmallDevice
      ? 48
      : 54,
    borderRadius: 18,
    backgroundColor:
      COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontFamily:
      'JosefinSans-Bold',
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
    fontFamily:
      'JosefinSans-Regular',
  },

  user: {
    marginTop: 6,
    fontSize: isSmallDevice
      ? 34
      : 42,
    lineHeight: isSmallDevice
      ? 38
      : 42,
    letterSpacing: -2,
    color: COLORS.text,
    fontFamily:
      'JosefinSans-Bold',
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
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    marginBottom: 26,
  },

  commandGlow: {
    ...StyleSheet.absoluteFillObject,
  },

  commandTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  commandLabel: {
    fontSize: 12,
    letterSpacing: 2,
    color: COLORS.muted,
    fontFamily:
      'JosefinSans-Bold',
  },

  commandValue: {
    marginTop: 18,
    fontSize: isSmallDevice
      ? 38
      : 50,
    lineHeight: isSmallDevice
      ? 42
      : 56,
    letterSpacing: -4,
    color: COLORS.text,
    fontFamily:
      'JosefinSans-Bold',
  },

  commandSub: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.muted,
    fontFamily:
      'JosefinSans-Regular',
  },

  ringWrap: {
    width: isSmallDevice
      ? 100
      : 130,
    height: isSmallDevice
      ? 100
      : 130,
    justifyContent: 'center',
    alignItems: 'center',
  },

  outerRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor:
      'rgba(0,0,0,0.08)',
  },

  middleRing: {
    position: 'absolute',
    width: '68%',
    height: '68%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor:
      'rgba(0,0,0,0.08)',
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
    backgroundColor:
      COLORS.black,
    marginRight: 10,
  },

  commandFooter: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  footerMetric: {
    flex: 1,
  },

  footerLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.muted,
    marginBottom: 8,
    fontFamily:
      'JosefinSans-Bold',
  },

  footerValue: {
    fontSize: isSmallDevice
      ? 16
      : 18,
    color: COLORS.text,
    fontFamily:
      'JosefinSans-Bold',
  },

  telemetryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
    marginBottom: 36,
  },

  telemetryCard: {
    width:
      width < 420
        ? '100%'
        : (width - 56) / 2,
    minHeight: 180,
    borderRadius: 32,
    padding: 20,
    overflow: 'hidden',
    backgroundColor:
      COLORS.surfaceStrong,
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.34)',
    marginBottom: 16,
  },

  telemetryGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  telemetryTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
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
    fontFamily:
      'JosefinSans-Bold',
  },

  telemetryLabel: {
    marginTop: 12,
    fontSize: 12,
    letterSpacing: 1.5,
    color: COLORS.muted,
    fontFamily:
      'JosefinSans-Bold',
  },

  telemetrySub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.muted,
    fontFamily:
      'JosefinSans-Regular',
  },

  telemetryLine: {
    marginTop: 18,
    height: 5,
    borderRadius: 999,
    backgroundColor:
      'rgba(0,0,0,0.06)',
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
    fontSize: isSmallDevice
      ? 24
      : 30,
    letterSpacing: -2,
    color: COLORS.text,
    fontFamily:
      'JosefinSans-Bold',
  },

  coreSub: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.muted,
    fontFamily:
      'JosefinSans-Regular',
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
    fontFamily:
      'JosefinSans-Bold',
  },

  coreCard: {
    minHeight:
      height * 0.62,
    borderRadius: 42,
    overflow: 'hidden',
    backgroundColor:
      COLORS.black,
  },

  hudTop: {
    position: 'absolute',
    top: 22,
    left: 22,
    right: 22,
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  hudBox: {
    width: width * 0.32,
    padding: 16,
    borderRadius: 24,
    backgroundColor:
      'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.08)',
  },

  hudLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#8B8B8B',
    fontFamily:
      'JosefinSans-Bold',
  },

  hudValue: {
    marginTop: 12,
    fontSize: 20,
    color: '#fff',
    fontFamily:
      'JosefinSans-Bold',
  },

  hudBottom: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'flex-end',
  },

  signal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  signalBar: {
    width: 8,
    borderRadius: 999,
    backgroundColor:
      COLORS.cyan,
    marginRight: 6,
  },

  syncText: {
    width: 140,
    fontSize: 11,
    lineHeight: 18,
    letterSpacing: 1.5,
    textAlign: 'right',
    color: '#8B8B8B',
    fontFamily:
      'JosefinSans-Bold',
  },
});