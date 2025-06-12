import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'
import { Heart, UserX, Loader2, Users } from 'lucide-react'

interface ProfileSuggestion {
  profile_id: number
  user_id: string
  profile_username: string
  profile_bio: string | null
  profile_birthdate: string
  profile_academic_interests: string | null
  profile_non_academic_interests: string | null
  profile_looking_for: string | null
  compatibility_score?: number
}

interface DiscoverPageProps {
  user: User | null
}

const DiscoverPage: React.FC<DiscoverPageProps> = ({ user }) => {
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchSuggestions()
    }
  }, [user])

  const fetchSuggestions = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke('get-match-suggestions', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })

      if (error) throw error

      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      toast({
        title: "Error",
        description: "Failed to fetch match suggestions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (targetUserId: string) => {
    if (!user) return

    try {
      setActionLoading(targetUserId)

      const { error } = await supabase
        .from('matches')
        .insert([{
          match_user1_id: user.id,
          match_user2_id: targetUserId
        }])

      if (error) throw error

      toast({
        title: "Connected!",
        description: "You've successfully connected with this user",
      })

      // Remove the user from suggestions
      setSuggestions(prev => prev.filter(suggestion => suggestion.user_id !== targetUserId))
    } catch (error) {
      console.error('Error creating match:', error)
      toast({
        title: "Error",
        description: "Failed to create connection",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleBlock = async (targetUserId: string) => {
    if (!user) return

    try {
      setActionLoading(targetUserId)

      const { error } = await supabase
        .from('blocked_users')
        .insert([{
          blocker_id: user.id,
          blocked_id: targetUserId
        }])

      if (error) throw error

      toast({
        title: "User blocked",
        description: "This user will no longer appear in your suggestions",
      })

      // Remove the user from suggestions
      setSuggestions(prev => prev.filter(suggestion => suggestion.user_id !== targetUserId))
    } catch (error) {
      console.error('Error blocking user:', error)
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const calculateAge = (birthdate: string) => {
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const parseInterests = (interests: string | null) => {
    return interests ? interests.split(',').map(i => i.trim()).filter(i => i) : []
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-lg text-muted-foreground">Finding your perfect matches...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover Connections</h1>
          <p className="text-lg text-muted-foreground">
            Connect with fellow Informatics students who share your interests
          </p>
        </div>

        {suggestions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No suggestions available</h3>
              <p className="text-muted-foreground">
                Check back later for new potential connections, or try updating your interests in your profile.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((suggestion) => {
              const academicInterests = parseInterests(suggestion.profile_academic_interests)
              const nonAcademicInterests = parseInterests(suggestion.profile_non_academic_interests)
              const age = calculateAge(suggestion.profile_birthdate)
              const isActionLoading = actionLoading === suggestion.user_id

              return (
                <Card key={suggestion.profile_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{suggestion.profile_username}</CardTitle>
                      {suggestion.compatibility_score !== undefined && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {suggestion.compatibility_score} matches
                        </Badge>
                      )}
                    </div>
                    <CardDescription>Age: {age}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {suggestion.profile_bio && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">About</h4>
                        <p className="text-sm">{suggestion.profile_bio}</p>
                      </div>
                    )}

                    {academicInterests.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Academic Interests</h4>
                        <div className="flex flex-wrap gap-1">
                          {academicInterests.map((interest, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {nonAcademicInterests.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Other Interests</h4>
                        <div className="flex flex-wrap gap-1">
                          {nonAcademicInterests.map((interest, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestion.profile_looking_for && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Looking For</h4>
                        <p className="text-sm">{suggestion.profile_looking_for}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleConnect(suggestion.user_id)}
                        disabled={isActionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Heart className="h-4 w-4 mr-1" />
                            Connect
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleBlock(suggestion.user_id)}
                        disabled={isActionLoading}
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        {isActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Block
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default DiscoverPage
