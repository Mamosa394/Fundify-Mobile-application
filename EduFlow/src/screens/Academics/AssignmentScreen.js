// src/screens/Academics/AssignmentScreen.js

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
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
import { useGLTF } from '@react-three/drei/native';
import { useIsFocused } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Bell,
} from 'lucide-react-native';
import useAcademicStore from '../../store/academicStore';
import AssignmentModal from './components/AssignmentModal';
import {
  scheduleAssignmentReminder,
  cancelNotification,
} from '../../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 20;

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

function BookModel() {
  const groupRef = useRef();
  const { scene } = useGLTF(require('./models/books.glb'));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.4;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <>
      <ambientLight intensity={2.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#e2e8f0" />
      <pointLight position={[0, 3, 0]} intensity={1.2} color="#ffffff" />
      <primitive ref={groupRef} object={scene} scale={2.0} />
    </>
  );
}

const AssignmentScreen = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedModuleForAssignment, setSelectedModuleForAssignment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  const { modules, fetchModules, fetchAnalytics, fetchInsights, deleteAssignment } = useAcademicStore();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    await Promise.all([fetchModules(), fetchAnalytics(), fetchInsights()]);
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
    if (!dateString) return 0;
    const now = new Date();
    const date = new Date(dateString);
    return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  };

  // Schedule notifications for an assignment
  const scheduleNotificationsForAssignment = async (assignment, module) => {
    const daysUntil = getDaysUntil(assignment.dueDate);
    
    // Only schedule if assignment is not completed and due date is in the future
    if (assignment.status === 'completed' || daysUntil < 0) return;

    // Schedule reminders at different intervals
    if (daysUntil >= 7) {
      await scheduleAssignmentReminder(assignment.title, assignment.dueDate, module.moduleName, 'week');
    }
    if (daysUntil >= 3) {
      await scheduleAssignmentReminder(assignment.title, assignment.dueDate, module.moduleName, 'threeDays');
    }
    if (daysUntil >= 1) {
      await scheduleAssignmentReminder(assignment.title, assignment.dueDate, module.moduleName, 'oneDay');
    }
    // Due today reminder
    await scheduleAssignmentReminder(assignment.title, assignment.dueDate, module.moduleName, 'due');
  };

  const handleEdit = (assignment) => {
    const mod = modules.find((m) => m.id === assignment.moduleId);
    setSelectedModuleForAssignment(mod || { id: assignment.moduleId });
    setSelectedAssignment(assignment);
    setShowModal(true);
  };

  const handleModalClose = async () => {
    setShowModal(false);
    await loadData();
  };

  const allAssignments = useMemo(() => {
    let list = [];
    modules.forEach((m) => {
      (m.assignments || []).forEach((a) => {
        list.push({ ...a, moduleName: m.moduleName, moduleColor: m.color, moduleId: m.id });
      });
    });
    if (filterStatus !== 'all') list = list.filter((a) => a.status === filterStatus);
    if (searchQuery) list = list.filter((a) => (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
    list.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
    return list;
  }, [modules, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = allAssignments.length;
    const completed = allAssignments.filter(a => a.status === 'completed').length;
    const overdue = allAssignments.filter(a => a.status === 'overdue' || 
      (getDaysUntil(a.dueDate) < 0 && a.status !== 'completed')).length;
    const pending = allAssignments.filter(a => a.status === 'pending' || a.status === 'submitted').length;
    return { total, completed, overdue, pending };
  }, [allAssignments]);

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Assignments</Text>
          <Text style={styles.headerSubtitle}>{stats.total} total - {stats.completed} done</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setSelectedModuleForAssignment(null); setSelectedAssignment(null); setShowModal(true); }} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.addBtnGrad}>
            <Plus size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.canvasContainer}>
          {isFocused && (
            <Canvas dpr={1} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0.0, 2.5], fov: 50 }}>
              <Suspense fallback={null}>
                <BookModel />
              </Suspense>
            </Canvas>
          )}
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: 'Total', value: stats.total, color: COLORS.primary, icon: FileText },
            { label: 'Completed', value: stats.completed, color: COLORS.success, icon: CheckCircle2 },
            { label: 'Overdue', value: stats.overdue, color: COLORS.danger, icon: AlertCircle },
            { label: 'Pending', value: stats.pending, color: COLORS.warning, icon: Clock },
          ].map((stat, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 80)} style={styles.statCard}>
              <stat.icon size={16} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.value > 0 ? stat.color : COLORS.textMuted }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Search size={14} color={COLORS.textMuted} />
            <TextInput style={styles.searchInput} placeholder="Search assignments..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={[styles.filterBtn, showFilters && styles.filterBtnActive]} onPress={() => setShowFilters(!showFilters)}>
            <Filter size={16} color={showFilters ? COLORS.white : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterTabs}>
            {['all', 'pending', 'submitted', 'completed', 'overdue'].map((s) => (
              <TouchableOpacity key={s} style={[styles.filterTab, filterStatus === s && styles.filterTabActive]} onPress={() => setFilterStatus(s)}>
                <Text style={[styles.filterTabText, filterStatus === s && styles.filterTabTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {allAssignments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><FileText size={32} color={COLORS.primary} /></View>
            <Text style={styles.emptyTitle}>No assignments yet</Text>
            <Text style={styles.emptySub}>{modules.length === 0 ? 'Add a module first' : 'Tap + to create one'}</Text>
          </View>
        ) : (
          allAssignments.map((item, i) => {
            const daysUntil = getDaysUntil(item.dueDate);
            const isOverdue = daysUntil < 0 && item.status !== 'completed';
            const statusColor = getStatusColor(item.status);
            return (
              <Animated.View key={item.id} entering={FadeInRight.delay(i * 60)}>
                <TouchableOpacity style={styles.card} onPress={() => handleEdit(item)} activeOpacity={0.7}>
                  <View style={[styles.cardStrip, { backgroundColor: statusColor }]} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.cardMeta}>
                          <View style={[styles.dot, { backgroundColor: item.moduleColor }]} />
                          <Text style={styles.moduleName}>{item.moduleName}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                      </View>
                    </View>
                    <View style={styles.cardBottom}>
                      <View style={styles.dueDate}>
                        <Clock size={11} color={isOverdue ? COLORS.danger : COLORS.textSecondary} />
                        <Text style={[styles.dueText, isOverdue && { color: COLORS.danger }]}>{isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Due today' : `Due in ${daysUntil}d`}</Text>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn} hitSlop={8}><Edit3 size={14} color={COLORS.primary} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => { Alert.alert('Delete', `Remove "${item.title}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteAssignment(item.moduleId, item.id); await loadData(); } }]); }} style={styles.actionBtn} hitSlop={8}><Trash2 size={14} color={COLORS.textMuted} /></TouchableOpacity>
                      </View>
                    </View>
                    {item.marksObtained > 0 && (
                      <View style={styles.marksRow}>
                        <View style={styles.marksBar}><View style={[styles.marksFill, { width: `${(item.marksObtained / item.totalMarks) * 100}%`, backgroundColor: statusColor }]} /></View>
                        <Text style={styles.marksText}>{item.marksObtained}/{item.totalMarks}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
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
        onClose={handleModalClose} 
      />
    </LinearGradient>
  );
};

// Styles remain the same...
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: PADDING, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  headerSubtitle: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginTop: 2 },
  addBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 10, elevation: 4 },
  addBtnGrad: { width: 42, height: 42, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: PADDING },
  canvasContainer: { height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: COLORS.surfaceGlass, borderRadius: 16, padding: 14, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, alignItems: 'center', gap: 6, shadowColor: COLORS.border, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 20, fontFamily: 'JosefinSans-Bold' },
  statLabel: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, letterSpacing: 0.5 },
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, borderRadius: 14, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  filterBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, justifyContent: 'center', alignItems: 'center' },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder },
  filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTabText: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },
  filterTabTextActive: { color: COLORS.white, fontFamily: 'JosefinSans-Bold' },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.surfaceGlass, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'JosefinSans-SemiBold', textAlign: 'center', marginTop: 4, paddingHorizontal: 30 },
  card: { flexDirection: 'row', backgroundColor: COLORS.surfaceGlass, borderRadius: 16, borderWidth: 1.2, borderColor: COLORS.surfaceGlassBorder, marginBottom: 10, overflow: 'hidden', shadowColor: COLORS.border, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardStrip: { width: 3 },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardInfo: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  moduleName: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: 'JosefinSans-Bold', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },
  cardActions: { flexDirection: 'row', gap: 2 },
  actionBtn: { padding: 4 },
  marksRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  marksBar: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  marksFill: { height: '100%', borderRadius: 2 },
  marksText: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textSecondary },
});

export default AssignmentScreen;