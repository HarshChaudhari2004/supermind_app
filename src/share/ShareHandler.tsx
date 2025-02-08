import React, { useEffect } from 'react';
import ShareMenu, { ShareData } from 'react-native-share-menu';
import ShareView from './ShareView';
import { sendUrlToBackend } from '../../services/api.ts';
import { Alert } from 'react-native';

export default function ShareHandler() {
  useEffect(() => {
    const handleShare = async (share: ShareData | null | undefined) => {
      try {
        if (!share) {
          // Use as any as a temporary workaround for type issues
          (ShareMenu as any).dismissExtension();
          return;
        }

        const { data, mimeType } = share;
        
        if (mimeType !== 'text/plain') {
          (ShareMenu as any).dismissExtension();
          return;
        }

        const url = Array.isArray(data) ? data[0] : data;

        if (!url) {
          (ShareMenu as any).dismissExtension();
          return;
        }

        console.log('Processing shared URL:', url);
        await sendUrlToBackend(url);
        
        // Wait for backend to process
        await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));
        
        // Verify the URL was added
        const BASE_URL = 'https://supermind-production.up.railway.app';
        const verifyResponse = await fetch(`${BASE_URL}/api/video-data/`);
        const verifyData = await verifyResponse.json();
        
        const urlExists = verifyData.some((item: any) => 
          item.URL === url || item['Video URL'] === url
        );

        if (!urlExists) {
          throw new Error("URL was not properly processed");
        }

        Alert.alert('Success', 'URL processed and added successfully');
        (ShareMenu as any).dismissExtension();

      } catch (error) {
        console.error('Share processing failed:', error);
        Alert.alert('Error', `Failed to process URL: ${(error as Error).message}`);
        (ShareMenu as any).dismissExtension();
      }
    };

    ShareMenu.getInitialShare(handleShare);
  }, []);

  return <ShareView />;
}