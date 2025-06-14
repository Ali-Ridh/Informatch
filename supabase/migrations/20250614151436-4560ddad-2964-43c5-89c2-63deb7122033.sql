
-- Create profile_images table
CREATE TABLE IF NOT EXISTS public.profile_images (
  image_id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for profile_images
ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profile images" ON public.profile_images
FOR SELECT USING (
  profile_id IN (
    SELECT profile_id FROM public.profiles WHERE user_id = auth.uid()
  ) OR 
  profile_id IN (
    SELECT profile_id FROM public.profiles -- Allow viewing other users' images for matching
  )
);

CREATE POLICY "Users can manage their own profile images" ON public.profile_images
FOR ALL USING (
  profile_id IN (
    SELECT profile_id FROM public.profiles WHERE user_id = auth.uid()
  )
);
