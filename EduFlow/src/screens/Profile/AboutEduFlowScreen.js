// src/screens/Profile/AboutEduFlowScreen.js

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Star, Shield, Users, Zap } from 'lucide-react-native';

const COLORS = {
  bgStart: '#F8FAFC', bgMid: '#E2E8F0', bgEnd: '#CBD5E1',
  surface: '#FFFFFF', primary: '#475569', text: '#0F172A', textSecondary: '#64748B', white: '#FFFFFF',
};

const AboutEduFlowScreen = ({ navigation }) => (
  <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <ChevronLeft size={24} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>About EduFlow</Text>
      <View style={{ width: 40 }} />
    </View>
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.appName}>EduFlow</Text>
        <Text style={styles.version}>Version 1.0</Text>
        <Text style={styles.description}>
          Your complete academic companion. Track your GPA, manage assignments, plan assessments, and stay on top of your academic journey.
        </Text>
        <View style={styles.features}>
          {[
            { icon: Star, label: 'GPA Tracking', color: '#F59E0B' },
            { icon: Shield, label: 'Secure Data', color: '#059669' },
            { icon: Users, label: 'Student Focused', color: '#6366F1' },
            { icon: Zap, label: 'Real-time Analytics', color: '#DC2626' },
          ].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <f.icon size={20} color={f.color} />
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, alignItems: 'center' },
  appName: { fontSize: 28, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 4 },
  version: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted, marginBottom: 20 },
  description: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  featureItem: { alignItems: 'center', gap: 6, width: '45%', paddingVertical: 12 },
  featureLabel: { fontSize: 12, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
});

export default AboutEduFlowScreen;