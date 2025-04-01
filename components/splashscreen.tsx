// components/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Text, Animated, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Logo scale up with spring
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      // Logo fade in
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Text fade in and slide up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.appName}>SuperMind</Text>
        <Text style={styles.tagline}>Your Second Brain</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(188, 16, 227, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tagline: {
    color: '#bc10e3',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 2,
    opacity: 0.8,
  },
});

export default SplashScreen;