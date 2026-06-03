// src/screens/Budget/AddExpenseScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../services/firebase';
import { addExpense, BUDGET_CATEGORIES, getCurrentBudget } from '../../services/budgetService';

const { width, height } = Dimensions.get('window');

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

const formatMoney = (amount) => {
  if (!amount) return 'R0';
  const num = Number(amount);
  if (isNaN(num)) return 'R0';
  return `R${Math.round(num).toLocaleString('en-ZA')}`;
};

const parseAmount = (value) => {
  return value.replace(/[^0-9]/g, '');
};

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

export default function AddExpenseScreen({ navigation, route }) {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 80,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    loadBudget();
  }, []);
  
  const loadBudget = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const budget = await getCurrentBudget(userId);
        setCurrentBudget(budget);
      }
    } catch (error) {
      console.error('Failed to load budget:', error);
    }
  };
  
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        damping: 80,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  };
  
  const handleAmountChange = (value) => {
    const cleanValue = parseAmount(value);
    setAmount(cleanValue);
    
    // Check if adding this expense will exceed category budget
    if (selectedCategory && currentBudget && cleanValue) {
      const categoryData = currentBudget.categories?.[selectedCategory];
      const currentSpent = categoryData?.spent || 0;
      const budgeted = categoryData?.budgeted || 0;
      const newTotal = currentSpent + Number(cleanValue);
      
      if (budgeted > 0 && newTotal > budgeted) {
        const overAmount = newTotal - budgeted;
        const categoryName = BUDGET_CATEGORIES.find(c => c.id === selectedCategory)?.name;
        setWarningMessage(`⚠️ This will exceed your ${categoryName} budget by ${formatMoney(overAmount)}`);
      } else {
        setWarningMessage('');
      }
    }
  };
  
  const handleQuickAmount = (amt) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(amt.toString());
  };
  
  const handleCategorySelect = (categoryId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(categoryId);
    setWarningMessage('');
  };
  
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a spending category');
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not logged in');
      
      const expenseData = {
        amount: Number(amount),
        category: selectedCategory,
        note: note.trim() || `${BUDGET_CATEGORIES.find(c => c.id === selectedCategory)?.name} expense`,
        date: date.toISOString().split('T')[0],
        paymentMethod: 'card', // Default payment method
      };
      
      await addExpense(userId, expenseData);
      
      Alert.alert(
        'Expense Added ✓',
        `${formatMoney(amount)} added to ${BUDGET_CATEGORIES.find(c => c.id === selectedCategory)?.name}`,
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('Failed to add expense:', error);
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    }
  };
  
  return (
    <View style={styles.container}>
      <AnimatedPressable
        style={[styles.backdrop, { opacity: backdropAnim }]}
        onPress={handleClose}
      />
      
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 80, // Added to prevent tab bar overlap
          },
        ]}
      >
        <LinearGradient
          colors={[COLORS.surface, '#F8FAFC']}
          style={styles.sheetGradient}
        >
          <View style={styles.handleBar} />
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Expense</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.muted} />
            </Pressable>
          </View>
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 40 } // Extra padding at bottom of scroll
              ]}
            >
              {/* Amount Section */}
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>AMOUNT</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.amountPrefix}>R</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={handleAmountChange}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                
                {/* Quick Amount Buttons */}
                <View style={styles.quickAmounts}>
                  {QUICK_AMOUNTS.map((amt) => (
                    <Pressable
                      key={amt}
                      style={styles.quickAmountButton}
                      onPress={() => handleQuickAmount(amt)}
                    >
                      <Text style={styles.quickAmountText}>R{amt}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              
              {/* Warning Message */}
              {warningMessage !== '' && (
                <View style={styles.warningContainer}>
                  <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
                  <Text style={styles.warningText}>{warningMessage}</Text>
                </View>
              )}
              
              {/* Category Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>CATEGORY</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {BUDGET_CATEGORIES.map((category) => (
                    <Pressable
                      key={category.id}
                      style={({ pressed }) => [
                        styles.categoryChip,
                        selectedCategory === category.id && styles.categoryChipSelected,
                        pressed && styles.categoryChipPressed,
                      ]}
                      onPress={() => handleCategorySelect(category.id)}
                    >
                      <View
                        style={[
                          styles.categoryChipIcon,
                          { backgroundColor: category.color + '20' },
                          selectedCategory === category.id && styles.categoryChipIconSelected,
                        ]}
                      >
                        <Ionicons
                          name={category.icon}
                          size={20}
                          color={selectedCategory === category.id ? '#FFF' : category.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryChipLabel,
                          selectedCategory === category.id && styles.categoryChipLabelSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                      {selectedCategory === category.id && (
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              
              {/* Note Field */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>NOTE (OPTIONAL)</Text>
                <View style={styles.noteContainer}>
                  <Ionicons name="create-outline" size={20} color={COLORS.muted} />
                  <TextInput
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g., Woolies groceries, Uber ride..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
              
              {/* Date Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>DATE</Text>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
                  <Text style={styles.dateText}>{formatDate(date)}</Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
              
              {/* Save Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                ]}
                onPress={handleSave}
                disabled={loading}
              >
                <LinearGradient
                  colors={[COLORS.accent, '#2C2C2E']}
                  style={styles.saveButtonGradient}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Adding...' : 'Add Expense'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const AnimatedPressable = ({ style, onPress, children }) => {
  return (
    <Animated.View style={style}>
      <Pressable style={{ flex: 1 }} onPress={onPress}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.7, // Reduced height since payment method removed
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheetGradient: {
    flex: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  amountPrefix: {
    fontSize: 48,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    minWidth: 120,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmountText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.accent,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,166,35,0.12)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.warning,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  categoryScroll: {
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  categoryChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  categoryChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryChipLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  categoryChipLabelSelected: {
    color: '#FFF',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  noteInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 28,
    overflow: 'hidden',
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
});