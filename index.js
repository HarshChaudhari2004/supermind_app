/**
 * @format
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import ThemedApp from './components/ThemedApp';
import { name as appName } from './app.json';
import ErrorBoundary from './components/ErrorBoundary';
import { SettingsProvider } from './context/SettingsContext';
import ShareConfirmationOverlay from './components/ShareConfirmationOverlay';

const AppWithProviders = () => (
  <ErrorBoundary>
    <SettingsProvider>
      <ThemedApp />
    </SettingsProvider>
  </ErrorBoundary>
);

// Register main app
AppRegistry.registerComponent(appName, () => AppWithProviders);

// Register share extension component
AppRegistry.registerComponent('ShareExtension', () => ShareConfirmationOverlay);
