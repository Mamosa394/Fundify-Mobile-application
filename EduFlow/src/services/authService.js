// src/services/authService.js

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as LocalAuthentication from 'expo-local-authentication';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  auth,
  db,
} from './firebase';

/*
|--------------------------------------------------------------------------
| STORAGE KEYS
|--------------------------------------------------------------------------
*/

const STORAGE_KEYS = {
  USER: '@eduflow_user',
  BIOMETRIC_ENABLED: '@eduflow_biometric_enabled',
};

/*
|--------------------------------------------------------------------------
| SAVE USER TO STORAGE
|--------------------------------------------------------------------------
*/

async function saveUserSession(userData) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER,
      JSON.stringify(userData)
    );

    console.log(
      '[authService] Session saved'
    );
  } catch (error) {
    console.log(
      '[authService] saveUserSession error:',
      error
    );
  }
}

/*
|--------------------------------------------------------------------------
| GET SAVED SESSION
|--------------------------------------------------------------------------
*/

export async function getSavedSession() {
  try {
    const session =
      await AsyncStorage.getItem(
        STORAGE_KEYS.USER
      );

    if (!session) {
      return null;
    }

    return JSON.parse(session);
  } catch (error) {
    console.log(
      '[authService] getSavedSession error:',
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| CLEAR SAVED SESSION
|--------------------------------------------------------------------------
*/

async function clearSavedSession() {
  try {
    await AsyncStorage.removeItem(
      STORAGE_KEYS.USER
    );
  } catch (error) {
    console.log(
      '[authService] clearSavedSession error:',
      error
    );
  }
}

/*
|--------------------------------------------------------------------------
| REGISTER STUDENT
|--------------------------------------------------------------------------
*/

export async function registerStudent(
  email,
  password,
  profileData = {}
) {
  try {
    console.log(
      '[authService] Creating account'
    );

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

    const user = userCredential.user;

    await updateProfile(user, {
      displayName:
        profileData.name || 'Student',
    });

    const studentData = {
      uid: user.uid,

      name:
        profileData.name?.trim() ||
        'Student',

      email: email.trim(),

      studentNumber:
        profileData.studentNumber?.trim() ||
        '',

      university:
        profileData.university || '',

      fundingType:
        profileData.fundingType || '',

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    /*
    |--------------------------------------------------------------------------
    | SAVE TO FIRESTORE
    |--------------------------------------------------------------------------
    */

    await setDoc(
      doc(db, 'students', user.uid),
      studentData
    );

    /*
    |--------------------------------------------------------------------------
    | SAVE SESSION LOCALLY
    |--------------------------------------------------------------------------
    */

    await saveUserSession(studentData);

    console.log(
      '[authService] Account created successfully'
    );

    return {
      user,
      profile: studentData,
    };
  } catch (error) {
    console.log(
      '[authService] registerStudent error:',
      error
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

export async function loginStudent(
  email,
  password
) {
  try {
    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

    const user = userCredential.user;

    /*
    |--------------------------------------------------------------------------
    | GET USER PROFILE
    |--------------------------------------------------------------------------
    */

    const userRef = doc(
      db,
      'students',
      user.uid
    );

    const userSnap =
      await getDoc(userRef);

    let profile = {
      uid: user.uid,
      email: user.email,
      name:
        user.displayName || 'Student',
    };

    if (userSnap.exists()) {
      profile = userSnap.data();
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE SESSION
    |--------------------------------------------------------------------------
    */

    await saveUserSession(profile);

    return {
      user,
      profile,
    };
  } catch (error) {
    console.log(
      '[authService] loginStudent error:',
      error
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| AUTO LOGIN
|--------------------------------------------------------------------------
*/

export async function autoLogin() {
  try {
    const savedUser =
      await getSavedSession();

    if (!savedUser) {
      console.log(
        '[authService] No saved session'
      );

      return null;
    }

    console.log(
      '[authService] Restored saved session'
    );

    return savedUser;
  } catch (error) {
    console.log(
      '[authService] autoLogin error:',
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

export async function logoutStudent() {
  try {
    await signOut(auth);

    await clearSavedSession();

    console.log(
      '[authService] Logged out'
    );
  } catch (error) {
    console.log(
      '[authService] logoutStudent error:',
      error
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| GET CURRENT PROFILE
|--------------------------------------------------------------------------
*/

export async function getCurrentStudentProfile() {
  try {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      return null;
    }

    const studentRef = doc(
      db,
      'students',
      currentUser.uid
    );

    const studentSnap =
      await getDoc(studentRef);

    if (!studentSnap.exists()) {
      return null;
    }

    return studentSnap.data();
  } catch (error) {
    console.log(
      '[authService] getCurrentStudentProfile error:',
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| BIOMETRICS
|--------------------------------------------------------------------------
*/

export async function enableBiometrics() {
  try {
    const compatible =
      await LocalAuthentication.hasHardwareAsync();

    if (!compatible) {
      return false;
    }

    const enrolled =
      await LocalAuthentication.isEnrolledAsync();

    if (!enrolled) {
      return false;
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.BIOMETRIC_ENABLED,
      'true'
    );

    return true;
  } catch (error) {
    console.log(
      '[authService] enableBiometrics error:',
      error
    );

    return false;
  }
}

export async function isBiometricEnabled() {
  try {
    const enabled =
      await AsyncStorage.getItem(
        STORAGE_KEYS.BIOMETRIC_ENABLED
      );

    return enabled === 'true';
  } catch (error) {
    return false;
  }
}

export async function authenticateWithBiometrics() {
  try {
    const result =
      await LocalAuthentication.authenticateAsync(
        {
          promptMessage:
            'Authenticate to continue',

          fallbackLabel:
            'Use Passcode',

          disableDeviceFallback: false,
        }
      );

    return result.success;
  } catch (error) {
    console.log(
      '[authService] biometric auth error:',
      error
    );

    return false;
  }
}

/*
|--------------------------------------------------------------------------
| AUTH LISTENER
|--------------------------------------------------------------------------
*/

export function observeAuthState(
  callback
) {
  return onAuthStateChanged(
    auth,
    callback
  );
}