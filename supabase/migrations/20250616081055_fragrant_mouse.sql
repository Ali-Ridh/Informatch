/*
  # Fix blocked users table structure

  1. Changes
    - Remove redundant blocked_user_id column
    - Ensure proper constraints and indexes
    - Update RLS policies for better security

  2. Security
    - Users can only see their own blocks
    - Users can only create blocks where they are the blocker
    - Users can only delete their own blocks
*/

-- First, let's clean up the blocked_users table structure
DO $$
BEGIN
  -- Drop the redundant column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_users' AND column_name = 'blocked_user_id'
  ) THEN
    ALTER TABLE blocked_users DROP COLUMN blocked_user_id;
  END IF;
END $$;

-- Ensure the table has the correct structure
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  blocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocked_users_no_self_block CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own blocks" ON blocked_users;
DROP POLICY IF EXISTS "Users can create their own blocks" ON blocked_users;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON blocked_users;

-- Create updated RLS policies
CREATE POLICY "Users can view their own blocks"
  ON blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create their own blocks"
  ON blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
  ON blocked_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_at ON blocked_users(blocked_at);