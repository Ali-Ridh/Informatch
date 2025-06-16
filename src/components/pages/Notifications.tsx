// src/components/pages/Notifications.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Check, X, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { formatDistanceToNowStrict } from 'date-fns';

interface RequesterProfileData {
  profile_id: number;
  user_id: string;
  profile_username: string;
  profile_avatar_url: string | null;
}

interface NotificationRequest {
  match_id: number;
  match_user1_id: string; // The user who sent the request (UUID)
  match_user2_id: string; // The current user receiving the request (UUID)
  status: 'pending' | 'accepted' | 'rejected';
  requested_at: string;
  requester_profile: RequesterProfileData | null; // This will hold the flattened profile data
}

interface NotificationsProps {
  user: User;
  supabaseClient: any;
}

const Notifications: React.FC<NotificationsProps> = ({ user, supabaseClient }) => {
  const [notifications, setNotifications] = useState<NotificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    const channel = supabaseClient
      .channel('notifications_channel')
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `match_user2_id=eq.${user.id}`
      }, async payload => {
          if (payload.new.status === 'pending') {
              console.log('Realtime: New pending match inserted!', payload.new);
              await fetchNotifications();
              toast({
                  title: "New Connection Request!",
                  description: `New request from a user!`,
              });
          }
      })
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `match_user2_id=eq.${user.id}`
      }, async payload => {
          if (payload.old.status === 'pending' && payload.new.status !== 'pending') {
              console.log('Realtime: Match status updated!', payload.new);
              await fetchNotifications();
          }
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id, supabaseClient, toast]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      console.log('--- Fetching notifications for user ID:', user.id, '---');

      // FIX: Removed all SQL comments from the select string
      const { data, error } = await supabaseClient
        .from('matches')
        .select(`
          match_id,
          match_user1_id,
          match_user2_id,
          status,
          requested_at,
          requester_data:users!match_user1_id(
            user_id,
            profiles(
              profile_id,
              user_id,
              profile_username,
              profile_avatar_url
            )
          )
        `)
        .eq('match_user2_id', user.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      console.log('Supabase query raw data:', data);
      console.log('Supabase query error:', error);

      if (error) {
        console.error('Supabase fetchNotifications error (after query):', error);
        throw new Error(error.message || 'Failed to fetch notifications.');
      }

      const formattedNotifications: NotificationRequest[] = data.map((item: any) => {
        const profile = item.requester_data?.profiles;
        
        const actualProfile = Array.isArray(profile) ? profile[0] : profile; // Ensure single profile if array

        return {
          match_id: item.match_id,
          match_user1_id: item.match_user1_id,
          match_user2_id: item.match_user2_id,
          status: item.status,
          requested_at: item.requested_at,
          requester_profile: actualProfile ? {
            profile_id: actualProfile.profile_id,
            user_id: actualProfile.user_id,
            profile_username: actualProfile.profile_username,
            profile_avatar_url: actualProfile.profile_avatar_url,
          } : null,
        };
      }).filter(item => {
        const isValid = item.requester_profile !== null;
        if (!isValid) {
          console.warn('Notification skipped due to missing requester_profile:', item);
        }
        return isValid;
      });

      console.log('Formatted notifications for display:', formattedNotifications);

      setNotifications(formattedNotifications || []);
    } catch (error: any) {
      console.error('Caught error in fetchNotifications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch notifications: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (matchId: number, newStatus: 'accepted' | 'rejected') => {
    setActionLoading(matchId);
    try {
      const { error } = await supabaseClient
        .from('matches')
        .update({ status: newStatus })
        .eq('match_id', matchId)
        .eq('match_user2_id', user.id);

      if (error) {
        console.error('Supabase handleAction error:', error);
        throw new Error(error.message || `Failed to ${newStatus} request.`);
      }

      toast({
        title: newStatus === 'accepted' ? "Request Accepted!" : "Request Rejected!",
        description: newStatus === 'accepted' ? "You are now connected." : "The request has been declined.",
      });

      setNotifications(prev => prev.filter(notification => notification.match_id !== matchId));

    } catch (error: any) {
      console.error(`Caught error in handleAction (${newStatus}):`, error);
      toast({
        title: "Error",
        description: `Failed to ${newStatus} request: ` + error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-lg text-muted-foreground">
          See who wants to connect with you
        </p>
      </div>

      {notifications.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Bell className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground">
              When someone wants to match with you, you'll see their requests here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card key={notification.match_id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src={notification.requester_profile?.profile_avatar_url || undefined} alt={notification.requester_profile?.profile_username || 'User'} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {notification.requester_profile?.profile_username?.substring(0, 2).toUpperCase() || <UserCircle className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">
                    {notification.requester_profile?.profile_username || 'Unknown User'} wants to connect!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Requested {formatDistanceToNowStrict(new Date(notification.requested_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => handleAction(notification.match_id, 'accepted')}
                  disabled={actionLoading === notification.match_id}
                >
                  {actionLoading === notification.match_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleAction(notification.match_id, 'rejected')}
                  disabled={actionLoading === notification.match_id}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {actionLoading === notification.match_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
