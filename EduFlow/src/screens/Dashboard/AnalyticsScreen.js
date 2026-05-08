import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AnalyticsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Planner</Text>
      <Text style={styles.subtitle}>Screen placeholder (rebuilt)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220' },
  title: { color: '#e2e8f0', fontSize: 24, fontWeight: '800' },
  subtitle: { color: 'rgba(226,232,240,0.7)', marginTop: 8 },
});

