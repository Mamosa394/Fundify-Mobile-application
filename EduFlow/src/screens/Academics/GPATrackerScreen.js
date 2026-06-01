// src/screens/AcademicPlanner/GPATrackerScreen.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeInLeft,
  ZoomIn,
} from 'react-native-reanimated';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Target,
  Award,
  ChevronRight,
  Activity,
  Zap,
  PieChart,
  BarChart3,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import GradeSimulationModal from './components/GradeSimulationModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_PADDING = 20;

const COLORS = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.7)',
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: 'rgba(226, 232, 240, 0.6)',
  gradient1: ['#3B82F6', '#8B5CF6'],
  gradient2: ['#10B981', '#3B82F6'],
  gradient3: ['#F59E0B', '#EF4444'],
};

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#34D399',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#60A5FA',
  'C+': '#F59E0B', 'C': '#F59E0B', 'C-': '#FBBF24',
  'D+': '#EF4444', 'D': '#EF4444', 'D-': '#F87171',
  'F': '#DC2626',
};

const GPATrackerScreen = () => {
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const {
    modules,
    gpa,
    totalCredits,
    analytics,
    fetchModules,
    fetchAnalytics,
    simulateGPA,
  } = useAcademicStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchModules(), fetchAnalytics()]);
  };

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textMuted;

  const gpaStatus = useMemo(() => {
    if (gpa >= 3.5) return { label: 'Excellent', color: COLORS.success, icon: Star };
    if (gpa >= 3.0) return { label: 'Good', color: COLORS.primary, icon: TrendingUp };
    if (gpa >= 2.0) return { label: 'Average', color: COLORS.warning, icon: Activity };
    return { label: 'At Risk', color: COLORS.danger, icon: AlertTriangle };
  }, [gpa]);

  const getPointsToTarget = () => {
    const targetGPA = 3.5;
    const currentPoints = gpa * totalCredits;
    const targetPoints = targetGPA * totalCredits;
    return Math.max(0, (targetPoints - currentPoints)).toFixed(1);
  };

  const handleSimulationComplete = (result) => {
    setSimulationResult(result);
    setShowSimulation(false);
    Alert.alert(
      'GPA Simulation Result',
      `Current GPA: ${result.currentGPA.toFixed(2)}\n` +
      `Simulated GPA: ${result.simulatedGPA.toFixed(2)}\n` +
      `Difference: ${result.difference > 0 ? '+' : ''}${result.difference.toFixed(2)}\n` +
      `${result.isImprovement ? '📈 Improvement!' : '📉 Decrease'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <Text style={styles.title}>GPA Tracker</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main GPA Display */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.mainGPACard}>
          <LinearGradient
            colors={gpa >= 3.0 ? COLORS.gradient2 : COLORS.gradient3}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainGPAGradient}
          >
            <View style={styles.mainGPAContent}>
              <View style={styles.mainGPALeft}>
                <Text style={styles.mainGPALabel}>Current GPA</Text>
                <Text style={styles.mainGPAValue}>{gpa.toFixed(2)}</Text>
                <View style={styles.mainGPAStatus}>
                  <gpaStatus.icon size={16} color="#FFFFFF" />
                  <Text style={styles.mainGPAStatusText}>{gpaStatus.label}</Text>
                </View>
              </View>
              <View style={styles.mainGPARight}>
                <View style={styles.mainGPAStat}>
                  <Text style={styles.mainGPAStatValue}>{totalCredits}</Text>
                  <Text style={styles.mainGPAStatLabel}>Credits</Text>
                </View>
                <View style={styles.mainGPAStat}>
                  <Text style={styles.mainGPAStatValue}>{modules.length}</Text>
                  <Text style={styles.mainGPAStatLabel}>Modules</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* GPA Details Grid */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <BlurView intensity={30} tint="light" style={styles.detailCardBlur}>
              <Target size={20} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Target GPA</Text>
              <Text style={styles.detailValue}>3.50</Text>
            </BlurView>
          </View>
          <View style={styles.detailCard}>
            <BlurView intensity={30} tint="light" style={styles.detailCardBlur}>
              <Award size={20} color={COLORS.secondary} />
              <Text style={styles.detailLabel}>Points Needed</Text>
              <Text style={[styles.detailValue, { color: COLORS.warning }]}>
                {getPointsToTarget()}
              </Text>
            </BlurView>
          </View>
          <View style={styles.detailCard}>
            <BlurView intensity={30} tint="light" style={styles.detailCardBlur}>
              <Activity size={20} color={COLORS.success} />
              <Text style={styles.detailLabel}>Predicted</Text>
              <Text style={[styles.detailValue, { color: COLORS.success }]}>
                {analytics?.predictedGPA?.toFixed(2) || gpa.toFixed(2)}
              </Text>
            </BlurView>
          </View>
          <View style={styles.detailCard}>
            <BlurView intensity={30} tint="light" style={styles.detailCardBlur}>
              <BarChart3 size={20} color={COLORS.warning} />
              <Text style={styles.detailLabel}>Risk Level</Text>
              <Text style={[
                styles.detailValue,
                { color: (analytics?.atRiskModules || []).length > 0 ? COLORS.danger : COLORS.success }
              ]}>
                {(analytics?.atRiskModules || []).length > 0 ? 'Review' : 'Safe'}
              </Text>
            </BlurView>
          </View>
        </Animated.View>

        {/* Grade Breakdown */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.breakdownCard}>
          <BlurView intensity={30} tint="light" style={styles.cardBlur}>
            <Text style={styles.cardTitle}>Grade Breakdown</Text>
            <View style={styles.breakdownChart}>
              {Object.entries(analytics?.gradeDistribution || {}).map(([grade, count], index) => (
                <Animated.View
                  key={grade}
                  entering={FadeInLeft.delay(500 + index * 100).springify()}
                  style={styles.breakdownBar}
                >
                  <View style={styles.breakdownBarHeader}>
                    <Text style={[styles.breakdownGrade, { color: getGradeColor(grade) }]}>
                      {grade}
                    </Text>
                    <Text style={styles.breakdownCount}>{count} modules</Text>
                  </View>
                  <View style={styles.breakdownBarTrack}>
                    <Animated.View
                      style={[
                        styles.breakdownBarFill,
                        {
                          width: `${(count / Math.max(modules.length, 1)) * 100}%`,
                          backgroundColor: getGradeColor(grade),
                        },
                      ]}
                    />
                  </View>
                </Animated.View>
              ))}
            </View>
          </BlurView>
        </Animated.View>

        {/* Module GPA Contributions */}
        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.contributionsCard}>
          <BlurView intensity={30} tint="light" style={styles.cardBlur}>
            <Text style={styles.cardTitle}>Module Contributions</Text>
            {modules.map((module, index) => (
              <Animated.View
                key={module.id}
                entering={FadeInRight.delay(700 + index * 100).springify()}
                style={styles.contributionItem}
              >
                <View style={styles.contributionLeft}>
                  <View style={[styles.moduleColor, { backgroundColor: module.color }]} />
                  <View>
                    <Text style={styles.contributionName}>{module.moduleName}</Text>
                    <Text style={styles.contributionCredits}>{module.credits} credits</Text>
                  </View>
                </View>
                <View style={styles.contributionRight}>
                  <View style={[
                    styles.contributionGrade,
                    { backgroundColor: getGradeColor(module.currentGrade) + '20' }
                  ]}>
                    <Text style={[
                      styles.contributionGradeText,
                      { color: getGradeColor(module.currentGrade) }
                    ]}>
                      {module.currentGrade}
                    </Text>
                  </View>
                  <Text style={styles.contributionWeight}>
                    {(module.credits / Math.max(totalCredits, 1) * 100).toFixed(1)}%
                  </Text>
                </View>
              </Animated.View>
            ))}
          </BlurView>
        </Animated.View>

        {/* Simulation Button */}
        <Animated.View entering={ZoomIn.delay(800).springify()}>
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={() => setShowSimulation(true)}
          >
            <LinearGradient
              colors={COLORS.gradient1}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.simulateButtonGradient}
            >
              <Zap size={20} color="#FFFFFF" />
              <Text style={styles.simulateButtonText}>What-If Grade Simulation</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Risk Warnings */}
        {(analytics?.atRiskModules || []).length > 0 && (
          <Animated.View entering={FadeInDown.delay(900)} style={styles.riskCard}>
            <BlurView intensity={30} tint="light" style={styles.cardBlur}>
              <View style={styles.riskHeader}>
                <AlertTriangle size={20} color={COLORS.danger} />
                <Text style={styles.riskTitle}>At-Risk Modules</Text>
              </View>
              {(analytics?.atRiskModules || []).map((module, index) => (
                <View key={module.id || index} style={styles.riskItem}>
                  <View style={[styles.moduleColor, { backgroundColor: module.color }]} />
                  <Text style={styles.riskModuleName}>{module.moduleName}</Text>
                  <Text style={[styles.riskGrade, { color: COLORS.danger }]}>
                    {module.currentGrade}
                  </Text>
                </View>
              ))}
            </BlurView>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <GradeSimulationModal
        visible={showSimulation}
        onClose={() => setShowSimulation(false)}
        onSimulate={handleSimulationComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CARD_PADDING,
  },
  mainGPACard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mainGPAGradient: {
    padding: 24,
  },
  mainGPAContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainGPALeft: {
    flex: 1,
  },
  mainGPALabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  mainGPAValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  mainGPAStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mainGPAStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mainGPARight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
  },
  mainGPAStat: {
    alignItems: 'center',
  },
  mainGPAStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mainGPAStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  detailCard: {
    width: '47%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  detailCardBlur: {
    padding: 16,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
  },
  breakdownCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardBlur: {
    padding: CARD_PADDING,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  breakdownChart: {
    gap: 12,
  },
  breakdownBar: {
    gap: 6,
  },
  breakdownBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownGrade: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  breakdownBarTrack: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  contributionsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  contributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  contributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moduleColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  contributionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  contributionCredits: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  contributionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contributionGrade: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contributionGradeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contributionWeight: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  simulateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  simulateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  simulateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  riskCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.danger,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  riskModuleName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  riskGrade: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default GPATrackerScreen;