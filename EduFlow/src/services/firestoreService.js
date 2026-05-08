import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, BACKEND_URL } from './firebase';

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}${endpoint}`;
  console.log('API Request:', url, options.method || 'GET');
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API Response success:', endpoint);
    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

export const loadUserData = async (userId) => {
  console.log('Loading user data for:', userId);
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      console.log('User data loaded successfully');
      return userDoc.data();
    } else {
      console.log('No user data found for:', userId);
      return null;
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    throw error;
  }
};

export const saveUserProfile = async (userId, profileData) => {
  console.log('Saving user profile for:', userId);
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log('User profile saved successfully');
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

export const addExpense = async (userId, expenseData) => {
  console.log('Adding expense for user:', userId, expenseData);
  try {
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const docRef = await addDoc(expensesRef, {
      ...expenseData,
      amount: Number(expenseData.amount),
      date: expenseData.date || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    });
    console.log('Expense added with ID:', docRef.id);
    return { id: docRef.id, ...expenseData };
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

export const getExpenses = async (userId) => {
  console.log('Getting expenses for user:', userId);
  try {
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const q = query(expensesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Retrieved ${expenses.length} expenses`);
    return expenses;
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

export const getScholarships = async (userId) => {
  console.log('Getting scholarships for user:', userId);
  try {
    const scholarshipsRef = collection(db, 'scholarships');
    const q = query(scholarshipsRef, orderBy('deadline', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const userScholarshipsRef = collection(db, 'users', userId, 'savedScholarships');
    const userScholarshipsSnapshot = await getDocs(userScholarshipsRef);
    const savedMap = new Map();
    userScholarshipsSnapshot.docs.forEach(doc => {
      savedMap.set(doc.id, doc.data());
    });
    
    const scholarships = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      saved: savedMap.has(doc.id),
      applied: savedMap.get(doc.id)?.applied || false
    }));
    
    console.log(`Retrieved ${scholarships.length} scholarships`);
    return scholarships;
  } catch (error) {
    console.error('Error getting scholarships:', error);
    throw error;
  }
};

export const updateScholarshipStatus = async (userId, scholarshipId, status) => {
  console.log('Updating scholarship status:', userId, scholarshipId, status);
  try {
    const userScholarshipRef = doc(db, 'users', userId, 'savedScholarships', scholarshipId);
    await setDoc(userScholarshipRef, {
      ...status,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('Scholarship status updated');
  } catch (error) {
    console.error('Error updating scholarship status:', error);
    throw error;
  }
};

export const addCourse = async (userId, courseData) => {
  console.log('Adding course for user:', userId, courseData);
  try {
    const coursesRef = collection(db, 'users', userId, 'courses');
    const docRef = await addDoc(coursesRef, {
      ...courseData,
      attendance: courseData.attendance || 0,
      studyHours: courseData.studyHours || 0,
      mark: courseData.mark || 0,
      createdAt: serverTimestamp()
    });
    console.log('Course added with ID:', docRef.id);
    return { id: docRef.id, ...courseData };
  } catch (error) {
    console.error('Error adding course:', error);
    throw error;
  }
};

export const getCourses = async (userId) => {
  console.log('Getting courses for user:', userId);
  try {
    const coursesRef = collection(db, 'users', userId, 'courses');
    const querySnapshot = await getDocs(coursesRef);
    const courses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Retrieved ${courses.length} courses`);
    return courses;
  } catch (error) {
    console.error('Error getting courses:', error);
    throw error;
  }
};

export const updateCourseProgress = async (userId, courseId, updates) => {
  console.log('Updating course progress:', userId, courseId, updates);
  try {
    const courseRef = doc(db, 'users', userId, 'courses', courseId);
    await updateDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('Course progress updated');
  } catch (error) {
    console.error('Error updating course progress:', error);
    throw error;
  }
};

export const addPlannerTask = async (userId, taskData) => {
  console.log('Adding planner task for user:', userId, taskData);
  try {
    const tasksRef = collection(db, 'users', userId, 'plannerTasks');
    const docRef = await addDoc(tasksRef, {
      ...taskData,
      done: false,
      createdAt: serverTimestamp()
    });
    console.log('Planner task added with ID:', docRef.id);
    return { id: docRef.id, ...taskData, done: false };
  } catch (error) {
    console.error('Error adding planner task:', error);
    throw error;
  }
};

export const getPlannerTasks = async (userId) => {
  console.log('Getting planner tasks for user:', userId);
  try {
    const tasksRef = collection(db, 'users', userId, 'plannerTasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Retrieved ${tasks.length} planner tasks`);
    return tasks;
  } catch (error) {
    console.error('Error getting planner tasks:', error);
    throw error;
  }
};

export const updatePlannerTask = async (userId, taskId, updates) => {
  console.log('Updating planner task:', userId, taskId, updates);
  try {
    const taskRef = doc(db, 'users', userId, 'plannerTasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('Planner task updated');
  } catch (error) {
    console.error('Error updating planner task:', error);
    throw error;
  }
};

export const addNotification = async (userId, notificationData) => {
  console.log('Adding notification for user:', userId, notificationData);
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      ...notificationData,
      read: false,
      createdAt: serverTimestamp()
    });
    console.log('Notification added with ID:', docRef.id);
    return { id: docRef.id, ...notificationData, read: false };
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
};

export const getNotifications = async (userId) => {
  console.log('Getting notifications for user:', userId);
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const notifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Retrieved ${notifications.length} notifications`);
    return notifications;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const markNotificationRead = async (userId, notificationId) => {
  console.log('Marking notification as read:', userId, notificationId);
  try {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
    console.log('Notification marked as read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const sendAIMessage = async (userId, userMessage, context) => {
  console.log('Sending AI message for user:', userId, userMessage);
  try {
    const messagesRef = collection(db, 'users', userId, 'aiMessages');
    
    await addDoc(messagesRef, {
      role: 'student',
      text: userMessage,
      timestamp: serverTimestamp()
    });
    console.log('User message saved');
    
    const aiResponseText = generateAIResponse(userMessage, context);
    
    const aiMessageRef = await addDoc(messagesRef, {
      role: 'advisor',
      text: aiResponseText,
      timestamp: serverTimestamp()
    });
    
    console.log('AI response generated and saved');
    return { id: aiMessageRef.id, role: 'advisor', text: aiResponseText };
  } catch (error) {
    console.error('Error sending AI message:', error);
    throw error;
  }
};

export const getAIMessages = async (userId) => {
  console.log('Getting AI messages for user:', userId);
  try {
    const messagesRef = collection(db, 'users', userId, 'aiMessages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Retrieved ${messages.length} AI messages`);
    return messages;
  } catch (error) {
    console.error('Error getting AI messages:', error);
    throw error;
  }
};

function generateAIResponse(message, context) {
  console.log('Generating AI response for:', message);
  const lower = message.toLowerCase();
  
  if (lower.includes('survive') || lower.includes('month') || lower.includes('budget')) {
    const spent = context.expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const left = (context.monthlyIncome || 0) - spent;
    const response = `You have ${currency(left)} left. At your current pace, cap daily spending at ${currency(Math.max(0, Math.floor(left / 12)))} for the next 12 days.`;
    console.log('Budget-related response generated');
    return response;
  }
  
  if (lower.includes('scholar') || lower.includes('burs')) {
    const top = context.scholarships?.[0];
    if (top) {
      const response = `${top.title} is your strongest match. Save it and apply before the ${top.deadline} deadline.`;
      console.log('Scholarship-related response generated');
      return response;
    }
    console.log('No scholarships found for response');
    return "Check the scholarships tab for available opportunities based on your profile.";
  }
  
  if (lower.includes('gpa') || lower.includes('exam') || lower.includes('study')) {
    const marks = context.courses?.map(c => c.mark).filter(m => m) || [];
    const avgMark = marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : 0;
    const gpa = Math.min(4, Math.max(0, avgMark / 25)).toFixed(2);
    const response = `Your current academic average is ${avgMark}%, roughly ${gpa} GPA. Add focused study hours to protect scholarship standing.`;
    console.log('GPA-related response generated');
    return response;
  }
  
  console.log('Default response generated');
  return "I can help with budgeting, scholarship matches, funding status, GPA planning, and month-end survival. Ask me something specific!";
}

function currency(value) {
  return `R ${Number(value || 0).toLocaleString('en-ZA')}`;
}