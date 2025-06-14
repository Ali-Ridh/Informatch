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
} from 'lucide-react';

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
  user_priset_is_private: boolean;
  compatibility_score?: number;
  profile_images?: Array<{
    image_url: string;
    image_order: number;
  }>;
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
      console.log('Fetching suggestions for user:', user.id);

      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get user session');
      }

      if (!sessionData.session) {
        console.error('No session found');
        throw new Error('User session not found. Please log in again.');
      }

      if (!sessionData.session.access_token) {
        console.error('No access token in session');
        throw new Error('Invalid session. Please log in again.');
      }

      console.log('Making request with access token');

      const { data, error } = await supabaseClient.functions.invoke('get-match-suggestions', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Successfully fetched suggestions:', data);

      // Fetch profile images for each suggestion
      const suggestionsWithImages = await Promise.all(
        (data.suggestions || []).map(async (suggestion: ProfileSuggestion) => {
          try {
            const { data: images } = await supabaseClient
              .from('profile_images')
              .select('image_url, image_order')
              .eq('profile_id', suggestion.profile_id)
              .order('image_order');

            return {
              ...suggestion,
              profile_images: images || []
            };
          } catch (imageError) {
            console.error('Error fetching images for profile:', suggestion.profile_id, imageError);
            return {
              ...suggestion,
              profile_images: []
            };
          }
        })
      );

      setSuggestions(suggestionsWithImages);
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch match suggestions",
        variant: "destructive",
      });
      
      // If it's an auth error, suggest re-login
      if (error.message?.includes('session') || error.message?.includes('auth')) {
        toast({
          title: "Authentication Error",
          description: "Please sign out and sign in again to refresh your session",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (targetUserId: string, isPrivate: boolean) => {
    try {
      setActionLoading(targetUserId);

      // Check if other user is private
      if (isPrivate) {
        // For private users, create an instant match (both users are matched immediately)
        const { error: matchError } = await supabaseClient
          .from('matches')
          .insert([{
            match_user1_id: user.id,
            match_user2_id: targetUserId,
            status: 'accepted',
            is_mutual: true,
            matched_at: new Date().toISOString()
          }]);

        if (matchError) throw matchError;

        // Create notification for the other user about the instant match
        const { data: targetProfile } = await supabaseClient
          .from('profiles')
          .select('profile_username')
          .eq('user_id', targetUserId)
          .single();

        const { data: currentProfile } = await supabaseClient
          .from('profiles')
          .select('profile_username')
          .eq('user_id', user.id)
          .single();

        const { error: notifError } = await supabaseClient
          .from('notifications')
          .insert([{
            user_id: targetUserId,
            from_user_id: user.id,
            type: 'match_accepted',
            message: `${currentProfile?.profile_username || 'Someone'} has matched with you!`
          }]);

        if (notifError) console.error('Error creating notification:', notifError);

        toast({
          title: "Matched!",
          description: `You've been instantly matched with ${targetProfile?.profile_username || 'this user'}`,
        });
      } else {
        // For non-private users, create a pending match request
        const { error: matchError } = await supabaseClient
          .from('matches')
          .insert([{
            match_user1_id: user.id,
            match_user2_id: targetUserId,
            status: 'pending',
            is_mutual: false,
            requested_at: new Date().toISOString()
          }]);

        if (matchError) throw matchError;

        // Create notification for the other user about the match request
        const { data: currentProfile } = await supabaseClient
          .from('profiles')
          .select('profile_username')
          .eq('user_id', user.id)
          .single();

        const { error: notifError } = await supabaseClient
          .from('notifications')
          .insert([{
            user_id: targetUserId,
            from_user_id: user.id,
            type: 'match_request',
            message: `${currentProfile?.profile_username || 'Someone'} wants to connect with you!`
          }]);

        if (notifError) console.error('Error creating notification:', notifError);

        toast({
          title: "Request Sent!",
          description: "Your connection request has been sent",
        });
      }

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

  const parseInterests = (interests: string | null) => {
    return interests ? interests.split(',').map(i => i.trim()).filter(i => i) : [];
  };

  const getGenderIcon = (gender: string | null): React.ReactNode => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return <span className="text-primary text-xl">♂</span>;
      case 'female':
        return <span className="text-primary text-xl">♀</span>;
      case 'non-binary':
      case 'prefer not to say':
      default:
        return <Users className="h-5 w-5 text-primary" />;
    }
  };

  const getMainImage = (suggestion: ProfileSuggestion) => {
    // First try to get the first profile image
    const firstImage = suggestion.profile_images?.find(img => img.image_order === 1);
    if (firstImage?.image_url) {
      return firstImage.image_url;
    }
    
    // Fallback to avatar URL
    if (suggestion.profile_avatar_url) {
      return suggestion.profile_avatar_url;
    }
    
    return null;
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
            const isActionLoading = actionLoading === suggestion.user_id;
            const mainImageUrl = getMainImage(suggestion);

            return (
              <Card key={suggestion.profile_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-muted-foreground">
                      <AvatarImage src={mainImageUrl || undefined} alt={suggestion.profile_username} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {suggestion.profile_username.substring(0, 2).toUpperCase() || <UserCircle className="h-10 w-10" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center justify-between">
                        {suggestion.profile_username}
                        <div className="flex gap-1">
                          {suggestion.user_priset_is_private && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              Private
                            </Badge>
                          )}
                          {suggestion.compatibility_score !== undefined && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {suggestion.compatibility_score} matches
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                        <span className="flex items-center gap-1">
                          {getGenderIcon(suggestion.profile_gender)} {suggestion.profile_gender || 'N/A'}
                        </span>
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
                      onClick={() => handleConnect(suggestion.user_id, suggestion.user_priset_is_private)}
                      disabled={isActionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-1" />
                          {suggestion.user_priset_is_private ? 'Match' : 'Request'}
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
