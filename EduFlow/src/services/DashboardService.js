// src/services/DashboardService.js

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  onAuthStateChanged,
} from 'firebase/auth';

import { auth, db } from './firebase';

/*
|--------------------------------------------------------------------------
| AUTH HELPER
|--------------------------------------------------------------------------
*/

export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        }
      );
  });
}

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

function daysBetween(a, b) {
  const oneDay =
    1000 * 60 * 60 * 24;

  return Math.floor(
    (b.getTime() - a.getTime()) /
      oneDay
  );
}

function getDaysInMonth(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
}

/*
|--------------------------------------------------------------------------
| INITIALIZE USER BUDGET
|--------------------------------------------------------------------------
*/

export async function initializeUserBudget(
  amount
) {
  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    throw new Error(
      'No authenticated user'
    );
  }

  const uid = currentUser.uid;

  const financialRef = doc(
    db,
    'financials',
    uid
  );

  await setDoc(
    financialRef,
    {
      currentBalance:
        Number(amount),

      cycleStartDate:
        new Date().toISOString(),

      updatedAt:
        serverTimestamp(),
    },
    { merge: true }
  );

  return true;
}

/*
|--------------------------------------------------------------------------
| DASHBOARD DATA
|--------------------------------------------------------------------------
*/

export async function getDashboardData() {
  try {
    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      throw new Error(
        'No authenticated user'
      );
    }

    const uid = currentUser.uid;

    /*
    |--------------------------------------------------------------------------
    | USER PROFILE
    |--------------------------------------------------------------------------
    */

    const userRef = doc(
      db,
      'students',
      uid
    );

    const userSnap =
      await getDoc(userRef);

    /*
    |--------------------------------------------------------------------------
    | OTHER COLLECTIONS
    |--------------------------------------------------------------------------
    */

    const academicRef = doc(
      db,
      'academics',
      uid
    );

    const scholarshipRef = doc(
      db,
      'scholarships',
      uid
    );

    const engagementRef = doc(
      db,
      'engagements',
      uid
    );

    const financialRef = doc(
      db,
      'financials',
      uid
    );

    const [
      academicSnap,
      scholarshipSnap,
      engagementSnap,
      financialSnap,
    ] = await Promise.all([
      getDoc(academicRef),
      getDoc(scholarshipRef),
      getDoc(engagementRef),
      getDoc(financialRef),
    ]);

    /*
    |--------------------------------------------------------------------------
    | PROFILE
    |--------------------------------------------------------------------------
    */

    const profileData =
      userSnap.exists()
        ? userSnap.data()
        : {};

    const profile = {
      uid,

      name:
        profileData.name ||
        currentUser.displayName ||
        'Student',

      university:
        profileData.university ||
        '',

      fundingType:
        profileData.fundingType ||
        '',

      studentNumber:
        profileData.studentNumber ||
        '',

      email:
        currentUser.email || '',
    };

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL SMART BUDGETING
    |--------------------------------------------------------------------------
    */

    let financial = {
      monthlyBudget: 0,
      spentToDate: 0,
      currentBalance: 0,
      remainingDays: 0,
      dailySafeSpend: 0,
    };

    let needsBalanceSetup = false;

    if (!financialSnap.exists()) {
      needsBalanceSetup = true;
    } else {
      const financialData =
        financialSnap.data();

      if (
        !financialData.currentBalance ||
        !financialData.cycleStartDate
      ) {
        needsBalanceSetup = true;
      } else {
        const currentBalance =
          Number(
            financialData.currentBalance
          );

        const cycleStartDate =
          new Date(
            financialData.cycleStartDate
          );

        const now = new Date();

        const daysInMonth =
          getDaysInMonth(now);

        const currentDay =
          now.getDate();

        const remainingDays =
          daysInMonth -
          currentDay +
          1;

        const elapsedDays =
          daysBetween(
            cycleStartDate,
            now
          );

        /*
        |--------------------------------------------------------------------------
        | SMART MONTHLY PROJECTION
        |--------------------------------------------------------------------------
        */

        const projectedMonthlyBudget =
          Math.round(
            (currentBalance /
              remainingDays) *
              daysInMonth
          );

        const projectedSpent =
          Math.max(
            projectedMonthlyBudget -
              currentBalance,
            0
          );

        financial = {
          currentBalance,

          monthlyBudget:
            projectedMonthlyBudget,

          spentToDate:
            projectedSpent,

          remainingDays,

          elapsedDays,

          dailySafeSpend:
            Number(
              (
                currentBalance /
                remainingDays
              ).toFixed(2)
            ),
        };
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ACADEMICS
    |--------------------------------------------------------------------------
    */

    const academic =
      academicSnap.exists()
        ? academicSnap.data()
        : {
            gpa: 0,
            attendancePct: 0,
          };

    /*
    |--------------------------------------------------------------------------
    | SCHOLARSHIPS
    |--------------------------------------------------------------------------
    */

    const scholarship =
      scholarshipSnap.exists()
        ? scholarshipSnap.data()
        : {
            nextDeadlineDays: 0,
            progressPct: 0,
            stage: '',
          };

    /*
    |--------------------------------------------------------------------------
    | ENGAGEMENTS
    |--------------------------------------------------------------------------
    */

    const engagement =
      engagementSnap.exists()
        ? engagementSnap.data()
        : {
            streakDays: 0,
            nextBestAction: '',
          };

    return {
      profile,
      financial,
      academic,
      scholarship,
      engagement,
      needsBalanceSetup,
    };
  } catch (error) {
    console.log(
      '[DashboardService] Error:',
      error
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

export function calculateBudgetProgress(
  financial
) {
  if (!financial) return 0;

  return Math.min(
    financial.spentToDate /
      Math.max(
        financial.monthlyBudget,
        1
      ),
    1
  );
}

export function calculateScholarshipUrgency(
  scholarship
) {
  if (!scholarship) return 0;

  return Math.max(
    0,
    Math.min(
      1 -
        scholarship.nextDeadlineDays /
          14,
      1
    )
  );
}

export function calculateAcademicRisk(
  academic
) {
  if (!academic) return 0;

  return Math.max(
    0,
    Math.min(
      (80 -
        academic.attendancePct) /
        25,
      1
    )
  );
}

export function calculateEngagementIntensity(
  engagement
) {
  if (!engagement) return 0;

  return Math.max(
    0,
    Math.min(
      engagement.streakDays / 14,
      1
    )
  );
}