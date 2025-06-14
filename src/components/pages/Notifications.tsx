
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Bell, Check, X, Loader2, Users } from 'lucide-react';

interface Notification {
  id: string;
  from_user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  from_profile?: {
    profile_username: string;
    profile_avatar_url: string | null;
  };
  match_id?: number;
}

interface NotificationsProps {
  user: User;
  supabaseClient: any;
}

const Notifications: React.FC<NotificationsProps> = ({ user, supabaseClient }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, [user, supabaseClient]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Get notifications with profile information
      const { data: notificationsData, error } = await supabaseClient
        .from('notifications')
        .select(`
          *,
          from_profile:profiles!notifications_from_user_id_fkey(
            profile_username,
            profile_avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For match requests, we need to get the match_id
      const notificationsWithMatchData = await Promise.all(
        (notificationsData || []).map(async (notification) => {
          if (notification.type === 'match_request') {
            const { data: matchData } = await supabaseClient
              .from('matches')
              .select('match_id')
              .eq('match_user1_id', notification.from_user_id)
              .eq('match_user2_id', user.id)
              .eq('status', 'pending')
              .single();

            return {
              ...notification,
              match_id: matchData?.match_id
            };
          }
          return notification;
        })
      );

      setNotifications(notificationsWithMatchData);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMatch = async (notificationId: string, matchId: number, fromUserId: string) => {
    try {
      setActionLoading(notificationId);

      // Update match status to accepted
      const { error: matchError } = await supabaseClient
        .from('matches')
        .update({
          status: 'accepted',
          is_mutual: true,
          matched_at: new Date().toISOString()
        })
        .eq('match_id', matchId);

      if (matchError) throw matchError;

      // Mark notification as read
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (notifError) throw notifError;

      // Create a notification for the requester
      const { data: currentProfile } = await supabaseClient
        .from('profiles')
        .select('profile_username')
        .eq('user_id', user.id)
        .single();

      const { error: newNotifError } = await supabaseClient
        .from('notifications')
        .insert([{
          user_id: fromUserId,
          from_user_id: user.id,
          type: 'match_accepted',
          message: `${currentProfile?.profile_username || 'Someone'} accepted your connection request!`
        }]);

      if (newNotifError) console.error('Error creating notification:', newNotifError);

      toast({
        title: "Match Accepted!",
        description: "You are now connected",
      });

      // Refresh notifications
      fetchNotifications();
    } catch (error: any) {
      console.error('Error accepting match:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept match",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectMatch = async (notificationId: string, matchId: number) => {
    try {
      setActionLoading(notificationId);

      // Update match status to rejected
      const { error: matchError } = await supabaseClient
        .from('matches')
        .update({ status: 'rejected' })
        .eq('match_id', matchId);

      if (matchError) throw matchError;

      // Mark notification as read
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (notifError) throw notifError;

      toast({
        title: "Match Rejected",
        description: "The connection request has been declined",
      });

      // Refresh notifications
      fetchNotifications();
    } catch (error: any) {
      console.error('Error rejecting match:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject match",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
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
          {notifications.map((notification) => {
            const isActionLoading = actionLoading === notification.id;
            
            return (
              <Card 
                key={notification.id} 
                className={`${!notification.read ? 'border-blue-200 bg-blue-50/50' : ''} hover:shadow-md transition-shadow`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={notification.from_profile?.profile_avatar_url || undefined} 
                        alt={notification.from_profile?.profile_username || 'User'} 
                      />
                      <AvatarFallback>
                        {notification.from_profile?.profile_username?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">
                          {notification.from_profile?.profile_username || 'Unknown User'}
                        </h3>
                        {!notification.read && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            New
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={notification.type === 'match_request' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}
                        >
                          {notification.type === 'match_request' ? 'Connection Request' : 'Match Accepted'}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{notification.message}</p>
                      
                      <p className="text-sm text-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString()} at{' '}
                        {new Date(notification.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {notification.type === 'match_request' && notification.match_id && !notification.read && (
                        <>
                          <Button
                            onClick={() => handleAcceptMatch(notification.id, notification.match_id!, notification.from_user_id)}
                            disabled={isActionLoading}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleRejectMatch(notification.id, notification.match_id!)}
                            disabled={isActionLoading}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      
                      {!notification.read && notification.type !== 'match_request' && (
                        <Button
                          onClick={() => markAsRead(notification.id)}
                          variant="outline"
                          size="sm"
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
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

export default Notifications;
