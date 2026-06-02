import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../../services/firebase';
import { addExpense, getCurrentBudget, BUDGET_CATEGORIES } from '../../services/budgetService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.80;

// ─── Design Tokens (matches BudgetScreen) ─────────────────────────────────────
const COLORS = {
  background: '#F8FAFC',
  surface:    '#FFFFFF',
  text:       '#0F172A',
  muted:      '#64748B',
  positive:   '#34C759',
  negative:   '#FF3B30',
  accent:     '#1C1C1E',
  warning:    '#F5A623',
  border:     '#E2E8F0',
  inputBg:    '#F8FAFC',
};

const FONTS = {
  bold:     'JosefinSans-Bold',
  semiBold: 'JosefinSans-SemiBold',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (value) => {
  const numeric = value.replace(/[^0-9]/g, '');
  if (!numeric) return '';
  return parseInt(numeric, 10).toLocaleString('en-ZA');
};

const parseAmount = (formatted) =>
  parseInt((formatted || '').replace(/,/g, ''), 10) || 0;

const friendlyDate = (d) => {
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

// ─── SuccessToast ──────────────────────────────────────────────────────────────

function SuccessToast({ visible }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
      <Text style={styles.toastText}>Expense added ✓</Text>
    </Animated.View>
  );
}

// ─── Shake hook ────────────────────────────────────────────────────────────────

function useShake() {
  const anim = useRef(new Animated.Value(0)).current;
  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 6,   duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0,   duration: 40, useNativeDriver: true }),
    ]).start();
  }, []);
  return { shakeStyle: { transform: [{ translateX: anim }] }, shake };
}

// ─── AddExpenseScreen ─────────────────────────────────────────────────────────

export default function AddExpenseScreen({ navigation }) {
  const insets      = useSafeAreaInsets();
  const slideAnim   = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const dragAnim    = useRef(new Animated.Value(0)).current;
  const { shakeStyle, shake } = useShake();

  const [amount,         setAmount]         = useState('');
  const [selectedCat,    setSelectedCat]    = useState(BUDGET_CATEGORIES[0]?.id || '');
  const [note,           setNote]           = useState('');
  const [date,           setDate]           = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [showToast,      setShowToast]      = useState(false);
  const [overBudgetBy,   setOverBudgetBy]   = useState(null);
  const [currentBudget,  setCurrentBudget]  = useState(null);

  const amountRef = useRef(null);
  const userId    = auth.currentUser?.uid;

  // ── Open animation + focus ──
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue:   0,
        damping:   80,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue:  1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => amountRef.current?.focus(), 420);
    loadBudget();
  }, []);

  const loadBudget = async () => {
    try {
      const data = await getCurrentBudget(userId);
      setCurrentBudget(data);
    } catch (e) {
      console.error('loadBudget error:', e);
    }
  };

  // ── Over-budget check (runs on amount OR category change) ──
  useEffect(() => {
    if (!currentBudget || !amount || !selectedCat) {
      setOverBudgetBy(null);
      return;
    }
    const cat = currentBudget.categories?.[selectedCat];
    if (!cat) { setOverBudgetBy(null); return; }

    const newTotal = (cat.spent || 0) + parseAmount(amount);
    setOverBudgetBy(newTotal > cat.budgeted ? newTotal - cat.budgeted : null);
  }, [amount, selectedCat, currentBudget]);

  // ── Swipe-to-dismiss ──
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.6) {
          dismiss();
        } else {
          Animated.spring(dragAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: SHEET_HEIGHT, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,            duration: 260, useNativeDriver: true }),
    ]).start(() => navigation.goBack());
  }, [navigation]);

  // ── Save ──
  const handleSave = async () => {
    const numericAmount = parseAmount(amount);

    if (!numericAmount || numericAmount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await addExpense(userId, {
        amount:   numericAmount,
        category: selectedCat,
        note:     note.trim(),
        date:     date.toISOString(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowToast(true);

      // Auto-close after toast
      setTimeout(() => dismiss(), 1900);
    } catch (e) {
      console.error('addExpense error:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const numericAmount   = parseAmount(amount);
  const selectedCatData = BUDGET_CATEGORIES.find(c => c.id === selectedCat);
  const combinedY       = Animated.add(slideAnim, dragAnim);

  return (
    <View style={styles.root}>

      {/* ── Backdrop tap-to-close ── */}
      <Animated.View style={[styles.backdrop, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* ── Bottom Sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform:    [{ translateY: combinedY }],
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Drag handle — also the swipe area */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.handle} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >

            {/* Title */}
            <Text style={styles.sheetTitle}>Add Expense</Text>

            {/* ── Amount Input ── */}
            <Animated.View style={[styles.amountRow, shakeStyle]}>
              <Text style={styles.currencyPrefix}>R</Text>
              <TextInput
                ref={amountRef}
                style={styles.amountInput}
                value={amount}
                onChangeText={(t) => setAmount(formatAmount(t))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                selectionColor={COLORS.accent}
              />
            </Animated.View>

            {/* ── Over-budget warning ── */}
            {overBudgetBy !== null && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={15} color="#D97706" />
                <Text style={styles.warningText}>
                  This will exceed your{' '}
                  <Text style={{ fontFamily: FONTS.bold }}>
                    {selectedCatData?.name}
                  </Text>{' '}
                  budget by{' '}
                  <Text style={{ fontFamily: FONTS.bold }}>
                    R{overBudgetBy.toLocaleString('en-ZA')}
                  </Text>
                </Text>
              </View>
            )}

            {/* ── Category Chips ── */}
            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {BUDGET_CATEGORIES.map((cat) => {
                const isSelected = selectedCat === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.chip,
                      isSelected && {
                        backgroundColor: cat.color,
                        borderColor:     cat.color,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCat(cat.id);
                    }}
                  >
                    <View
                      style={[
                        styles.chipDot,
                        { backgroundColor: isSelected ? '#FFF' : cat.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.chipLabel,
                        isSelected && styles.chipLabelSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={13} color="#FFF" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* ── Note ── */}
            <Text style={styles.sectionLabel}>Note (optional)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="create-outline" size={18} color={COLORS.muted} />
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Woolies groceries, Uber to campus…"
                placeholderTextColor="#CBD5E1"
                returnKeyType="done"
                maxLength={100}
                selectionColor={COLORS.accent}
              />
            </View>

            {/* ── Date ── */}
            <Text style={styles.sectionLabel}>Date</Text>
            <Pressable
              style={styles.inputRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.muted} />
              <Text style={[styles.noteInput, { color: COLORS.text }]}>
                {friendlyDate(date)}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) setDate(selected);
                }}
              />
            )}

            {/* ── Save Button ── */}
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.saveBtnPressed,
                (!amount || saving) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!amount || saving}
            >
              <LinearGradient
                colors={['#1C1C1E', '#2C2C2E']}
                style={styles.saveBtnGradient}
              >
                <Text style={styles.saveBtnText}>
                  {saving
                    ? 'Saving…'
                    : numericAmount > 0
                      ? `Add R${numericAmount.toLocaleString('en-ZA')}`
                      : 'Add Expense'}
                </Text>
                {!saving && (
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                )}
              </LinearGradient>
            </Pressable>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Toast ── */}
        <SuccessToast visible={showToast} />
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  sheet: {
    height:                SHEET_HEIGHT,
    backgroundColor:       COLORS.surface,
    borderTopLeftRadius:   32,
    borderTopRightRadius:  32,
    shadowColor:           '#000',
    shadowOffset:          { width: 0, height: -8 },
    shadowOpacity:         0.12,
    shadowRadius:          24,
    elevation:             16,
  },

  dragArea: {
    height:          28,
    alignItems:      'center',
    justifyContent:  'center',
  },

  handle: {
    width:        36,
    height:        4,
    borderRadius:  2,
    backgroundColor: '#E2E8F0',
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom:     32,
  },

  sheetTitle: {
    fontSize:      24,
    fontFamily:    FONTS.bold,
    color:         COLORS.text,
    letterSpacing: -0.5,
    marginBottom:  20,
  },

  // ── Amount ──
  amountRow: {
    flexDirection:   'row',
    alignItems:      'flex-end',
    paddingBottom:   14,
    marginBottom:    12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },

  currencyPrefix: {
    fontSize:      40,
    fontFamily:    FONTS.bold,
    color:         COLORS.muted,
    marginRight:    6,
    lineHeight:     58,
  },

  amountInput: {
    flex:          1,
    fontSize:      56,
    fontFamily:    FONTS.bold,
    color:         COLORS.text,
    letterSpacing: -2,
    padding:        0,
    lineHeight:    64,
  },

  // ── Warning ──
  warningBanner: {
    flexDirection:    'row',
    alignItems:       'flex-start',
    gap:               8,
    backgroundColor:  '#FEF3C7',
    borderRadius:     12,
    padding:          12,
    marginBottom:     12,
    borderLeftWidth:   3,
    borderLeftColor:  '#F59E0B',
  },

  warningText: {
    flex:        1,
    fontSize:    13,
    fontFamily:  FONTS.semiBold,
    color:       '#B45309',
    lineHeight:  18,
  },

  // ── Labels ──
  sectionLabel: {
    fontSize:      11,
    fontFamily:    FONTS.semiBold,
    color:         COLORS.muted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop:     20,
    marginBottom:  10,
  },

  // ── Category chips ──
  chipsScroll: {
    marginHorizontal: -24,
  },

  chipsContent: {
    paddingHorizontal: 24,
    gap:               8,
  },

  chip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:              6,
    paddingHorizontal: 14,
    paddingVertical:  10,
    borderRadius:    24,
    borderWidth:     1.5,
    borderColor:     COLORS.border,
    backgroundColor: COLORS.inputBg,
  },

  chipDot: {
    width:        8,
    height:        8,
    borderRadius:  4,
  },

  chipLabel: {
    fontSize:   13,
    fontFamily: FONTS.semiBold,
    color:      COLORS.text,
  },

  chipLabelSelected: {
    color: '#FFF',
  },

  // ── Inputs ──
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:              10,
    backgroundColor: COLORS.inputBg,
    borderRadius:    14,
    paddingHorizontal: 14,
    paddingVertical:  14,
    borderWidth:      1,
    borderColor:     COLORS.border,
  },

  noteInput: {
    flex:       1,
    fontSize:   15,
    fontFamily: FONTS.semiBold,
    color:      COLORS.text,
    padding:     0,
  },

  // ── Save button ──
  saveBtn: {
    marginTop:    28,
    borderRadius: 18,
    overflow:     'hidden',
  },

  saveBtnPressed: {
    opacity:   0.85,
    transform: [{ scale: 0.98 }],
  },

  saveBtnDisabled: {
    opacity: 0.4,
  },

  saveBtnGradient: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:              8,
    paddingVertical: 18,
  },

  saveBtnText: {
    fontSize:      17,
    fontFamily:    FONTS.bold,
    color:         '#FFF',
    letterSpacing: 0.3,
  },

  // ── Toast ──
  toast: {
    position:    'absolute',
    top:          24,
    alignSelf:   'center',
    flexDirection: 'row',
    alignItems:  'center',
    gap:           8,
    backgroundColor: COLORS.positive,
    paddingHorizontal: 20,
    paddingVertical:   12,
    borderRadius:  24,
    shadowColor:   COLORS.positive,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius:  12,
    elevation:      8,
  },

  toastText: {
    fontSize:   15,
    fontFamily: FONTS.semiBold,
    color:      '#FFF',
  },
});