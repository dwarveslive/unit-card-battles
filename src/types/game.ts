export type CardColor = 'green' | 'blue' | 'red' | 'black' | 'white' | 'gray';

export interface GameCard {
  id: string;
  color: CardColor;
  power: number; // 1-5
  value: number; // 1-5
  ability: string;
  name: string;
}

export interface Unit {
  id: string;
  cards: GameCard[];
  playerId: string;
  totalValue: number;
}

export interface Player {
  id: string;
  name: string;
  hand: GameCard[];
  units: Unit[];
  graveyard: GameCard[];
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: GameCard[];
  discardPile: GameCard[];
  phase: 'draw' | 'play' | 'attack' | 'discard';
  actionChosen?: 'attack' | 'discard' | null;
  cardsDrawnThisTurn?: number; // track cards drawn in current turn
  attacksUsedThisTurn?: number;
  gameEnded: boolean;
  winner?: string;
  finalTurnTrigger?: string; // player who triggered final turn
  finalTurnRemaining: number;
}

export interface BattleState {
  attacker: {
    playerId: string;
    card: GameCard;
    fromHand: boolean;
  };
  defender: {
    playerId: string;
    card?: GameCard;
    fromHand?: boolean;
  };
  targetUnit: Unit;
  isActive: boolean;
}

export interface DrawChoice {
  deckCount: number;
  discardCount: number;
}