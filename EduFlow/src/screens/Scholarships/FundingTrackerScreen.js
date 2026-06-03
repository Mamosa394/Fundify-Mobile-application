// src/screens/Scholarships/FundingTrackerScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  FileText,
} from 'lucide-react-native';

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

const MOCK_APPLICATIONS = [
  { id: '1', scholarship: 'NMDS Bursary', amount: 'Full Tuition', status: 'submitted', date: '2026-06-15', progress: 80 },
  { id: '2', scholarship: 'CSIR Bursary', amount: 'R100,000+', status: 'draft', date: '2026-06-20', progress: 40 },
  { id: '3', scholarship: 'FNB Fund Bursary', amount: 'R50,000', status: 'approved', date: '2026-05-30', progress: 100 },
  { id: '4', scholarship: 'Canon Collins', amount: 'R75,000', status: 'rejected', date: '2026-06-10', progress: 100 },
];

const STATUS_CONFIG = {
  submitted: { color: '#3B82F6', icon: Clock, label: 'Submitted' },
  draft: { color: '#F59E0B', icon: FileText, label: 'Draft' },
  approved: { color: '#059669', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: '#DC2626', icon: AlertCircle, label: 'Rejected' },
};

const FundingTrackerScreen = ({ navigation }) => {
  const [applications] = useState(MOCK_APPLICATIONS);

  const totalApplied = applications.length;
  const approved = applications.filter(a => a.status === 'approved').length;
  const pending = applications.filter(a => a.status === 'submitted' || a.status === 'draft').length;
  const totalAmount = applications.reduce((sum, a) => {
    const amt = parseInt(a.amount.replace(/[^0-9]/g, '')) || 0;
    return sum + amt;
  }, 0);

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Funding Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Summary Card */}
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
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.primary }]}>R{totalAmount.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Potential</Text>
            </View>
          </View>
        </View>

        {/* Applications */}
        <Text style={styles.sectionTitle}>Applications</Text>
        {applications.map((app, i) => {
          const config = STATUS_CONFIG[app.status];
          const StatusIcon = config.icon;

          return (
            <Animated.View key={app.id} entering={FadeInDown.delay(i * 100)} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
                  <StatusIcon size={12} color={config.color} />
                  <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                </View>
                <Text style={styles.cardDate}>{new Date(app.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>

              <Text style={styles.cardTitle}>{app.scholarship}</Text>
              <Text style={styles.cardAmount}>{app.amount}</Text>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${app.progress}%`, backgroundColor: config.color }]} />
              </View>
              <Text style={styles.progressText}>{app.progress}% complete</Text>
            </Animated.View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  summaryCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  summaryTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 18, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  summaryLabel: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
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