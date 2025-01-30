import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import WebView from 'react-native-webview';

interface PopupProps {
  visible: boolean;
  item: any;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  onDelete: () => void;
  onShare: () => void;
}

const Popup: React.FC<PopupProps> = ({
  visible,
  item,
  onClose,
  onSaveNote,
  onDelete,
  onShare,
}) => {
  const [note, setNote] = useState('');
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showTags, setShowTags] = useState(false);

  if (!item) return null;

  // Helper to display partial text
  const shortenedText = (text: string, limit: number) =>
    text.length > limit ? text.slice(0, limit) + '...' : text;

  // Limit the number of tags displayed initially
  const initialTags = item.Tags?.split(', ').slice(0, 5) || [];
  const allTags = item.Tags?.split(', ') || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={{ height: 500 }}>
            <WebView
              source={{ uri: item['Original URL'] }}
              nestedScrollEnabled
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled
            />
          </View>

          <View style={styles.section}>
            <TouchableOpacity onPress={() => setShowFullSummary(!showFullSummary)}>
              <Text style={styles.sectionTitle}>Summary</Text>
            </TouchableOpacity>
            <Text style={styles.summaryText}>
              {showFullSummary
                ? item.Summary
                : shortenedText(item.Summary || '', 60)}
            </Text>
          </View>

          <View style={styles.section}>
            <TouchableOpacity onPress={() => setShowTags(!showTags)}>
              <Text style={styles.sectionTitle}>Tags</Text>
            </TouchableOpacity>
            <View style={styles.tagsContainer}>
              {(showTags ? allTags : initialTags).map((tag: string, index: number) => (
                <Text key={index} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
              {!showTags && allTags.length > 5 && (
                <Text style={styles.tag}>...</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder="Add your notes here..."
              value={note}
              onChangeText={setNote}
            />
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Text style={styles.buttonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => onSaveNote(note)}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    padding: 16,
  },
  webview: {
    borderRadius: 8,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    color: '#4a9afa',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  shareButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 28,
  },
});

export default Popup;