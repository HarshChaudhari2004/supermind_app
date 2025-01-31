import React, { useState, useCallback, useEffect } from 'react';
import { View, useColorScheme, BackHandler } from 'react-native';
import SearchBar from './components/searchbar';
import Cards from './components/cards';
import SplashScreen from './components/splashscreen';

const App = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#171717' : '#fff';
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
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

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <SearchBar value={searchTerm} onSearch={handleSearch} />
      <Cards searchTerm={searchTerm} />
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
