// src/screens/Profile/EditProfileScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth } from 'firebase/auth';
import { ChevronLeft, Save, User2, Mail, School, CreditCard, Phone } from 'lucide-react-native';
import { fetchStudentProfile, updateStudentProfileData } from '../../services/profileService';

const COLORS = {
  bgStart: '#F8FAFC',
  bgMid: '#E2E8F0',
  bgEnd: '#CBD5E1',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  primary: '#475569',
  primaryDark: '#334155',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#059669',
  danger: '#DC2626',
  white: '#FFFFFF',
};

const EditProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    university: '',
    studentNumber: '',
    fundingType: '',
    phone: '',
  });

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await fetchStudentProfile(user.uid);
      if (data) {
        setFormData({
          name: data.name || '',
          email: data.email || user.email || '',
          university: data.university || '',
          studentNumber: data.studentNumber || '',
          fundingType: data.fundingType || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Name is required.');
      return;
    }

    setSaving(true);
    try {
      await updateStudentProfileData(user.uid, {
        name: formData.name.trim(),
        university: formData.university.trim(),
        studentNumber: formData.studentNumber.trim(),
        fundingType: formData.fundingType.trim(),
        phone: formData.phone.trim(),
      });
      Alert.alert('Success', 'Profile updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Save size={20} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>FULL NAME</Text>
          <View style={styles.inputRow}>
            <User2 size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.inputRow}>
            <Mail size={18} color={COLORS.textMuted} />
            <TextInput
              style={[styles.input, { color: COLORS.textMuted }]}
              value={formData.email}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>UNIVERSITY</Text>
          <View style={styles.inputRow}>
            <School size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              value={formData.university}
              onChangeText={(t) => setFormData({ ...formData, university: t })}
              placeholder="Enter university name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>STUDENT NUMBER</Text>
          <View style={styles.inputRow}>
            <CreditCard size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              value={formData.studentNumber}
              onChangeText={(t) => setFormData({ ...formData, studentNumber: t })}
              placeholder="Enter student number"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>FUNDING TYPE</Text>
          <View style={styles.inputRow}>
            <CreditCard size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              value={formData.fundingType}
              onChangeText={(t) => setFormData({ ...formData, fundingType: t })}
              placeholder="e.g., Bursary, Self-funded"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PHONE</Text>
          <View style={styles.inputRow}>
            <Phone size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(t) => setFormData({ ...formData, phone: t })}
              placeholder="Enter phone number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'JosefinSans-Bold', color: COLORS.text },
  saveBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 14, height: 50,
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
});

export default EditProfileScreen;