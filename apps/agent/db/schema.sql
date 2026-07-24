-- Run once against your VPS PostgreSQL:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS conversations (
    id          SERIAL PRIMARY KEY,
    title       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id               SERIAL PRIMARY KEY,
    conversation_id  INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role             TEXT NOT NULL,          -- 'user' or 'assistant'
    content          JSONB NOT NULL,         -- Bedrock content-block list
    created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Phase 5 (RAG), enable later:
--   CREATE EXTENSION IF NOT EXISTS vector;
--   CREATE TABLE documents (
--       id SERIAL PRIMARY KEY, source TEXT, content TEXT, embedding vector(1024)
--   );
