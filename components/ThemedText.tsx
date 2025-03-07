import React from 'react';
import { Text, TextProps } from 'react-native';
import { useSettings } from '../context/SettingsContext';

interface ThemedTextProps extends TextProps {
  variant?: 'body' | 'title' | 'heading' | 'caption';
}

const ThemedText: React.FC<ThemedTextProps> = ({ 
  style, 
  children, 
  variant = 'body',
  ...props 
}) => {
  const { fontSize, appTheme } = useSettings();
  
  // Base sizes for different text variants
  const baseSizes = {
    heading: 20,
    title: 18,
    body: 16,
    caption: 14,
  };
  
  // Scaling factor based on user preference
  const scaleFactor = fontSize === 'small' ? 0.9 : fontSize === 'large' ? 1.2 : 1;
  
  const scaledSize = Math.round(baseSizes[variant] * scaleFactor);
  
  return (
    <Text 
      style={[
        { 
          fontSize: scaledSize,
          color: appTheme.colors.text 
        }, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

export default ThemedText;
