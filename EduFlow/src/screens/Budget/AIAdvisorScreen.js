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
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
  aiBubble: '#E8EDF5',
};

const FONTS = {
  bold: 'JosefinSans-Bold',
  semiBold: 'JosefinSans-SemiBold',
};

const INSIGHT_THEME = {
  warning:  { bg: '#FEF3C7', border: '#ffffff', text: '#B45309' },
  tip:      { bg: '#EFF6FF', border: '#ffffff', text: '#1D4ED8' },
  positive: { bg: '#F0FDF4', border: '#ffffff', text: '#15803D' },
  alert:    { bg: '#FFF1F2', border: '#ffffff', text: '#BE123C' },
};

const CATEGORY_RECOMMENDATIONS = {
  food: { 
    type: 'needs', 
    percent: 0.20, 
    tip: 'Essential for student life. Cook at home with friends to save. Local markets are cheaper than supermarkets.',
    icon: 'restaurant-outline',
  },
  transport: { 
    type: 'needs', 
    percent: 0.08, 
    tip: 'Use student discounts on taxis and khombis. Walking saves money on short trips.',
    icon: 'bus-outline',
  },
  data: { 
    type: 'needs', 
    percent: 0.05, 
    tip: 'Use campus WiFi when available. Compare prepaid data bundles from Econet, Vodacom, and MTN.',
    icon: 'wifi-outline',
  },
  books: { 
    type: 'needs', 
    percent: 0.05, 
    tip: 'Buy second-hand textbooks from older students. Use NUL library resources.',
    icon: 'book-outline',
  },
  accommodation: { 
    type: 'needs', 
    percent: 0.30, 
    tip: 'Largest expense. Consider sharing with 2-3 roommates or staying in university hostels.',
    icon: 'home-outline',
  },
  health: { 
    type: 'needs', 
    percent: 0.04, 
    tip: 'Use campus clinic. NHIS can help with medical costs.',
    icon: 'fitness-outline',
  },
  entertainment: { 
    type: 'wants', 
    percent: 0.08, 
    tip: 'Free campus events, hiking in the mountains, and movie nights at home are great low-cost options.',
    icon: 'game-controller-outline',
  },
  savings: { 
    type: 'savings', 
    percent: 0.15, 
    tip: 'Pay yourself first! Save for emergencies, graduation fees, and future goals.',
    icon: 'save-outline',
  },
  other: { 
    type: 'wants', 
    percent: 0.05, 
    tip: 'Keep miscellaneous spending under control. Track every Maloti spent.',
    icon: 'apps-outline',
  },
};

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

function LoadingBubbles() {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animateDot = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -12,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, []);

  return (
    <View style={styles.loadingBubbleContainer}>
      <View style={styles.loadingBubble}>
        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot3 }] }]} />
        <Text style={styles.loadingText}>Fin is thinking...</Text>
      </View>
    </View>
  );
}

function TypingMessage({ text, onComplete, speed = 20 }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplayedText('');
    indexRef.current = 0;
    setIsComplete(false);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(prev => prev + text[indexRef.current]);
        indexRef.current++;
      } else {
        clearInterval(timerRef.current);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, speed);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed]);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Text style={styles.typingMessageText}>{displayedText}</Text>
        {!isComplete && <Text style={styles.cursor}>|</Text>}
      </View>
    </View>
  );
}

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

function BudgetPlanCard({ category, recommended, tip, icon }) {
  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planCategoryInfo}>
          <View style={[styles.planDot, { backgroundColor: category.color }]} />
          <Text style={styles.planCategoryName}>{category.name}</Text>
        </View>
        <Text style={styles.planRecommended}>M{recommended.toLocaleString()}</Text>
      </View>
      
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
  const [showTyping,     setShowTyping]     = useState(false);
  const [typingInsight,  setTypingInsight]  = useState(null);
  const [insightIndex,   setInsightIndex]   = useState(0);

  const userId = auth.currentUser?.uid;

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

        generateBudgetPlan(profile, expData || []);

        if (budget) {
          await runInsightsWithTyping(budget, expData || []);
        }
      } catch (e) {
        console.error('AIAdvisor init:', e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

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
            await runInsightsWithTyping(budget, expData || []);
          }
        } catch (e) {
          console.log('Refresh error:', e);
        }
      })();
    }, [userId])
  );

  const runInsightsWithTyping = async (budget, expData) => {
    if (!budget) return;

    setLoadingAI(true);
    setInsightsError(null);
    setShowTyping(false);
    setTypingInsight(null);
    setInsightIndex(0);
    
    try {
      const result = await generateInsights(budget, expData || []);
      setInsights(result);
      
      if (result?.insights?.length > 0) {
        setShowTyping(true);
        setTypingInsight(result.insights[0]);
      } else {
        setLoadingAI(false);
      }
    } catch (e) {
      console.error('Insights error:', e);
      setInsightsError(e.message || 'Could not load insights.');
      setLoadingAI(false);
    }
  };

  const handleTypingComplete = () => {
    const nextIndex = insightIndex + 1;
    if (insights?.insights && nextIndex < insights.insights.length) {
      setInsightIndex(nextIndex);
      setTypingInsight(insights.insights[nextIndex]);
    } else {
      setShowTyping(false);
      setLoadingAI(false);
    }
  };

  const generateBudgetPlan = (profile, expData) => {
    const totalIncome = profile?.totalIncome || profile?.income || 0;
    
    if (totalIncome <= 0) {
      setBudgetPlan(null);
      return;
    }

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

    const needsTotal = planCategories
      .filter(c => c.type === 'needs')
      .reduce((sum, c) => sum + c.recommended, 0);
    
    const wantsTotal = planCategories
      .filter(c => c.type === 'wants')
      .reduce((sum, c) => sum + c.recommended, 0);
    
    const savingsTotal = planCategories
      .filter(c => c.type === 'savings')
      .reduce((sum, c) => sum + c.recommended, 0);

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

  const formatMoney = (amount) => `M${Number(amount || 0).toLocaleString('en-ZA')}`;

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
              runInsightsWithTyping(budgetData, expenses);
            }
            generateBudgetPlan(userProfile, expenses);
          }}
        >
          <Ionicons name="refresh-outline" size={20} color={COLORS.muted} />
        </Pressable>
      </View>

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

      {activeTab === 'insights' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.insightsScroll, { paddingBottom: insets.bottom + 100 }]}
        >
          {loadingAI && !showTyping ? (
            <LoadingBubbles />
          ) : insightsError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={40} color={COLORS.negative} />
              <Text style={styles.errorText}>{insightsError}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => budgetData && runInsightsWithTyping(budgetData, expenses)}
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
              
              {showTyping && typingInsight ? (
                <TypingMessage
                  text={`${typingInsight.emoji || '💡'} ${typingInsight.title}\n\n${typingInsight.message}`}
                  onComplete={handleTypingComplete}
                  speed={15}
                />
              ) : null}
              
              {!showTyping && !loadingAI && insights.insights?.map((item, i) => (
                <InsightCard key={item.id || i} insight={item} index={i} />
              ))}
            </>
          ) : (
            <View style={styles.errorBox}>
              <Ionicons name="analytics-outline" size={40} color={COLORS.muted} />
              <Text style={styles.errorText}>Set up your budget to see insights.</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => budgetData && runInsightsWithTyping(budgetData, expenses)}
              >
                <Text style={styles.retryBtnText}>Generate Insights</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.planScroll, { paddingBottom: insets.bottom + 100 }]}
        >
          {budgetPlan ? (
            <>
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

              <View style={styles.ruleBox}>
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                <Text style={styles.ruleText}>
                  Fin recommends the <Text style={styles.ruleBold}>50/30/20 rule</Text> for students: 
                  50% for needs, 30% for wants, and 20% for savings. 
                  This builds good money habits while you study.
                </Text>
              </View>

              <Text style={styles.planSectionTitle}>Recommended Breakdown</Text>
              <Text style={styles.planSectionSubtitle}>
                Smart allocations based on student living costs in Lesotho
              </Text>
              
              {budgetPlan.categories.map((cat, i) => (
                <BudgetPlanCard
                  key={cat.id}
                  category={cat}
                  recommended={cat.recommended}
                  tip={cat.tip}
                />
              ))}

              <View style={styles.tipsCard}>
                <LinearGradient colors={['#EFF6FF', '#F8FAFC']} style={styles.tipsGradient}>
                  <Text style={styles.tipsTitle}>💡 Pro Tips from Fin</Text>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.positive} />
                    <Text style={styles.tipText}>Track every expense for 30 days to see your real spending</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.positive} />
                    <Text style={styles.tipText}>Save at least M200/month for emergencies</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },

  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: {
    fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },

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
    marginHorizontal: 16, marginBottom: 12,borderColor: COLORS.border, borderBottomWidth: 1, paddingBottom: 4,
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

  loadingBubbleContainer: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40,
  },
  loadingBubble: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.aiBubble, paddingHorizontal: 20,
    paddingVertical: 14, borderRadius: 24, minWidth: 140,
  },
  loadingDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent,
  },
  loadingText: {
    fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.muted,
    marginLeft: 8,
  },

  typingContainer: {
    marginHorizontal: 16, marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: COLORS.aiBubble, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typingMessageText: {
    fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text,
    lineHeight: 22, flexShrink: 1,
  },
  cursor: {
    fontSize: 16, color: COLORS.accent, fontWeight: 'bold',
    marginLeft: 2,
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
    borderLeftWidth: 3, 
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