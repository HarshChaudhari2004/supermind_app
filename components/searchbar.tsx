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

// Helper functions
function isYouTubeUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}
function isInstagramUrl(url: string) {
  return url.includes("instagram.com");
}
async function sendUrlToBackend(url: string) {
  // Check if the URL is a shortened YouTube URL
  if (url.includes("youtu.be")) {
    const videoId = url.split("youtu.be/")[1];
    if (videoId) {
      url = `https://www.youtube.com/watch?v=${videoId}`; // Convert to full YouTube URL
    } else {
      Alert.alert("Error", "Invalid shortened YouTube URL format.");
      return; // Exit if the URL is invalid
    }
  }

  let backendUrl = '';
  if (isYouTubeUrl(url)) {
    backendUrl = "https://supermind-production.up.railway.app/api/generate-summary/";
  } else if (isInstagramUrl(url)) {
    backendUrl = "https://supermind-production.up.railway.app/instagram/api/analyze-instagram/";
  } else {
    backendUrl = "https://supermind-production.up.railway.app/web/api/analyze-website/";
  }

  try {
    console.log("Sending URL to backend:", backendUrl, "with URL:", url); // Logging for debugging

    const response = await fetch(`${backendUrl}?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("Non-JSON response. Parsing as text.");
      const text = await response.text();
      console.log("Backend text response:", text);
      return text;
    }

    const data = await response.json();
    console.log("Backend response:", data);
    Alert.alert("Success", "Data processed successfully!");
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error sending URL to backend:", error.message);
    } else {
      console.error("Error sending URL to backend:", error);
    }
    Alert.alert(
      "Error",
      `Failed to process URL. Server returned error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`
    );
    throw error;
  }
}


interface SearchBarProps {
  placeholder?: string;
  onSearch: (text: string) => void;
  value: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search your Mind... ",
  onSearch,
  value,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [typedValue, setTypedValue] = useState(value);
  const [plusMenuVisible, setPlusMenuVisible] = useState(false);
  const [addCardVisible, setAddCardVisible] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const inputRef = useRef<TextInput>(null);

  const clearSearch = () => {
    setTypedValue('');
    onSearch('');
    inputRef.current?.blur(); // Remove focus after clearing
  };

  const handleOutsidePress = () => {
    inputRef.current?.blur(); // Remove focus from input
    setMenuVisible(false);
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
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <Image
                source={require('../assets/hamburger.png')}
                style={styles.icon}
              />
            </TouchableOpacity>

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

        <Modal visible={menuVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menu}>
              <TouchableOpacity onPress={() => { /* Handle settings */ }}>
                <Text style={styles.menuText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { /* Handle bases */ }}>
                <Text style={styles.menuText}>Bases</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
              <TouchableOpacity
                style={[styles.button, styles.sendButton]}
                onPress={() => {
                  if (newUrl.trim()) {
                    sendUrlToBackend(newUrl);
                    setAddCardVisible(false);
                    setNewUrl('');
                  }
                }}
              >
                <Text style={styles.buttonText}>Send</Text>
              </TouchableOpacity>
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
});

export default SearchBar;
