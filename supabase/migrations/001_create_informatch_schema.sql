
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) UNIQUE NOT NULL,
  user_phone VARCHAR(255) UNIQUE,
  user_created_at TIMESTAMPTZ DEFAULT NOW(),
  user_email_verified BOOLEAN DEFAULT FALSE,
  user_phone_verified BOOLEAN DEFAULT FALSE,
  user_priset_is_private BOOLEAN DEFAULT FALSE,
  user_priset_show_age BOOLEAN DEFAULT TRUE,
  user_priset_show_bio BOOLEAN DEFAULT TRUE,
  user_priset_last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  profile_id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  profile_username VARCHAR(50) NOT NULL,
  profile_bio TEXT,
  profile_birthdate DATE NOT NULL,
  profile_academic_interests TEXT,
  profile_non_academic_interests TEXT,
  profile_looking_for TEXT,
  profile_created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  match_id SERIAL PRIMARY KEY,
  match_user1_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  match_user2_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_user1_id, match_user2_id),
  CHECK (match_user1_id != match_user2_id)
);

-- Create blocked_users table
CREATE TABLE blocked_users (
  blocker_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Create reports table
CREATE TABLE reports (
  reports_id SERIAL PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reason TEXT,
  details TEXT NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_matches_user1 ON matches(match_user1_id);
CREATE INDEX idx_matches_user2 ON matches(match_user2_id);
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for profiles table
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for matches table
CREATE POLICY "Users can view their own matches" ON matches
  FOR SELECT USING (auth.uid() = match_user1_id OR auth.uid() = match_user2_id);

CREATE POLICY "Users can create matches involving themselves" ON matches
  FOR INSERT WITH CHECK (auth.uid() = match_user1_id OR auth.uid() = match_user2_id);

-- RLS Policies for blocked_users table
CREATE POLICY "Users can view their own blocks" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create their own blocks" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- RLS Policies for reports table
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
