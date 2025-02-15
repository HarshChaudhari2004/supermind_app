import { supabase } from '../lib/supabase';

// const BASE_URL = __DEV__ 
//   ? 'https://tragic-christal-supermind-b64b5075.koyeb.app'  // Local development
//   : 'http://192.168.0.104:8000'; // Production

const BASE_URL = __DEV__ 
  ? 'http://192.168.0.104:8000'  // Local development
  : 'https://tragic-christal-supermind-b64b5075.koyeb.app'; // Production

// Helper functions to check URL type
function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function isInstagramUrl(url: string): boolean {
  return url.includes("instagram.com");
}

// Function to get auth header
async function getAuthHeader() {
  const session = await supabase.auth.getSession();
  if (!session.data.session?.access_token) {
    throw new Error('No authentication token found');
  }
  return {
    'Authorization': `Bearer ${session.data.session.access_token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

// Add new function to get current user ID
async function getCurrentUserId() {
  const session = await supabase.auth.getSession();
  if (!session.data.session?.user?.id) {
    throw new Error('No authenticated user found');
  }
  return session.data.session.user.id;
}

// Add this function to get CSRF token
async function getCsrfToken() {
  try {
    const response = await fetch(`${BASE_URL}/get-csrf-token/`);
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
}

// Function to save user notes
export const saveUserNotes = async (originalUrl: string, userNotes: string) => {
  try {
    const headers = await getAuthHeader();
    const userId = await getCurrentUserId();

    const response = await fetch(`${BASE_URL}/api/save-notes/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        originalUrl, 
        userNotes,
        user_id: userId 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error saving notes:', error);
    throw error;
  }
};

// Update sendUrlToBackend function
export const sendUrlToBackend = async (url: string) => {
  try {
    const headers = await getAuthHeader();
    const userId = await getCurrentUserId();

    let endpoint: string;

    if (isYouTubeUrl(url)) {
      endpoint = "/api/generate-summary/";
    } else if (isInstagramUrl(url)) {
      endpoint = "/instagram/api/analyze-instagram/";
    } else {
      endpoint = "/web/api/analyze-website/";
    }

    const requestUrl = new URL(`${BASE_URL}${endpoint}`);
    requestUrl.searchParams.append('url', url);
    requestUrl.searchParams.append('user_id', userId);

    console.log('Sending request to:', requestUrl.toString());

    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        ...headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error) {
    console.error('sendUrlToBackend error:', error);
    throw error;
  }
};

// Modify the getVideoData function
export const getVideoData = async () => {
  try {
    const headers = await getAuthHeader();
    const userId = await getCurrentUserId();
    
    // First try getting data from Supabase directly
    const { data: supabaseData, error } = await supabase
      .from('content')
      .select('*')
      .eq('user_id', userId)
      .order('date_added', { ascending: false });

    if (error) {
      throw error;
    }

    if (supabaseData && supabaseData.length > 0) {
      return supabaseData;
    }

    // Fallback to backend API if needed
    const response = await fetch(`${BASE_URL}/api/video-data/?user_id=${userId}`, { 
      headers 
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

// Add this new function
export const deleteContent = async (contentId: string) => {
  try {
    const headers = await getAuthHeader();
    const userId = await getCurrentUserId();

    // Delete from Supabase
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', contentId)
      .eq('user_id', userId); // For security, ensure user owns the content

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting content:', error);
    throw error;
  }
};
