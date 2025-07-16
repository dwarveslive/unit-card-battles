import { GameState, DrawChoice } from '@/types/game';
import { Card } from './Card';
import { PlayerArea } from './PlayerArea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Shuffle, Users, Clock, Zap } from 'lucide-react';

interface GameBoardProps {
  gameState: GameState;
  onDrawCards: (choice: DrawChoice) => void;
  onPlayUnit: (cardIds: string[]) => void;
  onAttackUnit: (attackerCardId: string, targetUnitId: string) => void;
  onDiscardCard: (cardId: string) => void;
  onEndTurn: () => void;
  selectedCards: string[];
  onCardSelect: (cardId: string) => void;
  onUnitSelect: (unitId: string) => void;
  className?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onDrawCards,
  onPlayUnit,
  onAttackUnit,
  onDiscardCard,
  onEndTurn,
  selectedCards,
  onCardSelect,
  onUnitSelect,
  className
}) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const canPlayUnit = selectedCards.length === 3;
  const canAttack = selectedCards.length === 1 && gameState.phase === 'attack';
  const canDiscard = selectedCards.length === 1 && gameState.phase === 'discard';
  
  // Check if selected cards can form a unit
  const selectedCardObjects = selectedCards.map(id => 
    currentPlayer.hand.find(card => card.id === id)
  ).filter(Boolean);
  
  const canFormUnit = selectedCardObjects.length === 3 && (
    // All same color
    selectedCardObjects.every(card => card!.color === selectedCardObjects[0]!.color) ||
    // Contains white and two of same color
    selectedCardObjects.some(card => card!.color === 'white') &&
    selectedCardObjects.filter(card => card!.color !== 'white').length === 2 &&
    selectedCardObjects.filter(card => card!.color !== 'white')
      .every(card => card!.color === selectedCardObjects.filter(c => c!.color !== 'white')[0]!.color)
  );

  const getPhaseTitle = () => {
    switch (gameState.phase) {
      case 'draw': return 'Draw Phase';
      case 'play': return 'Play Phase';
      case 'attack': return 'Attack Phase';
      case 'discard': return 'Discard Phase';
      default: return 'Game Phase';
    }
  };

  const getPhaseActions = () => {
    switch (gameState.phase) {
      case 'draw':
        return (
          <div className="flex gap-2">
            <Button onClick={() => onDrawCards({ deckCount: 2, discardCount: 0 })}>
              Draw 2 from Deck
            </Button>
            <Button onClick={() => onDrawCards({ deckCount: 0, discardCount: 2 })}>
              Draw 2 from Discard
            </Button>
            <Button onClick={() => onDrawCards({ deckCount: 1, discardCount: 1 })}>
              Draw 1 from Each
            </Button>
          </div>
        );
      
      case 'play':
        return (
          <div className="flex gap-2">
            <Button 
              onClick={() => onPlayUnit(selectedCards)}
              disabled={!canFormUnit}
            >
              Play Unit ({selectedCards.length}/3)
            </Button>
            <Button variant="outline" onClick={() => onEndTurn()}>
              Skip to Attack
            </Button>
          </div>
        );
      
      case 'attack':
        return (
          <div className="flex gap-2">
            <Button 
              onClick={() => {/* Handle attack */}}
              disabled={!canAttack}
            >
              Attack with Selected Card
            </Button>
            <Button variant="outline" onClick={() => onEndTurn()}>
              Skip to Discard
            </Button>
          </div>
        );
      
      case 'discard':
        return (
          <div className="flex gap-2">
            <Button 
              onClick={() => onDiscardCard(selectedCards[0])}
              disabled={!canDiscard}
            >
              Discard Selected Card
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={cn('min-h-screen bg-gradient-table p-4', className)}>
      {/* Game Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-card rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              {getPhaseTitle()}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Turn: {gameState.currentPlayerIndex + 1}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {gameState.finalTurnTrigger && (
            <div className="flex items-center gap-2 px-3 py-1 bg-destructive/20 rounded-lg border border-destructive/50">
              <Zap className="w-4 h-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">
                Final Turn! {gameState.finalTurnRemaining} turns left
              </span>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            Current Player: <span className="font-bold text-primary">{currentPlayer.name}</span>
          </div>
        </div>
      </div>

      {/* Central Table */}
      <div className="flex items-center justify-center gap-8 mb-6">
        {/* Deck */}
        <div className="text-center">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Deck ({gameState.deck.length})
          </h3>
          <div className="relative">
            <div className="w-20 h-28 bg-gradient-to-br from-primary to-primary/80 rounded-lg border-2 border-primary/50 shadow-card" />
            <Shuffle className="absolute inset-0 m-auto w-6 h-6 text-primary-foreground" />
          </div>
        </div>

        {/* Discard Pile */}
        <div className="text-center">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Discard Pile ({gameState.discardPile.length})
          </h3>
          <div className="flex flex-wrap gap-1 justify-center max-w-40">
            {gameState.discardPile.map((card, index) => (
              <Card
                key={`${card.id}-${index}`}
                card={card}
                size="small"
                className="transform hover:scale-110 hover:z-10"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Phase Actions */}
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-gradient-card rounded-lg border">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-muted-foreground">Actions:</span>
            {getPhaseActions()}
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {gameState.players.map((player, index) => (
          <PlayerArea
            key={player.id}
            player={player}
            isCurrentPlayer={index === gameState.currentPlayerIndex}
            onCardClick={onCardSelect}
            onUnitClick={onUnitSelect}
            selectedCards={selectedCards}
          />
        ))}
      </div>
    </div>
  );
};