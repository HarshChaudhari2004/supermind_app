// src/services/api.ts

const BASE_URL = 'https://supermind-9fii.onrender.com';

// Function to check if the URL is from YouTube
function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

// Function to check if the URL is from Instagram
function isInstagramUrl(url: string): boolean {
  return url.includes("instagram.com");
}

// Function to send the URL to the appropriate backend based on platform
export const sendUrlToBackend = async (url: string) => {
  let endpoint = '';
  
  // Determine endpoint based on URL
  if (isYouTubeUrl(url)) {
    endpoint = '/api/generate-summary/';
  } else if (isInstagramUrl(url)) {
    endpoint = '/instagram/api/analyze-instagram/';
  } else {
    endpoint = '/web/api/analyze-website/';
  }

  console.log('Preparing to send URL:', url);
  console.log('Sending to endpoint:', endpoint);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST', // Use POST method
      headers: {
        'Content-Type': 'application/json', // Send JSON
      },
      body: JSON.stringify({ url }), // Send the URL in the body as JSON
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending URL to backend:', error);
    throw error;
  }
};
