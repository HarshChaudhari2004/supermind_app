import React, { useRef } from "react";
import { StyleSheet, View, NativeModules, Dimensions } from "react-native";
// Get device screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
import LottieView from "lottie-react-native";

// Import the Lottie animation JSON
import animation from "../assets/sharesheet_anim.json";

const { ShareExtensionModule } = NativeModules;

interface Props {
  onComplete?: () => void;
  sharedContent?: string;
}

export default function ShareConfirmationOverlay({ onComplete }: Props) {
  const animationRef = useRef<LottieView>(null);

  const handleAnimationFinish = () => {
    if (!onComplete && ShareExtensionModule) {
      ShareExtensionModule.closeShareActivity();
    } else if (onComplete) {
      onComplete();
    }
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <LottieView
        ref={animationRef}
        source={animation}
        autoPlay
        loop={false}
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        resizeMode="cover"
        onAnimationFinish={handleAnimationFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.11)",
    zIndex: 99999, // ensure topmost
    elevation: 99999, // for Android
  },
  // lottie style is now set inline for dynamic sizing
  lottie: {},
});
