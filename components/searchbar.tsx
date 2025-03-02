import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Text,
  Alert,
  BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Hamburger from './hamburger';
import { sendUrlToBackend } from '../services/api';
import { supabase } from '../lib/supabase';
import { SearchResult } from '../types';

// Helper functions
function isYouTubeUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}
function isInstagramUrl(url: string) {
  return url.includes("instagram.com");
}

// Expose the search function through props
interface SearchBarProps {
  placeholder?: string;
  onSearch: (text: string) => void;
  value: string;
  onAddCard?: () => void;
  onFocusChange?: (focused: boolean) => void; // Add this prop
}

// Update the performSmartSearch function
export const performSmartSearch = async (query: string): Promise<SearchResult[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use direct database search for empty query
    if (!query.trim()) {
      const { data: recentData, error: recentError } = await supabase
        .from('content')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false })
        .limit(50);

      if (recentError) throw recentError;
      return recentData || [];
    }

    // Call the search_content function for non-empty queries
    const { data, error } = await supabase
      .rpc('search_content', {
        search_query: query.toLowerCase()
      })
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];

  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

// Update the SearchBar component to handle real-time search
const SearchBar: React.FC<SearchBarProps> = ({
  onAddCard, // This is our manual refresh trigger
  placeholder = "Search your Mind... ",
  onSearch,
  value,
  onFocusChange, // Add this prop
}) => {
  const [typedValue, setTypedValue] = useState(value);
  const [plusMenuVisible, setPlusMenuVisible] = useState(false);
  const [addCardVisible, setAddCardVisible] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Add debounce timer ref
  const searchTimerRef = useRef<NodeJS.Timeout>();

  const clearSearch = () => {
    setTypedValue('');
    onSearch(''); // This will now trigger ThoughtField visibility
    inputRef.current?.blur(); // Make sure the input loses focus
  };

  const handleOutsidePress = () => {
    if (inputRef.current?.isFocused()) {
      inputRef.current?.blur();
      onFocusChange?.(false);
    }
  };

  const handleSendUrl = async (url: string) => {
    setIsProcessing(true);
    try {
      await sendUrlToBackend(url);
      setAddCardVisible(false);
      setNewUrl('');
      Alert.alert("Success", "Added to your knowledge base");
      // Trigger a refresh in parent component
      if (onAddCard) {
        onAddCard(); // Manually trigger refresh
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : 'Failed to process URL');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSendButton = () => (
    <TouchableOpacity
      style={[
        styles.button, 
        styles.sendButton, 
        isProcessing && styles.buttonDisabled
      ]}
      disabled={isProcessing || !newUrl.trim()}
      onPress={() => {
        if (newUrl.trim()) {
          handleSendUrl(newUrl);
        }
      }}
    >
      <Text style={styles.buttonText}>
        {isProcessing ? 'Processing...' : 'Send'}
      </Text>
    </TouchableOpacity>
  );

  // Update handleSearchChange to be real-time
  const handleSearchChange = (text: string) => {
    setTypedValue(text);
    
    // Clear existing timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Set new timer for 150ms debounce (reduced from 300ms)
    searchTimerRef.current = setTimeout(() => {
      onSearch(text);
    }, 150);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // Update back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (inputRef.current?.isFocused()) {
        inputRef.current?.blur();
        onFocusChange?.(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [onFocusChange]);

  // Update handleFocus and handleBlur
  const handleFocus = () => {
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    onFocusChange?.(false);
  };

  return (
    <>
      <LinearGradient
        colors={['hsla(278, 100%, 50%, 1)', 'hsla(302, 98%, 50%, 1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={handleOutsidePress}
        >
          <View style={styles.row}>
            {/* Use the new <Hamburger /> component */}
            <Hamburger />

            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#ffffff"
              onChangeText={(text) => {
                handleSearchChange(text);
              }}
              value={typedValue}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />

            <TouchableOpacity onPress={typedValue ? clearSearch : () => setPlusMenuVisible(true)}>
              <Image 
                source={typedValue ? require('../assets/close.png') : require('../assets/plus.png')} 
                style={styles.icon} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Plus menu modal */}
      <Modal visible={plusMenuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setPlusMenuVisible(false)}>
          <View style={styles.menu}>
            <TouchableOpacity onPress={() => { /* Handle Add Image */ }}>
              <Text style={styles.menuText}>Add Image</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAddCardVisible(true); setPlusMenuVisible(false); }}>
              <Text style={styles.menuText}>Add New Card</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add new card modal */}
      <Modal visible={addCardVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1} // Prevents dismissal when clicking inside
          >
            <Text style={styles.modalTitle}>Add New Card</Text>
            <TextInput
              style={styles.urlInput}
              placeholder="Enter URL"
              onChangeText={setNewUrl}
              value={newUrl}
              placeholderTextColor="#666"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setAddCardVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              {renderSendButton()}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    margin: 7,
    borderRadius: 7,
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 8,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000099',
  },
  menu: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 50,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'hsla(278, 100%, 50%, 0.3)',
    shadowColor: 'hsla(278, 100%, 50%, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  menuText: {
    padding: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  overlay: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    minHeight: 200,
    width: '90%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'hsla(278, 100%, 50%, 0.3)',
    shadowColor: 'hsla(278, 100%, 50%, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
  },
  urlInput: {
    borderWidth: 1,
    borderColor: 'hsla(278, 100%, 50%, 0.3)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#2a2a2a',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'hsla(278, 100%, 50%, 0.3)',
  },
  sendButton: {
    backgroundColor: 'hsla(278, 100%, 50%, 1)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#aaa',
    opacity: 0.7,
  },
});

export default SearchBar;
