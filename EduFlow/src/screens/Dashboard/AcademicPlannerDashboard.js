// src/screens/AcademicPlanner/AcademicPlannerScreen.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeInLeft,
  SlideInDown,
  SlideInUp,
  ZoomIn,
  ZoomOut,
  Layout,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Target,
  Clock,
  CheckCircle2,
  BarChart3,
  FileText,
  Star,
  Award,
  ChevronRight,
  Zap,
  TrendingDown,
  Edit3,
  Trash2,
  MoreVertical,
  X,
  Filter,
  Search,
  Bell,
  PieChart,
  Activity,
  Bookmark,
  Flag,
  ArrowUp,
  ArrowDown,
  Circle,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_PADDING * 2);

// Color palette
const COLORS = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.7)',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: 'rgba(226, 232, 240, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  gradient1: ['#3B82F6', '#8B5CF6'],
  gradient2: ['#10B981', '#3B82F6'],
  gradient3: ['#F59E0B', '#EF4444'],
};

// Grade colors
const GRADE_COLORS = {
  'A+': '#10B981',
  'A': '#10B981',
  'A-': '#34D399',
  'B+': '#3B82F6',
  'B': '#3B82F6',
  'B-': '#60A5FA',
  'C+': '#F59E0B',
  'C': '#F59E0B',
  'C-': '#FBBF24',
  'D+': '#EF4444',
  'D': '#EF4444',
  'D-': '#F87171',
  'F': '#DC2626',
};

const AcademicPlannerScreen = () => {
  // State
  const [greeting, setGreeting] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // null, 'module', 'assignment', 'assessment', 'gpa', 'simulation', 'marks'
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [formData, setFormData] = useState({});
  const [formStep, setFormStep] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [simulationGrades, setSimulationGrades] = useState({});

  // Animation values
  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);

  // Store
  const {
    modules,
    gpa,
    totalCredits,
    analytics,
    insights,
    isLoading,
    error,
    fetchModules,
    fetchAnalytics,
    fetchInsights,
    addModule,
    updateModule,
    deleteModule,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    addAssessment,
    updateAssessment,
    simulateGPA,
    currentSemester,
    setCurrentSemester,
  } = useAcademicStore();

  // Effects
  useEffect(() => {
    loadData();
    updateGreeting();
  }, []);

  useEffect(() => {
    if (activeModal) {
      openModalAnimation();
    }
  }, [activeModal]);

  const loadData = async () => {
    await Promise.all([fetchModules(), fetchAnalytics(), fetchInsights()]);
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Modal animations
  const openModalAnimation = () => {
    modalScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    modalOpacity.value = withTiming(1, { duration: 300 });
  };

  const closeModalAnimation = () => {
    modalScale.value = withSpring(0.9, { damping: 15, stiffness: 150 });
    modalOpacity.value = withTiming(0, { duration: 200 });
  };

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  // Modal handlers
  const openModal = (type, data = null) => {
    setSelectedModule(data?.module || null);
    setSelectedAssignment(data?.assignment || null);
    setSelectedAssessment(data?.assessment || null);
    setFormData(data?.initialData || {});
    setFormStep(0);
    setActiveModal(type);
  };

  const closeModal = () => {
    closeModalAnimation();
    setTimeout(() => {
      setActiveModal(null);
      setFormData({});
      setFormStep(0);
      setSelectedModule(null);
      setSelectedAssignment(null);
      setSelectedAssessment(null);
    }, 200);
  };

  // Form handlers
  const handleModuleSubmit = async () => {
    try {
      if (!formData.moduleName || !formData.moduleCode || !formData.credits) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const moduleData = {
        moduleName: formData.moduleName,
        moduleCode: formData.moduleCode,
        credits: Number(formData.credits),
        lecturerName: formData.lecturerName || '',
        semester: formData.semester || currentSemester,
        color: formData.color || getRandomColor(),
        targetGrade: formData.targetGrade || 'A',
        currentGrade: formData.currentGrade || 'F',
      };

      if (selectedModule) {
        await updateModule(selectedModule.id, moduleData);
      } else {
        await addModule(moduleData);
      }

      closeModal();
      await loadData();
      Alert.alert('Success', `Module ${selectedModule ? 'updated' : 'added'} successfully`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAssignmentSubmit = async () => {
    try {
      if (!formData.title || !formData.moduleId || !formData.dueDate) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const assignmentData = {
        title: formData.title,
        dueDate: formData.dueDate,
        weightPercentage: Number(formData.weightPercentage) || 0,
        marksObtained: Number(formData.marksObtained) || 0,
        totalMarks: Number(formData.totalMarks) || 100,
        status: formData.status || 'pending',
        description: formData.description || '',
      };

      const moduleId = formData.moduleId || selectedModule?.id;

      if (selectedAssignment) {
        await updateAssignment(moduleId, selectedAssignment.id, assignmentData);
      } else {
        await addAssignment(moduleId, assignmentData);
      }

      closeModal();
      await loadData();
      Alert.alert('Success', `Assignment ${selectedAssignment ? 'updated' : 'added'} successfully`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAssessmentSubmit = async () => {
    try {
      if (!formData.title || !formData.moduleId || !formData.date) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const assessmentData = {
        title: formData.title,
        type: formData.type || 'exam',
        date: formData.date,
        weightPercentage: Number(formData.weightPercentage) || 0,
        estimatedGrade: formData.estimatedGrade || 'B',
        actualGrade: formData.actualGrade || null,
        priority: formData.priority || 'medium',
        studyHours: Number(formData.studyHours) || 0,
        notes: formData.notes || '',
      };

      const moduleId = formData.moduleId || selectedModule?.id;

      if (selectedAssessment) {
        await updateAssessment(moduleId, selectedAssessment.id, assessmentData);
      } else {
        await addAssessment(moduleId, assessmentData);
      }

      closeModal();
      await loadData();
      Alert.alert('Success', `Assessment ${selectedAssessment ? 'updated' : 'added'} successfully`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleMarksUpdate = async () => {
    try {
      if (!formData.grade || !selectedModule) return;

      await updateModule(selectedModule.id, {
        currentGrade: formData.grade,
      });

      closeModal();
      await loadData();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
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
          },
        },
      ]
    );
  };

  const handleDeleteAssignment = (moduleId, assignment) => {
    Alert.alert(
      'Delete Assignment',
      `Are you sure you want to delete "${assignment.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAssignment(moduleId, assignment.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleSimulateGPA = async () => {
    try {
      const result = await simulateGPA(simulationGrades);
      Alert.alert(
        'GPA Simulation Result',
        `Current GPA: ${result.currentGPA.toFixed(2)}\n` +
        `Simulated GPA: ${result.simulatedGPA.toFixed(2)}\n` +
        `Difference: ${result.difference > 0 ? '+' : ''}${result.difference.toFixed(2)}\n` +
        `${result.isImprovement ? '📈 Improvement!' : '📉 Decrease'}`,
        [{ text: 'OK' }]
      );
      closeModal();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Helper functions
  const getRandomColor = () => {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getDaysUntil = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAssignmentStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'submitted': return COLORS.primary;
      case 'overdue': return COLORS.danger;
      case 'pending': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const getGradeColor = (grade) => {
    return GRADE_COLORS[grade] || COLORS.textMuted;
  };

  // Derived data
  const upcomingDeadlines = useMemo(() => {
    if (!modules.length) return [];
    
    const deadlines = [];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    modules.forEach((module) => {
      (module.assignments || []).forEach((assignment) => {
        const dueDate = new Date(assignment.dueDate);
        if (dueDate <= weekFromNow && assignment.status !== 'completed') {
          deadlines.push({
            ...assignment,
            moduleName: module.moduleName,
            moduleCode: module.moduleCode,
            moduleColor: module.color,
            type: 'assignment',
            daysUntil: getDaysUntil(assignment.dueDate),
          });
        }
      });

      (module.assessments || []).forEach((assessment) => {
        const examDate = new Date(assessment.date);
        if (examDate <= weekFromNow) {
          deadlines.push({
            ...assessment,
            moduleName: module.moduleName,
            moduleCode: module.moduleCode,
            moduleColor: module.color,
            type: 'assessment',
            daysUntil: getDaysUntil(assessment.date),
          });
        }
      });
    });

    return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [modules]);

  const atRiskModules = useMemo(() => {
    if (!analytics) return [];
    return analytics.atRiskModules || [];
  }, [analytics]);

  const completionRate = useMemo(() => {
    if (!insights) return 0;
    return insights.completionRate || 0;
  }, [insights]);

  // Filter and sort assignments
  const filteredAssignments = useMemo(() => {
    let allAssignments = [];
    
    modules.forEach((module) => {
      (module.assignments || []).forEach((assignment) => {
        allAssignments.push({
          ...assignment,
          moduleName: module.moduleName,
          moduleCode: module.moduleCode,
          moduleColor: module.color,
          moduleId: module.id,
        });
      });
    });

    // Apply filters
    if (filterStatus !== 'all') {
      allAssignments = allAssignments.filter((a) => a.status === filterStatus);
    }

    if (searchQuery) {
      allAssignments = allAssignments.filter((a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'date':
        allAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        break;
      case 'status':
        allAssignments.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'weight':
        allAssignments.sort((a, b) => (b.weightPercentage || 0) - (a.weightPercentage || 0));
        break;
      default:
        break;
    }

    return allAssignments;
  }, [modules, filterStatus, sortBy, searchQuery]);

  // Render empty state
  const renderEmptyState = () => (
    <Animated.View 
      entering={FadeInDown.delay(300).springify()}
      style={styles.emptyStateContainer}
    >
      <LinearGradient
        colors={COLORS.gradient1}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.emptyStateIcon}
      >
        <GraduationCap size={64} color="#FFFFFF" />
      </LinearGradient>

      <Animated.Text 
        entering={FadeInUp.delay(500).springify()}
        style={styles.emptyStateTitle}
      >
        No Modules Added Yet
      </Animated.Text>

      <Animated.Text 
        entering={FadeInUp.delay(700).springify()}
        style={styles.emptyStateSubtitle}
      >
        Your academic journey starts here!{'\n'}
        Add your modules to unlock powerful GPA tracking,{'\n'}
        assignment management, and smart analytics.
      </Animated.Text>

      <Animated.Text 
        entering={FadeInUp.delay(900).springify()}
        style={styles.emptyStateMotivation}
      >
        "The future belongs to those who believe{'\n'}
        in the beauty of their dreams." ✨
      </Animated.Text>

      <Animated.View entering={ZoomIn.delay(1100).springify()}>
        <TouchableOpacity
          style={styles.addModuleButton}
          onPress={() => openModal('module')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={COLORS.gradient1}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addModuleButtonGradient}
          >
            <Plus size={24} color="#FFFFFF" />
            <Text style={styles.addModuleButtonText}>Add Your First Module</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );

  // Render quick stats
  const renderQuickStats = () => (
    <Animated.View 
      entering={FadeInDown.delay(200).springify()}
      style={styles.quickStatsContainer}
    >
      <Animated.View entering={FadeInRight.delay(300).springify()} style={[styles.statCard, { flex: 1 }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.primary + '20' }]}>
          <Star size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.statLabel}>Current GPA</Text>
        <Text style={styles.statValue}>{gpa.toFixed(2)}</Text>
      </Animated.View>

      <Animated.View entering={FadeInRight.delay(400).springify()} style={[styles.statCard, { flex: 1 }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.secondary + '20' }]}>
          <BookOpen size={20} color={COLORS.secondary} />
        </View>
        <Text style={styles.statLabel}>Modules</Text>
        <Text style={styles.statValue}>{modules.length}</Text>
      </Animated.View>

      <Animated.View entering={FadeInRight.delay(500).springify()} style={[styles.statCard, { flex: 1 }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.success + '20' }]}>
          <CheckCircle2 size={20} color={COLORS.success} />
        </View>
        <Text style={styles.statLabel}>Completed</Text>
        <Text style={styles.statValue}>{completionRate}%</Text>
      </Animated.View>

      <Animated.View entering={FadeInRight.delay(600).springify()} style={[styles.statCard, { flex: 1 }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.danger + '20' }]}>
          <AlertTriangle size={20} color={COLORS.danger} />
        </View>
        <Text style={styles.statLabel}>At Risk</Text>
        <Text style={[styles.statValue, { color: atRiskModules.length > 0 ? COLORS.danger : COLORS.text }]}>
          {atRiskModules.length}
        </Text>
      </Animated.View>
    </Animated.View>
  );

  // Render GPA card
  const renderGPACard = () => (
    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.gpaCard}>
      <BlurView intensity={30} tint="light" style={styles.gpaCardBlur}>
        <View style={styles.gpaCardHeader}>
          <View>
            <Text style={styles.gpaCardTitle}>GPA Overview</Text>
            <Text style={styles.gpaCardSubtitle}>Semester {currentSemester}</Text>
          </View>
          <TouchableOpacity
            style={styles.gpaDetailsButton}
            onPress={() => openModal('gpa')}
          >
            <Text style={styles.gpaDetailsButtonText}>Details</Text>
            <ChevronRight size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.gpaMainContainer}>
          {/* GPA Ring */}
          <View style={styles.gpaRingContainer}>
            <View style={styles.gpaRing}>
              <LinearGradient
                colors={gpa >= 3.0 ? COLORS.gradient2 : COLORS.gradient3}
                style={styles.gpaRingInner}
              >
                <Text style={styles.gpaRingValue}>{gpa.toFixed(2)}</Text>
              </LinearGradient>
            </View>
            <View style={styles.gpaRingLabels}>
              <View style={styles.gpaRingLabel}>
                <Circle size={8} color={COLORS.primary} fill={COLORS.primary} />
                <Text style={styles.gpaRingLabelText}>Current</Text>
              </View>
              <View style={styles.gpaRingLabel}>
                <Circle size={8} color={COLORS.secondary} fill={COLORS.secondary} />
                <Text style={styles.gpaRingLabelText}>Target: 3.5</Text>
              </View>
            </View>
          </View>

          {/* GPA Stats */}
          <View style={styles.gpaStatsContainer}>
            <View style={styles.gpaStat}>
              <Text style={styles.gpaStatLabel}>Total Credits</Text>
              <Text style={styles.gpaStatValue}>{totalCredits}</Text>
            </View>
            <View style={styles.gpaStatDivider} />
            <View style={styles.gpaStat}>
              <Text style={styles.gpaStatLabel}>Predicted</Text>
              <Text style={styles.gpaStatValue}>
                {analytics?.predictedGPA?.toFixed(2) || gpa.toFixed(2)}
              </Text>
            </View>
            <View style={styles.gpaStatDivider} />
            <View style={styles.gpaStat}>
              <Text style={styles.gpaStatLabel}>Trend</Text>
              <View style={styles.gpaTrend}>
                {gpa >= 3.0 ? (
                  <TrendingUp size={16} color={COLORS.success} />
                ) : (
                  <TrendingDown size={16} color={COLORS.danger} />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Grade Distribution */}
        {analytics?.gradeDistribution && (
          <View style={styles.gradeDistribution}>
            <Text style={styles.gradeDistributionTitle}>Grade Distribution</Text>
            <View style={styles.gradeDistributionBars}>
              {Object.entries(analytics.gradeDistribution).map(([grade, count], index) => (
                <Animated.View
                  key={grade}
                  entering={FadeInLeft.delay(600 + index * 100).springify()}
                  style={styles.gradeBar}
                >
                  <View style={styles.gradeBarLabel}>
                    <Text style={[styles.gradeBarGrade, { color: getGradeColor(grade) }]}>
                      {grade}
                    </Text>
                    <Text style={styles.gradeBarCount}>{count}</Text>
                  </View>
                  <View style={styles.gradeBarTrack}>
                    <Animated.View
                      style={[
                        styles.gradeBarFill,
                        {
                          width: `${(count / modules.length) * 100}%`,
                          backgroundColor: getGradeColor(grade),
                        },
                      ]}
                    />
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        )}
      </BlurView>
    </Animated.View>
  );

  // Render upcoming deadlines
  const renderUpcomingDeadlines = () => (
    <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.deadlinesCard}>
      <BlurView intensity={30} tint="light" style={styles.cardBlur}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Clock size={20} color={COLORS.warning} />
            <Text style={styles.cardTitle}>Upcoming Deadlines</Text>
          </View>
          {upcomingDeadlines.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{upcomingDeadlines.length}</Text>
            </View>
          )}
        </View>

        {upcomingDeadlines.length === 0 ? (
          <View style={styles.emptyCard}>
            <CheckCircle2 size={32} color={COLORS.success} />
            <Text style={styles.emptyCardText}>No upcoming deadlines!</Text>
            <Text style={styles.emptyCardSubtext}>You're all caught up 🎉</Text>
          </View>
        ) : (
          upcomingDeadlines.slice(0, 4).map((deadline, index) => (
            <Animated.View
              key={deadline.id || index}
              entering={FadeInRight.delay(600 + index * 100).springify()}
              style={styles.deadlineItem}
            >
              <View style={[styles.deadlineDot, { backgroundColor: deadline.moduleColor }]} />
              <View style={styles.deadlineInfo}>
                <Text style={styles.deadlineTitle} numberOfLines={1}>
                  {deadline.title}
                </Text>
                <Text style={styles.deadlineModule} numberOfLines={1}>
                  {deadline.moduleName} • {deadline.type}
                </Text>
              </View>
              <View style={[
                styles.deadlineTime,
                deadline.daysUntil < 0 && styles.deadlineOverdue,
                deadline.daysUntil === 0 && styles.deadlineToday,
              ]}>
                <Text style={[
                  styles.deadlineDays,
                  deadline.daysUntil < 0 && styles.deadlineOverdueText,
                ]}>
                  {deadline.daysUntil < 0
                    ? `${Math.abs(deadline.daysUntil)}d ago`
                    : deadline.daysUntil === 0
                    ? 'Today'
                    : `${deadline.daysUntil}d`}
                </Text>
              </View>
            </Animated.View>
          ))
        )}
      </BlurView>
    </Animated.View>
  );

  // Render module performance
  const renderModulePerformance = () => (
    <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.modulesCard}>
      <BlurView intensity={30} tint="light" style={styles.cardBlur}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <BookOpen size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Module Performance</Text>
          </View>
          <TouchableOpacity onPress={() => openModal('module')}>
            <Plus size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {modules.map((module, index) => (
          <Animated.View
            key={module.id}
            entering={FadeInRight.delay(700 + index * 100).springify()}
            style={styles.moduleItem}
          >
            <View style={styles.moduleItemHeader}>
              <View style={styles.moduleItemLeft}>
                <View style={[styles.moduleColor, { backgroundColor: module.color }]} />
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleName} numberOfLines={1}>
                    {module.moduleName}
                  </Text>
                  <Text style={styles.moduleCode}>
                    {module.moduleCode} • {module.credits} credits
                  </Text>
                </View>
              </View>
              <View style={styles.moduleItemRight}>
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
                <TouchableOpacity
                  style={styles.moduleActions}
                  onPress={() => {
                    Alert.alert(
                      'Module Actions',
                      `What would you like to do with ${module.moduleName}?`,
                      [
                        {
                          text: 'Update Grade',
                          onPress: () => openModal('marks', { module }),
                        },
                        {
                          text: 'Add Assignment',
                          onPress: () => openModal('assignment', { module }),
                        },
                        {
                          text: 'Add Assessment',
                          onPress: () => openModal('assessment', { module }),
                        },
                        {
                          text: 'Edit Module',
                          onPress: () => openModal('module', { module, initialData: module }),
                        },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => handleDeleteModule(module),
                        },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <MoreVertical size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Module progress bar */}
            <View style={styles.moduleProgress}>
              <View style={styles.moduleProgressBar}>
                <View
                  style={[
                    styles.moduleProgressFill,
                    {
                      width: `${((module.assignments || []).filter(a => a.status === 'completed').length / 
                        Math.max((module.assignments || []).length, 1)) * 100}%`,
                      backgroundColor: module.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.moduleProgressText}>
                {((module.assignments || []).filter(a => a.status === 'completed').length)}/
                {(module.assignments || []).length} assignments
              </Text>
            </View>
          </Animated.View>
        ))}
      </BlurView>
    </Animated.View>
  );

  // Render assignments list with filters
  const renderAssignments = () => (
    <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.assignmentsCard}>
      <BlurView intensity={30} tint="light" style={styles.cardBlur}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <FileText size={20} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Assignments</Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Filter size={20} color={showFilters ? COLORS.primary : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <Animated.View entering={SlideInDown} style={styles.filtersContainer}>
            <View style={styles.searchContainer}>
              <Search size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search assignments..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['all', 'pending', 'submitted', 'completed', 'overdue'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    filterStatus === status && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterStatus === status && styles.filterChipTextActive,
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {filteredAssignments.slice(0, 5).map((assignment, index) => (
          <Animated.View
            key={assignment.id}
            entering={FadeInRight.delay(800 + index * 100).springify()}
            style={styles.assignmentItem}
          >
            <View style={[
              styles.assignmentStatus,
              { backgroundColor: getAssignmentStatusColor(assignment.status) + '20' }
            ]}>
              <Circle
                size={8}
                color={getAssignmentStatusColor(assignment.status)}
                fill={getAssignmentStatusColor(assignment.status)}
              />
            </View>
            <View style={styles.assignmentInfo}>
              <Text style={styles.assignmentTitle} numberOfLines={1}>
                {assignment.title}
              </Text>
              <Text style={styles.assignmentMeta}>
                {assignment.moduleName} • Due {new Date(assignment.dueDate).toLocaleDateString()}
              </Text>
              {assignment.marksObtained > 0 && (
                <Text style={styles.assignmentMarks}>
                  {assignment.marksObtained}/{assignment.totalMarks} marks
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.assignmentEdit}
              onPress={() => openModal('assignment', {
                module: { id: assignment.moduleId },
                assignment,
                initialData: assignment,
              })}
            >
              <Edit3 size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </Animated.View>
        ))}

        {filteredAssignments.length > 5 && (
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>
              Show {filteredAssignments.length - 5} more
            </Text>
          </TouchableOpacity>
        )}
      </BlurView>
    </Animated.View>
  );

  // Render modal content based on type
  const renderModalContent = () => {
    switch (activeModal) {
      case 'module':
        return renderModuleModal();
      case 'assignment':
        return renderAssignmentModal();
      case 'assessment':
        return renderAssessmentModal();
      case 'gpa':
        return renderGPADetailsModal();
      case 'simulation':
        return renderSimulationModal();
      case 'marks':
        return renderMarksModal();
      default:
        return null;
    }
  };

  // Module Modal
  const renderModuleModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {selectedModule ? 'Edit Module' : 'Add New Module'}
        </Text>
        <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.inputLabel}>Module Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Introduction to Computer Science"
          placeholderTextColor={COLORS.textMuted}
          value={formData.moduleName || ''}
          onChangeText={(text) => setFormData({ ...formData, moduleName: text })}
        />

        <Text style={styles.inputLabel}>Module Code *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., CS101"
          placeholderTextColor={COLORS.textMuted}
          value={formData.moduleCode || ''}
          onChangeText={(text) => setFormData({ ...formData, moduleCode: text })}
        />

        <View style={styles.inputRow}>
          <View style={[styles.inputHalf, { marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Credits *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 3"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={formData.credits?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, credits: text })}
            />
          </View>
          <View style={[styles.inputHalf, { marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Target Grade</Text>
            <View style={styles.gradeSelector}>
              {['A', 'B', 'C', 'D'].map((grade) => (
                <TouchableOpacity
                  key={grade}
                  style={[
                    styles.gradeOption,
                    formData.targetGrade === grade && styles.gradeOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, targetGrade: grade })}
                >
                  <Text style={[
                    styles.gradeOptionText,
                    formData.targetGrade === grade && styles.gradeOptionTextActive,
                  ]}>
                    {grade}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.inputLabel}>Lecturer Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Dr. Smith"
          placeholderTextColor={COLORS.textMuted}
          value={formData.lecturerName || ''}
          onChangeText={(text) => setFormData({ ...formData, lecturerName: text })}
        />

        <Text style={styles.inputLabel}>Module Color</Text>
        <View style={styles.colorSelector}>
          {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'].map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                formData.color === color && styles.colorOptionActive,
              ]}
              onPress={() => setFormData({ ...formData, color })}
            />
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.submitButton} onPress={handleModuleSubmit}>
        <LinearGradient
          colors={COLORS.gradient1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitButtonGradient}
        >
          <Text style={styles.submitButtonText}>
            {selectedModule ? 'Update Module' : 'Add Module'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Assignment Modal
  const renderAssignmentModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {selectedAssignment ? 'Edit Assignment' : 'Add Assignment'}
        </Text>
        <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.inputLabel}>Assignment Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Week 5 Problem Set"
          placeholderTextColor={COLORS.textMuted}
          value={formData.title || ''}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />

        <Text style={styles.inputLabel}>Module *</Text>
        {!selectedModule ? (
          <View style={styles.moduleSelector}>
            {modules.map((module) => (
              <TouchableOpacity
                key={module.id}
                style={[
                  styles.moduleOption,
                  formData.moduleId === module.id && styles.moduleOptionActive,
                ]}
                onPress={() => setFormData({ ...formData, moduleId: module.id })}
              >
                <View style={[styles.moduleOptionColor, { backgroundColor: module.color }]} />
                <Text style={[
                  styles.moduleOptionText,
                  formData.moduleId === module.id && styles.moduleOptionTextActive,
                ]}>
                  {module.moduleName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.selectedModule}>
            <View style={[styles.moduleOptionColor, { backgroundColor: selectedModule.color }]} />
            <Text style={styles.selectedModuleText}>{selectedModule.moduleName}</Text>
          </View>
        )}

        <Text style={styles.inputLabel}>Due Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={formData.dueDate || ''}
          onChangeText={(text) => setFormData({ ...formData, dueDate: text })}
        />

        <View style={styles.inputRow}>
          <View style={[styles.inputHalf, { marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Marks Obtained</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={formData.marksObtained?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, marksObtained: text })}
            />
          </View>
          <View style={[styles.inputHalf, { marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Total Marks</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={formData.totalMarks?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, totalMarks: text })}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Status</Text>
        <View style={styles.statusSelector}>
          {['pending', 'submitted', 'completed', 'overdue'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                formData.status === status && styles.statusOptionActive,
                { borderColor: getAssignmentStatusColor(status) },
              ]}
              onPress={() => setFormData({ ...formData, status })}
            >
              <Text style={[
                styles.statusOptionText,
                formData.status === status && styles.statusOptionTextActive,
                { color: getAssignmentStatusColor(status) },
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.submitButton} onPress={handleAssignmentSubmit}>
        <LinearGradient
          colors={COLORS.gradient1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitButtonGradient}
        >
          <Text style={styles.submitButtonText}>
            {selectedAssignment ? 'Update Assignment' : 'Add Assignment'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Assessment Modal
  const renderAssessmentModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {selectedAssessment ? 'Edit Assessment' : 'Add Assessment'}
        </Text>
        <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.inputLabel}>Assessment Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Midterm Exam"
          placeholderTextColor={COLORS.textMuted}
          value={formData.title || ''}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />

        <Text style={styles.inputLabel}>Type</Text>
        <View style={styles.typeSelector}>
          {['exam', 'quiz', 'test', 'presentation', 'practical'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeOption,
                formData.type === type && styles.typeOptionActive,
              ]}
              onPress={() => setFormData({ ...formData, type })}
            >
              <Text style={[
                styles.typeOptionText,
                formData.type === type && styles.typeOptionTextActive,
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={formData.date || ''}
          onChangeText={(text) => setFormData({ ...formData, date: text })}
        />

        <Text style={styles.inputLabel}>Estimated Grade</Text>
        <View style={styles.gradeSelector}>
          {['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'].map((grade) => (
            <TouchableOpacity
              key={grade}
              style={[
                styles.gradeOptionSmall,
                formData.estimatedGrade === grade && styles.gradeOptionActive,
              ]}
              onPress={() => setFormData({ ...formData, estimatedGrade: grade })}
            >
              <Text style={[
                styles.gradeOptionTextSmall,
                formData.estimatedGrade === grade && styles.gradeOptionTextActive,
              ]}>
                {grade}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Priority</Text>
        <View style={styles.prioritySelector}>
          {[
            { value: 'high', color: COLORS.danger, icon: Flag },
            { value: 'medium', color: COLORS.warning, icon: Flag },
            { value: 'low', color: COLORS.success, icon: Flag },
          ].map((priority) => (
            <TouchableOpacity
              key={priority.value}
              style={[
                styles.priorityOption,
                formData.priority === priority.value && styles.priorityOptionActive,
                { borderColor: priority.color },
              ]}
              onPress={() => setFormData({ ...formData, priority: priority.value })}
            >
              <priority.icon size={16} color={priority.color} />
              <Text style={[
                styles.priorityOptionText,
                { color: priority.color },
              ]}>
                {priority.value.charAt(0).toUpperCase() + priority.value.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.submitButton} onPress={handleAssessmentSubmit}>
        <LinearGradient
          colors={COLORS.gradient1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitButtonGradient}
        >
          <Text style={styles.submitButtonText}>
            {selectedAssessment ? 'Update Assessment' : 'Add Assessment'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // GPA Details Modal
  const renderGPADetailsModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>GPA Details</Text>
        <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <View style={styles.gpaDetailGrid}>
          <View style={styles.gpaDetailCard}>
            <Text style={styles.gpaDetailLabel}>Current GPA</Text>
            <Text style={styles.gpaDetailValue}>{gpa.toFixed(2)}</Text>
          </View>
          <View style={styles.gpaDetailCard}>
            <Text style={styles.gpaDetailLabel}>Total Credits</Text>
            <Text style={styles.gpaDetailValue}>{totalCredits}</Text>
          </View>
          <View style={styles.gpaDetailCard}>
            <Text style={styles.gpaDetailLabel}>Target GPA</Text>
            <Text style={styles.gpaDetailValue}>3.50</Text>
          </View>
          <View style={styles.gpaDetailCard}>
            <Text style={styles.gpaDetailLabel}>Points Needed</Text>
            <Text style={[styles.gpaDetailValue, { color: COLORS.primary }]}>
              {Math.max(0, (3.5 * totalCredits - (gpa * totalCredits)).toFixed(1))}
            </Text>
          </View>
        </View>

        {analytics?.requiredGrades && Object.keys(analytics.requiredGrades).length > 0 && (
          <View style={styles.requiredGrades}>
            <Text style={styles.requiredGradesTitle}>Required Grades for Target GPA</Text>
            {modules.map((module) => (
              <View key={module.id} style={styles.requiredGradeItem}>
                <View style={[styles.moduleColor, { backgroundColor: module.color }]} />
                <Text style={styles.requiredGradeModule}>{module.moduleName}</Text>
                <View style={[
                  styles.requiredGradeBadge,
                  { backgroundColor: getGradeColor(analytics.requiredGrades[module.id]) + '20' }
                ]}>
                  <Text style={[
                    styles.requiredGradeText,
                    { color: getGradeColor(analytics.requiredGrades[module.id]) }
                  ]}>
                    {analytics.requiredGrades[module.id]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.simulateButton}
          onPress={() => {
            closeModal();
            setTimeout(() => {
              setSimulationGrades({});
              modules.forEach((module) => {
                setSimulationGrades((prev) => ({
                  ...prev,
                  [module.id]: module.currentGrade,
                }));
              });
              openModal('simulation');
            }, 300);
          }}
        >
          <Text style={styles.simulateButtonText}>What-If Grade Simulation</Text>
          <ChevronRight size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Grade Simulation Modal
  const renderSimulationModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Grade Simulation</Text>
        <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.simulationInfo}>
          Adjust your grades to see how they would affect your GPA
        </Text>

        {modules.map((module) => (
          <View key={module.id} style={styles.simulationItem}>
            <View style={styles.simulationModuleInfo}>
              <View style={[styles.moduleColor, { backgroundColor: module.color }]} />
              <View>
                <Text style={styles.simulationModuleName}>{module.moduleName}</Text>
                <Text style={styles.simulationModuleCredits}>{module.credits} credits</Text>
              </View>
            </View>
            <View style={styles.simulationGrades}>
              {Object.keys(GRADE_COLORS).slice(0, 8).map((grade) => (
                <TouchableOpacity
                  key={grade}
                  style={[
                    styles.simulationGradeOption,
                    simulationGrades[module.id] === grade && styles.simulationGradeOptionActive,
                  ]}
                  onPress={() => setSimulationGrades({
                    ...simulationGrades,
                    [module.id]: grade,
                  })}
                >
                  <Text style={[
                    styles.simulationGradeText,
                    simulationGrades[module.id] === grade && styles.simulationGradeTextActive,
                  ]}>
                    {grade}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.submitButton} onPress={handleSimulateGPA}>
        <LinearGradient
          colors={COLORS.gradient1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitButtonGradient}
        >
          <Text style={styles.submitButtonText}>Simulate GPA</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Marks Update Modal
  const renderMarksModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Update Grade</Text>
        <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.modalBody}>
        {selectedModule && (
          <View style={styles.marksModuleInfo}>
            <View style={[styles.moduleColor, { backgroundColor: selectedModule.color }]} />
            <Text style={styles.marksModuleName}>{selectedModule.moduleName}</Text>
          </View>
        )}

        <Text style={styles.inputLabel}>Select Grade</Text>
        <View style={styles.marksGrid}>
          {Object.keys(GRADE_COLORS).map((grade) => (
            <TouchableOpacity
              key={grade}
              style={[
                styles.markOption,
                formData.grade === grade && styles.markOptionActive,
              ]}
              onPress={() => setFormData({ ...formData, grade })}
            >
              <Text style={[
                styles.markOptionText,
                formData.grade === grade && styles.markOptionTextActive,
                { color: getGradeColor(grade) },
              ]}>
                {grade}
              </Text>
              <Text style={styles.markOptionPoints}>
                {GRADE_COLORS[grade].toFixed(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleMarksUpdate}>
        <LinearGradient
          colors={COLORS.gradient1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitButtonGradient}
        >
          <Text style={styles.submitButtonText}>Update Grade</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Main render
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.headerSubtitle}>
            {modules.length > 0
              ? `Managing ${modules.length} modules this semester`
              : 'Ready to start your academic journey'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.semesterSelector}>
            <Calendar size={18} color={COLORS.textSecondary} />
            <Text style={styles.semesterText}>{currentSemester}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openModal('module')}
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
        </View>
      </Animated.View>

      {/* Content */}
      {modules.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {renderQuickStats()}
          {renderGPACard()}
          {renderUpcomingDeadlines()}
          {renderModulePerformance()}
          {renderAssignments()}

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Modal */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={closeModal}
            activeOpacity={1}
          />
          <Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
            {renderModalContent()}
          </Animated.View>
        </View>
      </Modal>
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
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  semesterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  semesterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
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

  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateMotivation: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 40,
  },
  addModuleButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addModuleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  addModuleButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Quick Stats
  quickStatsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  // Cards
  gpaCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  deadlinesCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  modulesCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  assignmentsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardBlur: {
    padding: CARD_PADDING,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  gpaCardBlur: {
    padding: CARD_PADDING,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },

  // GPA Card
  gpaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  gpaCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  gpaCardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  gpaDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 10,
  },
  gpaDetailsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  gpaMainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  gpaRingContainer: {
    flex: 1,
    alignItems: 'center',
  },
  gpaRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    backgroundColor: COLORS.borderLight,
    marginBottom: 12,
  },
  gpaRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  gpaRingValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  gpaRingLabels: {
    flexDirection: 'row',
    gap: 12,
  },
  gpaRingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpaRingLabelText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  gpaStatsContainer: {
    flex: 1,
    gap: 12,
  },
  gpaStat: {
    marginBottom: 4,
  },
  gpaStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  gpaStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  gpaStatDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 8,
  },
  gpaTrend: {
    marginTop: 4,
  },

  // Grade Distribution
  gradeDistribution: {
    marginTop: 4,
  },
  gradeDistributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  gradeDistributionBars: {
    gap: 8,
  },
  gradeBar: {
    gap: 4,
  },
  gradeBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  gradeBarGrade: {
    fontSize: 12,
    fontWeight: '700',
  },
  gradeBarCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  gradeBarTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gradeBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Deadlines
  badge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warning,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptyCardSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  deadlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  deadlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  deadlineModule: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deadlineTime: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.warning + '10',
    borderRadius: 8,
  },
  deadlineOverdue: {
    backgroundColor: COLORS.danger + '10',
  },
  deadlineToday: {
    backgroundColor: COLORS.primary + '10',
  },
  deadlineDays: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warning,
  },
  deadlineOverdueText: {
    color: COLORS.danger,
  },

  // Module Performance
  moduleItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  moduleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  moduleColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  moduleCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  moduleItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleGrade: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moduleGradeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  moduleActions: {
    padding: 4,
  },
  moduleProgress: {
    gap: 6,
  },
  moduleProgressBar: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  moduleProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  moduleProgressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Assignments
  filtersContainer: {
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  assignmentStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  assignmentMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  assignmentMarks: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  assignmentEdit: {
    padding: 4,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  modalContent: {
    padding: CARD_PADDING,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    marginBottom: 20,
  },

  // Form Inputs
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputHalf: {
    flex: 1,
  },
  gradeSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  gradeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  gradeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  gradeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  gradeOptionTextActive: {
    color: '#FFFFFF',
  },
  gradeOptionSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  gradeOptionTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  colorSelector: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: COLORS.text,
  },
  moduleSelector: {
    gap: 8,
  },
  moduleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  moduleOptionActive: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  moduleOptionColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moduleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  moduleOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectedModule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
  },
  selectedModuleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
  },
  statusOptionActive: {
    borderWidth: 2,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusOptionTextActive: {
    fontWeight: '700',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
  },
  priorityOptionActive: {
    borderWidth: 2,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // GPA Details Modal
  gpaDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gpaDetailCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  gpaDetailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  gpaDetailValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  requiredGrades: {
    marginTop: 8,
  },
  requiredGradesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  requiredGradeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  requiredGradeModule: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  requiredGradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredGradeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '10',
  },
  simulateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Simulation Modal
  simulationInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  simulationItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  simulationModuleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  simulationModuleName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  simulationModuleCredits: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  simulationGrades: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  simulationGradeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  simulationGradeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  simulationGradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  simulationGradeTextActive: {
    color: '#FFFFFF',
  },

  // Marks Modal
  marksModuleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  marksModuleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  marksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  markOption: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  markOptionActive: {
    borderWidth: 2,
    backgroundColor: COLORS.primary + '10',
  },
  markOptionText: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  markOptionTextActive: {
    fontWeight: '800',
  },
  markOptionPoints: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Submit Button
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AcademicPlannerScreen;