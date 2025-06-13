/*
  # Add profile images support

  1. New Tables
    - `profile_images`
      - `image_id` (serial, primary key)
      - `profile_id` (integer, foreign key to profiles)
      - `image_url` (text, image URL)
      - `image_order` (integer, display order)
      - `uploaded_at` (timestamp)

  2. Changes
    - Add `profile_avatar_url` to profiles table for backward compatibility
    - Add `profile_gender` to profiles table
    - Add `profile_phone` to profiles table

  3. Security
    - Enable RLS on `profile_images` table
    - Add policies for profile image management
*/

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN profile_avatar_url TEXT,
ADD COLUMN profile_gender TEXT,
ADD COLUMN profile_phone TEXT;

-- Create profile_images table
CREATE TABLE profile_images (
  image_id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER NOT NULL DEFAULT 1,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, image_order),
  CHECK (image_order >= 1 AND image_order <= 3)
);

-- Create indexes
CREATE INDEX idx_profile_images_profile_id ON profile_images(profile_id);
CREATE INDEX idx_profile_images_order ON profile_images(profile_id, image_order);

-- Enable RLS
ALTER TABLE profile_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_images table
CREATE POLICY "Profile images are viewable by everyone" ON profile_images
  FOR SELECT USING (true);

CREATE POLICY "Users can insert images for their own profile" ON profile_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.profile_id = profile_images.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update images for their own profile" ON profile_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.profile_id = profile_images.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images for their own profile" ON profile_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.profile_id = profile_images.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );