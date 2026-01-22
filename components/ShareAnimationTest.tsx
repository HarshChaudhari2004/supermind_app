import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import ShareConfirmationOverlay from './ShareConfirmationOverlay';

/**
 * Test component for the ShareConfirmationOverlay
 * 
 * Usage:
 * 1. Import this component in App.tsx during development
 * 2. Add it to your render tree: <ShareAnimationTest />
 * 3. Tap the "Test Share Animation" button to trigger the animation
 * 4. Remove or comment out before production build
 */
const ShareAnimationTest: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);

  const triggerAnimation = () => {
    console.log('[Test] Triggering share animation');
    setShowOverlay(true);
  };

  const handleComplete = () => {
    console.log('[Test] Animation completed');
    setShowOverlay(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={triggerAnimation}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>Test Share Animation</Text>
      </TouchableOpacity>

      {showOverlay && (
        <ShareConfirmationOverlay onComplete={handleComplete} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  button: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ShareAnimationTest;
