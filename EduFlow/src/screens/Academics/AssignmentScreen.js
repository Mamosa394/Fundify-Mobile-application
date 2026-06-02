// src/screens/AcademicPlanner/AssignmentScreen.js

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import {
  FileText,
  Plus,
  Filter,
  Search,
  Edit3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import AssignmentModal from './components/AssignmentModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surfaceGlass: 'rgba(255, 255, 255, 0.92)',
  surfaceGlassBorder: 'rgba(255, 255, 255, 0.95)',
  primary: '#475569',
  primaryDark: '#334155',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#DC2626',
  border: '#CBD5E1',
  white: '#FFFFFF',
};

// 3D Assignment Object
function AssignmentObject({ count }) {
  const groupRef = React.useRef();
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.4;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.15;
    }
  });

  return (
    <>
      <ambientLight intensity={1.2} />
      <pointLight position={[5, 5, 5]} intensity={1.5} />
      <group ref={groupRef}>
        {[...Array(Math.min(count, 6))].map((_, i) => (
          <mesh
            key={i}
            position={[
              Math.sin(i * 1.2) * 1.2,
              (i - 1.5) * 0.35,
              Math.cos(i * 1.2) * 0.8,
            ]}
            rotation={[i * 0.3, i * 0.5, 0]}
          >
            <boxGeometry args={[0.5, 0.08, 0.35]} />
            <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.2} />
          </mesh>
        ))}
        <mesh>
          <torusGeometry args={[1.5, 0.03, 16, 60]} />
          <meshBasicMaterial color="#CBD5E1" transparent opacity={0.3} />
        </mesh>
      </group>
    </>
  );
}

const AssignmentScreen = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedModuleForAssignment, setSelectedModuleForAssignment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  const {
    modules,
    fetchModules,
    fetchAnalytics,
    fetchInsights,
    deleteAssignment,
  } = useAcademicStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchModules(), fetchAnalytics(), fetchInsights()]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'submitted': return COLORS.primary;
      case 'overdue': return COLORS.danger;
      case 'pending': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const getDaysUntil = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleEditAssignment = (assignment) => {
    const module = modules.find(m => m.id === assignment.moduleId);
    setSelectedModuleForAssignment(module || { id: assignment.moduleId });
    setSelectedAssignment(assignment);
    setShowModal(true);
  };

  const handleAddAssignment = () => {
    setSelectedModuleForAssignment(null);
    setSelectedAssignment(null);
    setShowModal(true);
  };

  const handleDeleteAssignment = (moduleId, assignment) => {
    Alert.alert(
      'Delete Assignment',
      `Delete "${assignment.title}"?`,
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

  const allAssignments = useMemo(() => {
    let assignments = [];
    
    modules.forEach((module) => {
      (module.assignments || []).forEach((assignment) => {
        assignments.push({
          ...assignment,
          moduleName: module.moduleName,
          moduleCode: module.moduleCode,
          moduleColor: module.color,
          moduleId: module.id,
        });
      });
    });

    if (filterStatus !== 'all') {
      assignments = assignments.filter((a) => a.status === filterStatus);
    }

    if (searchQuery) {
      assignments = assignments.filter((a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'date':
        assignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        break;
      case 'status':
        assignments.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'weight':
        assignments.sort((a, b) => (b.weightPercentage || 0) - (a.weightPercentage || 0));
        break;
    }

    return assignments;
  }, [modules, filterStatus, sortBy, searchQuery]);

  const stats = useMemo(() => {
    const total = allAssignments.length;
    const completed = allAssignments.filter(a => a.status === 'completed').length;
    const overdue = allAssignments.filter(a => a.status === 'overdue').length;
    const pending = allAssignments.filter(a => a.status === 'pending').length;
    return { total, completed, overdue, pending };
  }, [allAssignments]);

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Assignments</Text>
          <Text style={styles.subtitle}>{stats.total} total • {stats.completed} completed</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddAssignment} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.addBtnGrad}>
            <Plus size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 3D Canvas */}
        {allAssignments.length > 0 && (
          <View style={styles.canvasContainer}>
            {isFocused && (
              <Canvas dpr={1} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 4.5], fov: 45 }}>
                <AssignmentObject count={allAssignments.length} />
              </Canvas>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total', value: stats.total, color: COLORS.primary },
            { label: 'Done', value: stats.completed, color: COLORS.success },
            { label: 'Overdue', value: stats.overdue, color: COLORS.danger },
            { label: 'Pending', value: stats.pending, color: COLORS.warning },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Search & Filters */}
        <View style={styles.filterRow}>
          <View style={styles.searchBox}>
            <Search size={14} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
            <Filter size={16} color={showFilters ? COLORS.primary : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['all', 'pending', 'submitted', 'completed', 'overdue'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Assignment List */}
        {allAssignments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileText size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Assignments</Text>
            <Text style={styles.emptySubtitle}>
              {modules.length === 0 ? 'Add modules first' : 'Tap + to create one'}
            </Text>
          </View>
        ) : (
          allAssignments.map((assignment, index) => {
            const daysUntil = getDaysUntil(assignment.dueDate);
            const isOverdue = daysUntil < 0 && assignment.status !== 'completed';
            const statusColor = getStatusColor(assignment.status);
            
            return (
              <Animated.View key={assignment.id} entering={FadeInRight.delay(100 + index * 50)}>
                <View style={styles.assignmentCard}>
                  <View style={styles.assignmentTop}>
                    <View style={styles.assignmentLeft}>
                      <View style={[styles.moduleDot, { backgroundColor: assignment.moduleColor }]} />
                      <View>
                        <Text style={styles.assignmentTitle} numberOfLines={1}>{assignment.title}</Text>
                        <Text style={styles.assignmentModule}>{assignment.moduleName}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {assignment.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.assignmentMeta}>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={isOverdue ? COLORS.danger : COLORS.textSecondary} />
                      <Text style={[styles.metaText, isOverdue && { color: COLORS.danger }]}>
                        {isOverdue 
                          ? `${Math.abs(daysUntil)}d overdue`
                          : daysUntil === 0 
                          ? 'Due today' 
                          : `${daysUntil}d left`}
                      </Text>
                    </View>
                    {assignment.weightPercentage > 0 && (
                      <Text style={styles.metaWeight}>{assignment.weightPercentage}% weight</Text>
                    )}
                  </View>

                  {assignment.marksObtained > 0 && (
                    <View style={styles.marksRow}>
                      <View style={styles.marksBar}>
                        <View style={[styles.marksFill, { width: `${(assignment.marksObtained / assignment.totalMarks) * 100}%`, backgroundColor: statusColor }]} />
                      </View>
                      <Text style={styles.marksText}>{assignment.marksObtained}/{assignment.totalMarks}</Text>
                    </View>
                  )}

                  <View style={styles.assignmentActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => handleEditAssignment(assignment)}>
                      <Edit3 size={13} color={COLORS.primary} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteAssignment(assignment.moduleId, assignment)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AssignmentModal
        visible={showModal}
        module={selectedModuleForAssignment}
        assignment={selectedAssignment}
        onClose={() => {
          setShowModal(false);
          loadData();
        }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: CARD_PADDING,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 14,
  },
  title: {
    fontSize: 24,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnGrad: {
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: CARD_PADDING },

  // 3D Canvas
  canvasContainer: {
    width: SCREEN_WIDTH - CARD_PADDING * 2,
    height: 120,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    alignItems: 'center',
    gap: 2,
    shadowColor: COLORS.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'JosefinSans-Bold',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.text,
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersRow: {
    marginBottom: 12,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'JosefinSans-SemiBold',
    marginTop: 4,
  },

  // Assignment Card
  assignmentCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: COLORS.surfaceGlassBorder,
    padding: 14,
    marginBottom: 10,
    shadowColor: COLORS.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  assignmentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  assignmentLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  assignmentTitle: {
    fontSize: 14,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  assignmentModule: {
    fontSize: 11,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'JosefinSans-Bold',
    textTransform: 'capitalize',
  },
  assignmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'JosefinSans-SemiBold',
    color: COLORS.textSecondary,
  },
  metaWeight: {
    fontSize: 11,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.textMuted,
  },
  marksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  marksBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  marksFill: {
    height: '100%',
    borderRadius: 2,
  },
  marksText: {
    fontSize: 11,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.textSecondary,
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
  },
  editBtnText: {
    fontSize: 12,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.primary,
  },
  deleteBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.danger + '10',
  },
  deleteBtnText: {
    fontSize: 12,
    fontFamily: 'JosefinSans-Bold',
    color: COLORS.danger,
  },
});

export default AssignmentScreen;