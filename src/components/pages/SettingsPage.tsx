
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from '@supabase/supabase-js'
import { Settings } from 'lucide-react'

interface SettingsPageProps {
  user: User
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user }) => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card className="text-center py-12">
        <CardContent>
          <Settings className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Settings coming soon</h3>
          <p className="text-muted-foreground">
            Privacy settings, notification preferences, and more will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsPage
