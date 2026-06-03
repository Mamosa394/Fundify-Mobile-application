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
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Zap,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  BookOpen
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import GradeSimulationModal from './components/GradeSimulationModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

//  SIZE MODEL
const MODEL_CONFIG = {
  scale: 20,               
  position: [0, -30.2, 0],     
  cameraPos: [0, 0.8, 3.2],   
  cameraFov: 30,             
};

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
  slateDark: '#0f172a',
};

const GRADE_VALUES = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
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
      // Subtle rotation around the center axis
      groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.1;
      // Hovering movement applied safely relative to your configured base position
      groupRef.current.position.y = MODEL_CONFIG.position[1] + (Math.sin(t * 0.4) * 0.04);
    }
  });

  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 10, 5]} intensity={2.5} castShadow />
      <pointLight position={[-4, 4, -2]} intensity={1.5} color={COLORS.accent} />
      <group ref={groupRef} position={MODEL_CONFIG.position}>
        <primitive object={scene} scale={MODEL_CONFIG.scale} />
      </group>
    </>
  );
}

function GPARing({ gpa, targetGPA, size = 180 }) {
  const strokeWidth = 14; 
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = radius * 2 * Math.PI;
  
  const gpaProgress = Math.min(gpa / 4.0, 1);
  const targetProgress = targetGPA / 4.0;
  const gpaOffset = circumference - (gpaProgress * circumference);
  const ringColor = gpa >= 3.5 ? COLORS.success : gpa >= 3.0 ? COLORS.primary : gpa >= 2.0 ? COLORS.warning : COLORS.danger;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <SvgCircle cx={center} cy={center} r={radius} stroke={COLORS.surfaceAlt} strokeWidth={strokeWidth} fill="transparent" />
        <SvgCircle
          cx={center} cy={center} r={radius} stroke={ringColor} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={gpaOffset} strokeLinecap="round" rotation="-90" origin={`${center}, ${center}`}
        />
        <SvgCircle
          cx={center + radius * Math.cos(((targetProgress * 360) - 90) * Math.PI / 180)}
          cy={center + radius * Math.sin(((targetProgress * 360) - 90) * Math.PI / 180)}
          r={7} fill={COLORS.accent} stroke={COLORS.white} strokeWidth={2.5}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 44, fontFamily: 'JosefinSans-Bold', color: COLORS.text }}>{gpa.toFixed(2)}</Text>
        <Text style={{ fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted }}>GPA</Text>
      </View>
    </View>
  );
}

function ComparisonBar({ current, target, label }) {
  const percent = Math.min((current / Math.max(target, 0.1)) * 100, 100);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.text }}>
          {current.toFixed(1)} / {target.toFixed(1)}
        </Text>
      </View>
      <View style={{ height: 10, backgroundColor: COLORS.surfaceAlt, borderRadius: 5, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percent}%`, borderRadius: 5, backgroundColor: percent >= 100 ? COLORS.success : COLORS.primary }} />
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
  const getGradeValue = (grade) => GRADE_VALUES[grade] || 0.0;

  const atRiskModules = analytics?.atRiskModules || [];
  const totalModules = modules.length;
  const targetGPA = 3.5;
  const predictedGPA = analytics?.predictedGPA || gpa;
  const completionRate = analytics?.completionRate || 0;

  const handleSimulationComplete = (result) => {
    setShowSimulation(false);
    Alert.alert('Simulation', `Current: ${result.currentGPA.toFixed(2)}\nSimulated: ${result.simulatedGPA.toFixed(2)}`);
  };

  const getGpaBoosterInsights = () => {
    if (!modules || modules.length === 0) return [];
    const safeCredits = Math.max(totalCredits, 1);
    
    return modules
      .filter(m => m.currentGrade && getGradeValue(m.currentGrade) < 4.0)
      .map(m => {
        const currentVal = getGradeValue(m.currentGrade);
        const weight = (m.credits || 0) / safeCredits;
        const potentialLift = (0.3 * weight).toFixed(3); 
        return {
          ...m,
          lift: parseFloat(potentialLift),
          targetGrade: currentVal >= 3.7 ? 'A+' : currentVal >= 3.3 ? 'A' : currentVal >= 3.0 ? 'A-' : 'B+',
        };
      })
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 2);
  };

  const boosterInsights = getGpaBoosterInsights();

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GPA Tracker</Text>
        <Text style={styles.headerSub}>{totalModules} active modules</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HERO HEADER: Fixed Sizing & Centralized Constraints */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.deskContainer}>
          <LinearGradient colors={[COLORS.slate, COLORS.slateDark]} style={StyleSheet.absoluteFill} />
          {isFocused && (
            <Canvas 
              dpr={[1, 2]} 
              gl={{ antialias: true, alpha: true }} 
              camera={{ position: MODEL_CONFIG.cameraPos, fov: MODEL_CONFIG.cameraFov }} 
              style={{ flex: 1 }}
            >
              <Suspense fallback={null}>
                <DeskModel />
              </Suspense>
            </Canvas>
          )}
          <View style={styles.glassOverlay}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
            <Text style={styles.deskLabel}>WORKSPACE VIRTUAL ENVIRONMENT</Text>
          </View>
        </Animated.View>

        {/* GPA Ring Metric Display */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.ringCard}>
          <View style={styles.ringContainer}>
            <GPARing gpa={gpa} targetGPA={targetGPA} size={190} />
          </View>
          <View style={styles.ringStats}>
            <View style={styles.ringStatItem}>
              <View style={[styles.ringStatDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.ringStatLabel}>Current Score</Text>
            </View>
            <View style={styles.ringStatItem}>
              <View style={[styles.ringStatDot, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.ringStatLabel}>Target Horizon ({targetGPA.toFixed(2)})</Text>
            </View>
          </View>
        </Animated.View>

        {/* GPA BOOSTER INSIGHTS ENGINE */}
        {boosterInsights.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.boosterCard}>
            <View style={styles.boosterHeader}>
              <TrendingUp size={18} color={COLORS.accent} />
              <Text style={styles.boosterTitle}>GPA Booster Recommendations</Text>
            </View>
            <Text style={styles.boosterSubtitle}>Highest leverage targets to maximize your current term performance:</Text>
            {boosterInsights.map((insight, idx) => (
              <View key={insight.id || idx} style={styles.boosterItem}>
                <View style={styles.boosterIconContainer}>
                  <BookOpen size={14} color={COLORS.primaryDark} />
                </View>
                <View style={styles.boosterTextContainer}>
                  <Text style={styles.boosterItemText}>
                    Push <Text style={styles.boldText}>{insight.moduleName}</Text> from {insight.currentGrade || '?'} to <Text style={[styles.boldText, {color: COLORS.success}]}>{insight.targetGrade}</Text>
                  </Text>
                  <Text style={styles.boosterItemSub}>
                    High structural weight ({insight.credits} credits) • Adds <Text style={{fontFamily: 'JosefinSans-Bold'}}>+{insight.lift.toFixed(3)}</Text> directly to total GPA
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Progress Comparisons */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.card}>
          <Text style={styles.cardTitle}>Progress Breakdown</Text>
          <ComparisonBar current={gpa} target={targetGPA} label="GPA Progress" />
          <ComparisonBar current={completionRate} target={100} label="Assignment Completion (%)" />
          <ComparisonBar current={predictedGPA} target={targetGPA} label="Predicted vs Target GPA" />
        </Animated.View>

        {/* Module GPA Impact */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Module Impact</Text>
          {modules.map((mod, i) => {
            const safeCredits = Math.max(totalCredits, 1);
            const impactPoints = ((getGradeValue(mod.currentGrade) * (mod.credits || 0)) / safeCredits).toFixed(2);
            
            return (
              <View key={mod.id} style={[styles.impactItem, i < modules.length - 1 && styles.impactBorder]}>
                <View style={[styles.impactDot, { backgroundColor: mod.color || COLORS.primary }]} />
                <View style={styles.impactInfo}>
                  <Text style={styles.impactName}>{mod.moduleName}</Text>
                  <Text style={styles.impactCredits}>
                    {mod.credits} credits · Adds {impactPoints} to GPA
                  </Text>
                </View>
                <View style={styles.impactGrade}>
                  <Text style={[styles.impactGradeText, { color: getGradeColor(mod.currentGrade) }]}>
                    {mod.currentGrade || '?'}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* At Risk Alert Matrix */}
        {atRiskModules.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.riskCard}>
            <View style={styles.riskHeader}>
              <AlertTriangle size={18} color={COLORS.danger} />
              <Text style={styles.riskTitle}>At Risk Modules</Text>
            </View>
            {atRiskModules.map((m, i) => (
              <View key={m.id || i} style={styles.riskModuleRow}>
                <Text style={styles.riskModuleText}>{m.moduleName}</Text>
                <Text style={styles.riskModuleGrade}>{m.currentGrade}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* What-If Simulation Trigger */}
        <Animated.View entering={FadeInDown.duration(400).delay(600)}>
          <TouchableOpacity style={styles.simBtn} onPress={() => setShowSimulation(true)} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.simGrad} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
              <Zap size={20} color={COLORS.white} />
              <Text style={styles.simText}>What-If Simulation</Text>
              <ChevronRight size={20} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <GradeSimulationModal visible={showSimulation} onClose={() => setShowSimulation(false)} onSimulate={handleSimulationComplete} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16 },
  headerTitle: { fontSize: 34, fontFamily: 'JosefinSans-Bold', color: COLORS.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  // Hero Area Box Frame
  deskContainer: { height: 240, borderRadius: 28, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 5 },
  glassOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 46, justifyContent: 'center', paddingHorizontal: 20, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  deskLabel: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.white, opacity: 0.9, zIndex: 1, letterSpacing: 1 },

  // Cards layout
  ringCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  ringContainer: { marginBottom: 16 },
  ringStats: { flexDirection: 'row', gap: 28 },
  ringStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ringStatDot: { width: 10, height: 10, borderRadius: 5 },
  ringStatLabel: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },

  // Booster engine card
  boosterCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(99, 102, 241, 0.15)', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2 },
  boosterHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  boosterTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.accent },
  boosterSubtitle: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginBottom: 14, lineHeight: 18 },
  boosterItem: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.surfaceAlt, padding: 12, borderRadius: 14, marginBottom: 10 },
  boosterIconContainer: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
  boosterTextContainer: { flex: 1 },
  boosterItemText: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text, lineHeight: 18 },
  boosterItemSub: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginTop: 2 },
  boldText: { fontFamily: 'JosefinSans-Bold' },

  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  cardTitle: { fontSize: 18, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 18 },

  impactItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  impactBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  impactDot: { width: 10, height: 10, borderRadius: 5 },
  impactInfo: { flex: 1 },
  impactName: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 4 },
  impactCredits: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  impactGrade: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.surfaceAlt },
  impactGradeText: { fontSize: 14, fontFamily: 'JosefinSans-Bold' },

  riskCard: { backgroundColor: '#FEF2F2', borderRadius: 20, padding: 18, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: 'white', shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  riskTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.danger },
  riskModuleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  riskModuleText: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  riskModuleGrade: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.danger },

  simBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 16, shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  simGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  simText: { fontSize: 17, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
});

export default GPATrackerScreen;