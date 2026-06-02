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
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
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
  ChevronRight,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import ModuleModal from './components/ModuleModal';
import AssessmentModal from './components/AssessmentModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  primary: '#475569',
  primaryDark: '#334155',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  accent: '#6366F1',
  white: '#FFFFFF',
  slate: '#1e293b',
};

const GRADE_COLORS = {
  'A+': '#059669', 'A': '#059669', 'A-': '#10B981',
  'B+': '#2563EB', 'B': '#2563EB', 'B-': '#3B82F6',
  'C+': '#D97706', 'C': '#D97706', 'C-': '#F59E0B',
  'D+': '#DC2626', 'D': '#DC2626', 'D-': '#EF4444',
  'F': '#DC2626',
};

// ============================================================
// 3D BOOK MODEL
// ============================================================
function BookModel() {
  const groupRef = useRef();
  const { scene } = useGLTF(require('./models/Book.glb'));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.5;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <>
      <ambientLight intensity={3.0} />
      <directionalLight position={[5, 5, 5]} intensity={2.0} />
      <directionalLight position={[-3, 2, -2]} intensity={1.0} color="#e2e8f0" />
      <pointLight position={[0, 3, 0]} intensity={1.5} color="#ffffff" />
      <group ref={groupRef} position={[0, 0, 0]}>
        <primitive object={scene} scale={0.015} />
      </group>
    </>
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

  if (modules.length === 0) {
    return (
      <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCanvas}>
            {isFocused && (
              <Canvas dpr={1} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 3], fov: 55 }} style={{ flex: 1 }}>
                <Suspense fallback={null}>
                  <BookModel />
                </Suspense>
              </Canvas>
            )}
          </View>
          <Text style={styles.emptyTitle}>Course Tracker</Text>
          <Text style={styles.emptySubtitle}>Add your first module to begin</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Courses</Text>
          <Text style={styles.headerSub}>{modules.length} modules tracked</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setSelectedModule(null); setShowModuleModal(true); }} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.addBtnGrad}>
            <Plus size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 3D Book Model at the top */}
        <View style={styles.canvasContainer}>
          {isFocused && (
            <Canvas dpr={1} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 3], fov: 55 }} style={{ flex: 1 }}>
              <Suspense fallback={null}>
                <BookModel />
              </Suspense>
            </Canvas>
          )}
        </View>

        {/* Module Cards */}
        {modules.map((module, index) => {
          const done = (module.assignments || []).filter(a => a.status === 'completed').length;
          const total = (module.assignments || []).length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const assessments = (module.assessments || []).length;

          return (
            <Animated.View key={module.id} entering={FadeInUp.delay(index * 80)} style={styles.card}>
              {/* Module Identity */}
              <View style={styles.cardIdentity}>
                <LinearGradient colors={[module.color, module.color + '60']} style={styles.cardBadge}>
                  <BookOpen size={20} color={COLORS.white} />
                </LinearGradient>
                <View style={styles.cardIdentityText}>
                  <Text style={styles.moduleName}>{module.moduleName}</Text>
                  <Text style={styles.moduleCode}>{module.moduleCode}</Text>
                </View>
                <View style={[styles.gradeIndicator, { backgroundColor: getGradeColor(module.currentGrade) }]}>
                  <Text style={styles.gradeIndicatorText}>{module.currentGrade || '?'}</Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsInline}>
                {[
                  { value: module.credits, label: 'credits' },
                  { value: total, label: 'tasks' },
                  { value: `${pct}%`, label: 'complete', color: pct >= 80 ? COLORS.success : pct >= 40 ? COLORS.warning : COLORS.danger },
                  { value: assessments, label: 'exams' },
                ].map((stat, i) => (
                  <React.Fragment key={i}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, stat.color && { color: stat.color }]}>{stat.value}</Text>
                      <Text style={styles.statUnit}>{stat.label}</Text>
                    </View>
                    {i < 3 && <View style={styles.statDivider} />}
                  </React.Fragment>
                ))}
              </View>

              {/* Progress */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: module.color }]} />
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionChip} onPress={() => { setSelectedModule(module); setShowModuleModal(true); }}>
                  <Edit3 size={12} color={COLORS.primary} />
                  <Text style={styles.actionChipText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionChip} onPress={() => { setSelectedModule(module); setSelectedAssessment(null); setShowAssessmentModal(true); }}>
                  <Calendar size={12} color={COLORS.accent} />
                  <Text style={[styles.actionChipText, { color: COLORS.accent }]}>Add Exam</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionChip, { backgroundColor: COLORS.danger + '08' }]} onPress={() => {
                  Alert.alert('Delete', `Remove "${module.moduleName}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteModule(module.id); await loadData(); } },
                  ]);
                }}>
                  <Trash2 size={12} color={COLORS.danger} />
                  <Text style={[styles.actionChipText, { color: COLORS.danger }]}>Delete</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16 },
  headerTitle: { fontSize: 32, fontFamily: 'JosefinSans-Bold', color: COLORS.text, letterSpacing: -1 },
  headerSub: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginTop: 3 },
  addBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  addBtnGrad: { width: 42, height: 42, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyCanvas: { width: 180, height: 180, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginBottom: 28 },
  emptyBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 16 },
  emptyBtnText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white },

  // 3D Canvas at top
  canvasContainer: { 
    height: 180, 
    borderRadius: 24, 
    overflow: 'hidden', 
    marginBottom: 16,
    backgroundColor: COLORS.slate,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  cardBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIdentityText: { flex: 1 },
  moduleName: { fontSize: 17, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 3 },
  moduleCode: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  gradeIndicator: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  gradeIndicatorText: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.white },

  // Stats
  statsInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 2 },
  statUnit: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.bgMid },

  // Progress
  progressTrack: { height: 6, backgroundColor: COLORS.bgMid, borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 3 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 8 },
  actionChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 12, backgroundColor: COLORS.surfaceAlt },
  actionChipText: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },
});

export default CourseDetailsScreen;