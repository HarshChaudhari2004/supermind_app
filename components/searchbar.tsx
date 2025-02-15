import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Text,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Hamburger from './hamburger';
import { sendUrlToBackend } from '../services/api';

// Helper functions
function isYouTubeUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}
function isInstagramUrl(url: string) {
  return url.includes("instagram.com");
}

interface SearchBarProps {
  placeholder?: string;
  onSearch: (text: string) => void;
  value: string;
  onAddCard?: () => void; // Add this prop
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search your Mind... ",
  onSearch,
  value,
  onAddCard, // Add this prop
}) => {
  const [typedValue, setTypedValue] = useState(value);
  const [plusMenuVisible, setPlusMenuVisible] = useState(false);
  const [addCardVisible, setAddCardVisible] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const clearSearch = () => {
    setTypedValue('');
    onSearch('');
    inputRef.current?.blur(); // Remove focus after clearing
  };

  const handleOutsidePress = () => {
    inputRef.current?.blur(); // Remove focus from input
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
        onAddCard();
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
                setTypedValue(text);
                onSearch(text);
              }}
              value={typedValue}
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
    backgroundColor: '#fff',
    marginHorizontal: 50,
    borderRadius: 8,
    padding: 10,
  },
  menuText: {
    padding: 10,
    fontSize: 16,
  },
  overlay: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    minHeight: 200,
    width: '90%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#ddd',
    alignItems: 'center',
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
