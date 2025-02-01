import React, { useEffect } from 'react';
import ShareMenu, { ShareData } from 'react-native-share-menu';
import ShareView from './ShareView';
import { sendUrlToBackend } from '../services/api';

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
        
        setTimeout(() => {
          (ShareMenu as any).dismissExtension();
        }, 1500);

      } catch (error) {
        console.error('Share processing failed:', error);
        (ShareMenu as any).dismissExtension();
      }
    };

    ShareMenu.getInitialShare(handleShare);
  }, []);

  return <ShareView />;
}