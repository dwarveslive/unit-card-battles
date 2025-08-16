import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Medal, Star, Skull } from 'lucide-react';
import { GameCard, Party } from '@/types/game';
import { cn } from '@/lib/utils';

interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  partyScore: number;
  graveyardPenalty: number;
  mostValuableParty: Party | null;
}

interface VictoryModalProps {
  isOpen: boolean;
  winner: string;
  winnerScore: number;
  finalScores: PlayerScore[];
  onNewGame?: () => void;
  onReturnToLobby?: () => void;
}

const getCardColorClass = (color: string) => {
  const colorMap = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    black: 'bg-gray-800',
    white: 'bg-gray-200',
    gray: 'bg-gray-500',
  };
  return colorMap[color as keyof typeof colorMap] || 'bg-gray-500';
};

const getPlacementIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Trophy className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <Star className="w-4 h-4 text-gray-500" />;
  }
};

const getPodiumHeight = (position: number) => {
  switch (position) {
    case 1:
      return 'h-32'; // Winner - tallest
    case 2:
      return 'h-24'; // Second place
    case 3:
      return 'h-20'; // Third place
    default:
      return 'h-16'; // Others
  }
};

const MostValuablePartyDisplay: React.FC<{ party: Party | null }> = ({ party }) => {
  if (!party || party.cards.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        <Skull className="w-4 h-4 mx-auto mb-1" />
        <span>No parties</span>
      </div>
    );
  }

  // Group cards by color for display
  const cardsByColor = party.cards.reduce((acc, card) => {
    if (!acc[card.color]) acc[card.color] = [];
    acc[card.color].push(card);
    return acc;
  }, {} as Record<string, GameCard[]>);

  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground mb-1">Best Party ({party.totalValue} pts)</div>
      <div className="flex flex-wrap justify-center gap-1">
        {Object.entries(cardsByColor).map(([color, cards]) => (
          <div key={color} className="flex items-center gap-1">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                getCardColorClass(color)
              )}
            />
            <span className="text-xs">{cards.length}</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {party.cards[0]?.name}{party.cards.length > 1 ? ` +${party.cards.length - 1}` : ''}
      </div>
    </div>
  );
};

const PlayerPodium: React.FC<{ 
  player: PlayerScore; 
  position: number; 
  isWinner: boolean;
}> = ({ player, position, isWinner }) => {
  return (
    <div className={cn(
      'flex flex-col items-center transition-all duration-500 ease-in-out',
      position === 1 ? 'order-2' : position === 2 ? 'order-1' : position === 3 ? 'order-3' : 'order-4'
    )}>
      {/* Player name and icon */}
      <div className={cn(
        'flex flex-col items-center mb-2 p-2 rounded-lg min-w-24',
        isWinner ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-muted/50'
      )}>
        {getPlacementIcon(position)}
        <span className={cn(
          'text-sm font-semibold mt-1 text-center',
          isWinner ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'
        )}>
          {player.playerName}
        </span>
        {position <= 3 && (
          <Badge variant={position === 1 ? 'default' : 'secondary'} className="text-xs mt-1">
            #{position}
          </Badge>
        )}
      </div>

      {/* Podium */}
      <div className={cn(
        'w-20 rounded-t-lg border-2 border-b-0 flex flex-col justify-end transition-all duration-700 ease-in-out',
        getPodiumHeight(position),
        isWinner 
          ? 'bg-gradient-to-t from-yellow-400 to-yellow-300 border-yellow-500 shadow-lg shadow-yellow-500/25' 
          : position === 2 
          ? 'bg-gradient-to-t from-gray-300 to-gray-200 border-gray-400'
          : position === 3
          ? 'bg-gradient-to-t from-amber-500 to-amber-400 border-amber-600'
          : 'bg-gradient-to-t from-gray-200 to-gray-100 border-gray-300'
      )}>
        <div className="p-2 text-center">
          <div className={cn(
            'font-bold text-lg',
            isWinner ? 'text-yellow-800' : 'text-gray-700'
          )}>
            {player.score}
          </div>
          <div className={cn(
            'text-xs',
            isWinner ? 'text-yellow-700' : 'text-gray-600'
          )}>
            points
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="mt-3 text-center space-y-1">
        <div className="text-xs text-green-600">+{player.partyScore} parties</div>
        {player.graveyardPenalty > 0 && (
          <div className="text-xs text-red-600">-{player.graveyardPenalty} graveyard</div>
        )}
      </div>

      {/* Most valuable party */}
      <div className="mt-2 w-24">
        <MostValuablePartyDisplay party={player.mostValuableParty} />
      </div>
    </div>
  );
};

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  winner,
  winnerScore,
  finalScores,
  onNewGame,
  onReturnToLobby,
}) => {
  // Ensure scores are sorted by score descending
  const sortedScores = [...finalScores].sort((a, b) => b.score - a.score);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
            <Crown className="w-8 h-8 text-yellow-500" />
            Victory!
            <Crown className="w-8 h-8 text-yellow-500" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Winner announcement */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {winner} Wins!
            </h2>
            <p className="text-xl text-muted-foreground">
              Final Score: {winnerScore} points
            </p>
          </div>

          {/* Podium */}
          <div className="flex justify-center items-end gap-4 py-8">
            {sortedScores.slice(0, Math.min(6, sortedScores.length)).map((player, index) => (
              <PlayerPodium
                key={player.playerId}
                player={player}
                position={index + 1}
                isWinner={player.playerName === winner}
              />
            ))}
          </div>

          {/* Detailed scoreboard */}
          <div className="border rounded-lg">
            <div className="bg-muted p-3 rounded-t-lg">
              <h3 className="font-semibold text-center">Final Standings</h3>
            </div>
            <div className="p-4 space-y-2">
              {sortedScores.map((player, index) => (
                <div
                  key={player.playerId}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    player.playerName === winner
                      ? 'bg-yellow-500/10 border border-yellow-500/20'
                      : 'bg-muted/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getPlacementIcon(index + 1)}
                      <span className="font-medium">{player.playerName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right text-sm">
                      <div className="text-green-600">+{player.partyScore} parties</div>
                      {player.graveyardPenalty > 0 && (
                        <div className="text-red-600">-{player.graveyardPenalty} graveyard</div>
                      )}
                    </div>
                    <div className="font-bold text-lg min-w-16 text-right">
                      {player.score} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-4 pt-4">
            {onReturnToLobby && (
              <Button variant="outline" onClick={onReturnToLobby}>
                Return to Lobby
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
