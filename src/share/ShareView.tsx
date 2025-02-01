import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export default function ShareView() {
  return (
    <LinearGradient
      colors={['hsla(278, 100%, 50%, 1)', 'hsla(302, 98%, 50%, 1)']}
      style={styles.container}>
      <Text style={styles.text}>Processing...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
  },
});