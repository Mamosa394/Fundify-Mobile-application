// src/screens/Profile/HelpCenterScreen.js

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  BookOpen,
  FileText,
  ExternalLink,
} from 'lucide-react-native';

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surface: '#FFFFFF',
  primary: '#475569',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  accent: '#6366F1',
  white: '#FFFFFF',
};

const HelpCenterScreen = ({ navigation }) => {
  const helpItems = [
    { icon: BookOpen, label: 'Getting Started Guide', color: COLORS.primary, action: () => {} },
    { icon: FileText, label: 'FAQs', color: COLORS.accent, action: () => {} },
    { icon: MessageCircle, label: 'Live Chat', color: COLORS.success, action: () => {} },
    { icon: Mail, label: 'Email Support', color: COLORS.primary, action: () => Linking.openURL('mailto:support@eduflow.com') },
    { icon: Phone, label: 'Call Support', color: COLORS.warning, action: () => Linking.openURL('tel:+15551234567') },
  ];

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.banner}>
          <HelpCircle size={32} color={COLORS.accent} />
          <Text style={styles.bannerTitle}>How can we help?</Text>
          <Text style={styles.bannerText}>
            Find answers to common questions or reach out to our support team.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>SUPPORT OPTIONS</Text>
        <View style={styles.card}>
          {helpItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, i < helpItems.length - 1 && styles.rowBorder]}
              onPress={item.action}
              activeOpacity={0.6}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color + '12' }]}>
                <item.icon size={18} color={item.color} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <ExternalLink size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
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
});

export default HelpCenterScreen;