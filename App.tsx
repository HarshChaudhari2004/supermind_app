import 'react-native-url-polyfill/auto';
import React, { useState, useCallback, useEffect } from 'react';
import { View, useColorScheme, BackHandler, Alert, Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Auth from './components/auth';
import SearchBar from './components/searchbar';
import Cards from './components/cards';
import SplashScreen from './components/splashscreen';
import ShareMenu from 'react-native-share-menu';
import { sendUrlToBackend } from './services/api';

const App = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#171717' : '#fff';
  const [session, setSession] = useState<Session | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
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
        setSearchTerm('');
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

  useEffect(() => {
    // Listen for shared data
    ShareMenu.getInitialShare(shareData => {
      if (!shareData) return;
      
      const url = Array.isArray(shareData.data) ? shareData.data[0] : shareData.data;
      if (url) {
        setSharedUrl(url);
        sendUrlToBackend(url)
          .then(() => {
            Alert.alert('Success', 'URL processed successfully');
            setReloadKey(prev => prev + 1); // Trigger cards refresh
          })
          .catch(error => {
            Alert.alert('Error', 'Failed to process URL');
            console.error(error);
          });
      }
    });
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {!session ? (
        <Auth />
      ) : (
        <>
          <SearchBar value={searchTerm} onSearch={handleSearch} />
          <Cards key={reloadKey} searchTerm={searchTerm} />
          <Text>{session.user.id}</Text>
        </>
      )}
    </View>
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
