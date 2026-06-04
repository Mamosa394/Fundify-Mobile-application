// src/screens/Budget/ExpenseDetailScreen.js

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
  ScrollView,
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
  getExpenses,
  getExpensesByCategory,
  deleteExpense,
  updateExpense,
  getBudgetByMonth,
  BUDGET_CATEGORIES,
} from '../../services/budgetService';
import { exportAsCSV, exportAsPDF } from '../../../src/utils/exportUtils';
import ScrollableTopTabBar from '../../../src/screens/Budget/components/ScrollableTopBar';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#F2F2F7',
  surface:    '#FFFFFF',
  text:       '#0A0A0A',
  muted:      '#8E8E93',
  positive:   '#34C759',
  negative:   '#FF3B30',
  accent:     '#1C1C1E',
  warning:    '#FF9500',
  border:     '#E2E8F0',
  inputBg:    '#F2F2F7',
};

const FONTS = {
  bold:     'JosefinSans-Bold',
  semiBold: 'JosefinSans-SemiBold',
};

const DELETE_REVEAL   = 80;
const SWIPE_THRESHOLD = 60;
const BOTTOM_NAV_HEIGHT = 90;

const formatMoney = (n) => `M${Math.round(n || 0).toLocaleString('en-ZA')}`;

const formatAmountInput = (value) => {
  if (!value) return '';
  const numeric = String(value).replace(/[^0-9]/g, '');
  if (!numeric) return '';
  return parseInt(numeric, 10).toLocaleString('en-ZA');
};

const parseAmount = (formatted) => {
  if (!formatted) return 0;
  return parseInt(String(formatted).replace(/,/g, ''), 10) || 0;
};

const friendlyDate = (d) => {
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
};

const groupByDate = (expenses) => {
  if (!expenses || expenses.length === 0) return [];
  const map = {};
  expenses.forEach((e) => {
    if (!e || !e.date) return;
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

// ─── Search & Filter Bar ──────────────────────────────────────────────────────
function SearchFilterBar({ searchQuery, onSearchChange, filter, onFilterChange }) {
  return (
    <View style={styles.searchFilterContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search-outline" size={15} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery || ''}
          onChangeText={onSearchChange}
          placeholder="Search expenses..."
          placeholderTextColor={COLORS.muted}
          selectionColor={COLORS.accent}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {['All', 'Over R100', 'This Week'].map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              filter === f && { backgroundColor: COLORS.accent },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onFilterChange(filter === f ? 'All' : f);
            }}
          >
            <Text style={[
              styles.filterChipText,
              filter === f && { color: '#FFF' },
            ]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── SwipeableExpenseItem ─────────────────────────────────────────────────────
function SwipeableExpenseItem({ item, isEditing, onDelete, onEdit, onSave, onCancelEdit, categoryColor }) {
  const translateX    = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const collapseAnim  = useRef(new Animated.Value(1)).current;
  const isOpen        = useRef(false);

  const [editAmount, setEditAmount] = useState('');
  const [editNote,   setEditNote]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const cat = BUDGET_CATEGORIES.find(c => c.id === item?.category);
  const displayColor = categoryColor || cat?.color || COLORS.accent;

  useEffect(() => {
    if (isEditing && item) {
      setEditAmount((item.amount || 0).toLocaleString('en-ZA'));
      setEditNote(item.note || '');
    }
  }, [isEditing, item]);

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0, useNativeDriver: false, tension: 120, friction: 12,
    }).start();
    Animated.timing(deleteOpacity, {
      toValue: 0, duration: 140, useNativeDriver: false,
    }).start();
    isOpen.current = false;
  }, [translateX, deleteOpacity]);

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
    if (!item) return;
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
    if (!item) return;
    setSaving(true);
    try {
      await onSave(item, { amount: newAmount, note: (editNote || '').trim(), category: item.category });
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

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
            inputRange: [0, 1], outputRange: [0, 8],
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
                selectionColor={displayColor}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
              />
            </View>

            <View style={styles.editDivider} />

            <View style={styles.editNoteRow}>
              <Ionicons name="create-outline" size={16} color={COLORS.muted} />
              <TextInput
                style={styles.editNoteInput}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Add a note..."
                placeholderTextColor="#CBD5E1"
                returnKeyType="done"
                selectionColor={displayColor}
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
                      ? 'Saving...'
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
              <View style={styles.expenseNameRow}>
                <View style={[styles.expenseCategoryDot, { backgroundColor: displayColor }]} />
                <Text style={styles.expenseNote} numberOfLines={1}>
                  {item.note || cat?.name || 'Expense'}
                </Text>
              </View>
              <View style={styles.expenseMetaRow}>
                <Text style={styles.expenseTime}>
                  {item.date ? new Date(item.date).toLocaleTimeString('en-ZA', {
                    hour: '2-digit', minute: '2-digit',
                  }) : ''}
                </Text>
                {cat && (
                  <Text style={styles.expenseCategoryLabel}>{cat.name}</Text>
                )}
              </View>
            </View>
            <View style={styles.expenseRight}>
              <Text style={styles.expenseAmount}>{formatMoney(item.amount)}</Text>
              <View style={styles.editHintRow}>
                <Ionicons name="pencil-outline" size={10} color={COLORS.muted} />
                <Text style={styles.editHint}>tap to edit</Text>
              </View>
            </View>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────
function SummaryBar({ category, spent, budgeted, count, isAllCategories, month }) {
  const progress  = budgeted > 0 ? Math.min((spent || 0) / budgeted, 1) : 0;
  const remaining = Math.abs((budgeted || 0) - (spent || 0));
  const isOver    = (spent || 0) > (budgeted || 0);
  const barColor  = isOver ? COLORS.negative : progress > 0.8 ? COLORS.warning : (category?.color || COLORS.positive);
  const progressPercent = `${Math.min(progress * 100, 100)}%`;

  const monthLabel = month ? new Date(month + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) : '';

  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={[styles.summaryDot, { backgroundColor: isAllCategories ? COLORS.accent : (category?.color || COLORS.accent) }]} />
          <View style={styles.summaryHeaderText}>
            <Text style={styles.summaryCatName}>
              {isAllCategories ? 'All Expenses' : category?.name || 'Category'}
            </Text>
            <Text style={styles.summaryCount}>
              {monthLabel} · {count || 0} expense{(count || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>SPENT</Text>
            <Text style={[styles.summaryStatValue, { color: COLORS.negative }]}>
              {formatMoney(spent)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>BUDGET</Text>
            <Text style={[styles.summaryStatValue, { color: COLORS.text }]}>
              {formatMoney(budgeted)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>{isOver ? 'OVER' : 'LEFT'}</Text>
            <Text style={[styles.summaryStatValue, { color: isOver ? COLORS.negative : COLORS.positive }]}>
              {formatMoney(remaining)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryProgressTrack}>
          <View
            style={[
              styles.summaryProgressFill,
              {
                width: progressPercent,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>

        {isOver && (
          <Text style={styles.overBudgetText}>
            Over budget by {formatMoney(remaining)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Undo Snackbar ────────────────────────────────────────────────────────────
function UndoSnackbar({ visible, onUndo, onDismiss, bottomInset }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDismiss());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.snackbar, { opacity, bottom: (bottomInset || 0) + BOTTOM_NAV_HEIGHT + 12 }]}>
      <Text style={styles.snackbarText}>Expense deleted</Text>
      <Pressable onPress={onUndo}>
        <Text style={styles.snackbarUndo}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Export Modal ─────────────────────────────────────────────────────────────
function ExportModal({ visible, onClose, onExportCSV, onExportPDF, loading, expenses, categoryName, month }) {
  const monthLabel = month ? new Date(month + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.exportSheet} onPress={() => {}}>
          <View style={styles.exportHandle} />
          <Text style={styles.exportTitle}>Export Report</Text>
          <Text style={styles.exportSubtitle}>
            {(expenses || []).length} expense{(expenses || []).length !== 1 ? 's' : ''} · {categoryName} · {monthLabel}
          </Text>

          <Pressable
            style={[styles.exportOption, loading && { opacity: 0.5 }]}
            onPress={onExportCSV}
            disabled={loading}
          >
            <View style={[styles.exportOptionIcon, { backgroundColor: '#F0FDF4' }]}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.positive} />
              ) : (
                <Ionicons name="grid-outline" size={22} color={COLORS.positive} />
              )}
            </View>
            <View style={styles.exportOptionInfo}>
              <Text style={styles.exportOptionLabel}>Export as CSV</Text>
              <Text style={styles.exportOptionDesc}>Open in Excel, Sheets, or Numbers</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </Pressable>

          <View style={styles.exportDivider} />

          <Pressable
            style={[styles.exportOption, loading && { opacity: 0.5 }]}
            onPress={onExportPDF}
            disabled={loading}
          >
            <View style={[styles.exportOptionIcon, { backgroundColor: '#FFF1F2' }]}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.negative} />
              ) : (
                <Ionicons name="document-text-outline" size={22} color={COLORS.negative} />
              )}
            </View>
            <View style={styles.exportOptionInfo}>
              <Text style={styles.exportOptionLabel}>Export as PDF</Text>
              <Text style={styles.exportOptionDesc}>Save, share, or print a styled report</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </Pressable>

          <Pressable style={styles.exportCancelBtn} onPress={onClose}>
            <Text style={styles.exportCancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ExpenseDetailScreen({ route, navigation }) {
  const { categoryId, categoryName } = route.params || {};
  const insets = useSafeAreaInsets();

  const [expenses,        setExpenses]        = useState([]);
  const [budget,          setBudget]          = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [editingId,       setEditingId]       = useState(null);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [filter,          setFilter]          = useState('All');
  const [deletedExpense,  setDeletedExpense]  = useState(null);
  const [showSnackbar,    setShowSnackbar]    = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting,       setExporting]       = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const userId   = auth.currentUser?.uid;
  const isAllCategories = categoryId === 'all';
  const category = isAllCategories ? null : BUDGET_CATEGORIES.find((c) => c.id === categoryId);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      let expData;
      if (isAllCategories) {
        expData = await getExpenses(userId, currentMonth);
      } else {
        expData = await getExpensesByCategory(userId, categoryId, currentMonth);
      }
      
      const budgetData = await getBudgetByMonth(userId, currentMonth);
      
      setExpenses(Array.isArray(expData) ? expData : []);
      setBudget(budgetData);
    } catch (e) {
      console.error('ExpenseDetailScreen loadData:', e);
      setExpenses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, categoryId, isAllCategories, currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filteredExpenses = useMemo(() => {
    let result = Array.isArray(expenses) ? [...expenses] : [];
    
    if (searchQuery && String(searchQuery).trim()) {
      const q = String(searchQuery).toLowerCase().trim();
      result = result.filter(e => {
        const note = e && e.note ? String(e.note).toLowerCase() : '';
        return note.includes(q);
      });
    }
    
    if (filter === 'Over R100') {
      result = result.filter(e => (e && e.amount ? e.amount : 0) > 100);
    } else if (filter === 'This Week') {
      const now = new Date();
      const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      result = result.filter(e => {
        if (!e || !e.date) return false;
        const expenseDate = new Date(e.date);
        return !isNaN(expenseDate.getTime()) && expenseDate >= weekAgo;
      });
    }
    
    return result;
  }, [expenses, searchQuery, filter]);

  const handleDelete = useCallback(async (expense) => {
    if (!expense || !expense.id) return;
    
    setDeletedExpense(expense);
    setShowSnackbar(true);
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    try {
      await deleteExpense(userId, expense.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('handleDelete:', e);
      setExpenses((prev) => [...prev, expense]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [userId]);

  const handleUndo = useCallback(() => {
    if (deletedExpense) {
      setExpenses((prev) => [...prev, deletedExpense]);
      setDeletedExpense(null);
      setShowSnackbar(false);
    }
  }, [deletedExpense]);

  const handleSave = useCallback(async (original, updates) => {
    if (!original || !original.id) return;
    
    try {
      const safeUpdates = {
        amount: updates?.amount || original.amount || 0,
        note: updates?.note ? String(updates.note).trim() : '',
        category: updates?.category || original.category,
      };
      
      await updateExpense(userId, original.id, safeUpdates);
      setExpenses((prev) =>
        prev.map((e) => (e.id === original.id ? { ...e, ...safeUpdates } : e))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingId(null);
    } catch (e) {
      console.error('handleSave:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [userId]);

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      if (!filteredExpenses || filteredExpenses.length === 0) {
        Alert.alert('No Data', 'There are no expenses to export.');
        setShowExportModal(false);
        return;
      }
      await exportAsCSV(filteredExpenses, categoryName || 'Expenses');
      setShowExportModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('CSV Export Error:', e);
      Alert.alert('Export Failed', e.message || 'Could not export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [filteredExpenses, categoryName]);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      if (!filteredExpenses || filteredExpenses.length === 0) {
        Alert.alert('No Data', 'There are no expenses to export.');
        setShowExportModal(false);
        return;
      }
      await exportAsPDF(filteredExpenses, categoryName || 'Expenses', budget || {}, categoryId);
      setShowExportModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('PDF Export Error:', e);
      Alert.alert('Export Failed', e.message || 'Could not export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [filteredExpenses, categoryName, budget, categoryId]);

  const sections = useMemo(() => groupByDate(filteredExpenses), [filteredExpenses]);
  
  const totalSpent = (filteredExpenses || []).reduce((s, e) => s + (e && e.amount ? e.amount : 0), 0);
  const totalBudgeted = isAllCategories 
    ? (budget?.totalBudget || 0)
    : (budget?.categories?.[categoryId]?.budgeted || 0);

  const renderItem = useCallback(({ item }) => (
    <SwipeableExpenseItem
      item={item}
      isEditing={editingId === item?.id}
      onDelete={handleDelete}
      onEdit={(id) => setEditingId((prev) => (prev === id ? null : id))}
      onSave={handleSave}
      onCancelEdit={() => setEditingId(null)}
      categoryColor={category?.color}
    />
  ), [editingId, handleDelete, handleSave, category]);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionDate}>{section?.title || ''}</Text>
      <Text style={styles.sectionTotal}>{formatMoney(section?.sectionTotal || 0)}</Text>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.background }]}>
      <StatusBar style="dark" />

      <View style={{ backgroundColor: COLORS.background }}>
        <View style={{ paddingTop: insets.top }}>
          <ScrollableTopTabBar
            tabs={['Budget', 'Expenses']}
            activeTab="Expenses"
            onTabPress={(tab) => {
              if (tab === 'Budget') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }
            }}
          />
        </View>

        <View style={styles.navHeader}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>
          <Text style={styles.navTitle}>{categoryName || 'Expenses'}</Text>
          <Pressable
            style={[styles.exportBtn, (!filteredExpenses || filteredExpenses.length === 0) && { opacity: 0.3 }]}
            onPress={() => {
              if (!filteredExpenses || filteredExpenses.length === 0) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowExportModal(true);
            }}
            disabled={!filteredExpenses || filteredExpenses.length === 0}
          >
            <Ionicons name="share-outline" size={18} color="#FFF" />
          </Pressable>
        </View>
      </View>

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SectionList
          sections={sections}
          keyExtractor={(item) => item?.id || Math.random().toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 20 },
          ]}
          ListHeaderComponent={
            <SummaryBar
              category={category}
              spent={totalSpent}
              budgeted={totalBudgeted}
              count={(filteredExpenses || []).length}
              isAllCategories={isAllCategories}
              month={currentMonth}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No expenses found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || filter !== 'All'
                  ? 'Try adjusting your search or filters'
                  : `Your ${categoryName || 'expenses'} will appear here`}
              </Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
        />
      </KeyboardAvoidingView>

      <UndoSnackbar
        visible={showSnackbar}
        onUndo={handleUndo}
        onDismiss={() => { setShowSnackbar(false); setDeletedExpense(null); }}
        bottomInset={insets.bottom}
      />

      <ExportModal
        visible={showExportModal}
        onClose={() => { if (!exporting) setShowExportModal(false); }}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        loading={exporting}
        expenses={filteredExpenses}
        categoryName={categoryName || 'Expenses'}
        month={currentMonth}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: {
    fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 1,
  },
  navTitle: {
    fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.3,
  },
  exportBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },

  searchFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    padding: 0,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },

  summaryBar: { marginHorizontal: 16, marginBottom: 10, marginTop: 4 },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryHeaderText: { flex: 1 },
  summaryCatName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
  summaryCount: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.muted, marginTop: 1 },
  summaryStats: { flexDirection: 'row', marginBottom: 12 },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryStatLabel: {
    fontSize: 9, fontFamily: FONTS.semiBold, color: COLORS.muted,
    letterSpacing: 0.8, marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: 18, fontFamily: FONTS.bold, letterSpacing: -0.3,
  },
  summaryDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  summaryProgressTrack: {
    height: 5, backgroundColor: COLORS.border, borderRadius: 2.5, overflow: 'hidden',
  },
  summaryProgressFill: { height: '100%', borderRadius: 2.5 },
  overBudgetText: {
    marginTop: 6, fontSize: 11, fontFamily: FONTS.semiBold,
    color: COLORS.negative, textAlign: 'center',
  },

  listContent: { paddingTop: 4 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6,
  },
  sectionDate: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text },
  sectionTotal: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.muted },

  swipeWrapper: { marginHorizontal: 16, position: 'relative' },
  deleteReveal: {
    position: 'absolute', right: 4, top: 0, bottom: 0,
    width: DELETE_REVEAL, borderRadius: 16, overflow: 'hidden',
  },
  deleteBtn: {
    flex: 1, backgroundColor: COLORS.negative,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingRight: 4,
  },
  deleteBtnLabel: { fontSize: 10, fontFamily: FONTS.semiBold, color: '#FFF', marginTop: 2 },
  expenseCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 3, elevation: 1, overflow: 'hidden',
  },
  expenseRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  expenseLeft: { flex: 1, gap: 4 },
  expenseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expenseCategoryDot: { width: 8, height: 8, borderRadius: 4 },
  expenseNote: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text, flex: 1 },
  expenseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 16 },
  expenseTime: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.muted },
  expenseCategoryLabel: {
    fontSize: 10, fontFamily: FONTS.semiBold, color: COLORS.muted,
    backgroundColor: COLORS.inputBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    overflow: 'hidden',
  },
  expenseRight: { alignItems: 'flex-end', gap: 3 },
  expenseAmount: {
    fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.2,
  },
  editHintRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  editHint: { fontSize: 9, fontFamily: FONTS.semiBold, color: COLORS.muted },

  editForm: { padding: 14, gap: 10 },
  editAmountRow: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 6 },
  editCurrencyPrefix: {
    fontSize: 28, fontFamily: FONTS.bold, color: COLORS.muted,
    marginRight: 4, lineHeight: 36,
  },
  editAmountInput: {
    flex: 1, fontSize: 36, fontFamily: FONTS.bold,
    color: COLORS.text, letterSpacing: -1, padding: 0, lineHeight: 42,
  },
  editDivider: { height: 1, backgroundColor: COLORS.border },
  editNoteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.inputBg, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  editNoteInput: {
    flex: 1, fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text, padding: 0,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.inputBg, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted },
  saveBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  saveBtnText: { fontSize: 14, fontFamily: FONTS.bold, color: '#FFF' },

  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 50, paddingHorizontal: 40, gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 6 },
  emptySubtitle: {
    fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.muted,
    textAlign: 'center', lineHeight: 20,
  },

  snackbar: {
    position: 'absolute', left: 20, right: 20,
    backgroundColor: COLORS.accent, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 6, zIndex: 200,
  },
  snackbarText: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#FFF' },
  snackbarUndo: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.positive },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  exportSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 4, paddingBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 12,
  },
  exportHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginVertical: 12,
  },
  exportTitle: {
    fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text,
    paddingHorizontal: 20, marginBottom: 4,
  },
  exportSubtitle: {
    fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted,
    paddingHorizontal: 20, marginBottom: 16,
  },
  exportOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  exportOptionIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  exportOptionInfo: { flex: 1 },
  exportOptionLabel: {
    fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 2,
  },
  exportOptionDesc: {
    fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },
  exportDivider: {
    height: 1, backgroundColor: COLORS.border, marginHorizontal: 20,
  },
  exportCancelBtn: {
    marginHorizontal: 20, marginTop: 12,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.inputBg, alignItems: 'center',
  },
  exportCancelText: {
    fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },
});