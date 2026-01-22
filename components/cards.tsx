import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import MasonryList from '@react-native-seoul/masonry-list';
import Popup from './popup';
import { getVideoData, deleteContent } from '../services/api';
import { supabase } from '../lib/supabase';
import { SearchResult } from '../types';
import CardSkeleton from './CardSkeleton';
import { useSettings, SortType, CardViewType, CardDensityType, FontSizeType } from '../context/SettingsContext';
import { cacheService } from '../services/cacheService';

// Add interface for component props
interface CardsProps {
  searchTerm: string;
  userId?: string;
  onRefresh?: () => void;  // Add this prop
  performSearch: (query: string) => Promise<SearchResult[]>; // Add this
  initialData?: any[] | null; // Add this prop
}

// In Cards.tsx ensure cardsRef is properly typed
interface CardsRef {
  clearSearch: () => void;
}

const Cards = forwardRef<CardsRef, CardsProps>(({ 
  searchTerm, 
  userId, 
  onRefresh,
  performSearch,
  initialData 
}, ref) => {
  // Consolidate all state hooks at the top
  const [cardsData, setCardsData] = useState<any[]>(initialData || []);
  const [filteredData, setFilteredData] = useState<any[]>(initialData || []);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [cardLayout, setCardLayout] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoadStatus, setImageLoadStatus] = useState<{ [key: string]: boolean }>({});
  const [localData, setLocalData] = useState<SearchResult[]>([]);
  
  // Refs for search cancellation and tracking
  const searchIdRef = useRef(0);
  const searchTermRef = useRef(searchTerm);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;
  
  // Get settings for card display - add new settings
  const { 
    showCardTitles, 
    sortOrder, 
    actualTheme,
    cardView,
    cardDensity,
    fontSize,
    appTheme
  } = useSettings();

  const isDarkMode = actualTheme === 'dark';
  const { colors, spacing } = appTheme;

  // Remove duplicate clearSearch definition
  const clearSearch = useCallback(() => {
    setFilteredData(cardsData);
  }, [cardsData]);

  // Only expose clearSearch once via useImperativeHandle
  useImperativeHandle(ref, () => ({
    clearSearch
  }), [clearSearch]); // Add proper dependency

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      if (!userId) {
        console.log('No userId provided');
        setCardsData([]);
        setFilteredData([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      // If we have initial data and not forcing refresh, use it directly
      if (initialData && !forceRefresh) {
        console.log('Using preloaded initial data');
        const sortedData = sortCards(initialData, sortOrder);
        setCardsData(sortedData);
        // Only set filteredData when there is no active search
        if (!searchTermRef.current.trim()) {
          setFilteredData(sortedData);
        }
        setIsLoading(false);
        return;
      }

      // Try getting data from cache first
      const cachedData = await cacheService.getCache();
      
      // Use cache if available and not forcing refresh
      if (cachedData && !forceRefresh) {
        const sortedData = sortCards(cachedData, sortOrder);
        setCardsData(sortedData);
        // Only set filteredData when there is no active search
        if (!searchTermRef.current.trim()) {
          setFilteredData(sortedData);
        }
        setIsLoading(false);
        return;
      }

      // Only fetch from Supabase if no cache or force refresh
      const data = await getVideoData(0, PAGE_SIZE);
      
      if (!data || !Array.isArray(data)) {
        console.error('Invalid data format or no data received:', data);
        // Keep using cached data if available
        if (cachedData) {
          const sortedData = sortCards(cachedData, sortOrder);
          setCardsData(sortedData);
          setFilteredData(sortedData);
        } else {
          setCardsData([]);
          setFilteredData([]);
        }
        return;
      }

      // Check if there's more data available
      setHasMore(data.length === PAGE_SIZE);
      setCurrentPage(0);

      // Cache the fresh data
      await cacheService.setCache(data);

      // Apply sorting based on settings
      const sortedData = sortCards(data, sortOrder);
      setCardsData(sortedData);
      // Only update filteredData if no search is active
      if (!searchTermRef.current.trim()) {
        setFilteredData(sortedData);
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Try to use cached data on error
      const cachedData = await cacheService.getCache();
      if (cachedData) {
        const sortedData = sortCards(cachedData, sortOrder);
        setCardsData(sortedData);
        setFilteredData(sortedData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, sortOrder, initialData, PAGE_SIZE]);

  // Add function to load more cards
  const loadMoreCards = useCallback(async () => {
    if (loadingMore || !hasMore || !userId) {
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const offset = nextPage * PAGE_SIZE;

      const newData = await getVideoData(offset, PAGE_SIZE);

      if (newData && Array.isArray(newData) && newData.length > 0) {
        setHasMore(newData.length === PAGE_SIZE);
        setCurrentPage(nextPage);

        // Merge new data with existing
        const mergedData = [...cardsData, ...newData];
        const sortedData = sortCards(mergedData, sortOrder);
        setCardsData(sortedData);
        // Only update filteredData when there is no active search
        if (!searchTermRef.current.trim()) {
          setFilteredData(sortedData);
        }

        // Update cache with all data
        await cacheService.setCache(sortedData);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more cards:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, userId, currentPage, cardsData, sortOrder, PAGE_SIZE]);

  // Add function to sort cards based on settings
  const sortCards = (data: any[], order: SortType) => {
    return [...data].sort((a, b) => {
      if (order === 'newest') {
        // Sort newest first (descending by date_added)
        return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
      } else if (order === 'oldest') {
        // Sort oldest first (ascending by date_added)
        return new Date(a.date_added).getTime() - new Date(b.date_added).getTime();
      } else if (order === 'modified') {
        // Sort by most recently modified
        const aDate = a.updated_at ? new Date(a.updated_at) : new Date(a.date_added);
        const bDate = b.updated_at ? new Date(b.updated_at) : new Date(b.date_added);
        return bDate.getTime() - aDate.getTime();
      }
      return 0;
    });
  };

  // Keep a ref of the current search term so background fetches can respect it
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  // Re-sort when sort order changes
  useEffect(() => {
    if (cardsData.length > 0) {
      const sortedData = sortCards(cardsData, sortOrder);
      setCardsData(sortedData);
      // Only update filteredData if there is no active search (prevents clobbering search results)
      if (!searchTermRef.current.trim()) {
        setFilteredData(sortedData);
      }
    }
  }, [sortOrder]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Optimize search effect (add cancellation and avoid clobbering by background fetches)
  useEffect(() => {
    let currentSearchId: number | null = null;

    const doSearch = async () => {
      try {
        setIsLoading(true);

        // If search term is empty, show all cards immediately
        if (!searchTerm.trim()) {
          setFilteredData(cardsData);
          return;
        }

        // Local search for very short queries
        if (searchTerm.length <= 3) {
          const q = searchTerm.toLowerCase();
          const localResults = cardsData.filter(item => 
            (item.title?.toLowerCase().includes(q) ||
             item.user_notes?.toLowerCase().includes(q) ||
             item.tags?.toLowerCase().includes(q))
          );
          setFilteredData(localResults);
          return;
        }

        // For longer queries, perform backend search with cancellation id
        currentSearchId = ++searchIdRef.current;
        const results = await performSearch(searchTerm);

        // If a newer search started, ignore this result (prevents flicker)
        if (searchIdRef.current !== currentSearchId) return;

        if (Array.isArray(results)) {
          setFilteredData(results);
          // Cache these results locally
          setLocalData(results);
        }
      } catch (error) {
        console.error('Search error:', error);
        const q = searchTerm.toLowerCase();
        const localResults = cardsData.filter(item => 
          (item.title?.toLowerCase().includes(q) ||
           item.user_notes?.toLowerCase().includes(q) ||
           item.tags?.toLowerCase().includes(q))
        );
        setFilteredData(localResults);
      } finally {
        // Only clear loading state if this search is still the latest or there was no newer search
        if (currentSearchId === null || searchIdRef.current === currentSearchId) {
          setIsLoading(false);
        }
      }
    };

    doSearch();

    // no explicit cancellation is required as we use an incrementing searchIdRef
  }, [searchTerm, cardsData, performSearch]);

  // Modify getAspectRatio to consider card density
  const getAspectRatio = (url: string) => {
    let baseRatio = 1;
    
    if (url?.includes('youtube')) baseRatio = 16 / 9;
    else if (url?.includes('instagram')) baseRatio = 9 / 16;
    else baseRatio = 4 / 3;
    
    // Adjust aspect ratio based on card density
    if (cardDensity === 'compact') return baseRatio * 0.8;
    if (cardDensity === 'spacious') return baseRatio * 1.2;
    return baseRatio;
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

  // Update renderItem to handle font size
  const renderItem = ({ item }: { item: any }) => {
    const ratio = getAspectRatio(item.original_url || '');
    let thumbnailUrl = item.thumbnail_url;
    
    // Use safer fallback mechanism
    let imageSource;
    try {
      if (item.video_type === 'note') {
        imageSource = require('../assets/notes.png');
      } else if (thumbnailUrl) {
        imageSource = { uri: thumbnailUrl };
      } else {
        // Use a base64 placeholder instead of local image
        imageSource = { 
          uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMy0xOFQyMDowOToxNiswNTozMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDphMTFjOWQ1Yi00ZWZhLTRkNGItYmQ4Yi02ODAxZjhjY2EzMDMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDozNjBiYzQ1Yy0yYzBiLTM0NDItODBl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'
        };
      }
    } catch (error) {
      // Fallback to base64 placeholder if image loading fails
      imageSource = { 
        uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAzLTE4VDIwOjA5OjE2KzA1OjMwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMy0xOFQyMDowOToxNiswNTozMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDphMTFjOWQ1Yi00ZWZhLTRkNGItYmQ4Yi02ODAxZjhjY2EzMDMiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDozNjBiYzQ1Yy0yYzBiLTM0NDItODBl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'
      };
    }

    // Add carousel indicator for image posts
    const isCarousel = item.is_carousel;
    const mediaCount = item.media_count;

    // Get font size based on settings
    const titleFontSize = fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14;

    // Get spacing based on card density
    const cardMargin = cardDensity === 'compact' ? 4 : 
                       cardDensity === 'spacious' ? 12 : 7;

    // Special rendering for list view - updated to make cards smaller and fix summary display
    if (cardView === 'list') {
      return (
        <TouchableOpacity
          style={[
            styles.card, 
            styles.listCard, // Add specific list card styling
            { 
              margin: cardMargin,
              backgroundColor: colors.surface
            }
          ]}
          onPress={(event) => {
            event.currentTarget.measure((x, y, width, height, pageX, pageY) => {
              setCardLayout({ x: pageX, y: pageY, width, height });
              setSelectedItem(item);
            });
          }}
        >
          <View style={styles.listCardContent}>
            {/* Left: Image */}
            <View style={styles.listImageContainer}>
              <Image
                source={imageSource}
                style={[
                  styles.listThumbnail,
                  { 
                    aspectRatio: ratio,
                    borderRadius: spacing.sm
                  }
                ]}
                onError={() => handleImageError(item.id)}
                onLoad={() => handleImageLoad(item.id)}
              />
              {isCarousel && (
                <View style={styles.listCarouselIndicator}>
                  <Text style={styles.carouselCount}>{mediaCount}</Text>
                </View>
              )}
            </View>
            
            {/* Right: Text content */}
            <View style={styles.listCardText}>
              {showCardTitles && (
                <Text 
                  numberOfLines={2}
                  ellipsizeMode="tail" 
                  style={[
                    styles.listTitle, 
                    { 
                      fontSize: titleFontSize,
                      color: colors.text,
                    }
                  ]}
                >
                  {item.title}
                </Text>
              )}
              <Text 
                numberOfLines={1}
                ellipsizeMode="tail" 
                style={[
                  styles.listSummary, 
                  { 
                    fontSize: titleFontSize - 2,
                    color: colors.textSecondary,
                  }
                ]}
              >
                {item.summary}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Original grid view rendering
    return (
      <TouchableOpacity
        style={[styles.card, { 
          margin: cardMargin,
          backgroundColor: 'transparent'
        }]}
        onPress={(event) => {
          event.currentTarget.measure((x, y, width, height, pageX, pageY) => {
            setCardLayout({ x: pageX, y: pageY, width, height });
            setSelectedItem(item);
          });
        }}
      >
        <View>
          <Image
            source={imageSource}
            style={[
              styles.thumbnail, 
              { 
                aspectRatio: ratio,
                borderRadius: spacing.md
              }
            ]}
            onError={() => handleImageError(item.id)}
            onLoad={() => handleImageLoad(item.id)}
          />
          {isCarousel && (
            <View style={styles.carouselIndicator}>
              <Text style={styles.carouselCount}>{mediaCount}</Text>
            </View>
          )}
        </View>
        {showCardTitles && (
          <Text 
            numberOfLines={2} 
            ellipsizeMode="tail" 
            style={[
              styles.title, 
              { 
                fontSize: titleFontSize,
                color: colors.text,
              }
            ]}
          >
            {item.title}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Only show skeleton when loading and no data available
  if (isLoading && cardsData.length === 0) {
    return <CardSkeleton numColumns={cardView === 'list' ? 1 : 2} />;
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

  // Only show "No items found" when we're done loading AND have no items AND not searching
  if (!isLoading && (!filteredData || filteredData.length === 0) && !searchTerm) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: '#fff' }]}>No items found</Text>
      </View>
    );
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await cacheService.clearCache(); // Clear cache on manual refresh
      await fetchData(true); // Force fetch from Supabase
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Return the appropriate list component based on the view mode
  if (cardView === 'list') {
    return (
      <>
        <FlatList
          data={filteredData}
          keyExtractor={(item: any, index: number) => 
            (item?.id || item?.ID || index).toString()
          }
          renderItem={renderItem}
          contentContainerStyle={[
            styles.grid, 
            { 
              backgroundColor: colors.background,
              paddingBottom: 20 // For ThoughtField
            }
          ]}
          onEndReached={loadMoreCards}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={loadingMore ? (
            <View style={{ padding: 20 }}>
              <Text style={{ color: colors.text, textAlign: 'center' }}>
                Loading more...
              </Text>
            </View>
          ) : null}
        />
        <Popup
          visible={!!selectedItem}
          item={selectedItem}
          cardLayout={cardLayout}
          onClose={() => {
            setSelectedItem(null);
            setCardLayout(null);
          }}
          onSaveNote={(note) => {
            console.log('Note saved:', note);
            setSelectedItem(null);
            setCardLayout(null);
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
  }

  // Default grid view using MasonryList
  return (
    <>
      <MasonryList
        data={filteredData}
        keyExtractor={(item: any, index: number) => 
          (item?.id || item?.ID || index).toString()
        }
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={[
          styles.grid, 
          { 
            backgroundColor: colors.background,
            paddingBottom: 20 // For ThoughtField
          }
        ]}
        onEndReached={loadMoreCards}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={loadingMore ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.text }}>
              Loading more...
            </Text>
          </View>
        ) : null}
      />
      <Popup
        visible={!!selectedItem}
        item={selectedItem}
        cardLayout={cardLayout}
        onClose={() => {
          setSelectedItem(null);
          setCardLayout(null);
        }}
        onSaveNote={(note) => {
          console.log('Note saved:', note);
          setSelectedItem(null);
          setCardLayout(null);
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
    paddingBottom: 20, // Increased padding for ThoughtField
  },
  card: {
    flex: 1,
    margin: 7,
    borderRadius: 10,
    overflow: 'hidden',
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
  carouselIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 8,
  },
  carouselCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Add style for summary text in list view
  summary: {
    backgroundColor: 'transparent',
  },
  // Add specific styles for list view
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  listCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listImageContainer: {
    marginRight: 10,
  },
  listThumbnail: {
    width: 60,
    height: 60,
    resizeMode: 'cover',
  },
  listCardText: {
    flex: 1,
  },
  listTitle: {
    fontWeight: 'bold',
  },
  listSummary: {
    marginTop: 4,
  },
  listCarouselIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 2,
    paddingHorizontal: 4,
  },
});

export default Cards;
