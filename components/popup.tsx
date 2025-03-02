import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import WebView from 'react-native-webview';
import { saveUserNotes } from '../services/api';

// Update the interface first to match Supabase data structure
interface PopupProps {
  visible: boolean;
  item: {
    id: string;
    user_id: string;
    title: string;
    tags: string;
    summary: string;
    thumbnail_url: string;
    original_url: string;
    date_added: string;
    user_notes?: string;  // Add this field
    video_type?: string;
    // Add other fields as needed
  } | null;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  onDelete: () => Promise<void>;
  onShare: () => void;
  onRefresh?: () => void;  // Add this prop
}

const Popup: React.FC<PopupProps> = ({
  visible,
  item,
  onClose,
  onSaveNote,
  onDelete,
  onShare,
  onRefresh,
}) => {
  const [note, setNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFullTitle, setShowFullTitle] = useState(false); // Add this state

  // Add editableNote state
  const [editableNote, setEditableNote] = useState('');
  const [isNotesEditing, setIsNotesEditing] = useState(false);

  // Reset states when popup closes
  useEffect(() => {
    if (!visible) {
      setNote('');
      setEditableNote('');
      setIsEditing(false);
      setIsNotesEditing(false);
      setShowFullSummary(false);
      setShowTags(false);
    } else if (item?.user_notes) {
      setNote(item.user_notes);
      setEditableNote(item.user_notes);
    }
  }, [visible, item]);

  // When item changes, update note state
  useEffect(() => {
    if (item?.user_notes) {
      setNote(item.user_notes);
    }
  }, [item]);

  if (!item || !visible) return null;

  // Helper to display partial text
  const shortenedText = (text: string, limit: number) =>
    text?.length > limit ? text.slice(0, limit) + '...' : text || '';

  // Parse tags - handle both comma-separated string and array formats
  const parseTags = (tags: string | string[] | null | undefined) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return tags.split(',').map(tag => tag.trim());
  };

  const initialTags = parseTags(item.tags).slice(0, 5);
  const allTags = parseTags(item.tags);

  const handleSaveNote = async (noteText: string) => {
    try {
      await saveUserNotes(item.id, noteText);
      onSaveNote(noteText);
      onRefresh?.(); // Trigger refresh after saving
      setIsEditing(false);
      Alert.alert('Success', 'Note saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
      console.error('Error saving note:', error);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
    } catch (error) {
      console.error('Error in handleDelete:', error);
      Alert.alert('Error', 'Failed to delete content');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVisit = async (url: string) => {
    try {
      // Clean and format the URL
      let formattedUrl = url;
      
      // Add https:// if not present
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        formattedUrl = 'https://' + url;
      }
  
      // Encode the URL properly
      const encodedUrl = encodeURI(formattedUrl);
      
      console.log('Attempting to open URL:', encodedUrl); // Debug log
      
      const supported = await Linking.canOpenURL(encodedUrl);
      if (supported) {
        await Linking.openURL(encodedUrl);
      } else {
        // Try alternate URL formats for specific platforms
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          // Try opening in YouTube app
          const youtubeUrl = url.replace('youtube.com/watch?v=', 'youtube.com/v/');
          await Linking.openURL(youtubeUrl);
        } else if (url.includes('instagram.com')) {
          // Try opening in Instagram app
          const instagramUrl = `instagram://browse/${url.split('instagram.com/')[1]}`;
          try {
            await Linking.openURL(instagramUrl);
          } catch {
            // Fallback to browser if app not installed
            await Linking.openURL(encodedUrl);
          }
        } else {
          await Linking.openURL(encodedUrl);
        }
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(
        'Error',
        'Could not open the URL. Please check if you have a suitable app installed.'
      );
    }
  };

  // Add function to handle notes editing for non-note cards
  const handleNotesEdit = async () => {
    try {
      await saveUserNotes(item.id, editableNote);
      setIsNotesEditing(false);
      onRefresh?.(); // This will trigger a refresh of the cards list
      Alert.alert('Success', 'Notes updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update notes');
      console.error('Error updating notes:', error);
      setEditableNote(note); // Reset to original on error
    }
  };

  // Add new function to render note content
  const renderNoteContent = () => {
    if (item?.video_type === 'note') {
      return (
        <View style={styles.noteContainer}>
          {isEditing ? (
            <TextInput
              style={styles.noteInput}
              multiline
              value={note}
              onChangeText={setNote}
              autoFocus
              placeholder="Write your note here..."
              placeholderTextColor="#666"
            />
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.noteText}>{note}</Text>
              <Text style={styles.editHint}>Tap to edit</Text>
            </TouchableOpacity>
          )}
          {isEditing && (
            <View style={styles.editButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setNote(item.user_notes || '');
                  setIsEditing(false);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => handleSaveNote(note)}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // Return WebView for non-note content
    return (
      <View style={{ height: 500 }}>
        {item.original_url && (
          <>
            <WebView
              source={{ uri: item.original_url }}
              nestedScrollEnabled
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled
            />
            <TouchableOpacity 
              style={styles.visitButton}
              onPress={() => handleVisit(item.original_url)}
            >
              <Text style={styles.visitButtonText}>Visit</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  // Add this helper function for title display
  const getTruncatedTitle = (title: string) => {
    if (!title) return '';
    return showFullTitle ? title : title.length > 100 ? title.slice(0, 100) + '...' : title;
  };

  // Update the notes section in the render method
  const renderNotesSection = () => {
    if (item?.video_type === 'note') return null;

    return (
      <View style={styles.section}>
        <View style={styles.notesSectionHeader}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {!isNotesEditing && (
            <TouchableOpacity 
              onPress={() => setIsNotesEditing(true)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {isNotesEditing ? (
          <>
            <TextInput
              style={styles.notesInput}
              multiline
              value={editableNote}
              onChangeText={setEditableNote}
              placeholder="Add your notes here..."
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.notesEditButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setEditableNote(note);
                  setIsNotesEditing(false);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleNotesEdit}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity 
            onPress={() => setIsNotesEditing(true)}
            style={styles.notesDisplay}
          >
            <Text style={styles.notesText}>
              {note || 'Tap to add notes...'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          {renderNoteContent()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title:</Text>
            <TouchableOpacity onPress={() => setShowFullTitle(!showFullTitle)}>
              <Text style={[styles.summaryText, styles.titleText]}>
                {getTruncatedTitle(item.title)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Only show summary and notes sections for non-note content */}
          {item?.video_type !== 'note' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Summary:</Text>
                <Text style={styles.summaryText}>
                  {showFullSummary
                    ? item.summary
                    : shortenedText(item.summary, 142)}
                </Text>
                {item.summary?.length > 142 && (
                  <TouchableOpacity
                    onPress={() => setShowFullSummary(!showFullSummary)}
                    style={styles.readMoreButton}
                  >
                    <Text style={styles.readMoreText}>
                      {showFullSummary ? 'Show Less' : 'Read More'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {renderNotesSection()}
            </>
          )}

          {allTags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags:</Text>
              <View style={styles.tagsContainer}>
                {(showTags ? allTags : initialTags).map((tag: string, index: number) => (
                  <TouchableOpacity key={index}>
                    <Text style={styles.tag}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
                {allTags.length > 5 && (
                  <TouchableOpacity onPress={() => setShowTags(!showTags)}>
                    <Text style={[styles.tag, styles.moreTag]}>
                      {showTags ? 'Hide tags' : `+${allTags.length - 5} more`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Text style={styles.buttonText}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Text style={styles.buttonText}>Share</Text>
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
    textAlign: 'justify',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    color: '#bc10e3',
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
    textAlign: 'justify',
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
  readMoreButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: '#4a9afa',
    fontSize: 14,
    fontWeight: '600',
  },
  moreTag: {
    backgroundColor: '#3a3a3a',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  visitButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#bc10e3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  visitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  existingNotesContainer: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  existingNotes: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  noteContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 200,
  },
  noteInput: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 200,
  },
  noteText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  editHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#bc10e3',
    fontSize: 14,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
  notesEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  notesDisplay: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    minHeight: 60,
  },
  notesText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  titleText: {
    paddingVertical: 8, // Add padding for better touch area
    paddingHorizontal: 4,
  },
});
export default Popup;