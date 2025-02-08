const BASE_URL = 'https://supermind-production.up.railway.app';

export const sendUrlToBackend = async (url: string): Promise<any> => {
  try {
    let endpoint = '/web/api/analyze-website/';
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      endpoint = '/api/generate-summary/';
    } else if (url.includes('instagram.com')) {
      endpoint = '/instagram/api/analyze-instagram/';
    }

    const response = await fetch(`${BASE_URL}${endpoint}?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending URL to backend:', error);
    throw error;
  }
};