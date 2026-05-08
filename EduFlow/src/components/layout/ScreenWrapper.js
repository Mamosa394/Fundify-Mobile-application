import React from 'react';
import { Platform, KeyboardAvoidingView, StatusBar, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

/**
 * Global iOS/Android layout wrapper for consistent safe-area + keyboard behavior.
 */
export default function ScreenWrapper({
  children,
  backgroundColor = '#e2e8f0',
  edges = ['top', 'bottom'],
  barStyle = 'dark-content',
  translucentStatusBar = true,
  keyboardAvoiding = true,
}) {
  const content = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {children}
    </KeyboardAvoidingView>
  ) : (
    <View style={styles.root}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor }]}
      edges={edges}
    >
      <StatusBar
        translucent={translucentStatusBar}
        backgroundColor="transparent"
        barStyle={barStyle}
      />
      {content}
    </SafeAreaView>
  );
}

