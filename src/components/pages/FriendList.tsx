// src/components/pages/FriendList.tsx
import React, { useState, useEffect } from 'react'; // Corrected import syntax
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, UserCircle, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

// ShadCN Dropdown Menu for potential future actions (e.g., Unfriend, View Profile)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface Friend {
  user_id: string;
  profile_id: number;
  profile_username: string;
  profile_avatar_url: string | null;
}

interface FriendListProps {
  user: User;
  supabaseClient: any;
}

const FriendList: React.FC<FriendListProps> = ({ user, supabaseClient }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchFriends();

    // FIX 1: Correct real-time subscription syntax
    const channel = supabaseClient
        .channel('friends_channel')
        .on('postgres_changes', {
            event: '*', // Listen for INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'matches',
            filter: `or(match_user1_id=eq.${user.id},match_user2_id=eq.${user.id})`
        }, async payload => { // Use async here
            if (payload.new?.status === 'accepted' || payload.eventType === 'DELETE' || (payload.old?.status === 'accepted' && payload.new?.status !== 'accepted')) {
                await fetchFriends(); // Re-fetch the entire list
            }
        })
        .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id, supabaseClient, toast]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      // FIX 2: Simplified SELECT syntax for foreign key join
      // We explicitly select the 'profiles' table data and filter by the match_user IDs
      const { data, error } = await supabaseClient
        .from('matches')
        .select(`
          match_user1_id,
          match_user2_id,
          profiles_user1:profiles(profile_id, profile_username, profile_avatar_url),
          profiles_user2:profiles(profile_id, profile_username, profile_avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`match_user1_id.eq.${user.id},match_user2_id.eq.${user.id}`);

      if (error) {
        console.error('Supabase fetchFriends error:', error);
        throw new Error(error.message || 'Failed to fetch friend list.');
      }

      const friendList: Friend[] = [];
      data.forEach((match: any) => {
        if (match.match_user1_id === user.id) {
          if (match.profiles_user2) {
            friendList.push({
              user_id: match.match_user2_id,
              profile_id: match.profiles_user2.profile_id,
              profile_username: match.profiles_user2.profile_username,
              profile_avatar_url: match.profiles_user2.profile_avatar_url,
            });
          }
        } else if (match.match_user2_id === user.id) {
          if (match.profiles_user1) {
            friendList.push({
              user_id: match.match_user1_id,
              profile_id: match.profiles_user1.profile_id,
              profile_username: match.profiles_user1.profile_username,
              profile_avatar_url: match.profiles_user1.profile_avatar_url,
            });
          }
        }
      });

      setFriends(friendList);
    } catch (error: any) {
      console.error('Caught error in fetchFriends:', error);
      toast({
        title: "Error",
        description: "Failed to fetch friend list: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnfriend = async (friendUserId: string) => {
    setActionLoading(friendUserId);
    try {
      const { error } = await supabaseClient
        .from('matches')
        .delete()
        .or(`and(match_user1_id.eq.${user.id},match_user2_id.eq.${friendUserId}),and(match_user1_id.eq.${friendUserId},match_user2_id.eq.${user.id})`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Supabase handleUnfriend error:', error);
        throw new Error(error.message || 'Failed to unfriend.');
      }

      toast({
        title: "Unfriended",
        description: "You are no longer connected with this user.",
      });

      setFriends(prev => prev.filter(friend => friend.user_id !== friendUserId));
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
    // Implement navigation to a chat page with this friend
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Loading friends...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Connections</h1>
        <p className="text-lg text-muted-foreground">
          Your accepted connections
        </p>
      </div>

      {friends.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No connections yet</h3>
            <p className="text-muted-foreground">
              Accept a connection request from Notifications, or send one from Dashboard!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {friends.map((friend) => (
            <Card key={friend.user_id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary">
                  <AvatarImage src={friend.profile_avatar_url || undefined} alt={friend.profile_username} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {friend.profile_username.substring(0, 2).toUpperCase() || <UserCircle className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{friend.profile_username}</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSendMessage(friend.profile_username)}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={actionLoading === friend.user_id}>
                      {actionLoading === friend.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{friend.profile_username}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleUnfriend(friend.user_id)} className="text-red-600">
                      Unfriend
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendList;
