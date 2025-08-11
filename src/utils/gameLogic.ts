import { GameCard, CardColor, GameState, Player, Unit } from '@/types/game';

export const createInitialGameState = (playerNames: string[]): GameState => {
  throw new Error("Game state initialization should be handled server-side");
};

export const canFormUnit = (cards: GameCard[]): boolean => {
  if (cards.length < 3) return false;
  
  const whiteCards = cards.filter(card => card.color === 'white');
  const blackCards = cards.filter(card => card.color === 'black');
  const nonWhiteCards = cards.filter(card => card.color !== 'white');
  
  // Black cards can't be combined with white cards
  if (whiteCards.length > 0 && blackCards.length > 0) {
    return false;
  }
  
  // Check if all cards are the same color
  if (cards.every(card => card.color === cards[0].color)) {
    return true;
  }
  
  // Check if there are white cards and all non-white cards are the same color
  if (whiteCards.length > 0 && nonWhiteCards.length > 0) {
    const firstNonWhiteColor = nonWhiteCards[0].color;
    return nonWhiteCards.every(card => card.color === firstNonWhiteColor);
  }
  
  return false;
};

export const createUnit = (cards: GameCard[], playerId: string): Unit => {
  const totalValue = cards.reduce((sum, card) => sum + card.value, 0);
  
  return {
    id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards,
    playerId,
    totalValue
  };
};

export const calculateTotalValue = (player: Player): number => {
  return player.units.reduce((sum, unit) => sum + unit.totalValue, 0);
};

export const checkWinCondition = (players: Player[]): { winner?: Player; finalTurnTriggered?: boolean } => {
  for (const player of players) {
    const totalValue = calculateTotalValue(player);
    if (totalValue >= 50) {
      return { winner: player, finalTurnTriggered: true };
    }
  }
  return {};
};

export const getAvailableCards = (player: Player): { hand: GameCard[]; units: GameCard[] } => {
  const hand = player.hand;
  const units = player.units.reduce((acc, unit) => acc.concat(unit.cards), [] as GameCard[]);
  
  return { hand, units };
};

export const canAddCardToUnit = (card: GameCard, unit: Unit): boolean => {
  const unitColors = [...new Set(unit.cards.map(c => c.color))];
  
  // Black cards can't be combined with white cards
  const hasWhite = unitColors.includes('white') || card.color === 'white';
  const hasBlack = unitColors.includes('black') || card.color === 'black';
  
  if (hasWhite && hasBlack) {
    return false;
  }
  
  // Check if card can be added based on existing unit colors
  if (unit.cards.every(c => c.color === unit.cards[0].color)) {
    // Unit is all same color, can add same color or white (if not black unit)
    return card.color === unit.cards[0].color || 
           (card.color === 'white' && unit.cards[0].color !== 'black');
  }
  
  // Unit has mixed colors (must include white), can add same non-white color or more white
  const nonWhiteColors = [...new Set(unit.cards.filter(c => c.color !== 'white').map(c => c.color))];
  if (nonWhiteColors.length === 1) {
    return card.color === nonWhiteColors[0] || card.color === 'white';
  }
  
  return false;
};

export const applyCardAbility = (card: GameCard, gameState: GameState): GameState => {
  // This is a placeholder for implementing card abilities
  // For now, just return the unchanged game state
  return gameState;
};

export const resolveBattle = (
  attackerCard: GameCard,
  defenderCard: GameCard,
  attackerFromHand: boolean,
  defenderFromHand: boolean
): { winner: 'attacker' | 'defender' } => {
  let attackerPower = attackerCard.power;
  let defenderPower = defenderCard.power;
  
  // Apply basic ability modifiers
  if (attackerCard.ability.includes('+1 when attacking')) {
    attackerPower += 1;
  }
  if (defenderCard.ability.includes('+1 when defending')) {
    defenderPower += 1;
  }
  
  // Apply color-specific bonuses
  if (attackerCard.ability.includes('Double power vs red') && defenderCard.color === 'red') {
    attackerPower *= 2;
  }
  if (attackerCard.ability.includes('Double power vs blue') && defenderCard.color === 'blue') {
    attackerPower *= 2;
  }
  
  if (attackerPower > defenderPower) {
    return { winner: 'attacker' };
  } else if (defenderPower > attackerPower) {
    return { winner: 'defender' };
  } else {
    // Tie goes to attacker
    return { winner: 'attacker' };
  }
};

export const calculateGraveyardValue = (graveyard: GameCard[]): number => {
  return graveyard.reduce((sum, card) => sum + card.value, 0);
};

export const calculatePlayerScore = (player: Player): number => {
  const unitScore = player.units.reduce((sum, unit) => sum + unit.totalValue, 0);
  const graveyardPenalty = calculateGraveyardValue(player.graveyard);
  return unitScore - graveyardPenalty;
};