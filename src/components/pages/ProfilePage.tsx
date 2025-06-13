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
  Users as UsersIcon,
} from 'lucide-react';
import ProfileEditor from '@/components/ProfileEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInYears } from 'date-fns';

interface UserProfile {
  profile_id: number;
  user_id: string;
  profile_username: string;
  profile_bio: string | null;
  profile_birthdate: string;
  profile_academic_interests: string | null;
  profile_non_academic_interests: string | null;
  profile_looking_for: string | null;
  profile_created_at: string;
  profile_phone: string | null;
  profile_avatar_url: string | null;
  profile_gender: string | null;
}

interface ProfileImage {
  image_id: number;
  image_url: string;
  image_order: number;
}

interface ProfilePageProps {
  user: User;
  supabaseClient: any;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, supabaseClient }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        await fetchProfileImages(data.profile_id);
      } else {
        setProfile(null);
        setProfileImages([]);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
      toast({
        title: "Error",
        description: "Failed to load profile data: " + error.message,
        variant: "destructive",
      });
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfileImages = async (profileId: number) => {
    try {
      const { data, error } = await supabaseClient
        .from('profile_images')
        .select('*')
        .eq('profile_id', profileId)
        .order('image_order');

      if (error) throw error;
      setProfileImages(data || []);
    } catch (error: any) {
      console.error("Error fetching profile images:", error.message);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user.id, supabaseClient, toast]);

  const handleProfileUpdated = () => {
    setIsEditing(false);
    fetchProfile();
  };

  const calculateAge = (birthdateString: string): number | null => {
    try {
      const birthDate = new Date(birthdateString);
      if (isNaN(birthDate.getTime())) return null;
      return differenceInYears(new Date(), birthDate);
    } catch (e) {
      return null;
    }
  };

  const getGenderIcon = (gender: string | null): React.ReactNode => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return <span className="text-primary text-2xl mb-2">♂</span>;
      case 'female':
        return <span className="text-primary text-2xl mb-2">♀</span>;
      case 'non-binary':
      case 'prefer not to say':
      default:
        return <UsersIcon className="h-6 w-6 text-primary mb-2" />;
    }
  };

  const getMainImage = () => {
    const firstImage = profileImages.find(img => img.image_order === 1);
    if (firstImage?.image_url) {
      return firstImage.image_url;
    }
    
    if (profile?.profile_avatar_url) {
      return profile.profile_avatar_url;
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

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
        <ProfileEditor user={user} supabaseClient={supabaseClient} currentProfile={profile} onProfileUpdated={handleProfileUpdated} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {profile ? 'Your Profile' : 'Create Your Profile'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {profile ? 'Manage your profile information' : 'Start building your profile to connect with others.'}
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          {profile ? 'Edit Profile' : 'Create Profile'}
        </Button>
      </div>

      {profile ? (
        <div className="space-y-6">
          <Card className="p-6 md:p-8">
            <CardContent className="flex flex-col md:flex-row items-start md:items-stretch gap-8 p-0">
              {/* Left Column: Avatar & Images */}
              <div className="flex flex-col items-center md:w-1/3 w-full">
                <Avatar className="h-32 w-32 mb-4 border-2 border-primary">
                  <AvatarImage src={getMainImage() || undefined} alt={profile.profile_username} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {profile.profile_username ? profile.profile_username.substring(0, 2).toUpperCase() : <UserCircle className="h-20 w-20" />}
                  </AvatarFallback>
                </Avatar>
                
                {/* Additional Images */}
                {profileImages.length > 1 && (
                  <div className="w-full max-w-[200px]">
                    <h4 className="text-lg font-semibold text-gray-700 mb-2 text-center">More Photos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {profileImages.slice(1).map((image, index) => (
                        <div key={image.image_id} className="aspect-square rounded-md overflow-hidden">
                          <img 
                            src={image.image_url} 
                            alt={`Profile ${index + 2}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Profile Details */}
              <div className="flex-1 w-full md:w-2/3 space-y-6 text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                  {profile.profile_username}
                </h2>
                <p className="text-lg text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                  {user.email}
                  {profile.profile_phone && (
                    <>
                      <Separator orientation="vertical" className="h-5" />
                      <Phone className="h-4 w-4" /> {profile.profile_phone}
                    </>
                  )}
                </p>

                <Separator className="my-4" />

                {/* Gender, Birth Date, Looking For */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center">
                    {getGenderIcon(profile.profile_gender)}
                    <span className="text-sm font-semibold text-muted-foreground">Gender</span>
                    <span className="text-lg font-bold text-gray-800">
                      {profile.profile_gender || 'N/A'}
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
        </div>
      ) : (
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