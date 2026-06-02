// src/store/academicStore.js

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AcademicService from '../services/academicService';

const useAcademicStore = create(
  persist(
    (set, get) => ({
      // State
      modules: [],
      gpa: 0,
      totalCredits: 0,
      totalPoints: 0,
      isLoading: false,
      isRefreshing: false,
      error: null,
      currentSemester: '2024-1',
      analytics: null,
      insights: null,

      // Actions
      setCurrentSemester: (semester) => set({ currentSemester: semester }),

      fetchModules: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await AcademicService.getModules();
          set({
            modules: data.modules || [],
            gpa: data.gpa || 0,
            totalCredits: data.totalCredits || 0,
            totalPoints: data.totalPoints || 0,
            isLoading: false,
          });
        } catch (error) {
          set({ error: error.message, isLoading: false });
          console.error('fetchModules error:', error);
        }
      },

      addModule: async (moduleData) => {
        set({ isLoading: true, error: null });
        try {
          const module = await AcademicService.addModule(moduleData);
          await get().fetchModules();
          await get().fetchAnalytics();
          await get().fetchInsights();
          set({ isLoading: false });
          return module;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateModule: async (moduleId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updatedModule = await AcademicService.updateModule(
            moduleId,
            updates
          );
          await get().fetchModules();
          await get().fetchAnalytics();
          set({ isLoading: false });
          return updatedModule;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteModule: async (moduleId) => {
        set({ isLoading: true, error: null });
        try {
          await AcademicService.deleteModule(moduleId);
          await get().fetchModules();
          await get().fetchAnalytics();
          await get().fetchInsights();
          set({ isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      addAssignment: async (moduleId, assignmentData) => {
        set({ isLoading: true, error: null });
        try {
          const assignment = await AcademicService.addAssignment(
            moduleId,
            assignmentData
          );
          await get().fetchModules();
          await get().fetchAnalytics();
          await get().fetchInsights();
          set({ isLoading: false });
          return assignment;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateAssignment: async (moduleId, assignmentId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await AcademicService.updateAssignment(
            moduleId,
            assignmentId,
            updates
          );
          await get().fetchModules();
          await get().fetchAnalytics();
          set({ isLoading: false });
          return updated;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteAssignment: async (moduleId, assignmentId) => {
        set({ isLoading: true, error: null });
        try {
          await AcademicService.deleteAssignment(moduleId, assignmentId);
          await get().fetchModules();
          await get().fetchAnalytics();
          await get().fetchInsights();
          set({ isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      addAssessment: async (moduleId, assessmentData) => {
        set({ isLoading: true, error: null });
        try {
          const assessment = await AcademicService.addAssessment(
            moduleId,
            assessmentData
          );
          await get().fetchModules();
          await get().fetchAnalytics();
          await get().fetchInsights();
          set({ isLoading: false });
          return assessment;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateAssessment: async (moduleId, assessmentId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await AcademicService.updateAssessment(
            moduleId,
            assessmentId,
            updates
          );
          await get().fetchModules();
          await get().fetchAnalytics();
          set({ isLoading: false });
          return updated;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchAnalytics: async () => {
        try {
          const analytics = await AcademicService.getGPAAnalytics();
          set({ analytics });
        } catch (error) {
          console.error('Error fetching analytics:', error);
        }
      },

      fetchInsights: async () => {
        try {
          const insights = await AcademicService.getAcademicInsights();
          set({ insights });
        } catch (error) {
          console.error('Error fetching insights:', error);
        }
      },

      simulateGPA: async (gradeChanges) => {
        try {
          return await AcademicService.simulateGPAScenario(gradeChanges);
        } catch (error) {
          console.error('Error simulating GPA:', error);
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'academic-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentSemester: state.currentSemester,
        modules: state.modules,
        gpa: state.gpa,
        totalCredits: state.totalCredits,
        totalPoints: state.totalPoints,
      }),
    }
  )
);

export default useAcademicStore;