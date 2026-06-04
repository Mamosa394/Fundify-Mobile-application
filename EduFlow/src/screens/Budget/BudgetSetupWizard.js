// src/screens/Budget/BudgetSetupWizard.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../../services/firebase';
import { 
  saveBudgetFromWizard, 
  BUDGET_CATEGORIES,
  getUserProfile,
  saveUserIncome 
} from '../../services/budgetService';

const { width } = Dimensions.get('window');

// ============ DESIGN TOKENS ============
const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  positive: '#34C759',
  negative: '#EF4444',
  accent: '#475569',
  accentDark: '#334155',
  border: 'rgba(255,255,255,0.95)',
  cardShadow: '#CBD5E1',
  warning: '#F5A623',
};

const FONTS = {
  bold: 'JosefinSans-Bold',
  semiBold: 'JosefinSans-SemiBold',
};

// ============ INCOME TYPES ============
const INCOME_TYPES = {
  nmds: {
    id: 'nmds',
    label: 'NMDS Sponsored',
    icon: 'school-outline',
    description: 'R1,950/month NMDS allowance',
    baseAmount: 1950,
    requiresExtra: true,
    extraPrompt: 'Do you have any additional income? (part-time job, family support, etc.)',
  },
  bursary: {
    id: 'bursary',
    label: 'Bursary',
    icon: 'ribbon-outline',
    description: 'Other bursary funding',
    baseAmount: null,
    requiresExtra: false,
  },
  partTime: {
    id: 'part-time',
    label: 'Part-time Job',
    icon: 'briefcase-outline',
    description: 'Monthly earnings from work',
    baseAmount: null,
    requiresExtra: false,
  },
  family: {
    id: 'family',
    label: 'Family Support',
    icon: 'heart-outline',
    description: 'Monthly family allowance',
    baseAmount: null,
    requiresExtra: false,
  },
  selfSponsored: {
    id: 'self-sponsored',
    label: 'Self Sponsored',
    icon: 'person-outline',
    description: 'Funding your own studies',
    baseAmount: null,
    requiresExtra: false,
  },
  otherSponsor: {
    id: 'other-sponsor',
    label: 'Other Sponsor',
    icon: 'people-outline',
    description: 'Company/organization sponsorship',
    baseAmount: null,
    requiresExtra: false,
  },
  mixed: {
    id: 'mixed',
    label: 'Mixed Sources',
    icon: 'layers-outline',
    description: 'Multiple income streams',
    baseAmount: null,
    requiresExtra: true,
  },
};

// ============ STEPS ============
const STEPS = {
  INCOME: 'income',
  EXTRA_INCOME: 'extra_income',
  LIVING_SITUATION: 'living_situation',
  TRANSPORT: 'transport',
  DATA: 'data',
  FOOD: 'food',
  EATING_OUT: 'eating_out',
  SUBSCRIPTIONS: 'subscriptions',
  ENTERTAINMENT: 'entertainment',
  BOOKS: 'books',
  HEALTH: 'health',
  DEBT: 'debt',
  SAVINGS: 'savings',
  UTILITIES: 'utilities',
  GROCERIES: 'groceries',
  STRATEGY: 'strategy',
  SUMMARY: 'summary',
};

// ============ STRATEGIES ============
const STRATEGIES = {
  FIFTY_THIRTY_TWENTY: {
    id: '50/30/20',
    name: '50/30/20 Rule',
    description: '50% needs, 30% wants, 20% savings',
    detail: 'Best for beginners — simple and balanced',
    icon: 'pie-chart-outline',
  },
  ZERO_SUM: {
    id: 'zero-sum',
    name: 'Zero-Sum Budget',
    description: 'Every rand has a job',
    detail: 'Best for detail-oriented planners',
    icon: 'calculator-outline',
  },
  PAY_YOURSELF_FIRST: {
    id: 'pay-yourself-first',
    name: 'Pay Yourself First',
    description: 'Save first, spend the rest',
    detail: 'Best for building an emergency fund',
    icon: 'shield-checkmark-outline',
  },
};

// ============ STUDENT SUBSCRIPTION PRICES (ZAR) ============
const SUBSCRIPTION_OPTIONS = [
  { id: 'netflix', label: 'Netflix Basic', icon: 'tv-outline', defaultAmount: '49' },
  { id: 'spotify', label: 'Spotify Student', icon: 'musical-notes-outline', defaultAmount: '35' },
  { id: 'apple_music', label: 'Apple Music Student', icon: 'musical-note-outline', defaultAmount: '30' },
  { id: 'youtube', label: 'YouTube Premium Student', icon: 'logo-youtube', defaultAmount: '40' },
  { id: 'showmax', label: 'Showmax Mobile', icon: 'tv-outline', defaultAmount: '39' },
  { id: 'gym', label: 'Gym Student Membership', icon: 'fitness-outline', defaultAmount: '200' },
  { id: 'gaming', label: 'PlayStation Plus', icon: 'game-controller-outline', defaultAmount: '85' },
  { id: 'amazon', label: 'Prime Video', icon: 'film-outline', defaultAmount: '45' },
];

// ============ HELPERS ============
const formatMoney = (amount) => {
  return `R${Number(amount || 0).toLocaleString('en-ZA')}`;
};

// ============ SUB-COMPONENTS ============

// Progress Bar
const ProgressBar = ({ current, total }) => {
  const progress = (current / total) * 100;
  
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>
        Step {current} of {total}
      </Text>
    </View>
  );
};

// Animated Question Card
const QuestionCard = ({ children, step, totalSteps, title, subtitle }) => {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  return (
    <Animated.View
      style={[
        styles.questionCard,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <ProgressBar current={step} total={totalSteps} />
      
      <View style={styles.questionHeader}>
        <Text style={styles.questionTitle}>{title}</Text>
        {subtitle && <Text style={styles.questionSubtitle}>{subtitle}</Text>}
      </View>
      
      {children}
    </Animated.View>
  );
};

// Amount Input
const AmountInput = ({ value, onChangeText, placeholder = '0', prefix = 'R' }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.amountContainer, isFocused && styles.amountFocused]}>
      <Text style={styles.amountPrefix}>{prefix}</Text>
      <TextInput
        style={styles.amountInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
};

// Option Button
const OptionButton = ({ icon, label, selected, onPress, description }) => (
  <Pressable
    style={({ pressed }) => [
      styles.optionButton,
      selected && styles.optionButtonSelected,
      pressed && styles.optionButtonPressed,
    ]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
  >
    <LinearGradient
      colors={selected ? ['#475569', '#334155'] : ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.88)']}
      style={styles.optionGradient}
    >
      <View style={styles.optionContent}>
        <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
          <Ionicons
            name={icon}
            size={22}
            color={selected ? '#FFF' : '#475569'}
          />
        </View>
        <View style={styles.optionTextWrap}>
          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
            {label}
          </Text>
          {description && (
            <Text style={[styles.optionDescription, selected && styles.optionDescriptionSelected]}>
              {description}
            </Text>
          )}
        </View>
        {selected && (
          <Ionicons name="checkmark-circle" size={22} color="#34C759" />
        )}
      </View>
    </LinearGradient>
  </Pressable>
);

// Subscription Toggle
const SubscriptionOption = ({ label, icon, selected, onToggle, amount, onChangeAmount, defaultAmount }) => (
  <View style={styles.subscriptionRow}>
    <View style={styles.subscriptionLeft}>
      <Ionicons name={icon} size={20} color="#475569" />
      <View>
        <Text style={styles.subscriptionLabel}>{label}</Text>
        <Text style={styles.subscriptionPrice}>±R{defaultAmount}/mo</Text>
      </View>
    </View>
    <View style={styles.subscriptionRight}>
      <Switch
        value={selected}
        onValueChange={onToggle}
        trackColor={{ false: '#CBD5E1', true: '#34C759' }}
        thumbColor="#FFF"
      />
      <TextInput
        style={[styles.subscriptionAmount, !selected && styles.subscriptionAmountDisabled]}
        value={selected ? amount : ''}
        onChangeText={onChangeAmount}
        placeholder="R0"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        editable={selected}
      />
    </View>
  </View>
);

// ============ MAIN COMPONENT ============
export default function BudgetSetupWizard() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    income: '',
    incomeType: '',
    extraIncome: '',
    extraIncomeDescription: '',
    livingSituation: '',
    transportType: '',
    transportCost: '',
    dataCost: '',
    buysData: null,
    buysGroceries: null,
    groceriesCost: '',
    eatingOut: '',
    eatingOutCost: '',
    subscriptions: [],
    entertainmentCost: '',
    booksCost: '',
    healthCost: '',
    hasDebt: null,
    debtAmount: '',
    savingsPercentage: 10,
    utilitiesCost: '',
    paysUtilities: null,
    rentCost: '',
    strategy: '',
  });

  const [hasExistingIncome, setHasExistingIncome] = useState(false);
  const [loadingExistingData, setLoadingExistingData] = useState(true);

  useEffect(() => {
    loadExistingIncome();
  }, []);

  const loadExistingIncome = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setLoadingExistingData(false);
        return;
      }
      
      const profile = await getUserProfile(userId);
      
      if (profile?.income && profile?.incomeType) {
        setHasExistingIncome(true);
        setWizardData(prev => ({
          ...prev,
          income: profile.income.toString(),
          incomeType: profile.incomeType,
          extraIncome: profile.extraIncome?.toString() || '',
          extraIncomeDescription: profile.extraIncomeDescription || '',
        }));
      }
    } catch (error) {
      console.error('Failed to load existing income:', error);
    } finally {
      setLoadingExistingData(false);
    }
  };

  const calculateTotalIncome = () => {
    const baseIncome = Number(wizardData.income) || 0;
    const extraIncome = Number(wizardData.extraIncome) || 0;
    return baseIncome + extraIncome;
  };

  const getWizardSteps = useCallback(() => {
    const stepsList = [];
    
    if (!hasExistingIncome) {
      stepsList.push(STEPS.INCOME);
      
      const incomeType = INCOME_TYPES[wizardData.incomeType];
      if (incomeType?.requiresExtra && wizardData.incomeType) {
        stepsList.push(STEPS.EXTRA_INCOME);
      }
    }
    
    stepsList.push(STEPS.LIVING_SITUATION);

    const livingSituation = wizardData.livingSituation;
    
    if (livingSituation === 'home') {
      stepsList.push(
        STEPS.TRANSPORT,
        STEPS.DATA,
        STEPS.FOOD,
        STEPS.EATING_OUT,
        STEPS.ENTERTAINMENT,
        STEPS.BOOKS,
        STEPS.HEALTH,
        STEPS.SUBSCRIPTIONS,
        STEPS.DEBT,
        STEPS.SAVINGS,
        STEPS.STRATEGY,
        STEPS.SUMMARY
      );
    } else if (livingSituation === 'residence') {
      stepsList.push(
        { id: 'accommodation_cost', type: 'rent' },
        STEPS.TRANSPORT,
        STEPS.DATA,
        { id: 'groceries', type: 'groceries' },
        STEPS.EATING_OUT,
        STEPS.ENTERTAINMENT,
        STEPS.BOOKS,
        STEPS.HEALTH,
        STEPS.SUBSCRIPTIONS,
        STEPS.DEBT,
        STEPS.SAVINGS,
        STEPS.STRATEGY,
        STEPS.SUMMARY
      );
    } else if (livingSituation === 'renting') {
      stepsList.push(
        { id: 'accommodation_cost', type: 'rent' },
        { id: 'utilities', type: 'utilities' },
        STEPS.TRANSPORT,
        STEPS.DATA,
        { id: 'groceries', type: 'groceries' },
        STEPS.EATING_OUT,
        STEPS.ENTERTAINMENT,
        STEPS.BOOKS,
        STEPS.HEALTH,
        STEPS.SUBSCRIPTIONS,
        STEPS.DEBT,
        STEPS.SAVINGS,
        STEPS.STRATEGY,
        STEPS.SUMMARY
      );
    }
    
    return stepsList;
  }, [wizardData.livingSituation, wizardData.incomeType, hasExistingIncome]);

  const steps = getWizardSteps();
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      const totalIncome = calculateTotalIncome();
      const budget = calculateBudget();
      const totalSpending = Object.values(budget.categories).reduce((a, b) => a + b, 0);
      
      if (totalSpending > totalIncome) {
        Alert.alert(
          'Budget Exceeds Income',
          `Your planned spending (${formatMoney(totalSpending)}) exceeds your income (${formatMoney(totalIncome)}). Please go back and adjust your expenses.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      handleComplete();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

const handleComplete = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Save user income first
    await saveUserIncome(userId, {
      income: Number(wizardData.income) || 0,
      incomeType: wizardData.incomeType,
      extraIncome: Number(wizardData.extraIncome) || 0,
      extraIncomeDescription: wizardData.extraIncomeDescription,
      totalIncome: calculateTotalIncome(),
    });
    
    console.log('User income saved successfully');
    
    // Calculate and save budget
    const budget = calculateBudget();
    await saveBudgetFromWizard(userId, budget);
    
    console.log('Budget saved successfully from wizard');
    
    navigation.replace('Budget');
    
  } catch (error) {
    console.error('Failed to save budget:', error);
    Alert.alert('Error', 'Failed to save your budget. Please try again.');
  }
};

  const calculateBudget = () => {
    const totalIncome = calculateTotalIncome();
    const strategy = wizardData.strategy;
    
    const rentAmount = Number(wizardData.rentCost) || 0;
    const utilitiesAmount = Number(wizardData.utilitiesCost) || 0;
    const transportAmount = Number(wizardData.transportCost) || 0;
    const dataAmount = wizardData.buysData ? (Number(wizardData.dataCost) || 0) : 0;
    const groceriesAmount = wizardData.buysGroceries ? (Number(wizardData.groceriesCost) || 0) : 0;
    const eatingOutAmount = Number(wizardData.eatingOutCost) || 0;
    const entertainmentAmount = Number(wizardData.entertainmentCost) || 0;
    const booksAmount = Number(wizardData.booksCost) || 0;
    const healthAmount = Number(wizardData.healthCost) || 0;
    const debtAmount = wizardData.hasDebt ? (Number(wizardData.debtAmount) || 0) : 0;
    const savingsAmount = totalIncome * (wizardData.savingsPercentage / 100);
    
    const subscriptionsTotal = wizardData.subscriptions.reduce(
      (sum, sub) => sum + (Number(sub.amount) || 0), 0
    );
    
    const foodTotal = groceriesAmount + eatingOutAmount;
    
    let allocations = {};
    
    if (strategy === '50/30/20') {
      const needs = totalIncome * 0.5;
      const wants = totalIncome * 0.3;
      const savings = totalIncome * 0.2;
      
      allocations = {
        accommodation: rentAmount,
        food: foodTotal || needs * 0.4,
        transport: transportAmount,
        data: dataAmount,
        entertainment: entertainmentAmount || wants * 0.4,
        books: booksAmount || wants * 0.2,
        health: healthAmount || wants * 0.1,
        savings: savingsAmount || savings,
        other: subscriptionsTotal + debtAmount + (wants * 0.1),
      };
    } else if (strategy === 'zero-sum') {
      const userProvidedTotal = rentAmount + utilitiesAmount + transportAmount + 
                               dataAmount + foodTotal + entertainmentAmount + 
                               booksAmount + healthAmount + debtAmount + 
                               subscriptionsTotal + savingsAmount;
      
      const remaining = Math.max(0, totalIncome - userProvidedTotal);
      
      allocations = {
        accommodation: rentAmount,
        food: foodTotal,
        transport: transportAmount,
        data: dataAmount,
        entertainment: entertainmentAmount || remaining * 0.3,
        books: booksAmount || remaining * 0.3,
        health: healthAmount || remaining * 0.1,
        savings: savingsAmount,
        other: remaining * 0.3,
      };
    } else {
      allocations = {
        accommodation: rentAmount || totalIncome * 0.3,
        food: foodTotal || totalIncome * 0.2,
        transport: transportAmount || totalIncome * 0.1,
        data: dataAmount || totalIncome * 0.05,
        entertainment: entertainmentAmount || totalIncome * 0.1,
        books: booksAmount || totalIncome * 0.05,
        health: healthAmount || totalIncome * 0.05,
        savings: savingsAmount,
        other: totalIncome * 0.05,
      };
    }

    return {
      income: totalIncome,
      baseIncome: Number(wizardData.income) || 0,
      extraIncome: Number(wizardData.extraIncome) || 0,
      incomeType: wizardData.incomeType,
      strategy,
      livingSituation: wizardData.livingSituation,
      categories: allocations,
      totalBudget: totalIncome,
    };
  };

  // ============ STEP RENDERERS ============
  
  const renderStep = () => {
    const stepId = currentStepData?.id || currentStepData;
    
    switch (stepId) {
      case STEPS.INCOME: return renderIncomeStep();
      case STEPS.EXTRA_INCOME: return renderExtraIncomeStep();
      case STEPS.LIVING_SITUATION: return renderLivingSituationStep();
      case STEPS.TRANSPORT: return renderTransportStep();
      case STEPS.DATA: return renderDataStep();
      case STEPS.FOOD: return renderFoodStep();
      case STEPS.EATING_OUT: return renderEatingOutStep();
      case STEPS.ENTERTAINMENT: return renderEntertainmentStep();
      case STEPS.BOOKS: return renderBooksStep();
      case STEPS.HEALTH: return renderHealthStep();
      case STEPS.SUBSCRIPTIONS: return renderSubscriptionsStep();
      case STEPS.DEBT: return renderDebtStep();
      case STEPS.SAVINGS: return renderSavingsStep();
      case 'accommodation_cost': return renderRentStep();
      case 'utilities': return renderUtilitiesStep();
      case 'groceries': return renderGroceriesStep();
      case STEPS.STRATEGY: return renderStrategyStep();
      case STEPS.SUMMARY: return renderSummaryStep();
      default: return null;
    }
  };

  // Step 1: Income Type
  const renderIncomeStep = () => {
    const incomeTypes = Object.values(INCOME_TYPES);
    
    const handleIncomeTypeSelect = (typeId) => {
      const incomeType = INCOME_TYPES[typeId];
      const baseAmount = incomeType.baseAmount || '';
      
      setWizardData(prev => ({
        ...prev,
        incomeType: typeId,
        income: baseAmount.toString(),
      }));
    };

    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="How do you fund your studies?"
        subtitle="This helps us understand your income situation"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.optionsGrid}>
            {incomeTypes.map((type) => (
              <OptionButton
                key={type.id}
                icon={type.icon}
                label={type.label}
                description={type.description}
                selected={wizardData.incomeType === type.id}
                onPress={() => handleIncomeTypeSelect(type.id)}
              />
            ))}
          </View>
          
          {wizardData.incomeType && !INCOME_TYPES[wizardData.incomeType].baseAmount && (
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>MONTHLY AMOUNT</Text>
              <AmountInput
                value={wizardData.income}
                onChangeText={(value) => setWizardData(prev => ({ ...prev, income: value }))}
                placeholder="0"
              />
            </View>
          )}
          
          {wizardData.incomeType === 'nmds' && (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={22} color="#475569" />
              <View style={styles.infoCardText}>
                <Text style={styles.infoCardTitle}>NMDS Allowance</Text>
                <Text style={styles.infoCardDescription}>
                  Your NMDS base allowance is R1,950/month. We'll ask about additional income next.
                </Text>
              </View>
            </View>
          )}

          {wizardData.income && wizardData.incomeType && (
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Step 1.5: Extra Income
  const renderExtraIncomeStep = () => {
    const incomeType = INCOME_TYPES[wizardData.incomeType];
    const totalSoFar = calculateTotalIncome();
    
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Additional Income"
        subtitle={incomeType?.extraPrompt || "Do you have any other income sources?"}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.incomeDisplay}>
            <Text style={styles.incomeDisplayLabel}>Your base income</Text>
            <Text style={styles.incomeDisplayAmount}>{formatMoney(wizardData.income)}</Text>
          </View>
          
          <View style={styles.optionsGrid}>
            <OptionButton
              icon="add-circle-outline"
              label="Yes, I have extra income"
              description="Part-time work, family support, side hustle"
              selected={wizardData.extraIncome !== '' && wizardData.extraIncome !== '0'}
              onPress={() => {
                if (!wizardData.extraIncome || wizardData.extraIncome === '0') {
                  setWizardData(prev => ({ ...prev, extraIncome: '500' }));
                }
              }}
            />
            <OptionButton
              icon="close-circle-outline"
              label="No extra income"
              description="Just my main income source"
              selected={wizardData.extraIncome === '0'}
              onPress={() => setWizardData(prev => ({ ...prev, extraIncome: '0', extraIncomeDescription: '' }))}
            />
          </View>

          {wizardData.extraIncome !== '' && wizardData.extraIncome !== '0' && (
            <View style={styles.extraIncomeSection}>
              <Text style={styles.inputLabel}>EXTRA AMOUNT</Text>
              <AmountInput
                value={wizardData.extraIncome}
                onChangeText={(value) => setWizardData(prev => ({ ...prev, extraIncome: value }))}
                placeholder="500"
              />
              
              <Text style={[styles.inputLabel, { marginTop: 20 }]}>SOURCE</Text>
              <View style={styles.chipRow}>
                {[
                  { id: 'part-time', label: 'Part-time job', icon: 'briefcase-outline' },
                  { id: 'family', label: 'Family support', icon: 'heart-outline' },
                  { id: 'side-hustle', label: 'Side hustle', icon: 'flash-outline' },
                  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
                ].map((option) => (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.chip,
                      wizardData.extraIncomeDescription === option.id && styles.chipSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setWizardData(prev => ({ ...prev, extraIncomeDescription: option.id }));
                    }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={wizardData.extraIncomeDescription === option.id ? '#FFF' : '#475569'}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        wizardData.extraIncomeDescription === option.id && styles.chipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              
              <View style={styles.totalDisplay}>
                <Text style={styles.totalDisplayLabel}>Total Monthly Income</Text>
                <Text style={styles.totalDisplayAmount}>{formatMoney(totalSoFar)}</Text>
              </View>
            </View>
          )}

          <View style={styles.navRow}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </QuestionCard>
    );
  };

  // Step 2: Living Situation
  const renderLivingSituationStep = () => {
    const totalIncome = calculateTotalIncome();
    const options = [
      { id: 'home', label: 'At home with family', icon: 'home-outline', description: 'Living with parents/guardians' },
      { id: 'residence', label: 'Student residence', icon: 'business-outline', description: 'University accommodation' },
      { id: 'renting', label: 'My own place (renting)', icon: 'key-outline', description: 'Private rental' },
    ];

    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Where do you live?"
        subtitle="This helps us understand your major expenses"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          {totalIncome > 0 && (
            <View style={styles.incomeReminder}>
              <Ionicons name="wallet-outline" size={16} color="#64748B" />
              <Text style={styles.incomeReminderText}>
                Monthly income: {formatMoney(totalIncome)}
              </Text>
            </View>
          )}
          
          <View style={styles.optionsGrid}>
            {options.map((option) => (
              <OptionButton
                key={option.id}
                icon={option.icon}
                label={option.label}
                description={option.description}
                selected={wizardData.livingSituation === option.id}
                onPress={() => setWizardData(prev => ({ ...prev, livingSituation: option.id }))}
              />
            ))}
          </View>

          {wizardData.livingSituation && (
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Transport Step
  const renderTransportStep = () => {
    const options = [
      { id: 'taxi', label: 'Taxi/Bus', icon: 'bus-outline', description: 'Public transport' },
      { id: 'car', label: 'Own Car', icon: 'car-outline', description: 'Petrol & maintenance' },
      { id: 'walk', label: 'Walk/Cycle', icon: 'walk-outline', description: 'Free transport' },
    ];

    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="How do you get to campus?"
        subtitle="Select your main transport method"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.optionsGrid}>
            {options.map((option) => (
              <OptionButton
                key={option.id}
                icon={option.icon}
                label={option.label}
                description={option.description}
                selected={wizardData.transportType === option.id}
                onPress={() => {
                  setWizardData(prev => ({ ...prev, transportType: option.id }));
                  if (option.id === 'walk') {
                    setWizardData(prev => ({ ...prev, transportCost: '0' }));
                  }
                }}
              />
            ))}
          </View>

          {wizardData.transportType && wizardData.transportType !== 'walk' && (
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>
                {wizardData.transportType === 'taxi' ? 'MONTHLY TAXI/BUS COST' : 'MONTHLY PETROL ESTIMATE'}
              </Text>
              <AmountInput
                value={wizardData.transportCost}
                onChangeText={(value) => setWizardData(prev => ({ ...prev, transportCost: value }))}
                placeholder="600"
              />
            </View>
          )}

          {wizardData.transportType && (
            <View style={styles.navRow}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#475569" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['#475569', '#334155']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Data Step
  const renderDataStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Do you buy your own data/airtime?"
        subtitle="Connectivity is essential for students"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.optionsGrid}>
            <OptionButton
              icon="wifi-outline"
              label="Yes, I buy data"
              description="You manage your own connectivity"
              selected={wizardData.buysData === true}
              onPress={() => setWizardData(prev => ({ ...prev, buysData: true, dataCost: prev.dataCost || '300' }))}
            />
            <OptionButton
              icon="home-outline"
              label="No, family covers it"
              description="Someone else pays for data"
              selected={wizardData.buysData === false}
              onPress={() => setWizardData(prev => ({ ...prev, buysData: false, dataCost: '0' }))}
            />
          </View>

          {wizardData.buysData && (
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>MONTHLY DATA/AIRTIME</Text>
              <AmountInput
                value={wizardData.dataCost}
                onChangeText={(value) => setWizardData(prev => ({ ...prev, dataCost: value }))}
                placeholder="300"
              />
            </View>
          )}

          {wizardData.buysData !== null && (
            <View style={styles.navRow}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#475569" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['#475569', '#334155']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Food Step
  const renderFoodStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Do you buy your own food?"
        subtitle="Groceries and essentials"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.optionsGrid}>
            <OptionButton
              icon="cart-outline"
              label="Yes, I buy food"
              description="You handle food shopping"
              selected={wizardData.buysGroceries === true}
              onPress={() => setWizardData(prev => ({ ...prev, buysGroceries: true }))}
            />
            <OptionButton
              icon="home-outline"
              label="Family provides food"
              description="Meals covered at home"
              selected={wizardData.buysGroceries === false}
              onPress={() => setWizardData(prev => ({ ...prev, buysGroceries: false, groceriesCost: '0' }))}
            />
          </View>

          {wizardData.buysGroceries && (
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>MONTHLY FOOD BUDGET</Text>
              <AmountInput
                value={wizardData.groceriesCost}
                onChangeText={(value) => setWizardData(prev => ({ ...prev, groceriesCost: value }))}
                placeholder="800"
              />
            </View>
          )}

          {wizardData.buysGroceries !== null && (
            <View style={styles.navRow}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#475569" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['#475569', '#334155']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Eating Out Step
  const renderEatingOutStep = () => {
    const options = [
      { id: 'rarely', label: 'Rarely', icon: 'restaurant-outline', cost: '100', description: '1-2 times/month' },
      { id: 'sometimes', label: 'Sometimes', icon: 'fast-food-outline', cost: '300', description: 'Weekly' },
      { id: 'often', label: 'Often', icon: 'cafe-outline', cost: '600', description: 'Multiple times/week' },
    ];

    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="How often do you eat out?"
        subtitle="Cafeteria, restaurants, takeaways"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.optionsGrid}>
            {options.map((option) => (
              <OptionButton
                key={option.id}
                icon={option.icon}
                label={option.label}
                description={option.description}
                selected={wizardData.eatingOut === option.id}
                onPress={() => setWizardData(prev => ({ 
                  ...prev, 
                  eatingOut: option.id,
                  eatingOutCost: option.cost 
                }))}
              />
            ))}
          </View>

          {wizardData.eatingOut && (
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>ESTIMATED MONTHLY COST</Text>
              <AmountInput
                value={wizardData.eatingOutCost}
                onChangeText={(value) => setWizardData(prev => ({ ...prev, eatingOutCost: value }))}
                placeholder="0"
              />
            </View>
          )}

          {wizardData.eatingOut && (
            <View style={styles.navRow}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#475569" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['#475569', '#334155']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Entertainment Step
  const renderEntertainmentStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Monthly Entertainment Budget"
        subtitle="Movies, gaming, events, etc."
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.amountSection}>
            <Text style={styles.inputLabel}>MONTHLY ENTERTAINMENT</Text>
            <AmountInput
              value={wizardData.entertainmentCost}
              onChangeText={(value) => setWizardData(prev => ({ ...prev, entertainmentCost: value }))}
              placeholder="200"
            />
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </QuestionCard>
    );
  };

  // Books Step
  const renderBooksStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Books & Stationery Budget"
        subtitle="Textbooks, printing, supplies"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.amountSection}>
            <Text style={styles.inputLabel}>MONTHLY BOOKS/STATIONERY</Text>
            <AmountInput
              value={wizardData.booksCost}
              onChangeText={(value) => setWizardData(prev => ({ ...prev, booksCost: value }))}
              placeholder="150"
            />
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </QuestionCard>
    );
  };

  // Health Step
  const renderHealthStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Health & Wellness Budget"
        subtitle="Medical, toiletries, gym (if not subscription)"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.amountSection}>
            <Text style={styles.inputLabel}>MONTHLY HEALTH/WELLNESS</Text>
            <AmountInput
              value={wizardData.healthCost}
              onChangeText={(value) => setWizardData(prev => ({ ...prev, healthCost: value }))}
              placeholder="100"
            />
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </QuestionCard>
    );
  };

  // Subscriptions Step
  const renderSubscriptionsStep = () => {
    const updateSubscription = (id, selected, amount = '') => {
      const option = SUBSCRIPTION_OPTIONS.find(o => o.id === id);
      if (selected) {
        setWizardData(prev => ({
          ...prev,
          subscriptions: [...prev.subscriptions.filter(s => s.id !== id), { 
            id, 
            amount: amount || option?.defaultAmount || '0' 
          }]
        }));
      } else {
        setWizardData(prev => ({
          ...prev,
          subscriptions: prev.subscriptions.filter(sub => sub.id !== id)
        }));
      }
    };

    const getSubscriptionAmount = (id) => {
      const sub = wizardData.subscriptions.find(s => s.id === id);
      return sub?.amount || '';
    };

    const isSubscriptionSelected = (id) => {
      return wizardData.subscriptions.some(s => s.id === id);
    };

    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Monthly Subscriptions"
        subtitle="Student pricing shown where available"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          {SUBSCRIPTION_OPTIONS.map(option => (
            <SubscriptionOption
              key={option.id}
              icon={option.icon}
              label={option.label}
              defaultAmount={option.defaultAmount}
              selected={isSubscriptionSelected(option.id)}
              onToggle={(val) => updateSubscription(option.id, val, getSubscriptionAmount(option.id))}
              amount={getSubscriptionAmount(option.id)}
              onChangeAmount={(amount) => updateSubscription(option.id, true, amount)}
            />
          ))}

          <View style={styles.navRow}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </QuestionCard>
    );
  };

  // Debt Step
  const renderDebtStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Do you have any debt?"
        subtitle="Student loans, credit cards, etc."
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.optionsGrid}>
            <OptionButton
              icon="alert-circle-outline"
              label="Yes, I have debt"
              description="Monthly payments"
              selected={wizardData.hasDebt === true}
              onPress={() => setWizardData(prev => ({ ...prev, hasDebt: true }))}
            />
            <OptionButton
              icon="checkmark-circle-outline"
              label="No debt"
              description="Good financial health"
              selected={wizardData.hasDebt === false}
              onPress={() => setWizardData(prev => ({ ...prev, hasDebt: false, debtAmount: '0' }))}
            />
          </View>

          {wizardData.hasDebt && (
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>MONTHLY DEBT PAYMENT</Text>
              <AmountInput
                value={wizardData.debtAmount}
                onChangeText={(value) => setWizardData(prev => ({ ...prev, debtAmount: value }))}
                placeholder="500"
              />
            </View>
          )}

          {wizardData.hasDebt !== null && (
            <View style={styles.navRow}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#475569" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['#475569', '#334155']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Savings Step
  const renderSavingsStep = () => {
    const totalIncome = calculateTotalIncome();
    const savingsAmount = totalIncome * (wizardData.savingsPercentage / 100);
    
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="How much do you want to save?"
        subtitle="Building your financial future"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.savingsContainer}>
            <Text style={styles.savingsPercentage}>{wizardData.savingsPercentage}%</Text>
            <Text style={styles.savingsAmount}>
              = {formatMoney(savingsAmount)}/month
            </Text>
            
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>0%</Text>
              <View style={styles.sliderTrack}>
                <View 
                  style={[
                    styles.sliderFill, 
                    { width: `${Math.min(100, Math.max(0, wizardData.savingsPercentage))}%` }
                  ]} 
                />
              </View>
              <Text style={styles.sliderLabel}>50%</Text>
            </View>
            
            <View style={styles.percentageButtons}>
              {[5, 10, 15, 20, 25, 30].map(pct => (
                <Pressable
                  key={pct}
                  style={[
                    styles.percentageButton,
                    wizardData.savingsPercentage === pct && styles.percentageButtonSelected
                  ]}
                  onPress={() => setWizardData(prev => ({ ...prev, savingsPercentage: pct }))}
                >
                  <Text style={[
                    styles.percentageButtonText,
                    wizardData.savingsPercentage === pct && styles.percentageButtonTextSelected
                  ]}>
                    {pct}%
                  </Text>
                </Pressable>
              ))}
            </View>
            
            <View style={styles.savingsInfoCard}>
              <Ionicons name="wallet-outline" size={20} color="#475569" />
              <Text style={styles.savingsInfoText}>
                After saving {formatMoney(savingsAmount)}, you'll have {formatMoney(totalIncome - savingsAmount)} for expenses
              </Text>
            </View>
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </QuestionCard>
    );
  };

  // Rent Step
  const renderRentStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Monthly Accommodation Cost"
        subtitle="How much do you pay for rent/accommodation?"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.amountSection}>
            <Text style={styles.inputLabel}>MONTHLY RENT</Text>
            <AmountInput
              value={wizardData.rentCost}
              onChangeText={(value) => setWizardData(prev => ({ ...prev, rentCost: value }))}
              placeholder="3500"
            />
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </QuestionCard>
    );
  };

  // Utilities Step
  const renderUtilitiesStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Do you pay for utilities?"
        subtitle="Electricity, water, internet"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.optionsGrid}>
            <OptionButton
              icon="flash-outline"
              label="Yes, I pay utilities"
              description="Electricity, water, etc."
              selected={wizardData.paysUtilities === true}
              onPress={() => setWizardData(prev => ({ ...prev, paysUtilities: true }))}
            />
            <OptionButton
              icon="home-outline"
              label="Included in rent"
              description="Utilities covered"
              selected={wizardData.paysUtilities === false}
              onPress={() => setWizardData(prev => ({ ...prev, paysUtilities: false, utilitiesCost: '0' }))}
            />
          </View>

          {wizardData.paysUtilities && (
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>MONTHLY UTILITIES</Text>
              <AmountInput
                value={wizardData.utilitiesCost}
                onChangeText={(value) => setWizardData(prev => ({ ...prev, utilitiesCost: value }))}
                placeholder="800"
              />
            </View>
          )}

          {wizardData.paysUtilities !== null && (
            <View style={styles.navRow}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#475569" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['#475569', '#334155']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Groceries Step
  const renderGroceriesStep = () => {
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Monthly Groceries Budget"
        subtitle="Food and household essentials"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.amountSection}>
            <Text style={styles.inputLabel}>MONTHLY GROCERIES</Text>
            <AmountInput
              value={wizardData.groceriesCost}
              onChangeText={(value) => setWizardData(prev => ({ ...prev, groceriesCost: value }))}
              placeholder="1500"
            />
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color="#475569" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#475569', '#334155']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </QuestionCard>
    );
  };

  // Strategy Step
  const renderStrategyStep = () => {
    const strategies = Object.values(STRATEGIES);
    const totalIncome = calculateTotalIncome();

    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Choose a Budgeting Strategy"
        subtitle="Pick the approach that fits you best"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.incomeReminder}>
            <Ionicons name="wallet-outline" size={16} color="#64748B" />
            <Text style={styles.incomeReminderText}>
              Monthly income: {formatMoney(totalIncome)}
            </Text>
          </View>

          {strategies.map((strategy) => (
            <Pressable
              key={strategy.id}
              style={[
                styles.strategyCard,
                wizardData.strategy === strategy.id && styles.strategyCardSelected
              ]}
              onPress={() => setWizardData(prev => ({ ...prev, strategy: strategy.id }))}
            >
              <LinearGradient
                colors={wizardData.strategy === strategy.id 
                  ? ['#475569', '#334155'] 
                  : ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.88)']}
                style={styles.strategyGradient}
              >
                <View style={styles.strategyIcon}>
                  <Ionicons 
                    name={strategy.icon} 
                    size={28} 
                    color={wizardData.strategy === strategy.id ? '#FFF' : '#475569'} 
                  />
                </View>
                <View style={styles.strategyContent}>
                  <Text style={[
                    styles.strategyName,
                    wizardData.strategy === strategy.id && styles.strategyNameSelected
                  ]}>
                    {strategy.name}
                  </Text>
                  <Text style={[
                    styles.strategyDescription,
                    wizardData.strategy === strategy.id && styles.strategyDescriptionSelected
                  ]}>
                    {strategy.description}
                  </Text>
                  <Text style={[
                    styles.strategyDetail,
                    wizardData.strategy === strategy.id && styles.strategyDetailSelected
                  ]}>
                    {strategy.detail}
                  </Text>
                </View>
                {wizardData.strategy === strategy.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                )}
              </LinearGradient>
            </Pressable>
          ))}

          {wizardData.strategy && (
            <View style={styles.navRow}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#475569" />
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
              <Pressable style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['#475569', '#334155']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Review Budget</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </QuestionCard>
    );
  };

  // Summary Step
  const renderSummaryStep = () => {
    const totalIncome = calculateTotalIncome();
    const budget = calculateBudget();
    const totalSpending = Object.values(budget.categories).reduce((a, b) => a + b, 0);
    const remaining = totalIncome - totalSpending;
    const isOverBudget = remaining < 0;
    const savingsAmount = totalIncome * (wizardData.savingsPercentage / 100);
    
    return (
      <QuestionCard
        step={currentStep + 1}
        totalSteps={steps.length}
        title="Budget Summary"
        subtitle="Review your personalized budget plan"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepScroll}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryIncome}>Total Monthly Income</Text>
            <Text style={styles.summaryIncomeAmount}>{formatMoney(totalIncome)}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <Text style={styles.summarySectionTitle}>Allocated Expenses</Text>
          
          <View style={styles.summaryCategories}>
            {wizardData.rentCost ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Accommodation</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.rentCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.paysUtilities ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Utilities</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.utilitiesCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.transportCost && wizardData.transportCost !== '0' ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Transport</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.transportCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.buysData ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Data & Airtime</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.dataCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.buysGroceries ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Groceries</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.groceriesCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.eatingOutCost && wizardData.eatingOutCost !== '0' ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Eating Out</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.eatingOutCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.entertainmentCost && wizardData.entertainmentCost !== '0' ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Entertainment</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.entertainmentCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.booksCost && wizardData.booksCost !== '0' ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Books & Stationery</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.booksCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.healthCost && wizardData.healthCost !== '0' ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Health & Wellness</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.healthCost)}</Text>
              </View>
            ) : null}
            
            {wizardData.subscriptions.length > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Subscriptions</Text>
                <Text style={styles.summaryAmount}>
                  {formatMoney(wizardData.subscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0))}
                </Text>
              </View>
            ) : null}
            
            {wizardData.hasDebt ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCategory}>Debt Payments</Text>
                <Text style={styles.summaryAmount}>{formatMoney(wizardData.debtAmount)}</Text>
              </View>
            ) : null}
            
            <View style={[styles.summaryRow, styles.summaryRowBold]}>
              <Text style={styles.summaryCategoryBold}>Savings ({wizardData.savingsPercentage}%)</Text>
              <Text style={styles.summaryAmountBold}>{formatMoney(savingsAmount)}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Total Planned Spending</Text>
            <Text style={[styles.summaryTotalAmount, isOverBudget && { color: COLORS.negative }]}>
              {formatMoney(totalSpending)}
            </Text>
          </View>

          {isOverBudget ? (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={24} color={COLORS.negative} />
              <View style={styles.warningTextWrap}>
                <Text style={styles.warningTitle}>Budget Exceeds Income</Text>
                <Text style={styles.warningText}>
                  Your expenses exceed your income by {formatMoney(Math.abs(remaining))}. 
                  Go back and reduce your spending to continue.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.remainingContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#34C759" />
              <View style={styles.warningTextWrap}>
                <Text style={styles.remainingTitle}>Budget Balanced</Text>
                <Text style={styles.remainingText}>
                  {formatMoney(remaining)} remaining for flexible spending
                </Text>
              </View>
            </View>
          )}

          <Pressable 
            style={[styles.completeButton, isOverBudget && styles.completeButtonDisabled]} 
            onPress={handleNext}
            disabled={isOverBudget}
          >
            <LinearGradient
              colors={isOverBudget ? ['#CBD5E1', '#94A3B8'] : ['#34C759', '#28A745']}
              style={styles.completeButtonGradient}
            >
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={styles.completeButtonText}>
                {isOverBudget ? 'Adjust Budget to Continue' : 'Complete Setup'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.backButtonFull} onPress={handleBack}>
            <Ionicons name="arrow-back" size={18} color="#475569" />
            <Text style={styles.backButtonFullText}>Back to edit</Text>
          </Pressable>
        </ScrollView>
      </QuestionCard>
    );
  };

  if (loadingExistingData) {
    return (
      <LinearGradient colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#475569" />
            <Text style={styles.loadingText}>Loading your budget setup...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        
        <KeyboardAvoidingView
          style={[styles.keyboardView, { paddingBottom: insets.bottom + 10 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={styles.headerBack}>
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </Pressable>
            <Text style={styles.headerTitle}>Budget Setup</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {renderStep()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerBack: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerPlaceholder: { width: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  stepScroll: { flex: 1 },
  questionCard: {
    flex: 1,
    margin: 20,
    marginTop: 8,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 32,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  progressContainer: { marginBottom: 24 },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    textAlign: 'right',
  },
  questionHeader: { marginBottom: 28 },
  questionTitle: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    lineHeight: 22,
  },
  optionsGrid: { gap: 12, marginBottom: 20 },
  optionButton: { borderRadius: 20, overflow: 'hidden' },
  optionButtonSelected: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  optionButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  optionGradient: { padding: 16 },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  optionTextWrap: { flex: 1 },
  optionLabel: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  optionLabelSelected: { color: '#FFF' },
  optionDescription: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 2,
  },
  optionDescriptionSelected: { color: 'rgba(255,255,255,0.8)' },
  amountSection: { marginTop: 20 },
  inputLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.2,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  amountFocused: { borderColor: COLORS.accent, borderWidth: 1.5 },
  amountPrefix: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    paddingVertical: 12,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  backButtonText: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.accent },
  nextButton: { flex: 2, overflow: 'hidden', borderRadius: 28 },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 8,
  },
  nextButtonText: { fontSize: 16, fontFamily: FONTS.bold, color: '#FFF' },
  incomeDisplay: {
    backgroundColor: 'rgba(71,85,105,0.08)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  incomeDisplayLabel: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted },
  incomeDisplayAmount: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 4,
  },
  extraIncomeSection: { marginTop: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  chipSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.accent },
  chipTextSelected: { color: '#FFF' },
  totalDisplay: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  totalDisplayLabel: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted },
  totalDisplayAmount: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.positive,
    marginTop: 4,
  },
  incomeReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(71,85,105,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  incomeReminderText: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.accent },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subscriptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subscriptionLabel: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.text },
  subscriptionPrice: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 2,
  },
  subscriptionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subscriptionAmount: {
    width: 70,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    paddingHorizontal: 8,
  },
  subscriptionAmountDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  savingsContainer: { alignItems: 'center', paddingVertical: 20 },
  savingsPercentage: { fontSize: 48, fontFamily: FONTS.bold, color: COLORS.accent },
  savingsAmount: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 8,
  },
  savingsInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(71,85,105,0.08)',
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
    gap: 10,
  },
  savingsInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  sliderLabel: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  percentageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  percentageButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  percentageButtonSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  percentageButtonText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.accent },
  percentageButtonTextSelected: { color: '#FFF' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  infoCardText: { flex: 1 },
  infoCardTitle: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
  infoCardDescription: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 4,
  },
  strategyCard: { borderRadius: 20, marginBottom: 12, overflow: 'hidden' },
  strategyCardSelected: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  strategyGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  strategyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strategyContent: { flex: 1 },
  strategyName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  strategyNameSelected: { color: '#FFF' },
  strategyDescription: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 2,
  },
  strategyDescriptionSelected: { color: 'rgba(255,255,255,0.8)' },
  strategyDetail: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 4,
  },
  strategyDetailSelected: { color: 'rgba(255,255,255,0.7)' },
  summaryHeader: { alignItems: 'center', marginBottom: 20 },
  summaryIncome: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted },
  summaryIncomeAmount: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.positive,
    marginTop: 4,
  },
  summarySectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  summaryDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  summaryCategories: { gap: 4 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryRowBold: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 8,
    paddingTop: 14,
  },
  summaryCategory: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.text },
  summaryCategoryBold: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  summaryAmount: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
  summaryAmountBold: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.accent },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  summaryTotalLabel: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  summaryTotalAmount: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.accent },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  warningTextWrap: { flex: 1 },
  warningTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.negative,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    lineHeight: 18,
  },
  remainingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  remainingTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.positive,
    marginBottom: 4,
  },
  remainingText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    lineHeight: 18,
  },
  completeButton: { borderRadius: 28, overflow: 'hidden' },
  completeButtonDisabled: { opacity: 0.6 },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 10,
  },
  completeButtonText: { fontSize: 16, fontFamily: FONTS.bold, color: '#FFF' },
  backButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginTop: 12,
  },
  backButtonFullText: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted },
});