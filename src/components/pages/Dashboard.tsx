import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import {
  Heart,
  UserX,
  Loader2,
  Users,
  UserCircle,
  Cake,
  School,
  HeartHandshake,
  Search,
} from 'lucide-react'; // No specific Gender icons needed here

interface ProfileSuggestion {
  profile_id: number;
  user_id: string;
  profile_username: string;
  profile_bio: string | null;
  profile_birthdate: string;
  profile_academic_interests: string | null;
  profile_non_academic_interests: string | null;
  profile_looking_for: string | null;
  profile_avatar_url: string | null;
  profile_gender: string | null;
  user_priset_show_age: boolean;
  user_priset_show_bio: boolean;
  compatibility_score?: number;
}

interface DashboardProps {
  user: User;
  supabaseClient: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user, supabaseClient }) => {
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      fetchSuggestions();
    }
  }, [user, supabaseClient]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('User session not found.');
      }

      const { data, error } = await supabaseClient.functions.invoke('get-match-suggestions', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch match suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (targetUserId: string) => {
    try {
      setActionLoading(targetUserId);

      const { error } = await supabaseClient
        .from('matches')
        .insert([{
          match_user1_id: user.id,
          match_user2_id: targetUserId
        }]);

      if (error) throw error;

      toast({
        title: "Connected!",
        description: "You've successfully connected with this user",
      });

      setSuggestions(prev => prev.filter(suggestion => suggestion.user_id !== targetUserId));
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create connection",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (targetUserId: string) => {
    try {
      setActionLoading(targetUserId);

      const { error } = await supabaseClient
        .from('blocked_users')
        .insert([{
          blocker_id: user.id,
          blocked_id: targetUserId
        }]);

      if (error) throw error;

      toast({
        title: "User blocked",
        description: "This user will no longer appear in your suggestions",
      });

      setSuggestions(prev => prev.filter(suggestion => suggestion.user_id !== targetUserId));
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to block user",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Helper function to parse comma-separated interests
  const parseInterests = (interests: string | null) => {
    return interests ? interests.split(',').map(i => i.trim()).filter(i => i) : [];
  };

  // Helper function to get gender icon/symbol (using Unicode)
  const getGenderIcon = (gender: string | null): React.ReactNode => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return <span className="text-primary text-xl">♂</span>; // Unicode Male symbol
      case 'female':
        return <span className="text-primary text-xl">♀</span>; // Unicode Female symbol
      case 'non-binary':
      case 'prefer not to say':
      default:
        return <Users className="h-5 w-5 text-primary" />; // Generic icon for other options or default
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Finding your perfect matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Connections</h1>
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
            const academicInterests = parseInterests(suggestion.profile_academic_interests);
            const nonAcademicInterests = parseInterests(suggestion.profile_non_academic_interests);
            
            // Age is calculated but not used here due to privacy setting and previous request
            // const age = calculateAge(suggestion.profile_birthdate); 
            const isActionLoading = actionLoading === suggestion.user_id;

            return (
              <Card key={suggestion.profile_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="h-16 w-16 border-2 border-muted-foreground">
                      <AvatarImage src={suggestion.profile_avatar_url || undefined} alt={suggestion.profile_username} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {suggestion.profile_username.substring(0, 2).toUpperCase() || <UserCircle className="h-10 w-10" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center justify-between">
                        {suggestion.profile_username}
                        {suggestion.compatibility_score !== undefined && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {suggestion.compatibility_score} matches
                          </Badge>
                        )}
                      </CardTitle>
                      {/* Gender and conditionally shown Birthdate */}
                      <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                        <span className="flex items-center gap-1">
                          {getGenderIcon(suggestion.profile_gender)} {suggestion.profile_gender || 'N/A'}
                        </span>
                        {/* Only show birthdate if user_priset_show_age is true for the suggested profile */}
                        {suggestion.user_priset_show_age && suggestion.profile_birthdate && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <span>Birthdate: {suggestion.profile_birthdate}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-3">
                  {/*
                    The bio is added here. Its visibility is controlled by
                    the `user_priset_show_bio` privacy setting from the suggested user's profile.
                    If you want to always show the bio regardless of privacy,
                    you would remove `suggestion.user_priset_show_bio &&` from the condition.
                  */}
                  {suggestion.user_priset_show_bio && suggestion.profile_bio && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">About</h4>
                      <p className="text-sm line-clamp-3">{suggestion.profile_bio}</p>
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;