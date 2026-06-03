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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Flag, Calendar } from 'lucide-react-native';
import useAcademicStore from '../../../store/academicStore';

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

const GRADE_COLORS = {
  'A+': '#059669', 'A': '#059669', 'A-': '#10B981',
  'B+': '#2563EB', 'B': '#2563EB', 'B-': '#3B82F6',
  'C+': '#D97706', 'C': '#D97706', 'C-': '#F59E0B',
  'D+': '#DC2626', 'D': '#DC2626', 'D-': '#EF4444',
  'F': '#DC2626',
};

const AssessmentModal = ({ visible, module, assessment, onClose }) => {
  const [formData, setFormData] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const { modules, addAssessment, updateAssessment } = useAcademicStore();

  useEffect(() => {
    if (assessment) {
      setFormData({
        title: assessment.title || '',
        moduleId: assessment.moduleId || module?.id || '',
        type: assessment.type || 'exam',
        date: assessment.date || '',
        weightPercentage: assessment.weightPercentage?.toString() || '',
        estimatedGrade: assessment.estimatedGrade || 'B',
        actualGrade: assessment.actualGrade || '',
        priority: assessment.priority || 'medium',
        studyHours: assessment.studyHours?.toString() || '',
        notes: assessment.notes || '',
      });
      if (assessment.date) setCalendarDate(new Date(assessment.date));
    } else {
      setFormData({
        title: '',
        moduleId: module?.id || '',
        type: 'exam',
        date: '',
        weightPercentage: '',
        estimatedGrade: 'B',
        actualGrade: '',
        priority: 'medium',
        studyHours: '',
        notes: '',
      });
      setCalendarDate(new Date());
    }
    setShowCalendar(false);
  }, [assessment, module, visible]);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    
    const title = (formData.title || '').trim();
    const moduleId = formData.moduleId || '';
    const date = formData.date || '';
    
    if (!title || !moduleId || !date) {
      Alert.alert('Missing Fields', 'Please fill in title, module, and date.');
      return;
    }

    try {
      const assessmentData = {
        title,
        type: formData.type || 'exam',
        date,
        weightPercentage: Number(formData.weightPercentage) || 0,
        estimatedGrade: formData.estimatedGrade || 'B',
        actualGrade: formData.actualGrade || null,
        priority: formData.priority || 'medium',
        studyHours: Number(formData.studyHours) || 0,
        notes: (formData.notes || '').trim(),
      };

      if (assessment) {
        await updateAssessment(moduleId, assessment.id, assessmentData);
      } else {
        await addAssessment(moduleId, assessmentData);
      }

      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save assessment');
    }
  };

  const types = ['exam', 'quiz', 'test', 'presentation', 'practical'];
  const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
  const priorities = [
    { value: 'high', color: COLORS.danger, label: 'High' },
    { value: 'medium', color: COLORS.warning, label: 'Medium' },
    { value: 'low', color: COLORS.success, label: 'Low' },
  ];

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textSecondary;

  // Calendar helpers
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => {
    let d = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return d === 0 ? 6 : d - 1;
  };
  
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
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.container}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>{assessment ? 'Edit Assessment' : 'New Assessment'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="Midterm Examination"
              placeholderTextColor={COLORS.textMuted}
              value={formData.title}
              onChangeText={(t) => setFormData({ ...formData, title: t })}
            />

            {/* Module */}
            <Text style={styles.label}>MODULE</Text>
            {!module ? (
              <View style={styles.moduleList}>
                {modules.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.moduleOption, formData.moduleId === m.id && styles.moduleOptionActive]}
                    onPress={() => setFormData({ ...formData, moduleId: m.id })}
                  >
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

            {/* Type */}
            <Text style={styles.label}>TYPE</Text>
            <View style={styles.chipRow}>
              {types.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, formData.type === type && styles.chipActive]}
                  onPress={() => setFormData({ ...formData, type })}
                >
                  <Text style={[styles.chipText, formData.type === type && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date */}
            <Text style={styles.label}>DATE</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => { Keyboard.dismiss(); setShowCalendar(!showCalendar); }}>
              <Calendar size={16} color={COLORS.primary} />
              <Text style={[styles.dateBtnText, formData.date && { color: COLORS.text }]}>
                {formData.date ? formatDate(formData.date) : 'Select date'}
              </Text>
            </TouchableOpacity>

            {showCalendar && (
              <View style={styles.calendar}>
                <View style={styles.calHeader}>
                  <TouchableOpacity onPress={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth()-1); setCalendarDate(d); }}>
                    <Text style={styles.calArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.calTitle}>{MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}</Text>
                  <TouchableOpacity onPress={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth()+1); setCalendarDate(d); }}>
                    <Text style={styles.calArrow}>›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.calDays}>
                  {DAYS.map(d => <Text key={d} style={styles.calDayHeader}>{d}</Text>)}
                </View>
                <View style={styles.calGrid}>
                  {calendarDays.map((day, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.calCell, day && isSelected(day) && styles.calCellSelected, day && isToday(day) && !isSelected(day) && styles.calCellToday]}
                      onPress={() => {
                        if (day && !isPast(day)) {
                          const formatted = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                          setFormData({ ...formData, date: formatted });
                          setShowCalendar(false);
                        }
                      }}
                      disabled={!day || isPast(day)}
                    >
                      <Text style={[styles.calCellText, day && isPast(day) && { color: COLORS.border }, day && isSelected(day) && styles.calCellTextSelected, day && isToday(day) && !isSelected(day) && { color: COLORS.primary, fontFamily: 'JosefinSans-Bold' }]}>
                        {day || ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Weight & Hours */}
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>WEIGHT %</Text>
                <TextInput style={styles.input} placeholder="30" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={formData.weightPercentage} onChangeText={(t) => setFormData({ ...formData, weightPercentage: t })} />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>STUDY HRS</Text>
                <TextInput style={styles.input} placeholder="10" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={formData.studyHours} onChangeText={(t) => setFormData({ ...formData, studyHours: t })} />
              </View>
            </View>

            {/* Estimated Grade */}
            <Text style={styles.label}>ESTIMATED GRADE</Text>
            <View style={styles.chipRow}>
              {grades.map((grade) => {
                const active = formData.estimatedGrade === grade;
                const gc = getGradeColor(grade);
                return (
                  <TouchableOpacity
                    key={grade}
                    style={[styles.chip, active && { backgroundColor: gc, borderColor: gc }]}
                    onPress={() => setFormData({ ...formData, estimatedGrade: grade })}
                  >
                    <Text style={[styles.chipText, active && { color: COLORS.white }]}>{grade}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Priority */}
            <Text style={styles.label}>PRIORITY</Text>
            <View style={styles.priorityRow}>
              {priorities.map((p) => {
                const active = formData.priority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.priorityChip, { borderColor: p.color }, active && { backgroundColor: p.color, borderColor: p.color }]}
                    onPress={() => setFormData({ ...formData, priority: p.value })}
                  >
                    <Flag size={12} color={active ? COLORS.white : p.color} />
                    <Text style={[styles.priorityText, { color: active ? COLORS.white : p.color }]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.submitGrad}>
              <Text style={styles.submitText}>{assessment ? 'Update Assessment' : 'Add Assessment'}</Text>
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
  container: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingHorizontal: PADDING,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, justifyContent: 'center', alignItems: 'center' },
  body: { flexGrow: 0, marginBottom: 16 },
  label: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textSecondary, letterSpacing: 1.5, marginBottom: 6, marginTop: 14 },
  input: { height: 48, borderRadius: 14, backgroundColor: COLORS.surfaceGlass, paddingHorizontal: 14, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
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
  calArrow: { fontSize: 20, color: COLORS.primary, paddingHorizontal: 8 },
  calTitle: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  calDays: { flexDirection: 'row', marginBottom: 4 },
  calDayHeader: { width: (SCREEN_WIDTH - PADDING*2 - 24) / 7, textAlign: 'center', fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: (SCREEN_WIDTH - PADDING*2 - 24) / 7, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  calCellSelected: { backgroundColor: COLORS.primary },
  calCellToday: { backgroundColor: COLORS.primary + '12' },
  calCellText: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  calCellTextSelected: { color: COLORS.white, fontFamily: 'JosefinSans-Bold' },

  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2 },
  priorityText: { fontSize: 11, fontFamily: 'JosefinSans-Bold' },

  submitBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 8, shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 6 },
  submitGrad: { height: 52, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white, letterSpacing: 0.3 },
});

export default AssessmentModal;