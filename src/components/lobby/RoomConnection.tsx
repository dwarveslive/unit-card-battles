import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users, Plus, LogIn, Gamepad2, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomConnectionProps {
  onRoomCreated: (roomId: string, playerName: string) => void;
  onRoomJoined: (roomId: string, playerName: string) => void;
  isConnecting: boolean;
  className?: string;
}

export const RoomConnection: React.FC<RoomConnectionProps> = ({
  onRoomCreated,
  onRoomJoined,
  isConnecting,
  className
}) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const { toast } = useToast();

  const handleCreateRoom = useCallback(async () => {
    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your player name",
        variant: "destructive",
      });
      return;
    }

    try {
      await onRoomCreated('', playerName.trim());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    }
  }, [playerName, onRoomCreated, toast]);

  const handleJoinRoom = useCallback(async () => {
    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your player name",
        variant: "destructive",
      });
      return;
    }

    if (!roomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room ID",
        variant: "destructive",
      });
      return;
    }

    try {
      await onRoomJoined(roomId.trim(), playerName.trim());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join room. Please check the room ID and try again.",
        variant: "destructive",
      });
    }
  }, [playerName, roomId, onRoomJoined, toast]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Room ID copied to clipboard",
    });
  }, [toast]);

  return (
    <div className={cn('min-h-screen bg-gradient-table flex items-center justify-center p-4', className)}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gamepad2 className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Unit Card Battles</h1>
          </div>
          <p className="text-lg text-muted-foreground">Join the battle in multiplayer card combat</p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Wifi className={cn(
            'w-5 h-5',
            isConnecting ? 'text-yellow-500 animate-pulse' : 'text-green-500'
          )} />
          <span className="text-sm text-muted-foreground">
            {isConnecting ? 'Connecting to server...' : 'Connected to server'}
          </span>
        </div>

        {/* Main Card */}
        <Card className="bg-gradient-card border-border shadow-glow">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Join the Battle</CardTitle>
            <CardDescription className="text-center">
              Create a new room or join an existing one to start playing
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Room
                </TabsTrigger>
                <TabsTrigger value="join" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Join Room
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="create-player-name">Your Name</Label>
                  <Input
                    id="create-player-name"
                    placeholder="Enter your player name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="bg-background/50"
                  />
                </div>
                
                <Button
                  onClick={handleCreateRoom}
                  disabled={isConnecting || !playerName.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Create New Room
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  Create a room and share the room ID with friends
                </div>
              </TabsContent>

              <TabsContent value="join" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="join-player-name">Your Name</Label>
                  <Input
                    id="join-player-name"
                    placeholder="Enter your player name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="bg-background/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="room-id">Room ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="room-id"
                      placeholder="Enter room ID"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="bg-background/50"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.readText().then(text => {
                          setRoomId(text);
                          toast({
                            title: "Pasted!",
                            description: "Room ID pasted from clipboard",
                          });
                        }).catch(() => {
                          toast({
                            title: "Error",
                            description: "Could not read from clipboard",
                            variant: "destructive",
                          });
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button
                  onClick={handleJoinRoom}
                  disabled={isConnecting || !playerName.trim() || !roomId.trim()}
                  className="w-full"
                  size="lg"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Join Room
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  Get the room ID from your friend to join their game
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Game Info */}
        <Card className="mt-6 bg-gradient-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">2-6</div>
                <div className="text-sm text-muted-foreground">Players</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">15-30</div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">50+</div>
                <div className="text-sm text-muted-foreground">Points to Win</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
