// src/components/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@supabase/supabase-js';
import {
  Edit,
  UserCircle,
  School,
  HeartHandshake,
  Search,
  CalendarDays,
  Phone,
  Cake,
  Users as UsersIcon, // Used for generic gender / Looking For
  // --- REMOVED THESE (as they cause errors in your environment) ---
  // GenderMale,
  // GenderFemale,
} from 'lucide-react'; // ONLY import icons that are working for you
import ProfileEditor from '@/components/ProfileEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInYears } from 'date-fns';

// Define the expected structure of a user profile (matches public.profiles table)
interface UserProfile {
  profile_id: number;
  user_id: string;
  profile_username: string;
  profile_bio: string | null;
  profile_birthdate: string; // Date string from DB
  profile_academic_interests: string | null;
  profile_non_academic_interests: string | null;
  profile_looking_for: string | null;
  profile_created_at: string;
  profile_phone: string | null; // Added phone number
  profile_avatar_url: string | null; // Added avatar URL
  profile_gender: string | null; // Added gender
}

interface ProfilePageProps {
  user: User;
  supabaseClient: any; // Supabase client passed as a prop from MainApp
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, supabaseClient }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Function to fetch profile data from 'public.profiles' table
  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*') // Select all columns, including new ones like phone, avatar_url, gender
        .eq('user_id', user.id)
        .single(); // Use .single() as we expect one profile per user

      if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        setProfile(null); // No profile found for this user
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
      toast({
        title: "Error",
        description: "Failed to load profile data: " + error.message,
        variant: "destructive",
      });
      setProfile(null); // Ensure profile is null on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch profile data on component mount (or when user.id/supabaseClient changes)
  useEffect(() => {
    if (user?.id) { // Ensure user ID is available before attempting to fetch
      fetchProfile();
    }
  }, [user.id, supabaseClient, toast]); // Dependencies for useEffect

  // Callback function passed to ProfileEditor, called after profile is saved
  const handleProfileUpdated = () => {
    setIsEditing(false); // Exit editing mode
    fetchProfile(); // Re-fetch the updated profile data to display it
  };

  // Helper function to calculate age from birthdate string
  const calculateAge = (birthdateString: string): number | null => {
    try {
      const birthDate = new Date(birthdateString);
      if (isNaN(birthDate.getTime())) return null; // Check for invalid date
      return differenceInYears(new Date(), birthDate);
    } catch (e) {
      return null;
    }
  };

  // Helper function to get gender icon or symbol based on gender value
  // Returns React.ReactNode as it can be a string, JSX, or null
  const getGenderIcon = (gender: string | null): React.ReactNode => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return <span className="text-primary text-2xl mb-2">♂</span>; // Unicode Male symbol
      case 'female':
        return <span className="text-primary text-2xl mb-2">♀</span>; // Unicode Female symbol
      case 'non-binary':
      case 'prefer not to say':
      default:
        // Fallback to a generic icon from Lucide React that is usually available
        return <UsersIcon className="h-6 w-6 text-primary mb-2" />;
    }
  };

  // Render loading state while profile is being fetched
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // If in editing mode, render the ProfileEditor component
  if (isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Profile</h1>
            <p className="text-lg text-muted-foreground">
              Update your information
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
        {/* Pass user, supabaseClient, current profile data, and the update callback to ProfileEditor */}
        <ProfileEditor user={user} supabaseClient={supabaseClient} currentProfile={profile} onProfileUpdated={handleProfileUpdated} />
      </div>
    );
  }

  // Render the profile display or the "Complete your profile" prompt
  return (
    <div>
      {/* Header section with dynamic title and button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          {/* Dynamic Header based on whether a profile exists */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {profile ? 'Your Profile' : 'Create Your Profile'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {profile ? 'Manage your profile information' : 'Start building your profile to connect with others.'}
          </p>
        </div>
        {/* Dynamic Button text */}
        <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          {profile ? 'Edit Profile' : 'Create Profile'}
        </Button>
      </div>

      {profile ? (
        <Card className="p-6 md:p-8">
          <CardContent className="flex flex-col md:flex-row items-start md:items-stretch gap-8 p-0">
            {/* Left Column: Avatar & (Optional: "Your Pictures" Section) */}
            <div className="flex flex-col items-center md:w-1/3 w-full">
              <Avatar className="h-32 w-32 mb-4 border-2 border-primary">
                {/* Use profile.profile_avatar_url first, then user.user_metadata, then fallback */}
                <AvatarImage src={profile.profile_avatar_url || user.user_metadata?.avatar_url || "https://placehold.co/128x128/E0E0E0/333333?text=AV"} alt={profile.profile_username} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {profile.profile_username ? profile.profile_username.substring(0, 2).toUpperCase() : <UserCircle className="h-20 w-20" />}
                </AvatarFallback>
              </Avatar>
              {/* Uncomment this section if you plan to implement a "Your Pictures" gallery later */}
              {/*
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Your Pictures:</h4>
              <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
                <img src="https://placehold.co/60x60" alt="Picture 1" className="rounded-md" />
                <img src="https://placehold.co/60x60" alt="Picture 2" className="rounded-md" />
                <div className="h-16 w-16 border border-dashed rounded-md flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-gray-50">
                  <Plus className="h-6 w-6" />
                </div>
              </div>
              */}
            </div>

            {/* Right Column: Profile Details */}
            <div className="flex-1 w-full md:w-2/3 space-y-6 text-center md:text-left">
              {/* Username and associated basic info */}
              <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                {profile.profile_username}
              </h2>
              <p className="text-lg text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                {user.email}
                {profile.profile_phone && (
                  <>
                    {/* Visual separator */}
                    <Separator orientation="vertical" className="h-5" />
                    <Phone className="h-4 w-4" /> {profile.profile_phone}
                  </>
                )}
              </p>

              <Separator className="my-4" />

              {/* Gender, Birth Date, Looking For - as per wireframe layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center">
                  {getGenderIcon(profile.profile_gender)} {/* Dynamically get icon/symbol based on gender */}
                  <span className="text-sm font-semibold text-muted-foreground">Gender</span>
                  <span className="text-lg font-bold text-gray-800">
                    {profile.profile_gender || 'N/A'} {/* Display gender or 'N/A' */}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center">
                  <Cake className="h-6 w-6 text-primary mb-2" />
                  <span className="text-sm font-semibold text-muted-foreground">Birth Date</span>
                  <span className="text-lg font-bold text-gray-800">
                    {profile.profile_birthdate ? format(new Date(profile.profile_birthdate), 'yyyy/MM/dd') : 'N/A'}
                    {profile.profile_birthdate && ` (${calculateAge(profile.profile_birthdate)} yrs)`}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center">
                  <Search className="h-6 w-6 text-primary mb-2" />
                  <span className="text-sm font-semibold text-muted-foreground">Looking For</span>
                  <span className="text-lg font-bold text-gray-800">
                    {profile.profile_looking_for || 'N/A'}
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Bio */}
              {profile.profile_bio && (
                <div className="w-full text-center md:text-left">
                  <h4 className="text-xl font-semibold mb-2 flex items-center justify-center md:justify-start gap-2">
                    Bio
                  </h4>
                  <p className="text-muted-foreground">{profile.profile_bio}</p>
                </div>
              )}

              <Separator className="my-4" />

              {/* Academic Interests */}
              {profile.profile_academic_interests && (
                <div className="w-full text-center md:text-left">
                  <h4 className="text-xl font-semibold mb-2 flex items-center justify-center md:justify-start gap-2">
                    <School className="h-5 w-5 text-muted-foreground" /> Academic Interests
                  </h4>
                  <p className="text-muted-foreground">
                    {profile.profile_academic_interests}
                  </p>
                </div>
              )}

              <Separator className="my-4" />

              {/* Non-Academic Interests */}
              {profile.profile_non_academic_interests && (
                <div className="w-full text-center md:text-left">
                  <h4 className="text-xl font-semibold mb-2 flex items-center justify-center md:justify-start gap-2">
                    <HeartHandshake className="h-5 w-5 text-muted-foreground" /> Non-Academic Interests
                  </h4>
                  <p className="text-muted-foreground">
                    {profile.profile_non_academic_interests}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Render "Complete your profile" card if no profile data
        <Card className="text-center py-12">
          <CardContent>
            <UserCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Complete your profile</h3>
            <p className="text-muted-foreground mb-4">
              Add your information to start connecting with other students.
            </p>
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2 mx-auto">
              <Edit className="h-4 w-4" />
              Create Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;