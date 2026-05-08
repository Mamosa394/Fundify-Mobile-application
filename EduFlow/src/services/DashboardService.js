// src/services/DashboardService.js

import {
  doc,
  getDoc,
} from 'firebase/firestore';

import { auth, db } from './firebase';

/*
|--------------------------------------------------------------------------
| Dashboard Service
|--------------------------------------------------------------------------
| Centralized dashboard data loader.
| Pulls:
| - User profile
| - Academic data
| - Financial data
| - Scholarship data
| - Engagement data
|--------------------------------------------------------------------------
*/

export async function getDashboardData() {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const uid = currentUser.uid;

    /*
    |--------------------------------------------------------------------------
    | USER PROFILE
    |--------------------------------------------------------------------------
    */

    const userRef = doc(db, 'students', uid);

    const userSnap = await getDoc(userRef);

    let profile = {
      uid,
      name: 'Student',
      university: '',
      fundingType: '',
      studentNumber: '',
      email: currentUser.email || '',
    };

    if (userSnap.exists()) {
      const data = userSnap.data();

      profile = {
        uid,

        name:
          data.name ||
          currentUser.displayName ||
          'Student',

        university:
          data.university || '',

        fundingType:
          data.fundingType || '',

        studentNumber:
          data.studentNumber || '',

        email:
          currentUser.email || '',
      };
    }

    /*
    |--------------------------------------------------------------------------
    | MOCKED DASHBOARD DATA
    |--------------------------------------------------------------------------
    | Replace later with real firestore collections
    |--------------------------------------------------------------------------
    */

    const dashboard = {
      profile,

      financial: {
        monthlyBudget: 2400,
        spentToDate: 1375,

        upcomingExpense: {
          label: 'Transport top-up',
          amount: 180,
          inDays: 5,
        },
      },

      academic: {
        gpa: 3.42,
        attendancePct: 78,

        nextAssignment: {
          label: 'Database Systems',
          dueInDays: 3,
        },
      },

      scholarship: {
        nextDeadlineDays: 9,
        progressPct: 62,
        stage:
          'Awaiting payment confirmation',
      },

      engagement: {
        streakDays: 6,

        nextBestAction:
          'Submit missing document bundle',
      },
    };

    return dashboard;
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
      financial.monthlyBudget,
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
        scholarship.nextDeadlineDays / 14,
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
      (80 - academic.attendancePct) / 25,
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