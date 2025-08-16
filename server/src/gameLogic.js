// Server-side game logic (ported from frontend TypeScript)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { standardizeAbilities } from './abilities/abilityDefinitions.js';
import { GameAbilitySystem } from './abilities/battleIntegration.js';

// Create standard deck (synchronous)
export const createDeck = () => {
  try {
    // Use path resolution to get correct location
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '../data/deck.json');
    
    const rawData = fs.readFileSync(filePath, 'utf8');
    let deck = JSON.parse(rawData);
    
    // Standardize ability text for clarity and consistency
    deck = standardizeAbilities(deck);
    
    return shuffleDeck(deck);
  } catch (error) {
    console.error('Error loading deck data:', error);
    throw new Error('Failed to load permanent deck. Game cannot start.');
  }
};

export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const createInitialGameState = (playerNames) => {
  if (playerNames.length < 2 || playerNames.length > 6) {
    throw new Error('Game requires 2-6 players');
  }
  
  const deck = createDeck();
  const players = [];
  
  // Deal 9 cards to each player
  for (let i = 0; i < playerNames.length; i++) {
    const hand = deck.splice(0, 6);
    players.push({
      id: `player-${i}`,
      name: playerNames[i],
      hand,
      parties: [],
      graveyard: []
    });
  }
  
  // Create initial discard pile (same number of cards as players)
  const discardPile = deck.splice(0, playerNames.length);
  
  const gameState = {
    players,
    currentPlayerIndex: 0,
    currentTurn: 0,
    deck,
    discardPile,
    phase: 'draw',
    cardsDrawnThisTurn: 0,
    attacksUsedThisTurn: 0,
    gameEnded: false,
    finalTurnRemaining: null,
    abilitySystem: null // Will be initialized when needed
  };
  
  // Initialize ability system
  gameState.abilitySystem = new GameAbilitySystem(gameState);
  
  // Parse abilities for all cards in the game
  const allCards = [
    ...gameState.deck,
    ...gameState.discardPile,
    ...gameState.players.flatMap(p => [...p.hand, ...p.graveyard, ...p.parties.flatMap(party => party.cards)])
  ];
  
  gameState.abilitySystem.initializeCardAbilities(allCards);
  
  return gameState;
};

export const canFormParty = (cards) => {
  if (cards.length < 3) return false;
  
  const whiteCards = cards.filter(card => card.color === 'white');
  const blackCards = cards.filter(card => card.color === 'black');
  const grayCards = cards.filter(card => card.color === 'gray');
  const nonWhiteNonGrayCards = cards.filter(card => card.color !== 'white' && card.color !== 'gray');
  
  // Black cards can't be combined with white cards (gray cards are exceptions)
  if (whiteCards.length > 0 && blackCards.length > 0) {
    return false;
  }
  
  // Check if all cards are the same color (including all gray)
  if (cards.every(card => card.color === cards[0].color)) {
    return true;
  }
  
  // Gray cards can be combined with any other cards, so filter them out for color checking
  const nonGrayCards = cards.filter(card => card.color !== 'gray');
  
  // If only gray cards, always invalid
  if (nonGrayCards.length === 0) {
    return false;
  }
  
  // Check if non-gray cards follow the existing color rules
  const nonGrayWhiteCards = nonGrayCards.filter(card => card.color === 'white');
  const nonGrayBlackCards = nonGrayCards.filter(card => card.color === 'black');
  const nonGrayNonWhiteCards = nonGrayCards.filter(card => card.color !== 'white');
  
  // Black cards can't be combined with white cards
  if (nonGrayWhiteCards.length > 0 && nonGrayBlackCards.length > 0) {
    return false;
  }
  
  // Check if all non-gray cards are the same color
  if (nonGrayCards.every(card => card.color === nonGrayCards[0].color)) {
    return true;
  }
  
  // Check if there are white cards and all non-white non-gray cards are the same color
  if (nonGrayWhiteCards.length > 0 && nonGrayNonWhiteCards.length > 0) {
    const firstNonWhiteColor = nonGrayNonWhiteCards[0].color;
    return nonGrayNonWhiteCards.every(card => card.color === firstNonWhiteColor);
  }
  
  return false;
};

export const createParty = (cards, playerId) => {
  const totalValue = cards.reduce((sum, card) => sum + card.value, 0);
  
  return {
    id: `party-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards,
    playerId,
    totalValue
  };
};

// Enhanced party creation with ability processing
export const createPartyWithAbilities = async (gameState, cards, playerId, context = {}) => {
  const party = createParty(cards, playerId);
  
  if (gameState.abilitySystem) {
    try {
      const abilityResult = await gameState.abilitySystem.partyManager.processPartyFormationAbilities(
        cards, 
        playerId, 
        context
      );
      
      return {
        party,
        abilityResults: abilityResult,
        requiresPlayerInput: abilityResult.requiresPlayerInput || []
      };
    } catch (error) {
      console.error('Error processing party formation abilities:', error);
    }
  }
  
  return { party, abilityResults: null, requiresPlayerInput: [] };
};

export const calculateTotalValue = (player) => {
  return player.parties.reduce((sum, party) => sum + party.totalValue, 0);
};

export const checkWinCondition = (players) => {
  for (const player of players) {
    const totalValue = calculateTotalValue(player);
    const graveyardPenalty = player.graveyard.reduce((sum, card) => sum + card.value, 0);
    const finalScore = totalValue - graveyardPenalty;
    
    if (finalScore >= 50) {
      return { 
        winner: player, 
        finalTurnTriggered: true,
        winningScore: finalScore,
        triggeringPlayerId: player.id 
      };
    }
  }
  return { finalTurnTriggered: false };
};

export const canAddCardToParty = (card, party) => {
  // Gray cards can always be added to any party
  if (card.color === 'gray') {
    return true;
  }
  
  const partyColors = [...new Set(party.cards.map(c => c.color))];
  const nonGrayPartyColors = [...new Set(party.cards.filter(c => c.color !== 'gray').map(c => c.color))];
  
  // Black cards can't be combined with white cards (excluding gray)
  const hasWhite = nonGrayUnitColors.includes('white') || card.color === 'white';
  const hasBlack = nonGrayUnitColors.includes('black') || card.color === 'black';
  
  if (hasWhite && hasBlack) {
    return false;
  }
  
  // If party only has gray cards, any non-conflicting color can be added
  if (nonGrayPartyColors.length === 0) {
    return true;
  }
  
  // Check if card can be added based on existing non-gray party colors
  if (nonGrayPartyColors.length === 1) {
    // Party has one non-gray color (plus possibly gray), can add same color or white (if not black party)
    return card.color === nonGrayPartyColors[0] || 
           (card.color === 'white' && nonGrayPartyColors[0] !== 'black');
  }
  
  // Party has mixed non-gray colors (must include white), can add same non-white color or more white
  const nonGrayNonWhiteColors = [...new Set(party.cards.filter(c => c.color !== 'white' && c.color !== 'gray').map(c => c.color))];
  if (nonGrayNonWhiteColors.length === 1) {
    return card.color === nonGrayNonWhiteColors[0] || card.color === 'white';
  }
  
  return false;
};

// Legacy battle resolution - kept for compatibility
export const resolveBattle = (attackerCard, defenderCard, attackerFromHand, defenderFromHand) => {
  let attackerPower = attackerCard.power;
  let defenderPower = defenderCard.power;
  
  // Apply basic ability modifiers (legacy support)
  if (attackerCard.ability.includes('+1 when attacking')) {
    attackerPower += 1;
  }
  if (defenderCard.ability.includes('+1 when defending')) {
    defenderPower += 1;
  }
  
  // Apply color-specific bonuses (legacy support)
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

// Enhanced battle resolution with full ability system
export const resolveBattleWithAbilities = async (gameState, attackerCard, defenderCard, attackerFromHand, defenderFromHand, context = {}) => {
  if (!gameState.abilitySystem) {
    // Fallback to legacy system
    return resolveBattle(attackerCard, defenderCard, attackerFromHand, defenderFromHand);
  }
  
  try {
    const battleResult = await gameState.abilitySystem.battleManager.resolveBattleWithAbilities(
      attackerCard, 
      defenderCard, 
      attackerFromHand, 
      defenderFromHand, 
      context
    );
    
    return {
      winner: battleResult.winner,
      battleDetails: battleResult
    };
  } catch (error) {
    console.error('Error in ability-enhanced battle resolution:', error);
    // Fallback to legacy system
    return resolveBattle(attackerCard, defenderCard, attackerFromHand, defenderFromHand);
  }
};

export const calculateGraveyardValue = (graveyard) => {
  return graveyard.reduce((sum, card) => sum + card.value, 0);
};

export const calculatePlayerScore = (player) => {
  const partyScore = player.parties.reduce((sum, party) => sum + party.totalValue, 0);
  const graveyardPenalty = calculateGraveyardValue(player.graveyard);
  return partyScore - graveyardPenalty;
};
