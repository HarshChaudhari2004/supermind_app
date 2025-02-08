// services/api.ts

const BASE_URL = 'https://supermind-production.up.railway.app';

// Helper functions to check URL type
function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function isInstagramUrl(url: string): boolean {
  return url.includes("instagram.com");
}

// Function to send the URL to the appropriate backend based on platform
export const sendUrlToBackend = async (url: string) => {
  let backendUrl = '';

  // Determine backend URL based on URL type
  if (isYouTubeUrl(url)) {
    backendUrl = "/api/generate-summary/";
  } else if (isInstagramUrl(url)) {
    backendUrl = "/instagram/api/analyze-instagram/";
  } else {
    backendUrl = "/web/api/analyze-website/";
  }

  // Try to process the URL and send it to the backend
  try {
    console.log("Sending URL to backend:", BASE_URL + backendUrl, "with URL:", url); // Log the URL and endpoint

    // Send a GET request with URL as a query parameter
    const response = await fetch(`${BASE_URL}${backendUrl}?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("Non-JSON response. Parsing as text.");
      const text = await response.text();
      console.log("Backend text response:", text);
      return text;
    }

    const data = await response.json();
    console.log("Backend response:", data); // Log the successful response

    // Add verification of response data
    if (!data.success && !data.Status) {
      throw new Error("Processing failed: " + (data.message || "Unknown error"));
    }

    // Wait a bit before confirming success to allow backend processing
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));
    
    // Verify the data was actually added by fetching latest data
    const verifyResponse = await fetch(`${BASE_URL}/api/video-data/`);
    const verifyData = await verifyResponse.json();
    
    const urlExists = verifyData.some((item: any) => 
      item.URL === url || item['Video URL'] === url
    );

    if (!urlExists) {
      throw new Error("URL was processed but not found in database");
    }

    return data;
  } catch (error) {
    console.error("Error sending URL to backend:", error); // Log error details
    throw error;
  }
};
