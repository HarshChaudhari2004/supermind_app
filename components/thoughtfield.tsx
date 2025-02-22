import React, { useState, useEffect } from 'react';
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
  // Group all state declarations together
  const [thought, setThought] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const expandAnim = useState(new Animated.Value(120))[0];

  // Add back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isExpanded) {
        handleBlur();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [isExpanded]);

  const handleFocus = () => {
    setIsExpanded(true);
    Animated.spring(expandAnim, {
      toValue: Dimensions.get('window').height,
      useNativeDriver: false,
      friction: 8,
      tension: 20,
    }).start();
  };

  const handleBlur = () => {
    setIsExpanded(false);
    Animated.spring(expandAnim, {
      toValue: 120,
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
        style={[styles.background, isExpanded && styles.expandedBackground]}
      >
        <View style={styles.header}>
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
          style={[styles.input, isExpanded && styles.expandedInput]}
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
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 70,
    left: 10,
    right: 10,
    minHeight: 120,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 5.84,
    zIndex: 9999,
  },
  expandedContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
    backgroundColor: '#1a1a1a',
  },
  checkMarkContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  checkMark: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  background: {
    flex: 1,
    padding: 20, // Increased padding
  },
  heading: {
    color: 'hsla(278, 100%, 50%, 1)',
    fontSize: 20, // Increased font size
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    // Text input sizing
    minHeight: 80,       // Minimum height when collapsed
    maxHeight: 150,      // Maximum height when expanded
    padding: 12,         // Internal padding
    
    // Text styling
    color: '#fff',
    fontSize: 18,        // Text size
    
    // Visual
    backgroundColor: '#333',
    borderRadius: 12,
    textAlignVertical: 'top',
  },
  saveButtonGradient: {
    marginTop: 12,
    borderRadius: 25,
    alignSelf: 'flex-end',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedBackground: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  checkButton: {
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 24,
  },
  expandedInput: {
    flex: 1,
    fontSize: 18,
    minHeight: 200,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ThoughtField;
