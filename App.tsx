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
import { sendUrlToBackend } from './services/api';
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
      }
      return false; // Allow app to exit
    });

    return () => backHandler.remove();
  }, [searchTerm]);

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
      const url = Array.isArray(shareData.data) ? shareData.data[0] : shareData.data;
      await sendUrlToBackend(url);
      setReloadKey(prev => prev + 1);
      Alert.alert('Success', 'URL processed successfully');
    } catch (error) {
      handleAPIError(error instanceof Error ? error : new Error('Failed to process URL'));
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

  // Separate Supabase channel subscription
  useEffect(() => {
    if (session?.user?.id) {
      const channel = supabase.channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'content'
          },
          () => {
            handleRefresh();
          }
        )
        .subscribe();

      setSupabaseChannel(channel);

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [session?.user?.id, handleRefresh]);

  if (isLoading) {
    return <SplashScreen />;
  }

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
            />
            <View style={{ flex: 1, marginBottom: 150 }}> {/* Add marginBottom here */}
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
            <ThoughtField 
              onRefresh={handleRefresh}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999
              }}
            />
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
