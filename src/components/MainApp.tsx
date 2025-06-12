
import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'
import { Home, Bell, Users, Settings, UserCircle, Users as UsersIcon } from 'lucide-react'
import Dashboard from '@/components/pages/Dashboard'
import Notifications from '@/components/pages/Notifications'
import FriendList from '@/components/pages/FriendList'
import SettingsPage from '@/components/pages/SettingsPage'
import ProfilePage from '@/components/pages/ProfilePage'

interface MainAppProps {
  user: User
}

type ActivePage = 'dashboard' | 'notifications' | 'friends' | 'settings' | 'profile'

const MainApp: React.FC<MainAppProps> = ({ user }) => {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  const { toast } = useToast()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
    }
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard user={user} />
      case 'notifications':
        return <Notifications user={user} />
      case 'friends':
        return <FriendList user={user} />
      case 'settings':
        return <SettingsPage user={user} />
      case 'profile':
        return <ProfilePage user={user} />
      default:
        return <Dashboard user={user} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Informatch</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white border-r min-h-screen p-4">
          <div className="space-y-2">
            <button
              onClick={() => setActivePage('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-100 transition-colors ${
                activePage === 'dashboard' ? 'bg-primary text-white hover:bg-primary/90' : 'text-gray-700'
              }`}
            >
              <Home className="h-5 w-5" />
              Dashboard
            </button>
            
            <button
              onClick={() => setActivePage('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-100 transition-colors ${
                activePage === 'notifications' ? 'bg-primary text-white hover:bg-primary/90' : 'text-gray-700'
              }`}
            >
              <Bell className="h-5 w-5" />
              Notifications
            </button>
            
            <button
              onClick={() => setActivePage('friends')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-100 transition-colors ${
                activePage === 'friends' ? 'bg-primary text-white hover:bg-primary/90' : 'text-gray-700'
              }`}
            >
              <Users className="h-5 w-5" />
              Friends
            </button>
            
            <button
              onClick={() => setActivePage('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-100 transition-colors ${
                activePage === 'settings' ? 'bg-primary text-white hover:bg-primary/90' : 'text-gray-700'
              }`}
            >
              <Settings className="h-5 w-5" />
              Settings
            </button>
            
            <button
              onClick={() => setActivePage('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-100 transition-colors ${
                activePage === 'profile' ? 'bg-primary text-white hover:bg-primary/90' : 'text-gray-700'
              }`}
            >
              <UserCircle className="h-5 w-5" />
              Profile
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderActivePage()}
        </main>
      </div>
    </div>
  )
}

export default MainApp
