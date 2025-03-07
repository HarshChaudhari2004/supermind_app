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
    // Add token fallback - if we can't get a CSRF token, use a null token
    // Many Django configurations will accept null CSRF for simple GET requests
    try {
      const response = await fetch(`${BASE_URL}/get-csrf-token/`, {
        credentials: 'include', // Important for CSRF
        headers: await getAuthHeader() // Try with auth headers
      });
      
      if (!response.ok) {
        console.warn('Failed to get CSRF token, falling back to null token');
        return null;
      }
      
      const data = await response.json();
      return data.csrfToken;
    } catch (error) {
      console.warn('Error getting CSRF token, falling back to null token:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in getCsrfToken:', error);
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

// Update the existing sendUrlToBackend function

export const sendUrlToBackend = async (url: string) => {
  try {
    const headers = await getAuthHeader();
    const userId = await getCurrentUserId();
    const csrfToken = await getCsrfToken();

    let endpoint: string;
    let requestData: any = { url, user_id: userId };
    let method = 'GET';

    if (isYouTubeUrl(url)) {
      endpoint = "/api/generate-summary/";
      
      const videoId = extractYouTubeVideoId(url);
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const transcript = await getYouTubeTranscript(videoId);
      if (transcript) {
        requestData.transcript = transcript;
        method = 'POST';
      }
    } else if (isInstagramUrl(url)) {
      endpoint = "/instagram/api/analyze-instagram/";
      // Handle both reels and image posts with the same endpoint
      requestData.type = url.includes('/p/') ? 'post' : 'reel';
    } else if (isRedditUrl(url)) {
      endpoint = "/web/api/analyze-reddit/";
      
      try {
        console.log('Detected Reddit URL, attempting frontend scraping:', url);
        const scraped = await scrapeRedditContent(url);
        
        if (scraped) {
          console.log('Frontend Reddit scraping successful, sending data to backend');
          requestData = {
            ...requestData,
            scraped_data: scraped
          };
          method = 'POST';
          console.log('POST request data prepared:', JSON.stringify(requestData).substring(0, 200) + '...');
        } else {
          console.log('Frontend scraping returned null, falling back to backend');
        }
      } catch (redditError) {
        console.error('Frontend Reddit scraping failed, falling back to backend:', redditError);
        // Fall back to backend scraping logic (GET request)
      }
    } else {
      endpoint = "/web/api/analyze-website/";
    }

    const requestUrl = new URL(`${BASE_URL}${endpoint}`);
    
    const requestHeaders = {
      ...headers,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken || '',
    };

    console.log(`Making ${method} request to ${endpoint} for URL: ${url}`);
    
    let response;
    if (method === 'POST') {
      console.log('POST request data:', JSON.stringify(requestData));
      response = await fetch(requestUrl.toString(), {
        method: 'POST',
        headers: requestHeaders,
        credentials: 'include',
        body: JSON.stringify(requestData)
      });
    } else {
      Object.keys(requestData).forEach(key => 
        requestUrl.searchParams.append(key, requestData[key])
      );
      console.log('GET request URL:', requestUrl.toString());
      response = await fetch(requestUrl.toString(), {
        method: 'GET',
        headers: requestHeaders,
        credentials: 'include'
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response as JSON:', errorText);
      }
      throw new Error(errorMessage);
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

// Add this function after the existing helper functions

// Function to scrape Reddit content from the frontend
async function scrapeRedditContent(url: string) {
  try {
    // Handle Reddit short URLs (/r/subreddit/s/shortcode)
    if (url.includes('/s/')) {
      console.log('Detected Reddit short URL format, attempting to resolve:', url);
      try {
        // Try to resolve the short URL first
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
          },
          redirect: 'follow'
        });
        
        if (response.ok) {
          // If we got redirected to the full URL, use that instead
          const resolvedUrl = response.url;
          console.log('Short URL resolved to:', resolvedUrl);
          
          if (resolvedUrl !== url && resolvedUrl.includes('/comments/')) {
            url = resolvedUrl;
            console.log('Using resolved URL for scraping:', url);
          } else {
            // If not redirected, we'll have to fall back to server-side scraping
            console.log('Short URL could not be resolved to a comments URL');
            return null;
          }
        }
      } catch (resolveError) {
        console.error('Error resolving short Reddit URL:', resolveError);
        return null;
      }
    }
    
    // Clean URL: Remove query parameters and trailing slash
    const urlObj = new URL(url);
    const cleanPath = urlObj.pathname.replace(/\/$/, '');  // Remove trailing slash
    const cleanUrl = `https://www.reddit.com${cleanPath}`;
    const jsonUrl = `${cleanUrl}.json`;
    
    console.log('Clean URL:', cleanUrl);
    console.log('Attempting to fetch Reddit data from:', jsonUrl);
    
    // Make the request with appropriate headers to bypass blocks
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Reddit API response not OK:', response.status, response.statusText);
      throw new Error('Failed to fetch Reddit data: ' + response.status);
    }
    
    // Get response as text first to check its validity
    const responseText = await response.text();
    
    // Check if the response is empty or not JSON
    if (!responseText || responseText.trim() === '') {
      console.error('Empty response from Reddit API');
      throw new Error('Empty response from Reddit API');
    }
    
    // Try parsing the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Reddit JSON:', parseError);
      console.error('Response text sample:', responseText.substring(0, 100));
      throw new Error('Failed to parse Reddit data');
    }
    
    // Validate data structure
    if (!Array.isArray(data) || data.length < 2) {
      console.error('Invalid data structure:', data);
      throw new Error('Invalid Reddit data format');
    }
    
    if (!data[0]?.data?.children?.[0]?.data) {
      console.error('Missing post data');
      throw new Error('Missing post data');
    }
    
    // Extract post data
    const post = data[0].data.children[0].data;
    const comments = data[1].data.children;
    
    // Clean text content (remove markdown, etc)
    const cleanText = (text: string) => {
      if (!text) return '';
      // Remove markdown links
      return text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                .replace(/[*_~>`]/g, '')
                .trim();
    };
    
    // Extract post details
    const title = post.title || '';
    const selftext = cleanText(post.selftext || '');
    const subreddit = post.subreddit || '';
    const author = post.author || '[deleted]';
    
    // Updated thumbnail logic to match backend
    let thumbnail = '';
    const is_video_post = post.is_video || false;
    
    // 1. First try url_overridden_by_dest for direct image posts (not videos)
    if (!is_video_post && post.url_overridden_by_dest) {
      const url_override = post.url_overridden_by_dest;
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url_override)) {
        thumbnail = url_override;
      }
    }
    
    // 2. If it's a video post or no thumbnail yet, try getting subreddit icon from HTML
    if (is_video_post || !thumbnail) {
      const htmlResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Try subreddit icon first
        const subredditIcon = doc.querySelector('.shreddit-subreddit-icon__icon');
        if (subredditIcon instanceof HTMLImageElement && subredditIcon.src) {
          thumbnail = subredditIcon.src;
        } else {
          // Try alternative selector for community icon
          const communityIcon = doc.querySelector('img[alt$="icon"]');
          if (communityIcon instanceof HTMLImageElement && communityIcon.src) {
            thumbnail = communityIcon.src;
          }
        }
      }
    }
    
    // 3. For non-video posts, try other fallbacks if still no thumbnail
    if (!is_video_post && !thumbnail) {
      // Try thumbnail field if it's not "default" or "self"
      if (post.thumbnail && !['default', 'self', 'nsfw'].includes(post.thumbnail)) {
        thumbnail = post.thumbnail;
      }
      
      // Try preview images as fallback
      if (!thumbnail && post.preview?.images?.[0]?.source?.url) {
        thumbnail = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      }
    }
    
    // Clean the thumbnail URL if it exists
    if (thumbnail) {
      thumbnail = thumbnail.replace(/&amp;/g, '&').split('?')[0];
    }
    
    // Get top comments
    const topComments:string[] = [];
    for (let i = 0; i < comments.length && topComments.length < 15; i++) {
      const comment = comments[i].data;
      if (comment?.body && !comment?.stickied) {
        const commentText = cleanText(comment.body);
        if (commentText && commentText.length > 20) {
          topComments.push(commentText);
        }
      }
    }
    
    // Combine content for analysis
    const fullContent = `Title: ${title}\n\nPost Content: ${selftext}\n\n` +
      (topComments.length > 0 
        ? `Top Comments:\n${topComments.map(c => `- ${c}`).join('\n')}` 
        : '');
    
    const result = {
      content: fullContent,
      title: title,
      domain: `r/${subreddit}`,
      author: author,
      featured_image: thumbnail,
      post_type: 'reddit_post'
    };
    
    console.log('Successfully scraped Reddit data from frontend');
    console.log('Scraped data:', result); // Add this debug line
    return result;
    
  } catch (error) {
    console.error('Error scraping Reddit from frontend:', error);
    return null; // Return null instead of throwing to fallback gracefully
  }
}
