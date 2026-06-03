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

const buildTrigger = (type, dateOrConfig, channelId = 'general') => {
  if (type === 'date') {
    const triggerDate = dateOrConfig || new Date(Date.now() + 1000);
    if (Platform.OS === 'ios') {
      return { type: 'date', date: triggerDate };
    }
    return { type: 'date', date: triggerDate, channelId };
  }
  if (type === 'daily') {
    if (Platform.OS === 'ios') {
      return { type: 'daily', hour: dateOrConfig.hour, minute: dateOrConfig.minute };
    }
    return { type: 'daily', hour: dateOrConfig.hour, minute: dateOrConfig.minute, channelId };
  }
  if (type === 'weekly') {
    if (Platform.OS === 'ios') {
      return { type: 'weekly', weekday: dateOrConfig.weekday, hour: dateOrConfig.hour, minute: dateOrConfig.minute };
    }
    return { type: 'weekly', weekday: dateOrConfig.weekday, hour: dateOrConfig.hour, minute: dateOrConfig.minute, channelId };
  }
  return { type: 'date', date: new Date(Date.now() + 1000) };
};

const buildContent = (title, body, data = {}, channelId = 'general') => ({
  title,
  body,
  data: { ...data },
  sound: 'default',
  badge: 1,
  ...(Platform.OS === 'android' && { channelId }),
  ...(Platform.OS === 'ios' && { _displayInForeground: true }),
});

export async function scheduleAssignmentReminder(assignmentTitle, dueDate, moduleName, interval = 'oneDay') {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const triggerDate = new Date(dueDate);
    let title = '';
    let body = '';

    switch (interval) {
      case 'week':
        triggerDate.setDate(triggerDate.getDate() - 7);
        title = 'Assignment Due in 1 Week';
        body = `${assignmentTitle} for ${moduleName} is due in 1 week.`;
        break;
      case 'threeDays':
        triggerDate.setDate(triggerDate.getDate() - 3);
        title = 'Assignment Due in 3 Days';
        body = `${assignmentTitle} for ${moduleName} is due in 3 days.`;
        break;
      case 'oneDay':
        triggerDate.setHours(triggerDate.getHours() - 24);
        title = 'Assignment Due Tomorrow';
        body = `${assignmentTitle} for ${moduleName} is due tomorrow.`;
        break;
      case 'due':
        triggerDate.setHours(8, 0, 0, 0);
        title = 'Assignment Due Today';
        body = `${assignmentTitle} for ${moduleName} is due today!`;
        break;
      default:
        triggerDate.setHours(triggerDate.getHours() - 24);
        title = 'Assignment Reminder';
        body = `${assignmentTitle} for ${moduleName} is due soon.`;
    }

    if (triggerDate <= new Date()) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: buildContent(title, body, { type: 'assignment_reminder', moduleName, assignmentTitle, interval }, 'assignment-reminders'),
      trigger: buildTrigger('date', triggerDate, 'assignment-reminders'),
    });

    console.log(`[Notifications] Assignment ${interval} reminder: ${assignmentTitle}`);
    return identifier;
  } catch (error) {
    console.error('[Notifications] Assignment reminder error:', error);
    return null;
  }
}

export async function sendNewAssignmentNotification(assignmentTitle, dueDate, moduleName, marksObtained, totalMarks) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });

    let body = `${assignmentTitle} added for ${moduleName}.\nDue: ${dueDateFormatted}`;
    if (totalMarks && totalMarks > 0) {
      body += `\nTotal Marks: ${totalMarks}`;
    }

    await Notifications.scheduleNotificationAsync({
      content: buildContent('New Assignment Added', body, { type: 'new_assignment', moduleName, assignmentTitle, dueDate, marksObtained, totalMarks }, 'assignment-reminders'),
      trigger: buildTrigger('date', new Date(Date.now() + 1000), 'assignment-reminders'),
    });

    console.log('[Notifications] New assignment notification sent:', assignmentTitle);
    return true;
  } catch (error) {
    console.error('[Notifications] New assignment notification error:', error);
    return false;
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
      content: buildContent('Upcoming Exam', `${assessmentTitle} for ${moduleName} is in 3 days.`, { type: 'exam_reminder', moduleName, assessmentTitle }, 'academic-alerts'),
      trigger: buildTrigger('date', triggerDate, 'academic-alerts'),
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
      content: buildContent('Exam Tomorrow', `${assessmentTitle} for ${moduleName} is tomorrow.`, { type: 'exam_reminder', moduleName, assessmentTitle }, 'academic-alerts'),
      trigger: buildTrigger('date', triggerDate, 'academic-alerts'),
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
      content: buildContent('GPA Alert',
        moduleName
          ? `${moduleName} grade dropped. GPA (${currentGPA.toFixed(1)}) below target (${targetGPA.toFixed(1)}).`
          : `GPA (${currentGPA.toFixed(1)}) below target (${targetGPA.toFixed(1)}).`,
        { type: 'gpa_alert', currentGPA, targetGPA, moduleName }, 'gpa-alerts'),
      trigger: buildTrigger('date', new Date(Date.now() + 1000), 'gpa-alerts'),
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
      content: buildContent(improved ? 'Grade Improved' : 'Grade Updated',
        `${moduleName}: ${oldGrade} -> ${newGrade}`,
        { type: 'grade_update', moduleName, oldGrade, newGrade }, 'academic-alerts'),
      trigger: buildTrigger('date', new Date(Date.now() + 1000), 'academic-alerts'),
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
      content: buildContent('Assignment Overdue',
        `${assignmentTitle} for ${moduleName} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.`,
        { type: 'overdue_alert', moduleName, assignmentTitle, daysOverdue }, 'assignment-reminders'),
      trigger: buildTrigger('date', new Date(Date.now() + 1000), 'assignment-reminders'),
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
      content: buildContent('Study Time', 'Start your day with focused study.', { type: 'daily_study' }, 'general'),
      trigger: buildTrigger('daily', { hour, minute }, 'general'),
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
      content: buildContent('Weekly Summary', 'Review your academic progress.', { type: 'weekly_summary' }, 'general'),
      trigger: buildTrigger('weekly', { weekday: 1, hour: 18, minute: 0 }, 'general'),
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
      content: buildContent(title, body, data, 'general'),
      trigger: buildTrigger('date', new Date(Date.now() + 1000), 'general'),
    });
    return true;
  } catch (error) {
    console.error('[Notifications] Custom error:', error);
    return false;
  }
}

export async function cancelNotification(identifier) {
  try { if (identifier) await Notifications.cancelScheduledNotificationAsync(identifier); } catch (error) {}
}

export async function cancelAllNotifications() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (error) {}
}

export async function cancelDailyReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'daily_study') await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch (error) {}
}

export async function cancelWeeklySummary() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'weekly_summary') await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch (error) {}
}

export async function getScheduledNotifications() {
  try { return await Notifications.getAllScheduledNotificationsAsync(); } catch (error) { return []; }
}

export async function sendTestNotification() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;
    await Notifications.scheduleNotificationAsync({
      content: buildContent('Test', 'Notifications working.', { type: 'test' }, 'general'),
      trigger: buildTrigger('date', new Date(Date.now() + 1000), 'general'),
    });
    return true;
  } catch (error) { return false; }
}

export function isRunningInExpoGo() { return isExpoGo; }

function getGradeValue(grade) {
  const v = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0 };
  return v[grade] || 0;
}

export function initNotificationListeners(navigation) {
  const fg = Notifications.addNotificationReceivedListener(n => console.log('[Notifications] Foreground:', n.request.content.title));
  const res = Notifications.addNotificationResponseReceivedListener(r => {
    const data = r.notification.request.content.data;
    if (navigation) {
      switch (data?.type) {
        case 'assignment_reminder':
        case 'overdue_alert':
        case 'new_assignment':
          navigation.navigate('Planner', { screen: 'AssignmentsTab' });
          break;
        case 'exam_reminder':
        case 'grade_update':
          navigation.navigate('Planner', { screen: 'CoursesTab' });
          break;
        case 'gpa_alert':
          navigation.navigate('Planner', { screen: 'GPATab' });
          break;
        default: break;
      }
    }
  });
  return () => { fg.remove(); res.remove(); };
}

export default {
  requestNotificationPermissions,
  createNotificationChannels,
  scheduleAssignmentReminder,
  sendNewAssignmentNotification,
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