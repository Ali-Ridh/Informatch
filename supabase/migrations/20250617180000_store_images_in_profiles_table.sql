/*
  # Refactor: Store profile images in the profiles table

  This migration removes the separate 'profile_images' table
  and adds a 'profile_images' JSONB column to the 'profiles' table
  to store an array of image URLs directly.
*/

-- (Safety) Drop the separate profile_images table if it exists
DROP TABLE IF EXISTS public.profile_images;

-- Add the new JSONB column to the profiles table to store image URLs
-- It will store data like: ["url1.jpg", "url2.png"]
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_images JSONB DEFAULT '[]'::jsonb;

-- (Safety) Also ensure other profile columns exist, without causing errors
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS profile_gender TEXT,
ADD COLUMN IF NOT EXISTS profile_phone TEXT;