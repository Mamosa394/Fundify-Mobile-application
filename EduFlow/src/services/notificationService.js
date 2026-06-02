// src/services/notificationService.js

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification handler for foreground messages
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // Set to false to avoid badge issues in Expo Go
  }),
});

// ============ HELPER FUNCTIONS ============

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions() {
  // Allow permission request even in Expo Go for local notifications
  if (!Device.isDevice && Platform.OS === 'android') {
    console.log('Running on Android emulator - notifications may be limited');
    // Still try to request permissions on emulator
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    if (isExpoGo) {
      console.log('Note: Expo Go has limited notification support');
    }
    return false;
  }

  return true;
}

/**
 * Schedule a payday reminder notification (Local Only)
 * @param {number} daysUntilPayday - Days until payday (1-5)
 * @param {number} remainingBudget - Remaining budget in Rands
 * @param {string} topCategory - The top spending category
 */
export async function schedulePaydayReminder(daysUntilPayday, remainingBudget, topCategory = null) {
  if (daysUntilPayday < 1 || daysUntilPayday > 5) {
    console.log('Only scheduling reminders for 1-5 days before payday');
    return null;
  }

  try {
    // Cancel existing notifications for this day to avoid duplicates
    await cancelPaydayReminder(daysUntilPayday);

    const dailyAllowance = Math.floor(remainingBudget / daysUntilPayday);
    
    let title = '';
    let body = '';
    
    switch (daysUntilPayday) {
      case 5:
        title = '💰 5 Days Until Payday!';
        body = `You have ${formatMoney(remainingBudget)} left — make it count!`;
        break;
      case 4:
        title = '📊 Budget Check';
        body = `${formatMoney(remainingBudget)} to last 4 more days. That's ${formatMoney(dailyAllowance)}/day.`;
        break;
      case 3:
        title = '🏁 Almost There!';
        if (topCategory) {
          body = `${formatMoney(remainingBudget)} left. Your top spend this month was ${topCategory}.`;
        } else {
          body = `${formatMoney(remainingBudget)} left — you've got this!`;
        }
        break;
      case 2:
        title = '⚡ 2 Days to Go!';
        body = `You have ${formatMoney(remainingBudget)} remaining. Spend wisely!`;
        break;
      case 1:
        title = '🎉 Payday Tomorrow!';
        body = `Your allowance arrives tomorrow! Last day with ${formatMoney(remainingBudget)} left.`;
        break;
      default:
        title = '💰 Payday Reminder';
        body = `${daysUntilPayday} days until payday. You have ${formatMoney(remainingBudget)} remaining.`;
    }

    // Calculate trigger date
    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + daysUntilPayday);
    triggerDate.setHours(9, 0, 0, 0); // 9 AM notification

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          type: 'payday_reminder', 
          daysUntilPayday,
          remainingBudget,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH || 'high',
      },
      trigger: {
        date: triggerDate,
        channelId: 'payday-reminders', // Add channel ID for Android
      },
    });

    console.log(`✅ Scheduled payday reminder for ${daysUntilPayday} days from now (${triggerDate.toLocaleDateString()})`);
    
    if (isExpoGo) {
      console.log('⚠️ Note: Running in Expo Go - notifications may have limitations');
    }
    
    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Schedule all payday reminders for a given payday date
 * @param {number} paydayDay - Day of month (1-31)
 * @param {number} remainingBudget - Current remaining budget
 * @param {string} topCategory - Top spending category
 */
export async function scheduleAllPaydayReminders(paydayDay, remainingBudget, topCategory = null) {
  try {
    // Cancel all existing payday reminders first
    await cancelAllPaydayReminders();
    
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    let daysUntilPayday;
    if (currentDay <= paydayDay) {
      daysUntilPayday = paydayDay - currentDay;
    } else {
      daysUntilPayday = (daysInMonth - currentDay) + paydayDay;
    }
    
    console.log(`Payday is in ${daysUntilPayday} days`);
    
    // Schedule reminders for the current month's payday
    if (daysUntilPayday <= 5 && daysUntilPayday > 0) {
      await schedulePaydayReminder(daysUntilPayday, remainingBudget, topCategory);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to schedule payday reminders:', error);
    return false;
  }
}

/**
 * Cancel a specific payday reminder
 */
export async function cancelPaydayReminder(daysUntilPayday) {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === 'payday_reminder' && 
          notification.content.data?.daysUntilPayday === daysUntilPayday) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Cancelled reminder for ${daysUntilPayday} days before payday`);
      }
    }
  } catch (error) {
    console.error('Failed to cancel reminder:', error);
  }
}

/**
 * Cancel all payday reminders
 */
export async function cancelAllPaydayReminders() {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === 'payday_reminder' || 
          notification.content.data?.type === 'payday_planning') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    
    console.log('Cancelled all payday reminders');
  } catch (error) {
    console.error('Failed to cancel reminders:', error);
  }
}

/**
 * Send a test notification immediately
 */
export async function sendTestNotification() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please enable notifications to receive test alerts.');
      return false;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Test Notification',
        body: isExpoGo 
          ? 'Your payday reminder system is working! (Local notification in Expo Go)'
          : 'Your payday reminder system is working!',
        data: { type: 'test' },
        sound: true,
      },
      trigger: null, // Send immediately
    });
    
    console.log('Test notification sent');
    
    if (isExpoGo) {
      Alert.alert(
        'Test Sent',
        'Check your notifications. Note: Expo Go has limited notification support. For full features, use a development build.'
      );
    } else {
      Alert.alert('Test Sent', 'Check your notification panel!');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    Alert.alert('Error', 'Failed to send test notification. Please check your notification settings.');
    return false;
  }
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Scheduled notifications:', notifications);
    return notifications;
  } catch (error) {
    console.error('Failed to get scheduled notifications:', error);
    return [];
  }
}

/**
 * Update payday reminders when settings change
 * @param {number} newPaydayDay - New payday day of month
 * @param {number} remainingBudget - Current remaining budget
 * @param {string} topCategory - Top spending category
 */
export async function updatePaydayReminders(newPaydayDay, remainingBudget, topCategory = null) {
  try {
    // Cancel all existing
    await cancelAllPaydayReminders();
    
    // Schedule new ones
    if (newPaydayDay && newPaydayDay > 0 && newPaydayDay <= 31) {
      await scheduleAllPaydayReminders(newPaydayDay, remainingBudget, topCategory);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to update payday reminders:', error);
    return false;
  }
}

/**
 * Check if we're running in Expo Go
 */
export function isRunningInExpoGo() {
  return isExpoGo;
}

/**
 * Format money for notification text
 */
function formatMoney(amount) {
  return `R${Math.round(amount || 0).toLocaleString('en-ZA')}`;
}

// ============ NOTIFICATION LISTENER SETUP ============

let notificationListener = null;
let responseListener = null;

/**
 * Initialize notification listeners
 * @param {Function} onNotificationTap - Callback when notification is tapped
 */
export function initNotificationListeners(onNotificationTap = null) {
  // This listener is called whenever a notification is received while the app is foregrounded
  notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  // This listener is called when a notification is tapped on
  responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const { data } = response.notification.request.content;
    console.log('Notification tapped:', data);
    
    if (onNotificationTap) {
      onNotificationTap(data);
    }
  });
  
  return () => {
    removeNotificationListeners();
  };
}

/**
 * Remove notification listeners
 */
export function removeNotificationListeners() {
  if (notificationListener) {
    Notifications.removeNotificationSubscription(notificationListener);
  }
  if (responseListener) {
    Notifications.removeNotificationSubscription(responseListener);
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled() {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.status === 'granted';
  } catch (error) {
    console.error('Failed to check notification permissions:', error);
    return false;
  }
}

/**
 * Create notification channels for Android (Android 8+)
 */
export async function createNotificationChannels() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('payday-reminders', {
        name: 'Payday Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#34C759',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
      
      console.log('Notification channel created');
    } catch (error) {
      console.error('Failed to create notification channel:', error);
    }
  }
}