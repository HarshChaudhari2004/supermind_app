import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ShareMenu from 'react-native-share-menu';
import { sendUrlToBackend } from './services/api';
import { LogBox } from 'react-native';

// Enable logs in release mode
LogBox.ignoreAllLogs();
console.log("ShareHandler: Extension initialized");

interface SharedData {
  mimeType: string;
  data: string;
}

const ShareHandler = () => {
  const [sharedData, setSharedData] = useState<SharedData | null>(null);

  useEffect(() => {
    console.log("ShareHandler: Setting up share handler");
    
    const handleShare = async (item: any) => {
      try {
        console.log("ShareHandler: Received share item:", JSON.stringify(item));
        
        if (!item) {
          console.log("ShareHandler: No data received");
          Alert.alert("Error", "No data received");
          (ShareMenu as any).dismissExtension();
          return;
        }

        // Extract URL from shared data
        let url: string;
        if (Array.isArray(item.data)) {
          url = item.data[0];
        } else {
          url = item.data;
        }

        console.log("ShareHandler: Processing URL:", url);
        
        if (!url) {
          console.log("ShareHandler: Invalid URL");
          Alert.alert("Error", "Invalid URL");
          (ShareMenu as any).dismissExtension();
          return;
        }

        setSharedData({ mimeType: item.mimeType, data: url });

        // Wait 2 seconds to show the UI before sending
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("ShareHandler: Sending URL to backend");
        await sendUrlToBackend(url);
        
        console.log("ShareHandler: Successfully processed URL");
        // Wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        (ShareMenu as any).dismissExtension();
      } catch (error) {
        console.error("ShareHandler Error:", error);
        Alert.alert("Error", "Failed to process URL");
        (ShareMenu as any).dismissExtension();
      }
    };

    ShareMenu.getInitialShare(handleShare);
  }, []);

  return (
    <LinearGradient
      colors={['hsla(278, 100%, 50%, 1)', 'hsla(302, 98%, 50%, 1)']}
      style={styles.container}
    >
      <Text style={styles.title}>Nice Find</Text>
      <Text style={styles.subtitle}>Saving to your Knowledge Base</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
  },
});

export default ShareHandler;
