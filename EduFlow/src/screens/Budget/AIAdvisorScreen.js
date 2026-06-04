// src/screens/AIAdvisor/AIAdvisorScreen.js

import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Pressable, KeyboardAvoidingView, Platform,
  Animated, ActivityIndicator, FlatList, Dimensions,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { Ionicons }          from '@expo/vector-icons';
import * as Haptics          from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar }         from 'expo-status-bar';
import { useFocusEffect }    from '@react-navigation/native';
import { auth }              from '../../services/firebase';
import { 
  getCurrentBudget, 
  getExpenses,
  getUserProfile,
  BUDGET_CATEGORIES,
} from '../../services/budgetService';
import {
  generateInsights,
} from '../../services/geminiService';

const { width } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  positive: '#34C759',
  negative: '#FF3B30',
  accent: '#1C1C1E',
  warning: '#F5A623',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
};

const FONTS = {
  bold: 'JosefinSans-Bold',
  semiBold: 'JosefinSans-SemiBold',
};

const INSIGHT_THEME = {
  warning:  { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' },
  tip:      { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  positive: { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  alert:    { bg: '#FFF1F2', border: '#F43F5E', text: '#BE123C' },
};

// ─── Smart Budget Recommendations ─────────────────────────────────────────────
// These are AI-like recommendations based on student budgeting best practices
const CATEGORY_RECOMMENDATIONS = {
  food: { 
    type: 'needs', 
    percent: 0.18, 
    tip: 'Essential for student life. Cook at home to save.',
    icon: 'restaurant-outline',
  },
  transport: { 
    type: 'needs', 
    percent: 0.10, 
    tip: 'Use student discounts and public transport.',
    icon: 'bus-outline',
  },
  data: { 
    type: 'needs', 
    percent: 0.04, 
    tip: 'Compare data plans. WiFi on campus saves money.',
    icon: 'wifi-outline',
  },
  books: { 
    type: 'needs', 
    percent: 0.06, 
    tip: 'Buy second-hand or use library resources.',
    icon: 'book-outline',
  },
  accommodation: { 
    type: 'needs', 
    percent: 0.25, 
    tip: 'Largest expense. Consider sharing or student housing.',
    icon: 'home-outline',
  },
  health: { 
    type: 'needs', 
    percent: 0.05, 
    tip: 'Use campus clinic. Prevention is cheaper than cure.',
    icon: 'fitness-outline',
  },
  entertainment: { 
    type: 'wants', 
    percent: 0.08, 
    tip: 'Look for student nights and free campus events.',
    icon: 'game-controller-outline',
  },
  savings: { 
    type: 'savings', 
    percent: 0.20, 
    tip: 'Pay yourself first! Build an emergency fund.',
    icon: 'save-outline',
  },
  other: { 
    type: 'wants', 
    percent: 0.04, 
    tip: 'Keep miscellaneous spending under control.',
    icon: 'apps-outline',
  },
};

// ─── InsightCard ──────────────────────────────────────────────────────────────
function InsightCard({ insight, index }) {
  const slideY  = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY,  { toValue: 0, delay: index * 110, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, delay: index * 110, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const theme = INSIGHT_THEME[insight.type] || INSIGHT_THEME.tip;

  return (
    <Animated.View style={[
      styles.insightCard,
      { backgroundColor: theme.bg, borderLeftColor: theme.border, opacity, transform: [{ translateY: slideY }] },
    ]}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightEmoji}>{insight.emoji}</Text>
        <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
      {insight.action ? (
        <View style={[styles.insightAction, { backgroundColor: theme.border + '22' }]}>
          <Ionicons name="arrow-forward-circle" size={13} color={theme.border} />
          <Text style={[styles.insightActionText, { color: theme.text }]}>{insight.action}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

// ─── ScoreBadge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, label, summary }) {
  const color = score >= 80 ? COLORS.positive : score >= 60 ? COLORS.warning : COLORS.negative;
  return (
    <View style={styles.scoreBadge}>
      <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.scoreGradient}>
        <View style={styles.scoreLeft}>
          <Text style={styles.scoreNumber}>{score}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreRight}>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          <Text style={styles.scoreSummary} numberOfLines={3}>{summary}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── BudgetPlanCard ───────────────────────────────────────────────────────────
function BudgetPlanCard({ category, recommended, tip, icon }) {
  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planCategoryInfo}>
          <View style={[styles.planDot, { backgroundColor: category.color }]} />
          <Text style={styles.planCategoryName}>{category.name}</Text>
        </View>
        <Text style={styles.planRecommended}>R{recommended.toLocaleString()}</Text>
      </View>
      
      {/* Progress bar showing percentage of income */}
      <View style={styles.planProgressTrack}>
        <View style={[
          styles.planProgressFill, 
          { 
            width: `${Math.min((recommended / (recommended * 5)) * 100, 100)}%`,
            backgroundColor: category.color,
          }
        ]} />
      </View>
      
      <View style={styles.planTipRow}>
        <Ionicons name="bulb-outline" size={14} color={COLORS.warning} />
        <Text style={styles.planTipText}>{tip}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AIAdvisorScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [activeTab,      setActiveTab]      = useState('insights');
  const [budgetData,     setBudgetData]     = useState(null);
  const [expenses,       setExpenses]       = useState([]);
  const [userProfile,    setUserProfile]    = useState(null);
  const [insights,       setInsights]       = useState(null);
  const [insightsError,  setInsightsError]  = useState(null);
  const [loadingData,    setLoadingData]    = useState(true);
  const [loadingAI,      setLoadingAI]      = useState(false);
  const [budgetPlan,     setBudgetPlan]     = useState(null);

  const userId = auth.currentUser?.uid;

  // ── Bootstrap ──
  useEffect(() => {
    (async () => {
      try {
        const [budget, expData, profile] = await Promise.all([
          getCurrentBudget(userId),
          getExpenses(userId),
          getUserProfile(userId),
        ]);

        setBudgetData(budget);
        setExpenses(expData || []);
        setUserProfile(profile);

        // Generate plan regardless of budget existence - just need income
        generateBudgetPlan(profile, expData || []);

        if (budget) {
          runInsights(budget, expData || []);
        }
      } catch (e) {
        console.error('AIAdvisor init:', e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  // ── Refresh on focus ──
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const [budget, expData, profile] = await Promise.all([
            getCurrentBudget(userId),
            getExpenses(userId),
            getUserProfile(userId),
          ]);

          setBudgetData(budget);
          setExpenses(expData || []);
          setUserProfile(profile);

          generateBudgetPlan(profile, expData || []);

          if (budget) {
            runInsights(budget, expData || []);
          }
        } catch (e) {
          console.log('Refresh error:', e);
        }
      })();
    }, [userId])
  );

  // ── AI Insights ──
  const runInsights = async (budget, expData) => {
    if (!budget) return;

    setLoadingAI(true);
    setInsightsError(null);
    
    try {
      const result = await generateInsights(budget, expData || []);
      setInsights(result);
    } catch (e) {
      console.error('Insights error:', e);
      setInsightsError(e.message || 'Could not load insights.');
    } finally {
      setLoadingAI(false);
    }
  };

  // ── Generate Smart Budget Plan (AI-like recommendations) ──
  const generateBudgetPlan = (profile, expData) => {
    // Get total income from profile or fallback
    const totalIncome = profile?.totalIncome || profile?.income || 0;
    
    if (totalIncome <= 0) {
      setBudgetPlan(null);
      return;
    }

    // Generate pure recommendations based on best practices
    // NOT using the user's current budget allocations
    const planCategories = BUDGET_CATEGORIES.map(cat => {
      const recommendation = CATEGORY_RECOMMENDATIONS[cat.id];
      
      if (!recommendation) {
        return {
          ...cat,
          recommended: 0,
          type: 'needs',
          tip: 'Track this category carefully.',
        };
      }

      const recommendedAmount = Math.round(totalIncome * recommendation.percent);
      
      return {
        ...cat,
        recommended: recommendedAmount,
        type: recommendation.type,
        tip: recommendation.tip,
      };
    });

    // Calculate totals for the 50/30/20 summary
    const needsTotal = planCategories
      .filter(c => c.type === 'needs')
      .reduce((sum, c) => sum + c.recommended, 0);
    
    const wantsTotal = planCategories
      .filter(c => c.type === 'wants')
      .reduce((sum, c) => sum + c.recommended, 0);
    
    const savingsTotal = planCategories
      .filter(c => c.type === 'savings')
      .reduce((sum, c) => sum + c.recommended, 0);

    // Calculate actual percentages
    const needsPercent = Math.round((needsTotal / totalIncome) * 100);
    const wantsPercent = Math.round((wantsTotal / totalIncome) * 100);
    const savingsPercent = Math.round((savingsTotal / totalIncome) * 100);

    setBudgetPlan({
      categories: planCategories.filter(c => c.recommended > 0),
      totalIncome,
      needsTotal,
      wantsTotal,
      savingsTotal,
      needsPercent,
      wantsPercent,
      savingsPercent,
    });
  };

  const formatMoney = (amount) => `R${Number(amount || 0).toLocaleString('en-ZA')}`;

  // ── Loading screen ──
  if (loadingData) {
    return (
      <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={styles.flex}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading advisor…</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']} style={styles.flex}>
      <StatusBar style="dark" />

      {/* Nav Header */}
      <View style={[styles.navHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>

        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>AI Advisor</Text>
          <View style={styles.finBadge}>
            <Text style={styles.finBadgeText}>Fin</Text>
          </View>
        </View>

        <Pressable
          style={styles.refreshBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (budgetData) {
              runInsights(budgetData, expenses);
            }
            generateBudgetPlan(userProfile, expenses);
          }}
        >
          <Ionicons name="refresh-outline" size={20} color={COLORS.muted} />
        </Pressable>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'insights', label: 'Insights', icon: 'bulb-outline' },
          { key: 'plan',     label: 'Budget Plan', icon: 'calculator-outline' },
        ].map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab.key);
            }}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? COLORS.text : COLORS.muted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ─────────────── Insights Tab ─────────────── */}
      {activeTab === 'insights' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.insightsScroll, { paddingBottom: insets.bottom + 120 }]}
        >
          {loadingAI ? (
            <View style={styles.aiLoadingBox}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.aiLoadingTitle}>Analysing your budget…</Text>
              <Text style={styles.aiLoadingSubtitle}>
                Fin is reviewing your spending patterns
              </Text>
            </View>
          ) : insightsError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={40} color={COLORS.negative} />
              <Text style={styles.errorText}>{insightsError}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => budgetData && runInsights(budgetData, expenses)}
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </Pressable>
            </View>
          ) : insights ? (
            <>
              <ScoreBadge
                score={insights.score}
                label={insights.scoreLabel}
                summary={insights.summary}
              />
              <Text style={styles.insightsSectionTitle}>Personalised Insights</Text>
              {insights.insights?.map((item, i) => (
                <InsightCard key={item.id || i} insight={item} index={i} />
              ))}
            </>
          ) : (
            <View style={styles.errorBox}>
              <Ionicons name="analytics-outline" size={40} color={COLORS.muted} />
              <Text style={styles.errorText}>Set up your budget to see insights.</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => budgetData && runInsights(budgetData, expenses)}
              >
                <Text style={styles.retryBtnText}>Generate Insights</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

      /* ─────────────── Budget Plan Tab ─────────────── */
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.planScroll, { paddingBottom: insets.bottom + 120 }]}
        >
          {budgetPlan ? (
            <>
              {/* Summary Card */}
              <View style={styles.planSummaryCard}>
                <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.planSummaryGradient}>
                  <View style={styles.planSummaryHeader}>
                    <Ionicons name="sparkles" size={22} color="#F5A623" />
                    <Text style={styles.planSummaryTitle}>Smart Budget Plan</Text>
                  </View>
                  <Text style={styles.planSummaryIncome}>
                    Based on your income of {formatMoney(budgetPlan.totalIncome)}
                  </Text>
                  
                  <View style={styles.planSummaryDivider} />
                  
                  <View style={styles.planSummaryRow}>
                    <View style={styles.planSummaryItem}>
                      <View style={[styles.planSummaryDot, { backgroundColor: '#3B82F6' }]} />
                      <View style={styles.planSummaryItemText}>
                        <Text style={styles.planSummaryLabel}>Needs</Text>
                        <Text style={styles.planSummaryPercent}>{budgetPlan.needsPercent}%</Text>
                      </View>
                      <Text style={styles.planSummaryValue}>{formatMoney(budgetPlan.needsTotal)}</Text>
                    </View>
                    <View style={styles.planSummaryItem}>
                      <View style={[styles.planSummaryDot, { backgroundColor: '#F59E0B' }]} />
                      <View style={styles.planSummaryItemText}>
                        <Text style={styles.planSummaryLabel}>Wants</Text>
                        <Text style={styles.planSummaryPercent}>{budgetPlan.wantsPercent}%</Text>
                      </View>
                      <Text style={styles.planSummaryValue}>{formatMoney(budgetPlan.wantsTotal)}</Text>
                    </View>
                    <View style={styles.planSummaryItem}>
                      <View style={[styles.planSummaryDot, { backgroundColor: '#22C55E' }]} />
                      <View style={styles.planSummaryItemText}>
                        <Text style={styles.planSummaryLabel}>Savings</Text>
                        <Text style={styles.planSummaryPercent}>{budgetPlan.savingsPercent}%</Text>
                      </View>
                      <Text style={styles.planSummaryValue}>{formatMoney(budgetPlan.savingsTotal)}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Rule explanation */}
              <View style={styles.ruleBox}>
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                <Text style={styles.ruleText}>
                  Fin recommends the <Text style={styles.ruleBold}>50/30/20 rule</Text> for students: 
                  50% for needs, 30% for wants, and 20% for savings. 
                  This builds good money habits while you study.
                </Text>
              </View>

              {/* Category Breakdown */}
              <Text style={styles.planSectionTitle}>Recommended Breakdown</Text>
              <Text style={styles.planSectionSubtitle}>
                Smart allocations based on student living costs in South Africa
              </Text>
              
              {budgetPlan.categories.map((cat, i) => (
                <BudgetPlanCard
                  key={cat.id}
                  category={cat}
                  recommended={cat.recommended}
                  tip={cat.tip}
                />
              ))}

              {/* Additional Tips */}
              <View style={styles.tipsCard}>
                <LinearGradient colors={['#EFF6FF', '#F8FAFC']} style={styles.tipsGradient}>
                  <Text style={styles.tipsTitle}>💡 Pro Tips from Fin</Text>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.positive} />
                    <Text style={styles.tipText}>Track every expense for 30 days to see your real spending</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.positive} />
                    <Text style={styles.tipText}>Save at least R200/month for emergencies</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.positive} />
                    <Text style={styles.tipText}>Use student discounts - ask everywhere!</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.positive} />
                    <Text style={styles.tipText}>Cook with friends to split food costs</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.positive} />
                    <Text style={styles.tipText}>Review your budget weekly, not monthly</Text>
                  </View>
                </LinearGradient>
              </View>
            </>
          ) : (
            <View style={styles.errorBox}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.muted} />
              <Text style={styles.errorText}>
                Add your income to see Fin's smart budget recommendations.
              </Text>
              <Text style={styles.errorSubtext}>
                Go to Budget Setup to enter your monthly income.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },

  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: {
    fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },

  // ── Nav ──
  navHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  navCenter:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navTitle:    { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.3 },
  finBadge:    { backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  finBadgeText:{ fontSize: 12, fontFamily: FONTS.bold, color: COLORS.positive },
  refreshBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, padding: 4, gap: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive:     { backgroundColor: COLORS.surface, shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText:       { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.muted },
  tabTextActive: { color: COLORS.text },

  // ── Insights ──
  insightsScroll: { paddingTop: 4 },

  scoreBadge:   { marginHorizontal: 16, marginBottom: 20, borderRadius: 22, overflow: 'hidden' },
  scoreGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 18, padding: 22,
  },
  scoreLeft:   { alignItems: 'center' },
  scoreNumber: { fontSize: 46, fontFamily: FONTS.bold, color: '#FFF', lineHeight: 50 },
  scoreOutOf:  { fontSize: 13, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.35)' },
  scoreDivider:{ width: 1, height: 52, backgroundColor: 'rgba(255,255,255,0.15)' },
  scoreRight:  { flex: 1 },
  scoreLabel:  { fontSize: 17, fontFamily: FONTS.bold, marginBottom: 6 },
  scoreSummary:{ fontSize: 12, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

  insightsSectionTitle: {
    fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text,
    marginHorizontal: 16, marginBottom: 12,
  },

  insightCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
    padding: 16, borderLeftWidth: 3,
  },
  insightHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  insightEmoji: { fontSize: 20 },
  insightTitle: { fontSize: 14, fontFamily: FONTS.bold, flex: 1 },
  insightMessage: {
    fontSize: 13, fontFamily: FONTS.semiBold, color: '#374151', lineHeight: 20, marginBottom: 8,
  },
  insightAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  insightActionText: { fontSize: 12, fontFamily: FONTS.semiBold },

  aiLoadingBox: {
    alignItems: 'center', paddingVertical: 60, gap: 12,
  },
  aiLoadingTitle: {
    fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text,
  },
  aiLoadingSubtitle: {
    fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },

  errorBox: {
    alignItems: 'center', padding: 32, gap: 12,
  },
  errorText: {
    fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted,
    textAlign: 'center', lineHeight: 20,
  },
  errorSubtext: {
    fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  retryBtnText: { fontSize: 15, fontFamily: FONTS.bold, color: '#FFF' },

  // ── Budget Plan ──
  planScroll: { paddingTop: 4 },

  planSummaryCard: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 22, overflow: 'hidden',
  },
  planSummaryGradient: {
    padding: 22, gap: 14,
  },
  planSummaryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  planSummaryTitle: {
    fontSize: 20, fontFamily: FONTS.bold, color: '#FFF', letterSpacing: -0.3,
  },
  planSummaryIncome: {
    fontSize: 13, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.5)',
  },
  planSummaryDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  planSummaryRow: {
    gap: 10,
  },
  planSummaryItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  planSummaryDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  planSummaryItemText: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  planSummaryLabel: {
    fontSize: 14, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.7)',
  },
  planSummaryPercent: {
    fontSize: 12, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.4)',
  },
  planSummaryValue: {
    fontSize: 15, fontFamily: FONTS.bold, color: '#FFF',
  },

  ruleBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#3B82F6',
  },
  ruleText: {
    flex: 1, fontSize: 13, fontFamily: FONTS.semiBold, color: '#1D4ED8', lineHeight: 18,
  },
  ruleBold: {
    fontFamily: FONTS.bold,
  },

  planSectionTitle: {
    fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text,
    marginHorizontal: 16, marginBottom: 4,
  },
  planSectionSubtitle: {
    fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted,
    marginHorizontal: 16, marginBottom: 16,
  },

  planCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  planHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  planCategoryInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  planDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  planCategoryName: {
    fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text,
  },
  planRecommended: {
    fontSize: 16, fontFamily: FONTS.bold, color: COLORS.accent,
  },
  planProgressTrack: {
    height: 4, borderRadius: 99, backgroundColor: '#F1F5F9',
    marginBottom: 10, overflow: 'hidden',
  },
  planProgressFill: {
    height: '100%', borderRadius: 99,
  },
  planTipRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  planTipText: {
    flex: 1, fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.muted,
    lineHeight: 16,
  },

  // ── Tips Card ──
  tipsCard: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 20,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  tipsGradient: {
    padding: 18, gap: 12,
  },
  tipsTitle: {
    fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text,
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  tipText: {
    flex: 1, fontSize: 13, fontFamily: FONTS.semiBold, color: '#374151',
    lineHeight: 18,
  },
});