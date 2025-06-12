import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'

interface Profile {
  profile_id: number
  user_id: string
  profile_username: string
  profile_bio: string | null
  profile_birthdate: string
  profile_academic_interests: string | null
  profile_non_academic_interests: string | null
  profile_looking_for: string | null
}

interface ProfileEditorProps {
  user: User | null
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user }) => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    profile_username: '',
    profile_bio: '',
    profile_birthdate: '',
    profile_academic_interests: '',
    profile_non_academic_interests: '',
    profile_looking_for: ''
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setProfile(data)
        setFormData({
          profile_username: data.profile_username || '',
          profile_bio: data.profile_bio || '',
          profile_birthdate: data.profile_birthdate || '',
          profile_academic_interests: data.profile_academic_interests || '',
          profile_non_academic_interests: data.profile_non_academic_interests || '',
          profile_looking_for: data.profile_looking_for || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error",
        description: "Failed to fetch profile data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSaving(true)

      const profileData = {
        user_id: user.id,
        profile_username: formData.profile_username.trim(),
        profile_bio: formData.profile_bio.trim() || null,
        profile_birthdate: formData.profile_birthdate,
        profile_academic_interests: formData.profile_academic_interests.trim() || null,
        profile_non_academic_interests: formData.profile_non_academic_interests.trim() || null,
        profile_looking_for: formData.profile_looking_for.trim() || null
      }

      let error
      if (profile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', user.id)
        error = updateError
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profileData])
        error = insertError
      }

      if (error) throw error

      toast({
        title: "Success",
        description: "Profile saved successfully!",
      })

      // Refresh profile data
      await fetchProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
          Update your profile information to help others find you
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
              type="date"
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
            disabled={saving || !formData.profile_username.trim() || !formData.profile_birthdate}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ProfileEditor
