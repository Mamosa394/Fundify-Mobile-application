// src/screens/Academics/GPATrackerScreen.js

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
import Svg, { Circle as SvgCircle, Line, Polyline, Text as SvgText, Path, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  ChevronRight,
  AlertTriangle,
  BookOpen,
  Target,
  Award,
  Star,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import GradeSimulationModal from './components/GradeSimulationModal';

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

function DeskModel() {
  const groupRef = useRef();
  const { scene } = useGLTF(require('./models/Desk.glb'));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={3.0} />
      <directionalLight position={[5, 5, 5]} intensity={2.0} />
      <pointLight position={[0, 3, 0]} intensity={1.5} color="#ffffff" />
      <group ref={groupRef} position={[0, -0.2, 0]}>
        <primitive object={scene} scale={0.015} />
      </group>
    </>
  );
}

// GPA Ring Component
function GPARing({ gpa, targetGPA, size = 180 }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = radius * 2 * Math.PI;
  
  const gpaProgress = Math.min(gpa / 4.0, 1);
  const targetProgress = targetGPA / 4.0;
  
  const gpaOffset = circumference - (gpaProgress * circumference);
  const targetOffset = circumference - (targetProgress * circumference);

  const ringColor = gpa >= 3.5 ? COLORS.success : gpa >= 3.0 ? COLORS.primary : gpa >= 2.0 ? COLORS.warning : COLORS.danger;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <SvgCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={COLORS.surfaceAlt}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* GPA progress ring */}
        <SvgCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={gpaOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
        {/* Target marker */}
        <SvgCircle
          cx={center + radius * Math.cos(((targetProgress * 360) - 90) * Math.PI / 180)}
          cy={center + radius * Math.sin(((targetProgress * 360) - 90) * Math.PI / 180)}
          r={6}
          fill={COLORS.accent}
          stroke={COLORS.white}
          strokeWidth={2}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 40, fontFamily: 'JosefinSans-Bold', color: COLORS.text }}>{gpa.toFixed(2)}</Text>
        <Text style={{ fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted }}>GPA</Text>
      </View>
    </View>
  );
}

// Comparison Bar
function ComparisonBar({ current, target, label }) {
  const percent = Math.min((current / Math.max(target, 0.1)) * 100, 100);
  
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.text }}>
          {current.toFixed(1)} / {target.toFixed(1)}
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percent}%`, borderRadius: 4, backgroundColor: percent >= 100 ? COLORS.success : COLORS.primary }} />
      </View>
    </View>
  );
}

const GPATrackerScreen = () => {
  const [showSimulation, setShowSimulation] = useState(false);
  const isFocused = useIsFocused();

  const { modules, gpa, totalCredits, analytics, fetchModules, fetchAnalytics } = useAcademicStore();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => { await Promise.all([fetchModules(), fetchAnalytics()]); };

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textMuted;
  const atRiskModules = analytics?.atRiskModules || [];
  const totalModules = modules.length;
  const targetGPA = 3.5;
  const predictedGPA = analytics?.predictedGPA || gpa;
  const completionRate = analytics?.completionRate || 0;

  const handleSimulationComplete = (result) => {
    setShowSimulation(false);
    Alert.alert('Simulation', `Current: ${result.currentGPA.toFixed(2)}\nSimulated: ${result.simulatedGPA.toFixed(2)}`);
  };

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GPA Tracker</Text>
        <Text style={styles.headerSub}>{totalModules} modules</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* GPA Ring + 3D Desk behind */}
        <View style={styles.ringCard}>
          <View style={styles.ringContainer}>
            <GPARing gpa={gpa} targetGPA={targetGPA} size={180} />
          </View>
          <View style={styles.ringStats}>
            <View style={styles.ringStatItem}>
              <View style={[styles.ringStatDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.ringStatLabel}>Current</Text>
            </View>
            <View style={styles.ringStatItem}>
              <View style={[styles.ringStatDot, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.ringStatLabel}>Target {targetGPA.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Progress Comparisons */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress Comparison</Text>
          <ComparisonBar current={gpa} target={targetGPA} label="GPA Progress" />
          <ComparisonBar current={completionRate} target={100} label="Assignment Completion" />
          <ComparisonBar current={predictedGPA} target={targetGPA} label="Predicted vs Target" />
        </View>

        {/* Module GPA Impact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Module Impact</Text>
          {modules.map((mod, i) => {
            const contribution = ((mod.credits || 0) / Math.max(totalCredits, 1)) * 100;
            const impact = ((gpa - (getGradeColor(mod.currentGrade) === COLORS.danger ? gpa - 0.5 : gpa)) * contribution / 100).toFixed(2);
            
            return (
              <View key={mod.id} style={[styles.impactItem, i < modules.length - 1 && styles.impactBorder]}>
                <View style={[styles.impactDot, { backgroundColor: mod.color }]} />
                <View style={styles.impactInfo}>
                  <Text style={styles.impactName}>{mod.moduleName}</Text>
                  <Text style={styles.impactCredits}>{mod.credits} credits · {contribution.toFixed(0)}% weight</Text>
                </View>
                <View style={styles.impactGrade}>
                  <Text style={[styles.impactGradeText, { color: getGradeColor(mod.currentGrade) }]}>
                    {mod.currentGrade || '?'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 3D Desk */}
        <View style={styles.deskContainer}>
          {isFocused && (
            <Canvas dpr={1} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0.1, 3], fov: 55 }} style={{ flex: 1 }}>
              <Suspense fallback={null}>
                <DeskModel />
              </Suspense>
            </Canvas>
          )}
        </View>

        {/* At Risk */}
        {atRiskModules.length > 0 && (
          <View style={styles.riskCard}>
            <View style={styles.riskHeader}>
              <AlertTriangle size={16} color={COLORS.danger} />
              <Text style={styles.riskTitle}>At Risk Modules</Text>
            </View>
            {atRiskModules.map((m, i) => (
              <Text key={m.id || i} style={styles.riskModule}>
                {m.moduleName} — <Text style={{ color: COLORS.danger, fontFamily: 'JosefinSans-Bold' }}>{m.currentGrade}</Text>
              </Text>
            ))}
          </View>
        )}

        {/* Simulation */}
        <TouchableOpacity style={styles.simBtn} onPress={() => setShowSimulation(true)} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.simGrad}>
            <Zap size={18} color={COLORS.white} />
            <Text style={styles.simText}>What-If Simulation</Text>
            <ChevronRight size={16} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <GradeSimulationModal visible={showSimulation} onClose={() => setShowSimulation(false)} onSimulate={handleSimulationComplete} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 12 },
  headerTitle: { fontSize: 32, fontFamily: 'JosefinSans-Bold', color: COLORS.text, letterSpacing: -1 },
  headerSub: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginTop: 3 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // GPA Ring
  ringCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, marginBottom: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  ringContainer: { marginBottom: 16 },
  ringStats: { flexDirection: 'row', gap: 24 },
  ringStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ringStatDot: { width: 8, height: 8, borderRadius: 4 },
  ringStatLabel: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },

  // Card
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 16 },

  // Impact
  impactItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  impactBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  impactDot: { width: 8, height: 8, borderRadius: 4 },
  impactInfo: { flex: 1 },
  impactName: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 2 },
  impactCredits: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  impactGrade: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.surfaceAlt },
  impactGradeText: { fontSize: 13, fontFamily: 'JosefinSans-Bold' },

  // Desk
  deskContainer: { height: 160, borderRadius: 24, overflow: 'hidden', marginBottom: 14, backgroundColor: COLORS.slate },

  // Risk
  riskCard: { backgroundColor: COLORS.danger + '08', borderRadius: 16, padding: 16, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: COLORS.danger },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  riskTitle: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.danger },
  riskModule: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text, marginTop: 4 },

  // Sim
  simBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 14, shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  simGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  simText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
});

export default GPATrackerScreen;