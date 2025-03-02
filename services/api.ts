import { supabase } from '../lib/supabase';
import { YoutubeTranscript } from 'youtube-transcript';
// const BASE_URL = __DEV__ 
//   ? 'https://tragic-christal-supermind-b64b5075.koyeb.app'  // Local development
//   : 'http://192.168.0.104:8000'; // Production

const BASE_URL = __DEV__ 
  ? 'http://192.168.0.104:8000'  // Local development
  : 'https://crazymind-production.up.railway.app'; // Production

// Add this helper function at the top
function generateSmartTitle(text: string): string {
  // First try to get the first sentence
  const firstSentence = text.split(/[.!?]\s+/)[0];
  
  // If first sentence is too long, get first line
  if (firstSentence.length > 100) {
    const firstLine = text.split('\n')[0];
    // If first line is still too long, truncate with ellipsis
    return firstLine.length > 100 ? 
      firstLine.slice(0, 97) + '...' : 
      firstLine;
  }
  
  return firstSentence;
}

// Helper functions to check URL type
function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be") || url.includes("youtube.com/shorts");
}

function isInstagramUrl(url: string): boolean {
  // Updated pattern to match both reels and posts
  return /instagram\.com\/(?:p|reels|reel)\/[A-Za-z0-9_-]+/.test(url);
}

// Add Reddit URL detection
function isRedditUrl(url: string): boolean {
  return url.includes('reddit.com/r/') || url.includes('redd.it/');
}

// Add helper function to extract video ID
function extractYouTubeVideoId(url: string): string | null {
  try {
    let videoId: string | null = null;
    
    if (url.includes('youtube.com/shorts/')) {
      // Handle YouTube Shorts URLs
      videoId = url.split('shorts/')[1]?.split('?')[0];
    } else if (url.includes('youtu.be/')) {
      // Handle youtu.be URLs
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/watch?v=')) {
      // Handle standard YouTube URLs
      videoId = url.split('v=')[1]?.split('&')[0];
    }

    return videoId || null;
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
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

// Modified getCsrfToken function
async function getCsrfToken() {
  try {
    const response = await fetch(`${BASE_URL}/get-csrf-token/`, {
      credentials: 'include' // Important for CSRF
    });
    if (!response.ok) {
      throw new Error('Failed to get CSRF token');
    }
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
}

// Update saveUserNotes to work with both IDs and URLs
export const saveUserNotes = async (idOrUrl: string, userNotes: string) => {
  try {
    const userId = await getCurrentUserId();
    const now = new Date().toISOString(); // Get current timestamp

    // Try update by ID first
    const { data, error: idError } = await supabase
      .from('content')
      .update({ 
        user_notes: userNotes,
        date_added: now // Update the timestamp
      })
      .match({ id: idOrUrl, user_id: userId });

    if (!idError) return { success: true, data };

    // If ID update fails, try by URL
    const { data: urlData, error: urlError } = await supabase
      .from('content')
      .update({ 
        user_notes: userNotes,
        date_added: now // Update the timestamp
      })
      .match({ original_url: idOrUrl, user_id: userId });

    if (urlError) throw urlError;
    return { success: true, data: urlData };

  } catch (error) {
    console.error('Error saving notes:', error);
    throw error;
  }
};

// Add new function to fetch transcript from frontend
async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => item.text).join(' ');
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
}

// Modify sendUrlToBackend function
export const sendUrlToBackend = async (url: string) => {
  try {
    const headers = await getAuthHeader();
    const userId = await getCurrentUserId();
    const csrfToken = await getCsrfToken(); // Get CSRF token

    let endpoint: string;
    let requestData: any = { url, user_id: userId };

    if (isYouTubeUrl(url)) {
      endpoint = "/api/generate-summary/";
      
      const videoId = extractYouTubeVideoId(url);
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const transcript = await getYouTubeTranscript(videoId);
      if (transcript) {
        requestData.transcript = transcript;
      }
    } else if (isInstagramUrl(url)) {
      endpoint = "/instagram/api/analyze-instagram/";
      // Handle both reels and image posts with the same endpoint
      requestData.type = url.includes('/p/') ? 'post' : 'reel';
    } else if (isRedditUrl(url)) {
      endpoint = "/web/api/analyze-reddit/"; // New Reddit endpoint
    } else {
      endpoint = "/web/api/analyze-website/";
    }

    const requestUrl = new URL(`${BASE_URL}${endpoint}`);
    const method = (isYouTubeUrl(url) && requestData.transcript) ? 'POST' : 'GET';
    
    const requestHeaders = {
      ...headers,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken || '', // Add CSRF token
    };

    let response;
    if (method === 'POST') {
      response = await fetch(requestUrl.toString(), {
        method: 'POST',
        headers: requestHeaders,
        credentials: 'include', // Important for CSRF
        body: JSON.stringify(requestData)
      });
    } else {
      Object.keys(requestData).forEach(key => 
        requestUrl.searchParams.append(key, requestData[key])
      );
      response = await fetch(requestUrl.toString(), {
        method: 'GET',
        headers: requestHeaders,
        credentials: 'include' // Important for CSRF
      });
    }

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

// Add this helper function to detect URLs
function containsUrl(text: string): boolean {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
}

// Modify processSharedUrl function to handle both URLs and notes
export const processSharedContent = async (content: string) => {
  try {
    const headers = await getAuthHeader();
    const userId = await getCurrentUserId();

    if (containsUrl(content)) {
      // Extract first URL from text
      const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
      const url = urlMatch ? urlMatch[0] : '';
      return await sendUrlToBackend(url);
    } else {
      // Handle as note
      const { error } = await supabase
        .from('content')
        .insert({
          id: Math.random().toString(36).substr(2, 9),
          user_id: userId,
          title: generateSmartTitle(content),
          video_type: 'note',
          tags: 'shared_note',
          user_notes: content,
          date_added: new Date().toISOString(),
          thumbnail_url: null,
          original_url: null,
          channel_name: 'Shared Notes'
        });

      if (error) throw error;
      return { success: true, data: { message: 'Note saved successfully' } };
    }
  } catch (error) {
    console.error('Error processing shared content:', error);
    throw error;
  }
};
