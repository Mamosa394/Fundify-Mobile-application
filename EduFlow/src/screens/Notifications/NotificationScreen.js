// src/screens/Notifications/NotificationsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  GraduationCap,
  ChevronRight,
  Trash2,
  Zap,
  Info,
  X,
  ChevronLeft,
} from 'lucide-react-native';
import {
  getScheduledNotifications,
  cancelAllNotifications,
  cancelNotification,
} from '../../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bgStart: '#F8FAFC', bgMid: '#E2E8F0', bgEnd: '#CBD5E1',
  surface: '#FFFFFF', surfaceAlt: '#F8FAFC',
  primary: '#475569', primaryDark: '#334155',
  text: '#0F172A', textSecondary: '#64748B', textMuted: '#94A3B8',
  success: '#059669', warning: '#D97706', danger: '#DC2626',
  accent: '#6366F1', white: '#FFFFFF',
};

const NOTIFICATION_META = {
  assignment_reminder: {
    icon: FileText,
    color: '#3B82F6',
    label: 'Assignment Reminder',
  },
  exam_reminder: {
    icon: Calendar,
    color: '#6366F1',
    label: 'Exam Reminder',
  },
  gpa_alert: {
    icon: TrendingDown,
    color: '#DC2626',
    label: 'GPA Alert',
  },
  grade_update: {
    icon: TrendingUp,
    color: '#059669',
    label: 'Grade Update',
  },
  overdue_alert: {
    icon: AlertTriangle,
    color: '#DC2626',
    label: 'Overdue',
  },
  daily_study: {
    icon: Clock,
    color: '#475569',
    label: 'Daily Study',
  },
  weekly_summary: {
    icon: CheckCircle2,
    color: '#059669',
    label: 'Weekly Summary',
  },
  new_assignment: {
    icon: FileText,
    color: '#3B82F6',
    label: 'New Assignment',
  },
  default: {
    icon: Bell,
    color: '#475569',
    label: 'Notification',
  },
};

const NotificationsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const scheduled = await getScheduledNotifications();
      // Add a unique key for each notification
      const withKeys = (scheduled || []).map((n, i) => ({
        ...n,
        uniqueKey: n.identifier || `notif_${i}_${Date.now()}`,
      }));
      setNotifications(withKeys);
    } catch (error) {
      console.error('[Notifications] Load error:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const handleDelete = async (identifier) => {
    if (identifier) {
      await cancelNotification(identifier);
      await loadNotifications();
    }
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear All',
      'Remove all scheduled notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            await loadNotifications();
          },
        },
      ]
    );
  };

  const getTriggerInfo = (trigger) => {
    if (!trigger) return { text: 'Now', isExpired: false };
    
    if (trigger.type === 'daily') {
      return { text: `Daily at ${trigger.hour}:${String(trigger.minute).padStart(2, '0')}`, isExpired: false };
    }
    
    if (trigger.type === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return { text: `Weekly on ${days[trigger.weekday - 1] || 'Sun'}`, isExpired: false };
    }
    
    if (trigger.date) {
      const date = new Date(trigger.date);
      const now = new Date();
      const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
      
      if (diff < 0) return { text: 'Expired', isExpired: true };
      if (diff === 0) return { text: 'Today', isExpired: false };
      if (diff === 1) return { text: 'Tomorrow', isExpired: false };
      if (diff <= 7) return { text: `In ${diff} days`, isExpired: false };
      return { 
        text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        isExpired: false 
      };
    }
    
    return { text: 'Scheduled', isExpired: false };
  };

  // Split notifications
  const activeNotifications = [];
  const expiredNotifications = [];
  
  notifications.forEach(n => {
    const triggerInfo = getTriggerInfo(n.trigger);
    if (triggerInfo.isExpired) {
      expiredNotifications.push({ ...n, triggerInfo });
    } else {
      activeNotifications.push({ ...n, triggerInfo });
    }
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderNotification = (notification) => {
    const { content, trigger, triggerInfo, data, uniqueKey } = notification;
    const meta = NOTIFICATION_META[data?.type] || NOTIFICATION_META.default;
    const Icon = meta.icon;
    const color = meta.color;

    return (
      <Animated.View key={uniqueKey} entering={FadeInUp} style={styles.notifCard}>
        {/* Left color bar */}
        <View style={[styles.notifBar, { backgroundColor: color }]} />
        
        {/* Content */}
        <View style={styles.notifContent}>
          <View style={styles.notifTop}>
            <View style={[styles.notifIcon, { backgroundColor: color + '12' }]}>
              <Icon size={18} color={color} />
            </View>
            <View style={styles.notifInfo}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle} numberOfLines={1}>
                  {content?.title || 'Notification'}
                </Text>
                <View style={[styles.notifTypeBadge, { backgroundColor: color + '10' }]}>
                  <Text style={[styles.notifTypeText, { color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={styles.notifBody} numberOfLines={2}>
                {content?.body || 'No details'}
              </Text>
              <View style={styles.notifMeta}>
                <Clock size={10} color={COLORS.textMuted} />
                <Text style={[styles.notifMetaText, triggerInfo?.isExpired && { color: COLORS.danger }]}>
                  {triggerInfo?.text || 'Scheduled'}
                </Text>
                {data?.moduleName && (
                  <>
                    <View style={styles.notifDot} />
                    <GraduationCap size={10} color={COLORS.textMuted} />
                    <Text style={styles.notifMetaText}>{data.moduleName}</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          
          {/* Delete button */}
          <TouchableOpacity 
            onPress={() => handleDelete(notification.identifier)} 
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Trash2 size={15} color={COLORS.danger} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
        {notifications.length === 0 && <View style={{ width: 60 }} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Bell size={48} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>
              Scheduled reminders for assignments, exams, and study sessions will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Active Notifications */}
            {activeNotifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <View style={[styles.sectionDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.sectionTitle}>Active</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{activeNotifications.length}</Text>
                  </View>
                </View>
                {activeNotifications.map((n) => renderNotification(n))}
              </View>
            )}

            {/* Expired Notifications */}
            {expiredNotifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <View style={[styles.sectionDot, { backgroundColor: COLORS.textMuted }]} />
                  <Text style={styles.sectionTitle}>Expired</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{expiredNotifications.length}</Text>
                  </View>
                </View>
                {expiredNotifications.map((n) => renderNotification(n))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 24, fontFamily: 'JosefinSans-Bold', color: COLORS.text, letterSpacing: -0.5 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.danger + '10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  clearText: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.danger },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { width: 96, height: 96, borderRadius: 28, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  emptyTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, fontFamily: 'JosefinSans-SemiBold', marginTop: 6, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },

  // Section
  section: { marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text, flex: 1 },
  sectionBadge: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  sectionBadgeText: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted },

  // Card
  notifCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 8, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  notifBar: { width: 3 },
  notifContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', padding: 12 },
  notifTop: { flex: 1, flexDirection: 'row', gap: 10 },
  notifIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notifInfo: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  notifTitle: { flex: 1, fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  notifTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  notifTypeText: { fontSize: 9, fontFamily: 'JosefinSans-Bold' },
  notifBody: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, lineHeight: 16, marginBottom: 6 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notifDot: { width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: COLORS.textMuted },
  notifMetaText: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  deleteBtn: { padding: 6, marginLeft: 4, marginTop: 2 },
});

export default NotificationsScreen;