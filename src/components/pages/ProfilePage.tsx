
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from '@supabase/supabase-js'
import { Edit, UserCircle } from 'lucide-react'
import ProfileEditor from '@/components/ProfileEditor'

interface ProfilePageProps {
  user: User
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false)

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
        <ProfileEditor user={user} />
      </div>
    )
  }

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
          Edit Profile
        </Button>
      </div>

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
    </div>
  )
}

export default ProfilePage
