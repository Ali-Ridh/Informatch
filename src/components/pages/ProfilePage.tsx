import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@supabase/supabase-js';
import { Edit, UserCircle, School, HeartHandshake, Search, CalendarDays } from 'lucide-react'; // Added icons
import ProfileEditor from '@/components/ProfileEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // For profile picture
import { Separator } from '@/components/ui/separator'; // For separation
import { useToast } from '@/components/ui/use-toast'; // For toast messages
import { format } from 'date-fns'; // For formatting birthdate

interface ProfilePageProps {
  user: User;
  supabaseClient: any; // Add supabaseClient to props
}

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
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, supabaseClient }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Function to fetch profile data
  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      // Fetch from public.profiles table using the user's ID
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        setProfile(null); // No profile found
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

  // Fetch profile data on component mount
  useEffect(() => {
    if (user?.id) { // Ensure user ID is available
      fetchProfile();
    }
  }, [user.id, supabaseClient, toast]); // Re-fetch if user ID or client changes

  // Callback to refresh profile data after editing
  const handleProfileUpdated = () => {
    setIsEditing(false); // Exit editing mode
    fetchProfile(); // Re-fetch the updated profile data
  };

  // Render the ProfileEditor if editing
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
        {/* Pass user and profile to ProfileEditor, and a callback for updates */}
        <ProfileEditor user={user} supabaseClient={supabaseClient} currentProfile={profile} onProfileUpdated={handleProfileUpdated} />
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // Render profile display or "Complete your profile" prompt
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-lg text-muted-foreground">
            Your profile information
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          {profile ? 'Edit Profile' : 'Create Profile'}
        </Button>
      </div>

      {profile ? (
        <Card className="p-6 md:p-8">
          <CardContent className="flex flex-col items-center text-center p-0">
            {/* Profile Picture / Avatar */}
            <Avatar className="h-24 w-24 mb-6">
              {/* You'd fetch avatar_url from your 'profiles' table if you had one */}
              <AvatarImage src={user.user_metadata?.avatar_url || "https://github.com/shadcn.png"} alt={profile.profile_username} />
              <AvatarFallback>
                {profile.profile_username ? profile.profile_username.substring(0, 2).toUpperCase() : <UserCircle className="h-16 w-16 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>

            {/* Username and Email */}
            <h2 className="text-3xl font-bold text-gray-900 mb-1">{profile.profile_username}</h2>
            <p className="text-lg text-muted-foreground mb-4">{user.email}</p>

            {/* Bio */}
            {profile.profile_bio && (
              <div className="w-full max-w-2xl text-center mb-6">
                <h4 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                   Bio
                </h4>
                <p className="text-muted-foreground">{profile.profile_bio}</p>
              </div>
            )}

            <Separator className="my-6 w-full max-w-sm" />

            {/* Birthdate (Age) */}
            {profile.profile_birthdate && (
                <div className="w-full max-w-2xl text-center mb-6">
                    <h4 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" /> Birthdate
                    </h4>
                    <p className="text-muted-foreground">
                        {format(new Date(profile.profile_birthdate), 'PPP')}
                        {/* You can calculate age here if you want: */}
                        {/* {profile.profile_birthdate ? ` (${new Date().getFullYear() - new Date(profile.profile_birthdate).getFullYear()} years old)` : ''} */}
                    </p>
                </div>
            )}

            <Separator className="my-6 w-full max-w-sm" />

            {/* Academic Interests */}
            {profile.profile_academic_interests && (
              <div className="w-full max-w-2xl text-center mb-6">
                <h4 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                  <School className="h-5 w-5 text-muted-foreground" /> Academic Interests
                </h4>
                <p className="text-muted-foreground">
                  {profile.profile_academic_interests}
                  {/* You can map these to ShadCN Badge components for better styling */}
                  {/*
                  {profile.profile_academic_interests.split(',').map((interest, index) => (
                    <Badge key={index} variant="secondary" className="mr-2 mb-2">{interest.trim()}</Badge>
                  ))}
                  */}
                </p>
              </div>
            )}

            <Separator className="my-6 w-full max-w-sm" />

            {/* Non-Academic Interests */}
            {profile.profile_non_academic_interests && (
              <div className="w-full max-w-2xl text-center mb-6">
                <h4 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-muted-foreground" /> Non-Academic Interests
                </h4>
                <p className="text-muted-foreground">
                  {profile.profile_non_academic_interests}
                </p>
              </div>
            )}

            <Separator className="my-6 w-full max-w-sm" />

            {/* Looking For */}
            {profile.profile_looking_for && (
              <div className="w-full max-w-2xl text-center mb-6">
                <h4 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                  <Search className="h-5 w-5 text-muted-foreground" /> Looking For
                </h4>
                <p className="text-muted-foreground">{profile.profile_looking_for}</p>
              </div>
            )}

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