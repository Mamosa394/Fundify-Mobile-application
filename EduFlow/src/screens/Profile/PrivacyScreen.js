// src/screens/Profile/PrivacyScreen.js

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Shield, Eye, Lock, Database, Trash2 } from 'lucide-react-native';

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surface: '#FFFFFF',
  primary: '#475569',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  danger: '#DC2626',
  white: '#FFFFFF',
};

const PrivacyScreen = ({ navigation }) => {
  const privacyItems = [
    { icon: Eye, label: 'Profile Visibility', value: 'Public', color: COLORS.primary },
    { icon: Lock, label: 'Data Encryption', value: 'Enabled', color: COLORS.success },
    { icon: Database, label: 'Data Storage', value: 'Firebase Secure', color: COLORS.primary },
    { icon: Trash2, label: 'Delete Account', value: 'Request', color: COLORS.danger },
  ];

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.banner}>
          <Shield size={32} color={COLORS.primary} />
          <Text style={styles.bannerTitle}>Your Data is Secure</Text>
          <Text style={styles.bannerText}>
            All your academic data is encrypted and stored securely. Only you have access to your information.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>SETTINGS</Text>
        <View style={styles.card}>
          {privacyItems.map((item, i) => (
            <View key={item.label} style={[styles.row, i < privacyItems.length - 1 && styles.rowBorder]}>
              <View style={[styles.iconWrap, { backgroundColor: item.color + '12' }]}>
                <item.icon size={18} color={item.color} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={[styles.rowValue, { color: item.color }]}>{item.value}</Text>
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
  banner: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, alignItems: 'center',
    marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  bannerTitle: { fontSize: 18, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginTop: 12, marginBottom: 8 },
  bannerText: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
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
  rowValue: { fontSize: 13, fontFamily: 'JosefinSans-Bold' },
});

export default PrivacyScreen;