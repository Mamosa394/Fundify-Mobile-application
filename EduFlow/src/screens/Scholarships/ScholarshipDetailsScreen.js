// src/screens/Scholarships/ScholarshipDetailsScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  DollarSign,
  Clock,
  FileText,
  Bookmark,
  Share2,
} from 'lucide-react-native';
import { getAuth } from 'firebase/auth';
import { toggleSaveScholarship, submitApplication } from '../../services/scholarshipService';

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

const CATEGORY_COLORS = {
  'Healthcare': '#DC2626',
  'Commerce': '#3B82F6',
  'Science & Technology': '#6366F1',
  'Arts & Humanities': '#F59E0B',
  'General': '#059669',
};

const STATUS_COLORS = {
  applied: '#3B82F6',
  saved: '#F59E0B',
  available: '#059669',
  closed: '#DC2626',
};

const ScholarshipDetailsScreen = ({ route, navigation }) => {
  const { scholarship: initialData } = route.params;
  const [scholarship, setScholarship] = useState(initialData);

  const getDaysRemaining = (deadline) => {
    if (!deadline) return 0;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysRemaining(scholarship.deadline);
  const isClosed = daysLeft < 0;

  const handleSave = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const newStatus = await toggleSaveScholarship(user.uid, scholarship.id, scholarship.status);
      setScholarship({ ...scholarship, status: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update.');
    }
  };

  const handleApply = async () => {
    if (isClosed) {
      Alert.alert('Closed', 'This scholarship deadline has passed.');
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert('Apply', `Submit application for "${scholarship.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Apply',
        onPress: async () => {
          try {
            await submitApplication(user.uid, scholarship);
            setScholarship({ ...scholarship, status: 'applied' });
            Alert.alert('Success', 'Application submitted.');
          } catch (error) {
            Alert.alert('Error', 'Failed to submit.');
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Bookmark size={20} color={scholarship.status === 'saved' ? COLORS.warning : COLORS.text} fill={scholarship.status === 'saved' ? COLORS.warning : 'transparent'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{scholarship.title || 'Untitled'}</Text>
        <Text style={styles.provider}>{scholarship.provider || 'Unknown provider'}</Text>

        <View style={styles.badgesRow}>
          {scholarship.category && (
            <View style={[styles.badge, { backgroundColor: (CATEGORY_COLORS[scholarship.category] || COLORS.primary) + '15' }]}>
              <Text style={[styles.badgeText, { color: CATEGORY_COLORS[scholarship.category] || COLORS.primary }]}>{scholarship.category}</Text>
            </View>
          )}
          {scholarship.status && (
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[scholarship.status] + '15' }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLORS[scholarship.status] }]}>{scholarship.status}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <DollarSign size={20} color={COLORS.success} />
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={styles.infoValue}>{scholarship.amount || 'Not specified'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Clock size={20} color={isClosed ? COLORS.danger : COLORS.warning} />
            <Text style={styles.infoLabel}>Deadline</Text>
            <Text style={[styles.infoValue, { color: isClosed ? COLORS.danger : COLORS.text }]}>
              {isClosed ? 'Closed' : `${daysLeft} days left`}
            </Text>
          </View>
        </View>

        {scholarship.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionText}>{scholarship.description}</Text>
          </View>
        )}

        {scholarship.requirements && scholarship.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {scholarship.requirements.map((req, i) => (
              <View key={i} style={styles.requirementItem}>
                <View style={styles.reqDot} />
                <Text style={styles.reqText}>{req}</Text>
              </View>
            ))}
          </View>
        )}

        {scholarship.tags && scholarship.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsRow}>
              {scholarship.tags.map((tag, i) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={[styles.applyBtn, isClosed && styles.applyBtnDisabled]} onPress={handleApply} activeOpacity={0.8}>
          <LinearGradient colors={isClosed ? [COLORS.textMuted, COLORS.textMuted] : [COLORS.primary, COLORS.primaryDark]} style={styles.applyGrad}>
            <Text style={styles.applyText}>{isClosed ? 'Closed' : scholarship.status === 'applied' ? 'Applied' : 'Apply Now'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={() => Alert.alert('Share', 'Link copied.')}>
          <Share2 size={16} color={COLORS.textSecondary} />
          <Text style={styles.shareText}>Share this scholarship</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  saveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 24, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 4 },
  provider: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginBottom: 16 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'JosefinSans-Bold' },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 10 },
  sectionText: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, lineHeight: 22 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reqDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  reqText: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  applyBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  applyBtnDisabled: { opacity: 0.5 },
  applyGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  applyText: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.white },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  shareText: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },
});

export default ScholarshipDetailsScreen;