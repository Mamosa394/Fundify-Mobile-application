// src/screens/Profile/NotificationsScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Bell, BellOff, Mail, MessageCircle, Calendar } from 'lucide-react-native';

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surface: '#FFFFFF',
  primary: '#475569',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#059669',
  white: '#FFFFFF',
};

const NotificationsScreen = ({ navigation }) => {
  const [preferences, setPreferences] = useState({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    assignmentReminders: true,
    gradeAlerts: true,
    deadlineReminders: true,
  });

  const toggleSwitch = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notificationItems = [
    { key: 'pushEnabled', icon: Bell, label: 'Push Notifications', color: COLORS.primary },
    { key: 'emailEnabled', icon: Mail, label: 'Email Notifications', color: COLORS.textSecondary },
    { key: 'assignmentReminders', icon: Calendar, label: 'Assignment Reminders', color: COLORS.success },
    { key: 'gradeAlerts', icon: Bell, label: 'Grade Alerts', color: COLORS.warning },
    { key: 'deadlineReminders', icon: Calendar, label: 'Deadline Reminders', color: COLORS.danger },
  ];

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.card}>
          {notificationItems.map((item, i) => (
            <View key={item.key} style={[styles.row, i < notificationItems.length - 1 && styles.rowBorder]}>
              <View style={[styles.iconWrap, { backgroundColor: item.color + '12' }]}>
                <item.icon size={18} color={item.color} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Switch
                value={preferences[item.key]}
                onValueChange={() => toggleSwitch(item.key)}
                trackColor={{ false: COLORS.textMuted, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
});

export default NotificationsScreen;