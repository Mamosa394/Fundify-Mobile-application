// src/services/profileService.js

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { db, storage } from './firebase';

const PROFILE_DIR = `${FileSystem.documentDirectory}profiles/`;

/**
 * Ensures the profile directory exists
 */
const ensureDirectoryExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PROFILE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PROFILE_DIR, { intermediates: true });
  }
};

/**
 * Fetches student profile data from Firestore
 */
export const fetchStudentProfile = async (uid) => {
  if (!uid) throw new Error('User UID is required.');
  
  const userRef = doc(db, 'students', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    
    // If user has a Firebase Storage URL, check if local copy exists
    if (data.profileImage && data.profileImage.startsWith('http')) {
      const localPath = await getLocalProfilePath(uid);
      if (localPath) {
        // Return local path for faster loading
        return { ...data, profileImageLocal: localPath };
      }
    }
    
    // If user has a local path stored, verify it exists
    if (data.profileImage && data.profileImage.startsWith('file://')) {
      const fileInfo = await FileSystem.getInfoAsync(data.profileImage);
      if (!fileInfo.exists) {
        // Local file missing, clear the reference
        await updateDoc(userRef, { profileImage: null });
        return { ...data, profileImage: null };
      }
    }
    
    return data;
  }
  
  return null;
};

/**
 * Updates Firestore document
 */
export const updateStudentProfileData = async (uid, updateData) => {
  if (!uid) throw new Error('User UID is required.');
  const userRef = doc(db, 'students', uid);
  await updateDoc(userRef, updateData);
};

/**
 * Compresses image locally to reduce file size
 */
export const compressProfileImage = async (uri) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error('[ProfileService] Compression error:', error);
    return uri;
  }
};

/**
 * Gets the local profile image path for a user
 */
export const getLocalProfilePath = async (uid) => {
  try {
    await ensureDirectoryExists();
    const files = await FileSystem.readDirectoryAsync(PROFILE_DIR);
    const userFile = files.find(f => f.startsWith(`${uid}_`));
    
    if (userFile) {
      const filePath = `${PROFILE_DIR}${userFile}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        return filePath;
      }
    }
    return null;
  } catch (error) {
    console.error('[ProfileService] getLocalProfilePath error:', error);
    return null;
  }
};

/**
 * Saves image locally AND uploads to Firebase Storage
 * Updates Firestore with the Firebase Storage URL
 */
export const saveProfileImageLocally = async (uid, uri) => {
  try {
    await ensureDirectoryExists();
    
    // Delete old profile images for this user
    const files = await FileSystem.readDirectoryAsync(PROFILE_DIR);
    for (const file of files) {
      if (file.startsWith(`${uid}_`)) {
        await FileSystem.deleteAsync(`${PROFILE_DIR}${file}`, { idempotent: true });
      }
    }
    
    // Save new image locally
    const timestamp = Date.now();
    const fileName = `${uid}_${timestamp}.jpg`;
    const localPath = `${PROFILE_DIR}${fileName}`;
    
    await FileSystem.copyAsync({ from: uri, to: localPath });
    
    // Upload to Firebase Storage in the background
    uploadToFirebase(uid, localPath);
    
    return localPath;
  } catch (error) {
    console.error('[ProfileService] Local save error:', error);
    throw error;
  }
};

/**
 * Uploads local image to Firebase Storage and updates Firestore
 */
const uploadToFirebase = async (uid, localUri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) return;
    
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Convert base64 to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    
    // Upload to Firebase Storage
    const imageRef = ref(storage, `profileImages/${uid}.jpg`);
    await uploadBytes(imageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(imageRef);
    
    // Update Firestore with Firebase URL
    const userRef = doc(db, 'students', uid);
    await updateDoc(userRef, { 
      profileImage: downloadURL,
      profileImageLocal: localUri,
    });
    
    console.log('[ProfileService] Firebase upload complete');
  } catch (error) {
    console.error('[ProfileService] Firebase upload error:', error);
    // Don't throw - local save already succeeded
  }
};

/**
 * Deletes profile image both locally and from Firestore
 */
export const deleteProfileImage = async (uid) => {
  try {
    // Delete local files
    await ensureDirectoryExists();
    const files = await FileSystem.readDirectoryAsync(PROFILE_DIR);
    for (const file of files) {
      if (file.startsWith(`${uid}_`)) {
        await FileSystem.deleteAsync(`${PROFILE_DIR}${file}`, { idempotent: true });
      }
    }
    
    // Clear from Firestore
    const userRef = doc(db, 'students', uid);
    await updateDoc(userRef, { 
      profileImage: null,
      profileImageLocal: null,
    });
    
    return true;
  } catch (error) {
    console.error('[ProfileService] Delete error:', error);
    throw error;
  }
};

export default {
  fetchStudentProfile,
  updateStudentProfileData,
  compressProfileImage,
  getLocalProfilePath,
  saveProfileImageLocally,
  deleteProfileImage,
};