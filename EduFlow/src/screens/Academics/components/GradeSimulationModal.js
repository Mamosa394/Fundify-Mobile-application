// src/screens/AcademicPlanner/components/GradeSimulationModal.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Zap } from 'lucide-react-native';
import useAcademicStore from '../../../store/academicStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_PADDING = 20;

const COLORS = {
  surface: '#FFFFFF',
  primary: '#3B82F6',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  borderLight: 'rgba(226, 232, 240, 0.6)',
  gradient1: ['#3B82F6', '#8B5CF6'],
};

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#34D399',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#60A5FA',
  'C+': '#F59E0B', 'C': '#F59E0B', 'C-': '#FBBF24',
  'D+': '#EF4444', 'D': '#EF4444', 'D-': '#F87171',
  'F': '#DC2626',
};

const GradeSimulationModal = ({ visible, onClose, onSimulate }) => {
  const [simulationGrades, setSimulationGrades] = useState({});
  const { modules, simulateGPA } = useAcademicStore();

  useEffect(() => {
    if (visible && modules.length > 0) {
      const grades = {};
      modules.forEach((module) => {
        grades[module.id] = module.currentGrade || 'F';
      });
      setSimulationGrades(grades);
    }
  }, [visible, modules]);

  const handleSimulate = async () => {
    try {
      const result = await simulateGPA(simulationGrades);
      if (onSimulate) {
        onSimulate(result);
      } else {
        Alert.alert(
          'GPA Simulation Result',
          `Current GPA: ${result.currentGPA.toFixed(2)}\n` +
          `Simulated GPA: ${result.simulatedGPA.toFixed(2)}\n` +
          `Difference: ${result.difference > 0 ? '+' : ''}${result.difference.toFixed(2)}`,
          [{ text: 'OK' }]
        );
      }
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Grade Simulation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.info}>
              Adjust your grades below to see how they would affect your GPA
            </Text>

            {modules.map((module) => (
              <View key={module.id} style={styles.moduleItem}>
                <View style={styles.moduleInfo}>
                  <View style={[styles.moduleDot, { backgroundColor: module.color }]} />
                  <View>
                    <Text style={styles.moduleName}>{module.moduleName}</Text>
                    <Text style={styles.moduleCredits}>{module.credits} credits</Text>
                  </View>
                </View>
                <View style={styles.gradeRow}>
                  {Object.keys(GRADE_COLORS).slice(0, 8).map((grade) => (
                    <TouchableOpacity
                      key={grade}
                      style={[
                        styles.gradeOption,
                        simulationGrades[module.id] === grade && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                      ]}
                      onPress={() => setSimulationGrades({
                        ...simulationGrades,
                        [module.id]: grade,
                      })}
                    >
                      <Text style={[
                        styles.gradeText,
                        simulationGrades[module.id] === grade && styles.gradeTextActive,
                      ]}>{grade}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.submitButton} onPress={handleSimulate}>
            <LinearGradient
              colors={COLORS.gradient1}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              <Zap size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>Simulate GPA</Text>
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
  info: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, lineHeight: 20 },
  moduleItem: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  moduleInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  moduleDot: { width: 10, height: 10, borderRadius: 5 },
  moduleName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  moduleCredits: { fontSize: 12, color: COLORS.textSecondary },
  gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gradeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gradeText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  gradeTextActive: { color: '#FFFFFF' },
  submitButton: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

export default GradeSimulationModal;