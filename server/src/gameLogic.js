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
      units: [],
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
    finalTurnRemaining: 0,
    abilitySystem: null // Will be initialized when needed
  };
  
  // Initialize ability system
  gameState.abilitySystem = new GameAbilitySystem(gameState);
  
  // Parse abilities for all cards in the game
  const allCards = [
    ...gameState.deck,
    ...gameState.discardPile,
    ...gameState.players.flatMap(p => [...p.hand, ...p.graveyard, ...p.units.flatMap(u => u.cards)])
  ];
  
  gameState.abilitySystem.initializeCardAbilities(allCards);
  
  return gameState;
};

export const canFormUnit = (cards) => {
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

export const createUnit = (cards, playerId) => {
  const totalValue = cards.reduce((sum, card) => sum + card.value, 0);
  
  return {
    id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards,
    playerId,
    totalValue
  };
};

// Enhanced unit creation with ability processing
export const createUnitWithAbilities = async (gameState, cards, playerId, context = {}) => {
  const unit = createUnit(cards, playerId);
  
  if (gameState.abilitySystem) {
    try {
      const abilityResult = await gameState.abilitySystem.unitManager.processUnitFormationAbilities(
        cards, 
        playerId, 
        context
      );
      
      return {
        unit,
        abilityResults: abilityResult,
        requiresPlayerInput: abilityResult.requiresPlayerInput || []
      };
    } catch (error) {
      console.error('Error processing unit formation abilities:', error);
    }
  }
  
  return { unit, abilityResults: null, requiresPlayerInput: [] };
};

export const calculateTotalValue = (player) => {
  return player.units.reduce((sum, unit) => sum + unit.totalValue, 0);
};

export const checkWinCondition = (players) => {
  for (const player of players) {
    const totalValue = calculateTotalValue(player);
    if (totalValue >= 50) {
      return { winner: player, finalTurnTriggered: true };
    }
  }
  return {};
};

export const canAddCardToUnit = (card, unit) => {
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
  const unitScore = player.units.reduce((sum, unit) => sum + unit.totalValue, 0);
  const graveyardPenalty = calculateGraveyardValue(player.graveyard);
  return unitScore - graveyardPenalty;
};
