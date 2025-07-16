import { Player, Unit } from '@/types/game';
import { Card } from './Card';
import { cn } from '@/lib/utils';
import { Users, Skull, Sparkles } from 'lucide-react';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  onCardClick?: (cardId: string) => void;
  onUnitClick?: (unitId: string) => void;
  selectedCards?: string[];
  className?: string;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  isCurrentPlayer,
  onCardClick,
  onUnitClick,
  selectedCards = [],
  className
}) => {
  const totalValue = player.units.reduce((sum, unit) => sum + unit.totalValue, 0);
  const isCloseToWin = totalValue >= 40;
  const hasWon = totalValue >= 50;

  return (
    <div className={cn(
      'relative p-4 rounded-lg border-2 bg-gradient-card',
      isCurrentPlayer ? 'border-primary shadow-glow' : 'border-border',
      hasWon && 'border-accent shadow-battle',
      className
    )}>
      {/* Player header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-foreground" />
          <h3 className={cn(
            'text-lg font-bold',
            isCurrentPlayer ? 'text-primary' : 'text-foreground'
          )}>
            {player.name}
          </h3>
          {isCurrentPlayer && (
            <Sparkles className="w-4 h-4 text-primary animate-pulse-glow" />
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className={cn(
            'px-2 py-1 rounded-lg font-semibold',
            hasWon ? 'bg-accent text-accent-foreground' :
            isCloseToWin ? 'bg-destructive text-destructive-foreground' :
            'bg-muted text-muted-foreground'
          )}>
            Value: {totalValue}/50
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Hand: {player.hand.length}</span>
            <Skull className="w-4 h-4" />
            <span>Graveyard: {player.graveyard.length}</span>
          </div>
        </div>
      </div>

      {/* Units */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-2">
          Units ({player.units.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {player.units.map((unit) => (
            <div
              key={unit.id}
              className={cn(
                'flex gap-1 p-2 rounded-lg border bg-muted/50 cursor-pointer',
                'hover:bg-muted transition-colors',
                unit.totalValue >= 15 && 'border-accent/50 bg-accent/10'
              )}
              onClick={() => onUnitClick?.(unit.id)}
            >
              {unit.cards.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  size="small"
                  selected={selectedCards.includes(card.id)}
                  onClick={() => onCardClick?.(card.id)}
                />
              ))}
              <div className="flex items-center justify-center min-w-8 text-xs font-bold text-accent">
                {unit.totalValue}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hand (only show for current player) */}
      {isCurrentPlayer && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
            Hand ({player.hand.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {player.hand.map((card) => (
              <Card
                key={card.id}
                card={card}
                size="medium"
                selected={selectedCards.includes(card.id)}
                onClick={() => onCardClick?.(card.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};