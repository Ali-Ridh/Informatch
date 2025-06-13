// src/components/ProfileEditor.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// Removed: format from "date-fns" (since it's only used for the Popover/Calendar)
// Removed: Popover, PopoverContent, PopoverTrigger
// Removed: CalendarIcon
// Removed: cn (assuming it was only used for the Calendar Popover)


// Define the expected structure of a user profile for the editor
interface UserProfile {
  profile_id?: number; // Optional, as it might not exist for a new profile
  user_id: string;
  profile_username: string;
  profile_bio: string | null;
  profile_birthdate: string;
  profile_academic_interests: string | null;
  profile_non_academic_interests: string | null;
  profile_looking_for: string | null;
  profile_created_at?: string; // Optional
}

// Define the correct props interface for ProfileEditor
interface ProfileEditorProps {
  user: User; // User object will always be present here
  supabaseClient: any; // Supabase client passed as a prop
  currentProfile: UserProfile | null; // Existing profile data, or null for new profile
  onProfileUpdated: () => void; // Callback to notify parent after save
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, supabaseClient, currentProfile, onProfileUpdated }) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Initialize formData from currentProfile prop
  const [formData, setFormData] = useState<UserProfile>({
    user_id: user.id, // Always link to the current user's ID
    profile_username: currentProfile?.profile_username || '',
    profile_bio: currentProfile?.profile_bio || '',
    profile_birthdate: currentProfile?.profile_birthdate || '',
    profile_academic_interests: currentProfile?.profile_academic_interests || '',
    profile_non_academic_interests: currentProfile?.profile_non_academic_interests || '',
    profile_looking_for: currentProfile?.profile_looking_for || ''
  });

  // Use useEffect to update formData if currentProfile prop changes (e.g., user navigates back to edit)
  useEffect(() => {
    if (currentProfile) {
      setFormData({
        user_id: user.id,
        profile_username: currentProfile.profile_username || '',
        profile_bio: currentProfile.profile_bio || '',
        profile_birthdate: currentProfile.profile_birthdate || '',
        profile_academic_interests: currentProfile.profile_academic_interests || '',
        profile_non_academic_interests: currentProfile.profile_non_academic_interests || '',
        profile_looking_for: currentProfile.profile_looking_for || ''
      });
    } else {
      // Clear form if no profile is passed (e.g., creating a new profile)
      setFormData({
        user_id: user.id,
        profile_username: '',
        profile_bio: '',
        profile_birthdate: '',
        profile_academic_interests: '',
        profile_non_academic_interests: '',
        profile_looking_for: ''
      });
    }
  }, [currentProfile, user.id]); // Dependency on currentProfile and user.id

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Error", description: "User not logged in.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      // Basic validation: username and birthdate are required
      if (!formData.profile_username.trim() || !formData.profile_birthdate.trim()) {
        toast({
          title: "Validation Error",
          description: "Username and Birthdate are required.",
          variant: "destructive",
        });
        return;
      }

      const profileDataToSave = {
        user_id: user.id,
        profile_username: formData.profile_username.trim(),
        profile_bio: formData.profile_bio.trim() || null,
        profile_birthdate: formData.profile_birthdate, // No longer needs format(date, 'yyyy-MM-dd') if it's a direct input string
        profile_academic_interests: formData.profile_academic_interests.trim() || null,
        profile_non_academic_interests: formData.profile_non_academic_interests.trim() || null,
        profile_looking_for: formData.profile_looking_for.trim() || null
      };

      let error = null;
      if (currentProfile) { // If currentProfile exists, it's an update
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update(profileDataToSave)
          .eq('user_id', user.id);
        error = updateError;
      } else { // Otherwise, it's an insert
        const { error: insertError } = await supabaseClient
          .from('profiles')
          .insert([profileDataToSave]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile saved successfully!",
      });

      onProfileUpdated(); // Call the callback to notify parent
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{currentProfile ? 'Edit Profile' : 'Create Profile'}</CardTitle>
        <CardDescription>
          {currentProfile ? 'Update your profile information.' : 'Add your information to help others find you.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={formData.profile_username}
              onChange={(e) => handleInputChange('profile_username', e.target.value)}
              required
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthdate">Birth Date</Label>
            <Input
              id="birthdate"
              type="date" // Standard HTML date input
              value={formData.profile_birthdate}
              onChange={(e) => handleInputChange('profile_birthdate', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell others about yourself..."
              value={formData.profile_bio}
              onChange={(e) => handleInputChange('profile_bio', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic">Academic Interests</Label>
            <Input
              id="academic"
              type="text"
              placeholder="e.g., Machine Learning, Web Development, Cybersecurity"
              value={formData.profile_academic_interests}
              onChange={(e) => handleInputChange('profile_academic_interests', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Separate interests with commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nonacademic">Non-Academic Interests</Label>
            <Input
              id="nonacademic"
              type="text"
              placeholder="e.g., Gaming, Photography, Hiking, Cooking"
              value={formData.profile_non_academic_interests}
              onChange={(e) => handleInputChange('profile_non_academic_interests', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Separate interests with commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="looking">Looking For</Label>
            <Textarea
              id="looking"
              placeholder="What type of connections are you seeking?"
              value={formData.profile_looking_for}
              onChange={(e) => handleInputChange('profile_looking_for', e.target.value)}
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saving || !formData.profile_username.trim() || !formData.profile_birthdate.trim()}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileEditor;