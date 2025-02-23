export interface SearchResult {
  id: string;
  user_id: string;
  title: string;
  channelName: string;
  video_type: string;
  tags: string;
  summary: string;
  thumbnail_url: string;
  original_url: string;
  date_added: string;
  user_notes: string;
  relevance?: number;
}

export interface SearchOptions {
  userId?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
}