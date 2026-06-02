// src/screens/AcademicPlanner/components/ModuleModal.js

import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Platform,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import useAcademicStore from '../../../store/academicStore';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 16;

const TARGET_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#34D399',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#60A5FA',
  'C+': '#F59E0B', 'C': '#F59E0B',
};

const ModuleModal = ({ visible, module, onClose }) => {
  const [formData, setFormData] = useState({});
  const { addModule, updateModule, currentSemester } = useAcademicStore();
  
  // Refs for auto-scrolling
  const scrollViewRef = useRef(null);
  const fieldPositions = useRef({});

  useEffect(() => {
    if (module) {
      setFormData({
        moduleName: module.moduleName || '',
        moduleCode: module.moduleCode || '',
        credits: module.credits?.toString() || '',
        lecturerName: module.lecturerName || '',
        targetGrade: module.targetGrade || 'B',
        color: module.color || '#475569',
      });
    } else {
      setFormData({
        moduleName: '',
        moduleCode: '',
        credits: '',
        lecturerName: '',
        targetGrade: 'B',
        color: '#475569',
      });
    }
  }, [module, visible]);

  // Dynamically capture the Y position of each input field group
  const handleLayout = (fieldName) => (event) => {
    fieldPositions.current[fieldName] = event.nativeEvent.layout.y;
  };

  // Smoothly scroll to the target field coordinate when focused
  const handleFocus = (fieldName) => {
    const yPosition = fieldPositions.current[fieldName];
    if (yPosition !== undefined) {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, yPosition - 10), // Offset slightly for clean padding
        animated: true,
      });
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    
    if (!formData.moduleName || !formData.moduleCode || !formData.credits) {
      Alert.alert('Missing Fields', 'Please fill in module name, code, and credits.');
      return;
    }

    try {
      const moduleData = {
        moduleName: formData.moduleName.trim(),
        moduleCode: formData.moduleCode.trim(),
        credits: Number(formData.credits),
        lecturerName: formData.lecturerName.trim(),
        semester: currentSemester,
        color: formData.color,
        targetGrade: formData.targetGrade,
        currentGrade: module?.currentGrade || 'F',
      };

      if (module) {
        await updateModule(module.id, moduleData);
      } else {
        await addModule(moduleData);
      }

      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const colors = ['#475569', '#334155', '#64748B', '#10B981', '#F59E0B', '#DC2626', '#3B82F6'];
  const getGradeColor = (grade) => GRADE_COLORS[grade] || '#64748B';
  const chipWidth = (SCREEN_WIDTH - PADDING * 2 - 8 * 3) / 4;

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide" 
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        onPress={() => { Keyboard.dismiss(); onClose(); }} 
        activeOpacity={1}
      />
      
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{module ? 'Edit Module' : 'New Module'}</Text>
          <TouchableOpacity 
            onPress={() => { Keyboard.dismiss(); onClose(); }} 
            style={styles.closeButton}
          >
            <X size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          {/* Linked ScrollView Ref */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View onLayout={handleLayout('moduleName')} style={styles.fieldBlock}>
              <Text style={styles.label}>MODULE NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Mobile Device Programming"
                placeholderTextColor="#94A3B8"
                value={formData.moduleName}
                onChangeText={(text) => setFormData({ ...formData, moduleName: text })}
                autoCapitalize="words"
                onFocus={() => handleFocus('moduleName')}
              />
            </View>

            <View onLayout={handleLayout('moduleCode')} style={styles.fieldBlock}>
              <Text style={styles.label}>MODULE CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="BIMP2110"
                placeholderTextColor="#94A3B8"
                value={formData.moduleCode}
                onChangeText={(text) => setFormData({ ...formData, moduleCode: text })}
                autoCapitalize="characters"
                onFocus={() => handleFocus('moduleCode')}
              />
            </View>

            <View onLayout={handleLayout('credits')} style={styles.fieldBlock}>
              <Text style={styles.label}>CREDITS</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={formData.credits}
                onChangeText={(text) => setFormData({ ...formData, credits: text })}
                onFocus={() => handleFocus('credits')}
              />
            </View>

            <View onLayout={handleLayout('targetGrade')} style={styles.fieldBlock}>
              <Text style={styles.label}>TARGET GRADE</Text>
              <View style={styles.gradeRow}>
                {TARGET_GRADES.map((grade) => {
                  const active = formData.targetGrade === grade;
                  const color = getGradeColor(grade);
                  return (
                    <TouchableOpacity
                      key={grade}
                      style={[
                        styles.chip,
                        { width: chipWidth },
                        active && { backgroundColor: color, borderColor: color },
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, targetGrade: grade });
                        handleFocus('targetGrade');
                      }}
                    >
                      <Text style={[styles.chipText, active && { color: '#FFF' }]}>
                        {grade}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View onLayout={handleLayout('lecturerName')} style={styles.fieldBlock}>
              <Text style={styles.label}>LECTURER</Text>
              <TextInput
                style={styles.input}
                placeholder="Lecturers Name"
                placeholderTextColor="#94A3B8"
                value={formData.lecturerName}
                onChangeText={(text) => setFormData({ ...formData, lecturerName: text })}
                onFocus={() => handleFocus('lecturerName')}
              />
            </View>

            <View onLayout={handleLayout('color')} style={styles.fieldBlock}>
              <Text style={styles.label}>COLOR</Text>
              <View style={styles.colorRow}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      formData.color === color && styles.colorDotActive,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, color });
                      handleFocus('color');
                    }}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Fixed Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
            <LinearGradient 
              colors={['#475569', '#334155']} 
              style={styles.submitGrad}
            >
              <Text style={styles.submitText}>
                {module ? 'Update Module' : 'Add Module'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.8, 
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: PADDING,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'JosefinSans-Bold',
    color: '#0F172A',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  fieldBlock: {
    marginTop: 14, // Moved top spacing wrapper block level to ensure flawless layout tracking
  },
  label: {
    fontSize: 10,
    fontFamily: 'JosefinSans-Bold',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontFamily: 'JosefinSans-SemiBold',
    color: '#0F172A',
  },
  gradeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'JosefinSans-SemiBold',
    color: '#64748B',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: '#0F172A',
  },
  submitBtn: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGrad: {
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 15,
    fontFamily: 'JosefinSans-Bold',
    color: '#FFFFFF',
  },
});

export default ModuleModal;