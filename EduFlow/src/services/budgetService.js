// src/services/budgetService.js

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

// Budget Categories
export const BUDGET_CATEGORIES = [
  { id: 'food', name: 'Food & Groceries', icon: 'restaurant-outline', color: '#7DD3FC' },
  { id: 'transport', name: 'Transport', icon: 'bus-outline', color: '#C4B5FD' },
  { id: 'data', name: 'Data & Airtime', icon: 'wifi-outline', color: '#86EFAC' },
  { id: 'books', name: 'Books & Stationery', icon: 'book-outline', color: '#F9A8D4' },
  { id: 'entertainment', name: 'Entertainment', icon: 'game-controller-outline', color: '#FDBA74' },
  { id: 'accommodation', name: 'Accommodation', icon: 'home-outline', color: '#FDE047' },
  { id: 'health', name: 'Health & Wellness', icon: 'fitness-outline', color: '#FB923C' },
  { id: 'savings', name: 'Savings', icon: 'save-outline', color: '#34D399' },
  { id: 'other', name: 'Other Expenses', icon: 'apps-outline', color: '#9CA3AF' }
];

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Save user income information
 */
export const saveUserIncome = async (userId, incomeData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      income: incomeData.income,
      incomeType: incomeData.incomeType,
      extraIncome: incomeData.extraIncome,
      extraIncomeDescription: incomeData.extraIncomeDescription,
      totalIncome: incomeData.totalIncome,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('User income saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving user income:', error);
    throw error;
  }
};

/**
 * Save budget from wizard
 */
export const saveBudgetFromWizard = async (userId, budgetData) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgetRef = doc(db, 'users', userId, 'budgets', currentMonth);
    
    console.log('Saving budget from wizard with data:', JSON.stringify(budgetData.categories, null, 2));
    
    // Create categories object from budget data
    const categories = {};
    
    // Initialize all BUDGET_CATEGORIES with zero amounts
    BUDGET_CATEGORIES.forEach(cat => {
      let budgetedAmount = 0;
      
      // Check if this category has data from the wizard
      if (budgetData.categories) {
        // Try to find by BUDGET_CATEGORIES id
        if (budgetData.categories[cat.id] !== undefined) {
          budgetedAmount = Number(budgetData.categories[cat.id]) || 0;
        }
      }
      
      categories[cat.id] = {
        name: cat.name,
        spent: 0,
        budgeted: Math.round(budgetedAmount),
        color: cat.color,
        icon: cat.icon
      };
    });
    
    // Calculate total budget from categories
    const totalBudgeted = Object.values(categories).reduce((sum, cat) => sum + cat.budgeted, 0);
    const actualTotalBudget = budgetData.income || budgetData.totalBudget || totalBudgeted;
    
    const budgetDoc = {
      month: currentMonth,
      income: budgetData.income || actualTotalBudget,
      baseIncome: budgetData.baseIncome || 0,
      extraIncome: budgetData.extraIncome || 0,
      incomeType: budgetData.incomeType || '',
      totalBudget: actualTotalBudget,
      remainingBudget: actualTotalBudget,
      spentTotal: 0,
      categories: categories,
      strategy: budgetData.strategy || '',
      livingSituation: budgetData.livingSituation || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(budgetRef, budgetDoc);
    
    console.log('Budget saved successfully from wizard. Categories:');
    Object.entries(categories)
      .filter(([_, cat]) => cat.budgeted > 0)
      .forEach(([id, cat]) => {
        console.log(`  ${cat.name}: R${cat.budgeted}`);
      });
    
    return { id: currentMonth, ...budgetDoc };
  } catch (error) {
    console.error('Error saving budget from wizard:', error);
    throw error;
  }
};

/**
 * Initialize user budget for the month
 */
export const initializeUserBudget = async (userId, initialBalance, month = null) => {
  console.log('[BudgetService] Initializing budget for user:', userId);
  
  try {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const budgetRef = doc(db, 'users', userId, 'budgets', currentMonth);
    
    // Create budget categories with zero amounts initially
    const categories = {};
    BUDGET_CATEGORIES.forEach(cat => {
      categories[cat.id] = {
        name: cat.name,
        spent: 0,
        budgeted: 0,
        color: cat.color,
        icon: cat.icon
      };
    });
    
    const budgetData = {
      month: currentMonth,
      totalBudget: initialBalance,
      remainingBudget: initialBalance,
      spentTotal: 0,
      categories: categories,
      dailySafeSpend: Math.floor(initialBalance / 30),
      remainingDays: 30,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(budgetRef, budgetData);
    console.log('[BudgetService] Budget initialized for month:', currentMonth);
    
    // Create default expense categories in user settings
    const settingsRef = doc(db, 'users', userId, 'settings', 'budget');
    await setDoc(settingsRef, {
      categories: BUDGET_CATEGORIES,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { id: currentMonth, ...budgetData };
  } catch (error) {
    console.error('[BudgetService] Error initializing budget:', error);
    throw error;
  }
};

/**
 * Get current month's budget for user
 */
export const getCurrentBudget = async (userId) => {
  console.log('[BudgetService] Getting current budget for user:', userId);
  
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgetRef = doc(db, 'users', userId, 'budgets', currentMonth);
    const budgetDoc = await getDoc(budgetRef);
    
    if (!budgetDoc.exists()) {
      console.log('[BudgetService] No budget found for current month');
      return null;
    }
    
    const budget = { id: budgetDoc.id, ...budgetDoc.data() };
    console.log('[BudgetService] Budget retrieved successfully');
    return budget;
  } catch (error) {
    console.error('[BudgetService] Error getting budget:', error);
    throw error;
  }
};

/**
 * Get budget by specific month
 */
export const getBudgetByMonth = async (userId, month) => {
  console.log('[BudgetService] Getting budget for month:', month);
  
  try {
    const budgetRef = doc(db, 'users', userId, 'budgets', month);
    const budgetDoc = await getDoc(budgetRef);
    
    if (!budgetDoc.exists()) {
      return null;
    }
    
    return { id: budgetDoc.id, ...budgetDoc.data() };
  } catch (error) {
    console.error('[BudgetService] Error getting budget by month:', error);
    throw error;
  }
};

/**
 * Add an expense to a specific category
 */
export const addExpense = async (userId, expenseData) => {
  console.log('[BudgetService] Adding expense:', expenseData);
  
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Add expense to expenses subcollection
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const expenseRef = await addDoc(expensesRef, {
      ...expenseData,
      amount: Number(expenseData.amount),
      date: expenseData.date || new Date().toISOString().split('T')[0],
      month: currentMonth,
      createdAt: serverTimestamp()
    });
    
    // Update budget totals
    const budgetRef = doc(db, 'users', userId, 'budgets', currentMonth);
    const budgetDoc = await getDoc(budgetRef);
    
    if (budgetDoc.exists()) {
      const budget = budgetDoc.data();
      const categories = { ...budget.categories };
      const categoryId = expenseData.category;
      
      if (categories[categoryId]) {
        categories[categoryId].spent = (categories[categoryId].spent || 0) + Number(expenseData.amount);
      } else {
        // If category doesn't exist, create it
        const categoryInfo = BUDGET_CATEGORIES.find(c => c.id === categoryId);
        categories[categoryId] = {
          name: categoryInfo?.name || categoryId,
          spent: Number(expenseData.amount),
          budgeted: 0,
          color: categoryInfo?.color || '#9CA3AF',
          icon: categoryInfo?.icon || 'apps-outline'
        };
      }
      
      const newSpentTotal = (budget.spentTotal || 0) + Number(expenseData.amount);
      const newRemaining = budget.totalBudget - newSpentTotal;
      
      await updateDoc(budgetRef, {
        categories: categories,
        spentTotal: newSpentTotal,
        remainingBudget: newRemaining,
        updatedAt: serverTimestamp()
      });
      
      console.log('[BudgetService] Budget updated after expense');
    }
    
    console.log('[BudgetService] Expense added with ID:', expenseRef.id);
    return { id: expenseRef.id, ...expenseData };
  } catch (error) {
    console.error('[BudgetService] Error adding expense:', error);
    throw error;
  }
};

/**
 * Get all expenses for current month
 */
export const getExpenses = async (userId, month = null) => {
  console.log('[BudgetService] Getting expenses for user:', userId);
  
  try {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const q = query(
      expensesRef,
      where('month', '==', currentMonth)
      // Removing orderBy to avoid index error - sort on client side
    );
    
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort expenses by date on client side (newest first)
    expenses.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });
    
    console.log(`[BudgetService] Retrieved ${expenses.length} expenses`);
    return expenses;
  } catch (error) {
    console.error('[BudgetService] Error getting expenses:', error);
    throw error;
  }
};

/**
 * Update expense
 */
export const updateExpense = async (userId, expenseId, expenseData) => {
  console.log('[BudgetService] Updating expense:', expenseId);
  
  try {
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    const oldExpenseDoc = await getDoc(expenseRef);
    const oldExpense = oldExpenseDoc.data();
    
    await updateDoc(expenseRef, {
      ...expenseData,
      amount: Number(expenseData.amount),
      updatedAt: serverTimestamp()
    });
    
    // Recalculate budget totals (subtract old, add new)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgetRef = doc(db, 'users', userId, 'budgets', currentMonth);
    const budgetDoc = await getDoc(budgetRef);
    
    if (budgetDoc.exists()) {
      const budget = budgetDoc.data();
      const categories = { ...budget.categories };
      const categoryId = expenseData.category || oldExpense.category;
      
      // Remove old amount
      const amountDiff = Number(expenseData.amount) - Number(oldExpense.amount);
      
      if (categories[categoryId]) {
        categories[categoryId].spent = (categories[categoryId].spent || 0) + amountDiff;
      }
      
      const newSpentTotal = (budget.spentTotal || 0) + amountDiff;
      const newRemaining = budget.totalBudget - newSpentTotal;
      
      await updateDoc(budgetRef, {
        categories: categories,
        spentTotal: newSpentTotal,
        remainingBudget: newRemaining,
        updatedAt: serverTimestamp()
      });
    }
    
    console.log('[BudgetService] Expense updated successfully');
  } catch (error) {
    console.error('[BudgetService] Error updating expense:', error);
    throw error;
  }
};

/**
 * Delete expense
 */
export const deleteExpense = async (userId, expenseId) => {
  console.log('[BudgetService] Deleting expense:', expenseId);
  
  try {
    // Get expense details before deletion to adjust budget
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    const expenseDoc = await getDoc(expenseRef);
    const expense = expenseDoc.data();
    
    if (expense) {
      // Update budget by subtracting removed expense
      const currentMonth = new Date().toISOString().slice(0, 7);
      const budgetRef = doc(db, 'users', userId, 'budgets', currentMonth);
      const budgetDoc = await getDoc(budgetRef);
      
      if (budgetDoc.exists()) {
        const budget = budgetDoc.data();
        const categories = { ...budget.categories };
        const categoryId = expense.category;
        
        if (categories[categoryId]) {
          categories[categoryId].spent = Math.max(0, (categories[categoryId].spent || 0) - Number(expense.amount));
        }
        
        const newSpentTotal = Math.max(0, (budget.spentTotal || 0) - Number(expense.amount));
        const newRemaining = budget.totalBudget - newSpentTotal;
        
        await updateDoc(budgetRef, {
          categories: categories,
          spentTotal: newSpentTotal,
          remainingBudget: newRemaining,
          updatedAt: serverTimestamp()
        });
      }
    }
    
    await deleteDoc(expenseRef);
    console.log('[BudgetService] Expense deleted successfully');
  } catch (error) {
    console.error('[BudgetService] Error deleting expense:', error);
    throw error;
  }
};

/**
 * Update budget category budgeted amount
 */
export const updateCategoryBudget = async (userId, categoryId, budgetedAmount) => {
  console.log('[BudgetService] Updating category budget:', categoryId, budgetedAmount);
  
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgetRef = doc(db, 'users', userId, 'budgets', currentMonth);
    const budgetDoc = await getDoc(budgetRef);
    
    if (budgetDoc.exists()) {
      const budget = budgetDoc.data();
      const categories = { ...budget.categories };
      
      if (categories[categoryId]) {
        categories[categoryId].budgeted = Number(budgetedAmount);
      }
      
      await updateDoc(budgetRef, {
        categories: categories,
        updatedAt: serverTimestamp()
      });
      
      console.log('[BudgetService] Category budget updated');
    }
  } catch (error) {
    console.error('[BudgetService] Error updating category budget:', error);
    throw error;
  }
};

/**
 * Get spending insights
 */
export const getSpendingInsights = async (userId) => {
  console.log('[BudgetService] Getting spending insights');
  
  try {
    const currentBudget = await getCurrentBudget(userId);
    if (!currentBudget) return null;
    
    const expenses = await getExpenses(userId);
    
    // Calculate average spending by category
    const categorySpending = {};
    expenses.forEach(expense => {
      if (!categorySpending[expense.category]) {
        categorySpending[expense.category] = 0;
      }
      categorySpending[expense.category] += expense.amount;
    });
    
    // Find highest spending category
    let highestCategory = null;
    let highestAmount = 0;
    Object.entries(categorySpending).forEach(([category, amount]) => {
      if (amount > highestAmount) {
        highestAmount = amount;
        highestCategory = category;
      }
    });
    
    // Calculate daily average
    const daysInMonth = new Date().getDate();
    const dailyAverage = currentBudget.spentTotal / daysInMonth;
    const projectedTotal = dailyAverage * 30;
    const overUnder = projectedTotal - currentBudget.totalBudget;
    
    const insights = {
      highestSpendingCategory: highestCategory,
      highestSpendingAmount: highestAmount,
      dailyAverage: dailyAverage,
      projectedTotal: projectedTotal,
      overBudget: overUnder > 0,
      overBudgetAmount: Math.abs(overUnder),
      remainingDays: currentBudget.remainingDays,
      percentRemaining: (currentBudget.remainingBudget / currentBudget.totalBudget) * 100
    };
    
    console.log('[BudgetService] Spending insights generated');
    return insights;
  } catch (error) {
    console.error('[BudgetService] Error getting spending insights:', error);
    throw error;
  }
};

/**
 * Get expenses by category
 */
export const getExpensesByCategory = async (userId, categoryId, month = null) => {
  try {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const q = query(
      expensesRef,
      where('month', '==', currentMonth),
      where('category', '==', categoryId)
      // Removing orderBy to avoid index error
    );
    
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort on client side
    expenses.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });
    
    return expenses;
  } catch (error) {
    console.error('Error getting expenses by category:', error);
    throw error;
  }
};

/**
 * Get daily spending for current month
 */
export const getDailySpending = async (userId, month = null) => {
  try {
    const expenses = await getExpenses(userId, month);
    const dailyMap = new Map();
    
    expenses.forEach(expense => {
      const day = expense.date;
      if (!dailyMap.has(day)) {
        dailyMap.set(day, 0);
      }
      dailyMap.set(day, dailyMap.get(day) + expense.amount);
    });
    
    return Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount }));
  } catch (error) {
    console.error('Error getting daily spending:', error);
    throw error;
  }
};

/**
 * Update payday settings
 */
export const updatePaydaySettings = async (userId, paydayDay, remindersEnabled = true) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      paydayDay: paydayDay,
      remindersEnabled: remindersEnabled,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('Payday settings updated');
    return true;
  } catch (error) {
    console.error('Error updating payday settings:', error);
    throw error;
  }
};