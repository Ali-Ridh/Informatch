
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Users, Loader2, MessageCircle, UserCircle } from 'lucide-react';

interface Friend {
  match_id: number;
  user_id: string;
  profile_username: string;
  profile_bio: string | null;
  profile_birthdate: string;
  profile_academic_interests: string | null;
  profile_non_academic_interests: string | null;
  profile_avatar_url: string | null;
  profile_gender: string | null;
  matched_at: string;
  user_priset_show_age: boolean;
  user_priset_show_bio: boolean;
}

interface FriendListProps {
  user: User;
  supabaseClient: any;
}

const FriendList: React.FC<FriendListProps> = ({ user, supabaseClient }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFriends();
  }, [user, supabaseClient]);

  const fetchFriends = async () => {
    try {
      setLoading(true);

      // Get all accepted matches for the current user
      const { data: matchesData, error } = await supabaseClient
        .from('matches')
        .select(`
          match_id,
          match_user1_id,
          match_user2_id,
          matched_at,
          user1_profile:profiles!matches_match_user1_id_fkey(
            user_id,
            profile_username,
            profile_bio,
            profile_birthdate,
            profile_academic_interests,
            profile_non_academic_interests,
            profile_avatar_url,
            profile_gender
          ),
          user2_profile:profiles!matches_match_user2_id_fkey(
            user_id,
            profile_username,
            profile_bio,
            profile_birthdate,
            profile_academic_interests,
            profile_non_academic_interests,
            profile_avatar_url,
            profile_gender
          ),
          user1_settings:users!matches_match_user1_id_fkey(
            user_priset_show_age,
            user_priset_show_bio
          ),
          user2_settings:users!matches_match_user2_id_fkey(
            user_priset_show_age,
            user_priset_show_bio
          )
        `)
        .eq('status', 'accepted')
        .or(`match_user1_id.eq.${user.id},match_user2_id.eq.${user.id}`);

      if (error) throw error;

      // Process the matches to get friend data
      const friendsData: Friend[] = (matchesData || []).map((match) => {
        const isUser1 = match.match_user1_id === user.id;
        const friendProfile = isUser1 ? match.user2_profile : match.user1_profile;
        const friendSettings = isUser1 ? match.user2_settings : match.user1_settings;

        return {
          match_id: match.match_id,
          user_id: friendProfile.user_id,
          profile_username: friendProfile.profile_username,
          profile_bio: friendProfile.profile_bio,
          profile_birthdate: friendProfile.profile_birthdate,
          profile_academic_interests: friendProfile.profile_academic_interests,
          profile_non_academic_interests: friendProfile.profile_non_academic_interests,
          profile_avatar_url: friendProfile.profile_avatar_url,
          profile_gender: friendProfile.profile_gender,
          matched_at: match.matched_at,
          user_priset_show_age: friendSettings.user_priset_show_age,
          user_priset_show_bio: friendSettings.user_priset_show_bio
        };
      });

      setFriends(friendsData);
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch friends",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Loading your connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Friends</h1>
        <p className="text-lg text-muted-foreground">
          Your connections and matches ({friends.length})
        </p>
      </div>

      {friends.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No friends yet</h3>
            <p className="text-muted-foreground">
              Start connecting with people to build your network!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {friends.map((friend) => {
            const academicInterests = parseInterests(friend.profile_academic_interests);
            const nonAcademicInterests = parseInterests(friend.profile_non_academic_interests);

            return (
              <Card key={friend.match_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-muted-foreground">
                      <AvatarImage src={friend.profile_avatar_url || undefined} alt={friend.profile_username} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {friend.profile_username.substring(0, 2).toUpperCase() || <UserCircle className="h-10 w-10" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center justify-between">
                        {friend.profile_username}
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Connected
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                        <span className="flex items-center gap-1">
                          {getGenderIcon(friend.profile_gender)} {friend.profile_gender || 'N/A'}
                        </span>
                        {friend.user_priset_show_age && friend.profile_birthdate && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <span>Birthdate: {friend.profile_birthdate}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Connected on {new Date(friend.matched_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-3">
                  {friend.user_priset_show_bio && friend.profile_bio && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">About</h4>
                      <p className="text-sm line-clamp-3">{friend.profile_bio}</p>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FriendList;
