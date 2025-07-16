import { GameCard, CardColor, GameState, Player, Unit } from '@/types/game';

// Card abilities
const abilities = [
  '+1 when attacking',
  '+1 when defending',
  '+1 power this turn',
  '+1 value when played',
  'Draw 1 card',
  'Discard 1 card',
  'Revive from graveyard',
  'Double power vs red',
  'Double power vs blue',
  'Immune to black',
  'Steal 1 card',
  'Heal 1 unit',
  'Destroy 1 unit',
  'Copy enemy ability',
  'Gain extra turn'
];

const cardNames = [
  'Mystic Guardian', 'Shadow Warrior', 'Crystal Mage', 'Fire Drake', 'Ice Elemental',
  'Storm Knight', 'Void Walker', 'Light Bearer', 'Dark Assassin', 'Forest Druid',
  'Ocean Sage', 'Mountain Giant', 'Sky Rider', 'Earth Shaman', 'Star Caller',
  'Moon Dancer', 'Sun Priest', 'Wind Runner', 'Stone Golem', 'Flame Spirit',
  'Frost Witch', 'Thunder Lord', 'Mist Phantom', 'Bone Necromancer', 'Soul Reaper',
  'Divine Angel', 'Demon Hunter', 'Spirit Guide', 'Chaos Spawn', 'Order Paladin',
  'Nature Wrath', 'Arcane Scholar', 'Battle Mage', 'Rogue Assassin', 'Holy Crusader',
  'Death Knight', 'Life Cleric', 'War Chief', 'Peace Keeper', 'Time Mage',
  'Space Ranger', 'Dimensional Shifter', 'Reality Bender', 'Dream Walker', 'Nightmare',
  'Hope Beacon', 'Despair Harbinger', 'Fate Weaver', 'Destiny Changer', 'Luck Bringer'
];

// Create a standard deck
export const createDeck = (): GameCard[] => {
  const deck: GameCard[] = [];
  const colors: CardColor[] = ['green', 'blue', 'red', 'black', 'white'];
  
  let cardIdCounter = 0;
  
  // Create 10 cards of each color
  colors.forEach(color => {
    for (let i = 0; i < 10; i++) {
      const power = Math.floor(Math.random() * 5) + 1;
      const value = Math.floor(Math.random() * 5) + 1;
      const ability = abilities[Math.floor(Math.random() * abilities.length)];
      const name = cardNames[Math.floor(Math.random() * cardNames.length)];
      
      deck.push({
        id: `card-${cardIdCounter++}`,
        color,
        power,
        value,
        ability,
        name
      });
    }
  });
  
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: GameCard[]): GameCard[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const createInitialGameState = (playerNames: string[]): GameState => {
  if (playerNames.length < 2 || playerNames.length > 6) {
    throw new Error('Game requires 2-6 players');
  }
  
  const deck = createDeck();
  const players: Player[] = [];
  
  // Deal 9 cards to each player
  for (let i = 0; i < playerNames.length; i++) {
    const hand = deck.splice(0, 9);
    players.push({
      id: `player-${i}`,
      name: playerNames[i],
      hand,
      units: [],
      graveyard: []
    });
  }
  
  // Create initial discard pile (same number of cards as players)
  const discardPile = deck.splice(0, playerNames.length);
  
  return {
    players,
    currentPlayerIndex: 0,
    deck,
    discardPile,
    phase: 'draw',
    gameEnded: false,
    finalTurnRemaining: 0
  };
};

export const canFormUnit = (cards: GameCard[]): boolean => {
  if (cards.length < 3) return false;
  
  const whiteCards = cards.filter(card => card.color === 'white');
  const nonWhiteCards = cards.filter(card => card.color !== 'white');
  
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

export const resolveBattle = (
  attackerCard: GameCard,
  defenderCard: GameCard,
  attackerFromHand: boolean,
  defenderFromHand: boolean
): { winner: 'attacker' | 'defender' } => {
  const attackerPower = attackerCard.power;
  const defenderPower = defenderCard.power;
  
  if (attackerPower > defenderPower) {
    return { winner: 'attacker' };
  } else if (defenderPower > attackerPower) {
    return { winner: 'defender' };
  } else {
    // Tie goes to attacker
    return { winner: 'attacker' };
  }
};