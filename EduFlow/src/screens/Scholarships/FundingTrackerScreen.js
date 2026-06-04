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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  DollarSign,
  GraduationCap,
  Calendar,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { getAuth } from 'firebase/auth';
import { 
  fetchFundingProfile, 
  initializeFundingFromStudent,
  hasFundingProfile,
  calculateAllowance,
  calculateRemainingAllowance,
  updateFundingProfile,
  toggleScholarshipStatus,
} from '../../services/scholarshipService';

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

const FundingTrackerScreen = ({ navigation }) => {
  const [fundingProfile, setFundingProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    loadFundingData();
  }, []);

  const loadFundingData = async () => {
    try {
      if (!user) return;

      const hasProfile = await hasFundingProfile(user.uid);
      if (!hasProfile) {
        const initialized = await initializeFundingFromStudent(user.uid);
        setFundingProfile(initialized);
      } else {
        const profile = await fetchFundingProfile(user.uid);
        setFundingProfile(profile);
      }
    } catch (error) {
      console.error('[FundingTracker] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFundingData();
    setRefreshing(false);
  }, []);

  const handleToggleScholarship = () => {
    if (!fundingProfile) return;

    const hasScholarship = fundingProfile.hasScholarship;
    
    Alert.alert(
      hasScholarship ? 'Remove Scholarship' : 'Add Scholarship',
      hasScholarship 
        ? 'Do you no longer have the NMDS Bursary?' 
        : 'Do you currently receive the NMDS Bursary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: hasScholarship ? 'Remove' : 'Yes, I have NMDS',
          onPress: async () => {
            await toggleScholarshipStatus(user.uid, !hasScholarship);
            await loadFundingData();
          },
        },
      ]
    );
  };

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
            await loadFundingData();
          },
        },
        {
          text: 'Continuing (Year 2+)',
          onPress: async () => {
            Alert.alert(
              'Semester',
              'Which semester are you in?',
              [
                {
                  text: 'Semester 1 (Aug-Jan)',
                  onPress: async () => {
                    await updateFundingProfile(user.uid, { isNewStudent: false, semester: 1 });
                    await loadFundingData();
                  },
                },
                {
                  text: 'Semester 2 (Feb-Jul)',
                  onPress: async () => {
                    await updateFundingProfile(user.uid, { isNewStudent: false, semester: 2 });
                    await loadFundingData();
                  },
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
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
  const allowance = fundingProfile?.allowance || calculateAllowance(false, 1);
  const remaining = fundingProfile?.remaining || calculateRemainingAllowance(allowance);
  const isNewStudent = fundingProfile?.isNewStudent || false;
  const currentSemester = fundingProfile?.semester || 1;

  // No scholarship state
  if (!hasScholarship) {
    return (
      <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Funding Tracker</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.noScholarshipScroll}>
          <View style={styles.noScholarshipCard}>
            <View style={styles.noScholarshipIcon}>
              <AlertCircle size={48} color={COLORS.warning} />
            </View>
            <Text style={styles.noScholarshipTitle}>No Active Scholarship</Text>
            <Text style={styles.noScholarshipText}>
              You don't have an active scholarship on record. If you receive the NMDS Bursary or any other funding, you can add it below to track your allowances.
            </Text>
            <TouchableOpacity style={styles.addScholarshipBtn} onPress={handleToggleScholarship} activeOpacity={0.8}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.addScholarshipGrad}>
                <GraduationCap size={20} color={COLORS.white} />
                <Text style={styles.addScholarshipText}>I Have a Scholarship</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.noScholarshipNote}>
              You can update this anytime from your profile settings.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      {/* Header */}
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
        {/* Active Scholarship Banner */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statusBanner}>
          <View style={styles.statusBannerIcon}>
            <CheckCircle2 size={20} color={COLORS.white} />
          </View>
          <View style={styles.statusBannerContent}>
            <Text style={styles.statusBannerTitle}>NMDS Bursary Active</Text>
            <Text style={styles.statusBannerSub}>
              {isNewStudent ? 'New Student (Year 1)' : `Continuing Student (Year ${currentSemester === 1 ? '2+' : '2+'})`} • Semester {currentSemester}
            </Text>
          </View>
          <TouchableOpacity onPress={handleToggleScholarship} style={styles.statusBannerBtn}>
            <Edit3 size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Student Status Card */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.statusCard}>
          <View style={styles.statusCardRow}>
            <View style={styles.statusCardItem}>
              <GraduationCap size={16} color={COLORS.primary} />
              <Text style={styles.statusCardLabel}>Status</Text>
              <Text style={styles.statusCardValue}>{isNewStudent ? 'New Student' : 'Continuing'}</Text>
            </View>
            <View style={styles.statusCardDivider} />
            <View style={styles.statusCardItem}>
              <Calendar size={16} color={COLORS.accent} />
              <Text style={styles.statusCardLabel}>Semester</Text>
              <Text style={styles.statusCardValue}>{currentSemester}</Text>
            </View>
            <View style={styles.statusCardDivider} />
            <View style={styles.statusCardItem}>
              <Clock size={16} color={COLORS.warning} />
              <Text style={styles.statusCardLabel}>Months Left</Text>
              <Text style={[styles.statusCardValue, { color: COLORS.warning }]}>{remaining.monthsRemaining}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleEditStatus} style={styles.statusCardEdit}>
            <Edit3 size={14} color={COLORS.primary} />
            <Text style={styles.statusCardEditText}>Edit Status</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Allowance Breakdown */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Allowance Breakdown</Text>
          
          <View style={styles.allowanceHighlight}>
            <DollarSign size={24} color={COLORS.success} />
            <View>
              <Text style={styles.allowanceHighlightValue}>M{allowance.semesterTotal?.toLocaleString()}</Text>
              <Text style={styles.allowanceHighlightLabel}>Semester {currentSemester} Total</Text>
            </View>
          </View>

          <View style={styles.allowanceGrid}>
            <View style={styles.allowanceItem}>
              <Text style={styles.allowanceItemValue}>M{allowance.monthlyStipend?.toLocaleString()}</Text>
              <Text style={styles.allowanceItemLabel}>Monthly Stipend</Text>
            </View>
            <View style={styles.allowanceItem}>
              <Text style={styles.allowanceItemValue}>M{allowance.semesterStipend?.toLocaleString()}</Text>
              <Text style={styles.allowanceItemLabel}>Semester Stipend</Text>
            </View>
            {allowance.lumpSum > 0 && (
              <View style={styles.allowanceItem}>
                <Text style={styles.allowanceItemValue}>M{allowance.lumpSum?.toLocaleString()}</Text>
                <Text style={styles.allowanceItemLabel}>Lump Sum</Text>
              </View>
            )}
            <View style={styles.allowanceItem}>
              <Text style={[styles.allowanceItemValue, { color: COLORS.accent }]}>M{allowance.annualTotal?.toLocaleString()}</Text>
              <Text style={styles.allowanceItemLabel}>Annual Total</Text>
            </View>
          </View>

          <View style={styles.allowanceNote}>
            <Text style={styles.allowanceNoteText}>
              {allowance.lumpSum > 0 
                ? `Includes M${allowance.lumpSum?.toLocaleString()} startup lump sum + M${allowance.semesterStipend?.toLocaleString()} stipend (${allowance.semesterMonths} months × M${allowance.monthlyStipend?.toLocaleString()})`
                : `Semester stipend: M${allowance.semesterStipend?.toLocaleString()} (${allowance.semesterMonths} months × M${allowance.monthlyStipend?.toLocaleString()})`
              }
            </Text>
            {currentSemester === 1 && (
              <Text style={styles.allowanceNoteText}>
                Semester 2: M{allowance.secondSemesterTotal?.toLocaleString()} (stipend only, no lump sum)
              </Text>
            )}
            <Text style={styles.allowanceNoteSmall}>
              *Tuition fees paid directly to {fundingProfile?.university || 'Limkokwing University (LUCT)'}
            </Text>
          </View>
        </Animated.View>

        {/* Remaining Allowance Tracker */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Remaining This Semester</Text>
          
          <View style={styles.remainingBar}>
            <View style={[styles.remainingBarFill, { width: `${(remaining.monthsRemaining / 6) * 100}%` }]} />
          </View>
          
          <View style={styles.remainingGrid}>
            <View style={styles.remainingItem}>
              <Text style={styles.remainingItemValue}>{remaining.monthsElapsed}</Text>
              <Text style={styles.remainingItemLabel}>Elapsed</Text>
            </View>
            <View style={styles.remainingItem}>
              <Text style={[styles.remainingItemValue, { color: COLORS.primary }]}>{remaining.monthsRemaining}</Text>
              <Text style={styles.remainingItemLabel}>Remaining</Text>
            </View>
            <View style={styles.remainingItem}>
              <Text style={[styles.remainingItemValue, { color: COLORS.success }]}>M{remaining.remainingStipend?.toLocaleString()}</Text>
              <Text style={styles.remainingItemLabel}>Stipend Left</Text>
            </View>
            <View style={styles.remainingItem}>
              <Text style={[styles.remainingItemValue, { color: COLORS.warning }]}>M{remaining.totalRemaining?.toLocaleString()}</Text>
              <Text style={styles.remainingItemLabel}>Total Left</Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Info */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.infoCard}>
          <GraduationCap size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            The NMDS bursary provides M{allowance.monthlyStipend?.toLocaleString()} monthly for living expenses during your {allowance.semesterMonths}-month semester, plus a startup lump sum of M{allowance.lumpSum > 0 ? allowance.lumpSum?.toLocaleString() : '0'} for books and equipment.
          </Text>
        </Animated.View>

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

  // No Scholarship
  noScholarshipScroll: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  noScholarshipCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  noScholarshipIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.warning + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  noScholarshipTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 8 },
  noScholarshipText: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  addScholarshipBtn: { borderRadius: 16, overflow: 'hidden', width: '100%', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  addScholarshipGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  addScholarshipText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
  noScholarshipNote: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginTop: 16, textAlign: 'center' },

  // Status Banner
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.success, borderRadius: 16, padding: 14, marginBottom: 12 },
  statusBannerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  statusBannerContent: { flex: 1 },
  statusBannerTitle: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
  statusBannerSub: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statusBannerBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Status Card
  statusCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 14 },
  statusCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusCardItem: { flex: 1, alignItems: 'center', gap: 4 },
  statusCardDivider: { width: 1, height: 32, backgroundColor: COLORS.surfaceAlt },
  statusCardLabel: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusCardValue: { fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  statusCardEdit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt },
  statusCardEditText: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.primary },

  // Section Card
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 16 },

  // Allowance
  allowanceHighlight: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.success + '10', borderRadius: 14, padding: 14, marginBottom: 14 },
  allowanceHighlightValue: { fontSize: 22, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  allowanceHighlightLabel: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  allowanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  allowanceItem: { width: '47%', backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 },
  allowanceItemValue: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  allowanceItemLabel: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  allowanceNote: { backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 12, gap: 6 },
  allowanceNoteText: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, lineHeight: 16 },
  allowanceNoteSmall: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, fontStyle: 'italic' },

  // Remaining
  remainingBar: { height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  remainingBarFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },
  remainingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  remainingItem: { width: '47%', backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 },
  remainingItemValue: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  remainingItemLabel: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Info
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14 },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, lineHeight: 18 },
});

export default FundingTrackerScreen;