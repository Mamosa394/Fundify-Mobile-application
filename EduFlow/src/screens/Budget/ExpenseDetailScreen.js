import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  Animated,
  PanResponder,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { Ionicons }          from '@expo/vector-icons';
import * as Haptics          from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar }         from 'expo-status-bar';
import { useFocusEffect }    from '@react-navigation/native';
import { auth }              from '../../services/firebase';
import {
  getExpensesByCategory,
  deleteExpense,
  updateExpense,
  getCurrentBudget,
  BUDGET_CATEGORIES,
} from '../../services/budgetService';
import { exportAsCSV, exportAsPDF } from '../../utils/exportUtils';

const { width } = Dimensions.get('window');

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

const DELETE_REVEAL   = 76;
const SWIPE_THRESHOLD = 60;

const formatMoney = (n) => `R${Math.round(n || 0).toLocaleString('en-ZA')}`;

const formatAmountInput = (value) => {
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
    weekday: 'long', day: 'numeric', month: 'long',
  });
};

const groupByDate = (expenses) => {
  const map = {};
  expenses.forEach((e) => {
    const key = new Date(e.date).toDateString();
    if (!map[key]) map[key] = [];
    map[key].push(e);
  });
  return Object.entries(map)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([key, data]) => ({
      title:        friendlyDate(new Date(key)),
      data,
      sectionTotal: data.reduce((s, e) => s + (e.amount || 0), 0),
    }));
};

function SwipeableExpenseItem({ item, isEditing, onDelete, onEdit, onSave, onCancelEdit }) {
  const translateX    = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const collapseAnim  = useRef(new Animated.Value(1)).current;
  const isOpen        = useRef(false);

  const [editAmount, setEditAmount] = useState('');
  const [editNote,   setEditNote]   = useState('');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (isEditing) {
      setEditAmount(item.amount.toLocaleString('en-ZA'));
      setEditNote(item.note || '');
    }
  }, [isEditing]);

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0, useNativeDriver: false, tension: 120, friction: 12,
    }).start();
    Animated.timing(deleteOpacity, {
      toValue: 0, duration: 140, useNativeDriver: false,
    }).start();
    isOpen.current = false;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !isEditing && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const dx = Math.min(0, Math.max(-DELETE_REVEAL * 1.1, g.dx));
        translateX.setValue(dx);
        deleteOpacity.setValue(Math.min(1, Math.abs(dx) / DELETE_REVEAL));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_REVEAL, useNativeDriver: false, tension: 120, friction: 12,
          }).start();
          Animated.timing(deleteOpacity, {
            toValue: 1, duration: 150, useNativeDriver: false,
          }).start();
          isOpen.current = true;
        } else {
          closeSwipe();
        }
      },
    })
  ).current;

  const handleDeletePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Expense',
      `Remove ${formatMoney(item.amount)}${item.note ? ` — "${item.note}"` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: closeSwipe },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Animated.sequence([
              Animated.timing(translateX, {
                toValue: -width, duration: 240, useNativeDriver: false,
              }),
              Animated.timing(collapseAnim, {
                toValue: 0, duration: 300, useNativeDriver: false,
              }),
            ]).start(() => onDelete(item));
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const newAmount = parseAmount(editAmount);
    if (!newAmount || newAmount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    try {
      await onSave(item, { amount: newAmount, note: editNote.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Animated.View
      style={[
        styles.swipeWrapper,
        {
          opacity: collapseAnim,
          maxHeight: collapseAnim.interpolate({
            inputRange: [0, 1], outputRange: [0, 600],
          }),
          marginBottom: collapseAnim.interpolate({
            inputRange: [0, 1], outputRange: [0, 10],
          }),
        },
      ]}
    >
      <Animated.View style={[styles.deleteReveal, { opacity: deleteOpacity }]}>
        <Pressable style={styles.deleteBtn} onPress={handleDeletePress}>
          <Ionicons name="trash-outline" size={20} color="#FFF" />
          <Text style={styles.deleteBtnLabel}>Delete</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[styles.expenseCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.editAmountRow}>
              <Text style={styles.editCurrencyPrefix}>R</Text>
              <TextInput
                style={styles.editAmountInput}
                value={editAmount}
                onChangeText={(t) => setEditAmount(formatAmountInput(t))}
                keyboardType="numeric"
                autoFocus
                selectionColor={COLORS.accent}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
              />
            </View>

            <View style={styles.editNoteRow}>
              <Ionicons name="create-outline" size={16} color={COLORS.muted} />
              <TextInput
                style={styles.editNoteInput}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Add a note…"
                placeholderTextColor="#CBD5E1"
                returnKeyType="done"
                selectionColor={COLORS.accent}
                maxLength={100}
              />
            </View>

            <View style={styles.editActions}>
              <Pressable style={styles.cancelBtn} onPress={onCancelEdit}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (!editAmount || saving) && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={!editAmount || saving}
              >
                <LinearGradient
                  colors={['#1C1C1E', '#2C2C2E']}
                  style={styles.saveBtnGradient}
                >
                  <Text style={styles.saveBtnText}>
                    {saving
                      ? 'Saving…'
                      : `Save ${parseAmount(editAmount) > 0 ? formatMoney(parseAmount(editAmount)) : ''}`}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.expenseRow}
            onPress={() => {
              if (isOpen.current) { closeSwipe(); return; }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit(item.id);
            }}
          >
            <View style={styles.expenseLeft}>
              <Text style={styles.expenseNote} numberOfLines={1}>
                {item.note || 'No description'}
              </Text>
              <Text style={styles.expenseTime}>
                {new Date(item.date).toLocaleTimeString('en-ZA', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.expenseRight}>
              <Text style={styles.expenseAmount}>{formatMoney(item.amount)}</Text>
              <Text style={styles.editHint}>tap to edit</Text>
            </View>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function SummaryBar({ category, spent, budgeted, count }) {
  const progress  = budgeted > 0 ? Math.min(spent / budgeted, 1) : 0;
  const remaining = budgeted - spent;
  const isOver    = spent > budgeted;

  return (
    <View style={styles.summaryBar}>
      <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.summaryGradient}>
        <View style={styles.summaryHeader}>
          <View style={[styles.summaryDot, { backgroundColor: category?.color || COLORS.accent }]} />
          <Text style={styles.summaryCatName}>{category?.name || 'Category'}</Text>
          <Text style={styles.summaryCount}>
            {count} expense{count !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Spent</Text>
            <Text style={[
              styles.summaryStatValue,
              { color: isOver ? COLORS.negative : COLORS.text },
            ]}>
              {formatMoney(spent)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Budget</Text>
            <Text style={styles.summaryStatValue}>{formatMoney(budgeted)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>{isOver ? 'Over by' : 'Left'}</Text>
            <Text style={[
              styles.summaryStatValue,
              { color: isOver ? COLORS.negative : COLORS.positive },
            ]}>
              {formatMoney(Math.abs(remaining))}
            </Text>
          </View>
        </View>

        <View style={styles.summaryProgressTrack}>
          <View
            style={[
              styles.summaryProgressFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: isOver
                  ? COLORS.negative
                  : (category?.color || COLORS.positive),
              },
            ]}
          />
        </View>

        {isOver && (
          <Text style={styles.overBudgetText}>
            ⚠️ Over budget by {formatMoney(Math.abs(remaining))}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

function EmptyState({ categoryName }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={48} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>No expenses yet</Text>
      <Text style={styles.emptySubtitle}>
        Your {categoryName} expenses will appear here once you add them.
      </Text>
    </View>
  );
}

export default function ExpenseDetailScreen({ route, navigation }) {
  const { categoryId, categoryName } = route.params;
  const insets = useSafeAreaInsets();

  const [expenses,        setExpenses]        = useState([]);
  const [budget,          setBudget]          = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [editingId,       setEditingId]       = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting,       setExporting]       = useState(null);
  const [exportError,     setExportError]     = useState(null);

  const userId   = auth.currentUser?.uid;
  const category = BUDGET_CATEGORIES.find((c) => c.id === categoryId);

  const loadData = useCallback(async () => {
    try {
      const [expData, budgetData] = await Promise.all([
        getExpensesByCategory(userId, categoryId),
        getCurrentBudget(userId),
      ]);
      setExpenses(expData || []);
      setBudget(budgetData);
    } catch (e) {
      console.error('ExpenseDetailScreen loadData:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, categoryId]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleDelete = useCallback(async (expense) => {
    try {
      await deleteExpense(userId, expense);
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      setBudget((prev) => {
        if (!prev) return prev;
        const cat = prev.categories?.[expense.category];
        if (!cat) return prev;
        return {
          ...prev,
          spentTotal: Math.max(0, (prev.spentTotal || 0) - expense.amount),
          categories: {
            ...prev.categories,
            [expense.category]: {
              ...cat,
              spent: Math.max(0, (cat.spent || 0) - expense.amount),
            },
          },
        };
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('handleDelete:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [userId]);

  const handleSave = useCallback(async (original, updates) => {
    try {
      await updateExpense(userId, original.id, updates, original);
      setExpenses((prev) =>
        prev.map((e) => (e.id === original.id ? { ...e, ...updates } : e))
      );
      const diff = (updates.amount || original.amount) - original.amount;
      if (diff !== 0) {
        setBudget((prev) => {
          if (!prev) return prev;
          const cat = prev.categories?.[categoryId];
          if (!cat) return prev;
          return {
            ...prev,
            spentTotal: (prev.spentTotal || 0) + diff,
            categories: {
              ...prev.categories,
              [categoryId]: {
                ...cat,
                spent: Math.max(0, (cat.spent || 0) + diff),
              },
            },
          };
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingId(null);
    } catch (e) {
      console.error('handleSave:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [userId, categoryId]);

  const handleExport = async (type) => {
    setExporting(type);
    setExportError(null);
    try {
      if (type === 'csv') {
        await exportAsCSV(expenses, categoryName);
      } else {
        await exportAsPDF(expenses, categoryName, budget, categoryId);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowExportModal(false);
    } catch (e) {
      console.error('handleExport:', e);
      setExportError(e.message || 'Export failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExporting(null);
    }
  };

  const sections      = useMemo(() => groupByDate(expenses), [expenses]);
  const catBudget     = budget?.categories?.[categoryId];
  const totalSpent    = catBudget?.spent    || expenses.reduce((s, e) => s + e.amount, 0);
  const totalBudgeted = catBudget?.budgeted || 0;

  const renderItem = useCallback(({ item }) => (
    <SwipeableExpenseItem
      item={item}
      isEditing={editingId === item.id}
      onDelete={handleDelete}
      onEdit={(id) => setEditingId((prev) => (prev === id ? null : id))}
      onSave={handleSave}
      onCancelEdit={() => setEditingId(null)}
    />
  ), [editingId, handleDelete, handleSave]);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionDate}>{section.title}</Text>
      <Text style={styles.sectionTotal}>{formatMoney(section.sectionTotal)}</Text>
    </View>
  ), []);

  if (loading) {
    return (
      <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={styles.flex}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading expenses…</Text>
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

        <Text style={styles.navTitle}>{categoryName}</Text>

        <Pressable
          style={[styles.exportBtn, expenses.length === 0 && { opacity: 0.3 }]}
          onPress={() => {
            if (expenses.length === 0) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExportError(null);
            setShowExportModal(true);
          }}
        >
          <Ionicons name="share-outline" size={18} color="#FFF" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 60}
      >
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          ListHeaderComponent={
            <SummaryBar
              category={category}
              spent={totalSpent}
              budgeted={totalBudgeted}
              count={expenses.length}
            />
          }
          ListEmptyComponent={<EmptyState categoryName={categoryName} />}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
        />
      </KeyboardAvoidingView>

      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!exporting) setShowExportModal(false); }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => { if (!exporting) setShowExportModal(false); }}
        >
          <Pressable style={[styles.exportSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.exportHandle} />

            <Text style={styles.exportSheetTitle}>Export Expenses</Text>
            <Text style={styles.exportSheetSub}>
              {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} · {categoryName}
            </Text>

            <Pressable
              style={[styles.exportOption, exporting === 'pdf' && { opacity: 0.35 }]}
              onPress={() => handleExport('csv')}
              disabled={!!exporting}
            >
              <View style={[styles.exportOptionIcon, { backgroundColor: '#F0FDF4' }]}>
                {exporting === 'csv' ? (
                  <ActivityIndicator size="small" color={COLORS.positive} />
                ) : (
                  <Ionicons name="grid-outline" size={24} color={COLORS.positive} />
                )}
              </View>
              <View style={styles.exportOptionInfo}>
                <Text style={styles.exportOptionLabel}>
                  {exporting === 'csv' ? 'Generating CSV…' : 'Export as CSV'}
                </Text>
                <Text style={styles.exportOptionDesc}>
                  Open in Excel, Google Sheets, or Numbers
                </Text>
              </View>
              {!exporting && (
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              )}
            </Pressable>

            <View style={styles.exportDivider} />

            <Pressable
              style={[styles.exportOption, exporting === 'csv' && { opacity: 0.35 }]}
              onPress={() => handleExport('pdf')}
              disabled={!!exporting}
            >
              <View style={[styles.exportOptionIcon, { backgroundColor: '#FFF1F2' }]}>
                {exporting === 'pdf' ? (
                  <ActivityIndicator size="small" color={COLORS.negative} />
                ) : (
                  <Ionicons name="document-text-outline" size={24} color={COLORS.negative} />
                )}
              </View>
              <View style={styles.exportOptionInfo}>
                <Text style={styles.exportOptionLabel}>
                  {exporting === 'pdf' ? 'Generating PDF…' : 'Export as PDF'}
                </Text>
                <Text style={styles.exportOptionDesc}>
                  Styled report — save, share, or print
                </Text>
              </View>
              {!exporting && (
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              )}
            </Pressable>

            {exportError ? (
              <View style={styles.exportError}>
                <Ionicons name="alert-circle-outline" size={15} color={COLORS.negative} />
                <Text style={styles.exportErrorText}>{exportError}</Text>
              </View>
            ) : null}

            {!exporting && (
              <Pressable
                style={styles.exportCancelBtn}
                onPress={() => { setExportError(null); setShowExportModal(false); }}
              >
                <Text style={styles.exportCancelText}>Cancel</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  navTitle: {
    fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.3,
  },
  exportBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  summaryBar: {
    marginHorizontal: 16, marginBottom: 20,
    borderRadius: 24, overflow: 'hidden',
    shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 4,
  },
  summaryGradient: { padding: 20 },
  summaryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  summaryDot:     { width: 10, height: 10, borderRadius: 5 },
  summaryCatName: { flex: 1, fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  summaryCount:   { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted },
  summaryStats:   { flexDirection: 'row', marginBottom: 16 },
  summaryStat:    { flex: 1, alignItems: 'center' },
  summaryStatLabel: {
    fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: 20, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.5,
  },
  summaryDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  summaryProgressTrack: {
    height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden',
  },
  summaryProgressFill: { height: '100%', borderRadius: 3 },
  overBudgetText: {
    marginTop: 8, fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.negative,
  },
  listContent:  { paddingTop: 8 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 4,
  },
  sectionDate:  { fontSize: 14, fontFamily: FONTS.bold,     color: COLORS.text },
  sectionTotal: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted },
  swipeWrapper: {
    marginHorizontal: 16, position: 'relative', overflow: 'hidden',
  },
  deleteReveal: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: DELETE_REVEAL, borderRadius: 18, overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1, backgroundColor: COLORS.negative,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  deleteBtnLabel: { fontSize: 10, fontFamily: FONTS.semiBold, color: '#FFF' },
  expenseCard: {
    backgroundColor: COLORS.surface, borderRadius: 18,
    shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, overflow: 'hidden',
  },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  expenseLeft:   { flex: 1, gap: 4 },
  expenseNote:   { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.text },
  expenseTime:   { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.muted },
  expenseRight:  { alignItems: 'flex-end', gap: 4 },
  expenseAmount: {
    fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.3,
  },
  editHint: { fontSize: 10, fontFamily: FONTS.semiBold, color: COLORS.muted },
  editForm: { padding: 16, gap: 12 },
  editAmountRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    borderBottomWidth: 2, borderBottomColor: COLORS.accent, paddingBottom: 8,
  },
  editCurrencyPrefix: {
    fontSize: 28, fontFamily: FONTS.bold, color: COLORS.muted, marginRight: 4, lineHeight: 40,
  },
  editAmountInput: {
    flex: 1, fontSize: 38, fontFamily: FONTS.bold,
    color: COLORS.text, letterSpacing: -1, padding: 0, lineHeight: 46,
  },
  editNoteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.inputBg, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  editNoteInput: {
    flex: 1, fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text, padding: 0,
  },
  editActions:   { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.muted },
  saveBtn:       { flex: 1, borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
  },
  saveBtnText:   { fontSize: 15, fontFamily: FONTS.bold, color: '#FFF' },
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, paddingHorizontal: 40, gap: 12,
  },
  emptyTitle: {
    fontSize: 20, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted,
    textAlign: 'center', lineHeight: 22,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  exportSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 16,
  },
  exportHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginVertical: 12,
  },
  exportSheetTitle: {
    fontSize: 20, fontFamily: FONTS.bold, color: COLORS.text,
    paddingHorizontal: 20, marginBottom: 4,
  },
  exportSheetSub: {
    fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.muted,
    paddingHorizontal: 20, marginBottom: 16,
  },
  exportOption: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 20, paddingVertical: 16,
  },
  exportOptionIcon: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  exportOptionInfo:  { flex: 1 },
  exportOptionLabel: {
    fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 3,
  },
  exportOptionDesc: {
    fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },
  exportDivider: {
    height: 1, backgroundColor: COLORS.border, marginHorizontal: 20,
  },
  exportError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF1F2', borderRadius: 12, padding: 12,
    marginHorizontal: 20, marginTop: 8,
    borderLeftWidth: 3, borderLeftColor: COLORS.negative,
  },
  exportErrorText: {
    flex: 1, fontSize: 13, fontFamily: FONTS.semiBold, color: '#BE123C',
  },
  exportCancelBtn: {
    marginHorizontal: 20, marginTop: 12, paddingVertical: 15,
    borderRadius: 16, backgroundColor: COLORS.border, alignItems: 'center',
  },
  exportCancelText: {
    fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },
});