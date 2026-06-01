// src/screens/AcademicPlanner/components/GPADetailsModal.js

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';
import useAcademicStore from '../../../store/academicStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PADDING = 20;

const COLORS = {
  bg: '#F8FAFC',
  surfaceGlass: 'rgba(255, 255, 255, 0.92)',
  surfaceGlassBorder: 'rgba(255, 255, 255, 0.95)',
  primary: '#475569',
  primaryDark: '#334155',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#CBD5E1',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
};

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#34D399',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#60A5FA',
  'C+': '#F59E0B', 'C': '#F59E0B', 'C-': '#FBBF24',
  'D+': '#EF4444', 'D': '#EF4444', 'D-': '#F87171',
  'F': '#DC2626',
};

const GPADetailsModal = ({ visible, onClose }) => {
  const { modules, gpa, totalCredits, analytics, fetchAnalytics } = useAcademicStore();

  console.log('[GPADetailsModal] visible prop:', visible);

  useEffect(() => {
    if (visible) {
      console.log('[GPADetailsModal] Modal opened, fetching analytics...');
      fetchAnalytics();
    }
  }, [visible]);

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textSecondary;
  const pointsNeeded = Math.max(0, (3.5 * totalCredits - (gpa * totalCredits)).toFixed(1));
  const targetGPA = 3.5;

  const gradeDistribution = analytics?.gradeDistribution || {};
  const requiredGrades = analytics?.requiredGrades || {};

  const handleClose = () => {
    console.log('[GPADetailsModal] Closing modal');
    onClose();
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide" 
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>GPA Details</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* GPA Status Badge */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: gpa >= 3.5 ? COLORS.success + '15' : gpa >= 3.0 ? COLORS.primary + '15' : COLORS.warning + '15' }]}>
                <Text style={[styles.statusText, { color: gpa >= 3.5 ? COLORS.success : gpa >= 3.0 ? COLORS.primary : COLORS.warning }]}>
                  {gpa >= 3.5 ? 'Excellent Standing' : gpa >= 3.0 ? 'Good Standing' : 'Needs Improvement'}
                </Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.grid}>
              <View style={styles.gridCard}>
                <Text style={styles.gridValue}>{gpa.toFixed(2)}</Text>
                <Text style={styles.gridLabel}>Current GPA</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={styles.gridValue}>{totalCredits}</Text>
                <Text style={styles.gridLabel}>Total Credits</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={styles.gridValue}>{targetGPA.toFixed(2)}</Text>
                <Text style={styles.gridLabel}>Target GPA</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={[styles.gridValue, { color: pointsNeeded > 0 ? COLORS.warning : COLORS.success }]}>
                  {pointsNeeded}
                </Text>
                <Text style={styles.gridLabel}>Points Needed</Text>
              </View>
            </View>

            {/* Required Grades */}
            {Object.keys(requiredGrades).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Required Grades for Target</Text>
                {modules.map((module) => {
                  const required = requiredGrades[module.id];
                  if (!required) return null;
                  return (
                    <View key={module.id} style={styles.gradeItem}>
                      <View style={[styles.dot, { backgroundColor: module.color }]} />
                      <View style={styles.gradeInfo}>
                        <Text style={styles.gradeModuleName}>{module.moduleName}</Text>
                        <Text style={styles.gradeModuleCode}>{module.moduleCode}</Text>
                      </View>
                      <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(required) + '18' }]}>
                        <Text style={[styles.gradeBadgeText, { color: getGradeColor(required) }]}>
                          {required}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Module Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Module Breakdown</Text>
              {modules.map((module) => (
                <View key={module.id} style={styles.gradeItem}>
                  <View style={[styles.dot, { backgroundColor: module.color }]} />
                  <View style={styles.gradeInfo}>
                    <Text style={styles.gradeModuleName}>{module.moduleName}</Text>
                    <Text style={styles.gradeModuleCode}>{module.moduleCode} • {module.credits} credits</Text>
                  </View>
                  <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(module.currentGrade) + '18' }]}>
                    <Text style={[styles.gradeBadgeText, { color: getGradeColor(module.currentGrade) }]}>
                      {module.currentGrade || 'N/A'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Grade Distribution */}
            {Object.keys(gradeDistribution).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Grade Distribution</Text>
                {Object.entries(gradeDistribution).map(([grade, count]) => (
                  <View key={grade} style={styles.distItem}>
                    <View style={styles.distHeader}>
                      <Text style={[styles.distGrade, { color: getGradeColor(grade) }]}>{grade}</Text>
                      <Text style={styles.distCount}>{count} module{count > 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.distBar}>
                      <View style={[
                        styles.distFill,
                        {
                          width: `${(count / Math.max(modules.length, 1)) * 100}%`,
                          backgroundColor: getGradeColor(grade),
                        },
                      ]} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    maxHeight: SCREEN_HEIGHT * 0.8,
    paddingHorizontal: PADDING,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handleBar: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 18,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 22, fontFamily: 'JosefinSans-Bold', color: COLORS.text,
  },
  closeButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder, justifyContent: 'center', alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  statusRow: {
    alignItems: 'center', marginBottom: 18,
  },
  statusBadge: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14,
  },
  statusText: {
    fontSize: 15, fontFamily: 'JosefinSans-Bold',
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18,
  },
  gridCard: {
    width: '47%',
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 16, padding: 16,
    borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder,
    alignItems: 'center', gap: 4,
  },
  gridValue: {
    fontSize: 26, fontFamily: 'JosefinSans-Bold', color: COLORS.text,
  },
  gridLabel: {
    fontSize: 11, color: COLORS.textSecondary, fontFamily: 'JosefinSans-Bold', letterSpacing: 0.5,
  },
  section: {
    marginTop: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 10,
  },
  gradeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  gradeInfo: { flex: 1 },
  gradeModuleName: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  gradeModuleCode: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'JosefinSans-SemiBold', marginTop: 1 },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  gradeBadgeText: { fontSize: 13, fontFamily: 'JosefinSans-Bold' },
  distItem: { marginBottom: 10 },
  distHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4,
  },
  distGrade: { fontSize: 12, fontFamily: 'JosefinSans-Bold' },
  distCount: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'JosefinSans-SemiBold' },
  distBar: {
    height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden',
  },
  distFill: { height: '100%', borderRadius: 3 },
});

export default GPADetailsModal;