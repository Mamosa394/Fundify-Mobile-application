// src/screens/Academics/AcademicScreen.js

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
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
import { useGLTF } from '@react-three/drei/native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle as SvgCircle, Line, Polyline, Text as SvgText, Path, G } from 'react-native-svg';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import {
  Plus,
  Trash2,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Target,
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

const CHART_COLORS = ['#475569', '#10B981', '#F59E0B', '#DC2626', '#3B82F6', '#8B5CF6'];

// ============================================================
// 3D BRAIN MODEL
// ============================================================
function BrainModel() {
  const meshRef = useRef();
  const { scene } = useGLTF(require('./models/Brain.glb'));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(t * 0.3) * 0.4;
    }
  });

  return (
    <>
      <ambientLight intensity={2} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <mesh ref={meshRef} position={[-1, -1.5, 0]}>
        <primitive object={scene} scale={0.015} />
      </mesh>
    </>
  );
}

// ============================================================
// PIE CHART
// ============================================================
function PieChart({ data, size = 120 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = size / 2;
  const center = size / 2;
  let startAngle = 0;

  const slices = data.map((item, i) => {
    const angle = (item.value / total) * 360;
    const endAngle = startAngle + angle;
    const x1 = center + radius * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = center + radius * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = center + radius * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = center + radius * Math.sin((endAngle - 90) * Math.PI / 180);
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { ...item, path, color: item.color || CHART_COLORS[i % CHART_COLORS.length] };
  });

  return (
    <Svg width={size} height={size}>
      {slices.map((slice, i) => (
        <Path key={i} d={slice.path} fill={slice.color} />
      ))}
      <SvgCircle cx={center} cy={center} r={radius * 0.5} fill="white" />
    </Svg>
  );
}

// ============================================================
// LINE CHART
// ============================================================
function LineChart({ data, width: chartWidth = SCREEN_WIDTH - 72, height = 100 }) {
  const p = 12;
  const w = chartWidth - p * 2;
  const h = height - p * 2;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const points = data.map((d, i) => {
    const x = p + (i / Math.max(data.length - 1, 1)) * w;
    const y = p + h - (d.value / maxVal) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={chartWidth} height={height}>
      <Line x1={p} y1={p + h} x2={p + w} y2={p + h} stroke={COLORS.shadow} strokeWidth={1} />
      <Line x1={p} y1={p} x2={p} y2={p + h} stroke={COLORS.shadow} strokeWidth={1} />
      {data.map((d, i) => {
        const x = p + (i / Math.max(data.length - 1, 1)) * w;
        const y = p + h - (d.value / maxVal) * h;
        return (
          <G key={i}>
            <SvgCircle cx={x} cy={y} r={3} fill={COLORS.primary} />
            <SvgText x={x} y={p + h + 14} fontSize={9} fill={COLORS.textMuted} textAnchor="middle">{d.label}</SvgText>
          </G>
        );
      })}
      <Polyline points={points} fill="none" stroke={COLORS.primary} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================
const AcademicScreen = () => {
  const [greeting, setGreeting] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const isFocused = useIsFocused();

  const {
    modules, gpa, totalCredits, analytics, insights,
    fetchModules, fetchAnalytics, fetchInsights, deleteModule,
  } = useAcademicStore();

  useEffect(() => { loadData(); updateGreeting(); }, []);

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
    setRefreshing(true); await loadData(); setRefreshing(false);
  }, []);

  const openModal = (type, module = null) => { setSelectedModule(module); setActiveModal(type); };
  const closeModal = () => { setActiveModal(null); setSelectedModule(null); };

  const handleDeleteModule = (id, name) => {
    Alert.alert('Remove', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteModule(id); await loadData(); } },
    ]);
  };

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textMuted;
  const completionRate = insights?.completionRate || 0;
  const atRiskModules = analytics?.atRiskModules || [];
  const totalAssignments = insights?.totalAssignments || 0;
  const completedAssignments = insights?.completedAssignments || 0;
  const gradeDistribution = analytics?.gradeDistribution || {};

  const pieData = Object.entries(gradeDistribution).map(([grade, count]) => ({
    label: grade, value: count, color: getGradeColor(grade),
  }));

  const lineData = [
    { label: 'W1', value: Math.max(0, gpa - 0.5) },
    { label: 'W2', value: Math.max(0, gpa - 0.3) },
    { label: 'W3', value: Math.max(0, gpa - 0.1) },
    { label: 'Now', value: gpa },
  ];

  if (modules.length === 0) {
    return (
      <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}><GraduationCap size={48} color={COLORS.primary} /></View>
          <Text style={styles.emptyTitle}>No Modules Yet</Text>
          <Text style={styles.emptySubtitle}>Add a module to unlock analytics</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => openModal('module')} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.emptyBtnGrad}>
              <Plus size={20} color={COLORS.white} />
              <Text style={styles.emptyBtnText}>Add Module</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <ModuleModal visible={activeModal === 'module'} module={selectedModule} onClose={closeModal} />
        <GPADetailsModal visible={activeModal === 'gpa'} onClose={closeModal} />
        <MarksModal visible={activeModal === 'marks'} module={selectedModule} onClose={closeModal} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtitle}>{modules.length} modules active</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal('module')} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.addBtnGrad}>
            <Plus size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 3D Brain Canvas */}
        <View style={styles.canvasContainer}>
          {isFocused && (
            <Canvas
              dpr={1}
              gl={{ antialias: true, alpha: true }}
              camera={{ position: [0, 0, 5], fov: 50 }}
              style={{ flex: 1 }}
            >
              <Suspense fallback={null}>
                <BrainModel />
              </Suspense>
            </Canvas>
          )}
          <View style={styles.gpaOverlay} pointerEvents="box-none">
            <Text style={styles.gpaBig}>{gpa.toFixed(2)}</Text>
            <Text style={styles.gpaLabel}>GPA</Text>
            <View style={styles.gpaTrendRow}>
              {gpa >= 3.0 ? (
                <TrendingUp size={12} color={COLORS.success} />
              ) : (
                <TrendingDown size={12} color={COLORS.danger} />
              )}
              <Text style={[styles.trendText, { color: gpa >= 3.0 ? COLORS.success : COLORS.danger }]}>
                {gpa >= 3.5 ? 'Excellent' : gpa >= 3.0 ? 'Good' : 'Review'}
              </Text>
            </View>
            <TouchableOpacity style={styles.detailBtn} onPress={() => openModal('gpa')}>
              <Text style={styles.detailBtnText}>Details</Text>
              <ChevronRight size={12} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Credits', value: totalCredits, icon: BookOpen, color: COLORS.primary },
            { label: 'Done', value: `${completionRate}%`, icon: CheckCircle2, color: COLORS.success },
            { label: 'At Risk', value: atRiskModules.length, icon: AlertTriangle, color: atRiskModules.length > 0 ? COLORS.danger : COLORS.textMuted },
          ].map((stat, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 80)} style={styles.statCard}>
              <stat.icon size={16} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* GPA Trend */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>GPA Trend</Text>
          </View>
          <LineChart data={lineData} />
        </View>

        {/* Grade Distribution */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Target size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Grade Distribution</Text>
          </View>
          {pieData.length > 0 ? (
            <View style={styles.pieRow}>
              <PieChart data={pieData} size={120} />
              <View style={styles.pieLegend}>
                {pieData.map((item, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                    <Text style={styles.legendValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.noData}>No grades yet</Text>
          )}
        </View>

        {/* Assignment Progress */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckCircle2 size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Assignment Progress</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
          </View>
          <Text style={styles.progressText}>{completedAssignments} of {totalAssignments} completed ({completionRate}%)</Text>
        </View>

        {/* Modules */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BookOpen size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Modules</Text>
          </View>
          {modules.map((mod, i) => (
            <Animated.View key={mod.id} entering={FadeInRight.delay(i * 50)}>
              <View style={[styles.moduleRow, i < modules.length - 1 && styles.moduleBorder]}>
                <View style={[styles.moduleDot, { backgroundColor: mod.color }]} />
                <TouchableOpacity onPress={() => openModal('marks', mod)} style={styles.moduleInfo}>
                  <Text style={styles.moduleName}>{mod.moduleName}</Text>
                  <Text style={styles.moduleCode}>{mod.moduleCode} • {mod.credits} cr</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openModal('marks', mod)}>
                  <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(mod.currentGrade) + '18' }]}>
                    <Text style={[styles.gradeBadgeText, { color: getGradeColor(mod.currentGrade) }]}>{mod.currentGrade || 'N/A'}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteModule(mod.id, mod.moduleName)} hitSlop={8}>
                  <Trash2 size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <ModuleModal visible={activeModal === 'module'} module={selectedModule} onClose={closeModal} />
      <GPADetailsModal visible={activeModal === 'gpa'} onClose={closeModal} />
      <MarksModal visible={activeModal === 'marks'} module={selectedModule} onClose={closeModal} />
    </LinearGradient>
  );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 96, height: 96, borderRadius: 28, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 4 },
  emptyTitle: { fontSize: 22, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginBottom: 28 },
  emptyBtn: { borderRadius: 20, overflow: 'hidden', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 6 },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 16 },
  emptyBtnText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 12 },
  greeting: { fontSize: 24, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  subtitle: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginTop: 2 },
  addBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 10, elevation: 4 },
  addBtnGrad: { width: 42, height: 42, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  canvasContainer: { height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 16, backgroundColor: '#1e293b', position: 'relative' },
  gpaOverlay: { position: 'absolute', top: 16, right: 16, alignItems: 'flex-end', zIndex: 10 },
  gpaBig: { fontSize: 36, fontFamily: 'JosefinSans-Bold', color: COLORS.white, lineHeight: 40 },
  gpaLabel: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  gpaTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  trendText: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  detailBtnText: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.white },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: COLORS.surfaceGlass, borderRadius: 16, padding: 14, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, alignItems: 'center', gap: 6, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 20, fontFamily: 'JosefinSans-Bold' },
  statLabel: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, letterSpacing: 0.5 },

  card: { backgroundColor: COLORS.surfaceGlass, borderRadius: 20, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, padding: 18, marginBottom: 14, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  noData: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'JosefinSans-SemiBold', textAlign: 'center', paddingVertical: 16 },

  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  pieLegend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },
  legendValue: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.text },

  progressBar: { height: 8, backgroundColor: COLORS.shadow, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.success },
  progressText: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },

  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  moduleBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.shadow },
  moduleDot: { width: 8, height: 8, borderRadius: 4 },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  moduleCode: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginTop: 1 },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  gradeBadgeText: { fontSize: 11, fontFamily: 'JosefinSans-Bold' },
});

export default AcademicScreen;