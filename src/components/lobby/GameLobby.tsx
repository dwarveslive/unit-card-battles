import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users, Crown, Play, UserCheck, Clock, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameLobbyProps {
  roomId: string;
  players: Array<{ id: string; name: string; isHost?: boolean }>;
  currentPlayerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  canStartGame: boolean;
  className?: string;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  roomId,
  players,
  currentPlayerId,
  onStartGame,
  onLeaveRoom,
  canStartGame,
  className
}) => {
  const { toast } = useToast();
  const isHost = players.find(p => p.id === currentPlayerId)?.isHost || false;

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Copied!",
      description: "Room ID copied to clipboard. Share it with friends!",
    });
  }, [roomId, toast]);

  const shareRoom = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: 'Unit Card Battles',
        text: `Join my game room!`,
        url: `Room ID: ${roomId}`
      });
    } else {
      copyRoomId();
    }
  }, [roomId, copyRoomId]);

  return (
    <div className={cn('min-h-screen bg-gradient-table flex items-center justify-center p-4', className)}>
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Game Lobby</h1>
          <p className="text-lg text-muted-foreground">Waiting for players to join...</p>
        </div>

        {/* Room Info Card */}
        <Card className="mb-6 bg-gradient-card border-border shadow-glow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Room Information
                </CardTitle>
                <CardDescription>Share this room ID with friends to invite them</CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {players.length}/6 Players
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">Room ID</div>
                <div className="text-2xl font-mono font-bold text-foreground break-all">
                  {roomId}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={copyRoomId}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={shareRoom}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {players.map((player, index) => (
            <Card key={player.id} className={cn(
              'bg-gradient-card border-border transition-all duration-200',
              player.id === currentPlayerId ? 'ring-2 ring-primary shadow-glow' : ''
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold',
                    player.id === currentPlayerId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-foreground">
                        {player.name}
                      </div>
                      {player.isHost && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      {player.id === currentPlayerId && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <UserCheck className="w-3 h-3" />
                      Ready
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, index) => (
            <Card key={`empty-${index}`} className="bg-gradient-card/30 border-dashed border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-muted-foreground">
                      Waiting for player...
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Share room ID to invite
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Game Status */}
        <Card className="mb-6 bg-gradient-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div className="text-center">
                <div className="font-semibold text-foreground">
                  {canStartGame ? 'Ready to start!' : `Need ${Math.max(0, 2 - players.length)} more player${Math.max(0, 2 - players.length) !== 1 ? 's' : ''}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {canStartGame ? 'All players are ready to begin the battle' : 'Minimum 2 players required to start'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={onLeaveRoom}
            className="min-w-32"
          >
            Leave Room
          </Button>
          
          {isHost && (
            <Button
              onClick={onStartGame}
              disabled={!canStartGame}
              size="lg"
              className="min-w-48"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          )}
          
          {!isHost && (
            <div className="text-sm text-muted-foreground text-center">
              Waiting for host to start the game...
            </div>
          )}
        </div>

        {/* Game Rules Quick Info */}
        <Card className="mt-8 bg-gradient-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-center text-lg">Quick Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-foreground mb-1">Objective</div>
                <div className="text-muted-foreground">Reach 50+ unit value to trigger final turn</div>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">Units</div>
                <div className="text-muted-foreground">Combine 3+ cards of same color or with white</div>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">Battle</div>
                <div className="text-muted-foreground">Attack enemy units with your cards</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
