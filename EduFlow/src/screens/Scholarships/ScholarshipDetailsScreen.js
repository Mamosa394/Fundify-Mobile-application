// src/screens/Scholarships/FundingTrackerScreen.js

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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../services/firebase';

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  primary: '#475569',
  primaryDark: '#334155',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  accent: '#6366F1',
  white: '#FFFFFF',
};

const STATUS_CONFIG = {
  submitted: { color: '#3B82F6', icon: Clock, label: 'Submitted' },
  draft: { color: '#F59E0B', icon: FileText, label: 'Draft' },
  approved: { color: '#059669', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: '#DC2626', icon: AlertCircle, label: 'Rejected' },
};

const FundingTrackerScreen = ({ navigation }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      if (!user) return;
      
      const appsRef = collection(db, 'scholarship_applications');
      const q = query(
        appsRef,
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(data);
    } catch (error) {
      console.error('[FundingTracker] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  }, []);

  const totalApplied = applications.length;
  const approved = applications.filter(a => a.status === 'approved').length;
  const pending = applications.filter(a => a.status === 'submitted' || a.status === 'draft').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Funding Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Application Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalApplied}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>{approved}</Text>
              <Text style={styles.summaryLabel}>Approved</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{pending}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Applications</Text>
        {applications.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No applications yet</Text>
          </View>
        ) : (
          applications.map((app, i) => {
            const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted;
            const StatusIcon = config.icon;

            return (
              <Animated.View key={app.id} entering={FadeInDown.delay(i * 100)} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
                    <StatusIcon size={12} color={config.color} />
                    <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                  </View>
                  {app.date && (
                    <Text style={styles.cardDate}>{new Date(app.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  )}
                </View>

                <Text style={styles.cardTitle}>{app.scholarship || 'Untitled'}</Text>
                {app.amount && <Text style={styles.cardAmount}>{app.amount}</Text>}

                {app.progress !== undefined && (
                  <>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${app.progress}%`, backgroundColor: config.color }]} />
                    </View>
                    <Text style={styles.progressText}>{app.progress}% complete</Text>
                  </>
                )}
              </Animated.View>
            );
          })
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
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  summaryCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 18, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  summaryLabel: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginTop: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: 'JosefinSans-Bold' },
  cardDate: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  cardTitle: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 4 },
  cardAmount: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.success, marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
});

export default FundingTrackerScreen;