// src/screens/Academics/ModuleGradesTableScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, FileText, ClipboardList, Calendar } from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bgStart: '#F8FAFC', bgMid: '#E2E8F0', bgEnd: '#CBD5E1',
  surface: '#FFFFFF', surfaceAlt: '#F1F5F9',
  primary: '#475569', primaryDark: '#334155',
  text: '#0F172A', textSecondary: '#64748B', textMuted: '#94A3B8',
  success: '#059669', warning: '#D97706', danger: '#DC2626',
  white: '#FFFFFF',
};

const GRADE_COLORS = {
  'A+': '#059669', 'A': '#059669', 'A-': '#10B981',
  'B+': '#2563EB', 'B': '#2563EB', 'B-': '#3B82F6',
  'C+': '#D97706', 'C': '#D97706',
  'PP': '#F59E0B', 'F': '#DC2626',
};

const GRADE_THRESHOLDS = [
  { min: 85, grade: 'A+', points: 4.0 },
  { min: 80, grade: 'A', points: 4.0 },
  { min: 75, grade: 'A-', points: 3.7 },
  { min: 70, grade: 'B+', points: 3.3 },
  { min: 65, grade: 'B', points: 3.0 },
  { min: 60, grade: 'B-', points: 2.7 },
  { min: 55, grade: 'C+', points: 2.3 },
  { min: 50, grade: 'C', points: 2.0 },
  { min: 45, grade: 'PP', points: 0.0 },
  { min: 0, grade: 'F', points: 0.0 },
];

const ModuleGradesTableScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const { modules, fetchModules, fetchAnalytics } = useAcademicStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchModules(), fetchAnalytics()]);
    setLoading(false);
  };

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textMuted;

  const getGradeValue = (grade) => {
    const values = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'PP': 0.0, 'F': 0.0 };
    return values[grade] || 0;
  };

  const getGradeFromPoints = (points) => {
    if (points >= 3.85) return 'A+';
    if (points >= 3.50) return 'A';
    if (points >= 3.15) return 'A-';
    if (points >= 2.85) return 'B+';
    if (points >= 2.50) return 'B';
    if (points >= 2.15) return 'B-';
    if (points >= 1.85) return 'C+';
    if (points >= 1.50) return 'C';
    return 'F';
  };

  // Calculate auto-grade from marks
  const calculateAutoGrade = (marksObtained, totalMarks) => {
    if (!marksObtained || !totalMarks || totalMarks === 0) return null;
    const percentage = (marksObtained / totalMarks) * 100;
    const threshold = GRADE_THRESHOLDS.find(t => percentage >= t.min);
    return threshold ? threshold.grade : 'F';
  };

  // Calculate weighted average from items (assignments + assessments)
  const calculateWeightedAverage = (items) => {
    if (!items || items.length === 0) return null;
    
    // Use gradeObtained if available, otherwise calculate from marks
    const graded = items.filter(item => {
      const grade = item.gradeObtained || calculateAutoGrade(item.marksObtained, item.totalMarks);
      return grade && grade !== 'PP' && grade !== 'F';
    });
    
    if (graded.length === 0) return null;
    
    const totalWeight = graded.reduce((sum, item) => sum + (item.weightPercentage || 0), 0);
    if (totalWeight === 0) return null;
    
    const weightedSum = graded.reduce((sum, item) => {
      const grade = item.gradeObtained || calculateAutoGrade(item.marksObtained, item.totalMarks);
      return sum + (getGradeValue(grade) * (item.weightPercentage || 0));
    }, 0);
    
    return (weightedSum / totalWeight).toFixed(1);
  };

  // Get display grade for an item
  const getDisplayGrade = (item) => {
    if (item.gradeObtained) return item.gradeObtained;
    if (item.marksObtained && item.totalMarks) {
      return calculateAutoGrade(item.marksObtained, item.totalMarks) || '-';
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Module Grades</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {modules.map((mod) => {
          const assessments = mod.assessments || [];
          const assignments = mod.assignments || [];
          
          // Combine all items for overall average
          const allItems = [...assignments, ...assessments];
          const overallAvg = calculateWeightedAverage(allItems);
          
          return (
            <View key={mod.id} style={styles.moduleCard}>
              {/* Module Header */}
              <View style={styles.moduleHeader}>
                <View style={[styles.moduleDot, { backgroundColor: mod.color }]} />
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleName}>{mod.moduleName}</Text>
                  <Text style={styles.moduleCode}>{mod.moduleCode} • {mod.credits} credits</Text>
                </View>
                <View style={styles.moduleGrade}>
                  <Text style={styles.moduleGradeLabel}>Grade</Text>
                  <Text style={[styles.moduleGradeValue, { color: getGradeColor(mod.currentGrade) }]}>{mod.currentGrade || 'N/A'}</Text>
                </View>
                {overallAvg && (
                  <View style={styles.moduleAvg}>
                    <Text style={styles.moduleAvgLabel}>Avg</Text>
                    <Text style={styles.moduleAvgValue}>{overallAvg}</Text>
                  </View>
                )}
              </View>

              {/* ============================================ */}
              {/* ASSIGNMENTS TABLE */}
              {/* ============================================ */}
              <View style={styles.sectionHeader}>
                <ClipboardList size={14} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Assignments</Text>
                <Text style={styles.sectionCount}>{assignments.length}</Text>
              </View>

              {assignments.length === 0 ? (
                <View style={styles.emptyRow}>
                  <FileText size={14} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No assignments recorded</Text>
                </View>
              ) : (
                <>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colName]}>Title</Text>
                    <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
                    <Text style={[styles.tableHeaderText, styles.colMarks]}>Marks</Text>
                    <Text style={[styles.tableHeaderText, styles.colWeight]}>Wt%</Text>
                    <Text style={[styles.tableHeaderText, styles.colGrade]}>Grade</Text>
                  </View>
                  {assignments.map((a, i) => {
                    const displayGrade = getDisplayGrade(a);
                    return (
                      <View key={a.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                        <Text style={[styles.tableCell, styles.colName]} numberOfLines={1}>{a.title || 'Untitled'}</Text>
                        <View style={[styles.tableCell, styles.colStatus]}>
                          <View style={[styles.statusDot, { backgroundColor: a.status === 'completed' ? COLORS.success : a.status === 'overdue' ? COLORS.danger : COLORS.warning }]} />
                          <Text style={styles.statusText}>{a.status || 'pending'}</Text>
                        </View>
                        <Text style={[styles.tableCell, styles.colMarks]}>
                          {a.marksObtained != null ? `${a.marksObtained}/${a.totalMarks || 100}` : '-'}
                        </Text>
                        <Text style={[styles.tableCell, styles.colWeight]}>{a.weightPercentage || 0}%</Text>
                        <View style={[styles.tableCell, styles.colGrade]}>
                          {displayGrade ? (
                            <View style={[styles.miniBadge, { backgroundColor: getGradeColor(displayGrade) + '20' }]}>
                              <Text style={[styles.miniBadgeText, { color: getGradeColor(displayGrade) }]}>{displayGrade}</Text>
                            </View>
                          ) : (
                            <Text style={styles.pendingText}>-</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              {/* ============================================ */}
              {/* ASSESSMENTS (EXAMS) TABLE */}
              {/* ============================================ */}
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Calendar size={14} color={COLORS.accent} />
                <Text style={[styles.sectionTitle, { color: COLORS.accent }]}>Assessments</Text>
                <Text style={styles.sectionCount}>{assessments.length}</Text>
              </View>

              {assessments.length === 0 ? (
                <View style={styles.emptyRow}>
                  <FileText size={14} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No assessments recorded</Text>
                </View>
              ) : (
                <>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colName]}>Title</Text>
                    <Text style={[styles.tableHeaderText, styles.colType]}>Type</Text>
                    <Text style={[styles.tableHeaderText, styles.colMarks]}>Marks</Text>
                    <Text style={[styles.tableHeaderText, styles.colWeight]}>Wt%</Text>
                    <Text style={[styles.tableHeaderText, styles.colGrade]}>Grade</Text>
                  </View>
                  {assessments.map((a, i) => {
                    const displayGrade = getDisplayGrade(a);
                    return (
                      <View key={a.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                        <Text style={[styles.tableCell, styles.colName]} numberOfLines={1}>{a.title || 'Untitled'}</Text>
                        <Text style={[styles.tableCell, styles.colType]}>{a.type || 'exam'}</Text>
                        <Text style={[styles.tableCell, styles.colMarks]}>
                          {a.marksObtained != null ? `${a.marksObtained}/${a.totalMarks || 100}` : '-'}
                        </Text>
                        <Text style={[styles.tableCell, styles.colWeight]}>{a.weightPercentage || 0}%</Text>
                        <View style={[styles.tableCell, styles.colGrade]}>
                          {displayGrade ? (
                            <View style={[styles.miniBadge, { backgroundColor: getGradeColor(displayGrade) + '20' }]}>
                              <Text style={[styles.miniBadgeText, { color: getGradeColor(displayGrade) }]}>{displayGrade}</Text>
                            </View>
                          ) : (
                            <Text style={styles.pendingText}>-</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  moduleCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  moduleDot: { width: 8, height: 8, borderRadius: 4 },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  moduleCode: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginTop: 1 },
  moduleGrade: { alignItems: 'center' },
  moduleGradeLabel: { fontSize: 9, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase' },
  moduleGradeValue: { fontSize: 16, fontFamily: 'JosefinSans-Bold' },
  moduleAvg: { alignItems: 'center', marginLeft: 8 },
  moduleAvgLabel: { fontSize: 9, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase' },
  moduleAvgValue: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },
  sectionCount: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },

  tableHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30', marginBottom: 4 },
  tableHeaderText: { fontSize: 9, fontFamily: 'JosefinSans-Bold', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  tableRowAlt: { backgroundColor: COLORS.surfaceAlt, borderRadius: 6 },
  tableCell: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text, textAlign: 'center' },
  colName: { flex: 2.5, textAlign: 'left', paddingLeft: 4 },
  colStatus: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  colType: { flex: 1.2 },
  colMarks: { flex: 1.3 },
  colWeight: { flex: 0.8 },
  colGrade: { flex: 1.2, alignItems: 'center' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, textTransform: 'capitalize' },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontSize: 10, fontFamily: 'JosefinSans-Bold' },
  pendingText: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },

  emptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  emptyText: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
});

export default ModuleGradesTableScreen;