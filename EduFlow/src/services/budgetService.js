// src/screens/Budget/BudgetScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { auth } from '../../services/firebase';
import {
  getCurrentBudget,
  getExpenses,
  BUDGET_CATEGORIES,
} from '../../services/budgetService';

const { width } = Dimensions.get('window');

// ============ DESIGN TOKENS ============
const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  positive: '#34C759',
  negative: '#FF3B30',
  accent: '#1C1C1E',
  warning: '#F5A623',
  border: 'rgba(255,255,255,0.95)',
  cardShadow: '#CBD5E1',
};

const FONTS = {
  bold: 'JosefinSans-Bold',
  semiBold: 'JosefinSans-SemiBold',
};

// ============ HELPER FUNCTIONS ============
const formatMoney = (amount) => {
  return `R${Math.round(amount || 0).toLocaleString('en-ZA')}`;
};

const getDaysUntilPayday = (paydayDay) => {
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  if (currentDay <= paydayDay) {
    return paydayDay - currentDay;
  } else {
    return (daysInMonth - currentDay) + paydayDay;
  }
};

// ============ COMPONENTS ============

// Animated Ring Chart
const AnimatedRingChart = ({ spent, total, size = 200, strokeWidth = 20 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = total > 0 ? (spent / total) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 800,
      useNativeDriver: true,
      easing: (t) => {
        // Spring-like easing
        return 1 - Math.pow(1 - t, 3);
      },
    }).start();
  }, [percentage]);
  
  const animatedOffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, circumference - (percentage / 100) * circumference],
  });
  
  const getRingColor = () => {
    if (percentage >= 100) return COLORS.negative;
    if (percentage >= 80) return COLORS.warning;
    return COLORS.positive;
  };
  
  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getRingColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringRemaining}>{formatMoney(total - spent)}</Text>
        <Text style={styles.ringLabel}>Remaining</Text>
        <Text style={styles.ringTotal}>of {formatMoney(total)}</Text>
      </View>
    </View>
  );
};

// AnimatedCircle component for SVG animation
const AnimatedCircle = (props) => {
  const animatedProps = useRef({
    strokeDashoffset: props.strokeDashoffset,
  }).current;
  
  return (
    <Circle
      {...props}
      strokeDashoffset={animatedProps.strokeDashoffset}
    />
  );
};

// Budget Health Score Badge
const BudgetHealthBadge = ({ score, onPress }) => {
  const getColor = () => {
    if (score >= 80) return COLORS.positive;
    if (score >= 60) return COLORS.warning;
    return COLORS.negative;
  };
  
  const getEmoji = () => {
    if (score >= 80) return '🎉';
    if (score >= 60) return '👍';
    if (score >= 40) return '⚠️';
    return '🔴';
  };
  
  return (
    <Pressable style={styles.healthBadge} onPress={onPress}>
      <LinearGradient
        colors={[getColor() + '20', getColor() + '10']}
        style={styles.healthBadgeGradient}
      >
        <Text style={styles.healthBadgeEmoji}>{getEmoji()}</Text>
        <View>
          <Text style={styles.healthBadgeLabel}>Budget Score</Text>
          <Text style={[styles.healthBadgeScore, { color: getColor() }]}>
            {score}/100
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      </LinearGradient>
    </Pressable>
  );
};

// Month Selector
const MonthSelector = ({ selectedMonth, onSelectMonth }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const getMonthYear = (index) => {
    return `${months[index]} ${currentYear}`;
  };
  
  const isSelected = (index) => {
    const monthYear = getMonthYear(index);
    return monthYear === selectedMonth;
  };
  
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.monthSelector}
      contentContainerStyle={styles.monthSelectorContent}
    >
      {months.map((month, index) => (
        <Pressable
          key={index}
          style={[
            styles.monthChip,
            isSelected(index) && styles.monthChipSelected,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelectMonth(getMonthYear(index));
          }}
        >
          <Text
            style={[
              styles.monthChipText,
              isSelected(index) && styles.monthChipTextSelected,
            ]}
          >
            {month}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

// Weekly Bar Chart
const WeeklyBarChart = ({ dailyData, onBarPress }) => {
  const maxValue = Math.max(...dailyData.map(d => d.amount), 1);
  const barWidth = (width - 60) / 7 - 8;
  
  return (
    <View style={styles.barChartContainer}>
      <Text style={styles.chartTitle}>This Week's Spending</Text>
      <View style={styles.barChart}>
        {dailyData.map((day, index) => {
          const height = (day.amount / maxValue) * 120;
          const isToday = day.isToday;
          
          return (
            <Pressable
              key={index}
              style={styles.barWrapper}
              onPress={() => onBarPress?.(day)}
            >
              <View style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(height, 4),
                      backgroundColor: isToday ? COLORS.positive : COLORS.accent,
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{day.day}</Text>
                {day.amount > 0 && (
                  <Text style={styles.barAmount}>{formatMoney(day.amount)}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// Mini Category Donut
const MiniDonut = ({ spent, budgeted, color, size = 60 }) => {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <View style={styles.miniDonutContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={6}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.miniDonutCenter}>
        <Text style={styles.miniDonutPercent}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

// Category Card
const CategoryCard = ({ category, spent, budgeted, onPress }) => {
  const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;
  const isOverBudget = spent > budgeted;
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.categoryCard,
        pressed && styles.categoryCardPressed,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
    >
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
          <Ionicons name={category.icon} size={24} color={category.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryAmount}>
            {formatMoney(spent)} / {formatMoney(budgeted)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
      </View>
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isOverBudget ? COLORS.negative : category.color,
            },
          ]}
        />
      </View>
      {isOverBudget && (
        <Text style={styles.overBudgetText}>
          ⚠️ {formatMoney(spent - budgeted)} over budget
        </Text>
      )}
    </Pressable>
  );
};

// Payday Banner
const PaydayBanner = ({ daysLeft, remaining, onDismiss }) => {
  const [visible, setVisible] = useState(true);
  
  if (!visible || daysLeft > 5) return null;
  
  const dailyAllowance = remaining / daysLeft;
  
  return (
    <View style={styles.paydayBanner}>
      <LinearGradient
        colors={['#FEF3C7', '#FDE68A']}
        style={styles.paydayBannerGradient}
      >
        <View style={styles.paydayBannerContent}>
          <Ionicons name="flash" size={24} color="#D97706" />
          <View style={styles.paydayBannerText}>
            <Text style={styles.paydayBannerTitle}>
              {daysLeft} days until payday!
            </Text>
            <Text style={styles.paydayBannerMessage}>
              {formatMoney(remaining)} left • R{dailyAllowance.toFixed(0)}/day
            </Text>
          </View>
          <Pressable onPress={() => setVisible(false)} style={styles.paydayDismiss}>
            <Ionicons name="close" size={20} color="#D97706" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
};

// FAB Button
const FloatingActionButton = ({ onPress }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.fabPressed,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
    >
      <LinearGradient
        colors={[COLORS.accent, '#2C2C2E']}
        style={styles.fabGradient}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </LinearGradient>
    </Pressable>
  );
};

// ============ MAIN COMPONENT ============
export default function BudgetScreen({ navigation }) {
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
  });
  const [healthScore, setHealthScore] = useState(0);
  const [dailySpending, setDailySpending] = useState([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [userPayday, setUserPayday] = useState(25); // Default 25th
  
  const scrollViewRef = useRef(null);
  
  useEffect(() => {
    loadUserData();
  }, [selectedMonth]);
  
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [selectedMonth])
  );
  
  const loadUserData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const [budgetData, expensesData] = await Promise.all([
        getCurrentBudget(userId),
        getExpenses(userId, formatMonthForFirestore(selectedMonth)),
      ]);
      
      setBudget(budgetData);
      setExpenses(expensesData);
      calculateHealthScore(budgetData);
      calculateDailySpending(expensesData);
      
      // Load payday from user profile
      // This would come from Firestore - using mock for now
      // const userDoc = await getUserProfile(userId);
      // setUserPayday(userDoc?.paydayDay || 25);
    } catch (error) {
      console.error('Failed to load budget data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const formatMonthForFirestore = (monthYear) => {
    const [month, year] = monthYear.split(' ');
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  };
  
  const calculateHealthScore = (budgetData) => {
    if (!budgetData) return;
    
    const savingsRate = budgetData.categories?.savings?.budgeted / budgetData.totalBudget * 100;
    const savingsScore = Math.min(40, (savingsRate / 20) * 40);
    
    const overBudgetCategories = Object.values(budgetData.categories || {}).filter(
      cat => cat.spent > cat.budgeted
    ).length;
    const overspendScore = Math.max(0, 40 - (overBudgetCategories * 10));
    
    const daysUntilPayday = getDaysUntilPayday(userPayday);
    const coverageScore = daysUntilPayday <= 5 ? 20 : 
                          daysUntilPayday <= 10 ? 15 : 
                          daysUntilPayday <= 20 ? 10 : 5;
    
    const totalScore = Math.min(100, Math.round(savingsScore + overspendScore + coverageScore));
    setHealthScore(totalScore);
  };
  
  const calculateDailySpending = (expensesData) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    const spending = days.map((day, index) => ({
      day,
      amount: 0,
      isToday: index === today,
    }));
    
    expensesData?.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const dayIndex = expenseDate.getDay();
      spending[dayIndex].amount += expense.amount;
    });
    
    setDailySpending(spending);
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };
  
  const handleBarPress = (day) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dayExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getDay() === days.indexOf(day.day);
    });
    
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    Alert.alert(
      `${day.day}'s Spending`,
      `Total: ${formatMoney(total)}\n\n${dayExpenses.map(e => `• ${e.category}: ${formatMoney(e.amount)}`).join('\n')}`,
      [{ text: 'OK' }]
    );
  };
  
  const handleCategoryPress = (categoryId, categoryName) => {
    navigation.navigate('ExpenseDetail', {
      categoryId,
      categoryName,
      month: selectedMonth,
    });
  };
  
  const handleAddExpense = () => {
    navigation.navigate('AddExpenseModal');
  };
  
  const handleHealthScorePress = () => {
    setShowHealthModal(true);
  };
  
  const daysUntilPayday = getDaysUntilPayday(userPayday);
  const remainingAmount = budget?.remainingBudget || 0;
  
  // Get top 4 categories for mini donuts
  const topCategories = budget?.categories ? Object.entries(budget.categories)
    .filter(([id, cat]) => cat.budgeted > 0)
    .sort((a, b) => b[1].spent - a[1].spent)
    .slice(0, 4)
    .map(([id, cat]) => ({ id, ...cat })) : [];
  
  if (loading) {
    return (
      <LinearGradient colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your budget...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }
  
  return (
    <LinearGradient colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Budget</Text>
              <Text style={styles.headerSubtitle}>{selectedMonth}</Text>
            </View>
            <Pressable
              style={styles.settingsButton}
              onPress={() => navigation.navigate('NotificationSettings')}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.text} />
            </Pressable>
          </View>
          
          {/* Month Selector */}
          <MonthSelector selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
          
          {/* Payday Banner */}
          <PaydayBanner
            daysLeft={daysUntilPayday}
            remaining={remainingAmount}
            onDismiss={() => {}}
          />
          
          {/* Hero Ring Chart */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.heroGradient}
            >
              <AnimatedRingChart
                spent={budget?.spentTotal || 0}
                total={budget?.totalBudget || 0}
                size={220}
                strokeWidth={18}
              />
              
              <BudgetHealthBadge score={healthScore} onPress={handleHealthScorePress} />
              
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Spent</Text>
                  <Text style={[styles.heroStatValue, { color: COLORS.negative }]}>
                    {formatMoney(budget?.spentTotal || 0)}
                  </Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Budgeted</Text>
                  <Text style={styles.heroStatValue}>
                    {formatMoney(budget?.totalBudget || 0)}
                  </Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Left</Text>
                  <Text style={[styles.heroStatValue, { color: COLORS.positive }]}>
                    {formatMoney(budget?.remainingBudget || 0)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
          
          {/* Weekly Bar Chart */}
          <WeeklyBarChart
            dailyData={dailySpending}
            onBarPress={handleBarPress}
          />
          
          {/* Mini Donuts Section */}
          {topCategories.length > 0 && (
            <View style={styles.miniDonutsSection}>
              <Text style={styles.sectionTitle}>Top Spending Categories</Text>
              <View style={styles.miniDonutsGrid}>
                {topCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={styles.miniDonutCard}
                    onPress={() => handleCategoryPress(category.id, category.name)}
                  >
                    <MiniDonut
                      spent={category.spent}
                      budgeted={category.budgeted}
                      color={category.color}
                    />
                    <Text style={styles.miniDonutLabel}>{category.name}</Text>
                    <Text style={styles.miniDonutAmount}>
                      {formatMoney(category.spent)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          
          {/* Categories List */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Spending Categories</Text>
            {budget?.categories && Object.entries(budget.categories).map(([id, category]) => (
              <CategoryCard
                key={id}
                category={{ id, ...category }}
                spent={category.spent}
                budgeted={category.budgeted}
                onPress={() => handleCategoryPress(id, category.name)}
              />
            ))}
          </View>
        </ScrollView>
        
        {/* Floating Action Button */}
        <FloatingActionButton onPress={handleAddExpense} />
        
        {/* Health Score Modal */}
        <Modal
          visible={showHealthModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHealthModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowHealthModal(false)}
          >
            <View style={styles.modalContent}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.modalGradient}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Budget Health Score</Text>
                  <Pressable onPress={() => setShowHealthModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.muted} />
                  </Pressable>
                </View>
                
                <View style={styles.healthBreakdown}>
                  <View style={styles.healthItem}>
                    <View style={styles.healthItemHeader}>
                      <Ionicons name="trending-up" size={20} color={COLORS.positive} />
                      <Text style={styles.healthItemLabel}>Savings Rate</Text>
                    </View>
                    <View style={styles.healthItemBar}>
                      <View 
                        style={[
                          styles.healthItemFill,
                          { width: `${Math.min(100, (budget?.categories?.savings?.budgeted / budget?.totalBudget * 100) || 0)}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.healthItemValue}>
                      {Math.round((budget?.categories?.savings?.budgeted / budget?.totalBudget * 100) || 0)}% of income
                    </Text>
                  </View>
                  
                  <View style={styles.healthItem}>
                    <View style={styles.healthItemHeader}>
                      <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
                      <Text style={styles.healthItemLabel}>Overspent Categories</Text>
                    </View>
                    <Text style={styles.healthItemValue}>
                      {Object.values(budget?.categories || {}).filter(cat => cat.spent > cat.budgeted).length} categories
                    </Text>
                  </View>
                  
                  <View style={styles.healthItem}>
                    <View style={styles.healthItemHeader}>
                      <Ionicons name="calendar" size={20} color={COLORS.accent} />
                      <Text style={styles.healthItemLabel}>Days Until Payday</Text>
                    </View>
                    <Text style={styles.healthItemValue}>
                      {daysUntilPayday} days
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  monthSelector: {
    marginTop: 8,
    marginBottom: 16,
  },
  monthSelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  monthChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  monthChipText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  monthChipTextSelected: {
    color: '#FFF',
  },
  paydayBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  paydayBannerGradient: {
    padding: 16,
  },
  paydayBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paydayBannerText: {
    flex: 1,
  },
  paydayBannerTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#D97706',
  },
  paydayBannerMessage: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#B45309',
    marginTop: 2,
  },
  paydayDismiss: {
    padding: 4,
  },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  heroGradient: {
    padding: 24,
    alignItems: 'center',
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringRemaining: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: -0.8,
  },
  ringLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 4,
  },
  ringTotal: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 2,
  },
  healthBadge: {
    marginBottom: 20,
    borderRadius: 40,
    overflow: 'hidden',
  },
  healthBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  healthBadgeEmoji: {
    fontSize: 24,
  },
  healthBadgeLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  healthBadgeScore: {
    fontSize: 20,
    fontFamily: FONTS.bold,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  heroStatValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  barChartContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barWrapper: {
    alignItems: 'center',
  },
  barColumn: {
    alignItems: 'center',
  },
  bar: {
    width: (width - 60) / 7 - 8,
    borderRadius: 8,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 8,
  },
  barAmount: {
    fontSize: 9,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 2,
  },
  miniDonutsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  miniDonutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  miniDonutCard: {
    flex: 1,
    minWidth: (width - 56) / 4,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 20,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  miniDonutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniDonutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDonutPercent: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  miniDonutLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginTop: 8,
  },
  miniDonutAmount: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 2,
  },
  categoriesSection: {
    marginHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.98 }],
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  categoryAmount: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  overBudgetText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.negative,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    borderRadius: 28,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  healthBreakdown: {
    gap: 20,
  },
  healthItem: {
    gap: 8,
  },
  healthItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthItemLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  healthItemBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthItemFill: {
    height: '100%',
    backgroundColor: COLORS.positive,
    borderRadius: 3,
  },
  healthItemValue: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
});

// Helper for days array
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];