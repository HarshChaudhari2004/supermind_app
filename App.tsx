import 'react-native-url-polyfill/auto';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, useColorScheme, BackHandler, Alert, AppState, AppStateStatus, SafeAreaView, Platform, NativeModules, Linking } from 'react-native';
// Gesture handler root required for react-native-gesture-handler
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Auth from './components/auth';
import SearchBar from './components/searchbar';
import Cards from './components/cards';
import SplashScreen from './components/splashscreen';
import ThoughtField from './components/thoughtfield';
import ShareMenu from 'react-native-share-menu';
import { processSharedContent, sendUrlToBackend } from './services/api';
import { urlProcessingEmitter } from './services/EventEmitter';
import { performSmartSearch } from './components/searchbar';
import { useSettings } from './context/SettingsContext'; // Add this import
import { preloadAppData } from './services/preloadService';
import ShareConfirmationOverlay from './components/ShareConfirmationOverlay';
import { nativeTokenStorage } from './services/nativeTokenStorage'; // Import native token storage

// Note: High refresh rate (90fps/120fps) is handled automatically by Android
// if the device supports it and the app is running in production mode.
// Dev mode will always run at 60fps due to debugging overhead.

// Add type for share data
interface ShareData {
  data: string | string[];
  mimeType?: string;
}

const App = () => {
  // 1. Move all hooks outside any conditions
  const [session, setSession] = useState<Session | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [supabaseChannel, setSupabaseChannel] = useState<any>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [preloadedData, setPreloadedData] = useState<any[] | null>(null);
  const [splashScreenMinTimePassed, setSplashScreenMinTimePassed] = useState(false);
  const [showShareOverlay, setShowShareOverlay] = useState(false);

  const cardsRef = useRef<{ clearSearch: () => void }>(null);
  const { appTheme } = useSettings(); // Get the theme from our settings context

  const handleRefresh = useCallback(() => {
    setReloadKey(prev => prev + 1);
  }, []);

  // Minimum splash screen duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashScreenMinTimePassed(true);
    }, 5000); // 5 seconds minimum
    return () => clearTimeout(timer);
  }, []);

  // 2. Combine session-related effects
  useEffect(() => {
    const setupAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      // Save session to native storage if exists
      if (session) {
        await nativeTokenStorage.saveCurrentSession();
      }
    };

    setupAuth();

    // Setup native token storage listener
    const tokenStorageSubscription = nativeTokenStorage.setupAuthListener();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
      tokenStorageSubscription?.unsubscribe();
    };
  }, []);

  // Add session check effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        // Clear any stored data and redirect to auth
        setSearchTerm('');
        if (cardsRef.current) {
          cardsRef.current.clearSearch();
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Clear data on logout
        setSearchTerm('');
        if (cardsRef.current) {
          cardsRef.current.clearSearch();
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Add error boundary for API calls
  const handleAPIError = useCallback((error: Error) => {
    if (error.message.includes('Not authenticated')) {
      setSession(null); // Force re-auth
      Alert.alert('Session Expired', 'Please sign in again');
    } else {
      Alert.alert('Error', error.message);
    }
  }, []);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (searchTerm) {
        setSearchTerm(''); // Clear search term
        // Clear filtered results by setting empty search
        if (cardsRef.current) {
          cardsRef.current.clearSearch();
        }
        return true; // Prevent default back behavior
      } else if (isSearchFocused) {
        setIsSearchFocused(false); // Clear focus state
        return true;
      }
      return false; // Allow app to exit
    });

    return () => backHandler.remove();
  }, [searchTerm, isSearchFocused]);

  // Debounce search input
  const handleSearch = useCallback(
    debounce((query: string) => setSearchTerm(query), 300), // 300ms debounce
    []
  );

  const refreshCards = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  // Handle shared content
  const handleSharedContent = useCallback(async (content: string) => {
    try {
      // Get current session without requiring UI
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Store the content for later processing when user logs in
        await AsyncStorage.setItem('pending_share', content);
        return;
      }
      
      await processSharedContent(content);
      setReloadKey(prev => prev + 1);
      // Show the share confirmation overlay instead of Alert
      setShowShareOverlay(true);
    } catch (error) {
      console.error('Error processing shared content:', error);
      Alert.alert('Error', 'Failed to process content. Please try again.');
    }
  }, []);

  // Initialize share menu and handle deep linking
  useEffect(() => {
    const initializeShareMenu = async () => {
      try {
        // Handle initial share
        ShareMenu.getInitialShare(async (share) => {
          if (share?.data) {
            const content = Array.isArray(share.data) ? share.data[0] : share.data;
            await handleSharedContent(content);
          }
        });

        // Handle deep linking
        const url = await Linking.getInitialURL();
        if (url) {
          await handleSharedContent(url);
        }

        // Check for pending shares
        const pendingShare = await AsyncStorage.getItem('pending_share');
        if (pendingShare) {
          await handleSharedContent(pendingShare);
          await AsyncStorage.removeItem('pending_share');
        }
      } catch (error) {
        console.error('Error processing initial share:', error);
      }
    };

    initializeShareMenu();
  }, [handleSharedContent]);

  // Handle app state changes and new shares
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState !== 'active' && nextAppState === 'active') {
        try {
          // Check for new shares
          ShareMenu.getInitialShare(async (share) => {
            if (share?.data) {
              const content = Array.isArray(share.data) ? share.data[0] : share.data;
              await handleSharedContent(content);
            }
          });

          // Check for deep links
          const url = await Linking.getInitialURL();
          if (url) {
            await handleSharedContent(url);
          }

          // Check for pending shares
          const pendingShare = await AsyncStorage.getItem('pending_share');
          if (pendingShare) {
            await handleSharedContent(pendingShare);
            await AsyncStorage.removeItem('pending_share');
          }
        } catch (error) {
          console.error('Error processing share on app state change:', error);
        }
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState, handleSharedContent]);

  // 5. Safe URL processing subscription
  useEffect(() => {
    if (!session?.user) return;

    const subscription = urlProcessingEmitter.addListener('UrlShared', async (data) => {
      if (!data?.url) return;
      
      try {
        await sendUrlToBackend(data.url);
        setReloadKey(prev => prev + 1);
      } catch (error) {
        console.error('Error processing shared URL:', error);
      }
    });

    return () => subscription.remove();
  }, [session]);

  useEffect(() => {
    async function prepare() {
      try {
        // Get user first
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Preload data while splash screen is showing
          const cachedData = await preloadAppData(user.id);
          setPreloadedData(cachedData);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Show splash screen while loading or minimum time not passed
  if (!appIsReady || !splashScreenMinTimePassed) {
    return <SplashScreen />;
  }

  const showThoughtField = !searchTerm.trim(); // Add this line

  // 6. Wrap main render in SafeAreaView and add error boundaries
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: appTheme.colors.background // Update SafeAreaView to use theme values
    }}>
      <View style={{ flex: 1, position: 'relative' }}> {/* Add position:relative to make the absolute positioning work */}
        {!session ? (
          <Auth />
        ) : (
          <>
            <SearchBar 
              value={searchTerm} 
              onSearch={handleSearch}
              onAddCard={handleRefresh}
              onFocusChange={setIsSearchFocused} // Add this prop
            />
            <View style={{ 
              flex: 1, 
              backgroundColor: appTheme.colors.background, // Update View to use theme values
              marginBottom: !isSearchFocused && !searchTerm ? 100 : 0, // Only add bottom margin when ThoughtField is visible and collapsed
              position: 'relative', // Add position:relative here
            }}>
              {session?.user?.id && (
                <Cards 
                  ref={cardsRef}
                  key={reloadKey} 
                  searchTerm={searchTerm} 
                  userId={session.user.id}
                  onRefresh={handleRefresh}
                  performSearch={performSmartSearch}
                  initialData={preloadedData}
                />
              )}
            </View>
            {/* Only render ThoughtField when needed */}
            {!isSearchFocused && !searchTerm && (
              <ThoughtField onRefresh={handleRefresh} />
            )}
          </>
        )}
        
        {/* Share Confirmation Overlay */}
        {showShareOverlay && (
          <ShareConfirmationOverlay
            onComplete={() => setShowShareOverlay(false)}
          />
        )}
      </View>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// Debounce helper function
function debounce(func: Function, delay: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export default App;
