// src/screens/Scholarships/ScholarshipScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  GraduationCap,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Building,
  Award,
  ChevronRight,
  Edit3,
  CheckCircle2,
  TrendingUp,
  Wallet,
  BookOpen,
} from 'lucide-react-native';
import { getAuth } from 'firebase/auth';
import { 
  fetchFundingProfile, 
  initializeFundingFromStudent,
  hasFundingProfile,
  calculateAllowance,
  calculateRemainingAllowance,
  updateFundingProfile,
  seedScholarships,
  fetchAllScholarships,
} from '../../services/scholarshipService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const ScholarshipScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fundingProfile, setFundingProfile] = useState(null);
  const [upcomingScholarships, setUpcomingScholarships] = useState([]);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (user) {
        const hasProfile = await hasFundingProfile(user.uid);
        if (!hasProfile) {
          const initialized = await initializeFundingFromStudent(user.uid);
          setFundingProfile(initialized);
        } else {
          const profile = await fetchFundingProfile(user.uid);
          setFundingProfile(profile);
        }
      }

      // Seed and fetch available scholarships
      await seedScholarships();
      const allScholarships = await fetchAllScholarships();
      const openScholarships = allScholarships.filter(s => 
        s.status === 'available' && new Date(s.deadline) > new Date()
      ).slice(0, 3);
      setUpcomingScholarships(openScholarships);
      
    } catch (error) {
      console.error('[Scholarships] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleEditStatus = () => {
    if (!fundingProfile) return;
    
    Alert.alert(
      'Student Status',
      'Select your current status:',
      [
        {
          text: 'New Student (Year 1)',
          onPress: async () => {
            await updateFundingProfile(user.uid, { isNewStudent: true, semester: 1 });
            await loadData();
          },
        },
        {
          text: 'Continuing Student',
          onPress: async () => {
            Alert.alert('Semester', 'Which semester?', [
              { text: 'Semester 1 (Aug-Jan)', onPress: async () => { await updateFundingProfile(user.uid, { isNewStudent: false, semester: 1 }); await loadData(); } },
              { text: 'Semester 2 (Feb-Jul)', onPress: async () => { await updateFundingProfile(user.uid, { isNewStudent: false, semester: 2 }); await loadData(); } },
              { text: 'Cancel', style: 'cancel' },
            ]);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const hasScholarship = fundingProfile?.hasScholarship || false;
  const scholarshipName = fundingProfile?.scholarshipName || 'NMDS Bursary';
  const university = fundingProfile?.university || 'Limkokwing University (LUCT)';
  const isNewStudent = fundingProfile?.isNewStudent || false;
  const currentSemester = fundingProfile?.semester || 1;
  const studentNumber = fundingProfile?.studentNumber || 'N/A';
  const fundingType = fundingProfile?.fundingType || 'NMDS';

  const allowance = calculateAllowance(isNewStudent, currentSemester);
  const remaining = calculateRemainingAllowance(allowance, 8);

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Scholarship</Text>
        <Text style={styles.headerSub}>{university}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Scholarship Status Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statusCard}>
          <LinearGradient colors={[COLORS.success, '#047857']} style={styles.statusGradient}>
            <View style={styles.statusContent}>
              <View style={styles.statusIcon}>
                <CheckCircle2 size={24} color={COLORS.white} />
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>{scholarshipName}</Text>
                <Text style={styles.statusSubtitle}>Active Scholarship</Text>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{fundingType}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Student Info Card */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Student Details</Text>
            <TouchableOpacity onPress={handleEditStatus} style={styles.editBtn}>
              <Edit3 size={14} color={COLORS.primary} />
              <Text style={styles.editText}>Edit Status</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Building size={16} color={COLORS.primary} />
              <Text style={styles.infoLabel}>University</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{university}</Text>
            </View>
            <View style={styles.infoItem}>
              <Award size={16} color={COLORS.warning} />
              <Text style={styles.infoLabel}>Student ID</Text>
              <Text style={styles.infoValue}>{studentNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <GraduationCap size={16} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{isNewStudent ? 'New Student' : 'Continuing'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Calendar size={16} color={COLORS.success} />
              <Text style={styles.infoLabel}>Semester</Text>
              <Text style={styles.infoValue}>Semester {currentSemester}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Allowance Overview */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.allowanceCard}>
          <Text style={styles.sectionTitle}>Allowance Overview</Text>
          
          {/* Main Amount */}
          <View style={styles.allowanceHero}>
            <DollarSign size={28} color={COLORS.success} />
            <View>
              <Text style={styles.allowanceHeroValue}>M{allowance.monthlyStipend?.toLocaleString()}</Text>
              <Text style={styles.allowanceHeroLabel}>Monthly Living Stipend</Text>
            </View>
          </View>

          {/* Breakdown */}
          <View style={styles.allowanceGrid}>
            <View style={styles.allowanceItem}>
              <Text style={styles.allowanceItemValue}>M{allowance.semesterStipend?.toLocaleString()}</Text>
              <Text style={styles.allowanceItemLabel}>Per Semester</Text>
            </View>
            <View style={styles.allowanceItem}>
              <Text style={styles.allowanceItemValue}>M{allowance.lumpSum > 0 ? allowance.lumpSum?.toLocaleString() : '0'}</Text>
              <Text style={styles.allowanceItemLabel}>Lump Sum</Text>
            </View>
            <View style={styles.allowanceItem}>
              <Text style={styles.allowanceItemValue}>M{allowance.annualTotal?.toLocaleString()}</Text>
              <Text style={styles.allowanceItemLabel}>Annual Total</Text>
            </View>
          </View>
        </Animated.View>

        {/* Semester Progress */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.progressCard}>
          <Text style={styles.sectionTitle}>Semester Progress</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(remaining.monthsElapsed / 6) * 100}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Month {remaining.monthsElapsed}/6</Text>
              <Text style={styles.progressPercent}>{Math.round((remaining.monthsElapsed / 6) * 100)}%</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.progressGrid}>
            <View style={styles.progressItem}>
              <Clock size={18} color={COLORS.warning} />
              <Text style={styles.progressItemValue}>{remaining.monthsElapsed}</Text>
              <Text style={styles.progressItemLabel}>Months Elapsed</Text>
            </View>
            <View style={styles.progressItem}>
              <TrendingUp size={18} color={COLORS.primary} />
              <Text style={styles.progressItemValue}>{remaining.monthsRemaining}</Text>
              <Text style={styles.progressItemLabel}>Months Remaining</Text>
            </View>
            <View style={styles.progressItem}>
              <DollarSign size={18} color={COLORS.success} />
              <Text style={styles.progressItemValue}>M{remaining.remainingStipend?.toLocaleString()}</Text>
              <Text style={styles.progressItemLabel}>Stipend Remaining</Text>
            </View>
          </View>
        </Animated.View>

        {/* Other Available Scholarships */}
        {upcomingScholarships.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.otherCard}>
            <View style={styles.otherHeader}>
              <BookOpen size={16} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Other Opportunities</Text>
            </View>
            {upcomingScholarships.map((s, i) => (
              <TouchableOpacity 
                key={s.id} 
                style={[styles.otherItem, i < upcomingScholarships.length - 1 && styles.otherBorder]}
                onPress={() => navigation.navigate('ScholarshipDetails', { scholarship: s })}
              >
                <View style={styles.otherInfo}>
                  <Text style={styles.otherName} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.otherProvider}>{s.provider}</Text>
                  <Text style={styles.otherAmount}>{s.amount}</Text>
                </View>
                <ChevronRight size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Full Allowance Detail Button */}
        <TouchableOpacity 
          style={styles.detailBtn}
          onPress={() => navigation.navigate('FundingTracker')}
          activeOpacity={0.8}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.detailGrad}>
            <Wallet size={18} color={COLORS.white} />
            <Text style={styles.detailText}>View Full Allowance Details</Text>
            <ChevronRight size={16} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontFamily: 'JosefinSans-Bold', color: COLORS.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginTop: 3 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Status Card
  statusCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 14, shadowColor: COLORS.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  statusGradient: { padding: 18 },
  statusContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 18, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
  statusSubtitle: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.white },

  // Info Card
  infoCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  infoTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  editText: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem: { width: '47%', backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text, textAlign: 'center' },

  // Section Title
  sectionTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 14 },

  // Allowance
  allowanceCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 14 },
  allowanceHero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.success + '10', borderRadius: 16, padding: 16, marginBottom: 14 },
  allowanceHeroValue: { fontSize: 24, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  allowanceHeroLabel: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginTop: 2 },
  allowanceGrid: { flexDirection: 'row', gap: 8 },
  allowanceItem: { flex: 1, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 },
  allowanceItemValue: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  allowanceItemLabel: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Progress
  progressCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 14 },
  progressBarContainer: { marginBottom: 16 },
  progressBar: { height: 10, backgroundColor: COLORS.surfaceAlt, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: COLORS.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },
  progressPercent: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },
  progressGrid: { flexDirection: 'row', gap: 8 },
  progressItem: { flex: 1, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  progressItemValue: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  progressItemLabel: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Other Scholarships
  otherCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 14 },
  otherHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  otherItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  otherBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  otherInfo: { flex: 1 },
  otherName: { fontSize: 13, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 2 },
  otherProvider: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginBottom: 2 },
  otherAmount: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.success },

  // Detail Button
  detailBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 14, shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  detailGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  detailText: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
});

export default ScholarshipScreen;