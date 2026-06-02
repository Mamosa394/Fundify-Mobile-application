// src/screens/Academics/CourseDetailsScreen.js

import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle as SvgCircle, Line, Polyline, Text as SvgText, Path, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import {
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  Target,
  Award,
  FileText,
  Calendar,
  Flag,
  GraduationCap,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  Layers,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import ModuleModal from './components/ModuleModal';
import AssessmentModal from './components/AssessmentModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 16;

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
  border: '#CBD5E1',
  white: '#FFFFFF',
  accent: '#6366F1',
  amber: '#F59E0B',
  slate: '#1e293b',
};

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#34D399',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#60A5FA',
  'C+': '#F59E0B', 'C': '#F59E0B', 'C-': '#FBBF24',
  'D+': '#EF4444', 'D': '#EF4444', 'D-': '#F87171',
  'F': '#DC2626',
};

// ============================================================
// 3D BOOK MODEL WITH GLOW
// ============================================================
function BookModel() {
  const groupRef = useRef();
  const glowRef = useRef();
  const { scene } = useGLTF(require('./models/Book.glb'));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.5;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.12;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.06);
      glowRef.current.material.opacity = 0.15 + Math.sin(t * 2) * 0.05;
    }
  });

  return (
    <>
      <ambientLight intensity={2.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.8} />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#e2e8f0" />
      <pointLight position={[0, 3, 0]} intensity={1.5} color="#ffffff" />
      {/* Glow sphere behind the book */}
      <mesh ref={glowRef} position={[0, 0, -0.5]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#6366F1" transparent opacity={0.12} />
      </mesh>
      {/* Book */}
      <group ref={groupRef} position={[0, 0, 0]}>
        <primitive object={scene} scale={0.015} />
      </group>
    </>
  );
}

// ============================================================
// PROGRESS RING SVG
// ============================================================
function ProgressRing({ progress, size = 60, strokeWidth = 4, color = COLORS.primary }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <SvgCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={COLORS.border}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <SvgCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================
const CourseDetailsScreen = () => {
  const [selectedModule, setSelectedModule] = useState(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const isFocused = useIsFocused();

  const { modules, fetchModules, fetchAnalytics, fetchInsights, deleteModule } = useAcademicStore();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    await Promise.all([fetchModules(), fetchAnalytics(), fetchInsights()]);
  };

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textMuted;

  const handleEditModule = (module) => { setSelectedModule(module); setShowModuleModal(true); };
  const handleDeleteModule = (module) => {
    Alert.alert('Delete Module', `Delete "${module.moduleName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteModule(module.id); await loadData(); } },
    ]);
  };
  const handleAddAssessment = (module) => { setSelectedModule(module); setSelectedAssessment(null); setShowAssessmentModal(true); };

  if (modules.length === 0) {
    return (
      <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyGlow} />
          <View style={styles.emptyIcon}><GraduationCap size={48} color={COLORS.primary} /></View>
          <Text style={styles.emptyTitle}>Course Tracker</Text>
          <Text style={styles.emptySubtitle}>Add modules to visualize your academic journey with rich analytics</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => { setSelectedModule(null); setShowModuleModal(true); }} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.emptyBtnGrad}>
              <Plus size={20} color={COLORS.white} />
              <Text style={styles.emptyBtnText}>Add Module</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <ModuleModal visible={showModuleModal} module={selectedModule} onClose={() => { setShowModuleModal(false); loadData(); }} />
        <AssessmentModal visible={showAssessmentModal} module={selectedModule} assessment={selectedAssessment} onClose={() => { setShowAssessmentModal(false); loadData(); }} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.headerBadge}>
            <Layers size={10} color={COLORS.primary} />
            <Text style={styles.headerBadgeText}>{modules.length} Active</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setSelectedModule(null); setShowModuleModal(true); }} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.addBtnGrad}>
            <Plus size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 3D Book Hero */}
        <View style={styles.canvasContainer}>
          {isFocused && (
            <Canvas dpr={1} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 2.5], fov: 55 }} style={{ flex: 1 }}>
              <Suspense fallback={null}>
                <BookModel />
              </Suspense>
            </Canvas>
          )}
          <BlurView intensity={20} tint="dark" style={styles.canvasOverlay}>
            <BookOpen size={16} color={COLORS.white} />
            <Text style={styles.canvasOverlayText}>Course Overview</Text>
            <View style={styles.canvasDot} />
            <Text style={styles.canvasOverlayCount}>{modules.length} modules</Text>
          </BlurView>
        </View>

        {/* Module Cards */}
        {modules.map((module, index) => {
          const done = (module.assignments || []).filter(a => a.status === 'completed').length;
          const total = (module.assignments || []).length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const assessments = (module.assessments || []).length;

          return (
            <Animated.View key={module.id} entering={FadeInUp.delay(index * 100).springify()} style={styles.card}>
              {/* Card Header with Gradient Accent */}
              <View style={styles.cardAccent}>
                <LinearGradient colors={[module.color, module.color + '40']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accentBar} />
              </View>

              {/* Module Header */}
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <LinearGradient colors={[module.color, module.color + '60']} style={styles.moduleIcon}>
                    <BookOpen size={20} color={COLORS.white} />
                  </LinearGradient>
                  <View>
                    <Text style={styles.moduleName}>{module.moduleName}</Text>
                    <Text style={styles.moduleCode}>{module.moduleCode}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleEditModule(module)}>
                  <View style={[styles.gradePill, { backgroundColor: getGradeColor(module.currentGrade) + '15', borderColor: getGradeColor(module.currentGrade) + '30' }]}>
                    <Text style={[styles.gradePillText, { color: getGradeColor(module.currentGrade) }]}>{module.currentGrade || 'N/A'}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Stats Grid with Rings */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <ProgressRing progress={(module.credits / 20) * 100} size={44} strokeWidth={3} color={module.color} />
                  <View style={styles.statCardText}>
                    <Text style={styles.statValue}>{module.credits}</Text>
                    <Text style={styles.statLabel}>Credits</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <Target size={18} color={COLORS.accent} />
                  <View style={styles.statCardText}>
                    <Text style={styles.statValue}>{module.targetGrade}</Text>
                    <Text style={styles.statLabel}>Target</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <ProgressRing progress={pct} size={44} strokeWidth={3} color={COLORS.success} />
                  <View style={styles.statCardText}>
                    <Text style={styles.statValue}>{pct}%</Text>
                    <Text style={styles.statLabel}>Done</Text>
                  </View>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Assignment Progress</Text>
                  <Text style={styles.progressPercent}>{done}/{total}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: module.color }]} />
                </View>
              </View>

              {/* Assessments Section */}
              {assessments > 0 && (
                <View style={styles.assessmentsSection}>
                  <View style={styles.sectionHeader}>
                    <Calendar size={14} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Upcoming Assessments</Text>
                    <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{assessments}</Text></View>
                  </View>
                  {(module.assessments || []).slice(0, 3).map((a, idx) => (
                    <View key={a.id || idx} style={styles.assessmentItem}>
                      <View style={[styles.assessmentDot, { backgroundColor: a.priority === 'high' ? COLORS.danger : a.priority === 'medium' ? COLORS.warning : COLORS.success }]} />
                      <View style={styles.assessmentInfo}>
                        <Text style={styles.assessmentTitle} numberOfLines={1}>{a.title}</Text>
                        <Text style={styles.assessmentMeta}>{a.type} • {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                      </View>
                      <Flag size={12} color={a.priority === 'high' ? COLORS.danger : a.priority === 'medium' ? COLORS.warning : COLORS.success} />
                    </View>
                  ))}
                  {assessments > 3 && (
                    <TouchableOpacity onPress={() => handleAddAssessment(module)}>
                      <Text style={styles.viewMore}>+{assessments - 3} more assessments</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditModule(module)}>
                  <Edit3 size={14} color={COLORS.primary} />
                  <Text style={[styles.actionText, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.accent + '10' }]} onPress={() => handleAddAssessment(module)}>
                  <Plus size={14} color={COLORS.accent} />
                  <Text style={[styles.actionText, { color: COLORS.accent }]}>Exam</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger + '08' }]} onPress={() => handleDeleteModule(module)}>
                  <Trash2 size={14} color={COLORS.danger} />
                  <Text style={[styles.actionText, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      <ModuleModal visible={showModuleModal} module={selectedModule} onClose={() => { setShowModuleModal(false); loadData(); }} />
      <AssessmentModal visible={showAssessmentModal} module={selectedModule} assessment={selectedAssessment} onClose={() => { setShowAssessmentModal(false); loadData(); }} />
    </LinearGradient>
  );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: PADDING, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 10 },
  headerTitle: { fontSize: 26, fontFamily: 'JosefinSans-Bold', color: COLORS.text, letterSpacing: -0.5 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  headerBadgeText: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textSecondary },
  addBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 10, elevation: 4 },
  addBtnGrad: { width: 42, height: 42, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: PADDING, paddingBottom: 16 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: COLORS.accent + '10', top: '30%' },
  emptyIcon: { width: 96, height: 96, borderRadius: 28, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: COLORS.border, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 4 },
  emptyTitle: { fontSize: 22, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  emptyBtn: { borderRadius: 20, overflow: 'hidden', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 6 },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 16 },
  emptyBtnText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white },

  canvasContainer: { height: 170, borderRadius: 20, overflow: 'hidden', marginBottom: 16, backgroundColor: COLORS.slate, position: 'relative' },
  canvasOverlay: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, overflow: 'hidden' },
  canvasOverlayText: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.white, flex: 1 },
  canvasDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.success },
  canvasOverlayCount: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: 'rgba(255,255,255,0.8)' },

  card: { backgroundColor: COLORS.surfaceGlass, borderRadius: 20, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, marginBottom: 14, overflow: 'hidden', shadowColor: COLORS.border, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 3 },
  cardAccent: { height: 3 },
  accentBar: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 12 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  moduleIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  moduleName: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 2 },
  moduleCode: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  gradePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  gradePillText: { fontSize: 13, fontFamily: 'JosefinSans-Bold' },

  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: 12, padding: 10 },
  statCardText: { gap: 1 },
  statValue: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  statLabel: { fontSize: 9, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  progressSection: { paddingHorizontal: 16, marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressTitle: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.textSecondary },
  progressPercent: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  assessmentsSection: { paddingHorizontal: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  sectionBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sectionBadgeText: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },
  assessmentItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  assessmentDot: { width: 6, height: 6, borderRadius: 3 },
  assessmentInfo: { flex: 1 },
  assessmentTitle: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 1 },
  assessmentMeta: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, textTransform: 'capitalize' },
  viewMore: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.accent, marginTop: 8, textAlign: 'center' },

  actionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary + '06' },
  actionText: { fontSize: 12, fontFamily: 'JosefinSans-Bold' },
});

export default CourseDetailsScreen;