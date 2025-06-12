
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from '@supabase/supabase-js'
import { Bell } from 'lucide-react'

interface NotificationsProps {
  user: User
}

const Notifications: React.FC<NotificationsProps> = ({ user }) => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-lg text-muted-foreground">
          See who wants to connect with you
        </p>
      </div>

      <Card className="text-center py-12">
        <CardContent>
          <Bell className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
          <p className="text-muted-foreground">
            When someone wants to match with you, you'll see their requests here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Notifications
