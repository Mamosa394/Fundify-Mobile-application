// src/services/notificationService.js

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { updatePaydaySettings, getCurrentBudget } from './budgetService';
import { auth } from './firebase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permissions with a friendly explanation
export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.log('Must use physical device for notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return false;
  }

  return true;
};

// Schedule payday reminders
export const schedulePaydayReminders = async (paydayDay) => {
  try {
    // Cancel existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Save payday preference
    await updatePaydaySettings(userId, paydayDay);

    // Get current budget for dynamic messages
    const budget = await getCurrentBudget(userId);
    const remaining = budget?.remainingBudget || 0;
    const topCategory = getTopSpendingCategory(budget);

    // Schedule notifications for 5, 4, and 3 days before payday
    const notificationDays = [5, 4, 3];

    for (const daysBefore of notificationDays) {
      const triggerDate = getTriggerDate(paydayDay, daysBefore);
      
      if (triggerDate > new Date()) {
        const dailyAllowance = daysBefore > 0 ? Math.round(remaining / daysBefore) : remaining;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: getNotificationTitle(daysBefore),
            body: getNotificationBody(daysBefore, remaining, dailyAllowance, topCategory),
            data: { type: 'payday_reminder', daysBefore },
          },
          trigger: {
            type: 'date',
            date: triggerDate,
          },
        });

        console.log(`Scheduled ${daysBefore}-day reminder for ${triggerDate.toISOString()}`);
      }
    }

    console.log('Payday reminders scheduled successfully');
  } catch (error) {
    console.error('Failed to schedule payday reminders:', error);
    throw error;
  }
};

// Helper functions
const getTriggerDate = (paydayDay, daysBefore) => {
  const today = new Date();
  const currentDay = today.getDate();
  
  let paydayDate;
  if (currentDay <= paydayDay) {
    paydayDate = new Date(today.getFullYear(), today.getMonth(), paydayDay);
  } else {
    // Payday is next month
    paydayDate = new Date(today.getFullYear(), today.getMonth() + 1, paydayDay);
  }
  
  // Set to 9 AM
  paydayDate.setDate(paydayDate.getDate() - daysBefore);
  paydayDate.setHours(9, 0, 0, 0);
  
  return paydayDate;
};

const getTopSpendingCategory = (budget) => {
  if (!budget?.categories) return 'Food';
  
  let maxSpent = 0;
  let topCategory = 'Food';
  
  Object.entries(budget.categories).forEach(([id, cat]) => {
    if (cat.spent > maxSpent) {
      maxSpent = cat.spent;
      topCategory = cat.name;
    }
  });
  
  return topCategory;
};

const getNotificationTitle = (daysBefore) => {
  switch (daysBefore) {
    case 5: return '💰 5 Days to Payday!';
    case 4: return '📊 Budget Check';
    case 3: return '🏁 Almost There!';
    default: return 'Budget Reminder';
  }
};

const getNotificationBody = (daysBefore, remaining, dailyAllowance, topCategory) => {
  switch (daysBefore) {
    case 5:
      return `You have R${remaining.toLocaleString('en-ZA')} left — make it count!`;
    case 4:
      return `R${remaining.toLocaleString('en-ZA')} to last ${daysBefore} more days. That's R${dailyAllowance}/day.`;
    case 3:
      return `R${remaining.toLocaleString('en-ZA')} left. Your top spend this month was ${topCategory}.`;
    default:
      return `Check your budget for the upcoming payday.`;
  }
};

// Test notification (for settings screen)
export const sendTestNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧪 Test Notification',
      body: 'Your payday reminders are working! You\'ll get alerts 5, 4, and 3 days before payday.',
      data: { type: 'test' },
    },
    trigger: {
      type: 'timeInterval',
      seconds: 2,
    },
  });
};

// Cancel all reminders
export const cancelAllReminders = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('All payday reminders cancelled');
};

// Get scheduled notification count
export const getScheduledNotifications = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled;
};