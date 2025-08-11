import { GameState, DrawChoice } from '@/types/game';
import { Card } from './Card';
import { PlayerArea } from './PlayerArea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { canFormUnit } from '@/utils/gameLogic';
import { Shuffle, Users, Clock, Zap } from 'lucide-react';

interface GameBoardProps {
  gameState: GameState;
  currentPlayerId?: string;
  onDrawCard: (fromDiscard?: boolean) => void;
  cardsDrawn: number;
  actionChosen: 'attack' | 'discard' | null;
  onChooseAction: (action: 'attack' | 'discard') => void;
  onPlayUnit: (cardIds: string[]) => void;
  onAttackUnit: (attackerCardId: string, targetUnitId: string) => void;
  onDiscardCard: (cardId: string) => void;
  onEndTurn: () => void;
  selectedCards: string[];
  onCardSelect: (cardId: string) => void;
  onUnitSelect: (unitId: string) => void;
  onReinforceUnit: (cardId: string, unitId: string) => void;
  className?: string;
}


export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentPlayerId,
  onDrawCard,
  cardsDrawn,
  actionChosen,
  onChooseAction,
  onPlayUnit,
  onAttackUnit,
  onDiscardCard,
  onEndTurn,
  selectedCards,
  onCardSelect,
  onUnitSelect,
  onReinforceUnit,
  className
}) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isCurrentPlayerTurn = currentPlayer.id === currentPlayerId;

  const canAttack = selectedCards.length === 1
    && gameState.phase === 'attack'
    && gameState.actionChosen === 'attack'
    && (gameState.attacksUsedThisTurn || 0) < 1;

  const canDiscard = selectedCards.length === 1
    && gameState.phase === 'discard'
    && gameState.actionChosen === 'discard';

  // Check if selected cards can form a unit
  const selectedCardObjects = selectedCards.map(id =>
    currentPlayer.hand.find(card => card.id === id)
  ).filter(Boolean);

  const canFormValidUnit = selectedCardObjects.length >= 3 && canFormUnit(selectedCardObjects as any[]);

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
            <Button
              onClick={() => onDrawCard(false)}
              disabled={cardsDrawn >= 2 || gameState.deck.length === 0}
            >
              Draw from Deck ({cardsDrawn}/2)
            </Button>
            <Button
              onClick={() => onDrawCard(true)}
              disabled={cardsDrawn >= 2 || gameState.discardPile.length === 0}
            >
              Draw from Discard ({cardsDrawn}/2)
            </Button>
          </div>
        );

      case 'play':
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => onPlayUnit(selectedCards)}
              disabled={!canFormValidUnit}
            >
              Play Unit ({selectedCards.length} cards)
            </Button>
            <Button
              onClick={() => onChooseAction('attack')}
              variant={gameState.actionChosen === 'attack' ? 'default' : 'outline'}
            >
              Choose Attack
            </Button>
            <Button
              onClick={() => onChooseAction('discard')}
              variant={gameState.actionChosen === 'discard' ? 'default' : 'outline'}
              disabled={currentPlayer.hand.length === 0}
            >
              Choose Discard
            </Button>
          </div>
        );

      case 'attack':
        return (
          <div className="flex gap-2">
            <div className="text-sm text-muted-foreground">
              {gameState.actionChosen === 'attack' ? (
                (gameState.attacksUsedThisTurn || 0) > 0
                  ? "Attack completed"
                  : selectedCards.length === 1
                    ? "Select an enemy unit to attack"
                    : "Select one card to attack with"
              ) : "Choose attack to proceed"}
            </div>
            {/*<Button variant="outline" onClick={onEndTurn}>*/}
            {/*  End Turn*/}
            {/*</Button>*/}
          </div>
        );

      case 'discard':
        return (
          <div className="flex gap-2">
            <div className="text-sm text-muted-foreground">
              {gameState.actionChosen === 'discard' ? "Select a card to discard" : "Must choose discard"}
            </div>
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
          <div className="relative w-20 h-32">
            {gameState.discardPile.slice(-5).map((card, index) => (
              <div
                key={`${card.id}-${index}`}
                className="absolute"
                style={{
                  top: `${index * 4}px`,
                  left: `${index * 2}px`,
                  zIndex: index + 1
                }}
              >
                <Card
                  card={card}
                  size="small"
                  className="transition-all duration-200 hover:scale-110"
                />
              </div>
            ))}
            {gameState.discardPile.length === 0 && (
              <div className="w-20 h-28 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                Empty
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phase Actions */}
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-gradient-card rounded-lg border">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-muted-foreground">Actions:</span>
            {isCurrentPlayerTurn ? (
              getPhaseActions()
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Waiting for {currentPlayer.name} to take action...
              </div>
            )}
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
            canAttack={canAttack && index !== gameState.currentPlayerIndex}
            currentPlayerId={currentPlayerId}
            selectedCards={selectedCards}
            onCardSelect={onCardSelect}
            onUnitSelect={(unitId) => {
              if (gameState.phase === 'attack' && selectedCards.length === 1 && index !== gameState.currentPlayerIndex && (gameState.attacksUsedThisTurn || 0) < 1 && gameState.actionChosen === 'attack') {
                onAttackUnit(selectedCards[0], unitId);
              } else {
                onUnitSelect(unitId);
              }
            }}
            onAttackUnit={onAttackUnit}
            onReinforceUnit={onReinforceUnit}
            gamePhase={gameState.phase}
          />
        ))}
      </div>
    </div>
  );
}