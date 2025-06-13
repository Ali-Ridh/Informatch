// src/components/ProfileEditor.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@supabase/supabase-js';
import { UserCircle, UploadCloud, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Import ShadCN Select components for Gender
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed: format from "date-fns", Popover, CalendarIcon, cn (as per previous request for basic date input)


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
  profile_phone: string | null; // Added phone number
  profile_avatar_url: string | null; // Added avatar URL
  profile_gender: string | null; // Added gender
}

interface ProfileEditorProps {
  user: User; // User object will always be present here
  supabaseClient: any; // Supabase client passed as a prop
  currentProfile: UserProfile | null; // Existing profile data, or null for new profile
  onProfileUpdated: () => void; // Callback to notify parent after save
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, supabaseClient, currentProfile, onProfileUpdated }) => {
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<UserProfile>({
    user_id: user.id, // Always link to the current user's ID
    profile_username: currentProfile?.profile_username || '',
    profile_bio: currentProfile?.profile_bio || '',
    profile_birthdate: currentProfile?.profile_birthdate || '',
    profile_academic_interests: currentProfile?.profile_academic_interests || '',
    profile_non_academic_interests: currentProfile?.profile_non_academic_interests || '',
    profile_looking_for: currentProfile?.profile_looking_for || '',
    profile_phone: currentProfile?.profile_phone || '',
    profile_avatar_url: currentProfile?.profile_avatar_url || null,
    profile_gender: currentProfile?.profile_gender || null, // Initialize gender
  });

  // Use useEffect to update formData and avatarPreviewUrl if currentProfile prop changes
  useEffect(() => {
    if (currentProfile) {
      setFormData({
        user_id: user.id,
        profile_username: currentProfile.profile_username || '',
        profile_bio: currentProfile.profile_bio || '',
        profile_birthdate: currentProfile.profile_birthdate || '',
        profile_academic_interests: currentProfile.profile_academic_interests || '',
        profile_non_academic_interests: currentProfile.profile_non_academic_interests || '',
        profile_looking_for: currentProfile.profile_looking_for || '',
        profile_phone: currentProfile.profile_phone || '',
        profile_avatar_url: currentProfile.profile_avatar_url || null,
        profile_gender: currentProfile.profile_gender || null, // Update gender
      });
      setAvatarPreviewUrl(currentProfile.profile_avatar_url || null);
    } else {
      // Clear form if no profile is passed (e.g., creating a new profile)
      setFormData({
        user_id: user.id,
        profile_username: '',
        profile_bio: '',
        profile_birthdate: '',
        profile_academic_interests: '',
        profile_non_academic_interests: '',
        profile_looking_for: '',
        profile_phone: '',
        profile_avatar_url: null,
        profile_gender: null, // Clear gender
      });
      setAvatarPreviewUrl(null);
    }
    setAvatarFile(null); // Clear any selected file on profile change
  }, [currentProfile, user.id]);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectChange = (value: string) => { // Handler for ShadCN Select component (Gender)
    setFormData(prev => ({
      ...prev,
      profile_gender: value // Direct update for gender
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid file type", description: "Please select an image file (e.g., JPEG, PNG, GIF).", variant: "destructive" });
        setAvatarFile(null); setAvatarPreviewUrl(null); return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Image size should not exceed 5MB.", variant: "destructive" });
        setAvatarFile(null); setAvatarPreviewUrl(null); return;
      }
      setAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file));
    } else {
      setAvatarFile(null);
      setAvatarPreviewUrl(formData.profile_avatar_url);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setFormData(prev => ({ ...prev, profile_avatar_url: null }));
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) {
      return formData.profile_avatar_url;
    }
    setIsUploading(true);
    const fileExtension = avatarFile.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExtension}`;
    const bucketName = 'avatars'; // Your bucket name

    try {
      const { error } = await supabaseClient.storage
        .from(bucketName)
        .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (publicUrlData) {
        toast({ title: "Avatar uploaded", description: "Your profile picture has been updated." });
        return publicUrlData.publicUrl;
      }
      return null;
    } catch (error: any) {
      console.error('Error uploading avatar:', error.message);
      toast({ title: "Upload Failed", description: error.message || "Failed to upload profile picture.", variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
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

      let newAvatarUrl = formData.profile_avatar_url;
      if (avatarFile || (avatarPreviewUrl === null && formData.profile_avatar_url !== null)) {
        newAvatarUrl = await uploadAvatar();
      }

      const profileDataToSave: Partial<UserProfile> = {
        profile_username: formData.profile_username.trim(),
        profile_bio: formData.profile_bio.trim() || null,
        profile_birthdate: formData.profile_birthdate,
        profile_academic_interests: formData.profile_academic_interests.trim() || null,
        profile_non_academic_interests: formData.profile_non_academic_interests.trim() || null,
        profile_looking_for: formData.profile_looking_for.trim() || null,
        profile_phone: formData.profile_phone.trim() || null,
        profile_avatar_url: newAvatarUrl,
        profile_gender: formData.profile_gender, // Save gender
      };

      let error = null;
      if (currentProfile) {
        const { error: updateError } = await supabaseClient.from('profiles').update(profileDataToSave).eq('user_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabaseClient.from('profiles').insert([{ ...profileDataToSave, user_id: user.id }]);
        error = insertError;
      }

      if (error) throw error;

      toast({ title: "Success", description: "Profile saved successfully!", });
      onProfileUpdated();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({ title: "Error", description: error.message || "Failed to save profile", variant: "destructive" });
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Upload Section */}
          <div className="flex flex-col items-center gap-4">
            <Label className="text-lg font-semibold">Profile Picture</Label>
            <Avatar className="h-32 w-32 border-2 border-primary">
              <AvatarImage src={avatarPreviewUrl || undefined} alt="Profile Avatar" />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {isUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                ) : (
                  <UserCircle className="h-16 w-16" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <UploadCloud className="mr-2 h-4 w-4" /> Upload New Image
              </Button>
              {avatarPreviewUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              )}
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
            <p className="text-sm text-muted-foreground">Max 5MB (JPG, PNG, GIF)</p>
          </div>

          {/* Username */}
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

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.profile_gender || ''} // Handle null case for value prop
              onValueChange={(value) => handleSelectChange(value)} // Use new handleSelectChange
            >
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Non-binary">Non-binary</SelectItem>
                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel" // Use type="tel" for phone numbers
              placeholder="e.g., +6281234567890"
              value={formData.profile_phone || ''}
              onChange={(e) => handleInputChange('profile_phone', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Optional</p>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birthdate">Birth Date</Label>
            <Input
              id="birthdate"
              type="date"
              value={formData.profile_birthdate}
              onChange={(e) => handleInputChange('profile_birthdate', e.target.value)}
              required
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell others about yourself..."
              value={formData.profile_bio || ''}
              onChange={(e) => handleInputChange('profile_bio', e.target.value)}
              rows={3}
            />
          </div>

          {/* Academic Interests */}
          <div className="space-y-2">
            <Label htmlFor="academic">Academic Interests</Label>
            <Input
              id="academic"
              type="text"
              placeholder="e.g., Machine Learning, Web Development, Cybersecurity"
              value={formData.profile_academic_interests || ''}
              onChange={(e) => handleInputChange('profile_academic_interests', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Separate interests with commas
            </p>
          </div>

          {/* Non-Academic Interests */}
          <div className="space-y-2">
            <Label htmlFor="nonacademic">Non-Academic Interests</Label>
            <Input
              id="nonacademic"
              type="text"
              placeholder="e.g., Gaming, Photography, Hiking, Cooking"
              value={formData.profile_non_academic_interests || ''}
              onChange={(e) => handleInputChange('profile_non_academic_interests', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Separate interests with commas
            </p>
          </div>

          {/* Looking For */}
          <div className="space-y-2">
            <Label htmlFor="looking">Looking For</Label>
            <Textarea
              id="looking"
              placeholder="What type of connections are you seeking?"
              value={formData.profile_looking_for || ''}
              onChange={(e) => handleInputChange('profile_looking_for', e.target.value)}
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saving || isUploading || !formData.profile_username.trim() || !formData.profile_birthdate.trim()}
          >
            {saving || isUploading ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileEditor;