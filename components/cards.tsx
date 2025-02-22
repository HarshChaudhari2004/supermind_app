import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MasonryList from '@react-native-seoul/masonry-list';
import Popup from './popup';
import { getVideoData, deleteContent } from '../services/api';
import { supabase } from '../lib/supabase';
import { SearchResult } from '../types';

// Add interface for component props
interface CardsProps {
  searchTerm: string;
  userId?: string;
  onRefresh?: () => void;  // Add this prop
  performSearch: (query: string) => Promise<SearchResult[]>; // Add this
}

// In Cards.tsx ensure cardsRef is properly typed
interface CardsRef {
  clearSearch: () => void;
}

const Cards = forwardRef<CardsRef, CardsProps>(({ 
  searchTerm, 
  userId, 
  onRefresh,
  performSearch 
}, ref) => {
  // Consolidate all state hooks at the top
  const [cardsData, setCardsData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoadStatus, setImageLoadStatus] = useState<{ [key: string]: boolean }>({});

  // Remove duplicate clearSearch definition
  const clearSearch = useCallback(() => {
    setFilteredData(cardsData);
  }, [cardsData]);

  // Only expose clearSearch once via useImperativeHandle
  useImperativeHandle(ref, () => ({
    clearSearch
  }), [clearSearch]); // Add proper dependency

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null); // Reset error state
      
      if (!userId) {
        console.log('No userId provided');
        setCardsData([]);
        setFilteredData([]);
        return;
      }

      const data = await getVideoData();
      
      if (!data) {
        console.log('No data received');
        setCardsData([]);
        setFilteredData([]);
        return;
      }

      if (!Array.isArray(data)) {
        console.error('Invalid data format:', data);
        setError('Invalid data format received');
        setCardsData([]);
        setFilteredData([]);
        return;
      }

      const sortedData = data.sort((a, b) => {
        return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
      });

      setCardsData(sortedData);
      setFilteredData(sortedData);
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setCardsData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, refreshKey]); // Add refreshKey dependency

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Fix real-time subscription
  useEffect(() => {
    let channel: any;
    if (userId) { // Only subscribe when user is logged in
      channel = supabase.channel('content-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'content' },
          () => {
            // setRefreshKey(prev => prev + 1); <- REMOVE THIS
            console.log('Content changed');
          }
        )
        .subscribe();
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  // Optimize search effect
  useEffect(() => {
    const doSearch = async () => {
      try {
        setIsLoading(true);
        const results = await performSearch(searchTerm);
        
        if (Array.isArray(results)) {
          setFilteredData(results);
        } else {
          console.warn('Search returned invalid results:', results);
          setFilteredData([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setFilteredData([]);
      } finally {
        setIsLoading(false);
      }
    };

    doSearch();
  }, [searchTerm, performSearch]);

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
    let thumbnailUrl = item.thumbnail_url;
    
    // Use safer fallback mechanism
    let imageSource;
    try {
      if (item.video_type === 'note') {
        imageSource = require('../assets/note.jpg');
      } else if (thumbnailUrl) {
        imageSource = { uri: thumbnailUrl };
      } else {
        // Use a base64 placeholder instead of local image
        imageSource = { 
          uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMy0xOFQyMDowOToxNiswNTozMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDphMTFjOWQ1Yi00ZWZhLTRkNGItYmQ4Yi02ODAxZjhjY2EzMDMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDozNjBiYzQ1Yy0yYzBiLTM0NDItODBlMC0zNjBiM2E3NGFhNTgiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo2YzZlMDA5Zi03NGJhLTQwNGUtYmQ4Yi02ODAxZjhjY2EzMDMiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDphMTFjOWQ1Yi00ZWZhLTRkNGItYmQ4Yi02ODAxZjhjY2EzMDMiIHN0RXZ0OndoZW49IjIwMjQtMDMtMThUMjA6MDk6MTYrMDU6MzAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyNC4wIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6YTExYzlkNWItNGVmYS00ZDRiLWJkOGItNjgwMWY4Y2NhMzAzIiBzdEV2dDp3aGVuPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+aBYQwwAABTFJREFUeJzt3U9uE1kUxvFzq8pOAkiABNLdEmw5K2AFsAN2AjtgB7ACWEFvgZ4ljIC0BGF+jVP31oybIJK2k+CO7fP7SC8vtuPY+vS9de6pMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8W1nrAeC/u/f4YWpmA0kTs5CZ+YGZ/0XS9yR9MbNzZz0ws5GZPVTyyczeSroysw9m9lHSjzGXn58+/9Z6rPh7BECHfPvp/nczeyDpoaSRmR26+0TSgZn1zKxHm2JRSf0k6UbSjbtPJU1DOJ+G0H0zs9fu/nIe40WM8evXL9YDAQFwR33/+KdBCB66+4m7T8xsGEIx9BD0zKxnZv+2A0zuXkmqk3QlaermV2Y2dfcrM/9oZm8lnYV4vrm+Dr++Pj+7aX0PQQCsxd3HD4eSHpj7kZk/kDQxs7Gk0t0PQggOzWwgqXPBX4e7V+5emWUzSTN3n0oK4XB/F47wzt3PzOyNpHOCYXUIgBW79/jhsZk/NrNjdx+GNnxsZgeSBu4+MLN+WK7r1Hx9E4KwqiV9NffvSRCsdtq/lPTG3c/M7Cz0Ft68fv7sovUIWhMA/8PdJw9L9zgxs2NJR2bW9xD27j5w936TcklFCAVBsEa3gqGSVLv7zN1nZjY1s0sLwXB3f+vuZ5Jeu/urEAznr89/mbc+/nUgAP7E8U/3i5AdJz47dvdJ6NUfmdnAQxAkSRKuEQo6jSAsgyEEgoUwmEn6Yq5zM/to7h/dvXL3t2b2UtKZpPPX52fTtf0SHUcABCc/PyjNbeLuE0nHZjYM03wzD/18dw89/iQ0BdEpu4JhufwoQjBcuvuVpKm5n5vZuZl9cvcrd38XwuHi/PnZl7X8Qh0S9QS59/jhKGTHoybgJR2G6b1RGfr5krr2hQf+zu1guDUluTxAVA9M9Tb0H67d/UOY2nwl6eL8+dlV6+NflWgC4O6ThweSjtIkiGEJ77gI03uDTYZXkob8sRCT28FgZsvlxxCeZVBJujazS3f/HJY337v75/Pn/5u2Pv5l2rsAuPfkx767H5nZkZlNPA3TeyMzG4flvIMQADFO7+HfaYKhuf4YgqCS9Dnc7/BBUlWVyeXv37//2fr4/629CIC7Tx72JB1J/sjMxpaWemcWlvTcfRAW8sjz6K3lEmQIBqtDeN5kZleSLiVduftnM7tw9w/nz5+1XoLcmwD4x0/3k6QYu/tx2HI7kXQYpvYOLCzprcXRIewDSXObNcHQL+rZlaQrd/8i6aOZ/bEvS5B7EQDufuyhGT8xs0NJw9Cvn5QhACTxtYZd8FcBYO41AWCSpq2P///YiwC49+ThSPPtMz0zO2yhPy8OJqHDLOTCVJKZhRD4uA8BsBcBYGZ9STJ3SzT3vtvECQB0GwEAAIhSL0nS1scAAFi9XpIkCQEAAPEhAAAgUml6awNO6+MAAKxWmiRJvyQAACA+6a0eAAEAAPHopTb/cwsEAADEI02StBcxAABAhJIkSUoWAQEgOr0kSdKMAACACCVJkpSsBQBAfNKwE5AAkHhrA0CklgHAWUAAEBkCAABilCZJ0mMVEADiw1kAAIhRmiRJSgAAQHzYCAQAMeIkIADEKE2SpEcAAEB8CAAAiFEvZR8AAESJHgAAxChNkqQkAAAgPvQAACBGKVuBASBO9AAAIEYEAADEKGUnIADEiR4AAMSInYAAECMCAABiRAAAQIwIAACIET0AAIgRAQAAMSIAACBGBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYG/8CQMBh4qd8LyiAAAAAElFTkSuQmCC' 
        };
      }
    } catch (error) {
      // Fallback to base64 placeholder if image loading fails
      imageSource = { 
        uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMy0xOFQyMDowOToxNiswNTozMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDphMTFjOWQ1Yi00ZWZhLTRkNGItYmQ4Yi02ODAxZjhjY2EzMDMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDozNjBiYzQ1Yy0yYzBiLTM0NDItODBl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'
      };
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedItem(item)}
      >
        <Image
          source={imageSource}
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

  if (isLoading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: '#fff' }]}>Loading...</Text>
      </View>
    );
  }

  // Update the error state display
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: '#fff' }]}>
          {error.includes('column c.content') 
            ? 'Search is currently unavailable. Please try again later.'
            : `Failed to load data: ${error}`}
        </Text>
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

  const handleRefresh = async () => {
    try {
      await fetchData();
      onRefresh?.();
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

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
        refreshing={refreshing}
        onRefresh={handleRefresh}
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
});

const styles = StyleSheet.create({
  grid: {
    padding: 10,
    paddingBottom: 200, // Increased padding for ThoughtField
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
