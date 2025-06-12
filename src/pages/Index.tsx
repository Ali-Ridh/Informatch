
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'
import { Users, Heart, Shield, GraduationCap } from 'lucide-react'
import ProfileEditor from '@/components/ProfileEditor'
import DiscoverPage from '@/components/DiscoverPage'

const Index = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    try {
      let result
      if (authMode === 'signup') {
        result = await supabase.auth.signUp({
          email,
          password,
        })
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        })
      }

      if (result.error) throw result.error

      if (authMode === 'signup' && result.data.user) {
        // Create user record
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            user_id: result.data.user.id,
            user_email: result.data.user.email!,
          }])

        if (userError) throw userError

        toast({
          title: "Welcome to Informatch!",
          description: "Please check your email to verify your account.",
        })
      } else {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        })
      }

      setEmail('')
      setPassword('')
    } catch (error: any) {
      console.error('Auth error:', error)
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setAuthLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Informatch</h1>
            <p className="text-muted-foreground">
              Connect with fellow Informatics students who share your interests
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</CardTitle>
              <CardDescription>
                {authMode === 'signin' 
                  ? 'Welcome back! Please sign in to your account.' 
                  : 'Create your account to start connecting with other students.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-sm"
                >
                  {authMode === 'signin' 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <GraduationCap className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Academic Focus</p>
            </div>
            <div className="flex flex-col items-center">
              <Heart className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Smart Matching</p>
            </div>
            <div className="flex flex-col items-center">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Safe Community</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
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

      <main className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            <DiscoverPage user={user} />
          </TabsContent>

          <TabsContent value="profile">
            <div className="py-6">
              <ProfileEditor user={user} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default Index
