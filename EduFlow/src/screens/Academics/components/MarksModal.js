// src/screens/AcademicPlanner/components/MarksModal.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
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
  shadow: '#CBD5E1',
  white: '#FFFFFF',
};

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#34D399',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#60A5FA',
  'C+': '#F59E0B', 'C': '#F59E0B', 'C-': '#FBBF24',
  'D+': '#EF4444', 'D': '#EF4444', 'D-': '#F87171',
  'F': '#DC2626',
};

const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
};

const ALL_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

const MarksModal = ({ visible, module, onClose }) => {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateModule, fetchModules, fetchAnalytics } = useAcademicStore();

  useEffect(() => {
    if (visible && module) {
      console.log('[MarksModal] Opened for module:', module.moduleName, 'Current grade:', module.currentGrade);
      setSelectedGrade(module.currentGrade || 'F');
      setIsSubmitting(false);
    }
  }, [visible, module]);

  const handleGradeSelect = (grade) => {
    console.log('[MarksModal] Grade selected:', grade);
    setSelectedGrade(grade);
  };

  const handleSubmit = async () => {
    console.log('[MarksModal] Submit clicked. Selected:', selectedGrade, 'Current:', module?.currentGrade);
    
    if (!selectedGrade || !module) {
      Alert.alert('Error', 'Please select a grade first.');
      return;
    }

    if (selectedGrade === module.currentGrade) {
      console.log('[MarksModal] Grade unchanged, closing');
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('[MarksModal] Updating module:', module.id, 'to grade:', selectedGrade);
      
      await updateModule(module.id, { currentGrade: selectedGrade });
      console.log('[MarksModal] Update successful, fetching fresh data...');
      
      await Promise.all([fetchModules(), fetchAnalytics()]);
      console.log('[MarksModal] Data refreshed, closing modal');
      
      onClose();
    } catch (error) {
      console.error('[MarksModal] Update error:', error);
      Alert.alert('Error', error.message || 'Failed to update grade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeColor = (grade) => GRADE_COLORS[grade] || COLORS.textSecondary;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>Update Grade</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {module && (
            <View style={styles.moduleInfo}>
              <View style={[styles.moduleDot, { backgroundColor: module.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleName}>{module.moduleName}</Text>
                <Text style={styles.moduleCode}>{module.moduleCode}</Text>
              </View>
              <View style={[styles.currentBadge, { backgroundColor: getGradeColor(module.currentGrade) + '15' }]}>
                <Text style={[styles.currentBadgeText, { color: getGradeColor(module.currentGrade) }]}>
                  {module.currentGrade || 'N/A'}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>SELECT NEW GRADE</Text>
          
          <View style={styles.gradeGrid}>
            {ALL_GRADES.map((grade) => {
              const isSelected = selectedGrade === grade;
              const gradeColor = getGradeColor(grade);
              
              return (
                <TouchableOpacity
                  key={grade}
                  style={[
                    styles.gradeOption,
                    isSelected && {
                      backgroundColor: gradeColor,
                      borderColor: gradeColor,
                    },
                  ]}
                  onPress={() => handleGradeSelect(grade)}
                  activeOpacity={0.6}
                >
                  <Text style={[
                    styles.gradeText,
                    { color: isSelected ? COLORS.white : gradeColor },
                  ]}>
                    {grade}
                  </Text>
                  <Text style={[
                    styles.gradePoints,
                    isSelected && { color: 'rgba(255,255,255,0.7)' },
                  ]}>
                    {GRADE_POINTS[grade].toFixed(1)}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkMark}>
                      <Check size={12} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleSubmit} 
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitText}>
                  {selectedGrade === module?.currentGrade ? 'Close' : `Update to ${selectedGrade}`}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  container: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    maxHeight: SCREEN_HEIGHT * 0.65,
    paddingHorizontal: PADDING,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  moduleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moduleName: {
    fontSize: 15,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },
  moduleCode: {
    fontSize: 11,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 12,
    fontFamily: 'JosefinSans-Bold',
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 1.8,
    fontFamily: 'JosefinSans-Bold',
  },
  gradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  gradeOption: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    alignItems: 'center',
    position: 'relative',
  },
  gradeText: {
    fontSize: 16,
    fontFamily: 'JosefinSans-Bold',
    marginBottom: 2,
  },
  gradePoints: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: 'JosefinSans-SemiBold',
  },
  checkMark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  submitGradient: {
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.white,
  },
});

export default MarksModal;