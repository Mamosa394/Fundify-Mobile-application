// src/screens/Settings/NotificationSettingsScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { auth } from '../../services/firebase';
import {
  getUserProfile,
  updatePaydaySettings,
} from '../../services/budgetService';
import {
  schedulePaydayReminders,
  sendTestNotification,
  cancelAllReminders,
  getScheduledNotifications,
} from '../../services/notificationService';

const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  positive: '#34C759',
  accent: '#1C1C1E',
  border: '#E2E8F0',
  cardShadow: '#CBD5E1',
};

const FONTS = {
  bold: 'JosefinSans-Bold',
  semiBold: 'JosefinSans-SemiBold',
};

export default function NotificationSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [paydayDay, setPaydayDay] = useState(25);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profile = await getUserProfile(userId);
      if (profile?.paydayDay) {
        setPaydayDay(profile.paydayDay);
      }

      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
      setRemindersEnabled(scheduled.length > 0);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminders = async (value) => {
    setRemindersEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value) {
      await schedulePaydayReminders(paydayDay);
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
    } else {
      await cancelAllReminders();
      setScheduledCount(0);
    }
  };

  const handlePaydayChange = async (day) => {
    const dayNum = parseInt(day) || 25;
    const validDay = Math.min(31, Math.max(1, dayNum));
    
    setPaydayDay(validDay);

    if (remindersEnabled) {
      setSaving(true);
      try {
        await schedulePaydayReminders(validDay);
        const scheduled = await getScheduledNotifications();
        setScheduledCount(scheduled.length);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert('Error', 'Failed to update reminders');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleTestNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await sendTestNotification();
    Alert.alert('Test Sent', 'Check your notifications! A test reminder was sent.');
  };

  const paydayOptions = [1, 15, 25, 28, 30];

  return (
    <LinearGradient colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']} style={styles.background}>
      <StatusBar style="dark" />
      
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Reminders Toggle */}
        <View style={styles.card}>
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Payday Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get notified before payday to plan your spending
                  </Text>
                </View>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={handleToggleReminders}
                trackColor={{ false: '#E2E8F0', true: COLORS.positive }}
                thumbColor="#FFF"
              />
            </View>

            {remindersEnabled && (
              <View style={styles.reminderInfo}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.muted} />
                <Text style={styles.reminderInfoText}>
                  {scheduledCount} reminder{scheduledCount !== 1 ? 's' : ''} scheduled
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Payday Selection */}
        <Text style={styles.sectionTitle}>When do you get paid?</Text>
        
        <View style={styles.card}>
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
            <Text style={styles.cardLabel}>Payday Date</Text>
            
            <View style={styles.paydayOptions}>
              {paydayOptions.map((day) => (
                <Pressable
                  key={day}
                  style={[
                    styles.paydayChip,
                    paydayDay === day && styles.paydayChipSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handlePaydayChange(day);
                  }}
                >
                  <Text
                    style={[
                      styles.paydayChipText,
                      paydayDay === day && styles.paydayChipTextSelected,
                    ]}
                  >
                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.customPaydayRow}>
              <Text style={styles.customPaydayLabel}>Custom day:</Text>
              <TextInput
                style={styles.customPaydayInput}
                value={paydayDay.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text);
                  if (!isNaN(num)) handlePaydayChange(num);
                }}
                keyboardType="numeric"
                maxLength={2}
                placeholder="25"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Reminder Preview */}
        <Text style={styles.sectionTitle}>Reminder Messages</Text>
        
        <View style={styles.card}>
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
            <View style={styles.previewItem}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.previewDays}>5 days before</Text>
              </View>
              <Text style={styles.previewText}>
                💰 5 Days to Payday! You have R{'{remaining}'} left — make it count!
              </Text>
            </View>

            <View style={styles.previewDivider} />

            <View style={styles.previewItem}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.previewDays}>4 days before</Text>
              </View>
              <Text style={styles.previewText}>
                📊 Budget Check: R{'{remaining}'} to last 4 more days. That's R{'{daily}'}/day.
              </Text>
            </View>

            <View style={styles.previewDivider} />

            <View style={styles.previewItem}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewDot, { backgroundColor: COLORS.positive }]} />
                <Text style={styles.previewDays}>3 days before</Text>
              </View>
              <Text style={styles.previewText}>
                🏁 Almost there! R{'{remaining}'} left. Your top spend this month was {'{category}'}.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Test Button */}
        <Pressable
          style={({ pressed }) => [
            styles.testButton,
            pressed && styles.testButtonPressed,
          ]}
          onPress={handleTestNotification}
        >
          <LinearGradient
            colors={[COLORS.accent, '#2C2C2E']}
            style={styles.testButtonGradient}
          >
            <Ionicons name="notifications" size={20} color="#FFF" />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </LinearGradient>
        </Pressable>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.muted} />
          <Text style={styles.infoText}>
            Notifications will show your actual budget remaining when they're sent. Messages update dynamically based on your spending.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 24,
    marginLeft: 4,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  cardGradient: {
    padding: 20,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 12,
  },
  settingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  reminderInfoText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  paydayOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  paydayChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  paydayChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  paydayChipText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  paydayChipTextSelected: {
    color: '#FFF',
  },
  customPaydayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customPaydayLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  customPaydayInput: {
    width: 60,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewItem: {
    paddingVertical: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewDays: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  previewText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    lineHeight: 20,
    paddingLeft: 18,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  testButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  testButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  testButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  testButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    lineHeight: 20,
  },
});