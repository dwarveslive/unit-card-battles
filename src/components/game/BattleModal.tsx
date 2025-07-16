import { BattleState } from '@/types/game';
import { Card } from './Card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Swords, Shield, Zap } from 'lucide-react';

interface BattleModalProps {
  battleState: BattleState;
  onDefend: (cardId: string, fromHand: boolean) => void;
  onResolveBattle: () => void;
  onCancelBattle: () => void;
  defenderCards: Array<{ id: string; card: any; fromHand: boolean }>;
  className?: string;
}

export const BattleModal: React.FC<BattleModalProps> = ({
  battleState,
  onDefend,
  onResolveBattle,
  onCancelBattle,
  defenderCards,
  className
}) => {
  const hasDefender = battleState.defender.card !== undefined;
  const canResolve = hasDefender;

  const getBattleResult = () => {
    if (!battleState.defender.card) return null;
    
    const attackerPower = battleState.attacker.card.power;
    const defenderPower = battleState.defender.card.power;
    
    if (attackerPower > defenderPower) {
      return { winner: 'attacker', message: 'Attacker wins!' };
    } else if (defenderPower > attackerPower) {
      return { winner: 'defender', message: 'Defender wins!' };
    } else {
      return { winner: 'attacker', message: 'Tie - Attacker wins!' };
    }
  };

  const battleResult = getBattleResult();

  return (
    <Dialog open={battleState.isActive} onOpenChange={onCancelBattle}>
      <DialogContent className={cn('max-w-4xl bg-gradient-card border-destructive', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Swords className="w-5 h-5" />
            Battle in Progress
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attacker */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <Zap className="w-4 h-4" />
              <h3 className="font-semibold">Attacker</h3>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Card
                card={battleState.attacker.card}
                size="large"
                className="shadow-battle animate-card-battle"
              />
              <div className="text-sm text-muted-foreground">
                {battleState.attacker.fromHand ? 'From Hand (Face Down)' : 'From Unit (Face Up)'}
              </div>
              <div className="text-lg font-bold text-destructive">
                Power: {battleState.attacker.card.power}
              </div>
            </div>
          </div>

          {/* Defender */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-secondary">
              <Shield className="w-4 h-4" />
              <h3 className="font-semibold">Defender</h3>
            </div>
            
            {battleState.defender.card ? (
              <div className="flex flex-col items-center gap-2">
                <Card
                  card={battleState.defender.card}
                  size="large"
                  faceDown={battleState.defender.fromHand}
                  className="shadow-battle animate-card-battle"
                />
                <div className="text-sm text-muted-foreground">
                  {battleState.defender.fromHand ? 'From Hand (Face Down)' : 'From Unit (Face Up)'}
                </div>
                <div className="text-lg font-bold text-secondary">
                  Power: {battleState.defender.card.power}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-36 border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground">Choose Defense</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Available Defense Cards:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {defenderCards.map(({ id, card, fromHand }) => (
                      <Card
                        key={id}
                        card={card}
                        size="small"
                        onClick={() => onDefend(id, fromHand)}
                        className="hover:scale-110 cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Target Unit */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Target Unit:</h4>
          <div className="flex gap-2 p-2 bg-muted/20 rounded-lg">
            {battleState.targetUnit.cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                size="small"
              />
            ))}
            <div className="flex items-center justify-center min-w-8 text-sm font-bold text-accent">
              Value: {battleState.targetUnit.totalValue}
            </div>
          </div>
        </div>

        {/* Battle Result */}
        {battleResult && (
          <div className={cn(
            'p-4 rounded-lg border-2 text-center',
            battleResult.winner === 'attacker' 
              ? 'bg-destructive/10 border-destructive text-destructive' 
              : 'bg-secondary/10 border-secondary text-secondary'
          )}>
            <div className="text-lg font-bold">{battleResult.message}</div>
            <div className="text-sm mt-2">
              {battleResult.winner === 'attacker' 
                ? 'Attacker may kill or kidnap a card from the target unit'
                : 'Defender successfully protected the unit'
              }
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancelBattle}>
            Cancel Battle
          </Button>
          <Button 
            onClick={onResolveBattle}
            disabled={!canResolve}
            className="bg-destructive hover:bg-destructive/90"
          >
            {canResolve ? 'Resolve Battle' : 'Waiting for Defense'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};