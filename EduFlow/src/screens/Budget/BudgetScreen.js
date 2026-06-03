// src/screens/Budget/BudgetScreen.js

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }       from '@expo/vector-icons';
import * as Haptics       from 'expo-haptics';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { StatusBar }      from 'expo-status-bar';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import {
  getCurrentBudget,
  getExpenses,
  BUDGET_CATEGORIES,
  initializeUserBudget,
} from '../../services/budgetService';

import { auth } from '../../services/firebase';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#F2F2F7',
  surface:    '#FFFFFF',
  text:       '#0A0A0A',
  muted:      '#8E8E93',
  positive:   '#34C759',
  negative:   '#FF3B30',
  accent:     '#1C1C1E',
  border:     'rgba(0,0,0,0.06)',
  cardShadow: 'rgba(0,0,0,0.04)',
};

const formatMoney = (amount) =>
  `R${Number(amount || 0).toLocaleString('en-ZA')}`;

// ─── BudgetRing ───────────────────────────────────────────────────────────────
function BudgetRing({ spent = 0, total = 1 }) {
  const size          = 180;
  const strokeWidth   = 14;
  const radius        = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const progress      = Math.min(spent / total, 1);
  const dashOffset    = circumference - circumference * progress;
  const remaining     = total - spent;
  const percentSpent  = Math.round(progress * 100);

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%"   stopColor="#1C1C1E" />
            <Stop offset="100%" stopColor="#48484A" />
          </SvgGradient>
        </Defs>

        <Circle
          stroke={COLORS.border}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        <Circle
          stroke="url(#ringGrad)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.ringContent}>
        <Text style={styles.ringRemaining}>{formatMoney(remaining)}</Text>
        <Text style={styles.ringLabel}>Leftover</Text>
        <Text style={styles.ringPercentage}>{percentSpent}% spent</Text>
      </View>
    </View>
  );
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────
function CategoryRow({ item, onPress }) {
  const progress    = Math.min(item.budgeted > 0 ? item.spent / item.budgeted : 0, 1);
  const isOverBudget = progress >= 1;
  const barColor    = isOverBudget ? COLORS.negative : item.color;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.categoryCard,
        pressed && styles.categoryCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.categoryIconContainer}>
        <LinearGradient
          colors={[`${item.color}15`, `${item.color}08`]}
          style={styles.categoryIconGradient}
        >
          <View style={[styles.categoryDot, { backgroundColor: barColor }]} />
        </LinearGradient>
      </View>

      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: barColor },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      </View>

      <View style={styles.categoryAmounts}>
        <Text style={styles.spentAmount}>{formatMoney(item.spent)}</Text>
        <Text style={styles.budgetedAmount}>/ {formatMoney(item.budgeted)}</Text>
      </View>
    </Pressable>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
function SummaryCard({ label, amount, percentage, isPositive, icon }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIconWrap}>
        <Ionicons name={icon} size={20} color={COLORS.accent} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryAmount, isPositive ? styles.positiveText : styles.negativeText]}>
        {isPositive ? '+' : '-'}{formatMoney(amount)}
      </Text>
      <Text style={styles.summaryPercentage}>{percentage}%</Text>
    </View>
  );
}

// ─── BudgetScreen ─────────────────────────────────────────────────────────────
export default function BudgetScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  const [budget,     setBudget]     = useState(null);
  const [expenses,   setExpenses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const userId = auth.currentUser?.uid;

  const loadData = useCallback(async () => {
    if (!userId) {
      console.log('No user logged in');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Loading budget for user:', userId);
      
      const budgetData = await getCurrentBudget(userId);
      
      // If no budget exists for current month, redirect to setup wizard
      if (!budgetData) {
        console.log('No budget found - redirecting to setup wizard');
        setNeedsSetup(true);
        setLoading(false);
        return;
      }
      
      // Budget exists, load expenses
      const expenseData = await getExpenses(userId);
      
      setBudget(budgetData);
      setExpenses(expenseData || []);
      setNeedsSetup(false);
      console.log('Budget loaded successfully');
    } catch (error) {
      console.error('BudgetScreen loadData error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load data when screen is focused or userId changes
  useEffect(() => {
    if (userId && isFocused) {
      loadData();
    }
  }, [loadData, userId, isFocused]);

  // Redirect to setup wizard if no budget exists
  useEffect(() => {
    if (needsSetup && !loading) {
      navigation.navigate('BudgetSetupWizard');
    }
  }, [needsSetup, loading, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const categories = useMemo(() => {
    if (!budget?.categories) return [];
    return BUDGET_CATEGORIES.map((cat) => ({
      ...cat,
      spent:    budget.categories?.[cat.id]?.spent    || 0,
      budgeted: budget.categories?.[cat.id]?.budgeted || 0,
    }));
  }, [budget]);

  // Get recent expenses for the expenses list
  const recentExpenses = useMemo(() => {
    return expenses.slice(0, 5); // Show last 5 expenses
  }, [expenses]);

  const totalSpent  = budget?.spentTotal   || 0;
  const totalBudget = budget?.totalBudget  || 0;
  const remaining   = totalBudget - totalSpent;
  const savingsRate = totalBudget > 0
    ? ((remaining / totalBudget) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading your budget...</Text>
      </SafeAreaView>
    );
  }

  // If no budget exists, show setup prompt
  if (!budget) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="wallet-outline" size={64} color={COLORS.muted} />
        <Text style={styles.noBudgetTitle}>No Budget Set Up</Text>
        <Text style={styles.noBudgetText}>
          Set up your monthly budget to start tracking your expenses
        </Text>
        <Pressable
          style={styles.setupButton}
          onPress={() => navigation.navigate('BudgetSetupWizard')}
        >
          <LinearGradient
            colors={['#1C1C1E', '#2C2C2E']}
            style={styles.setupButtonGradient}
          >
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.setupButtonText}>Set Up Budget</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        contentContainerStyle={styles.content}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Budget</Text>
            <Text style={styles.monthLabel}>
              {new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* + button for adding additional expenses */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('AddExpenseModal');
            }}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </Pressable>
        </View>

        {/* ── Hero Ring Card ── */}
        <View style={styles.heroCard}>
          <BudgetRing spent={totalSpent} total={totalBudget} />
          <Text style={styles.budgetLabel}>
            {totalBudget > 0 
              ? `R${totalBudget.toLocaleString('en-ZA')} monthly budget`
              : 'No budget set'}
          </Text>
        </View>

        {/* ── Summary Row ── */}
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Income"
            amount={totalBudget}
            percentage={100}
            isPositive={true}
            icon="arrow-down-circle-outline"
          />
          <SummaryCard
            label="Expenses"
            amount={totalSpent}
            percentage={totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}
            isPositive={false}
            icon="arrow-up-circle-outline"
          />
          <SummaryCard
            label="Savings"
            amount={remaining}
            percentage={savingsRate}
            isPositive={true}
            icon="shield-checkmark-outline"
          />
        </View>

        {/* ── Recent Expenses ── */}
        {recentExpenses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
              <Pressable onPress={() => navigation.navigate('ExpenseDetail', {
                categoryId: 'all',
                categoryName: 'All Expenses',
              })}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            {recentExpenses.map((expense) => {
              const category = BUDGET_CATEGORIES.find(c => c.id === expense.category);
              return (
                <View key={expense.id} style={styles.expenseRow}>
                  <View style={[styles.expenseIcon, { backgroundColor: (category?.color || '#9CA3AF') + '20' }]}>
                    <Ionicons name={category?.icon || 'apps-outline'} size={18} color={category?.color || '#9CA3AF'} />
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseName}>{expense.note || expense.description || category?.name}</Text>
                    <Text style={styles.expenseDate}>{expense.date}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>-{formatMoney(expense.amount)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Categories Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
          </View>

          <View style={styles.categoriesList}>
            {categories.map((item) => (
              <CategoryRow
                key={item.id}
                item={item}
                onPress={() => {
                  Haptics.selectionAsync();
                  navigation.navigate('ExpenseDetail', {
                    categoryId:   item.id,
                    categoryName: item.name,
                  });
                }}
              />
            ))}
          </View>
        </View>

        {/* ── CTA Banner → AI Advisor ── */}
        <Pressable
          style={styles.ctaBanner}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('AIAdvisor');
          }}
        >
          <LinearGradient
            colors={['#1C1C1E', '#2C2C2E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaContent}>
              <View style={styles.ctaIconWrap}>
                <Ionicons name="sparkles-outline" size={24} color="#FFF" />
              </View>
              <View style={styles.ctaTextWrap}>
                <Text style={styles.ctaTitle}>Smart Budget Insights</Text>
                <Text style={styles.ctaSubtitle}>
                  AI-powered spending recommendations
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.muted,
  },
  noBudgetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  noBudgetText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  setupButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  setupButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 10,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1.5,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 2,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  headerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 32,
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringRemaining: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ringPercentage: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
    marginTop: 4,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  positiveText: { color: COLORS.positive },
  negativeText: { color: COLORS.negative },
  summaryPercentage: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  viewAll: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.muted,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  expenseDate: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.negative,
  },
  categoriesList: { marginBottom: 24 },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  categoryIconContainer: { marginRight: 14 },
  categoryIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    minWidth: 36,
  },
  categoryAmounts: { alignItems: 'flex-end' },
  spentAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  budgetedAmount: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
    marginTop: 2,
  },
  ctaBanner: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  ctaGradient: { borderRadius: 24 },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  ctaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTextWrap: { flex: 1 },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  bottomSpacing: { height: 40 },
});