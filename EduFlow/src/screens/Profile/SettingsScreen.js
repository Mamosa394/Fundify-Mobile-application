// src/screens/Profile/SettingsScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Moon, Sun, Globe, Volume2, Wifi, Trash2, ChevronRight } from 'lucide-react-native';

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  primary: '#475569',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  danger: '#DC2626',
  white: '#FFFFFF',
};

const SettingsScreen = ({ navigation }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSettings = [
    { key: 'darkMode', icon: Moon, label: 'Dark Mode', value: darkMode, setter: setDarkMode, color: COLORS.primary },
    { key: 'notifications', icon: Volume2, label: 'Notifications', value: notifications, setter: setNotifications, color: COLORS.warning },
    { key: 'autoSync', icon: Wifi, label: 'Auto Sync', value: autoSync, setter: setAutoSync, color: COLORS.success },
  ];

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'Cache cleared successfully.');
  };

  const handleResetApp = () => {
    Alert.alert('Reset App', 'Are you sure? This will clear all local data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => Alert.alert('Reset', 'App data has been reset.') },
    ]);
  };

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.card}>
          {toggleSettings.map((item, i) => (
            <View key={item.key} style={[styles.row, i < toggleSettings.length - 1 && styles.rowBorder]}>
              <View style={[styles.iconWrap, { backgroundColor: item.color + '12' }]}>
                <item.icon size={18} color={item.color} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Switch
                value={item.value}
                onValueChange={item.setter}
                trackColor={{ false: COLORS.textMuted, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>DATA</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleClearCache}>
            <View style={[styles.iconWrap, { backgroundColor: COLORS.warning + '12' }]}>
              <Trash2 size={18} color={COLORS.warning} />
            </View>
            <Text style={styles.rowLabel}>Clear Cache</Text>
            <ChevronRight size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleResetApp}>
            <View style={[styles.iconWrap, { backgroundColor: COLORS.danger + '12' }]}>
              <Trash2 size={18} color={COLORS.danger} />
            </View>
            <Text style={[styles.rowLabel, { color: COLORS.danger }]}>Reset App Data</Text>
            <ChevronRight size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  iconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
});

export default SettingsScreen;