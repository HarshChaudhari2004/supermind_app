import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { getTheme, AppTheme, ColorMode } from '../theme/Theme';

export type SortType = 'newest' | 'oldest' | 'modified';
export type ThemeType = 'light' | 'dark' | 'system';
export type CardViewType = 'grid' | 'list';
export type CardDensityType = 'compact' | 'standard' | 'spacious';
export type FontSizeType = 'small' | 'medium' | 'large';

interface Settings {
  theme: ThemeType;
  showCardTitles: boolean;
  sortOrder: SortType;
  cardView: CardViewType;
  cardDensity: CardDensityType;
  fontSize: FontSizeType;
  enableAutoPlay: boolean;
}

interface SettingsContextType extends Settings {
  setTheme: (theme: ThemeType) => void;
  setShowCardTitles: (show: boolean) => void;
  setSortOrder: (order: SortType) => void;
  setCardView: (view: CardViewType) => void;
  setCardDensity: (density: CardDensityType) => void;
  setFontSize: (size: FontSizeType) => void;
  setEnableAutoPlay: (enable: boolean) => void;
  actualTheme: ColorMode;
  appTheme: AppTheme;
}

const defaultSettings: Settings = {
  theme: 'system',
  showCardTitles: true,
  sortOrder: 'newest',
  cardView: 'grid',
  cardDensity: 'standard',
  fontSize: 'medium',
  enableAutoPlay: true,
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  setTheme: () => {},
  setShowCardTitles: () => {},
  setSortOrder: () => {},
  setCardView: () => {},
  setCardDensity: () => {},
  setFontSize: () => {},
  setEnableAutoPlay: () => {},
  actualTheme: 'dark',
  appTheme: getTheme('dark'),
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const systemColorScheme = useColorScheme() || 'dark';
  
  const actualTheme: ColorMode = settings.theme === 'system' 
    ? systemColorScheme as ColorMode 
    : settings.theme as ColorMode;

  // Get the full theme based on the actual theme mode
  const appTheme = useMemo(() => getTheme(actualTheme), [actualTheme]);

  useEffect(() => {
    // Load saved settings when the app starts
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('app_settings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Save settings whenever they change
  const updateSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const setTheme = (theme: ThemeType) => {
    updateSettings({ ...settings, theme });
  };

  const setShowCardTitles = (showCardTitles: boolean) => {
    updateSettings({ ...settings, showCardTitles });
  };

  const setSortOrder = (sortOrder: SortType) => {
    updateSettings({ ...settings, sortOrder });
  };

  const setCardView = (cardView: CardViewType) => {
    updateSettings({ ...settings, cardView });
  };

  const setCardDensity = (cardDensity: CardDensityType) => {
    updateSettings({ ...settings, cardDensity });
  };

  const setFontSize = (fontSize: FontSizeType) => {
    updateSettings({ ...settings, fontSize });
  };

  const setEnableAutoPlay = (enableAutoPlay: boolean) => {
    updateSettings({ ...settings, enableAutoPlay });
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setTheme,
        setShowCardTitles,
        setSortOrder,
        setCardView,
        setCardDensity,
        setFontSize,
        setEnableAutoPlay,
        actualTheme,
        appTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
