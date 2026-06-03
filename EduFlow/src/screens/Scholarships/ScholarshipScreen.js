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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Search,
  Bookmark,
  DollarSign,
  GraduationCap,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

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

const STATUS_COLORS = {
  applied: '#3B82F6',
  saved: '#F59E0B',
  available: '#059669',
  closed: '#DC2626',
};

const CATEGORY_COLORS = {
  'Healthcare': '#DC2626',
  'Commerce': '#3B82F6',
  'Science & Technology': '#6366F1',
  'Arts & Humanities': '#F59E0B',
  'General': '#059669',
};

const ScholarshipScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scholarships, setScholarships] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadScholarships();
  }, []);

  const loadScholarships = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const scholarshipsRef = collection(db, 'scholarships');
      const q = query(scholarshipsRef, orderBy('deadline', 'asc'));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setScholarships(data);
    } catch (err) {
      console.error('[Scholarships] Load error:', err);
      setError('Failed to load scholarships. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScholarships();
    setRefreshing(false);
  }, []);

  const getFilteredScholarships = () => {
    let filtered = [...scholarships];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.title || '').toLowerCase().includes(q) ||
        (s.provider || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      );
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(s => s.category === filterCategory);
    }
    
    return filtered;
  };

  const filteredScholarships = getFilteredScholarships();
  const categories = [...new Set(scholarships.map(s => s.category).filter(Boolean))];

  const getDaysRemaining = (deadline) => {
    if (!deadline) return 0;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return 'No deadline';
    const days = getDaysRemaining(deadline);
    if (days < 0) return 'Closed';
    if (days === 0) return 'Due today';
    if (days <= 7) return `${days} days left`;
    return new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDeadlineColor = (deadline) => {
    const days = getDaysRemaining(deadline);
    if (days < 0) return COLORS.danger;
    if (days <= 7) return COLORS.danger;
    if (days <= 14) return COLORS.warning;
    return COLORS.success;
  };

  const stats = {
    total: scholarships.length,
    available: scholarships.filter(s => s.status === 'available').length,
    applied: scholarships.filter(s => s.status === 'applied').length,
    saved: scholarships.filter(s => s.status === 'saved').length,
  };

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
        <View>
          <Text style={styles.headerTitle}>Scholarships</Text>
          <Text style={styles.headerSub}>{stats.available} open • {stats.applied} applied</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.searchBox}>
          <Search size={14} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search scholarships..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
            <TouchableOpacity
              style={[styles.filterChip, filterCategory === 'all' && styles.filterChipActive]}
              onPress={() => setFilterCategory('all')}
            >
              <Text style={[styles.filterText, filterCategory === 'all' && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
                onPress={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
              >
                <View style={[styles.filterDot, { backgroundColor: CATEGORY_COLORS[cat] || COLORS.primary }]} />
                <Text style={[styles.filterText, filterCategory === cat && styles.filterTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.quickLinkCard}
          onPress={() => navigation.navigate('FundingTracker')}
          activeOpacity={0.7}
        >
          <DollarSign size={20} color={COLORS.success} />
          <Text style={styles.quickLinkLabel}>Funding Tracker</Text>
          <ChevronRight size={14} color={COLORS.textMuted} />
        </TouchableOpacity>

        {filteredScholarships.length === 0 ? (
          <View style={styles.emptyState}>
            <GraduationCap size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No scholarships found</Text>
          </View>
        ) : (
          filteredScholarships.map((scholarship, index) => {
            const deadlineColor = getDeadlineColor(scholarship.deadline);

            return (
              <Animated.View key={scholarship.id} entering={FadeInUp.delay(index * 100)}>
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate('ScholarshipDetails', { scholarship })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      {scholarship.category && (
                        <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[scholarship.category] || COLORS.primary) + '15' }]}>
                          <Text style={[styles.categoryText, { color: CATEGORY_COLORS[scholarship.category] || COLORS.primary }]}>
                            {scholarship.category}
                          </Text>
                        </View>
                      )}
                      {scholarship.status && (
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[scholarship.status] + '15' }]}>
                          <Text style={[styles.statusText, { color: STATUS_COLORS[scholarship.status] }]}>
                            {scholarship.status}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Bookmark size={18} color={scholarship.status === 'saved' ? COLORS.warning : COLORS.textMuted} fill={scholarship.status === 'saved' ? COLORS.warning : 'transparent'} />
                  </View>

                  <Text style={styles.cardTitle}>{scholarship.title || 'Untitled'}</Text>
                  <Text style={styles.cardProvider}>{scholarship.provider || 'Unknown provider'}</Text>

                  {scholarship.amount && (
                    <View style={styles.amountRow}>
                      <DollarSign size={14} color={COLORS.success} />
                      <Text style={styles.amountText}>{scholarship.amount}</Text>
                    </View>
                  )}

                  {scholarship.description && (
                    <Text style={styles.cardDescription} numberOfLines={2}>{scholarship.description}</Text>
                  )}

                  {scholarship.tags && scholarship.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {scholarship.tags.map((tag, i) => (
                        <View key={i} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
                      ))}
                    </View>
                  )}

                  <View style={styles.deadlineRow}>
                    <Clock size={12} color={deadlineColor} />
                    <Text style={[styles.deadlineText, { color: deadlineColor }]}>{formatDeadline(scholarship.deadline)}</Text>
                    <ChevronRight size={14} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
                  </View>
                </TouchableOpacity>
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
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontFamily: 'JosefinSans-Bold', color: COLORS.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginTop: 3 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  errorBanner: { backgroundColor: COLORS.danger + '10', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.danger, textAlign: 'center' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, borderRadius: 14,
    backgroundColor: COLORS.surface, paddingHorizontal: 14, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  filterRow: { marginBottom: 14 },
  filterContent: { gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceAlt,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterText: { fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white, fontFamily: 'JosefinSans-Bold' },
  quickLinkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 16, marginBottom: 14,
  },
  quickLinkLabel: { flex: 1, fontSize: 14, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginTop: 16 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTopLeft: { flexDirection: 'row', gap: 6 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryText: { fontSize: 10, fontFamily: 'JosefinSans-Bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: 'JosefinSans-Bold' },
  cardTitle: { fontSize: 17, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 4 },
  cardProvider: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  amountText: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.success },
  cardDescription: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deadlineText: { fontSize: 12, fontFamily: 'JosefinSans-Bold' },
});

export default ScholarshipScreen;