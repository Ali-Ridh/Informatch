// src/components/pages/Notifications.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Check, X, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { formatDistanceToNowStrict } from 'date-fns';

interface MatchRequestNotification {
  id: string;
  user_id: string;
  from_user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  match_request_id: string;
  requester_profile: {
    profile_username: string;
    profile_avatar_url: string | null;
  } | null;
}

interface NotificationsProps {
  user: User;
  supabaseClient: any;
}

const Notifications: React.FC<NotificationsProps> = ({ user, supabaseClient }) => {
  const [notifications, setNotifications] = useState<MatchRequestNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabaseClient
      .channel('notifications_channel')
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
      }, async payload => {
          if (payload.new.type === 'match_request') {
              console.log('Realtime: New match request notification!', payload.new);
              await fetchNotifications();
              toast({
                  title: "New Connection Request!",
                  description: `Someone wants to connect with you!`,
              });
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
      const { data, error } = await supabaseClient
        .from('notifications')
        .select(`
          id,
          user_id,
          from_user_id,
          type,
          message,
          read,
          created_at,
          match_request_id,
          requester_data:users!from_user_id(
            user_id,
            profiles(
              profile_username,
              profile_avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'match_request')
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message || 'Failed to fetch notifications.');

      const formattedNotifications: MatchRequestNotification[] = data.map((item: any) => {
        const profile = item.requester_data?.profiles;
        const actualProfile = Array.isArray(profile) ? profile[0] : profile;

        return {
          id: item.id,
          user_id: item.user_id,
          from_user_id: item.from_user_id,
          type: item.type,
          message: item.message,
          read: item.read,
          created_at: item.created_at,
          match_request_id: item.match_request_id,
          requester_profile: actualProfile ? {
            profile_username: actualProfile.profile_username,
            profile_avatar_url: actualProfile.profile_avatar_url,
          } : null,
        };
      }).filter(item => item.requester_profile !== null);

      setNotifications(formattedNotifications || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch notifications: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptRequest = async (notificationId: string, fromUserId: string, requesterUsername: string) => {
    setActionLoading(notificationId);
    try {
      // Create match record
      const { error: matchError } = await supabaseClient
        .from('matches')
        .insert([{
          match_user1_id: fromUserId, // The user who sent the request
          match_user2_id: user.id,    // The user accepting the request
        }]);

      if (matchError) throw matchError;

      // Delete the notification
      const { error: deleteError } = await supabaseClient
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) throw deleteError;

      toast({
        title: "Request Accepted!",
        description: `You are now connected with ${requesterUsername}.`,
      });

      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

    } catch (error: any) {
      console.error('Error accepting match request:', error);
      toast({
        title: "Error",
        description: `Failed to accept request: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (notificationId: string, requesterUsername: string) => {
    setActionLoading(notificationId);
    try {
      // Simply delete the notification (no match created)
      const { error } = await supabaseClient
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: `Connection request from ${requesterUsername} has been declined.`,
      });

      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

    } catch (error: any) {
      console.error('Error rejecting match request:', error);
      toast({
        title: "Error",
        description: `Failed to reject request: ${error.message}`,
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
          See who wants to connect with you ({notifications.length} pending)
        </p>
      </div>

      {notifications.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Bell className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground">
              When someone wants to connect with you, you'll see their requests here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const isActionLoading = actionLoading === notification.id;
            const avatarUrl = notification.requester_profile?.profile_avatar_url;

            return (
              <Card key={notification.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary">
                    <AvatarImage src={avatarUrl || undefined} alt={notification.requester_profile?.profile_username || 'User'} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {notification.requester_profile?.profile_username?.substring(0, 2).toUpperCase() || <UserCircle className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">
                      {notification.requester_profile?.profile_username || 'Unknown User'} {notification.message}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => handleAcceptRequest(
                      notification.id, 
                      notification.from_user_id, 
                      notification.requester_profile?.profile_username || 'User'
                    )}
                    disabled={isActionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleRejectRequest(
                      notification.id, 
                      notification.requester_profile?.profile_username || 'User'
                    )}
                    disabled={isActionLoading}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;