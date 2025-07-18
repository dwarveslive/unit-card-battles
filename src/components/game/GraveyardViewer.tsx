import React from 'react';
import { GameCard } from '@/types/game';
import { Card } from './Card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skull, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GraveyardViewerProps {
  graveyard: GameCard[];
  playerName: string;
  graveyardValue: number;
  className?: string;
}

export const GraveyardViewer: React.FC<GraveyardViewerProps> = ({
  graveyard,
  playerName,
  graveyardValue,
  className
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Skull className="w-4 h-4" />
          <Eye className="w-4 h-4" />
          Graveyard ({graveyard.length})
          <span className="text-destructive font-semibold">
            -{graveyardValue}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-destructive" />
            {playerName}'s Graveyard
            <span className="text-destructive font-bold">
              (-{graveyardValue} points)
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Cards in graveyard count against the player's final score.
          </div>
          
          <ScrollArea className="h-96">
            <div className="grid grid-cols-4 gap-2 p-1">
              {graveyard.map((card) => (
                <div key={card.id} className="relative">
                  <Card
                    card={card}
                    size="small"
                    className="opacity-75"
                  />
                </div>
              ))}
              {graveyard.length === 0 && (
                <div className="col-span-4 flex items-center justify-center h-32 text-muted-foreground">
                  No cards in graveyard
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};