import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  BackHandler,
  Image, // Add this import
} from 'react-native';
import { 
  useSettings, 
  SortType, 
  CardViewType, 
  CardDensityType, 
  FontSizeType 
} from '../context/SettingsContext';

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
}

// Get device dimensions
const { width } = Dimensions.get('window');

// Mock icon component with emoji
const Icon = ({ name, color, size = 24 }: { name: string, color: string, size?: number }) => {
  const icons = {
    theme: '🎨',
    palette: '🎭',
    view: '👁️',
    title: '📝',
    layout: '📊',
    density: '📏',
    sort: '⏬',
    filter_list: '🔣',
    font_size: '🔤',
    close: '❌',
  };

  return (
    <Text style={{ fontSize: size, marginRight: 12, color }}>
      {icons[name as keyof typeof icons] || '📋'}
    </Text>
  );
};

const Settings: React.FC<SettingsProps> = ({ visible, onClose }) => {
  const { 
    theme, 
    setTheme, 
    showCardTitles, 
    setShowCardTitles, 
    sortOrder, 
    setSortOrder,
    cardView,
    setCardView,
    cardDensity,
    setCardDensity,
    fontSize,
    setFontSize,
    actualTheme,
    appTheme,
  } = useSettings();

  // Add BackHandler for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (visible) {
          onClose();
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }
  }, [visible, onClose]);

  // Destructure theme values for easier access
  const { colors, spacing, borderRadius } = appTheme;

  // Apply theme colors to our styles using useMemo for performance
  const styles = useMemo(() => createStyles(colors, spacing, borderRadius), [colors, spacing, borderRadius]);

  // Method to show color preview for theme options
  const ThemePreview = ({ themeMode, active }: { themeMode: 'light' | 'dark' | 'system', active: boolean }) => {
    const colors = {
      light: ['#ffffff', '#f0f0f0', '#9c27b0'],
      dark: ['#171717', '#2a2a2a', '#bc10e3'],
      system: ['#ffffff', '#171717', '#9c27b0'],
    };
    
    return (
      <View style={styles.themePreview}>
        {colors[themeMode].map((color, index) => (
          <View 
            key={index} 
            style={[
              styles.colorPreview, 
              { backgroundColor: color }
            ]} 
          />
        ))}
      </View>
    );
  };

  // Helper function to render theme button
  const renderThemeButton = (themeValue: 'light' | 'dark' | 'system', label: string) => {
    const isActive = theme === themeValue;
    
    return (
      <TouchableOpacity
        style={[
          styles.themeButton,
          isActive && styles.activeThemeButton
        ]}
        onPress={() => setTheme(themeValue)}
        activeOpacity={0.7}
      >
        <ThemePreview themeMode={themeValue} active={isActive} />
        <Text style={[
          styles.themeButtonText,
          isActive && styles.activeThemeButtonText
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Create separate sections for grouping options
  const Section = ({ 
    title, 
    icon, 
    children 
  }: { 
    title: string, 
    icon: string,
    children: React.ReactNode 
  }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} color={colors.primary} size={24} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  // Generic option row component with optional icon
  const OptionRow = ({ 
    title, 
    icon, 
    children, 
    description 
  }: { 
    title: string, 
    icon?: string,
    children?: React.ReactNode,
    description?: string
  }) => (
    <View style={styles.optionContainer}>
      <View style={styles.optionRow}>
        <View style={styles.optionTitleContainer}>
          {icon && <Icon name={icon} color={colors.textSecondary} size={20} />}
          <Text style={styles.optionTitle}>{title}</Text>
        </View>
        {children && (
          <View style={styles.optionControl}>
            {children}
          </View>
        )}
      </View>
      {description && (
        <Text style={styles.optionDescription}>{description}</Text>
      )}
    </View>
  );

  // Selection buttons for options with multiple choices
  const SelectionGroup = <T extends string>({ 
    options, 
    value, 
    onChange,
    vertical = false,
  }: { 
    options: Array<{ value: T, label: string }>, 
    value: T, 
    onChange: (value: T) => void,
    vertical?: boolean,
  }) => (
    <View style={[
      styles.selectionGroup,
      vertical && styles.selectionGroupVertical
    ]}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.selectionButton,
            value === option.value && styles.selectionButtonActive,
            vertical && styles.selectionButtonVertical
          ]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.selectionText,
              value === option.value && styles.selectionTextActive
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={actualTheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <Image 
                source={require('../assets/close.png')}
                style={{ width: 24, height: 24, tintColor: colors.text }}
              />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Section title="Appearance" icon="theme">
              {/* Theme selection */}
              <OptionRow 
                title="Theme" 
                icon="palette"
                description="Customize how SuperMind looks to you"
              />
              
              <View style={styles.themeOptions}>
                {renderThemeButton('light', 'Light')}
                {renderThemeButton('dark', 'Dark')}
                {renderThemeButton('system', 'System')}
              </View>
              
              {/* Font Size selection - now in vertical layout */}
              <OptionRow 
                title="Font Size" 
                icon="font_size"
                description="Adjust text size throughout the app"
              />
              
              <SelectionGroup
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
                value={fontSize}
                onChange={setFontSize}
              />
            </Section>

            <Section title="Card Display" icon="view">
              <OptionRow 
                title="Show Card Titles" 
                icon="title"
                description="Display titles below cards in the main view"
              >
                <Switch
                  value={showCardTitles}
                  onValueChange={setShowCardTitles}
                  thumbColor={colors.primary}
                  trackColor={{ 
                    false: actualTheme === 'dark' ? '#333' : '#d0d0d0', 
                    true: actualTheme === 'dark' ? colors.primaryVariant : '#d896e2' 
                  }}
                />
              </OptionRow>

              {/* View Mode selection - with improved spacing */}
              <OptionRow 
                title="View Mode" 
                icon="layout"
                description="Choose how your content is displayed"
              />
              
              <View style={styles.viewModeContainer}>
                <SelectionGroup
                  options={[
                    { value: 'grid', label: 'Grid' },
                    { value: 'list', label: 'List' },
                  ]}
                  value={cardView}
                  onChange={setCardView}
                />
              </View>

              {/* Card Density - now in vertical layout */}
              <OptionRow 
                title="Card Density" 
                icon="density"
                description="Adjust spacing between cards"
              />
              
              <SelectionGroup
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'spacious', label: 'Spacious' },
                ]}
                value={cardDensity}
                onChange={setCardDensity}
              />
            </Section>

            <Section title="Content Order" icon="sort">
              <OptionRow 
                title="Sort Cards By" 
                icon="filter_list"
                description="Choose how your content is sorted"
              />
              
              <SelectionGroup
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'modified', label: 'Last Modified' },
                ]}
                value={sortOrder}
                onChange={setSortOrder}
                vertical={true}
              />
            </Section>
          </ScrollView>
          
          {/* Footer with version info - now fixed at bottom */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>SuperMind v2.0.0</Text>
            <Text style={styles.copyrightText}>© 2024 SuperMind Labs</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Create styles with theme parameters
const createStyles = (colors: any, spacing: any, borderRadius: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 30 : 0, // Added top padding
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative', // For absolute positioning of footer
  },
  scrollContent: {
    paddingBottom: 100, // Space for footer
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginTop: spacing.lg * 1.5,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionContainer: {
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 32,
    marginBottom: 8,
  },
  optionControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: spacing.sm,
  },
  selectionGroupVertical: {
    flexDirection: 'column',
  },
  selectionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.pill,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.surfaceVariant,
    minWidth: 80,
    alignItems: 'center',
  },
  selectionButtonVertical: {
    width: '100%',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  selectionButtonActive: {
    backgroundColor: colors.primary,
  },
  selectionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  selectionTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  themeOptions: {
    flexDirection: 'row',
    marginVertical: spacing.md,
    justifyContent: 'space-between',
    width: '100%',
  },
  themeButton: {
    width: (width - spacing.lg * 2 - spacing.md * 2 - 16) / 3,
    margin: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  activeThemeButton: {
    borderColor: colors.primary,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
    color: colors.text,
  },
  activeThemeButtonText: {
    color: colors.primary,
  },
  themePreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorPreview: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  versionText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  copyrightText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  viewModeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});

export default Settings;
