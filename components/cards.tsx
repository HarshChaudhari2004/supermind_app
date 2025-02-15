import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MasonryList from '@react-native-seoul/masonry-list';
import Popup from './popup';
import { getVideoData, deleteContent } from '../services/api';
import { supabase } from '../lib/supabase';

interface CardsProps {
  searchTerm: string;
  userId?: string;
}

const Cards: React.FC<CardsProps> = ({ searchTerm, userId }) => {
  const [cardsData, setCardsData] = useState<any[]>([]); // Add type annotation
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const [refreshKey, setRefreshKey] = useState(0); // Add this

  // To track image load status for each card
  const [imageLoadStatus, setImageLoadStatus] = useState<{ [key: string]: boolean }>({});

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Fetching data for user:', userId);
      const data = await getVideoData();
      console.log('Raw data received:', data);
      
      if (!Array.isArray(data)) {
        console.error('Data is not an array:', data);
        setError('Invalid data format received');
        return;
      }

      // No need to filter by user as it's already filtered from the backend
      const sortedData = data.sort((a: any, b: any) => {
        const dateB = new Date(b.date_added).getTime();
        const dateA = new Date(a.date_added).getTime();
        return dateB - dateA;
      });
      
      setCardsData(sortedData);
      setFilteredData(sortedData);
    } catch (err) {
      console.error('Error in fetchData:', err); // Enhanced error logging
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [userId, refreshKey]); // Add refreshKey dependency

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Remove the polling interval as it's not needed with real-time updates
  useEffect(() => {
    const channel = supabase.channel('content-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content' },
        () => {
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(cardsData);
    } else {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const filtered = cardsData.filter((item: any) => {
        const titleMatch = item.title?.toLowerCase().includes(lowercasedSearchTerm);
        const tagsMatch = item.tags?.toLowerCase().includes(lowercasedSearchTerm);
        const summaryMatch = item.summary?.toLowerCase().includes(lowercasedSearchTerm);
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

  // Handle image load status for each card
  const handleImageLoad = (id: string) => {
    setImageLoadStatus((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  const handleImageError = (id: string) => {
    setImageLoadStatus((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteContent(itemId);
      // Remove item from local state
      const newData = cardsData.filter(item => item.id !== itemId);
      setCardsData(newData);
      setFilteredData(newData);
      Alert.alert('Success', 'Content deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete content');
      console.error('Error deleting content:', error);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const ratio = getAspectRatio(item.original_url || '');
    const thumbnailUrl = item.thumbnail_url || 'assets/image-placeholder.png';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedItem(item)}
      >
        <Image
          source={{ uri: thumbnailUrl }}
          style={[styles.thumbnail, { aspectRatio: ratio }]}
          onError={() => handleImageError(item.id)}
          onLoad={() => handleImageLoad(item.id)}
        />
        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.title}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  if (error) {
    console.error('Error state:', error); // Add debug logging
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load data: {error}</Text>
      </View>
    );
  }


  if (!filteredData || filteredData.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: '#fff' }]}>No items found</Text>
      </View>
    );
  }

  return (
    <>
      <MasonryList
        data={filteredData}
        keyExtractor={(item: any, index: number) => 
          (item?.id || item?.ID || index).toString()
        }
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.grid}
        onEndReachedThreshold={0.5}
      />
      <Popup
        visible={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSaveNote={(note) => {
          console.log('Note saved:', note);
          setSelectedItem(null);
        }}
        onDelete={async () => {
          if (selectedItem?.id) {
            Alert.alert(
              'Delete Content',
              'Are you sure you want to delete this content?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await handleDelete(selectedItem.id);
                    setSelectedItem(null);
                  },
                },
              ],
              { cancelable: true }
            );
          }
        }}
        onShare={() => {
          console.log('Sharing item:', selectedItem?.id);
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
    // backgroundColor: '#2a2a2a', // Add background color
    // elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 10,
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
