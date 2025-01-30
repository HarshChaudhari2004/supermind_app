import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MasonryList from '@react-native-seoul/masonry-list';
import Popup from './popup';

interface CardsProps {
  searchTerm: string;
}

const Cards: React.FC<CardsProps> = ({ searchTerm }) => {
  const [cardsData, setCardsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetch('https://supermind-9fii.onrender.com/api/video-data/')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch data');
        return response.json();
      })
      .then((data) => {
        const sortedData = data.sort((a: any, b: any) => {
          const dateA = new Date(a['Date Added']).getTime();
          const dateB = new Date(b['Date Added']).getTime();
          return dateA - dateB;
        });
        setCardsData(sortedData);
        setFilteredData(sortedData);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(cardsData);
    } else {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const filtered = cardsData.filter((item: any) => {
        const titleMatch = item.Title?.toLowerCase().includes(lowercasedSearchTerm);
        const tagsMatch = item.Tags?.toLowerCase().includes(lowercasedSearchTerm);
        const summaryMatch = item.Summary?.toLowerCase().includes(lowercasedSearchTerm);
        return titleMatch || tagsMatch || summaryMatch;
      });
      setFilteredData(filtered);
    }
  }, [searchTerm, cardsData]);

  const getAspectRatio = (url: string) => {
    if (url.includes('youtube')) return 16 / 9;
    if (url.includes('instagram')) return 9 / 16;
    return 4 / 3;
  };

  const renderItem = ({ item }: { item: any }) => {
    const ratio = getAspectRatio(item['Thumbnail URL'] || '');
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedItem(item)}
      >
        <Image
          source={{ uri: item['Thumbnail URL'] || 'assets/image-placeholder.png' }}
          style={[styles.thumbnail, { aspectRatio: ratio }]}
        />
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {item.Title}
        </Text>
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load data: {error}</Text>
      </View>
    );
  }

  return (
    <>
      <MasonryList
        data={filteredData}
        keyExtractor={(item, index) => item.ID?.toString() || index.toString()}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.grid}
      />
      <Popup
        visible={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSaveNote={(note) => {
          console.log('Note saved:', note);
          setSelectedItem(null);
        }}
        onDelete={() => {
          console.log('Item deleted:', selectedItem?.ID);
          setSelectedItem(null);
        }}
        onShare={() => {
          console.log('Sharing item:', selectedItem?.ID);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  grid: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 7,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  title: {
    color: '#ffffff',
    backgroundColor: 'transparent',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default Cards;
