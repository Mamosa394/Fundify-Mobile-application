// src/screens/AcademicPlanner/components/AssessmentModal.js

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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Flag } from 'lucide-react-native';
import useAcademicStore from '../../../store/academicStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_PADDING = 20;

const COLORS = {
  surface: '#FFFFFF',
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: 'rgba(226, 232, 240, 0.6)',
  gradient1: ['#3B82F6', '#8B5CF6'],
};

const AssessmentModal = ({ visible, module, assessment, onClose }) => {
  const [formData, setFormData] = useState({});
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
    }
  }, [assessment, module, visible]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.moduleId || !formData.date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const assessmentData = {
        title: formData.title,
        type: formData.type,
        date: formData.date,
        weightPercentage: Number(formData.weightPercentage) || 0,
        estimatedGrade: formData.estimatedGrade,
        actualGrade: formData.actualGrade || null,
        priority: formData.priority,
        studyHours: Number(formData.studyHours) || 0,
        notes: formData.notes || '',
      };

      if (assessment) {
        await updateAssessment(formData.moduleId, assessment.id, assessmentData);
      } else {
        await addAssessment(formData.moduleId, assessmentData);
      }

      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const types = ['exam', 'quiz', 'test', 'presentation', 'practical'];
  const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
  const priorities = [
    { value: 'high', color: COLORS.danger, label: 'High' },
    { value: 'medium', color: COLORS.warning, label: 'Medium' },
    { value: 'low', color: COLORS.success, label: 'Low' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{assessment ? 'Edit Assessment' : 'Add Assessment'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Midterm Exam"
              placeholderTextColor={COLORS.textMuted}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            <Text style={styles.label}>Module *</Text>
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

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {types.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    formData.type === type && styles.typeOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, type })}
                >
                  <Text style={[
                    styles.typeText,
                    formData.type === type && styles.typeTextActive,
                  ]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Weight %</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 30"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={formData.weightPercentage}
                  onChangeText={(text) => setFormData({ ...formData, weightPercentage: text })}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Study Hours</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={formData.studyHours}
                  onChangeText={(text) => setFormData({ ...formData, studyHours: text })}
                />
              </View>
            </View>

            <Text style={styles.label}>Estimated Grade</Text>
            <View style={styles.gradeRow}>
              {grades.map((grade) => (
                <TouchableOpacity
                  key={grade}
                  style={[
                    styles.gradeOption,
                    formData.estimatedGrade === grade && styles.gradeOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, estimatedGrade: grade })}
                >
                  <Text style={[
                    styles.gradeText,
                    formData.estimatedGrade === grade && styles.gradeTextActive,
                  ]}>{grade}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {priorities.map((priority) => (
                <TouchableOpacity
                  key={priority.value}
                  style={[
                    styles.priorityOption,
                    { borderColor: priority.color },
                    formData.priority === priority.value && { backgroundColor: priority.color + '20', borderWidth: 2 },
                  ]}
                  onPress={() => setFormData({ ...formData, priority: priority.value })}
                >
                  <Flag size={14} color={priority.color} />
                  <Text style={[styles.priorityText, { color: priority.color }]}>
                    {priority.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <LinearGradient
              colors={COLORS.gradient1}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>
                {assessment ? 'Update Assessment' : 'Add Assessment'}
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.85,
    padding: CARD_PADDING,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center' },
  body: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  moduleList: { gap: 8 },
  moduleOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  moduleOptionActive: { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary },
  moduleDot: { width: 10, height: 10, borderRadius: 5 },
  moduleOptionText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  moduleOptionTextActive: { color: COLORS.primary, fontWeight: '600' },
  selectedModule: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary + '10' },
  selectedModuleText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  typeOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  typeTextActive: { color: '#FFFFFF' },
  gradeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  gradeOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  gradeOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  gradeText: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  gradeTextActive: { color: '#FFFFFF' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1 },
  priorityText: { fontSize: 12, fontWeight: '600' },
  submitButton: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: { paddingVertical: 16, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

export default AssessmentModal;