// src/components/pages/FriendList.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Users, Loader2, MessageCircle, UserCircle, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict } from 'date-fns';


interface Friend {
  match_id: number;
  user_id: string; // The friend's user_id (UUID)
  profile_username: string;
  profile_bio: string | null;
  profile_birthdate: string; // From database
  profile_academic_interests: string | null;
  profile_non_academic_interests: string | null;
  profile_avatar_url: string | null;
  profile_gender: string | null;
  profile_looking_for: string | null;
  matched_at: string; // From database
  user_priset_show_age: boolean; // From friend's user table privacy settings
  user_priset_show_bio: boolean; // From friend's user table privacy settings
}

interface FriendListProps {
  user: User;
  supabaseClient: any;
}

const FriendList: React.FC<FriendListProps> = ({ user, supabaseClient }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Stores friend's user_id being acted upon
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchFriends();

    // Set up real-time subscription for accepted matches
    const channel = supabaseClient
      .channel('friends_channel') // Unique channel name for FriendList
      .on('postgres_changes', {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'matches',
          filter: `or(match_user1_id=eq.${user.id},match_user2_id=eq.${user.id})` // Only relevant matches for this user
      }, async payload => {
          if (payload.new?.status === 'accepted' || payload.eventType === 'DELETE' || (payload.old?.status === 'accepted' && payload.new?.status !== 'accepted')) {
              console.log('Realtime: Match event detected, re-fetching friends:', payload.eventType, payload.new);
              await fetchFriends(); // Re-fetch the entire list to ensure accuracy
          }
      })
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id, supabaseClient, toast]); // Dependencies for useEffect

  const fetchFriends = async () => {
    setLoading(true);
    try {
      // FIX: Removed all SQL comments from the select string
      // Ensured correct join path: matches -> users -> profiles
      const { data, error } = await supabaseClient
        .from('matches')
        .select(`
          match_id,
          match_user1_id,
          match_user2_id,
          status,
          matched_at,
          requested_at,
          user1_data:users!match_user1_id(
            user_id,
            user_priset_show_age,
            user_priset_show_bio,
            profiles(
              profile_id,
              profile_username,
              profile_bio,
              profile_birthdate,
              profile_academic_interests,
              profile_non_academic_interests,
              profile_avatar_url,
              profile_gender,
              profile_looking_for
            )
          ),
          user2_data:users!match_user2_id(
            user_id,
            user_priset_show_age,
            user_priset_show_bio,
            profiles(
              profile_id,
              profile_username,
              profile_bio,
              profile_birthdate,
              profile_academic_interests,
              profile_non_academic_interests,
              profile_avatar_url,
              profile_gender,
              profile_looking_for
            )
          )
        `)
        .eq('status', 'accepted') // Only accepted matches
        .or(`match_user1_id.eq.${user.id},match_user2_id.eq.${user.id}`); // Current user must be involved

      if (error) {
        console.error('Supabase fetchFriends error:', error);
        throw new Error(error.message || 'Failed to fetch friend list.');
      }

      const friendsData: Friend[] = (data || []).map((match: any) => {
        // Determine which side of the match is the current user and which is the friend
        const isUser1 = match.match_user1_id === user.id;
        const friendUserData = isUser1 ? match.user2_data : match.user1_data;
        const friendProfileData = friendUserData?.profiles; // Profile is nested under user data

        // Ensure profileData is not an array (due to unique constraint, it should be single object or null)
        const actualFriendProfile = Array.isArray(friendProfileData) ? friendProfileData[0] : friendProfileData;

        // Skip if essential data is missing (e.g., if RLS blocked part of the join)
        if (!actualFriendProfile || !friendUserData) {
          console.warn('Friend entry skipped due to missing profile or user data (RLS issue likely):', match);
          return null; // This null will be filtered out by .filter(Boolean)
        }

        return {
          match_id: match.match_id,
          user_id: friendUserData.user_id, // Friend's user_id
          profile_username: actualFriendProfile.profile_username,
          profile_bio: actualFriendProfile.profile_bio,
          profile_birthdate: actualFriendProfile.profile_birthdate,
          profile_academic_interests: actualFriendProfile.profile_academic_interests,
          profile_non_academic_interests: actualFriendProfile.profile_non_academic_interests,
          profile_avatar_url: actualFriendProfile.profile_avatar_url,
          profile_gender: actualFriendProfile.profile_gender,
          profile_looking_for: actualFriendProfile.profile_looking_for,
          matched_at: match.matched_at,
          user_priset_show_age: friendUserData.user_priset_show_age,
          user_priset_show_bio: friendUserData.user_priset_show_bio,
        };
      }).filter(Boolean); // Filter out any null entries (from skipped matches)

      setFriends(friendsData);
    } catch (error: any) {
      console.error('Caught error in fetchFriends:', error);
      toast({
        title: "Error",
        description: "Failed to fetch friends: " + error.message,
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

  const handleUnfriend = async (matchId: number, friendUserId: string) => {
    setActionLoading(friendUserId);
    try {
      const { error } = await supabaseClient
        .from('matches')
        .delete()
        .eq('match_id', matchId)
        .or(`match_user1_id.eq.${user.id},match_user2_id.eq.${user.id}`);

      if (error) {
        console.error('Supabase handleUnfriend error:', error);
        throw new Error(error.message || 'Failed to unfriend.');
      }

      toast({
        title: "Unfriended",
        description: "You are no longer connected with this user.",
      });

      setFriends(prev => prev.filter(friend => friend.match_id !== matchId)); // Optimistically remove
    } catch (error: any) {
      console.error('Caught error in handleUnfriend:', error);
      toast({
        title: "Error",
        description: "Failed to unfriend: " + error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendMessage = (friendUsername: string) => {
    toast({
      title: "Feature Coming Soon!",
      description: `Sending message to ${friendUsername}`,
    });
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
            const isActionLoading = actionLoading === friend.user_id;

            return (
              <Card key={friend.match_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-muted-foreground">
                      <AvatarImage src={friend.profile_avatar_url || undefined} alt={friend.profile_username} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {friend.profile_username?.substring(0, 2).toUpperCase() || <UserCircle className="h-10 w-10" />}
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

                  {friend.profile_looking_for && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Looking For</h4>
                      <p className="text-sm">{friend.profile_looking_for}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSendMessage(friend.profile_username)}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isActionLoading}>
                          {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{friend.profile_username}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUnfriend(friend.match_id, friend.user_id)} className="text-red-600">
                          Unfriend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

export default FriendList;
