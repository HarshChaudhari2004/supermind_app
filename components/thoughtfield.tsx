import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Alert,
  Dimensions,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { ViewStyle } from 'react-native';
import { supabase } from '../lib/supabase';
import LinearGradient from 'react-native-linear-gradient';
import { useSettings } from '../context/SettingsContext'; // Add this import

// Add this helper function at the top of the file
const generateSmartTitle = (text: string): string => {
  // First try to get the first sentence
  const firstSentence = text.split(/[.!?]\s+/)[0];
  
  // If first sentence is too long, get first line
  if (firstSentence.length > 100) {
    const firstLine = text.split('\n')[0];
    // If first line is still too long, truncate with ellipsis
    return firstLine.length > 100 ? 
      firstLine.slice(0, 97) + '...' : 
      firstLine;
  }
  
  return firstSentence;
};

interface ThoughtFieldProps {
  onRefresh?: () => void;  // Add this prop
  style?: ViewStyle;  // Add style prop
}

// Add CheckMark SVG component
const CheckMarkIcon = () => (
  <View style={styles.checkMarkContainer}>
    <Text style={styles.checkMark}>✓</Text>
  </View>
);

// Update ThoughtField styles and animation values
export const ThoughtField: React.FC<ThoughtFieldProps> = ({ onRefresh, style }) => {
  // State management
  const [thought, setThought] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Animation value for smooth transitions
  const expandAnim = useState(new Animated.Value(80))[0]; // Reduced initial height

  // Reference to control the TextInput
  const inputRef = useRef<TextInput>(null);

  // Get screen dimensions for proper positioning
  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
  const statusBarHeight = StatusBar.currentHeight || 0;

  // Handle Android back button when expanded
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isExpanded) {
        handleBlur();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isExpanded]);

  // Expand animation handler
  const handleFocus = () => {
    setIsExpanded(true);
    
    // Animate to full screen with spring animation for smooth expansion
    Animated.spring(expandAnim, {
      toValue: screenHeight,
      useNativeDriver: false,
      friction: 8,
      tension: 20,
    }).start();
    
    // Focus the input after animation starts
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Collapse animation handler
  const handleBlur = () => {
    setIsExpanded(false);
    inputRef.current?.blur();
    // Animate back to minimized state
    Animated.spring(expandAnim, {
      toValue: 80, // Reduced collapsed height
      useNativeDriver: false,
      friction: 8,
      tension: 20,
    }).start();
  };

  const saveThought = async () => {
    if (!thought.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const { error } = await supabase
        .from('content')
        .insert({
          id: Math.random().toString(36).substr(2, 9),
          user_id: user.id,
          title: generateSmartTitle(thought),
          video_type: 'note',
          tags: 'quick_note',
          user_notes: thought,
          date_added: new Date().toISOString(),
          thumbnail_url: null,
          original_url: null,
          channel_name: 'Quick Notes'
        });

      if (error) throw error;

      setThought('');
      handleBlur();
      onRefresh?.();
      Alert.alert('Success', 'Note saved successfully');
    } catch (error) {
      console.error('Error saving thought:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // Add this line to get theme
  const { appTheme } = useSettings();
  const { colors } = appTheme;

  // Create dynamic styles using the theme
  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    input: {
      ...styles.input,
      color: colors.text,
    },
    placeholder: {
      color: colors.textSecondary, // This was missing a reference
    },
    submitButton: {
      backgroundColor: colors.surfaceVariant, // This was missing a reference
    },
  };

  return (
    <>
      {/* When expanded, render a full-screen overlay to handle keyboard properly */}
      {isExpanded ? (
        <View style={styles.fullScreenContainer}>
          <Animated.View 
            style={[
              dynamicStyles.container,
              styles.expandedContainer,
              { height: expandAnim }
            ]}
          >
            <LinearGradient
              colors={['#1a1a1a', '#2a2a2a']}
              style={styles.expandedBackground}
            >
              <View style={styles.expandedHeader}>
                <Text style={styles.heading}>Quick Note</Text>
                <TouchableOpacity 
                  style={[styles.checkButton, isSaving && styles.buttonDisabled]} 
                  onPress={saveThought}
                  disabled={isSaving || !thought.trim()}
                >
                  <CheckMarkIcon />
                </TouchableOpacity>
              </View>
              
              <View style={styles.expandedInputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.expandedInput}
                  placeholder="Start typing here..."
                  placeholderTextColor="#666"
                  multiline
                  value={thought}
                  onChangeText={setThought}
                  autoFocus={true}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      ) : (
        /* Collapsed state - fixed at bottom */
        <View style={styles.collapsedWrapper}>
          <LinearGradient
            colors={['#1a1a1a', '#2a2a2a']}
            style={styles.background}
          >
            <View style={styles.header}>
              <Text style={styles.heading}>Quick Note</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.collapsedContainer}
              onPress={handleFocus}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.placeholder,
                { color: colors.textSecondary }
              ]}>Start typing here...</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Full screen container for expanded state
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  
  // Collapsed wrapper fixed at bottom
  collapsedWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    margin: 10,
    borderRadius: 16,
    minHeight: 80,
    shadowColor: 'hsla(278, 100%, 50%, 0.7)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 1000,
  },
  
  // Container styles
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 8,
    zIndex: 1000,
    // Restore glow effect
    shadowColor: 'hsla(278, 100%, 50%, 0.7)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  
  // Expanded container styles
  expandedContainer: {
    width: '100%',
    height: '100%',
    margin: 0,
    borderRadius: 0,
    backgroundColor: '#1a1a1a',
    zIndex: 9999,
    elevation: 9999,
  },

  // Background gradient styles
  background: {
    flex: 1,
    padding: 16,
    borderRadius: 16, // Match container border radius
    borderWidth: 1,
    borderColor: 'hsla(278, 100%, 50%, 0.3)', // Add subtle border
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  expandedHeader: {
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight || 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Title styles
  heading: {
    color: 'hsla(278, 100%, 50%, 1)',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Add this style for the collapsed state container
  collapsedContainer: {
    minHeight: 40,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
  },
  
  // Add this for placeholder text in collapsed state
  placeholder: {
    color: '#666',
    fontSize: 16,
  },

  // Input field styles - collapsed state
  collapsedInput: {
    minHeight: 40, // Reduced height when collapsed
    maxHeight: 40,
    fontSize: 16,
    marginBottom: 4, // Add small bottom margin
  },

  // Basic input styles
  input: {
    color: '#fff',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
  },

  // Add this for better input container in expanded mode
  expandedInputContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },

  // Input field styles - expanded state
  expandedInput: {
    flex: 1,
    fontSize: 18,
    color: '#fff',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 200,
  },

  // Background styles for expanded state
  expandedBackground: {
    flex: 1,
    borderRadius: 0,
  },

  // Check button styles
  checkButton: {
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 24,
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.5,
  },
 
  // CheckMark icon styles
  checkMarkContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  checkMark: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Add these missing styles
  submitButton: {
    backgroundColor: '#333', // Default color that will be overridden by dynamicStyles
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
});

export default ThoughtField;
