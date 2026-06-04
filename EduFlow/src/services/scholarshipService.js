// src/services/scholarshipService.js

import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentStudentProfile } from './authService';

/*
|--------------------------------------------------------------------------
| DEFAULT NMDS ALLOWANCE STRUCTURE (Limkokwing University)
|--------------------------------------------------------------------------
*/
const DEFAULT_ALLOWANCE = {
  university: 'Limkokwing University (LUCT)',
  fundingType: 'NMDS',
  newStudentLumpSum: 8900,
  continuingStudentLumpSum: 7900,
  monthlyAllowance: 1950,
  semesterMonths: 6,
  semestersPerYear: 2,
};

/*
|--------------------------------------------------------------------------
| CALCULATE ALLOWANCE BREAKDOWN
|--------------------------------------------------------------------------
*/
export function calculateAllowance(isNewStudent = false, currentSemester = 1) {
  const lumpSum = isNewStudent 
    ? DEFAULT_ALLOWANCE.newStudentLumpSum 
    : (currentSemester === 1 ? DEFAULT_ALLOWANCE.continuingStudentLumpSum : 0);
  
  const monthlyStipend = DEFAULT_ALLOWANCE.monthlyAllowance;
  const semesterStipend = monthlyStipend * DEFAULT_ALLOWANCE.semesterMonths;
  
  return {
    lumpSum,
    monthlyStipend,
    semesterStipend,
    semesterTotal: lumpSum + semesterStipend,
    annualTotal: (lumpSum + semesterStipend) + semesterStipend, // First sem + second sem
    secondSemesterTotal: semesterStipend,
    ...DEFAULT_ALLOWANCE,
  };
}

/*
|--------------------------------------------------------------------------
| CALCULATE REMAINING ALLOWANCE FOR CURRENT SEMESTER
|--------------------------------------------------------------------------
*/
export function calculateRemainingAllowance(allowance, semesterStartMonth = 8, currentMonth = null) {
  const now = currentMonth ? new Date(0, currentMonth - 1) : new Date();
  const currentMonthNum = now.getMonth(); // 0-11
  
  // Semester runs for 6 months from start month
  const startMonth = semesterStartMonth - 1; // Convert to 0-11
  let monthsElapsed;
  
  if (currentMonthNum >= startMonth && currentMonthNum < startMonth + 6) {
    monthsElapsed = currentMonthNum - startMonth;
  } else if (currentMonthNum < startMonth) {
    // Current month is before semester start (previous year's second semester)
    monthsElapsed = currentMonthNum + (12 - startMonth);
  } else {
    // Current month is after semester end
    monthsElapsed = 6;
  }
  
  const monthsRemaining = Math.max(0, 6 - monthsElapsed);
  const remainingStipend = monthsRemaining * allowance.monthlyStipend;
  const totalRemaining = (monthsElapsed === 0 ? allowance.lumpSum : 0) + remainingStipend;
  
  return {
    monthsElapsed,
    monthsRemaining,
    remainingStipend,
    remainingLumpSum: monthsElapsed === 0 ? allowance.lumpSum : 0,
    totalRemaining,
    monthlyRate: allowance.monthlyStipend,
  };
}

/*
|--------------------------------------------------------------------------
| FETCH STUDENT FUNDING PROFILE
|--------------------------------------------------------------------------
*/
export async function fetchFundingProfile(uid) {
  try {
    const fundingRef = doc(db, 'funding', uid);
    const fundingSnap = await getDoc(fundingRef);
    
    if (fundingSnap.exists()) {
      const data = fundingSnap.data();
      const allowance = calculateAllowance(data.isNewStudent, data.semester || 1);
      const remaining = calculateRemainingAllowance(allowance);
      
      return {
        ...data,
        allowance,
        remaining,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[ScholarshipService] fetchFundingProfile error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| SAVE OR UPDATE FUNDING PROFILE
|--------------------------------------------------------------------------
*/
export async function saveFundingProfile(uid, fundingData) {
  try {
    const fundingRef = doc(db, 'funding', uid);
    
    await setDoc(fundingRef, {
      ...fundingData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('[ScholarshipService] saveFundingProfile error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| INITIALIZE FUNDING PROFILE FROM STUDENT DATA
|--------------------------------------------------------------------------
*/
export async function initializeFundingFromStudent(uid) {
  try {
    const studentProfile = await getCurrentStudentProfile();
    if (!studentProfile) return null;
    
    const { university, fundingType, studentNumber, name } = studentProfile;
    
    // Check if user has NMDS funding
    const hasNMDS = fundingType?.toUpperCase() === 'NMDS' || 
                    fundingType?.toLowerCase().includes('nmds') ||
                    university?.toLowerCase().includes('limkokwing');
    
    const fundingData = {
      uid,
      name: name || '',
      university: university || '',
      fundingType: fundingType || '',
      studentNumber: studentNumber || '',
      hasScholarship: hasNMDS,
      scholarshipName: hasNMDS ? 'NMDS Bursary' : '',
      isNewStudent: false,
      semester: 1,
      academicYear: new Date().getFullYear().toString(),
      semesterStartMonth: 8,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const fundingRef = doc(db, 'funding', uid);
    const existingSnap = await getDoc(fundingRef);
    
    if (!existingSnap.exists()) {
      await setDoc(fundingRef, fundingData);
    }
    
    const allowance = calculateAllowance(fundingData.isNewStudent, fundingData.semester);
    const remaining = calculateRemainingAllowance(allowance);
    
    return { ...fundingData, allowance, remaining };
  } catch (error) {
    console.error('[ScholarshipService] initializeFunding error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| CHECK IF FUNDING PROFILE EXISTS
|--------------------------------------------------------------------------
*/
export async function hasFundingProfile(uid) {
  try {
    const fundingRef = doc(db, 'funding', uid);
    const fundingSnap = await getDoc(fundingRef);
    return fundingSnap.exists();
  } catch (error) {
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE FUNDING PROFILE FIELDS
|--------------------------------------------------------------------------
*/
export async function updateFundingProfile(uid, updates) {
  try {
    const fundingRef = doc(db, 'funding', uid);
    
    await updateDoc(fundingRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('[ScholarshipService] updateFundingProfile error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| TOGGLE SCHOLARSHIP STATUS
|--------------------------------------------------------------------------
*/
export async function toggleScholarshipStatus(uid, hasScholarship) {
  try {
    const fundingRef = doc(db, 'funding', uid);
    
    await updateDoc(fundingRef, {
      hasScholarship,
      scholarshipName: hasScholarship ? 'NMDS Bursary' : '',
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('[ScholarshipService] toggleScholarshipStatus error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| FETCH ALL AVAILABLE SCHOLARSHIPS (for browsing)
|--------------------------------------------------------------------------
*/
export async function fetchAllScholarships() {
  try {
    const scholarshipsRef = collection(db, 'scholarships');
    const q = query(scholarshipsRef, orderBy('deadline', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[ScholarshipService] fetchAllScholarships error:', error);
    return [];
  }
}

/*
|--------------------------------------------------------------------------
| FETCH SCHOLARSHIP BY ID
|--------------------------------------------------------------------------
*/
export async function fetchScholarshipById(scholarshipId) {
  try {
    const scholarshipRef = doc(db, 'scholarships', scholarshipId);
    const scholarshipSnap = await getDoc(scholarshipRef);
    
    if (scholarshipSnap.exists()) {
      return { id: scholarshipSnap.id, ...scholarshipSnap.data() };
    }
    
    return null;
  } catch (error) {
    console.error('[ScholarshipService] fetchScholarshipById error:', error);
    throw error;
  }
}

// src/services/scholarshipService.js - Add this function

/*
|--------------------------------------------------------------------------
| SEED SCHOLARSHIPS (Run once to populate the collection)
|--------------------------------------------------------------------------
*/
export async function seedScholarships() {
  const scholarshipsRef = collection(db, 'scholarships');
  
  const scholarships = [
    {
      title: 'NMDS Bursary',
      provider: 'Department of Health',
      amount: 'Full Tuition + M1,950/month allowance',
      deadline: '2026-08-31',
      category: 'Healthcare',
      requirements: ['South African Citizen', 'Health Sciences Student', 'Academic Merit'],
      description: 'The National Manpower Development Scholarship (NMDS) provides full tuition coverage plus a monthly living allowance of M1,950 for health science students at Limkokwing University. Includes startup lump sum for books and equipment.',
      tags: ['Bursary', 'Healthcare', 'Full Funding', 'Monthly Allowance'],
      status: 'available',
      link: 'https://www.health.gov.za',
      createdAt: serverTimestamp(),
    },
   [
    {
      title: 'Rhodes Scholarship (Southern Africa)',
      provider: 'Rhodes Trust',
      amount: 'Full Support (Tuition + Stipend)',
      deadline: '2026-08-03',
      category: 'General',
      requirements: ['Lesotho Citizen', 'Aged 18-24', 'Academic Excellence'],
      description: 'Prestigious scholarship for postgraduate study at the University of Oxford. Covers all university fees and a living stipend.',
      tags: ['Scholarship', 'Oxford', 'International', 'Full Funding'],
      status: 'available',
      link: 'https://www.rhodeshouse.ox.ac.uk',
      createdAt: serverTimestamp(),
    },
    {
      title: 'Commonwealth Scholarships',
      provider: 'Commonwealth Secretariat',
      amount: 'Full Support',
      deadline: '2026-04-25',
      category: 'General',
      requirements: ['Commonwealth Citizen (Basotho)', 'Postgraduate Intent'],
      description: 'Fully funded master’s and PhD opportunities at UK universities for students who cannot afford to study in the UK.',
      tags: ['Scholarship', 'UK', 'Postgraduate', 'International'],
      status: 'available',
      link: 'https://cscuk.fcdo.gov.uk',
      createdAt: serverTimestamp(),
    },
    {
      title: 'Australia Awards Scholarships',
      provider: 'Australian Government',
      amount: 'Full Support',
      deadline: '2026-04-30',
      category: 'General',
      requirements: ['Basotho Citizen', 'Work Experience', "Bachelor's Degree"],
      description: 'Fully funded Master’s degree programs at Australian universities, including tuition, living allowance, and travel.',
      tags: ['Scholarship', 'Australia', 'Masters', 'International'],
      status: 'available',
      link: 'https://www.australiaawardsafrica.org',
      createdAt: serverTimestamp(),
    },
    {
      title: 'LESCO Bursary',
      provider: 'Lesotho Electricity Company (LESCO)',
      amount: 'Varies',
      deadline: 'TBD',
      category: 'Engineering',
      requirements: ['Lesotho Citizen', 'Engineering Student', 'Strong Math/Science'],
      description: 'Bursary for students pursuing degrees in electrical or mechanical engineering to support the energy sector in Lesotho.',
      tags: ['Bursary', 'Engineering', 'STEM', 'Local'],
      status: 'available',
      link: 'https://www.lesco.co.ls',
      createdAt: serverTimestamp(),
    },
    {
      title: 'LNDC Internship/Bursary',
      provider: 'Lesotho National Development Corporation',
      amount: 'Varies',
      deadline: 'TBD',
      category: 'Commerce',
      requirements: ['Lesotho Citizen', 'Graduate/Undergraduate'],
      description: 'Supports students in fields relevant to industrial development including finance, marketing, and engineering.',
      tags: ['Internship', 'Bursary', 'Commerce', 'STEM'],
      status: 'available',
      link: 'https://www.lndc.org.ls',
      createdAt: serverTimestamp(),
    },
    {
      title: 'Central Bank of Lesotho Bursary',
      provider: 'Central Bank of Lesotho (CBL)',
      amount: 'Varies',
      deadline: 'TBD',
      category: 'Commerce',
      requirements: ['Lesotho Citizen', 'Economics/Finance Student', 'Strong Academics'],
      description: 'Bursary opportunities for students pursuing studies in economics, banking, and finance to build capacity within the central bank.',
      tags: ['Bursary', 'Economics', 'Finance', 'Banking'],
      status: 'available',
      link: 'https://www.centralbank.org.ls',
      createdAt: serverTimestamp(),
    },
    {
      title: 'NUL Bursary',
      provider: 'National University of Lesotho',
      amount: 'Varies',
      deadline: 'TBD',
      category: 'General',
      requirements: ['Enrolled NUL Student', 'Financial Need', 'Academic Progress'],
      description: 'Institutional financial aid and merit-based bursaries for current students demonstrating academic excellence or financial need.',
      tags: ['Bursary', 'Undergraduate', 'Local'],
      status: 'available',
      link: 'https://www.nul.ls',
      createdAt: serverTimestamp(),
    },
]
  ];

  // Check if scholarships already exist
  const existingSnap = await getDocs(scholarshipsRef);
  if (!existingSnap.empty) {
    console.log('[ScholarshipService] Scholarships already seeded');
    return;
  }

  // Add all scholarships
  for (const scholarship of scholarships) {
    await setDoc(doc(scholarshipsRef), scholarship);
  }

  console.log('[ScholarshipService] Scholarships seeded successfully');
  return true;
}

/*
|--------------------------------------------------------------------------
| GET SCHOLARSHIP STATS
|--------------------------------------------------------------------------
*/
export async function getScholarshipStats() {
  try {
    const scholarships = await fetchAllScholarships();
    
    const total = scholarships.length;
    const available = scholarships.filter(s => s.status === 'available').length;
    const closed = scholarships.filter(s => s.status === 'closed' || new Date(s.deadline) < new Date()).length;
    
    return { total, available, closed };
  } catch (error) {
    return { total: 0, available: 0, closed: 0 };
  }
}

export default {
  calculateAllowance,
  calculateRemainingAllowance,
  fetchFundingProfile,
  saveFundingProfile,
  initializeFundingFromStudent,
  hasFundingProfile,
  updateFundingProfile,
  toggleScholarshipStatus,
  fetchAllScholarships,
  fetchScholarshipById,
  getScholarshipStats,
};