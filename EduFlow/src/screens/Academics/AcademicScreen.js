// src/screens/AcademicPlanner/AcademicScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Trash2,
  GraduationCap,
  Star,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import ModuleModal from './components/ModuleModal';
import GPADetailsModal from './components/GPADetailsModal';
import MarksModal from './components/MarksModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surfaceGlass: 'rgba(255, 255, 255, 0.92)',
  surfaceGlassBorder: 'rgba(255, 255, 255, 0.95)',
  primary: '#475569',
  primaryDark: '#334155',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#DC2626',
  shadow: '#CBD5E1',
  white: '#FFFFFF',
};

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#34D399',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#60A5FA',
  'C+': '#F59E0B', 'C': '#F59E0B', 'C-': '#FBBF24',
  'D+': '#EF4444', 'D': '#EF4444', 'D-': '#F87171',
  'F': '#DC2626',
};

function GPARingObject({ gpa }) {
  const ringRef = useRef();
  const sphereRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.y = Math.sin(t * 0.2) * 0.2;
      ringRef.current.rotation.x = Math.sin(t * 0.15) * 0.1;
    }
    if (sphereRef.current) {
      sphereRef.current.position.y = Math.sin(t * 1.2) * 0.05;
    }
  });

  const normalizedGPA = Math.min(gpa / 4.0, 1);
  const color = gpa >= 3.0 ? COLORS.success : gpa >= 2.0 ? COLORS.warning : COLORS.danger;

  return (
    <>
      <ambientLight intensity={1.2} />
      <pointLight position={[5, 5, 5]} intensity={1.5} />
      <mesh ref={ringRef}>
        <torusGeometry args={[1.4, 0.05, 16, 80]} />
        <meshBasicMaterial color={COLORS.shadow} transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.08, 16, 80, Math.PI * 2 * normalizedGPA]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial color={COLORS.primary} roughness={0.2} metalness={0.1} />
      </mesh>
    </>
  );
}

const AcademicScreen = () => {
  const [greeting, setGreeting] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const isFocused = useIsFocused();

  const {
    modules,
    gpa,
    totalCredits,
    analytics,
    insights,
    fetchModules,
    fetchAnalytics,
    fetchInsights,
    deleteModule,
  } = useAcademicStore();

  useEffect(() => {
    loadData();
    updateGreeting();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchModules(), fetchAnalytics(), fetchInsights()]);
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const openModal = (type, module = null) => {
    setSelectedModule(module);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedModule(null);
  };

  const handleDeleteModule = (id, moduleName) => {
    Alert.alert('Remove Module', `Delete "${moduleName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteModule(id);
          await Promise.all([fetchAnalytics(), fetchInsights()]);
        },
      },
    ]);
  };

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textMuted;
  const completionRate = insights?.completionRate || 0;
  const atRiskModules = analytics?.atRiskModules || [];

  // Empty State with 3D
  if (modules.length === 0) {
    return (
      <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
          <View style={styles.emptyCanvas}>
            {isFocused && (
              <Canvas dpr={1} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 5], fov: 45 }}>
                <GPARingObject gpa={0} />
              </Canvas>
            )}
          </View>
          <View style={styles.emptyIcon}>
            <GraduationCap size={40} color={COLORS.primary} />
          </View>
          <Animated.View entering={FadeInUp.delay(400)}>
            <Text style={styles.emptyTitle}>No Modules Yet</Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(500)}>
            <Text style={styles.emptySubtitle}>
              Add your first module to start tracking{'\n'}your academic performance
            </Text>
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(600)}>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => openModal('module')} activeOpacity={0.8}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.emptyBtnGrad}>
                <Plus size={20} color={COLORS.white} />
                <Text style={styles.emptyBtnText}>Add Module</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
        <ModuleModal visible={activeModal === 'module'} module={selectedModule} onClose={closeModal} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtitle}>{modules.length} active modules</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal('module')} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.addBtnGrad}>
            <Plus size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'GPA', value: gpa.toFixed(2), icon: Star, color: COLORS.primary },
            { label: 'Modules', value: modules.length, icon: BookOpen, color: COLORS.textSecondary },
            { label: 'Done', value: `${completionRate}%`, icon: CheckCircle2, color: COLORS.success },
            { label: 'Risk', value: atRiskModules.length, icon: AlertTriangle, color: atRiskModules.length > 0 ? COLORS.danger : COLORS.textMuted },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <stat.icon size={16} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* GPA Card with 3D Ring */}
        <View style={styles.gpaCard}>
          <View style={styles.gpaCardTop}>
            <Text style={styles.gpaCardTitle}>GPA Overview</Text>
            <TouchableOpacity style={styles.detailsBtn} onPress={() => openModal('gpa')}>
              <Text style={styles.detailsBtnText}>Details</Text>
              <ChevronRight size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.gpaRow}>
            <View style={styles.gpaRingWrap}>
              <View style={styles.gpaCanvas}>
                {isFocused && (
                  <Canvas dpr={1} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 5], fov: 45 }}>
                    <GPARingObject gpa={gpa} />
                  </Canvas>
                )}
              </View>
              <Text style={styles.gpaValue}>{gpa.toFixed(2)}</Text>
              <Text style={styles.gpaMax}>/ 4.0</Text>
            </View>
            <View style={styles.gpaInfo}>
              <View style={styles.gpaInfoItem}>
                <Text style={styles.gpaInfoLabel}>Credits</Text>
                <Text style={styles.gpaInfoValue}>{totalCredits}</Text>
              </View>
              <View style={styles.gpaInfoItem}>
                <Text style={styles.gpaInfoLabel}>Predicted</Text>
                <Text style={styles.gpaInfoValue}>{analytics?.predictedGPA?.toFixed(2) || gpa.toFixed(2)}</Text>
              </View>
              <View style={styles.gpaInfoItem}>
                <Text style={styles.gpaInfoLabel}>Trend</Text>
                {gpa >= 3.0 ? (
                  <TrendingUp size={16} color={COLORS.success} />
                ) : (
                  <TrendingDown size={16} color={COLORS.danger} />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Module List */}
        <View style={styles.moduleCard}>
          <Text style={styles.moduleCardTitle}>Modules</Text>
          {modules.map((module, i) => {
            const done = (module.assignments || []).filter(a => a.status === 'completed').length;
            const total = (module.assignments || []).length;
            const pct = total > 0 ? (done / total) * 100 : 0;

            return (
              <View key={module.id} style={[styles.moduleItem, i === modules.length - 1 && styles.moduleItemLast]}>
                <View style={styles.moduleTop}>
                  <TouchableOpacity onPress={() => openModal('marks', module)} style={styles.moduleLeft} activeOpacity={0.7}>
                    <View style={[styles.moduleDot, { backgroundColor: module.color }]} />
                    <View>
                      <Text style={styles.moduleName}>{module.moduleName}</Text>
                      <Text style={styles.moduleCode}>{module.moduleCode} • {module.credits} credits</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.moduleActions}>
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(module.currentGrade) + '18' }]}>
                      <Text style={[styles.gradeBadgeText, { color: getGradeColor(module.currentGrade) }]}>
                        {module.currentGrade || 'N/A'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteModule(module.id, module.moduleName)} hitSlop={8}>
                      <Trash2 size={14} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
                {total > 0 && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: module.color }]} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <ModuleModal visible={activeModal === 'module'} module={selectedModule} onClose={closeModal} />
      <GPADetailsModal visible={activeModal === 'gpa'} onClose={closeModal} />
      <MarksModal visible={activeModal === 'marks'} module={selectedModule} onClose={closeModal} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCanvas: {
    width: 160,
    height: 160,
    marginBottom: -20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  emptyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  emptyBtnText: {
    fontSize: 16,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 14,
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnGrad: {
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    alignItems: 'center',
    gap: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // GPA Card
  gpaCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    padding: 18,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  gpaCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  gpaCardTitle: {
    fontSize: 15,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 10,
  },
  detailsBtnText: {
    fontSize: 11,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.primary,
  },
  gpaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gpaRingWrap: {
    alignItems: 'center',
  },
  gpaCanvas: {
    width: 100,
    height: 100,
    marginBottom: -28,
  },
  gpaValue: {
    fontSize: 26,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },
  gpaMax: {
    fontSize: 11,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textMuted,
    marginTop: -2,
  },
  gpaInfo: {
    flex: 1,
    gap: 10,
  },
  gpaInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpaInfoLabel: {
    fontSize: 12,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textSecondary,
  },
  gpaInfoValue: {
    fontSize: 14,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },

  // Module Card
  moduleCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    padding: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  moduleCardTitle: {
    fontSize: 15,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
    marginBottom: 14,
  },
  moduleItem: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  moduleItemLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  moduleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moduleName: {
    fontSize: 13,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },
  moduleCode: {
    fontSize: 11,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  moduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradeBadgeText: {
    fontSize: 11,
    fontFamily: 'JosefinSans-Bold',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginLeft: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});

export default AcademicScreen;