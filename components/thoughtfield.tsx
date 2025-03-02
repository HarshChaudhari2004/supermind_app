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
} from 'react-native';
import { ViewStyle } from 'react-native';
import { supabase } from '../lib/supabase';
import LinearGradient from 'react-native-linear-gradient';

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
      toValue: Dimensions.get('window').height,
      useNativeDriver: false,
      friction: 8,
      tension: 20,
    }).start();
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

  return (
    <Animated.View 
      style={[
        styles.container, 
        { height: expandAnim },
        style,
        isExpanded && styles.expandedContainer
      ]}
    >
      <LinearGradient
        colors={['#1a1a1a', '#2a2a2a']}
        style={[
          styles.background,
          isExpanded && styles.expandedBackground
        ]}
      >
        <View style={[
          styles.header,
          isExpanded && styles.expandedHeader
        ]}>
          <Text style={styles.heading}>Quick Note</Text>
          {isExpanded && (
            <TouchableOpacity 
              style={[styles.checkButton, isSaving && styles.buttonDisabled]} 
              onPress={saveThought}
              disabled={isSaving || !thought.trim()}
            >
              <CheckMarkIcon />
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          ref={inputRef}
          style={[
            styles.input, 
            isExpanded && styles.expandedInput,
            !isExpanded && styles.collapsedInput
          ]}
          placeholder="Start typing here..."
          placeholderTextColor="#666"
          multiline
          value={thought}
          onChangeText={setThought}
          onFocus={handleFocus}
          autoFocus={isExpanded}
        />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Container styles
  container: {
    position: 'absolute',
    bottom: 10, // Add some bottom spacing
    left: 10,   // Add side margins
    right: 10,  // Add side margins
    margin: 0,
    minHeight: 100,
    borderRadius: 10, // Make all corners rounded
    overflow: 'visible', // Changed to show glow
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    margin: 0,
    borderRadius: 0,
    backgroundColor: '#1a1a1a',
    zIndex: 9999,
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
    paddingTop: Platform.OS === 'ios' ? 40 : 16, // Account for status bar
    marginBottom: 16,
  },

  // Title styles
  heading: {
    color: 'hsla(278, 100%, 50%, 1)',
    fontSize: 20,
    fontWeight: 'bold',
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

  // Input field styles - expanded state
  expandedInput: {
    flex: 1,
    fontSize: 18,
    minHeight: '100%',
    backgroundColor: '#2a2a2a',
  },

  // Background styles for expanded state
  expandedBackground: {
    borderRadius: 0,
    paddingTop: 0,
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
});

export default ThoughtField;
