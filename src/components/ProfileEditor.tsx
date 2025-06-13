import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { UserCircle, UploadCloud, Trash2, Plus, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  profile_id?: number;
  user_id: string;
  profile_username: string;
  profile_bio: string | null;
  profile_birthdate: string;
  profile_academic_interests: string | null;
  profile_non_academic_interests: string | null;
  profile_looking_for: string | null;
  profile_created_at?: string;
  profile_phone: string | null;
  profile_avatar_url: string | null;
  profile_gender: string | null;
}

interface ProfileImage {
  image_id?: number;
  image_url: string;
  image_order: number;
  file?: File;
}

interface ProfileEditorProps {
  user: User;
  supabaseClient: any;
  currentProfile: UserProfile | null;
  onProfileUpdated: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, supabaseClient, currentProfile, onProfileUpdated }) => {
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState<UserProfile>({
    user_id: user.id,
    profile_username: currentProfile?.profile_username || '',
    profile_bio: currentProfile?.profile_bio || '',
    profile_birthdate: currentProfile?.profile_birthdate || '',
    profile_academic_interests: currentProfile?.profile_academic_interests || '',
    profile_non_academic_interests: currentProfile?.profile_non_academic_interests || '',
    profile_looking_for: currentProfile?.profile_looking_for || '',
    profile_phone: currentProfile?.profile_phone || '',
    profile_avatar_url: currentProfile?.profile_avatar_url || null,
    profile_gender: currentProfile?.profile_gender || null,
  });

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
        profile_gender: currentProfile.profile_gender || null,
      });
      
      // Fetch existing profile images
      fetchProfileImages();
    } else {
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
        profile_gender: null,
      });
      setProfileImages([]);
    }
  }, [currentProfile, user.id]);

  const fetchProfileImages = async () => {
    if (!currentProfile?.profile_id) return;

    try {
      const { data, error } = await supabaseClient
        .from('profile_images')
        .select('*')
        .eq('profile_id', currentProfile.profile_id)
        .order('image_order');

      if (error) throw error;

      const images: ProfileImage[] = data || [];
      // Ensure we have slots for 3 images
      while (images.length < 3) {
        images.push({
          image_url: '',
          image_order: images.length + 1
        });
      }
      setProfileImages(images);
    } catch (error: any) {
      console.error('Error fetching profile images:', error);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      profile_gender: value
    }));
  };

  const handleImageChange = (index: number, file: File | null) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ 
          title: "Invalid file type", 
          description: "Please select an image file (e.g., JPEG, PNG, GIF).", 
          variant: "destructive" 
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: "File too large", 
          description: "Image size should not exceed 5MB.", 
          variant: "destructive" 
        });
        return;
      }

      const newImages = [...profileImages];
      newImages[index] = {
        ...newImages[index],
        image_url: URL.createObjectURL(file),
        file: file
      };
      setProfileImages(newImages);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...profileImages];
    if (newImages[index].image_url && newImages[index].image_url.startsWith('blob:')) {
      URL.revokeObjectURL(newImages[index].image_url);
    }
    newImages[index] = {
      image_url: '',
      image_order: index + 1
    };
    setProfileImages(newImages);
    
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = '';
    }
  };

  const uploadImage = async (file: File, order: number): Promise<string | null> => {
    const fileExtension = file.name.split('.').pop();
    const filePath = `${user.id}/image_${order}_${Date.now()}.${fileExtension}`;
    const bucketName = 'profile-images';

    try {
      const { error } = await supabaseClient.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrlData?.publicUrl || null;
    } catch (error: any) {
      console.error('Error uploading image:', error.message);
      toast({ 
        title: "Upload Failed", 
        description: error.message || "Failed to upload image.", 
        variant: "destructive" 
      });
      return null;
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

      if (!formData.profile_username.trim() || !formData.profile_birthdate.trim()) {
        toast({
          title: "Validation Error",
          description: "Username and Birthdate are required.",
          variant: "destructive",
        });
        return;
      }

      // Handle profile data
      const profileDataToSave: Partial<UserProfile> = {
        profile_username: formData.profile_username.trim(),
        profile_bio: formData.profile_bio?.trim() || null,
        profile_birthdate: formData.profile_birthdate,
        profile_academic_interests: formData.profile_academic_interests?.trim() || null,
        profile_non_academic_interests: formData.profile_non_academic_interests?.trim() || null,
        profile_looking_for: formData.profile_looking_for?.trim() || null,
        profile_phone: formData.profile_phone?.trim() || null,
        profile_gender: formData.profile_gender,
      };

      let profileId = currentProfile?.profile_id;
      let error = null;

      if (currentProfile) {
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update(profileDataToSave)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabaseClient
          .from('profiles')
          .insert([{ ...profileDataToSave, user_id: user.id }])
          .select('profile_id')
          .single();
        error = insertError;
        profileId = insertData?.profile_id;
      }

      if (error) throw error;

      // Handle image uploads
      setIsUploading(true);
      for (let i = 0; i < profileImages.length; i++) {
        const image = profileImages[i];
        if (image.file) {
          const uploadedUrl = await uploadImage(image.file, i + 1);
          if (uploadedUrl && profileId) {
            // Check if image already exists
            const { data: existingImage } = await supabaseClient
              .from('profile_images')
              .select('image_id')
              .eq('profile_id', profileId)
              .eq('image_order', i + 1)
              .single();

            if (existingImage) {
              // Update existing image
              await supabaseClient
                .from('profile_images')
                .update({ image_url: uploadedUrl })
                .eq('image_id', existingImage.image_id);
            } else {
              // Insert new image
              await supabaseClient
                .from('profile_images')
                .insert({
                  profile_id: profileId,
                  image_url: uploadedUrl,
                  image_order: i + 1
                });
            }
          }
        }
      }

      // Update avatar URL with first image
      const firstImage = profileImages.find(img => img.image_url && !img.image_url.startsWith('blob:'));
      if (firstImage && profileId) {
        await supabaseClient
          .from('profiles')
          .update({ profile_avatar_url: firstImage.image_url })
          .eq('profile_id', profileId);
      }

      toast({ title: "Success", description: "Profile saved successfully!" });
      onProfileUpdated();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save profile", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{currentProfile ? 'Edit Profile' : 'Create Profile'}</CardTitle>
        <CardDescription>
          {currentProfile ? 'Update your profile information.' : 'Add your information to help others find you.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Images Section */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Profile Images (Up to 3)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profileImages.map((image, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative">
                    <div className="aspect-square w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                      {image.image_url ? (
                        <div className="relative w-full h-full">
                          <img
                            src={image.image_url}
                            alt={`Profile ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveImage(index)}
                            disabled={isUploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          {index === 0 && (
                            <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                              Main Photo
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                          <UploadCloud className="h-8 w-8 mb-2" />
                          <span className="text-sm">
                            {index === 0 ? 'Main Photo' : `Photo ${index + 1}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[index] = el)}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleImageChange(index, e.target.files?.[0] || null)}
                      disabled={isUploading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    disabled={isUploading}
                  >
                    {image.image_url ? 'Change Image' : 'Add Image'}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              The first image will be used as your main profile photo. Max 5MB per image (JPG, PNG, GIF).
            </p>
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
              value={formData.profile_gender || ''}
              onValueChange={handleSelectChange}
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
              type="tel"
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