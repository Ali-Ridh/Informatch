import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { UserX, Shield } from "lucide-react";

interface BlockUserDialogProps {
  username: string;
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  loading: boolean;
  children?: React.ReactNode;
}

const BlockUserDialog: React.FC<BlockUserDialogProps> = ({
  username,
  isBlocked,
  onBlock,
  onUnblock,
  loading,
  children
}) => {
  if (isBlocked) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {children || (
            <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
              <Shield className="h-4 w-4 mr-1" />
              Unblock
            </Button>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow {username} to see your profile and send you connection requests again.
              You can block them again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onUnblock}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Unblocking..." : "Unblock User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
            <UserX className="h-4 w-4 mr-1" />
            Block
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {username}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will prevent {username} from seeing your profile, sending you messages, or appearing in your suggestions.
            They won't be notified that you've blocked them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onBlock}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Blocking..." : "Block User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BlockUserDialog;