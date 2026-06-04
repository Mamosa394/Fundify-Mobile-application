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
  BackHandler,
  Platform,
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
import { StackActions } from '@react-navigation/native';

// Firebase imports
import { 
  doc, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { auth } from '../../services/firebase';

import { BUDGET_CATEGORIES } from '../../services/budgetService';
import BudgetGalaxy from '../../components/three/BudgetGalaxy';
import ScrollableTopTabBar from '../../../src/screens/Budget/components/ScrollableTopBar';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#F2F2F7',
  surface:    '#FFFFFF',
  text:       '#0A0A0A',
  muted:      '#8E8E93',
  positive:   '#34C759',
  negative:   '#FF3B30',
  warning:    '#FF9500',
  accent:     '#1C1C1E',
  border:     'rgba(0,0,0,0.06)',
  cardShadow: 'rgba(0,0,0,0.04)',
};

const formatMoney = (amount) =>
  `R${Number(amount || 0).toLocaleString('en-ZA')}`;

// ─── BudgetRing (Kept as fallback) ────────────────────────────────────────────
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
  const isWarning = progress >= 0.8 && progress < 1;
  const barColor    = isOverBudget ? COLORS.negative : isWarning ? COLORS.warning : item.color;

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
          colors={[
            isOverBudget ? `${COLORS.negative}15` : isWarning ? `${COLORS.warning}15` : `${item.color}15`,
            isOverBudget ? `${COLORS.negative}08` : isWarning ? `${COLORS.warning}08` : `${item.color}08`
          ]}
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
                { 
                  width: `${Math.min(progress * 100, 100)}%`, 
                  backgroundColor: barColor 
                },
              ]}
            />
          </View>
          <Text style={[
            styles.progressText,
            isOverBudget && styles.progressTextDanger,
            isWarning && styles.progressTextWarning
          ]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>

      <View style={styles.categoryAmounts}>
        <Text style={[
          styles.spentAmount,
          isOverBudget && styles.spentAmountDanger
        ]}>
          {formatMoney(item.spent)}
        </Text>
        <Text style={styles.budgetedAmount}>/ {formatMoney(item.budgeted)}</Text>
      </View>
    </Pressable>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
function SummaryCard({ label, amount, percentage, isPositive, icon, isWarning }) {
  return (
    <View style={styles.summaryCard}>
      <View style={[
        styles.summaryIconWrap,
        isWarning && styles.summaryIconWarning
      ]}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={isWarning ? COLORS.warning : COLORS.accent} 
        />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[
        styles.summaryAmount, 
        isPositive ? styles.positiveText : isWarning ? styles.warningText : styles.negativeText
      ]}>
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
  
  const [budget,       setBudget]       = useState(null);
  const [expenses,     setExpenses]     = useState([]);
  const [userProfile,  setUserProfile]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [needsSetup,   setNeedsSetup]   = useState(false);

  const userId = auth.currentUser?.uid;
  const currentMonth = new Date().toISOString().slice(0, 7);

  // ── Handle Android back button ──────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });

    return () => {
      if (backHandler && typeof backHandler.remove === 'function') {
        backHandler.remove();
      }
    };
  }, []);

  // ── Real-time listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      console.log('No user logged in');
      setLoading(false);
      return;
    }

    console.log('Setting up real-time listeners for user:', userId);
    setLoading(true);

    const userRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          setUserProfile(userData);
        }
      },
      (error) => {
        console.error('Error listening to user profile:', error);
      }
    );

    const budgetRef = doc(db, 'users', userId, 'budgets', currentMonth);
    const unsubscribeBudget = onSnapshot(
      budgetRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const budgetData = { id: docSnapshot.id, ...docSnapshot.data() };
          setBudget(budgetData);
          setNeedsSetup(false);
          setLoading(false);
        } else {
          setBudget(null);
          setNeedsSetup(true);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to budget:', error);
        setLoading(false);
      }
    );

    const expensesRef = collection(db, 'users', userId, 'expenses');
    const expensesQuery = query(
      expensesRef,
      where('month', '==', currentMonth)
    );

    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (querySnapshot) => {
        const expenseData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        expenseData.sort((a, b) => {
          const dateA = a.date ? new Date(a.date) : new Date(0);
          const dateB = b.date ? new Date(b.date) : new Date(0);
          return dateB - dateA;
        });
        
        setExpenses(expenseData);
      },
      (error) => {
        console.error('Error listening to expenses:', error);
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeBudget();
      unsubscribeExpenses();
    };
  }, [userId, currentMonth]);

  // Redirect to setup wizard if no budget exists
  useEffect(() => {
    if (needsSetup && !loading) {
      navigation.dispatch(
        StackActions.replace('BudgetSetupWizard')
      );
    }
  }, [needsSetup, loading, navigation]);

  // Manual refresh
  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // ── Derive categories from budget data ──
  const categories = useMemo(() => {
    if (!budget?.categories) return [];
    
    return BUDGET_CATEGORIES.map((cat) => {
      const categoryData = budget.categories[cat.id] || {};
      return {
        ...cat,
        spent: categoryData.spent || 0,
        budgeted: categoryData.budgeted || 0,
      };
    }).filter(cat => cat.budgeted > 0 || cat.spent > 0);
  }, [budget]);

  // ── Derive recent expenses ──
  const recentExpenses = useMemo(() => {
    return expenses.slice(0, 5);
  }, [expenses]);

  // ── Calculate totals ──
  const totalIncome = userProfile?.totalIncome || 
                      userProfile?.income || 
                      budget?.income || 
                      budget?.totalBudget || 
                      0;
  
  const totalSpent  = budget?.spentTotal || 0;
  const totalBudget = budget?.totalBudget || 0;
  const remaining = totalBudget > 0 ? Math.max(0, totalBudget - totalSpent) : 0;
  const savingsAmount = budget?.categories?.savings?.budgeted || 0;
  
  const expensePercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const savingsPercentage = totalIncome > 0 ? Math.round((savingsAmount / totalIncome) * 100) : 0;
  
  // ── Smart budget metrics for 3D visualization ──
  const budgetProgress = totalBudget > 0 ? Math.min(totalSpent / totalBudget, 1) : 0;
  const savingsUrgency = totalIncome > 0 ? Math.max(0, 1 - (savingsAmount / totalIncome)) : 0;
  
  // Determine spending state for visual feedback
  const spendingState = useMemo(() => {
    if (budgetProgress >= 1) return 'critical';
    if (budgetProgress >= 0.8) return 'warning';
    if (budgetProgress >= 0.5) return 'moderate';
    return 'healthy';
  }, [budgetProgress]);

  // Calculate day of month for pro-rata budget check
  const dayProgress = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return now.getDate() / daysInMonth;
  }, []);

  // Smart overspending detection (spending faster than time passing)
  const isSpendingTooFast = budgetProgress > dayProgress && budgetProgress > 0.3;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading your budget...</Text>
      </SafeAreaView>
    );
  }

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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.dispatch(
              StackActions.replace('BudgetSetupWizard')
            );
          }}
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

      {/* ── Scrollable Top Tab Bar ── */}
      <ScrollableTopTabBar
        tabs={['Budget', 'Expenses']}
        activeTab="Budget"
        onTabPress={(tab) => {
          if (tab === 'Expenses') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('ExpenseDetail', {
              categoryId: 'all',
              categoryName: 'All Expenses',
            });
          }
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        contentContainerStyle={[styles.content, { paddingTop: 4 }]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Budget</Text>
            <Text style={styles.monthLabel}>
              {new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
            </Text>
          </View>

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

        {/* ── 3D Galaxy Visualization Card ── */}
        <View style={[
          styles.galaxyCard,
          spendingState === 'critical' && styles.galaxyCardCritical,
          spendingState === 'warning' && styles.galaxyCardWarning,
        ]}>
          <View style={[
            styles.galaxyContainer,
            spendingState === 'critical' && styles.galaxyContainerCritical,
            spendingState === 'warning' && styles.galaxyContainerWarning,
          ]}>
            <BudgetGalaxy
              mode="financial"
              budgetProgress={
                spendingState === 'critical' ? budgetProgress : 
                spendingState === 'warning' ? budgetProgress * 0.8 : 
                budgetProgress * 0.6
              }
              scholarshipUrgency={
                spendingState === 'critical' ? savingsUrgency * 1.5 : 
                spendingState === 'warning' ? savingsUrgency * 1.2 : 
                savingsUrgency * 0.4
              }
              academicRisk={spendingState === 'critical' ? 0.8 : spendingState === 'warning' ? 0.4 : 0}
              engagement={
                spendingState === 'critical' ? budgetProgress * 1.2 : 
                spendingState === 'warning' ? budgetProgress * 0.9 : 
                budgetProgress * 0.5
              }
            />
          </View>
          
          <View style={styles.galaxyOverlay} pointerEvents="none">
            {spendingState !== 'healthy' && (
              <View style={[
                styles.alertBanner,
                spendingState === 'critical' ? styles.alertBannerCritical : styles.alertBannerWarning
              ]}>
                <Ionicons 
                  name={spendingState === 'critical' ? 'warning' : 'alert-circle'} 
                  size={16} 
                  color="#FFF" 
                />
                <Text style={styles.alertText}>
                  {spendingState === 'critical' 
                    ? 'Budget exceeded! Reduce spending' 
                    : isSpendingTooFast 
                      ? 'Spending faster than usual'
                      : 'Approaching budget limit'}
                </Text>
              </View>
            )}
            
            <View style={styles.galaxyStats}>
              <Text style={[
                styles.galaxyRemaining,
                spendingState === 'critical' && styles.galaxyRemainingCritical,
                spendingState === 'warning' && styles.galaxyRemainingWarning,
              ]}>
                {formatMoney(remaining)}
              </Text>
              <Text style={styles.galaxyLabel}>
                {spendingState === 'critical' ? 'Over Budget' : 'Remaining'}
              </Text>
            </View>
            
            <View style={[
              styles.galaxyDetails,
              spendingState === 'critical' && styles.galaxyDetailsCritical,
            ]}>
              <View style={styles.galaxyDetailItem}>
                <Text style={styles.galaxyDetailValue}>
                  {totalBudget > 0 ? `R${totalBudget.toLocaleString('en-ZA')}` : '—'}
                </Text>
                <Text style={styles.galaxyDetailLabel}>Budget</Text>
              </View>
              <View style={styles.galaxyDivider} />
              <View style={styles.galaxyDetailItem}>
                <Text style={[
                  styles.galaxyDetailValue,
                  spendingState === 'critical' && styles.galaxyDetailValueDanger,
                  spendingState === 'warning' && styles.galaxyDetailValueWarning,
                ]}>
                  {Math.round(budgetProgress * 100)}%
                </Text>
                <Text style={styles.galaxyDetailLabel}>Spent</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Summary Row ── */}
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Income"
            amount={totalIncome}
            percentage={100}
            isPositive={true}
            icon="arrow-down-circle-outline"
          />
          <SummaryCard
            label="Expenses"
            amount={totalSpent}
            percentage={expensePercentage}
            isPositive={false}
            isWarning={spendingState === 'warning'}
            icon="arrow-up-circle-outline"
          />
          <SummaryCard
            label="Savings"
            amount={savingsAmount}
            percentage={savingsPercentage}
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
                    <Text style={styles.expenseName}>
                      {expense.note || expense.description || category?.name || 'Expense'}
                    </Text>
                    <Text style={styles.expenseDate}>{expense.date}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>-{formatMoney(expense.amount)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Categories Section ── */}
        {categories.length > 0 && (
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
        )}

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
    marginBottom: 40,
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
    paddingBottom: 4,
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
  
  // ── Galaxy Card Styles ──
  galaxyCard: {
    height: 300,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#0A1520',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    transition: 'all 0.3s ease',
  },
  galaxyCardCritical: {
    backgroundColor: '#1A0A0A',
    shadowColor: COLORS.negative,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  galaxyCardWarning: {
    backgroundColor: '#1A120A',
    shadowColor: COLORS.warning,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.2)',
  },
  galaxyContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  galaxyContainerCritical: {
    opacity: 0.85,
  },
  galaxyContainerWarning: {
    opacity: 0.75,
  },
  galaxyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: 'rgba(10, 21, 32, 0.4)',
  },
  
  // ── Alert Banner ──
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
    alignSelf: 'center',
  },
  alertBannerCritical: {
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  alertBannerWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  alertText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  
  galaxyStats: {
    alignItems: 'center',
    marginTop: 8,
  },
  galaxyRemaining: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  galaxyRemainingCritical: {
    color: '#FF6B6B',
  },
  galaxyRemainingWarning: {
    color: '#FFB74D',
  },
  galaxyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 6,
  },
  galaxyDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  galaxyDetailsCritical: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  galaxyDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  galaxyDetailValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  galaxyDetailValueDanger: {
    color: '#FF6B6B',
  },
  galaxyDetailValueWarning: {
    color: '#FFB74D',
  },
  galaxyDetailLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  galaxyDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  
  // ── Original Ring Styles ──
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
  
  // ── Summary & Content Styles ──
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
  summaryIconWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
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
  warningText: { color: COLORS.warning },
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
  categoriesList: { 
    marginBottom: 24,
  },
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
  progressTextDanger: {
    color: COLORS.negative,
    fontWeight: '700',
  },
  progressTextWarning: {
    color: COLORS.warning,
    fontWeight: '700',
  },
  categoryAmounts: { alignItems: 'flex-end' },
  spentAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  spentAmountDanger: {
    color: COLORS.negative,
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
    marginBottom: 20,
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
  bottomSpacing: { 
    height: 100,
  },
});