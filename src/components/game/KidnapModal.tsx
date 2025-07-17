import React from 'react';
import { GameCard } from '@/types/game';
import { Card } from './Card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, Sparkles } from 'lucide-react';

interface KidnapModalProps {
  isOpen: boolean;
  availableCards: GameCard[];
  onKidnapChoice: (cardId: string) => void;
  onSkip: () => void;
}

export const KidnapModal: React.FC<KidnapModalProps> = ({
  isOpen,
  availableCards,
  onKidnapChoice,
  onSkip
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Choose Card to Kidnap
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>You won the battle! Choose which card to kidnap from the target unit:</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {availableCards.map((card) => (
              <div key={card.id} className="cursor-pointer">
                <Card
                  card={card}
                  size="small"
                  onClick={() => onKidnapChoice(card.id)}
                  className="hover:scale-105 transition-transform animate-pulse-glow"
                />
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              Skip Kidnap
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};