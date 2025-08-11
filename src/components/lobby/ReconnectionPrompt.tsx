import React from 'react';
import { Button } from '@/components/ui/button';
import { GameSession } from '@/utils/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, Clock } from 'lucide-react';

interface ReconnectionPromptProps {
  session: GameSession;
  onReconnect: () => void;
  onStartNew: () => void;
  isReconnecting?: boolean;
}

export const ReconnectionPrompt: React.FC<ReconnectionPromptProps> = ({
  session,
  onReconnect,
  onStartNew,
  isReconnecting = false
}) => {
  const timeSinceLastSession = Date.now() - session.timestamp;
  const minutesAgo = Math.floor(timeSinceLastSession / (1000 * 60));
  
  const formatTimeAgo = (minutes: number) => {
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-table flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <Wifi className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Game Session Found</CardTitle>
          <CardDescription>
            We found a previous game session that you can rejoin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Room ID:</span>
              <span className="font-mono font-medium">{session.roomId}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Player:</span>
              <span className="font-medium">{session.playerName}</span>
            </div>
            {session.isHost && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">Host</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last active:</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-medium">{formatTimeAgo(minutesAgo)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={onReconnect} 
              disabled={isReconnecting}
              className="w-full"
            >
              {isReconnecting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Rejoin Game
                </>
              )}
            </Button>
            
            <Button 
              onClick={onStartNew} 
              variant="outline" 
              disabled={isReconnecting}
              className="w-full"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Start New Game
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Reconnecting will attempt to restore your position in the previous game. 
            If the game is no longer available, you'll start fresh.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
