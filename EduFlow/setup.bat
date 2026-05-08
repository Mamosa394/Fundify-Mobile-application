@echo off
title EduFlow React Native Structure Generator

echo Creating EduFlow project structure...

:: =========================
:: ROOT SOURCE FOLDERS
:: =========================

mkdir src
mkdir src\api
mkdir src\assets
mkdir src\components
mkdir src\constants
mkdir src\context
mkdir src\data
mkdir src\hooks
mkdir src\navigation
mkdir src\screens
mkdir src\services
mkdir src\store
mkdir src\styles
mkdir src\theme
mkdir src\utils

:: =========================
:: ASSETS
:: =========================

mkdir src\assets\fonts
mkdir src\assets\icons
mkdir src\assets\images
mkdir src\assets\animations
mkdir src\assets\models
mkdir src\assets\sounds

:: =========================
:: COMPONENTS
:: =========================

mkdir src\components\buttons
mkdir src\components\cards
mkdir src\components\charts
mkdir src\components\forms
mkdir src\components\layout
mkdir src\components\modals
mkdir src\components\navigation
mkdir src\components\three
mkdir src\components\widgets

:: =========================
:: NAVIGATION
:: =========================

type nul > src\navigation\AppNavigator.js
type nul > src\navigation\AuthNavigator.js
type nul > src\navigation\BottomTabs.js

:: =========================
:: API
:: =========================

type nul > src\api\authApi.js
type nul > src\api\budgetApi.js
type nul > src\api\scholarshipApi.js
type nul > src\api\academicApi.js
type nul > src\api\notificationApi.js

:: =========================
:: SERVICES
:: =========================

type nul > src\services\authService.js
type nul > src\services\budgetService.js
type nul > src\services\academicService.js
type nul > src\services\scholarshipService.js
type nul > src\services\aiService.js

:: =========================
:: STORE
:: =========================

type nul > src\store\authStore.js
type nul > src\store\budgetStore.js
type nul > src\store\academicStore.js
type nul > src\store\scholarshipStore.js
type nul > src\store\themeStore.js

:: =========================
:: HOOKS
:: =========================

type nul > src\hooks\useAuth.js
type nul > src\hooks\useBudget.js
type nul > src\hooks\useAcademic.js
type nul > src\hooks\useScholarships.js

:: =========================
:: CONSTANTS
:: =========================

type nul > src\constants\colors.js
type nul > src\constants\fonts.js
type nul > src\constants\mockData.js
type nul > src\constants\routes.js

:: =========================
:: THEME
:: =========================

type nul > src\theme\theme.js

:: =========================
:: UTILS
:: =========================

type nul > src\utils\formatCurrency.js
type nul > src\utils\calculateGPA.js
type nul > src\utils\dateHelpers.js
type nul > src\utils\storage.js

:: =========================
:: CONTEXT
:: =========================

type nul > src\context\AuthContext.js

:: =========================
:: STYLES
:: =========================

type nul > src\styles\globalStyles.js

:: =========================
:: SCREENS
:: =========================

mkdir src\screens\Auth
mkdir src\screens\Dashboard
mkdir src\screens\Budget
mkdir src\screens\Scholarships
mkdir src\screens\Academics
mkdir src\screens\AI
mkdir src\screens\Notifications
mkdir src\screens\Profile
mkdir src\screens\Settings

:: =========================
:: AUTH SCREENS
:: =========================

type nul > src\screens\Auth\SplashScreen.js
type nul > src\screens\Auth\OnboardingScreen.js
type nul > src\screens\Auth\LoginScreen.js
type nul > src\screens\Auth\RegisterScreen.js

:: =========================
:: DASHBOARD
:: =========================

type nul > src\screens\Dashboard\DashboardScreen.js
type nul > src\screens\Dashboard\AnalyticsScreen.js

:: =========================
:: BUDGET
:: =========================

type nul > src\screens\Budget\BudgetScreen.js
type nul > src\screens\Budget\ExpenseDetailsScreen.js
type nul > src\screens\Budget\AddExpenseScreen.js

:: =========================
:: SCHOLARSHIPS
:: =========================

type nul > src\screens\Scholarships\ScholarshipScreen.js
type nul > src\screens\Scholarships\ScholarshipDetailsScreen.js
type nul > src\screens\Scholarships\FundingTrackerScreen.js

:: =========================
:: ACADEMICS
:: =========================

type nul > src\screens\Academics\AcademicScreen.js
type nul > src\screens\Academics\CourseDetailsScreen.js
type nul > src\screens\Academics\GPATrackerScreen.js
type nul > src\screens\Academics\AssignmentScreen.js

:: =========================
:: AI
:: =========================

type nul > src\screens\AI\AIAssistantScreen.js

:: =========================
:: NOTIFICATIONS
:: =========================

type nul > src\screens\Notifications\NotificationScreen.js

:: =========================
:: PROFILE
:: =========================

type nul > src\screens\Profile\ProfileScreen.js

:: =========================
:: SETTINGS
:: =========================

type nul > src\screens\Settings\SettingsScreen.js

:: =========================
:: THREE.JS COMPONENTS
:: =========================

type nul > src\components\three\BudgetGalaxy.js
type nul > src\components\three\AcademicSphere.js
type nul > src\components\three\ScholarshipTimeline.js
type nul > src\components\three\AIOrb.js

:: =========================
:: COMMON COMPONENTS
:: =========================

type nul > src\components\cards\StatCard.js
type nul > src\components\cards\GlassCard.js

type nul > src\components\buttons\PrimaryButton.js

type nul > src\components\charts\BudgetChart.js
type nul > src\components\charts\GPAGraph.js

type nul > src\components\widgets\QuickActionWidget.js
type nul > src\components\widgets\AcademicWidget.js

echo.
echo ====================================
echo EduFlow structure created successfully!
echo ====================================

pause