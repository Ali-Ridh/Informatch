/*
  # Restructure notifications and matches system

  1. Changes
    - Update notifications table to handle match requests
    - Modify matches table to only store accepted matches
    - Add proper constraints and indexes
    - Update RLS policies

  2. New Flow
    - Match requests go to notifications table first
    - Accepted requests create match records and delete notification
    - Rejected requests just delete notification
*/

-- First, let's update the notifications table structure
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('match_request', 'match_accepted', 'match_rejected', 'general'));

-- Add match_request_id to link notifications to potential matches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'match_request_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN match_request_id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Update matches table to remove status and requested_at (only accepted matches)
DO $$
BEGIN
  -- Remove status column if it exists (matches are always accepted now)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'status'
  ) THEN
    ALTER TABLE matches DROP COLUMN status;
  END IF;
  
  -- Remove requested_at column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'requested_at'
  ) THEN
    ALTER TABLE matches DROP COLUMN requested_at;
  END IF;
END $$;

-- Ensure matches table has correct structure (only accepted matches)
CREATE TABLE IF NOT EXISTS matches (
  match_id serial PRIMARY KEY,
  match_user1_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  match_user2_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  matched_at timestamptz DEFAULT now(),
  UNIQUE(match_user1_id, match_user2_id),
  CONSTRAINT matches_no_self_match CHECK (match_user1_id != match_user2_id)
);

-- Enable RLS on both tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for others" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view their own matches" ON matches;
DROP POLICY IF EXISTS "Users can create pending match requests" ON matches;
DROP POLICY IF EXISTS "Users can update their match records" ON matches;
DROP POLICY IF EXISTS "Users can delete their match records" ON matches;

-- Create new RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications for others"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete notifications they're involved in"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = from_user_id);

-- Create new RLS policies for matches (only accepted matches)
CREATE POLICY "Users can view their own matches"
  ON matches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = match_user1_id OR auth.uid() = match_user2_id);

CREATE POLICY "Users can create matches when accepting requests"
  ON matches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = match_user2_id OR auth.uid() = match_user1_id);

CREATE POLICY "Users can delete their own matches"
  ON matches
  FOR DELETE
  TO authenticated
  USING (auth.uid() = match_user1_id OR auth.uid() = match_user2_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_match_request_id ON notifications(match_request_id);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(match_user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(match_user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at);

-- Create function to handle match request acceptance
CREATE OR REPLACE FUNCTION handle_match_request_response()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called when a notification is updated
  -- If it's a match_request being marked as read with acceptance, create match
  IF OLD.type = 'match_request' AND NEW.read = true AND OLD.read = false THEN
    -- This will be handled in the application logic instead
    -- to have better control over the acceptance/rejection flow
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for match request handling
DROP TRIGGER IF EXISTS match_request_response_trigger ON notifications;
CREATE TRIGGER match_request_response_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION handle_match_request_response();