// src/services/notificationService.js

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldVibrate: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission denied');
    return false;
  }

  return true;
}

export async function createNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('academic-alerts', {
      name: 'Academic Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#475569',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('assignment-reminders', {
      name: 'Assignment Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('gpa-alerts', {
      name: 'GPA Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('general', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
      sound: 'default',
    });
  }
}

const buildNotificationContent = (title, body, data = {}, channelType = 'general') => ({
  title,
  body,
  data: { ...data },
  sound: 'default',
  badge: 1,
  ...(Platform.OS === 'android' && { channelId: channelType }),
  ...(Platform.OS === 'ios' && {
    _displayInForeground: true,
    interruptionLevel: 'time-sensitive',
  }),
});

export async function scheduleAssignmentReminder(assignmentTitle, dueDate, moduleName) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const triggerDate = new Date(dueDate);
    triggerDate.setHours(triggerDate.getHours() - 24);

    if (triggerDate <= new Date()) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(
        'Assignment Due Tomorrow',
        `${assignmentTitle} for ${moduleName} is due tomorrow.`,
        { type: 'assignment_reminder', moduleName, assignmentTitle },
        'assignment-reminders'
      ),
      trigger: {
        type: 'date',
        date: triggerDate,
        ...(Platform.OS === 'android' && { channelId: 'assignment-reminders' }),
      },
    });

    console.log('[Notifications] Assignment reminder scheduled');
    return identifier;
  } catch (error) {
    console.error('[Notifications] Assignment error:', error);
    return null;
  }
}

export async function scheduleExamReminder(assessmentTitle, examDate, moduleName) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const triggerDate = new Date(examDate);
    triggerDate.setDate(triggerDate.getDate() - 3);

    if (triggerDate <= new Date()) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(
        'Upcoming Exam',
        `${assessmentTitle} for ${moduleName} is in 3 days.`,
        { type: 'exam_reminder', moduleName, assessmentTitle },
        'academic-alerts'
      ),
      trigger: {
        type: 'date',
        date: triggerDate,
        ...(Platform.OS === 'android' && { channelId: 'academic-alerts' }),
      },
    });

    console.log('[Notifications] Exam reminder scheduled');
    return identifier;
  } catch (error) {
    console.error('[Notifications] Exam error:', error);
    return null;
  }
}

export async function scheduleExamDayReminder(assessmentTitle, examDate, moduleName) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const triggerDate = new Date(examDate);
    triggerDate.setDate(triggerDate.getDate() - 1);
    triggerDate.setHours(7, 0, 0, 0);

    if (triggerDate <= new Date()) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(
        'Exam Tomorrow',
        `${assessmentTitle} for ${moduleName} is tomorrow.`,
        { type: 'exam_reminder', moduleName, assessmentTitle },
        'academic-alerts'
      ),
      trigger: {
        type: 'date',
        date: triggerDate,
        ...(Platform.OS === 'android' && { channelId: 'academic-alerts' }),
      },
    });

    console.log('[Notifications] Exam day reminder scheduled');
    return identifier;
  } catch (error) {
    console.error('[Notifications] Exam day error:', error);
    return null;
  }
}

export async function sendGPAAlert(currentGPA, targetGPA, moduleName) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission || currentGPA >= targetGPA) return null;

    await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(
        'GPA Alert',
        moduleName
          ? `${moduleName} grade dropped. GPA (${currentGPA.toFixed(1)}) below target (${targetGPA.toFixed(1)}).`
          : `GPA (${currentGPA.toFixed(1)}) below target (${targetGPA.toFixed(1)}).`,
        { type: 'gpa_alert', currentGPA, targetGPA, moduleName },
        'gpa-alerts'
      ),
      trigger: { type: 'date', date: new Date() },
    });

    console.log('[Notifications] GPA alert sent');
    return true;
  } catch (error) {
    console.error('[Notifications] GPA alert error:', error);
    return false;
  }
}

export async function sendGradeUpdateNotification(moduleName, oldGrade, newGrade) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission || oldGrade === newGrade) return null;

    const improved = getGradeValue(newGrade) > getGradeValue(oldGrade);

    await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(
        improved ? 'Grade Improved' : 'Grade Updated',
        `${moduleName}: ${oldGrade} -> ${newGrade}`,
        { type: 'grade_update', moduleName, oldGrade, newGrade },
        'academic-alerts'
      ),
      trigger: { type: 'date', date: new Date() },
    });

    console.log('[Notifications] Grade update sent');
    return true;
  } catch (error) {
    console.error('[Notifications] Grade update error:', error);
    return false;
  }
}

export async function sendOverdueNotification(assignmentTitle, moduleName, daysOverdue) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(
        'Assignment Overdue',
        `${assignmentTitle} for ${moduleName} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.`,
        { type: 'overdue_alert', moduleName, assignmentTitle, daysOverdue },
        'assignment-reminders'
      ),
      trigger: { type: 'date', date: new Date() },
    });

    console.log('[Notifications] Overdue sent');
    return true;
  } catch (error) {
    console.error('[Notifications] Overdue error:', error);
    return false;
  }
}

export async function scheduleDailyStudyReminder(hour = 8, minute = 0) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    await cancelDailyReminders();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(
        'Study Time',
        'Start your day with focused study.',
        { type: 'daily_study' },
        'general'
      ),
      trigger: {
        type: 'daily',
        hour,
        minute,
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
    });

    console.log('[Notifications] Daily study scheduled');
    return identifier;
  } catch (error) {
    console.error('[Notifications] Daily study error:', error);
    return null;
  }
}

export async function scheduleWeeklySummary() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    await cancelWeeklySummary();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(
        'Weekly Summary',
        'Review your academic progress for this week.',
        { type: 'weekly_summary' },
        'general'
      ),
      trigger: {
        type: 'weekly',
        weekday: 1,
        hour: 18,
        minute: 0,
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
    });

    console.log('[Notifications] Weekly summary scheduled');
    return identifier;
  } catch (error) {
    console.error('[Notifications] Weekly summary error:', error);
    return null;
  }
}

export async function sendCustomNotification(title, body, data = {}) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(title, body, data, 'general'),
      trigger: { type: 'date', date: new Date() },
    });

    console.log('[Notifications] Custom sent');
    return true;
  } catch (error) {
    console.error('[Notifications] Custom error:', error);
    return false;
  }
}

export async function cancelNotification(identifier) {
  try {
    if (identifier) await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('[Notifications] Cancel error:', error);
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Cancel all error:', error);
  }
}

export async function cancelDailyReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'daily_study') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (error) {
    console.error('[Notifications] Cancel daily error:', error);
  }
}

export async function cancelWeeklySummary() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'weekly_summary') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (error) {
    console.error('[Notifications] Cancel weekly error:', error);
  }
}

export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    return [];
  }
}

export async function sendTestNotification() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Enable notifications in Settings.');
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent('Test', 'Notifications working.', { type: 'test' }, 'general'),
      trigger: { type: 'date', date: new Date() },
    });

    return true;
  } catch (error) {
    return false;
  }
}

export function isRunningInExpoGo() {
  return isExpoGo;
}

function getGradeValue(grade) {
  const values = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0 };
  return values[grade] || 0;
}

export function initNotificationListeners(navigation) {
  const fg = Notifications.addNotificationReceivedListener(n => console.log('[Notifications] Foreground:', n.request.content.title));
  const res = Notifications.addNotificationResponseReceivedListener(r => {
    const data = r.notification.request.content.data;
    if (navigation) {
      switch (data?.type) {
        case 'assignment_reminder':
        case 'overdue_alert':
          navigation.navigate('Planner', { screen: 'AssignmentsTab' });
          break;
        case 'exam_reminder':
        case 'grade_update':
          navigation.navigate('Planner', { screen: 'CoursesTab' });
          break;
        case 'gpa_alert':
          navigation.navigate('Planner', { screen: 'GPATab' });
          break;
        default:
          break;
      }
    }
  });
  return () => { fg.remove(); res.remove(); };
}

export default {
  requestNotificationPermissions,
  createNotificationChannels,
  scheduleAssignmentReminder,
  scheduleExamReminder,
  scheduleExamDayReminder,
  sendGPAAlert,
  sendGradeUpdateNotification,
  sendOverdueNotification,
  scheduleDailyStudyReminder,
  scheduleWeeklySummary,
  sendCustomNotification,
  cancelNotification,
  cancelAllNotifications,
  cancelDailyReminders,
  cancelWeeklySummary,
  getScheduledNotifications,
  sendTestNotification,
  isRunningInExpoGo,
  initNotificationListeners,
};