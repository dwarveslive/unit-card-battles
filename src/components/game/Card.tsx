import { GameCard, CardColor } from '@/types/game';
import { cn } from '@/lib/utils';
import { Zap, Shield, Sword, Star, Crown } from 'lucide-react';

interface CardProps {
  card: GameCard;
  size?: 'small' | 'medium' | 'large';
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const getCardColorClasses = (color: CardColor) => {
  switch (color) {
    case 'green':
      return 'bg-gradient-to-br from-card-green to-card-green/80 border-card-green/50';
    case 'blue':
      return 'bg-gradient-to-br from-card-blue to-card-blue/80 border-card-blue/50';
    case 'red':
      return 'bg-gradient-to-br from-card-red to-card-red/80 border-card-red/50';
    case 'black':
      return 'bg-gradient-to-br from-card-black to-card-black/80 border-card-black/50';
    case 'white':
      return 'bg-gradient-to-br from-card-white to-card-white/80 border-card-white/50 text-card-black';
    default:
      return 'bg-gradient-card border-border';
  }
};

const getSizeClasses = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return 'w-16 h-24 text-xs';
    case 'medium':
      return 'w-20 h-28 text-sm';
    case 'large':
      return 'w-24 h-36 text-base';
    default:
      return 'w-20 h-28 text-sm';
  }
};

const getAbilityIcon = (ability: string) => {
  if (ability.includes('attack')) return <Sword className="w-3 h-3" />;
  if (ability.includes('defend')) return <Shield className="w-3 h-3" />;
  if (ability.includes('power')) return <Zap className="w-3 h-3" />;
  if (ability.includes('value')) return <Star className="w-3 h-3" />;
  return <Crown className="w-3 h-3" />;
};

export const Card: React.FC<CardProps> = ({
  card,
  size = 'medium',
  faceDown = false,
  selected = false,
  disabled = false,
  onClick,
  className
}) => {
  const isWhite = card.color === 'white';
  
  return (
    <div
      className={cn(
        'relative rounded-lg border-2 cursor-pointer transition-all duration-300',
        'hover:scale-105 hover:shadow-card',
        getSizeClasses(size),
        selected && 'ring-2 ring-primary scale-105 shadow-glow',
        disabled && 'opacity-50 cursor-not-allowed',
        faceDown 
          ? 'bg-gradient-to-br from-primary to-primary/80 border-primary/50' 
          : getCardColorClasses(card.color),
        className
      )}
      onClick={!disabled ? onClick : undefined}
    >
      {faceDown ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-primary-glow rounded-full opacity-50" />
        </div>
      ) : (
        <>
          {/* Power indicator */}
          <div className={cn(
            'absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold',
            isWhite ? 'bg-card-black text-card-white' : 'bg-card-white text-card-black'
          )}>
            {card.power}
          </div>
          
          {/* Value indicator */}
          <div className={cn(
            'absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold',
            isWhite ? 'bg-card-black text-card-white' : 'bg-card-white text-card-black'
          )}>
            {card.value}
          </div>
          
          {/* Card name */}
          <div className="absolute top-6 left-1 right-1 text-center">
            <div className={cn(
              'text-xs font-semibold truncate',
              isWhite ? 'text-card-black' : 'text-card-white'
            )}>
              {card.name}
            </div>
          </div>
          
          {/* Ability */}
          <div className="absolute bottom-2 left-1 right-1">
            <div className={cn(
              'flex items-center justify-center gap-1 text-xs',
              isWhite ? 'text-card-black' : 'text-card-white'
            )}>
              {getAbilityIcon(card.ability)}
              <span className="truncate">{card.ability}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};