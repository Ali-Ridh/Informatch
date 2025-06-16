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
import BlockUserDialog from '@/components/BlockUserDialog';

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
  profile_looking_for: string | null;
  matched_at: string;
  user_priset_show_age: boolean;
  user_priset_show_bio: boolean;
  main_image_url?: string | null;
}

interface FriendListProps {
  user: User;
  supabaseClient: any;
}

const FriendList: React.FC<FriendListProps> = ({ user, supabaseClient }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchFriends();
    fetchBlockedUsers();

    // Set up real-time subscription for accepted matches
    const channel = supabaseClient
      .channel('friends_channel')
      .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `or(match_user1_id=eq.${user.id},match_user2_id=eq.${user.id})`
      }, async payload => {
          if (payload.new?.status === 'accepted' || payload.eventType === 'DELETE' || (payload.old?.status === 'accepted' && payload.new?.status !== 'accepted')) {
              console.log('Realtime: Match event detected, re-fetching friends:', payload.eventType, payload.new);
              await fetchFriends();
          }
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id, supabaseClient, toast]);

  const fetchBlockedUsers = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) throw error;

      const blockedIds = new Set(data.map((block: any) => block.blocked_id));
      setBlockedUsers(blockedIds);
    } catch (error: any) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const fetchFriends = async () => {
    setLoading(true);
    try {
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
              profile_looking_for,
              profile_images(image_url, image_order)
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
              profile_looking_for,
              profile_images(image_url, image_order)
            )
          )
        `)
        .eq('status', 'accepted')
        .or(`match_user1_id.eq.${user.id},match_user2_id.eq.${user.id}`);

      if (error) {
        console.error('Supabase fetchFriends error:', error);
        throw new Error(error.message || 'Failed to fetch friend list.');
      }

      const friendsData: Friend[] = (data || []).map((match: any) => {
        const isUser1 = match.match_user1_id === user.id;
        const friendUserData = isUser1 ? match.user2_data : match.user1_data;
        const friendProfileData = friendUserData?.profiles;

        const actualFriendProfile = Array.isArray(friendProfileData) ? friendProfileData[0] : friendProfileData;

        if (!actualFriendProfile || !friendUserData) {
          console.warn('Friend entry skipped due to missing profile or user data (RLS issue likely):', match);
          return null;
        }

        // Get the main image (first image with order 1)
        const profileImages = actualFriendProfile.profile_images || [];
        const mainImage = profileImages.find((img: any) => img.image_order === 1);

        return {
          match_id: match.match_id,
          user_id: friendUserData.user_id,
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
          main_image_url: mainImage?.image_url || null,
        };
      }).filter(Boolean);

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

      setFriends(prev => prev.filter(friend => friend.match_id !== matchId));
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
        description: "This user has been blocked and removed from your friends list",
      });

      // Update local state
      setBlockedUsers(prev => new Set([...prev, targetUserId]));
      setFriends(prev => prev.filter(friend => friend.user_id !== targetUserId));
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

  const handleUnblock = async (targetUserId: string) => {
    try {
      setActionLoading(targetUserId);

      const { error } = await supabaseClient
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId);

      if (error) throw error;

      toast({
        title: "User unblocked",
        description: "This user can now see your profile again",
      });

      // Update local state
      setBlockedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unblock user",
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
            const isBlocked = blockedUsers.has(friend.user_id);

            // Use main_image_url first, then profile_avatar_url as fallback
            const avatarUrl = friend.main_image_url || friend.profile_avatar_url;

            return (
              <Card key={friend.match_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-muted-foreground">
                      <AvatarImage src={avatarUrl || undefined} alt={friend.profile_username} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {friend.profile_username?.substring(0, 2).toUpperCase() || <UserCircle className="h-10 w-10" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">
                          {friend.profile_username}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Connected
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isActionLoading} className="h-8 w-8">
                                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{friend.profile_username}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSendMessage(friend.profile_username)}>
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <BlockUserDialog
                                  username={friend.profile_username}
                                  isBlocked={isBlocked}
                                  onBlock={() => handleBlock(friend.user_id)}
                                  onUnblock={() => handleUnblock(friend.user_id)}
                                  loading={isActionLoading}
                                >
                                  <div className="w-full cursor-pointer">
                                    {isBlocked ? "Unblock User" : "Block User"}
                                  </div>
                                </BlockUserDialog>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleUnfriend(friend.match_id, friend.user_id)} 
                                className="text-red-600"
                              >
                                Unfriend
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
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