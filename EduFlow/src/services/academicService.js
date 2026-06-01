// src/services/AcademicService.js

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUser } from './DashboardService';

/*
|--------------------------------------------------------------------------
| GPA CALCULATION ENGINE
|--------------------------------------------------------------------------
*/

const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0
};

function calculateGPAPoints(grade) {
  return GRADE_POINTS[grade] || 0;
}

function calculateWeightedGPA(modules) {
  if (!modules || modules.length === 0) {
    return { gpa: 0, totalCredits: 0, totalPoints: 0 };
  }

  let totalQualityPoints = 0;
  let totalCredits = 0;

  modules.forEach(module => {
    const credits = module.credits || 0;
    const grade = module.currentGrade || 'F';
    const gradePoints = calculateGPAPoints(grade);
    
    totalQualityPoints += credits * gradePoints;
    totalCredits += credits;
  });

  const gpa = totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : 0;
  
  return {
    gpa: parseFloat(gpa),
    totalCredits,
    totalPoints: totalQualityPoints
  };
}

function predictGPA(modules, targetGrades) {
  let totalQualityPoints = 0;
  let totalCredits = 0;

  modules.forEach(module => {
    const credits = module.credits || 0;
    const grade = targetGrades[module.id] || module.currentGrade || 'F';
    const gradePoints = calculateGPAPoints(grade);
    
    totalQualityPoints += credits * gradePoints;
    totalCredits += credits;
  });

  const predictedGPA = totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : 0;
  
  return {
    predictedGPA: parseFloat(predictedGPA),
    totalCredits,
    totalPoints: totalQualityPoints
  };
}

/*
|--------------------------------------------------------------------------
| MODULE MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function addModule(moduleData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const module = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...moduleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      assignments: [],
      assessments: [],
      currentGrade: moduleData.currentGrade || 'F',
      targetGrade: moduleData.targetGrade || 'A'
    };

    const docSnap = await getDoc(academicRef);
    
    if (docSnap.exists()) {
      await updateDoc(academicRef, {
        modules: arrayUnion(module),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(academicRef, {
        modules: [module],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    return module;
  } catch (error) {
    console.error('[AcademicService] addModule error:', error);
    throw error;
  }
}

export async function updateModule(moduleId, updates) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const docSnap = await getDoc(academicRef);
    if (!docSnap.exists()) throw new Error('No academic data found');

    const data = docSnap.data();
    const modules = data.modules || [];
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) throw new Error('Module not found');

    modules[moduleIndex] = {
      ...modules[moduleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(academicRef, {
      modules: modules,
      updatedAt: serverTimestamp()
    });

    return modules[moduleIndex];
  } catch (error) {
    console.error('[AcademicService] updateModule error:', error);
    throw error;
  }
}

export async function deleteModule(moduleId) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const docSnap = await getDoc(academicRef);
    if (!docSnap.exists()) throw new Error('No academic data found');

    const data = docSnap.data();
    const module = data.modules.find(m => m.id === moduleId);
    
    if (!module) throw new Error('Module not found');

    await updateDoc(academicRef, {
      modules: arrayRemove(module),
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('[AcademicService] deleteModule error:', error);
    throw error;
  }
}

export async function getModules() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const docSnap = await getDoc(academicRef);
    
    if (!docSnap.exists()) {
      return { modules: [], gpa: 0, totalCredits: 0 };
    }

    const data = docSnap.data();
    const modules = data.modules || [];
    const gpaData = calculateWeightedGPA(modules);

    return {
      modules,
      gpa: gpaData.gpa,
      totalCredits: gpaData.totalCredits,
      totalPoints: gpaData.totalPoints
    };
  } catch (error) {
    console.error('[AcademicService] getModules error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| ASSIGNMENT MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function addAssignment(moduleId, assignmentData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const docSnap = await getDoc(academicRef);
    if (!docSnap.exists()) throw new Error('No academic data found');

    const data = docSnap.data();
    const modules = data.modules || [];
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) throw new Error('Module not found');

    const assignment = {
      id: `asgn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...assignmentData,
      status: assignmentData.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    modules[moduleIndex].assignments = modules[moduleIndex].assignments || [];
    modules[moduleIndex].assignments.push(assignment);

    await updateDoc(academicRef, {
      modules: modules,
      updatedAt: serverTimestamp()
    });

    return assignment;
  } catch (error) {
    console.error('[AcademicService] addAssignment error:', error);
    throw error;
  }
}

export async function updateAssignment(moduleId, assignmentId, updates) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const docSnap = await getDoc(academicRef);
    if (!docSnap.exists()) throw new Error('No academic data found');

    const data = docSnap.data();
    const modules = data.modules || [];
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) throw new Error('Module not found');

    const assignmentIndex = modules[moduleIndex].assignments.findIndex(a => a.id === assignmentId);
    if (assignmentIndex === -1) throw new Error('Assignment not found');

    modules[moduleIndex].assignments[assignmentIndex] = {
      ...modules[moduleIndex].assignments[assignmentIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(academicRef, {
      modules: modules,
      updatedAt: serverTimestamp()
    });

    return modules[moduleIndex].assignments[assignmentIndex];
  } catch (error) {
    console.error('[AcademicService] updateAssignment error:', error);
    throw error;
  }
}

export async function deleteAssignment(moduleId, assignmentId) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const docSnap = await getDoc(academicRef);
    if (!docSnap.exists()) throw new Error('No academic data found');

    const data = docSnap.data();
    const modules = data.modules || [];
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) throw new Error('Module not found');

    modules[moduleIndex].assignments = modules[moduleIndex].assignments.filter(
      a => a.id !== assignmentId
    );

    await updateDoc(academicRef, {
      modules: modules,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('[AcademicService] deleteAssignment error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| ASSESSMENT MANAGEMENT
|--------------------------------------------------------------------------
*/

export async function addAssessment(moduleId, assessmentData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const docSnap = await getDoc(academicRef);
    if (!docSnap.exists()) throw new Error('No academic data found');

    const data = docSnap.data();
    const modules = data.modules || [];
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) throw new Error('Module not found');

    const assessment = {
      id: `asmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...assessmentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    modules[moduleIndex].assessments = modules[moduleIndex].assessments || [];
    modules[moduleIndex].assessments.push(assessment);

    await updateDoc(academicRef, {
      modules: modules,
      updatedAt: serverTimestamp()
    });

    return assessment;
  } catch (error) {
    console.error('[AcademicService] addAssessment error:', error);
    throw error;
  }
}

export async function updateAssessment(moduleId, assessmentId, updates) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const uid = user.uid;
    const academicRef = doc(db, 'academics', uid);
    
    const docSnap = await getDoc(academicRef);
    if (!docSnap.exists()) throw new Error('No academic data found');

    const data = docSnap.data();
    const modules = data.modules || [];
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    
    if (moduleIndex === -1) throw new Error('Module not found');

    const assessmentIndex = modules[moduleIndex].assessments.findIndex(a => a.id === assessmentId);
    if (assessmentIndex === -1) throw new Error('Assessment not found');

    modules[moduleIndex].assessments[assessmentIndex] = {
      ...modules[moduleIndex].assessments[assessmentIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(academicRef, {
      modules: modules,
      updatedAt: serverTimestamp()
    });

    return modules[moduleIndex].assessments[assessmentIndex];
  } catch (error) {
    console.error('[AcademicService] updateAssessment error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| GPA ANALYTICS
|--------------------------------------------------------------------------
*/

export async function getGPAAnalytics() {
  try {
    const data = await getModules();
    const modules = data.modules || [];

    const currentGPA = data.gpa;
    const semesterGPA = currentGPA; // Could be filtered by semester
    const targetGPA = 3.5; // Configurable target

    // Calculate grade distribution
    const gradeDistribution = {};
    modules.forEach(module => {
      const grade = module.currentGrade || 'F';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    });

    // Calculate required grades for target GPA
    const requiredGrades = {};
    if (currentGPA < targetGPA) {
      modules.forEach(module => {
        const currentPoints = calculateGPAPoints(module.currentGrade);
        const requiredPoints = (targetGPA * data.totalCredits - data.totalPoints + currentPoints * module.credits) / module.credits;
        
        // Find nearest grade
        let nearestGrade = 'A+';
        let minDiff = Infinity;
        
        Object.entries(GRADE_POINTS).forEach(([grade, points]) => {
          const diff = Math.abs(points - requiredPoints);
          if (diff < minDiff && points >= requiredPoints) {
            minDiff = diff;
            nearestGrade = grade;
          }
        });
        
        requiredGrades[module.id] = nearestGrade;
      });
    }

    // Calculate workload distribution
    const workload = modules.map(m => ({
      name: m.moduleName || m.name,
      credits: m.credits,
      assignments: (m.assignments || []).length,
      assessments: (m.assessments || []).length,
      color: m.color || '#7DD3FC'
    }));

    return {
      currentGPA,
      semesterGPA,
      targetGPA,
      predictedGPA: currentGPA, // Can be enhanced with prediction logic
      gradeDistribution,
      requiredGrades,
      workload,
      totalCredits: data.totalCredits,
      totalModules: modules.length,
      atRiskModules: modules.filter(m => calculateGPAPoints(m.currentGrade) < 2.0)
    };
  } catch (error) {
    console.error('[AcademicService] getGPAAnalytics error:', error);
    throw error;
  }
}

export async function simulateGPAScenario(gradeChanges) {
  try {
    const data = await getModules();
    const modules = data.modules || [];
    
    const simulatedModules = modules.map(module => ({
      ...module,
      simulatedGrade: gradeChanges[module.id] || module.currentGrade
    }));

    const prediction = predictGPA(modules, gradeChanges);
    
    return {
      currentGPA: data.gpa,
      simulatedGPA: prediction.predictedGPA,
      difference: (prediction.predictedGPA - data.gpa).toFixed(2),
      isImprovement: prediction.predictedGPA > data.gpa
    };
  } catch (error) {
    console.error('[AcademicService] simulateGPAScenario error:', error);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| ACADEMIC INSIGHTS
|--------------------------------------------------------------------------
*/

export async function getAcademicInsights() {
  try {
    const data = await getModules();
    const modules = data.modules || [];

    const upcomingDeadlines = [];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    modules.forEach(module => {
      // Check assignments
      (module.assignments || []).forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        if (dueDate <= weekFromNow && assignment.status !== 'completed') {
          upcomingDeadlines.push({
            ...assignment,
            moduleName: module.moduleName || module.name,
            moduleCode: module.moduleCode,
            color: module.color,
            type: 'assignment'
          });
        }
      });

      // Check assessments
      (module.assessments || []).forEach(assessment => {
        const examDate = new Date(assessment.date || assessment.examDate);
        if (examDate <= weekFromNow) {
          upcomingDeadlines.push({
            ...assessment,
            moduleName: module.moduleName || module.name,
            moduleCode: module.moduleCode,
            color: module.color,
            type: 'assessment',
            assessmentType: assessment.type
          });
        }
      });
    });

    // Sort by date
    upcomingDeadlines.sort((a, b) => {
      const dateA = new Date(a.dueDate || a.date || a.examDate);
      const dateB = new Date(b.dueDate || b.date || b.examDate);
      return dateA - dateB;
    });

    // Calculate completion rates
    const totalAssignments = modules.reduce((sum, m) => sum + (m.assignments || []).length, 0);
    const completedAssignments = modules.reduce((sum, m) => 
      sum + (m.assignments || []).filter(a => a.status === 'completed').length, 0
    );

    return {
      upcomingDeadlines,
      totalAssignments,
      completedAssignments,
      completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments * 100).toFixed(1) : 0,
      atRiskCount: modules.filter(m => calculateGPAPoints(m.currentGrade) < 2.0).length,
      highPerformers: modules.filter(m => calculateGPAPoints(m.currentGrade) >= 3.5).length
    };
  } catch (error) {
    console.error('[AcademicService] getAcademicInsights error:', error);
    throw error;
  }
}

export {
  calculateWeightedGPA,
  predictGPA,
  GRADE_POINTS,
  calculateGPAPoints
};