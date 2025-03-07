import React from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import App from '../App';

// This component wraps the App component and applies the theme
const ThemedApp: React.FC = () => {
  const { appTheme, actualTheme, fontSize } = useSettings();
  
  // Set font scaling factor based on fontSize setting
  const fontScale = fontSize === 'small' ? 0.9 : fontSize === 'large' ? 1.1 : 1;
  
  // Apply font scale to Text components globally
  // Note: This requires a Text component wrapper implementation which isn't shown here
  
  return (
    <View style={[
      styles.container, 
      { backgroundColor: appTheme.colors.background }
    ]}>
      <StatusBar
        barStyle={actualTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={appTheme.colors.background}
      />
      <App />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ThemedApp;
