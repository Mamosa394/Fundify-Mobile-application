// src/screens/Profile/ProfileScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import {
  User2,
  Camera,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Star,
  Bell,
  FileText,
  Share2,
  Award,
  GraduationCap,
  School,
  CreditCard,
  Settings,
  Shield,
} from 'lucide-react-native';
import {
  fetchStudentProfile,
  compressProfileImage,
  saveProfileImageLocally,
  getLocalProfilePath,
  deleteProfileImage,
} from '../../services/profileService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  warning: '#D97706',
  danger: '#DC2626',
  accent: '#6366F1',
  white: '#FFFFFF',
};

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      if (!user) return;
      const data = await fetchStudentProfile(user.uid);
      if (data) {
        setUserData(data);
        if (data.profileImageLocal) {
          setProfileImage(data.profileImageLocal);
        } else if (data.profileImage) {
          const localPath = await getLocalProfilePath(user.uid);
          setProfileImage(localPath || data.profileImage);
        }
      }
    } catch (error) {
      console.error('[ProfileScreen] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const compressedUri = await compressProfileImage(result.assets[0].uri);
        const localPath = await saveProfileImageLocally(user.uid, compressedUri);
        setProfileImage(localPath);
        Alert.alert('Success', 'Profile photo updated.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteProfileImage(user.uid);
          setProfileImage(null);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => auth.signOut() },
    ]);
  };

  const handleMenuPress = (label) => {
    const screens = {
      'Edit Profile': 'EditProfile',
      'Notifications': 'Notifications',
      'Help Center': 'HelpCenter',
      'Terms of Service': 'TermsOfService',
      'Settings': 'Settings',
      'About EduFlow': 'AboutEduFlow',
    };

    const screen = screens[label];
    if (screen) {
      navigation.navigate(screen);
    } else if (label === 'Share with Friends') {
      Alert.alert('Share', 'Tell your classmates about EduFlow.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const displayName = userData?.name || user?.displayName || 'Student';
  const email = userData?.email || user?.email || '';
  const university = userData?.university || 'Not set';
  const studentNumber = userData?.studentNumber || 'Not set';
  const fundingType = userData?.fundingType || 'Not specified';

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: User2, label: 'Edit Profile', color: COLORS.primary },
        { icon: Bell, label: 'Notifications', color: COLORS.warning },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', color: COLORS.accent },
        { icon: FileText, label: 'Terms of Service', color: COLORS.textSecondary },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: Info, label: 'About EduFlow', color: COLORS.primary },
        { icon: Share2, label: 'Share with Friends', color: COLORS.success },
      ],
    },
  ];

  return (
    <LinearGradient colors={[COLORS.bgStart, COLORS.bgMid, COLORS.bgEnd]} style={styles.container}>
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Settings size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown} style={styles.profileHeader}>
          <TouchableOpacity onPress={handlePickImage} onLongPress={handleRemovePhoto} style={styles.avatarWrapper} disabled={uploading}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <User2 size={48} color={COLORS.textMuted} />
              </View>
            )}
            <View style={styles.cameraButton}>
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Camera size={16} color={COLORS.white} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{email}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <School size={16} color={COLORS.primary} />
              <Text style={styles.infoLabel}>University</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{university}</Text>
            </View>
            <View style={styles.infoCard}>
              <Award size={16} color={COLORS.warning} />
              <Text style={styles.infoLabel}>Student ID</Text>
              <Text style={styles.infoValue}>{studentNumber}</Text>
            </View>
            <View style={styles.infoCard}>
              <CreditCard size={16} color={COLORS.success} />
              <Text style={styles.infoLabel}>Funding</Text>
              <Text style={styles.infoValue}>{fundingType}</Text>
            </View>
            <View style={styles.infoCard}>
              <GraduationCap size={16} color={COLORS.accent} />
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, { color: COLORS.success }]}>Active</Text>
            </View>
          </View>
        </Animated.View>

        {menuSections.map((section, sectionIndex) => (
          <Animated.View key={section.title} entering={FadeInUp.delay(sectionIndex * 100)} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, itemIndex < section.items.length - 1 && styles.menuBorder]}
                  onPress={() => handleMenuPress(item.label)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '12' }]}>
                    <item.icon size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <ChevronRight size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }}>
          <Text style={styles.versionText}>EduFlow v1.0</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  headerRight: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 38, paddingBottom: 8 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { alignItems: 'center', paddingBottom: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.surfaceAlt },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white },
  userName: { fontSize: 24, fontFamily: 'JosefinSans-Bold', color: COLORS.text, marginBottom: 4 },
  userEmail: { fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textSecondary, marginBottom: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  infoCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: 10, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'JosefinSans-Bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  menuIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: 'JosefinSans-SemiBold', color: COLORS.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surface, paddingVertical: 16, borderRadius: 20, marginBottom: 16 },
  logoutText: { fontSize: 15, fontFamily: 'JosefinSans-Bold', color: COLORS.danger },
  versionText: { textAlign: 'center', fontSize: 12, fontFamily: 'JosefinSans-SemiBold', color: COLORS.textMuted },
});

export default ProfileScreen;