// src/hooks/useNotifications.js

import { useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { createNotificationChannels, scheduleDailyStudyReminder, scheduleWeeklySummary, initNotificationListeners } from '../services/notificationService';

export function useNotifications(navigation) {
  useEffect(() => {
    setupNotifications();
    
    const cleanup = initNotificationListeners(navigation);
    return () => cleanup();
  }, [navigation]);

  const setupNotifications = async () => {
    await createNotificationChannels();
    await scheduleDailyStudyReminder(8, 0);
    await scheduleWeeklySummary();
  };
}