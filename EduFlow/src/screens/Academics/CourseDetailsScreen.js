// src/screens/AcademicPlanner/CourseDetailsScreen.js

import React, { useState, useEffect } from 'react';
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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInRight,
  SlideInDown,
} from 'react-native-reanimated';
import {
  BookOpen,
  Clock,
  Calendar,
  Flag,
  ChevronRight,
  Plus,
  Edit3,
  Target,
  Award,
  BarChart3,
  FileText,
  GraduationCap,
  AlertTriangle,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import ModuleModal from './components/ModuleModal';
import AssessmentModal from './components/AssessmentModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20;

const COLORS = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.7)',
  primary: '#3B82F6',
  secondary: '#8B5CF6',
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

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#34D399',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#60A5FA',
  'C+': '#F59E0B', 'C': '#F59E0B', 'C-': '#FBBF24',
  'D+': '#EF4444', 'D': '#EF4444', 'D-': '#F87171',
  'F': '#DC2626',
};

const CourseDetailsScreen = () => {
  const [selectedModule, setSelectedModule] = useState(null);
  const [activeView, setActiveView] = useState('details');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  const {
    modules,
    fetchModules,
    fetchAnalytics,
    fetchInsights,
    deleteModule,
    addAssessment,
    updateAssessment,
    deleteAssignment,
  } = useAcademicStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchModules(), fetchAnalytics(), fetchInsights()]);
  };

  const getGradeColor = (grade) => {
    return GRADE_COLORS[grade] || COLORS.textMuted;
  };

  const handleEditModule = (module) => {
    setSelectedModule(module);
    setShowModuleModal(true);
  };

  const handleDeleteModule = (module) => {
    Alert.alert(
      'Delete Module',
      `Are you sure you want to delete ${module.moduleName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteModule(module.id);
            await loadData();
            setSelectedModule(null);
          },
        },
      ]
    );
  };

  const handleAddAssessment = (module) => {
    setSelectedModule(module);
    setSelectedAssessment(null);
    setShowAssessmentModal(true);
  };

  const renderModuleCard = (module, index) => (
    <Animated.View
      key={module.id}
      entering={FadeInRight.delay(200 + index * 100).springify()}
      style={styles.moduleCard}
    >
      <BlurView intensity={30} tint="light" style={styles.moduleCardBlur}>
        {/* Module Header */}
        <View style={styles.moduleHeader}>
          <View style={styles.moduleHeaderLeft}>
            <LinearGradient
              colors={[module.color, module.color + '80']}
              style={styles.moduleIcon}
            >
              <BookOpen size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.moduleHeaderInfo}>
              <Text style={styles.moduleTitle}>{module.moduleName}</Text>
              <Text style={styles.moduleCode}>{module.moduleCode}</Text>
            </View>
          </View>
          <View style={[
            styles.moduleGrade,
            { backgroundColor: getGradeColor(module.currentGrade) + '20' }
          ]}>
            <Text style={[
              styles.moduleGradeText,
              { color: getGradeColor(module.currentGrade) }
            ]}>
              {module.currentGrade}
            </Text>
          </View>
        </View>

        {/* Module Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Award size={16} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Credits</Text>
            <Text style={styles.infoValue}>{module.credits}</Text>
          </View>
          <View style={styles.infoItem}>
            <Target size={16} color={COLORS.secondary} />
            <Text style={styles.infoLabel}>Target</Text>
            <Text style={styles.infoValue}>{module.targetGrade}</Text>
          </View>
          <View style={styles.infoItem}>
            <FileText size={16} color={COLORS.warning} />
            <Text style={styles.infoLabel}>Assignments</Text>
            <Text style={styles.infoValue}>{(module.assignments || []).length}</Text>
          </View>
          <View style={styles.infoItem}>
            <Calendar size={16} color={COLORS.success} />
            <Text style={styles.infoLabel}>Assessments</Text>
            <Text style={styles.infoValue}>{(module.assessments || []).length}</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>Assignment Progress</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((module.assignments || []).filter(a => a.status === 'completed').length / 
                    Math.max((module.assignments || []).length, 1)) * 100}%`,
                  backgroundColor: module.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {((module.assignments || []).filter(a => a.status === 'completed').length)}/
            {(module.assignments || []).length} completed
          </Text>
        </View>

        {/* Assessments Section */}
        {(module.assessments || []).length > 0 && (
          <View style={styles.assessmentsSection}>
            <Text style={styles.sectionTitle}>Assessments</Text>
            {(module.assessments || []).map((assessment, idx) => (
              <View key={assessment.id || idx} style={styles.assessmentItem}>
                <View style={styles.assessmentHeader}>
                  <View style={styles.assessmentType}>
                    <Calendar size={14} color={module.color} />
                    <Text style={styles.assessmentTypeText}>{assessment.type}</Text>
                  </View>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: 
                      assessment.priority === 'high' ? COLORS.danger + '20' :
                      assessment.priority === 'medium' ? COLORS.warning + '20' :
                      COLORS.success + '20'
                    }
                  ]}>
                    <Flag size={10} color={
                      assessment.priority === 'high' ? COLORS.danger :
                      assessment.priority === 'medium' ? COLORS.warning :
                      COLORS.success
                    } />
                  </View>
                </View>
                <Text style={styles.assessmentTitle}>{assessment.title}</Text>
                <Text style={styles.assessmentDate}>
                  {new Date(assessment.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primary + '10' }]}
            onPress={() => handleEditModule(module)}
          >
            <Edit3 size={16} color={COLORS.primary} />
            <Text style={[styles.actionText, { color: COLORS.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.secondary + '10' }]}
            onPress={() => handleAddAssessment(module)}
          >
            <Plus size={16} color={COLORS.secondary} />
            <Text style={[styles.actionText, { color: COLORS.secondary }]}>Assessment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.danger + '10' }]}
            onPress={() => handleDeleteModule(module)}
          >
            <Text style={[styles.actionText, { color: COLORS.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <Text style={styles.title}>Course Details</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedModule(null);
            setShowModuleModal(true);
          }}
        >
          <LinearGradient
            colors={COLORS.gradient1}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButtonGradient}
          >
            <Plus size={22} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {modules.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
            <GraduationCap size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No modules yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first module to see course details
            </Text>
          </Animated.View>
        ) : (
          modules.map((module, index) => renderModuleCard(module, index))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <ModuleModal
        visible={showModuleModal}
        module={selectedModule}
        onClose={() => {
          setShowModuleModal(false);
          loadData();
        }}
      />
      <AssessmentModal
        visible={showAssessmentModal}
        module={selectedModule}
        assessment={selectedAssessment}
        onClose={() => {
          setShowAssessmentModal(false);
          loadData();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: CARD_PADDING,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  addButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CARD_PADDING,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  moduleCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  moduleCardBlur: {
    padding: 20,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  moduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleHeaderInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  moduleCode: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  moduleGrade: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  moduleGradeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  assessmentsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  assessmentItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assessmentType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assessmentTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  priorityBadge: {
    padding: 4,
    borderRadius: 6,
  },
  assessmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  assessmentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CourseDetailsScreen;