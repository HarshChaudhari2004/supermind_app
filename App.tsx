import 'react-native-url-polyfill/auto';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, useColorScheme, BackHandler, Alert, AppState, AppStateStatus, SafeAreaView } from 'react-native';
import { Session } from '@supabase/supabase-js';
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

const App = () => {
  // 1. Move all hooks outside any conditions
  const [session, setSession] = useState<Session | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [supabaseChannel, setSupabaseChannel] = useState<any>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const cardsRef = useRef<{ clearSearch: () => void }>(null);
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#171717' : '#fff';

  const handleRefresh = useCallback(() => {
    setReloadKey(prev => prev + 1);
  }, []);

  // 2. Combine session-related effects
  useEffect(() => {
    const setupAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    setupAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
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
    const timer = setTimeout(() => setIsLoading(false), 2000);
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

  // 3. Safe event handler registration
  const handleSharedContent = useCallback(async (shareData: any) => {
    if (!shareData?.data || !session?.user) return;
    
    try {
      const content = Array.isArray(shareData.data) ? shareData.data[0] : shareData.data;
      await processSharedContent(content);
      setReloadKey(prev => prev + 1);
      Alert.alert('Success', 'Content saved successfully');
    } catch (error) {
      handleAPIError(error instanceof Error ? error : new Error('Failed to process content'));
    }
  }, [session, handleAPIError]);

  // 4. Wrap ShareMenu initialization in try-catch
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState !== 'active' && nextAppState === 'active') {
        try {
          // ShareMenu.getInitialShare returns Promise<void>
          ShareMenu.getInitialShare(handleSharedContent);
        } catch (error) {
          console.error('ShareMenu initialization error:', error);
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

  if (isLoading) {
    return <SplashScreen />;
  }

  const showThoughtField = !searchTerm.trim(); // Add this line

  // 6. Wrap main render in SafeAreaView and add error boundaries
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <View style={{ flex: 1 }}>
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
              marginBottom: !isSearchFocused && !searchTerm ? 110 : 0 // Increased margin to prevent overlap
            }}>
              {session?.user?.id && (
                <Cards 
                  ref={cardsRef}
                  key={reloadKey} 
                  searchTerm={searchTerm} 
                  userId={session.user.id}
                  onRefresh={handleRefresh}
                  performSearch={performSmartSearch}
                />
              )}
            </View>
            {!isSearchFocused && !searchTerm && (
              <ThoughtField 
                onRefresh={handleRefresh}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
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
