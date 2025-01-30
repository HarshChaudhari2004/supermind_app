import React, { useState, useCallback, useEffect } from 'react';
import { View, useColorScheme, Linking, Button } from 'react-native';
import SearchBar from './components/searchbar';
import Cards from './components/cards';

const App = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#fff';
  const [searchTerm, setSearchTerm] = useState('');

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
