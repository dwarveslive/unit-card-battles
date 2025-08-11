import { Player, Unit } from '@/types/game';
import { Card } from './Card';
import { GraveyardViewer } from './GraveyardViewer';
import { cn } from '@/lib/utils';
import { Crown, Users, Plus, Trophy } from 'lucide-react';
import { calculateGraveyardValue, calculatePlayerScore, canAddCardToUnit } from '@/utils/gameLogic';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  canAttack: boolean;
  currentPlayerId?: string; // Add this to determine who's viewing
  selectedCards?: string[];
  onCardSelect?: (cardId: string) => void;
  onUnitSelect?: (unitId: string) => void;
  onAttackUnit?: (attackerCardId: string, targetUnitId: string) => void;
  onReinforceUnit?: (cardId: string, unitId: string) => void;
  gamePhase?: 'draw' | 'play' | 'attack' | 'discard' | 'battle'; // Add game phase
  className?: string;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  isCurrentPlayer,
  canAttack,
  currentPlayerId,
  selectedCards = [],
  onCardSelect,
  onUnitSelect,
  onAttackUnit,
  onReinforceUnit,
  gamePhase = 'play',
  className
}) => {
  const totalValue = player.units.reduce((sum, unit) => sum + unit.totalValue, 0);
  const graveyardValue = calculateGraveyardValue(player.graveyard);
  const playerScore = calculatePlayerScore(player);
  
  // This player is viewing their own area (can see their cards)
  const isViewingOwnArea = currentPlayerId && player.id === currentPlayerId;
  
  // Only allow interactions when it's the current player's turn AND viewing own area
  const canInteract = isCurrentPlayer && isViewingOwnArea;
  
  // Determine if reinforcement is possible
  const canReinforce = canInteract && gamePhase === 'play' && selectedCards.length === 1 && onReinforceUnit;
  
  // Check which units can be reinforced with the selected card
  const selectedCard = canReinforce && selectedCards.length === 1 
    ? player.hand.find(card => card.id === selectedCards[0]) 
    : null;
  
  const getUnitReinforcementStatus = (unit: Unit) => {
    if (!canReinforce || !selectedCard) return 'none';
    return canAddCardToUnit(selectedCard, unit) ? 'valid' : 'invalid';
  };
  
  // Debug logging
  console.log(`🔍 PlayerArea Debug - Player: ${player.name}, PlayerID: ${player.id}, CurrentPlayerID: ${currentPlayerId}, IsViewingOwn: ${isViewingOwnArea}, HandSize: ${player.hand.length}, Phase: ${gamePhase}, CanReinforce: ${canReinforce}`);

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all duration-300',
      isCurrentPlayer 
        ? 'bg-gradient-primary/10 border-primary shadow-glow' 
        : 'bg-gradient-card border-border',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isCurrentPlayer && <Crown className="w-5 h-5 text-primary animate-glow" />}
          <h3 className={cn(
            'font-semibold',
            isCurrentPlayer ? 'text-primary' : 'text-foreground'
          )}>
            {player.name}
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{player.hand.length} cards</span>
          </div>
        </div>
        
        <div className="text-right space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent" />
            <div className="text-sm text-muted-foreground">Score</div>
            <div className="text-xl font-bold text-accent">{playerScore}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            Units: +{totalValue} | Graveyard: -{graveyardValue}
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <GraveyardViewer
          graveyard={player.graveyard}
          playerName={player.name}
          graveyardValue={graveyardValue}
          showVerticalStack={true}
        />
      </div>

      {/* Units */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Units ({player.units.length})
        </h4>
        
        <div className="grid gap-2">
          {player.units.map((unit) => {
            const reinforcementStatus = getUnitReinforcementStatus(unit);
            
            return (
            <div
              key={unit.id}
              className={cn(
                'p-3 rounded-lg border bg-muted/20 cursor-pointer transition-all duration-200',
                'hover:bg-muted/40 hover:border-accent/50',
                canAttack && selectedCards.length > 0 && 'hover:scale-105 hover:shadow-battle',
                reinforcementStatus === 'valid' && 'border-green-500/50 bg-green-500/10 hover:border-green-500 hover:bg-green-500/20',
                reinforcementStatus === 'invalid' && 'border-red-500/30 bg-red-500/5 opacity-70'
              )}
              onClick={() => {
                if (canAttack && selectedCards.length > 0) {
                  onAttackUnit?.(selectedCards[0], unit.id);
                } else if (onReinforceUnit && selectedCards.length > 0) {
                  onReinforceUnit(selectedCards[0], unit.id);
                } else {
                  onUnitSelect?.(unit.id);
                }
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-semibold text-muted-foreground">
                  Unit {unit.id.slice(-4)}
                </div>
                <div className="flex items-center gap-1">
                  <div className="text-lg font-bold text-accent">
                    {unit.totalValue}
                  </div>
                  {canAttack && selectedCards.length > 0 && (
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                  {reinforcementStatus === 'valid' && (
                    <Plus className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
              
              <div className="flex gap-1 flex-wrap">
                {unit.cards.map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    size="small"
                    selected={selectedCards.includes(card.id)}
                    onClick={canInteract ? () => onCardSelect?.(card.id) : undefined}
                    className={cn(
                      "transition-transform",
                      canInteract ? "hover:scale-110 cursor-pointer" : "cursor-not-allowed opacity-60"
                    )}
                  />
                ))}
              </div>
            </div>
            );
          })}
          
          {player.units.length === 0 && (
            <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-lg border-dashed border-2">
              No units deployed
            </div>
          )}
        </div>
      </div>

      {/* Hand section */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-muted-foreground mb-2">
          Hand ({player.hand.length})
        </h4>
        {isViewingOwnArea ? (
          // Show actual cards for viewing player's own area
          <div className="flex flex-wrap gap-2">
            {player.hand.map((card) => (
              <Card
                key={card.id}
                card={card}
                size="medium"
                selected={selectedCards.includes(card.id)}
                onClick={canInteract ? () => onCardSelect?.(card.id) : undefined}
                className={cn(
                  "transition-transform",
                  canInteract ? "hover:scale-105 cursor-pointer" : "cursor-not-allowed opacity-60"
                )}
              />
            ))}
          </div>
        ) : (
          // Show card backs for other players
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: player.hand.length }, (_, index) => (
              <div
                key={index}
                className="w-16 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-lg border-2 border-primary/50 shadow-card flex items-center justify-center"
              >
                <div className="text-xs text-primary-foreground font-bold transform rotate-45">CARD</div>
              </div>
            ))}
            {player.hand.length === 0 && (
              <div className="text-sm text-muted-foreground italic">No cards in hand</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};