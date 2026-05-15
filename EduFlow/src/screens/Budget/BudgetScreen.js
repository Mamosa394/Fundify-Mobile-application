
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  getCurrentBudget,
  getExpenses,
  addExpense,
  BUDGET_CATEGORIES,
} from '../../../src/services/budgetService';

import { auth } from '../../../src/services/firebase';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#EFF2F4',
  card: '#FFFFFF',
  text: '#24323D',
  muted: '#8A98A3',
  dark: '#364954',
  line: '#E7EAED',
  track: '#E2E6E9',
  accent: '#556B78',
};

const formatMoney = (amount) => {
  return `R${Number(amount || 0).toLocaleString('en-ZA')}`;
};

function BudgetRing({ spent = 0, total = 1 }) {
  const size = 170;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;

  const progress = Math.min(spent / total, 1);

  const dashOffset = circumference - circumference * progress;

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#8799A4" />
            <Stop offset="100%" stopColor="#435964" />
          </SvgGradient>
        </Defs>

        <Circle
          stroke={COLORS.track}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        <Circle
          stroke="url(#grad)"
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
    </View>
  );
}

function CategoryRow({ item, onPress }) {
  const progress = Math.min(
    item.budgeted > 0 ? item.spent / item.budgeted : 0,
    1
  );

  return (
    <Pressable style={styles.categoryCard} onPress={onPress}>
      <View style={styles.categoryLeft}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: item.color,
            },
          ]}
        />

        <Text style={styles.categoryName}>{item.name}</Text>
      </View>

      <View style={styles.categoryRight}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: item.color,
              },
            ]}
          />
        </View>

        <Text style={styles.amountText}>
          {formatMoney(item.spent)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function BudgetScreen() {
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = auth.currentUser?.uid;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const budgetData = await getCurrentBudget(userId);
      const expenseData = await getExpenses(userId);

      setBudget(budgetData);
      setExpenses(expenseData || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [loadData, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const categories = useMemo(() => {
    if (!budget?.categories) return [];

    return BUDGET_CATEGORIES.map((category) => ({
      ...category,
      spent: budget.categories?.[category.id]?.spent || 0,
      budgeted: budget.categories?.[category.id]?.budgeted || 1,
    }));
  }, [budget]);

  const handleQuickExpense = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await addExpense(userId, {
        category: 'food',
        amount: 50,
        note: 'Quick expense',
        date: new Date().toISOString(),
      });

      await loadData();
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.dark} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>

          <Pressable
            onPress={handleQuickExpense}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <BudgetRing
            spent={budget?.spentTotal || 0}
            total={budget?.totalBudget || 1}
          />

          <Text style={styles.totalBudgetText}>
            {formatMoney(budget?.totalBudget || 0)}
          </Text>

          <Text style={styles.subtitle}>
            monthly budget
          </Text>
        </View>

        <View style={styles.categoriesWrapper}>
          {categories.map((item) => (
            <CategoryRow
              key={item.id}
              item={item}
              onPress={() => {
                Haptics.selectionAsync();
              }}
            />
          ))}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 14,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  title: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -2,
  },

  addButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 30,
    alignItems: 'center',
    paddingVertical: 26,
    marginBottom: 18,
  },

  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  totalBudgetText: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.muted,
  },

  categoriesWrapper: {
    marginTop: 4,
  },

  categoryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 20,
    marginRight: 14,
  },

  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#50616D',
    flexShrink: 1,
  },

  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },

  progressTrack: {
    width: width * 0.18,
    height: 6,
    borderRadius: 99,
    backgroundColor: COLORS.track,
    overflow: 'hidden',
    marginRight: 12,
  },

  progressFill: {
    height: '100%',
    borderRadius: 99,
  },

  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    minWidth: 72,
    textAlign: 'right',
  },

  bottomSpacing: {
    height: 40,
  },
});

