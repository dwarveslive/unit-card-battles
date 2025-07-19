import { Player, Unit } from '@/types/game';
import { Card } from './Card';
import { GraveyardViewer } from './GraveyardViewer';
import { cn } from '@/lib/utils';
import { Crown, Users, Plus, Trophy } from 'lucide-react';
import { calculateGraveyardValue, calculatePlayerScore } from '@/utils/gameLogic';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  canAttack: boolean;
  selectedCardId?: string;
  onCardSelect?: (cardId: string) => void;
  onUnitSelect?: (unitId: string) => void;
  onAttackUnit?: (attackerCardId: string, targetUnitId: string) => void;
  onReinforceUnit?: (cardId: string, unitId: string) => void;
  className?: string;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  isCurrentPlayer,
  canAttack,
  selectedCardId,
  onCardSelect,
  onUnitSelect,
  onAttackUnit,
  onReinforceUnit,
  className
}) => {
  const totalValue = player.units.reduce((sum, unit) => sum + unit.totalValue, 0);
  const graveyardValue = calculateGraveyardValue(player.graveyard);
  const playerScore = calculatePlayerScore(player);

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
          {player.units.map((unit) => (
            <div
              key={unit.id}
              className={cn(
                'p-3 rounded-lg border bg-muted/20 cursor-pointer transition-all duration-200',
                'hover:bg-muted/40 hover:border-accent/50',
                canAttack && selectedCardId && 'hover:scale-105 hover:shadow-battle'
              )}
              onClick={() => {
                if (canAttack && selectedCardId) {
                  onAttackUnit?.(selectedCardId, unit.id);
                } else if (onReinforceUnit && selectedCardId) {
                  onReinforceUnit(selectedCardId, unit.id);
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
                  {canAttack && selectedCardId && (
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                  {onReinforceUnit && selectedCardId && (
                    <Plus className="w-4 h-4 text-accent" />
                  )}
                </div>
              </div>
              
              <div className="flex gap-1 flex-wrap">
                {unit.cards.map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    size="small"
                    onClick={() => onCardSelect?.(card.id)}
                    className="transition-transform hover:scale-110"
                  />
                ))}
              </div>
            </div>
          ))}
          
          {player.units.length === 0 && (
            <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-lg border-dashed border-2">
              No units deployed
            </div>
          )}
        </div>
      </div>

      {/* Hand (only show for current player) */}
      {isCurrentPlayer && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
            Hand ({player.hand.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {player.hand.map((card) => (
              <Card
                key={card.id}
                card={card}
                size="medium"
                selected={selectedCardId === card.id}
                onClick={() => onCardSelect?.(card.id)}
                className="hover:scale-105 transition-transform"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};