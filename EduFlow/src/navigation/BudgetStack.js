// navigation/BudgetStack.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BudgetScreen from '../screens/Budget/BudgetScreen';
import BudgetSetupWizard from '../screens/Budget/BudgetSetupWizard';
import ExpenseDetailScreen from '../screens/Budget/ExpenseDetailScreen';
import AddExpenseModal from '../screens/Budget/AddExpenseModal';
import AIAdvisorScreen from '../screens/Budget/AIAdvisorScreen';
import NotificationScreen from '../screens/Notifications/NotificationScreen';

const Stack = createStackNavigator();

export default function BudgetStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F2F2F7' },
      }}
    >
      {/* Main Budget Screen */}
      <Stack.Screen name="BudgetMain" component={BudgetScreen} />
      
      {/* Budget Setup Wizard - shown when no budget exists */}
      <Stack.Screen name="BudgetSetupWizard" component={BudgetSetupWizard} />
      
      {/* Expense Details */}
      <Stack.Screen name="ExpenseDetailScreen" component={ExpenseDetailScreen} />
      
      {/* AI Advisor */}
      <Stack.Screen name="AIAdvisor" component={AIAdvisorScreen} />
      
      {/* Notification Settings */}
      <Stack.Screen name="NotificationSettings" component={NotificationScreen} />
      
      {/* Add Expense Modal - presented as modal */}
      <Stack.Screen 
        name="AddExpenseModal" 
        component={AddExpenseModal}
        options={{
          presentation: 'modal',
          animationEnabled: true,
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack.Navigator>
  );
}