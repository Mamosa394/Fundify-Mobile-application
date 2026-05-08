import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, ScrollView, StyleSheet, Text, View, TextInput, 
  Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
// FIXED IMPORT - Make sure the path is correct
import { registerStudent } from '../../services/firebase';
import { ArrowLeft, ChevronDown, Check, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function SignupScreen({ onBack, onSignupComplete }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentNumber: '',
    university: '',
    fundingType: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uniModalVisible, setUniModalVisible] = useState(false);
  const [sponModalVisible, setSponModalVisible] = useState(false);
  
  const [strength, setStrength] = useState({ score: 0, label: '', color: '#cbd5e1' });

  const universities = ["National University of Lesotho (NUL)", "Limkokwing University (LUCT)", "Botho University", "Lerotholi Polytechnic", "Lesotho College of Education (LCE)", "CAS", "IDM Lesotho", "NHTC"];
  const fundingTypes = ["NMDS", "Self-Funded", "Bursary", "Scholarship"];

  useEffect(() => {
    const pass = form.password;
    let score = 0;
    if (pass.length > 0) score = 1;
    if (pass.length >= 6) score = 2;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score = 3;
    if (/[!@#$%^&*]/.test(pass) && pass.length >= 8) score = 4;

    const levels = [
      { label: '', color: '#cbd5e1' },
      { label: 'Weak', color: '#ef4444' },
      { label: 'Fair', color: '#f59e0b' },
      { label: 'Good', color: '#3b82f6' },
      { label: 'Strong', color: '#10b981' },
    ];
    setStrength(levels[score]);
  }, [form.password]);

  const handleSignup = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Please enter your full name');
      return;
    }
    if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Please enter a valid email address');
      return;
    }
    if (!form.studentNumber.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Please enter your student number');
      return;
    }
    if (!form.university) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Please select your university');
      return;
    }
    if (!form.fundingType) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Please select your funding type');
      return;
    }
    if (form.password.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError('Passwords do not match');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setLoading(true);
      setError('');

      console.log('[SignupScreen] Starting registration for:', form.email);
      console.log('[SignupScreen] Profile data:', {
        name: form.name.trim(),
        university: form.university,
        fundingType: form.fundingType,
        studentNumber: form.studentNumber.trim()
      });

      // Check if registerStudent is available
      if (typeof registerStudent !== 'function') {
        console.error('[SignupScreen] registerStudent is not a function. Available exports:', Object.keys({ registerStudent }));
        throw new Error('Firebase service not properly loaded');
      }

      const profileData = {
        name: form.name.trim(),
        studentNumber: form.studentNumber.trim(),
        university: form.university,
        fundingType: form.fundingType,
      };

      const userCredential = await registerStudent(
        form.email.trim(), 
        form.password, 
        profileData
      );
      
      console.log('[SignupScreen] Registration successful for UID:', userCredential.user.uid);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (onSignupComplete) {
        onSignupComplete(userCredential.user.uid);
      }

    } catch (err) {
      console.error('[SignupScreen] Registration error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters with letters and numbers.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else if (err.message && err.message.includes('permission-denied')) {
        setError('Database permission error. Please contact support.');
      } else {
        setError('Signup failed: ' + (err.message || 'Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const SelectionItem = ({ item, selectedValue, onSelect }) => (
    <Pressable 
      style={[styles.modalItem, selectedValue === item && styles.modalItemSelected]} 
      onPress={() => {
        Haptics.selectionAsync();
        onSelect(item);
      }}
    >
      <Text style={[styles.modalItemText, selectedValue === item && styles.modalItemTextSelected]}>
        {item}
      </Text>
      {selectedValue === item && <Check size={20} color="#334155" />}
    </Pressable>
  );

  return (
    <LinearGradient colors={['#e2e8f0', '#cbd5e1', '#94a3b8']} style={styles.background}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            
            <Pressable style={styles.backButton} onPress={onBack}>
              <ArrowLeft color="#4a616c" size={24} />
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.welcomeTitle}>Create{"\n"}Account</Text>
              <Text style={styles.welcomeSubtitle}>Join the EduFlow scholar community</Text>
            </View>

            <View style={styles.form}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Thabo Tlou" 
                  placeholderTextColor="#94a3b8" 
                  value={form.name} 
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>STUDENT NUMBER *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="2024XXXX" 
                  placeholderTextColor="#94a3b8" 
                  value={form.studentNumber} 
                  onChangeText={(text) => setForm({ ...form, studentNumber: text })}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>STUDENT EMAIL *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="youremail@gmail.com" 
                  placeholderTextColor="#94a3b8" 
                  value={form.email} 
                  onChangeText={(text) => setForm({ ...form, email: text })} 
                  autoCapitalize="none" 
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PASSWORD *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.rawInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={form.password}
                    onChangeText={(text) => setForm({ ...form, password: text })}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                  </Pressable>
                </View>
                
                {form.password.length > 0 && (
                  <View style={styles.strengthRow}>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${(strength.score / 4) * 100}%`, backgroundColor: strength.color }]} />
                    </View>
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.rawInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={form.confirmPassword}
                    onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                    {showConfirmPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>UNIVERSITY / COLLEGE *</Text>
                <Pressable style={styles.input} onPress={() => setUniModalVisible(true)} disabled={loading}>
                  <Text style={[styles.inputText, !form.university && { color: '#94a3b8' }]}>
                    {form.university || "Select Institution"}
                  </Text>
                  <ChevronDown size={20} color="#475569" />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FUNDING TYPE *</Text>
                <Pressable style={styles.input} onPress={() => setSponModalVisible(true)} disabled={loading}>
                  <Text style={[styles.inputText, !form.fundingType && { color: '#94a3b8' }]}>
                    {form.fundingType || "Select Funding Type"}
                  </Text>
                  <ChevronDown size={20} color="#475569" />
                </Pressable>
              </View>

              <Pressable onPress={handleSignup} disabled={loading}>
                <LinearGradient colors={loading ? ['#94a3b8', '#64748b'] : ['#4a616c', '#334155']} style={styles.signUpButton}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signUpButtonText}>Create Account</Text>}
                </LinearGradient>
              </Pressable>
            </View>

            <Modal visible={uniModalVisible} transparent animationType="fade" onRequestClose={() => setUniModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Choose University</Text>
                  <FlatList 
                    data={universities}
                    keyExtractor={(item) => item}
                    renderItem={({item}) => (
                      <SelectionItem 
                        item={item} 
                        selectedValue={form.university} 
                        onSelect={(val) => { setForm({...form, university: val}); setUniModalVisible(false); }} 
                      />
                    )}
                  />
                </View>
              </View>
            </Modal>

            <Modal visible={sponModalVisible} transparent animationType="fade" onRequestClose={() => setSponModalVisible(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Funding Type</Text>
                  <FlatList 
                    data={fundingTypes}
                    keyExtractor={(item) => item}
                    renderItem={({item}) => (
                      <SelectionItem 
                        item={item} 
                        selectedValue={form.fundingType} 
                        onSelect={(val) => { setForm({...form, fundingType: val}); setSponModalVisible(false); }} 
                      />
                    )}
                  />
                </View>
              </View>
            </Modal>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContainer: { paddingHorizontal: 32, paddingTop: 20, paddingBottom: 40 },
  backButton: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.5)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#ffffff' },
  header: { marginBottom: 30 },
  welcomeTitle: { fontSize: 44, color: '#1e293b', fontWeight: 'bold', lineHeight: 48 },
  welcomeSubtitle: { fontSize: 17, color: '#64748b', fontWeight: '600', marginTop: 8 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.77)', height: 60, borderRadius: 22, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#ffffff' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.77)', borderRadius: 22, borderWidth: 1.5, borderColor: '#ffffff', height: 60, overflow: 'hidden' },
  rawInput: { flex: 1, paddingHorizontal: 20, height: '100%', fontSize: 15, color: '#1e293b', fontWeight: '600' },
  eyeIcon: { paddingHorizontal: 15, height: 60, justifyContent: 'center' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 5 },
  barBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginRight: 10 },
  barFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 10, fontWeight: 'bold', width: 40 },
  inputText: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  signUpButton: { height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  signUpButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: '#ef4444', textAlign: 'center', fontWeight: 'bold', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#f1f5f9', borderRadius: 30, padding: 25, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 20, textAlign: 'center' },
  modalItem: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalItemSelected: { backgroundColor: 'rgba(255,255,255,0.8)' },
  modalItemText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  modalItemTextSelected: { color: '#1e293b' },
});