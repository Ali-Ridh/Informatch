import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '@supabase/supabase-js';
import { Settings, Key, Calendar, Phone, EyeOff } from 'lucide-react'; // Removed Radio icon
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from '@/components/ui/switch'; // Ensure Switch is imported

interface SettingsPageProps {
  user: User;
  supabaseClient: any;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, supabaseClient }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthdate, setBirthdate] = useState<Date | undefined>(user.user_metadata?.birthdate ? new Date(user.user_metadata.birthdate) : undefined);
  const [phoneNumber, setPhoneNumber] = useState(user.phone || '');

  // State for Privacy Settings
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [showAge, setShowAge] = useState<boolean>(true);
  const [showBio, setShowBio] = useState<boolean>(true);

  // Loading states for each section
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingBirthdate, setIsUpdatingBirthdate] = useState(false);
  const [isUpdatingPhoneNumber, setIsUpdatingPhoneNumber] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(true);

  const { toast } = useToast();

  // Effect to fetch initial privacy settings from the 'users' table
  useEffect(() => {
    const fetchPrivacySettings = async () => {
      setIsLoadingPrivacy(true);
      try {
        const { data, error } = await supabaseClient
          .from('users')
          .select('user_priset_is_private, user_priset_show_age, user_priset_show_bio')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setIsPrivate(data.user_priset_is_private);
          setShowAge(data.user_priset_show_age);
          setShowBio(data.user_priset_show_bio);
        }
      } catch (error: any) {
        console.error("Error fetching privacy settings:", error.message);
        toast({
          title: "Error",
          description: "Failed to load privacy settings: " + error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoadingPrivacy(false);
      }
    };

    if (user?.id) {
      fetchPrivacySettings();
    }
  }, [user.id, supabaseClient, toast]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your password has been updated.",
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleChangeBirthdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingBirthdate(true);

    if (!birthdate) {
      toast({
        title: "Error",
        description: "Please select a birthdate.",
        variant: "destructive",
      });
      setIsUpdatingBirthdate(false);
      return;
    }

    try {
      const { error } = await supabaseClient.auth.updateUser({
        data: { birthdate: format(birthdate, 'yyyy-MM-dd') },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your birthdate has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update birthdate.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBirthdate(false);
    }
  };

  const handleChangePhoneNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPhoneNumber(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        phone: phoneNumber,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your phone number has been updated. Please check your phone for verification.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update phone number.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPhoneNumber(false);
    }
  };

  // Generic handler for updating privacy settings in public.users table
  const updatePrivacySetting = async (key: string, value: boolean) => {
    setIsUpdatingPrivacy(true);
    try {
      const { error } = await supabaseClient
        .from('users')
        .update({ [key]: value, user_priset_last_updated: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Privacy setting updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update setting: ${error.message}`,
        variant: "destructive",
      });
      // Revert optimistic UI update on error
      if (key === 'user_priset_is_private') setIsPrivate(!value);
      if (key === 'user_priset_show_age') setShowAge(!value);
      if (key === 'user_priset_show_bio') setShowBio(!value);
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const handleToggleHideAccount = async (checked: boolean) => {
    setIsPrivate(checked); // Optimistic UI update
    await updatePrivacySetting('user_priset_is_private', checked);
  };

  // Changed to accept boolean directly from Switch component
  const handleToggleShowAge = async (checked: boolean) => {
    setShowAge(checked); // Optimistic UI update
    await updatePrivacySetting('user_priset_show_age', checked);
  };

  // Changed to accept boolean directly from Switch component
  const handleToggleShowBio = async (checked: boolean) => {
    setShowBio(checked); // Optimistic UI update
    await updatePrivacySetting('user_priset_show_bio', checked);
  };


  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Change Password */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Change Password
          </CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Change Birthdate */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Change Birthdate
          </CardTitle>
          <CardDescription>Update your birthdate information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeBirthdate} className="space-y-4">
            <div>
              <Label htmlFor="birthdate">Birthdate</Label>
              <Popover>
                <PopoverTrigger asChild>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  {/* IMPORTANT: Replace with your actual ShadCN Calendar component */}
                  {/* Example: <Calendar mode="single" selected={birthdate} onSelect={setBirthdate} initialFocus /> */}
                  <p className="p-4 text-sm text-muted-foreground">
                    Placeholder for ShadCN `Calendar` component.
                    <br/>
                    Please implement it here.
                  </p>
                </PopoverContent>
              </Popover>
              {/* Fallback for demonstration if Calendar component isn't integrated yet */}
              <Input
                id="birthdate-fallback"
                type="date"
                value={birthdate ? format(birthdate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setBirthdate(e.target.value ? new Date(e.target.value) : undefined)}
                className="mt-2"
              />
            </div>
            <Button type="submit" disabled={isUpdatingBirthdate}>
              {isUpdatingBirthdate ? 'Updating...' : 'Update Birthdate'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Phone Number */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" /> Phone Number
          </CardTitle>
          <CardDescription>Update your phone number.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePhoneNumber} className="space-y-4">
            <div>
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., +6281234567890"
                required
              />
            </div>
            <Button type="submit" disabled={isUpdatingPhoneNumber}>
              {isUpdatingPhoneNumber ? 'Updating...' : 'Update Phone Number'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Privacy Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5" /> Privacy Settings
          </CardTitle>
          <CardDescription>Control who can see your profile and details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingPrivacy ? (
            <div className="text-center text-muted-foreground">Loading privacy settings...</div>
          ) : (
            <>
              {/* Hide Account Toggle */}
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="hide-account" className="flex flex-col space-y-1">
                  <span>Hide Account</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    When toggled, people wouldn’t be able to search for your profile directly.
                    They would need to send a request to match with you.
                  </span>
                </Label>
                <Switch
                  id="hide-account"
                  checked={isPrivate}
                  onCheckedChange={handleToggleHideAccount}
                  disabled={isUpdatingPrivacy}
                />
              </div>

              <Separator />

              {/* Show Age Toggle */}
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="show-age" className="flex flex-col space-y-1">
                  <span>Show Age</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Toggle to show or hide your age on your profile.
                  </span>
                </Label>
                <Switch
                  id="show-age"
                  checked={showAge}
                  onCheckedChange={handleToggleShowAge} // Updated handler
                  disabled={isUpdatingPrivacy}
                />
              </div>

              <Separator />

              {/* Show Bio Toggle */}
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="show-bio" className="flex flex-col space-y-1">
                  <span>Show Bio</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Toggle to show or hide your bio on your profile.
                  </span>
                </Label>
                <Switch
                  id="show-bio"
                  checked={showBio}
                  onCheckedChange={handleToggleShowBio} // Updated handler
                  disabled={isUpdatingPrivacy}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;