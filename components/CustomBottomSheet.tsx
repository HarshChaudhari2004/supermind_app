import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface CustomBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  error?: string | null;
}

const { height } = Dimensions.get('window');

const CustomBottomSheet: React.FC<CustomBottomSheetProps> = ({ 
  visible, 
  onDismiss,
  error 
}) => {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();

      const timer = setTimeout(() => {
        Animated.spring(translateY, {
          toValue: height,
          useNativeDriver: true,
          tension: 50,
          friction: 7
        }).start(() => onDismiss());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY }]
        }
      ]}
    >
      <LinearGradient
        colors={error 
          ? ['#FF4B4B', '#FF0000'] 
          : ['hsla(278, 100%, 50%, 1)', 'hsla(302, 98%, 50%, 1)']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            {error ? 'Error' : 'Nice Find'}
          </Text>
          <Text style={styles.subtitle}>
            {error || 'Adding to your Knowledge Base'}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  gradient: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 150,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
  },
});

export default CustomBottomSheet;