
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from '@supabase/supabase-js'
import { Users } from 'lucide-react'

interface FriendListProps {
  user: User
}

const FriendList: React.FC<FriendListProps> = ({ user }) => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Friends</h1>
        <p className="text-lg text-muted-foreground">
          Your connections and matches
        </p>
      </div>

      <Card className="text-center py-12">
        <CardContent>
          <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No friends yet</h3>
          <p className="text-muted-foreground">
            Start connecting with people to build your network!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default FriendList
