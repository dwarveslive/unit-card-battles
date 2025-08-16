// Core ability system for Unit Card Battles
// Modular system that parses ability text and executes effects

// Ability keyword mappings
export const KEYWORDS = {
  // Modification keywords
  DOUBLE: 'double',
  INCREASE: 'increase',
  DECREASE: 'decrease',
  SET: 'set',
  
  // Attribute keywords
  POWER: 'power',
  VALUE: 'value',
  
  // Color keywords
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green',
  BLACK: 'black',
  WHITE: 'white',
  
  // Timing keywords
  WHEN_ATTACKING: 'when_attacking',
  WHEN_DEFENDING: 'when_defending',
  WHEN_BATTLING: 'when_battling',
  THIS_TURN: 'this_turn',
  
  // Target keywords
  THIS_CARD: 'this_card',
  TARGET_CARD: 'target_card',
  TARGET_UNIT: 'target_unit',
  RANDOM_CARD: 'random_card',
  
  // Action keywords
  DESTROY: 'destroy',
  STEAL: 'steal',
  DRAW: 'draw',
  DISCARD: 'discard',
  REVIVE: 'revive',
  COPY: 'copy',
  
  // Source keywords
  FROM_HAND: 'from_hand',
  FROM_UNIT: 'from_unit',
  FROM_GRAVEYARD: 'from_graveyard',
  
  // Immunity keywords
  IMMUNE_TO: 'immune_to',
};

// Ability parser that converts text to structured ability objects
export class AbilityParser {
  static parseAbility(abilityText) {
    const ability = {
      originalText: abilityText,
      type: null,
      conditions: [],
      effects: [],
      targets: [],
      isPassive: false,
      isTriggered: false,
      isActivated: false
    };

    const text = abilityText.toLowerCase().trim();

    // Determine ability type and parse accordingly
    if (text.includes('when this card is played into a party')) {
      ability.type = 'play_trigger';
      ability.isTriggered = true;
      this.parsePlayTrigger(text, ability);
    } else if (text.includes('when this card is in a battle')) {
      ability.type = 'battle_trigger';
      ability.isTriggered = true;
      this.parseBattleTrigger(text, ability);
    } else if (text.includes('every time this card defeats')) {
      ability.type = 'defeat_trigger';
      ability.isTriggered = true;
      this.parseDefeatTrigger(text, ability);
    } else if (text.includes('double') && (text.includes('vs') || text.includes('against') || text.includes('when battling'))) {
      ability.type = 'conditional_power_modifier';
      ability.isTriggered = true;
      this.parseConditionalModifier(text, ability);
    } else if (text.includes('increase') && text.includes('power') && (text.includes('when attacking') || text.includes('when defending'))) {
      ability.type = 'situational_modifier';
      ability.isTriggered = true;
      this.parseSituationalModifier(text, ability);
    } else if (text.includes('immune to abilities from')) {
      ability.type = 'immunity';
      ability.isPassive = true;
      this.parseImmunity(text, ability);
    } else if (text.includes('can defend other parties')) {
      ability.type = 'defend_others';
      ability.isPassive = true;
      this.parseDefendOthers(text, ability);
    } else if (text.includes('allows') && text.includes('card of a different color')) {
      ability.type = 'color_mixing';
      ability.isPassive = true;
      this.parseColorMixing(text, ability);
    } else if (text.includes('if you have') && text.includes('double power')) {
      ability.type = 'conditional_manual_power';
      ability.isActivated = true;
      this.parseConditionalManualPower(text, ability);
    } else if (text.includes('increase the power of') && text.includes('card from this party')) {
      ability.type = 'manual_power_boost';
      ability.isActivated = true;
      this.parseManualPowerBoost(text, ability);
    } else {
      // If we can't categorize it, assume it's a manual activation ability
      // This covers edge cases and ensures all abilities have some categorization
      ability.type = 'unknown_activation';
      ability.isActivated = true;
      this.parseUnknownActivation(text, ability);
    }

    return ability;
  }

  static parseConditionalModifier(text, ability) {
    // "Double power vs red" -> double this card's power when battling red cards
    const colorMatch = text.match(/vs\s+(\w+)/);
    if (colorMatch) {
      ability.conditions.push({
        type: 'target_color',
        value: colorMatch[1]
      });
      ability.effects.push({
        type: 'modify_attribute',
        target: KEYWORDS.THIS_CARD,
        attribute: KEYWORDS.POWER,
        operation: KEYWORDS.DOUBLE,
        timing: KEYWORDS.WHEN_BATTLING
      });
    }
  }

  static parseSituationalModifier(text, ability) {
    // "+1 when attacking" -> increase this card's power by 1 when attacking
    const amountMatch = text.match(/\+(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    const timing = text.includes('when attacking') ? KEYWORDS.WHEN_ATTACKING : KEYWORDS.WHEN_DEFENDING;
    
    ability.effects.push({
      type: 'modify_attribute',
      target: KEYWORDS.THIS_CARD,
      attribute: KEYWORDS.POWER,
      operation: KEYWORDS.INCREASE,
      amount: amount,
      timing: timing
    });
  }

  static parseTemporaryModifier(text, ability) {
    // "+1 power this turn" -> increase target's power by 1 until end of turn
    const amountMatch = text.match(/\+(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    const attribute = text.includes('value') ? KEYWORDS.VALUE : KEYWORDS.POWER;
    
    ability.effects.push({
      type: 'modify_attribute',
      target: KEYWORDS.TARGET_CARD,
      attribute: attribute,
      operation: KEYWORDS.INCREASE,
      amount: amount,
      duration: KEYWORDS.THIS_TURN
    });
  }

  static parsePlayTrigger(text, ability) {
    // "+1 value when played" -> increase this card's value by 1 when played
    const amountMatch = text.match(/\+(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    ability.effects.push({
      type: 'modify_attribute',
      target: KEYWORDS.THIS_CARD,
      attribute: KEYWORDS.VALUE,
      operation: KEYWORDS.INCREASE,
      amount: amount,
      timing: 'when_played'
    });
  }

  static parseImmunity(text, ability) {
    // "Immune to black" -> immune to abilities from black cards
    const colorMatch = text.match(/immune to (\w+)/);
    if (colorMatch) {
      ability.effects.push({
        type: 'immunity',
        immuneTo: colorMatch[1]
      });
    }
  }

  static parseDestruction(text, ability) {
    // "Destroy 1 unit" -> destroy 1 target unit
    // "Destroy 1 random card from opponent's hand" -> destroy 1 random card from opponent's hand
    const amountMatch = text.match(/destroy (\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    let targetType = KEYWORDS.TARGET_UNIT;
    let source = null;
    let isRandom = text.includes('random');
    
    if (text.includes('card')) {
      targetType = isRandom ? KEYWORDS.RANDOM_CARD : KEYWORDS.TARGET_CARD;
      if (text.includes('from hand')) {
        source = KEYWORDS.FROM_HAND;
      } else if (text.includes('from unit') || text.includes('in unit')) {
        source = KEYWORDS.FROM_UNIT;
      }
    }
    
    ability.effects.push({
      type: 'destroy',
      target: targetType,
      amount: amount,
      source: source,
      isRandom: isRandom
    });
  }

  static parseTheft(text, ability) {
    // "Steal 1 card" -> steal 1 random card from opponent's hand
    // "Steal 1 card from opponent's unit" -> steal 1 target card from opponent's unit
    const amountMatch = text.match(/steal (\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    let source = KEYWORDS.FROM_HAND; // default
    let isRandom = !text.includes('from unit') && !text.includes('from hand with choice');
    
    if (text.includes('from unit') || text.includes('from opponent\'s unit')) {
      source = KEYWORDS.FROM_UNIT;
      isRandom = false; // player chooses from visible unit
    }
    
    ability.effects.push({
      type: 'steal',
      target: isRandom ? KEYWORDS.RANDOM_CARD : KEYWORDS.TARGET_CARD,
      amount: amount,
      source: source,
      isRandom: isRandom
    });
  }

  static parseCardDraw(text, ability) {
    // "Draw 1 card" -> draw 1 card from deck
    const amountMatch = text.match(/draw (\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    ability.effects.push({
      type: 'draw_card',
      amount: amount
    });
  }

  static parseDiscard(text, ability) {
    // "Discard 1 card" -> discard 1 target card from hand
    const amountMatch = text.match(/discard (\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    ability.effects.push({
      type: 'discard',
      target: KEYWORDS.TARGET_CARD,
      amount: amount,
      source: KEYWORDS.FROM_HAND
    });
  }

  static parseRevival(text, ability) {
    // "Revive from graveyard" -> revive 1 target card from graveyard to hand
    ability.effects.push({
      type: 'revive',
      target: KEYWORDS.TARGET_CARD,
      source: KEYWORDS.FROM_GRAVEYARD,
      destination: KEYWORDS.FROM_HAND,
      amount: 1
    });
  }

  static parseAbilityCopy(text, ability) {
    // "Copy enemy ability" -> copy target enemy card's ability
    ability.effects.push({
      type: 'copy_ability',
      target: KEYWORDS.TARGET_CARD,
      duration: KEYWORDS.THIS_TURN
    });
  }

  static parseBattleTrigger(text, ability) {
    // "When this card is in a battle, steal 1 random card from the opponent's hand"
    if (text.includes('steal')) {
      this.parseTheft(text, ability);
    } else if (text.includes('discard')) {
      this.parseDiscard(text, ability);
    } else if (text.includes('double')) {
      this.parseConditionalModifier(text, ability);
    }
  }

  static parseDefeatTrigger(text, ability) {
    // "Every time this card defeats another card, it gains 1 additional value until the end of the game"
    if (text.includes('gains') && text.includes('value')) {
      ability.effects.push({
        type: 'modify_attribute',
        target: KEYWORDS.THIS_CARD,
        attribute: KEYWORDS.VALUE,
        operation: KEYWORDS.INCREASE,
        amount: 1,
        timing: 'on_defeat',
        permanent: true
      });
    }
  }

  static parseDefendOthers(text, ability) {
    // "Can defend other parties"
    ability.effects.push({
      type: 'defend_others',
      target: KEYWORDS.TARGET_UNIT,
      scope: 'any_party'
    });
  }

  static parseColorMixing(text, ability) {
    // "Allows 1 card of a different color in this party. Can stack."
    const amountMatch = text.match(/allows (\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    ability.effects.push({
      type: 'color_mixing',
      allowedDifferentColors: amount,
      canStack: text.includes('can stack')
    });
  }

  static parseConditionalManualPower(text, ability) {
    // "Doesn't do anything. If you have Stone, double power of a defending card. Doesn't stack."
    const conditionMatch = text.match(/if you have (\w+)/);
    const condition = conditionMatch ? conditionMatch[1].toLowerCase() : null;
    
    const isDefending = text.includes('defending');
    const isAttacking = text.includes('attacking');
    const isDoubling = text.includes('double');
    
    ability.conditions.push({
      type: 'requires_item',
      item: condition
    });
    
    ability.effects.push({
      type: 'manual_power_modification',
      target: KEYWORDS.TARGET_CARD,
      attribute: KEYWORDS.POWER,
      operation: isDoubling ? KEYWORDS.DOUBLE : KEYWORDS.INCREASE,
      amount: isDoubling ? 2 : 1,
      scope: isDefending ? 'defending' : (isAttacking ? 'attacking' : 'any'),
      canStack: !text.includes("doesn't stack")
    });
  }

  static parseManualPowerBoost(text, ability) {
    // "Increase the power of an attacking card from this party by 1. Doesn't stack."
    const amountMatch = text.match(/by (\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
    
    const isDefending = text.includes('defending');
    const isAttacking = text.includes('attacking');
    
    ability.effects.push({
      type: 'manual_power_modification',
      target: KEYWORDS.TARGET_CARD,
      attribute: KEYWORDS.POWER,
      operation: KEYWORDS.INCREASE,
      amount: amount,
      scope: isDefending ? 'defending' : (isAttacking ? 'attacking' : 'any'),
      source: 'same_party',
      canStack: !text.includes("doesn't stack")
    });
  }

  static parseUnknownActivation(text, ability) {
    // Fallback for unknown abilities - treat as generic manual activation
    ability.effects.push({
      type: 'generic_activation',
      description: text
    });
  }
}

// Effect executor that applies ability effects to game state
export class EffectExecutor {
  constructor(gameState) {
    this.gameState = gameState;
    this.temporaryEffects = new Map(); // Track temporary effects by turn
  }

  // Execute an ability with potential targets
  async executeAbility(ability, sourceCard, context = {}) {
    const results = [];
    
    // Check if ability can be executed (immunity, etc.)
    if (!this.canExecuteAbility(ability, sourceCard, context)) {
      return { success: false, reason: 'blocked_by_immunity' };
    }

    // Execute each effect in the ability
    for (const effect of ability.effects) {
      const result = await this.executeEffect(effect, sourceCard, context);
      results.push(result);
    }

    return { success: true, results };
  }

  canExecuteAbility(ability, sourceCard, context) {
    // Check target immunity
    if (context.targetCard && this.isImmuneTo(context.targetCard, sourceCard.color)) {
      return false;
    }
    return true;
  }

  isImmuneTo(targetCard, sourceColor) {
    if (!targetCard.parsedAbility) return false;
    
    const immunityEffect = targetCard.parsedAbility.effects.find(
      effect => effect.type === 'immunity' && effect.immuneTo === sourceColor
    );
    
    return !!immunityEffect;
  }

  async executeEffect(effect, sourceCard, context) {
    switch (effect.type) {
      case 'modify_attribute':
        return this.executeAttributeModification(effect, sourceCard, context);
      case 'destroy':
        return this.executeDestruction(effect, sourceCard, context);
      case 'steal':
        return this.executeTheft(effect, sourceCard, context);
      case 'draw_card':
        return this.executeCardDraw(effect, sourceCard, context);
      case 'discard':
        return this.executeDiscard(effect, sourceCard, context);
      case 'revive':
        return this.executeRevival(effect, sourceCard, context);
      case 'copy_ability':
        return this.executeAbilityCopy(effect, sourceCard, context);
      default:
        return { success: false, reason: 'unknown_effect_type' };
    }
  }

  executeAttributeModification(effect, sourceCard, context) {
    const target = this.resolveTarget(effect.target, sourceCard, context);
    if (!target) return { success: false, reason: 'no_valid_target' };

    const currentValue = target[effect.attribute];
    let newValue = currentValue;

    switch (effect.operation) {
      case KEYWORDS.DOUBLE:
        newValue = currentValue * 2;
        break;
      case KEYWORDS.INCREASE:
        newValue = currentValue + effect.amount;
        break;
      case KEYWORDS.DECREASE:
        newValue = currentValue - effect.amount;
        break;
      case KEYWORDS.SET:
        newValue = effect.amount;
        break;
    }

    // Apply modification
    if (effect.duration === KEYWORDS.THIS_TURN) {
      this.applyTemporaryModification(target, effect.attribute, newValue - currentValue);
    } else {
      target[effect.attribute] = newValue;
    }

    return { 
      success: true, 
      target: target,
      attribute: effect.attribute,
      oldValue: currentValue,
      newValue: newValue,
      isTemporary: effect.duration === KEYWORDS.THIS_TURN
    };
  }

  executeDestruction(effect, sourceCard, context) {
    const targets = this.resolveTargets(effect, sourceCard, context);
    const destroyed = [];

    for (const target of targets.slice(0, effect.amount)) {
      if (effect.source === KEYWORDS.FROM_UNIT) {
        this.moveCardToGraveyard(target, 'unit');
      } else if (effect.source === KEYWORDS.FROM_HAND) {
        this.moveCardToGraveyard(target, 'hand');
      }
      destroyed.push(target);
    }

    return { success: true, destroyed };
  }

  executeTheft(effect, sourceCard, context) {
    const targets = this.resolveTargets(effect, sourceCard, context);
    const stolen = [];
    const currentPlayer = this.getCurrentPlayer();

    for (const target of targets.slice(0, effect.amount)) {
      if (effect.source === KEYWORDS.FROM_HAND) {
        this.moveCardBetweenHands(target, currentPlayer);
      } else if (effect.source === KEYWORDS.FROM_UNIT) {
        this.moveCardFromUnitToHand(target, currentPlayer);
      }
      stolen.push(target);
    }

    return { success: true, stolen };
  }

  executeCardDraw(effect, sourceCard, context) {
    const currentPlayer = this.getCurrentPlayer();
    const drawn = [];

    for (let i = 0; i < effect.amount && this.gameState.deck.length > 0; i++) {
      const card = this.gameState.deck.pop();
      currentPlayer.hand.push(card);
      drawn.push(card);
    }

    return { success: true, drawn };
  }

  executeDiscard(effect, sourceCard, context) {
    // This would require player input to choose cards to discard
    return { success: true, requiresPlayerInput: true, effect };
  }

  executeRevival(effect, sourceCard, context) {
    // This would require player input to choose cards from graveyard
    return { success: true, requiresPlayerInput: true, effect };
  }

  executeAbilityCopy(effect, sourceCard, context) {
    if (!context.targetCard || !context.targetCard.parsedAbility) {
      return { success: false, reason: 'no_ability_to_copy' };
    }

    // Copy the ability temporarily
    this.applyTemporaryCopiedAbility(sourceCard, context.targetCard.parsedAbility);
    return { success: true, copiedFrom: context.targetCard };
  }

  // Helper methods
  resolveTarget(targetType, sourceCard, context) {
    switch (targetType) {
      case KEYWORDS.THIS_CARD:
        return sourceCard;
      case KEYWORDS.TARGET_CARD:
        return context.targetCard || null;
      default:
        return null;
    }
  }

  resolveTargets(effect, sourceCard, context) {
    if (effect.isRandom) {
      return this.getRandomTargets(effect, sourceCard, context);
    } else {
      return context.selectedTargets || [];
    }
  }

  getRandomTargets(effect, sourceCard, context) {
    // Implementation for getting random targets based on effect.source
    const targets = [];
    
    if (effect.source === KEYWORDS.FROM_HAND) {
      const opponents = this.getOpponents();
      for (const opponent of opponents) {
        if (opponent.hand.length > 0) {
          const randomIndex = Math.floor(Math.random() * opponent.hand.length);
          targets.push(opponent.hand[randomIndex]);
        }
      }
    }
    
    return targets;
  }

  applyTemporaryModification(target, attribute, delta) {
    const currentTurn = this.gameState.currentTurn || 0;
    const key = `${target.id}_${attribute}_${currentTurn}`;
    
    if (!this.temporaryEffects.has(currentTurn)) {
      this.temporaryEffects.set(currentTurn, new Map());
    }
    
    this.temporaryEffects.get(currentTurn).set(key, {
      target,
      attribute,
      delta,
      originalValue: target[attribute]
    });
    
    target[attribute] += delta;
  }

  cleanupTemporaryEffects(turn) {
    const turnEffects = this.temporaryEffects.get(turn);
    if (turnEffects) {
      for (const [key, effect] of turnEffects) {
        effect.target[effect.attribute] = effect.originalValue;
      }
      this.temporaryEffects.delete(turn);
    }
  }

  getCurrentPlayer() {
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  getOpponents() {
    return this.gameState.players.filter((_, index) => index !== this.gameState.currentPlayerIndex);
  }

  moveCardToGraveyard(card, from) {
    // Implementation for moving cards to graveyard
    const owner = this.findCardOwner(card);
    if (owner) {
      if (from === 'hand') {
        owner.hand = owner.hand.filter(c => c.id !== card.id);
      } else if (from === 'unit') {
        owner.units.forEach(unit => {
          unit.cards = unit.cards.filter(c => c.id !== card.id);
        });
      }
      owner.graveyard.push(card);
    }
  }

  findCardOwner(card) {
    return this.gameState.players.find(player => 
      player.hand.some(c => c.id === card.id) ||
      player.units.some(unit => unit.cards.some(c => c.id === card.id))
    );
  }
}
