// Battle system integration with ability system
// Handles ability triggers during battles and unit formation

import { AbilityParser, EffectExecutor, KEYWORDS } from './abilitySystem.js';

export class BattleAbilityManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.effectExecutor = new EffectExecutor(gameState);
  }

  // Enhanced battle resolution with ability triggers
  async resolveBattleWithAbilities(attackerCard, defenderCard, attackerFromHand, defenderFromHand, context = {}) {
    let attackerPower = attackerCard.power;
    let defenderPower = defenderCard.power;
    
    // Parse abilities if not already done
    if (!attackerCard.parsedAbility && attackerCard.ability) {
      attackerCard.parsedAbility = AbilityParser.parseAbility(attackerCard.ability);
    }
    if (!defenderCard.parsedAbility && defenderCard.ability) {
      defenderCard.parsedAbility = AbilityParser.parseAbility(defenderCard.ability);
    }

    const battleResults = {
      originalAttackerPower: attackerPower,
      originalDefenderPower: defenderPower,
      modifiedAttackerPower: attackerPower,
      modifiedDefenderPower: defenderPower,
      winner: null,
      abilityResults: []
    };

    // Apply attacker's abilities
    if (attackerCard.parsedAbility) {
      const attackerResult = await this.applyBattleAbilities(
        attackerCard, 
        defenderCard, 
        'attacking', 
        attackerFromHand,
        context
      );
      
      if (attackerResult.powerModification !== undefined) {
        battleResults.modifiedAttackerPower = attackerResult.powerModification;
      }
      battleResults.abilityResults.push(...attackerResult.results);
    }

    // Apply defender's abilities
    if (defenderCard.parsedAbility) {
      const defenderResult = await this.applyBattleAbilities(
        defenderCard, 
        attackerCard, 
        'defending', 
        defenderFromHand,
        context
      );
      
      if (defenderResult.powerModification !== undefined) {
        battleResults.modifiedDefenderPower = defenderResult.powerModification;
      }
      battleResults.abilityResults.push(...defenderResult.results);
    }

    // Determine winner based on modified powers
    if (battleResults.modifiedAttackerPower > battleResults.modifiedDefenderPower) {
      battleResults.winner = 'attacker';
    } else if (battleResults.modifiedDefenderPower > battleResults.modifiedAttackerPower) {
      battleResults.winner = 'defender';
    } else {
      // Tie goes to attacker
      battleResults.winner = 'attacker';
    }

    return battleResults;
  }

  async applyBattleAbilities(sourceCard, targetCard, battleRole, isFromHand, context) {
    const results = {
      powerModification: sourceCard.power,
      results: []
    };

    if (!sourceCard.parsedAbility) return results;

    // Apply relevant battle abilities
    for (const effect of sourceCard.parsedAbility.effects) {
      if (this.shouldTriggerInBattle(effect, battleRole, targetCard)) {
        const abilityContext = {
          ...context,
          targetCard: targetCard,
          battleRole: battleRole,
          isFromHand: isFromHand
        };

        const result = await this.effectExecutor.executeEffect(effect, sourceCard, abilityContext);
        
        // Handle power modifications specifically for battle
        if (effect.type === 'modify_attribute' && effect.attribute === KEYWORDS.POWER) {
          if (effect.target === KEYWORDS.THIS_CARD) {
            results.powerModification = this.calculateModifiedPower(sourceCard, effect, targetCard);
          }
        }
        
        results.results.push(result);
      }
    }

    return results;
  }

  shouldTriggerInBattle(effect, battleRole, targetCard) {
    // Check if effect should trigger during battle
    switch (effect.timing) {
      case KEYWORDS.WHEN_ATTACKING:
        return battleRole === 'attacking';
      case KEYWORDS.WHEN_DEFENDING:
        return battleRole === 'defending';
      case KEYWORDS.WHEN_BATTLING:
        // Check conditional triggers like "vs red"
        if (effect.type === 'modify_attribute' && effect.operation === KEYWORDS.DOUBLE) {
          // Find the condition for target color
          const sourceAbility = effect.sourceAbility || {};
          const colorCondition = sourceAbility.conditions?.find(c => c.type === 'target_color');
          if (colorCondition) {
            return targetCard.color === colorCondition.value;
          }
        }
        return true;
      default:
        return false;
    }
  }

  calculateModifiedPower(sourceCard, effect, targetCard) {
    let basePower = sourceCard.power;
    
    switch (effect.operation) {
      case KEYWORDS.DOUBLE:
        // Check if condition is met (e.g., target color)
        const ability = sourceCard.parsedAbility;
        const colorCondition = ability.conditions?.find(c => c.type === 'target_color');
        if (colorCondition && targetCard.color === colorCondition.value) {
          return basePower * 2;
        }
        return basePower;
      case KEYWORDS.INCREASE:
        return basePower + (effect.amount || 1);
      case KEYWORDS.DECREASE:
        return Math.max(0, basePower - (effect.amount || 1));
      case KEYWORDS.SET:
        return effect.amount || basePower;
      default:
        return basePower;
    }
  }
}

export class UnitAbilityManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.effectExecutor = new EffectExecutor(gameState);
  }

  // Handle abilities when cards are played to form or join units
  async processUnitFormationAbilities(cards, playerId, context = {}) {
    const results = {
      success: true,
      cardsModified: [],
      abilityResults: [],
      requiresPlayerInput: [],
      errors: []
    };

    // Parse abilities for all cards if not already done
    for (const card of cards) {
      if (!card.parsedAbility && card.ability) {
        card.parsedAbility = AbilityParser.parseAbility(card.ability);
      }
    }

    // Process play triggers
    for (const card of cards) {
      if (card.parsedAbility) {
        const cardResult = await this.processCardPlayAbilities(card, playerId, context);
        
        if (cardResult.success) {
          results.abilityResults.push(...cardResult.results);
          if (cardResult.requiresPlayerInput && cardResult.requiresPlayerInput.length > 0) {
            results.requiresPlayerInput.push(...cardResult.requiresPlayerInput);
          }
        } else {
          results.errors.push(cardResult.error);
        }
      }
    }

    return results;
  }

  async processCardPlayAbilities(card, playerId, context) {
    const results = {
      success: true,
      results: [],
      requiresPlayerInput: [],
      error: null
    };

    if (!card.parsedAbility) return results;

    // Process abilities that trigger when played
    for (const effect of card.parsedAbility.effects) {
      if (this.shouldTriggerOnPlay(effect)) {
        const abilityContext = {
          ...context,
          playerId: playerId,
          sourceCard: card
        };

        const result = await this.effectExecutor.executeEffect(effect, card, abilityContext);
        
        if (result.requiresPlayerInput) {
          results.requiresPlayerInput.push({
            cardId: card.id,
            effect: effect,
            result: result
          });
        } else {
          results.results.push(result);
        }
      }
    }

    return results;
  }

  shouldTriggerOnPlay(effect) {
    return effect.timing === 'when_played' || 
           effect.type === 'play_trigger' ||
           (effect.type === 'modify_attribute' && effect.timing === 'when_played');
  }
}

export class ActivatedAbilityManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.effectExecutor = new EffectExecutor(gameState);
  }

  // Handle manually activated abilities
  async activateAbility(cardId, playerId, targetSelections = {}) {
    const card = this.findCard(cardId);
    if (!card) {
      return { success: false, error: 'Card not found' };
    }

    if (!card.parsedAbility) {
      card.parsedAbility = AbilityParser.parseAbility(card.ability);
    }

    // Verify the player can activate this ability
    if (!this.canPlayerActivateAbility(card, playerId)) {
      return { success: false, error: 'Cannot activate this ability' };
    }

    // Check if this is an activated ability type
    if (!card.parsedAbility.isActivated) {
      return { success: false, error: 'This ability cannot be manually activated' };
    }

    const context = {
      playerId: playerId,
      sourceCard: card,
      ...targetSelections
    };

    const result = await this.effectExecutor.executeAbility(card.parsedAbility, card, context);
    
    if (result.success) {
      // Mark ability as used this turn if it has limited uses
      this.markAbilityUsed(card, playerId);
    }

    return result;
  }

  canPlayerActivateAbility(card, playerId) {
    // Check if the player owns the card
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check if card is in player's hand or units
    const inHand = player.hand.some(c => c.id === card.id);
    const inUnits = player.units.some(unit => unit.cards.some(c => c.id === card.id));

    return inHand || inUnits;
  }

  findCard(cardId) {
    for (const player of this.gameState.players) {
      // Check hand
      const handCard = player.hand.find(c => c.id === cardId);
      if (handCard) return handCard;

      // Check units
      for (const unit of player.units) {
        const unitCard = unit.cards.find(c => c.id === cardId);
        if (unitCard) return unitCard;
      }
    }
    return null;
  }

  markAbilityUsed(card, playerId) {
    // Track ability usage if needed for game balance
    if (!this.gameState.abilityUsage) {
      this.gameState.abilityUsage = new Map();
    }

    const turn = this.gameState.currentTurn || 0;
    const key = `${card.id}_${turn}`;
    this.gameState.abilityUsage.set(key, true);
  }
}

// Main integration class that combines all ability managers
export class GameAbilitySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.battleManager = new BattleAbilityManager(gameState);
    this.unitManager = new UnitAbilityManager(gameState);
    this.activatedManager = new ActivatedAbilityManager(gameState);
    this.effectExecutor = new EffectExecutor(gameState);
  }

  // Initialize abilities for all cards in deck
  initializeCardAbilities(deck) {
    return deck.map(card => ({
      ...card,
      parsedAbility: card.ability ? AbilityParser.parseAbility(card.ability) : null
    }));
  }

  // Clean up temporary effects at end of turn
  endTurnCleanup(turn) {
    this.effectExecutor.cleanupTemporaryEffects(turn);
    
    // Clear ability usage for the turn
    if (this.gameState.abilityUsage) {
      for (const [key] of this.gameState.abilityUsage) {
        if (key.endsWith(`_${turn}`)) {
          this.gameState.abilityUsage.delete(key);
        }
      }
    }
  }

  // Get available activated abilities for a player
  getAvailableAbilities(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) return [];

    const availableAbilities = [];

    // Check hand cards
    for (const card of player.hand) {
      if (card.parsedAbility?.isActivated) {
        availableAbilities.push({
          cardId: card.id,
          cardName: card.name,
          ability: card.parsedAbility,
          location: 'hand'
        });
      }
    }

    // Check unit cards
    for (const unit of player.units) {
      for (const card of unit.cards) {
        if (card.parsedAbility?.isActivated) {
          availableAbilities.push({
            cardId: card.id,
            cardName: card.name,
            ability: card.parsedAbility,
            location: 'unit',
            unitId: unit.id
          });
        }
      }
    }

    return availableAbilities;
  }
}
