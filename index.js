/**
 * @format
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import ThemedApp from './components/ThemedApp';
import { name as appName } from './app.json';
import ErrorBoundary from './components/ErrorBoundary';
import { SettingsProvider } from './context/SettingsContext';

const AppWithProviders = () => (
  <ErrorBoundary>
    <SettingsProvider>
      <ThemedApp />
    </SettingsProvider>
  </ErrorBoundary>
);

AppRegistry.registerComponent(appName, () => AppWithProviders);
