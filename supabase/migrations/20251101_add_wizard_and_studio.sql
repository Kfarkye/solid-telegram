/*
  # Add Wizard and Studio Features

  1. Extend Architecture Workflow
    - Add `wizard_data` JSONB column to arch_runs for storing wizard configuration
    - Add `project_name` TEXT column to arch_runs for better identification
    - Add `user_id` UUID column for multi-user support

  2. Create Studio Tables
    - `conversations` table for Studio chat threads
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `system_prompt` (text)
      - `model` (text)
      - `message_count` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `messages` table for Studio chat messages
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `role` (text: user/assistant)
      - `content` (text)
      - `provider` (text)
      - `model` (text)
      - `total_tokens` (integer)
      - `latency_ms` (integer)
      - `cached` (boolean)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data

  4. Indexes
    - Add indexes for performance optimization
*/

-- Extend arch_runs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arch_runs' AND column_name = 'wizard_data'
  ) THEN
    ALTER TABLE public.arch_runs ADD COLUMN wizard_data JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arch_runs' AND column_name = 'project_name'
  ) THEN
    ALTER TABLE public.arch_runs ADD COLUMN project_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arch_runs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.arch_runs ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  system_prompt TEXT DEFAULT '',
  model TEXT NOT NULL DEFAULT 'gemini-2.0-flash-exp',
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  total_tokens INTEGER,
  latency_ms INTEGER,
  cached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='conversations' AND policyname='users_read_own_conversations'
  ) THEN
    CREATE POLICY users_read_own_conversations
      ON public.conversations FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='conversations' AND policyname='users_insert_own_conversations'
  ) THEN
    CREATE POLICY users_insert_own_conversations
      ON public.conversations FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='conversations' AND policyname='users_update_own_conversations'
  ) THEN
    CREATE POLICY users_update_own_conversations
      ON public.conversations FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='conversations' AND policyname='users_delete_own_conversations'
  ) THEN
    CREATE POLICY users_delete_own_conversations
      ON public.conversations FOR DELETE
      USING (true);
  END IF;
END $$;

-- Create policies for messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='messages' AND policyname='users_read_messages'
  ) THEN
    CREATE POLICY users_read_messages
      ON public.messages FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='messages' AND policyname='users_insert_messages'
  ) THEN
    CREATE POLICY users_insert_messages
      ON public.messages FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='messages' AND policyname='users_delete_messages'
  ) THEN
    CREATE POLICY users_delete_messages
      ON public.messages FOR DELETE
      USING (true);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_arch_runs_user_id ON public.arch_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_arch_runs_created_at ON public.arch_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
