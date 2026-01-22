import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Dimensions,
} from 'react-native';
import Animated, { 
  withTiming,
  withSpring,
  withDelay,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import WebView from 'react-native-webview';
import { saveUserNotes } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import ThemedText from './ThemedText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation tuning constants (easy to tweak)
const ANIM = {
  // OnePlus/iOS-like fluid bezier: "pop" at start (fast acceleration) + long elegant settling
  fluidEasing: Easing.bezier(0.05, 0.7, 0.1, 1), // Sharp pop at start, very long smooth settling
  duration: 480,             // ms for liquid feel (dynamic duration for full screen)
  exitDuration: 320,         // ms for exit transform
  contentDelay: 250,         // ms before mounting heavy content (WebView)
  backdropDuration: 350,     // ms for backdrop fade
   enterOpacityDuration: 450, // ms for popup fade-in (match duration for smoothness)
  exitOpacityDuration: 350,  // ms for popup fade-out (MUST match exitDuration to prevent midway disappearing)
  exitEasing: Easing.bezier(0.3, 0, 0.8, 0.15), // Fast snappy exit with slight ease
};


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
  cardLayout?: {x: number, y: number, width: number, height: number} | null;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  onDelete: () => Promise<void>;
  onShare: () => void;
  onRefresh?: () => void;  // Add this prop
}

const Popup: React.FC<PopupProps> = ({
  visible,
  item,
  cardLayout,
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

  // Add this to get theme settings
  const { appTheme, fontSize } = useSettings();
  const { colors } = appTheme;

  // Animation shared values for smooth popup transitions
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const borderRadius = useSharedValue(20);
  const contentOpacity = useSharedValue(0); // cross-fade for heavy content
  const webViewOpacity = useSharedValue(0); // separate opacity for WebView fade-in
  const initialScale = useSharedValue(0.3); // Store initial scale for backdrop interpolation
  const [showWebView, setShowWebView] = useState(false);
  // store timer reference (type is any to avoid Node/Browser timer mismatch)
  const contentTimerRef = useRef<any>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Calculate initial position from card layout
  const getInitialTransform = () => {
    if (!cardLayout) return { x: 0, y: 0, scale: 0.3 };
    
    // Calculate the offset from center of screen to card center
    const cardCenterX = cardLayout.x + (cardLayout.width / 2);
    const cardCenterY = cardLayout.y + (cardLayout.height / 2);
    const screenCenterX = SCREEN_WIDTH / 2;
    const screenCenterY = SCREEN_HEIGHT / 2;
    
    return {
      x: cardCenterX - screenCenterX,
      y: cardCenterY - screenCenterY,
      scale: Math.min(cardLayout.width / SCREEN_WIDTH, cardLayout.height / SCREEN_HEIGHT)
    };
  };

  // Animated style for smooth popup entrance/exit
  const animatedPopupStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
      borderRadius: borderRadius.value,
      // hardware acceleration hint
      backfaceVisibility: 'hidden' as const,
    };
  });

  // Derive backdrop opacity from scale for synchronized animation
  const backdropOpacity = useDerivedValue(() => {
    return interpolate(scale.value, [initialScale.value, 1], [0, 1]);
  });

  // Animated style for backdrop fade
  const animatedBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  // Animated style for content cross-fade
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Animated style for WebView fade-in
  const webViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: webViewOpacity.value,
  }));

  // Animated style for thumbnail fade-out (inverse of WebView opacity)
  const thumbnailAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - webViewOpacity.value,
  }));

  // Memoized dynamic styles to avoid re-creating on every render (MUST be before early return)
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  }), [colors]);

  // Gesture handler for interactive dismiss via top handle (new Gesture API)
  // Configure to only activate on downward drag, ignore horizontal movement
  const panGesture = Gesture.Pan()
    .enabled(!isClosing)
    .activeOffsetY(10) // Must drag down at least 10px to activate
    .failOffsetY(-5)   // If dragged up 5px, gesture fails
    .failOffsetX([-50, 50]) // If dragged left/right more than 50px, gesture fails (keeps vertical)
    .onBegin(() => {
      'worklet';
      // Gesture starting
    })
    .onUpdate((event) => {
      'worklet';
      // Only allow downward drag
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        // subtle scale down while dragging (backdrop will follow via useDerivedValue)
        scale.value = 1 - Math.min(event.translationY / SCREEN_HEIGHT, 0.08);
      }
    })
    .onEnd((event) => {
      'worklet';
      // Check if dragged far enough or fast enough to dismiss
      if (event.translationY > 150 || event.velocityY > 1200) {
        // trigger close
        runOnJS(handleClose)();
      } else {
        // Spring back to position (backdrop follows scale via useDerivedValue)
        translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
        scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      }
    });

  // Trigger entrance animation when popup becomes visible
  useEffect(() => {
    if (visible && !isClosing) {
      const initial = getInitialTransform();
      
      // Set initial values instantly (including initialScale for backdrop interpolation)
      scale.value = initial.scale;
      initialScale.value = initial.scale; // Update shared value for backdrop
      translateX.value = initial.x;
      translateY.value = initial.y;
      opacity.value = 0;
      borderRadius.value = 20;

      // Premium spring config for fluid "snap" feel (OnePlus/iOS-like)
      const springConfig = { 
        damping: 18, 
        stiffness: 120, 
        mass: 0.8, 
        overshootClamping: false 
      };

      // Transform with spring physics for organic feel
      scale.value = withSpring(1, springConfig);
      translateX.value = withSpring(0, springConfig);
      translateY.value = withSpring(0, springConfig);
      borderRadius.value = withTiming(0, { duration: ANIM.duration, easing: ANIM.fluidEasing });
      opacity.value = withTiming(1, { duration: ANIM.enterOpacityDuration, easing: ANIM.fluidEasing });

      // WebView mounts immediately (pre-mounted strategy) but stays invisible
      // It will fade in via onLoadEnd callback once content is ready
      contentOpacity.value = withTiming(1, { duration: 300 });

      // Clear any existing timer
      if (contentTimerRef.current) {
        clearTimeout(contentTimerRef.current);
        contentTimerRef.current = null;
      }
    }
  }, [visible, cardLayout]);

  // Reset states when popup closes
  useEffect(() => {
    if (!visible) {
      setNote('');
      setEditableNote('');
      setIsEditing(false);
      setIsNotesEditing(false);
      setShowFullSummary(false);
      setShowTags(false);
    } else if (item) {
      // Ensure we set notes even when they are empty strings (falsy)
      setNote(item.user_notes ?? '');
      setEditableNote(item.user_notes ?? '');
    }
  }, [visible, item]);

  // When item changes, update note state (handles empty-string notes too)
  useEffect(() => {
    if (item) {
      setNote(item.user_notes ?? '');
      setEditableNote(item.user_notes ?? '');
    }
  }, [item]);

  // Cleanup content timer on unmount
  useEffect(() => {
    return () => {
      if (contentTimerRef.current) {
        clearTimeout(contentTimerRef.current);
        contentTimerRef.current = null;
      }
    };
  }, []);

  if (!item || !visible) return null;

  // Close handler with proper exit animation
  const handleClose = () => {
    setIsClosing(true);
    const initial = getInitialTransform();

    // Reset opacity values immediately
    contentOpacity.value = 0;
    webViewOpacity.value = 0;

    // Premium exit spring config - snaps back organically without bounce
    const exitSpringConfig = { damping: 25, stiffness: 150 };
    const exitTimingConfig = { duration: ANIM.exitDuration, easing: ANIM.exitEasing };

    // Transform back to card position with spring for organic feel (backdrop will follow via useDerivedValue)
    scale.value = withSpring(initial.scale, exitSpringConfig);
    translateX.value = withSpring(initial.x, exitSpringConfig);
    translateY.value = withSpring(initial.y, exitSpringConfig);
    borderRadius.value = withTiming(20, exitTimingConfig);
    
    // Fade out opacity smoothly
    opacity.value = withTiming(0, exitTimingConfig, (finished) => {
      if (finished) {
        // Call onClose only after ALL animations complete
        runOnJS(onClose)();
        runOnJS(setIsClosing)(false);
      }
    });
  };

  // Helper to display partial text
  const shortenedText = (text: string, limit: number) =>
    text?.length > limit ? text.slice(0, limit) + '...' : text || '';

  // WebView load handler - fade in once content is ready
  const handleWebViewLoad = () => {
    'worklet';
    webViewOpacity.value = withTiming(1, { duration: 300 });
  };

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
              // Ensure WebView content background is transparent to avoid flashes
              // injectedJavaScript={`document.body.style.background = 'transparent'; true;`}
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
          <ThemedText style={styles.sectionTitle} variant="heading">Notes</ThemedText>
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
            <ThemedText variant="body" style={styles.notesText}>
              {note || 'Tap to add notes...'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Update the styles to use theme colors
  // const dynamicStyles = StyleSheet.create({
  //   container: {
  //     flex: 1,
  //     backgroundColor: colors.background,
  //   },
  //   // ...add more styles as needed
  // });
  // Add a small top handle style in styles object below (defined as new style key 'handle')

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop (separate from popup so children don't inherit opacity) */}
        <Animated.View
          style={[styles.backdrop, animatedBackdropStyle]}
          pointerEvents={isClosing ? 'none' : 'auto'}
        />

        {/* Container positions popup at bottom for accessible drag handle */}
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <GestureDetector gesture={panGesture}>
            <Animated.View 
              style={[styles.modalContent, animatedPopupStyle]}
              renderToHardwareTextureAndroid={!showWebView}
            >
              <View style={dynamicStyles.container}>
                {/* Drag handle for interactive dismiss */}
                <View style={styles.handle} />

                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>

                <ScrollView contentContainerStyle={styles.content}>
                  {/* WebView Section with Pre-mounted Parallel Loading Strategy */}
                  {item?.video_type !== 'note' && item.original_url && (
                    <View style={{ minHeight: 500, marginBottom: 20, position: 'relative' }}>
                      {/* Thumbnail Placeholder - visible until WebView loads */}
                      <Animated.View 
                        style={[
                          { 
                            position: 'absolute',
                            width: '100%',
                            height: 500,
                            borderRadius: 12,
                            overflow: 'hidden',
                            backgroundColor: colors.background,
                          },
                          contentAnimatedStyle,
                          thumbnailAnimatedStyle,
                        ]}
                      >
                        {item.thumbnail_url ? (
                          <Animated.Image
                            source={{ uri: item.thumbnail_url }}
                            style={{
                              width: '100%',
                              height: '100%',
                              resizeMode: 'cover',
                            }}
                            blurRadius={4}
                          />
                        ) : null}
                      </Animated.View>
                      
                      {/* Pre-mounted WebView - loads immediately but invisible until ready */}
                      <Animated.View style={[{ width: '100%', height: 500 }, contentAnimatedStyle]}>
                        <Animated.View style={[{ flex: 1 }, webViewAnimatedStyle]}>
                          <WebView
                            source={{ uri: item.original_url }}
                            nestedScrollEnabled
                            style={[styles.webview, { backgroundColor: colors.background }]}
                            containerStyle={{ backgroundColor: colors.background }}
                            javaScriptEnabled
                            domStorageEnabled
                            scrollEnabled
                            androidLayerType="hardware"
                            incognito={true}
                            onLoadEnd={handleWebViewLoad}
                            injectedJavaScript={`
                              (function() {
                                const bgColor = '${colors.background}';
                                if (!document.body.style.backgroundColor || document.body.style.backgroundColor === 'transparent') {
                                  document.body.style.backgroundColor = bgColor;
                                }
                                document.documentElement.style.backgroundColor = bgColor;
                              })();
                              true;
                            `}
                          />
                        </Animated.View>
                        <TouchableOpacity 
                          style={styles.visitButton}
                          onPress={() => handleVisit(item.original_url)}
                        >
                          <Text style={styles.visitButtonText}>Visit</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  )}

                  {/* Title Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} variant="heading">Title:</ThemedText>
            <TouchableOpacity onPress={() => setShowFullTitle(!showFullTitle)}>
              <ThemedText style={[styles.summaryText, styles.titleText]}>
                {getTruncatedTitle(item.title)}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Note-type content (render notes editor/view when item is a note) */}
          {item?.video_type === 'note' && (
            <View style={{ marginTop: 10 }}>
              {renderNoteContent()}
            </View>
          )}

          {/* Only show summary and notes sections for non-note content */}
          {item?.video_type !== 'note' && (
            <>
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle} variant="heading">Summary:</ThemedText>
                <ThemedText style={styles.summaryText}>
                  {showFullSummary
                    ? item.summary
                    : shortenedText(item.summary, 142)}
                </ThemedText>
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
              <ThemedText style={styles.sectionTitle} variant="heading">Tags:</ThemedText>
              <View style={styles.tagsContainer}>
                {(showTags ? allTags : initialTags).map((tag: string, index: number) => (
                  <TouchableOpacity key={index}>
                    <ThemedText style={styles.tag}>#{tag}</ThemedText>
                  </TouchableOpacity>
                ))}
                {allTags.length > 5 && (
                  <TouchableOpacity onPress={() => setShowTags(!showTags)}>
                    <ThemedText style={[styles.tag, styles.moreTag]}>
                      {showTags ? 'Hide tags' : `+${allTags.length - 5} more`}
                    </ThemedText>
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
    </Animated.View>
    </GestureDetector>
  </View>
</View>
    </Modal>
  );
};

const styles = StyleSheet.create({

  modalContent: {
    width: '100%',
    height: '95%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    padding: 16,
  },
  webview: {
    borderRadius: 8,
     // backgroundColor: 'transparent', // avoid white flash behind webview during animations
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Position at bottom for accessible drag handle
    alignItems: 'center',
    paddingBottom: 0, // Stick to very bottom
  },
  handle: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
    opacity: 0.6,
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