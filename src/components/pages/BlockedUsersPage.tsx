import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Shield, Loader2, UserCircle, Users } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import BlockUserDialog from '@/components/BlockUserDialog';

interface BlockedUser {
  blocked_id: string;
  blocked_at: string;
  profile_username: string;
  profile_avatar_url: string | null;
}

interface BlockedUsersPageProps {
  user: User;
  supabaseClient: any;
}

const BlockedUsersPage: React.FC<BlockedUsersPageProps> = ({ user, supabaseClient }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      fetchBlockedUsers();
    }
  }, [user?.id, supabaseClient]);

const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('blocked_users')
        .select(`
          blocked_id,
          blocked_at,
          blocked_user:users!blocked_id(
            user_id,
            profiles(
              profile_username,
              profile_avatar_url
            )
          )
        `)
        .eq('blocker_id', user.id)
        .order('blocked_at', { ascending: false });

      if (error) throw error;

      const formattedBlockedUsers: BlockedUser[] = (data || []).map((block: any) => {
        const profile = block.blocked_user?.profiles;
        const actualProfile = Array.isArray(profile) ? profile[0] : profile;
        
        if (!actualProfile) {
          return null;
        }

        return {
          blocked_id: block.blocked_id,
          blocked_at: block.blocked_at,
          profile_username: actualProfile.profile_username,
          profile_avatar_url: actualProfile.profile_avatar_url,
        };
      }).filter(Boolean) as BlockedUser[];

      setBlockedUsers(formattedBlockedUsers);
    } catch (error: any) {
      console.error('Error fetching blocked users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch blocked users: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUnblock = async (blockedUserId: string) => {
    try {
      setActionLoading(blockedUserId);

      const { error } = await supabaseClient
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;

      toast({
        title: "User unblocked",
        description: "This user can now see your profile again",
      });

      setBlockedUsers(prev => prev.filter(blockedUser => blockedUser.blocked_id !== blockedUserId));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Loading blocked users...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Blocked Users</h1>
        <p className="text-lg text-muted-foreground">
          Manage users you have blocked ({blockedUsers.length})
        </p>
      </div>

      {blockedUsers.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No blocked users</h3>
            <p className="text-muted-foreground">
              You haven't blocked anyone yet. Blocked users will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blockedUsers.map((blockedUser) => {
            const isActionLoading = actionLoading === blockedUser.blocked_id;
            
            const avatarUrl = blockedUser.profile_avatar_url;

            return (
              <Card key={blockedUser.blocked_id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-muted-foreground">
                      <AvatarImage src={avatarUrl || undefined} alt={blockedUser.profile_username} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {blockedUser.profile_username?.substring(0, 2).toUpperCase() || <UserCircle className="h-8 w-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{blockedUser.profile_username}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Blocked {formatDistanceToNowStrict(new Date(blockedUser.blocked_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <BlockUserDialog
                    username={blockedUser.profile_username}
                    isBlocked={true}
                    onBlock={() => {}} // Not used for blocked users
                    onUnblock={() => handleUnblock(blockedUser.blocked_id)}
                    loading={isActionLoading}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full text-green-600 border-green-200 hover:bg-green-50"
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Shield className="h-4 w-4 mr-2" />
                      )}
                      Unblock User
                    </Button>
                  </BlockUserDialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlockedUsersPage;