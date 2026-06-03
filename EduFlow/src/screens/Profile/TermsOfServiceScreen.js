// src/screens/Profile/TermsOfServiceScreen.js

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';

const COLORS = {
  bgStart: '#F8FAFC', bgMid: '#E2E8F0', bgEnd: '#CBD5E1',
  surface: '#FFFFFF', primary: '#475569', text: '#0F172A', textSecondary: '#64748B', white: '#FFFFFF',
};

const TermsOfServiceScreen = ({ navigation }) => (
  <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <ChevronLeft size={24} color={COLORS.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Terms of Service</Text>
      <View style={{ width: 40 }} />
    </View>
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>By using EduFlow, you agree to these terms of service. If you do not agree, please do not use the application.</Text>
        
        <Text style={styles.sectionTitle}>2. User Accounts</Text>
        <Text style={styles.body}>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information when creating your account.</Text>
        
        <Text style={styles.sectionTitle}>3. Academic Data</Text>
        <Text style={styles.body}>EduFlow stores your academic data securely. You retain ownership of your data and can request deletion at any time.</Text>
        
        <Text style={styles.sectionTitle}>4. Acceptable Use</Text>
        <Text style={styles.body}>You agree not to misuse the application, including unauthorized access, data scraping, or any activity that disrupts the service.</Text>
        
        <Text style={styles.sectionTitle}>5. Changes to Terms</Text>
        <Text style={styles.body}>We reserve the right to update these terms. Continued use after changes constitutes acceptance of the new terms.</Text>
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
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20 },
  sectionTitle: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  body: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, lineHeight: 22, marginBottom: 8 },
});

export default TermsOfServiceScreen;