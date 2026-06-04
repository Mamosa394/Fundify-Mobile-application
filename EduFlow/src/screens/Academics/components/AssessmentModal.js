// src/screens/Academics/components/AssessmentModal.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Calendar, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react-native';
import useAcademicStore from '../../../store/academicStore';
import { sendGradeUpdateNotification } from '../../../services/notificationService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
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
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  accent: '#6366F1',
};

const GRADE_THRESHOLDS = [
  { min: 85, grade: 'A+', points: 4.0, label: 'Distinction' },
  { min: 80, grade: 'A', points: 4.0, label: 'Excellent' },
  { min: 75, grade: 'A-', points: 3.7, label: 'Excellent' },
  { min: 70, grade: 'B+', points: 3.3, label: 'Very Good' },
  { min: 65, grade: 'B', points: 3.0, label: 'Good' },
  { min: 60, grade: 'B-', points: 2.7, label: 'Good' },
  { min: 55, grade: 'C+', points: 2.3, label: 'Satisfactory' },
  { min: 50, grade: 'C', points: 2.0, label: 'Pass' },
  { min: 45, grade: 'PP', points: 0.0, label: 'Supplementary' },
  { min: 0, grade: 'F', points: 0.0, label: 'Fail' },
];

const GRADE_COLORS = {
  'A+': '#059669', 'A': '#059669', 'A-': '#10B981',
  'B+': '#2563EB', 'B': '#2563EB', 'B-': '#3B82F6',
  'C+': '#D97706', 'C': '#D97706',
  'PP': '#F59E0B', 'F': '#DC2626',
};

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

const calculateModuleGrade = (assessments) => {
  if (!assessments || assessments.length === 0) return null;
  const graded = assessments.filter(a => a.gradeObtained && a.gradeObtained !== 'PP' && a.gradeObtained !== 'F');
  if (graded.length === 0) {
    const allFailed = assessments.every(a => a.gradeObtained === 'F');
    if (allFailed) return 'F';
    const hasPP = assessments.some(a => a.gradeObtained === 'PP');
    if (hasPP) return 'PP';
    return null;
  }
  
  let totalWeightedPoints = 0;
  let totalWeight = 0;
  
  graded.forEach(a => {
    const gradeVal = getGradeValue(a.gradeObtained);
    const weight = a.weightPercentage || 0;
    totalWeightedPoints += gradeVal * weight;
    totalWeight += weight;
  });
  
  if (totalWeight === 0) return null;
  const average = totalWeightedPoints / totalWeight;
  return getGradeFromPoints(average);
};

const AssessmentModal = ({ visible, module, assessment, onClose }) => {
  const [formData, setFormData] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [marksObtained, setMarksObtained] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [calculatedGrade, setCalculatedGrade] = useState('');
  const [saving, setSaving] = useState(false);
  const { modules, addAssessment, updateAssessment, updateModule } = useAcademicStore();

  useEffect(() => {
    if (assessment) {
      setFormData({
        title: assessment.title || '',
        moduleId: assessment.moduleId || module?.id || '',
        type: assessment.type || 'exam',
        date: assessment.date || '',
        weightPercentage: assessment.weightPercentage?.toString() || '',
        notes: assessment.notes || '',
      });
      setMarksObtained(assessment.marksObtained?.toString() || '');
      setTotalMarks(assessment.totalMarks?.toString() || '100');
      if (assessment.date) setCalendarDate(new Date(assessment.date));
    } else {
      setFormData({
        title: '',
        moduleId: module?.id || '',
        type: 'exam',
        date: '',
        weightPercentage: '',
        notes: '',
      });
      setMarksObtained('');
      setTotalMarks('100');
      setCalendarDate(new Date());
    }
    setCalculatedGrade('');
    setShowCalendar(false);
    setSaving(false);
  }, [assessment, module, visible]);

  useEffect(() => {
    if (marksObtained && totalMarks && Number(totalMarks) > 0) {
      const percentage = (Number(marksObtained) / Number(totalMarks)) * 100;
      const threshold = GRADE_THRESHOLDS.find(t => percentage >= t.min);
      setCalculatedGrade(threshold ? threshold.grade : 'F');
    } else {
      setCalculatedGrade('');
    }
  }, [marksObtained, totalMarks]);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    
    const title = (formData.title || '').trim();
    const moduleId = formData.moduleId || '';
    const date = formData.date || '';
    
    if (!title || !moduleId || !date) {
      Alert.alert('Missing Fields', 'Please fill in title, module, and date.');
      return;
    }

    setSaving(true);
    try {
      const marks = marksObtained ? Number(marksObtained) : null;
      const total = totalMarks ? Number(totalMarks) : 100;
      const grade = calculatedGrade || null;
      const percentage = marks && total > 0 ? ((marks / total) * 100).toFixed(1) : null;

      const assessmentData = {
        title,
        type: formData.type || 'exam',
        date,
        weightPercentage: Number(formData.weightPercentage) || 0,
        gradeObtained: grade,
        marksObtained: marks,
        totalMarks: total,
        percentage: percentage ? Number(percentage) : null,
        status: grade === 'F' ? 'failed' : grade === 'PP' ? 'supplementary' : grade ? 'completed' : 'pending',
        notes: (formData.notes || '').trim(),
      };

      const currentModule = modules.find(m => m.id === moduleId);
      const existingAssessments = [...(currentModule?.assessments || [])];
      
      let updatedAssessments;
      if (assessment) {
        const idx = existingAssessments.findIndex(a => a.id === assessment.id);
        if (idx !== -1) {
          existingAssessments[idx] = { ...existingAssessments[idx], ...assessmentData };
        }
        updatedAssessments = existingAssessments;
        await updateAssessment(moduleId, assessment.id, assessmentData);
      } else {
        const newAssessment = { id: `asmt_${Date.now()}`, ...assessmentData };
        updatedAssessments = [...existingAssessments, newAssessment];
        await addAssessment(moduleId, assessmentData);
      }

      const newModuleGrade = calculateModuleGrade(updatedAssessments);
      
      if (newModuleGrade && currentModule) {
        await updateModule(moduleId, { currentGrade: newModuleGrade });
        
        const oldGrade = currentModule.currentGrade;
        if (newModuleGrade !== oldGrade) {
          await sendGradeUpdateNotification(currentModule.moduleName, oldGrade || 'N/A', newModuleGrade);
        }
      }

      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const types = ['exam', 'quiz', 'test', 'presentation', 'practical'];
  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textSecondary;
  const percentage = marksObtained && totalMarks && Number(totalMarks) > 0 ? ((Number(marksObtained) / Number(totalMarks)) * 100).toFixed(1) : null;
  const gradeInfo = calculatedGrade ? GRADE_THRESHOLDS.find(t => t.grade === calculatedGrade) : null;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => { let d = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); return d === 0 ? 6 : d - 1; };
  
  const daysInMonth = getDaysInMonth(calendarDate);
  const firstDay = getFirstDay(calendarDate);
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const today = new Date();
  const isPast = (day) => new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isSelected = (day) => formData.date === `${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const isToday = (day) => today.getFullYear() === calendarDate.getFullYear() && today.getMonth() === calendarDate.getMonth() && today.getDate() === day;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={saving ? undefined : onClose} activeOpacity={1} />
        <View style={styles.container}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>{assessment ? 'Edit Assessment' : 'Log Assessment'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={saving}>
              <X size={20} color={saving ? COLORS.textMuted : COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>ASSESSMENT TITLE</Text>
            <TextInput style={styles.input} placeholder="Midterm Examination" placeholderTextColor={COLORS.textMuted} value={formData.title} onChangeText={(t) => setFormData({ ...formData, title: t })} editable={!saving} />

            <Text style={styles.label}>MODULE</Text>
            {!module ? (
              <View style={styles.moduleList}>
                {modules.map((m) => (
                  <TouchableOpacity key={m.id} style={[styles.moduleOption, formData.moduleId === m.id && styles.moduleOptionActive]} onPress={() => setFormData({ ...formData, moduleId: m.id })} disabled={saving}>
                    <View style={[styles.moduleDot, { backgroundColor: m.color }]} />
                    <Text style={[styles.moduleOptionText, formData.moduleId === m.id && styles.moduleOptionTextActive]}>{m.moduleName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.selectedModule}>
                <View style={[styles.moduleDot, { backgroundColor: module.color }]} />
                <Text style={styles.selectedModuleText}>{module.moduleName}</Text>
              </View>
            )}

            <Text style={styles.label}>TYPE</Text>
            <View style={styles.chipRow}>
              {types.map((type) => (
                <TouchableOpacity key={type} style={[styles.chip, formData.type === type && styles.chipActive]} onPress={() => setFormData({ ...formData, type })} disabled={saving}>
                  <Text style={[styles.chipText, formData.type === type && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>DATE WRITTEN</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => { Keyboard.dismiss(); setShowCalendar(!showCalendar); }} disabled={saving}>
              <Calendar size={16} color={COLORS.primary} />
              <Text style={[styles.dateBtnText, formData.date && { color: COLORS.text }]}>{formData.date ? formatDate(formData.date) : 'Select date'}</Text>
            </TouchableOpacity>

            {showCalendar && (
              <View style={styles.calendar}>
                <View style={styles.calHeader}>
                  <TouchableOpacity onPress={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth()-1); setCalendarDate(d); }}><ChevronLeft size={18} color={COLORS.primary} /></TouchableOpacity>
                  <Text style={styles.calTitle}>{MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}</Text>
                  <TouchableOpacity onPress={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth()+1); setCalendarDate(d); }}><ChevronRight size={18} color={COLORS.primary} /></TouchableOpacity>
                </View>
                <View style={styles.calDays}>{DAYS.map(d => <Text key={d} style={styles.calDayHeader}>{d}</Text>)}</View>
                <View style={styles.calGrid}>
                  {calendarDays.map((day, i) => (
                    <TouchableOpacity key={i} style={[styles.calCell, day && isSelected(day) && styles.calCellSelected, day && isToday(day) && !isSelected(day) && styles.calCellToday]}
                      onPress={() => { if (day && !isPast(day)) { const f = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; setFormData({ ...formData, date: f }); setShowCalendar(false); }}}
                      disabled={!day || isPast(day) || saving}>
                      <Text style={[styles.calCellText, day && isPast(day) && { color: COLORS.border }, day && isSelected(day) && styles.calCellTextSelected, day && isToday(day) && !isSelected(day) && { color: COLORS.primary, fontFamily: 'JosefinSans-Bold' }]}>{day || ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.label}>WEIGHT %</Text>
            <TextInput style={styles.input} placeholder="30" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={formData.weightPercentage} onChangeText={(t) => setFormData({ ...formData, weightPercentage: t })} editable={!saving} />

            <Text style={styles.sectionLabel}>RESULTS</Text>
            
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>MARKS OBTAINED</Text>
                <TextInput style={styles.input} placeholder="65" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={marksObtained} onChangeText={setMarksObtained} editable={!saving} />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>TOTAL MARKS</Text>
                <TextInput style={styles.input} placeholder="100" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={totalMarks} onChangeText={setTotalMarks} editable={!saving} />
              </View>
            </View>

            {percentage && calculatedGrade && (
              <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Percentage</Text>
                  <Text style={[styles.resultValue, { color: calculatedGrade === 'F' ? COLORS.danger : calculatedGrade === 'PP' ? COLORS.warning : COLORS.success }]}>{percentage}%</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Grade</Text>
                  <View style={[styles.resultBadge, { backgroundColor: getGradeColor(calculatedGrade) }]}>
                    <Text style={styles.resultBadgeText}>{calculatedGrade}</Text>
                  </View>
                </View>
                {gradeInfo && (
                  <Text style={[styles.resultStatus, { color: getGradeColor(calculatedGrade) }]}>{gradeInfo.label}</Text>
                )}
                {calculatedGrade === 'PP' && (
                  <View style={styles.alertRow}>
                    <AlertTriangle size={14} color={COLORS.warning} />
                    <Text style={styles.alertText}>Below 50%. Supplementary exam required.</Text>
                  </View>
                )}
                {calculatedGrade === 'F' && (
                  <View style={[styles.alertRow, { backgroundColor: COLORS.danger + '10' }]}>
                    <AlertTriangle size={14} color={COLORS.danger} />
                    <Text style={[styles.alertText, { color: COLORS.danger }]}>Below 45%. Module failed.</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.label}>NOTES</Text>
            <TextInput style={[styles.input, styles.notesInput]} placeholder="Any additional notes..." placeholderTextColor={COLORS.textMuted} value={formData.notes} onChangeText={(t) => setFormData({ ...formData, notes: t })} multiline numberOfLines={2} editable={!saving} />
          </ScrollView>

          <TouchableOpacity 
            style={[styles.submitBtn, saving && { opacity: 0.7 }]} 
            onPress={handleSubmit} 
            activeOpacity={0.8}
            disabled={saving}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.submitGrad}>
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.submitText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>{assessment ? 'Update Assessment' : 'Log Assessment'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  container: { backgroundColor: COLORS.bg, borderTopLeftRadius: 34, borderTopRightRadius: 34, maxHeight: SCREEN_HEIGHT * 0.88, paddingHorizontal: PADDING, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, justifyContent: 'center', alignItems: 'center' },
  body: { flexGrow: 0, marginBottom: 16 },
  label: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textSecondary, letterSpacing: 1.5, marginBottom: 6, marginTop: 14 },
  sectionLabel: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.primary, letterSpacing: 1.5, marginBottom: 4, marginTop: 18, textTransform: 'uppercase' },
  input: { height: 48, borderRadius: 14, backgroundColor: COLORS.surfaceGlass, paddingHorizontal: 14, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  notesInput: { height: 60, textAlignVertical: 'top', paddingTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  moduleList: { gap: 6 },
  moduleOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder },
  moduleOptionActive: { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary },
  moduleDot: { width: 8, height: 8, borderRadius: 4 },
  moduleOptionText: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  moduleOptionTextActive: { color: COLORS.primary, fontFamily: 'JosefinSans-Bold' },
  selectedModule: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.primary + '12' },
  selectedModuleText: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: COLORS.white, fontFamily: 'JosefinSans-Bold' },
  dateBtn: { height: 48, borderRadius: 14, backgroundColor: COLORS.surfaceGlass, paddingHorizontal: 14, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBtnText: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  calendar: { marginTop: 8, backgroundColor: COLORS.surfaceGlass, borderRadius: 14, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, padding: 12 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calTitle: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  calDays: { flexDirection: 'row', marginBottom: 4 },
  calDayHeader: { width: (SCREEN_WIDTH - PADDING*2 - 24) / 7, textAlign: 'center', fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: (SCREEN_WIDTH - PADDING*2 - 24) / 7, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  calCellSelected: { backgroundColor: COLORS.primary },
  calCellToday: { backgroundColor: COLORS.primary + '12' },
  calCellText: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  calCellTextSelected: { color: COLORS.white, fontFamily: 'JosefinSans-Bold' },
  resultCard: { backgroundColor: COLORS.surfaceGlass, borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, gap: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultLabel: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },
  resultValue: { fontSize: 16, fontFamily: 'JosefinSans-Bold' },
  resultBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  resultBadgeText: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
  resultStatus: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', textAlign: 'right' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.warning + '10', borderRadius: 8, padding: 8 },
  alertText: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.warning, flex: 1 },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 8, shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 6 },
  submitGrad: { height: 52, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white, letterSpacing: 0.3 },
});

export default AssessmentModal;