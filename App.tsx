import React, { useState, useCallback, useEffect } from 'react';
import { View, useColorScheme, BackHandler } from 'react-native';
import SearchBar from './components/searchbar';
import Cards from './components/cards';

const App = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#171717' : '#fff';
  const [searchTerm, setSearchTerm] = useState('');

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
