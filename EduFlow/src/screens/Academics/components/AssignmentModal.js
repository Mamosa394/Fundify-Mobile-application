// src/screens/AcademicPlanner/components/AssignmentModal.js

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
import { X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
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
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#DC2626',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const AssignmentModal = ({ visible, module, assignment, onClose }) => {
  const [formData, setFormData] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const { modules, addAssignment, updateAssignment } = useAcademicStore();

  useEffect(() => {
    if (assignment) {
      setFormData({
        title: assignment.title || '',
        moduleId: assignment.moduleId || module?.id || '',
        dueDate: assignment.dueDate || '',
        weightPercentage: assignment.weightPercentage?.toString() || '',
        marksObtained: assignment.marksObtained?.toString() || '',
        totalMarks: assignment.totalMarks?.toString() || '100',
        status: assignment.status || 'pending',
        description: assignment.description || '',
      });
      if (assignment.dueDate) {
        setCalendarDate(new Date(assignment.dueDate));
      }
    } else {
      setFormData({
        title: '',
        moduleId: module?.id || '',
        dueDate: '',
        weightPercentage: '',
        marksObtained: '',
        totalMarks: '100',
        status: 'pending',
        description: '',
      });
      setCalendarDate(new Date());
    }
    setShowCalendar(false);
  }, [assignment, module, visible]);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    
    if (!formData.title || !formData.moduleId || !formData.dueDate) {
      Alert.alert('Missing Fields', 'Please fill in title, module, and due date.');
      return;
    }

    try {
      const assignmentData = {
        title: formData.title.trim(),
        dueDate: formData.dueDate,
        weightPercentage: Number(formData.weightPercentage) || 0,
        marksObtained: Number(formData.marksObtained) || 0,
        totalMarks: Number(formData.totalMarks) || 100,
        status: formData.status,
        description: formData.description || '',
      };

      if (assignment) {
        await updateAssignment(formData.moduleId, assignment.id, assignmentData);
      } else {
        await addAssignment(formData.moduleId, assignmentData);
      }

      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const statuses = [
    { value: 'pending', color: COLORS.warning, label: 'Pending' },
    { value: 'submitted', color: COLORS.primary, label: 'Submitted' },
    { value: 'completed', color: COLORS.success, label: 'Completed' },
    { value: 'overdue', color: COLORS.danger, label: 'Overdue' },
  ];

  // Calendar helpers
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday(0) to 6, Monday(1) to 0
  };

  const changeMonth = (delta) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + delta);
    // Don't go before current month
    const now = new Date();
    if (newDate.getFullYear() < now.getFullYear() || 
       (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() < now.getMonth())) {
      return;
    }
    setCalendarDate(newDate);
  };

  const selectDate = (day) => {
    const selected = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    const formatted = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFormData({ ...formData, dueDate: formatted });
    setShowCalendar(false);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const today = new Date();
  const daysInMonth = getDaysInMonth(calendarDate);
  const firstDay = getFirstDayOfMonth(calendarDate);
  const calendarDays = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const isPastDay = (day) => {
    const checkDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return checkDate < todayStart;
  };

  const isSelectedDate = (day) => {
    if (!formData.dueDate) return false;
    const selected = new Date(formData.dueDate);
    return selected.getFullYear() === calendarDate.getFullYear() &&
           selected.getMonth() === calendarDate.getMonth() &&
           selected.getDate() === day;
  };

  const isToday = (day) => {
    return today.getFullYear() === calendarDate.getFullYear() &&
           today.getMonth() === calendarDate.getMonth() &&
           today.getDate() === day;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.container}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>{assignment ? 'Edit Assignment' : 'New Assignment'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.body} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="Assingment Title"
              placeholderTextColor={COLORS.textMuted}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            {/* Module */}
            <Text style={styles.label}>MODULE</Text>
            {!module ? (
              <View style={styles.moduleList}>
                {modules.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.moduleOption,
                      formData.moduleId === m.id && styles.moduleOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, moduleId: m.id })}
                  >
                    <View style={[styles.moduleDot, { backgroundColor: m.color }]} />
                    <Text style={[
                      styles.moduleOptionText,
                      formData.moduleId === m.id && styles.moduleOptionTextActive,
                    ]}>{m.moduleName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.selectedModule}>
                <View style={[styles.moduleDot, { backgroundColor: module.color }]} />
                <Text style={styles.selectedModuleText}>{module.moduleName}</Text>
              </View>
            )}

            {/* Due Date with Calendar */}
            <Text style={styles.label}>DUE DATE</Text>
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => {
                Keyboard.dismiss();
                setShowCalendar(!showCalendar);
              }}
            >
              <Calendar size={16} color={COLORS.primary} />
              <Text style={[styles.dateButtonText, formData.dueDate && { color: COLORS.text }]}>
                {formData.dueDate ? formatDisplayDate(formData.dueDate) : 'Select due date'}
              </Text>
            </TouchableOpacity>

            {/* Calendar */}
            {showCalendar && (
              <View style={styles.calendarContainer}>
                {/* Month Navigation */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
                    <ChevronLeft size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={styles.monthTitle}>
                    {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                  </Text>
                  <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
                    <ChevronRight size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* Day Headers */}
                <View style={styles.dayHeaders}>
                  {DAYS.map((day) => (
                    <Text key={day} style={styles.dayHeader}>{day}</Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }
                    
                    const past = isPastDay(day);
                    const selected = isSelectedDate(day);
                    const todayDay = isToday(day);

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={[
                          styles.dayCell,
                          selected && styles.dayCellSelected,
                          todayDay && !selected && styles.dayCellToday,
                        ]}
                        onPress={() => !past && selectDate(day)}
                        disabled={past}
                      >
                        <Text style={[
                          styles.dayText,
                          past && styles.dayTextPast,
                          selected && styles.dayTextSelected,
                          todayDay && !selected && styles.dayTextToday,
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Weight & Marks Row */}
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>WEIGHT %</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={formData.weightPercentage}
                  onChangeText={(text) => setFormData({ ...formData, weightPercentage: text })}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>MARKS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="85"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={formData.marksObtained}
                  onChangeText={(text) => setFormData({ ...formData, marksObtained: text })}
                />
              </View>
            </View>

            {/* Total Marks */}
            <Text style={styles.label}>TOTAL MARKS</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={formData.totalMarks}
              onChangeText={(text) => setFormData({ ...formData, totalMarks: text })}
            />

            {/* Status */}
            <Text style={styles.label}>STATUS</Text>
            <View style={styles.statusRow}>
              {statuses.map((status) => {
                const isActive = formData.status === status.value;
                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.statusOption,
                      { borderColor: status.color },
                      isActive && { backgroundColor: status.color, borderColor: status.color },
                    ]}
                    onPress={() => setFormData({ ...formData, status: status.value })}
                  >
                    <Text style={[
                      styles.statusText,
                      { color: isActive ? COLORS.white : status.color },
                    ]}>{status.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>
                {assignment ? 'Update Assignment' : 'Add Assignment'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  container: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    maxHeight: SCREEN_HEIGHT * 0.85,
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 22, fontFamily: 'JosefinSans-Bold', color: COLORS.text,
  },
  closeButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder, justifyContent: 'center', alignItems: 'center',
  },
  body: { flexGrow: 0, marginBottom: 16 },
  label: {
    fontSize: 11, color: COLORS.textSecondary, marginBottom: 8, marginTop: 14,
    letterSpacing: 1.8, fontFamily: 'JosefinSans-Bold',
  },
  input: {
    height: 50, borderRadius: 14, backgroundColor: COLORS.surfaceGlass,
    paddingHorizontal: 16, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder,
    color: COLORS.text, fontSize: 14, fontFamily: 'JosefinSans-SemiBold',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  moduleList: { gap: 6 },
  moduleOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder,
  },
  moduleOptionActive: { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary },
  moduleDot: { width: 8, height: 8, borderRadius: 4 },
  moduleOptionText: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  moduleOptionTextActive: { color: COLORS.primary, fontFamily: 'JosefinSans-Bold' },
  selectedModule: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    backgroundColor: COLORS.primary + '12',
  },
  selectedModuleText: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },

  // Date Button
  dateButton: {
    height: 50, borderRadius: 14, backgroundColor: COLORS.surfaceGlass,
    paddingHorizontal: 16, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  dateButtonText: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },

  // Calendar
  calendarContainer: {
    marginTop: 10,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    padding: 14,
  },
  calendarHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  monthArrow: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.surfaceGlass, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  monthTitle: {
    fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text,
  },
  dayHeaders: {
    flexDirection: 'row', marginBottom: 6,
  },
  dayHeader: {
    width: (SCREEN_WIDTH - PADDING * 2 - 28) / 7,
    textAlign: 'center',
    fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  dayCell: {
    width: (SCREEN_WIDTH - PADDING * 2 - 28) / 7,
    height: 38,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 10,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCellToday: {
    backgroundColor: COLORS.primary + '12',
  },
  dayText: {
    fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text,
  },
  dayTextPast: {
    color: COLORS.border,
  },
  dayTextSelected: {
    color: COLORS.white,
  },
  dayTextToday: {
    color: COLORS.primary, fontFamily: 'JosefinSans-Bold',
  },

  // Status
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusOption: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2,
  },
  statusText: { fontSize: 11, fontFamily: 'JosefinSans-Bold' },

  // Submit
  submitButton: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28, shadowRadius: 16, elevation: 6,
  },
  submitGradient: { height: 54, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white, letterSpacing: 0.4 },
});

export default AssignmentModal;