import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import MasonryList from '@react-native-seoul/masonry-list';

interface CardSkeletonProps {
  numColumns?: number;
}

// Define common aspect ratios
const ASPECT_RATIOS = [
  16/9,  // YouTube landscape
  9/16,  // Instagram stories/reels
  4/3,   // Traditional photos
  1/1,   // Square photos
  3/2    // Common photo ratio
];

// Base heights for different content types (in pixels)
const BASE_HEIGHTS = {
  small: 120,
  medium: 160,
  large: 200
};

const SkeletonCard = () => {
  const animatedValue = new Animated.Value(0);

  // Generate random but consistent dimensions for each card
  const aspectRatio = ASPECT_RATIOS[Math.floor(Math.random() * ASPECT_RATIOS.length)];
  const baseHeight = Object.values(BASE_HEIGHTS)[Math.floor(Math.random() * 3)];
  const width = '100%';
  const height = baseHeight;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.card}>
      <Animated.View 
        style={[
          styles.thumbnail, 
          { 
            opacity,
            height,
            aspectRatio
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.titleBar, 
          { opacity }
        ]} 
      />
      <Animated.View 
        style={[
          styles.titleBarSmall, 
          { 
            opacity,
            width: `${Math.random() * 40 + 40}%` // Random width between 40-80%
          }
        ]} 
      />
    </View>
  );
};

const CardSkeleton: React.FC<CardSkeletonProps> = ({ numColumns = 2 }) => {
  // Generate skeleton items with stable keys
  const skeletonData = Array.from({ length: 8 }, (_, index) => ({
    id: index,
    key: `skeleton-${index}`
  }));

  return (
    <MasonryList
      data={skeletonData}
      keyExtractor={item => item.key}
      numColumns={numColumns}
      renderItem={() => <SkeletonCard />}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 7,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  thumbnail: {
    width: '100%',
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
  },
  titleBar: {
    height: 15,
    backgroundColor: '#3a3a3a',
    borderRadius: 4,
    marginTop: 10,
    marginHorizontal: 5,
  },
  titleBarSmall: {
    height: 15,
    backgroundColor: '#3a3a3a',
    borderRadius: 4,
    marginTop: 5,
    marginHorizontal: 5,
    marginBottom: 10,
  },
});

export default CardSkeleton;
