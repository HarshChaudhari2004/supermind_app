-- Enable the vector extension for semantic search
create extension if not exists vector;

-- Enable pg_trgm for fuzzy text search
create extension if not exists pg_trgm;

-- Enable fuzzystrmatch for Levenshtein distance
create extension if not exists fuzzystrmatch;







-- Add embedding columns for semantic search
alter table content add column if not exists title_embedding vector(768);
alter table content add column if not exists content_embedding vector(768);

-- Add GiST index for trigram similarity search
create index if not exists content_title_trgm_idx on content using gist (title gist_trgm_ops);
create index if not exists content_summary_trgm_idx on content using gist (summary gist_trgm_ops);
create index if not exists content_tags_trgm_idx on content using gist (tags gist_trgm_ops);
create index if not exists content_channel_name_trgm_idx on content using gist (channel_name gist_trgm_ops);
create index if not exists content_user_notes_trgm_idx on content using gist (user_notes gist_trgm_ops);

-- Add ivfflat index for vector similarity search
create index if not exists content_title_embedding_idx on content using ivfflat (title_embedding vector_cosine_ops);
create index if not exists content_content_embedding_idx on content using ivfflat (content_embedding vector_cosine_ops);




-- Create a function to update embeddings
create or replace function update_content_embeddings()
returns trigger as $$
begin
  -- This is a placeholder. You'll need to implement the actual embedding generation
  -- in your backend using Gemini API
  return new;
end;
$$ language plpgsql;

-- Create a trigger to automatically update embeddings when content changes
create trigger update_content_embeddings_trigger
  before insert or update on content
  for each row
  execute function update_content_embeddings();





create or replace function search_content(
  search_query text,
  user_id_input uuid,
  similarity_threshold float default 0.1,
  max_results int default 100
)
returns table (
  id text,
  title text,
  channel_name text,
  video_type text,
  tags text,
  summary text,
  thumbnail_url text,
  original_url text,
  user_notes text,
  date_added timestamptz,
  similarity float
) language plpgsql as $$
begin
  return query
  with combined_search as (
    select 
      c.id,
      c.title,
      c.channel_name,
      c.video_type,
      c.tags,
      c.summary,
      c.thumbnail_url,
      c.original_url,
      c.user_notes,
      c.date_added,
      greatest(
        -- Text similarity scores
        greatest(
          similarity(c.title, search_query),
          similarity(c.summary, search_query),
          similarity(c.tags, search_query),
          similarity(c.channel_name, search_query),
          similarity(c.user_notes, search_query)
        ),
        -- Vector similarity scores (when implemented)
        coalesce(
          1 - (c.title_embedding <=> embedding_vector(search_query)),
          0
        ),
        -- Trigram similarity for fuzzy matching
        greatest(
          strict_word_similarity(c.title, search_query),
          strict_word_similarity(c.summary, search_query),
          strict_word_similarity(c.tags, search_query),
          strict_word_similarity(c.user_notes, search_query)
        )
      ) as similarity
    from content c
    where c.user_id = user_id_input
      and (
        -- Full text search
        to_tsvector('simple', coalesce(c.title, '')) || 
        to_tsvector('simple', coalesce(c.summary, '')) || 
        to_tsvector('simple', coalesce(c.tags, '')) ||
        to_tsvector('simple', coalesce(c.channel_name, '')) ||
        to_tsvector('simple', coalesce(c.user_notes, '')) ||
        to_tsvector('simple', coalesce(c.video_type, ''))
        @@ plainto_tsquery('simple', search_query)
        or
        -- Fuzzy matching
        similarity(c.title, search_query) > similarity_threshold
        or similarity(c.summary, search_query) > similarity_threshold
        or similarity(c.tags, search_query) > similarity_threshold
        or similarity(c.channel_name, search_query) > similarity_threshold
        or similarity(c.user_notes, search_query) > similarity_threshold
        -- Vector similarity (when implemented)
        or (c.title_embedding <=> embedding_vector(search_query)) < (1 - similarity_threshold)
      )
  )
  select *
  from combined_search
  where similarity > similarity_threshold
  order by similarity desc
  limit max_results;
end;
$$;