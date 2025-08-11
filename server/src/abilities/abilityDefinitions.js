// Standardized ability definitions with clear, deterministic rule text
// This file maps old ability text to new standardized versions

export const STANDARDIZED_ABILITIES = {
  // Power modification abilities
  "Double power vs red": "Double this card's power when battling red cards",
  "Double power vs blue": "Double this card's power when battling blue cards",
  "+1 when attacking": "Increase this card's power by 1 when attacking",
  "+1 when defending": "Increase this card's power by 1 when defending",
  "+1 power this turn": "Increase target card's power by 1 this turn",
  
  // Value modification abilities
  "+1 value when played": "Increase this card's value by 1 when played",
  
  // Card manipulation abilities
  "Draw 1 card": "Draw 1 card from deck",
  "Discard 1 card": "Target opponent discards 1 card from hand",
  "Steal 1 card": "Steal 1 random card from opponent's hand",
  "Revive from graveyard": "Move 1 target card from your graveyard to your hand",
  
  // Destruction abilities  
  "Destroy 1 unit": "Destroy 1 target opponent's unit",
  
  // Immunity abilities
  "Immune to black": "Immune to abilities from black cards",
  
  // Copy abilities
  "Copy enemy ability": "Copy target enemy card's ability this turn",
  
  // Abilities to be removed (game flow modifiers)
  "Gain extra turn": null, // Will be filtered out
  "Heal 1 unit": null     // Will be filtered out
};

// Updated ability text templates for easy keyword swapping
export const ABILITY_TEMPLATES = {
  // Power/Value modifiers
  CONDITIONAL_POWER_DOUBLE: "Double this card's {attribute} when battling {color} cards",
  SITUATIONAL_MODIFIER: "Increase this card's {attribute} by {amount} when {timing}",
  TEMPORARY_MODIFIER: "Increase target card's {attribute} by {amount} this turn",
  PLAY_TRIGGER: "Increase this card's {attribute} by {amount} when played",
  
  // Card manipulation
  CARD_DRAW: "Draw {amount} card{plural} from deck",
  CARD_DISCARD: "Target opponent discards {amount} card{plural} from hand",
  CARD_STEAL_RANDOM: "Steal {amount} random card{plural} from opponent's hand",
  CARD_STEAL_TARGETED: "Steal {amount} target card{plural} from opponent's {source}",
  CARD_REVIVE: "Move {amount} target card{plural} from your graveyard to your hand",
  
  // Destruction
  DESTROY_UNIT: "Destroy {amount} target opponent's unit{plural}",
  DESTROY_CARD_TARGETED: "Destroy {amount} target card{plural} from opponent's {source}",
  DESTROY_CARD_RANDOM: "Destroy {amount} random card{plural} from opponent's {source}",
  
  // Immunity
  IMMUNITY: "Immune to abilities from {color} cards",
  
  // Copy
  ABILITY_COPY: "Copy target enemy card's ability this turn"
};

// Keyword replacement system
export class AbilityTextGenerator {
  static generateAbilityText(template, replacements = {}) {
    let text = ABILITY_TEMPLATES[template];
    
    if (!text) {
      throw new Error(`Unknown ability template: ${template}`);
    }
    
    // Replace all keywords with provided values
    for (const [keyword, value] of Object.entries(replacements)) {
      const placeholder = `{${keyword}}`;
      text = text.replace(new RegExp(placeholder, 'g'), value);
    }
    
    // Handle pluralization
    if (replacements.amount && replacements.amount > 1) {
      text = text.replace(/{plural}/g, 's');
    } else {
      text = text.replace(/{plural}/g, '');
    }
    
    return text;
  }

  static createConditionalPowerModifier(attribute = 'power', color = 'red') {
    return this.generateAbilityText('CONDITIONAL_POWER_DOUBLE', {
      attribute: attribute,
      color: color
    });
  }

  static createSituationalModifier(attribute = 'power', amount = 1, timing = 'attacking') {
    return this.generateAbilityText('SITUATIONAL_MODIFIER', {
      attribute: attribute,
      amount: amount,
      timing: timing
    });
  }

  static createTemporaryModifier(attribute = 'power', amount = 1) {
    return this.generateAbilityText('TEMPORARY_MODIFIER', {
      attribute: attribute,
      amount: amount
    });
  }

  static createCardDraw(amount = 1) {
    return this.generateAbilityText('CARD_DRAW', {
      amount: amount
    });
  }

  static createCardSteal(amount = 1, isRandom = true, source = 'hand') {
    const template = isRandom ? 'CARD_STEAL_RANDOM' : 'CARD_STEAL_TARGETED';
    return this.generateAbilityText(template, {
      amount: amount,
      source: source
    });
  }

  static createDestruction(amount = 1, target = 'unit', isRandom = false, source = null) {
    let template;
    if (target === 'unit') {
      template = 'DESTROY_UNIT';
    } else {
      template = isRandom ? 'DESTROY_CARD_RANDOM' : 'DESTROY_CARD_TARGETED';
    }
    
    const replacements = { amount: amount };
    if (source) {
      replacements.source = source;
    }
    
    return this.generateAbilityText(template, replacements);
  }

  static createImmunity(color = 'black') {
    return this.generateAbilityText('IMMUNITY', {
      color: color
    });
  }
}

// Function to update deck with standardized abilities
export function standardizeAbilities(deck) {
  return deck.map(card => {
    const standardizedAbility = STANDARDIZED_ABILITIES[card.ability];
    
    if (standardizedAbility === null) {
      // This ability should be removed
      return null;
    }
    
    if (standardizedAbility) {
      return {
        ...card,
        ability: standardizedAbility
      };
    }
    
    // If no mapping found, keep original (might be already standardized)
    return card;
  }).filter(card => card !== null); // Remove null cards (filtered abilities)
}

// Validation function to ensure abilities are properly formatted
export function validateAbilityText(abilityText) {
  const text = abilityText.toLowerCase().trim();
  
  // List of required clarity checks
  const checks = {
    hasTargetClarity: true, // Will check if targeting is clear
    hasTimingClarity: true, // Will check if timing is clear
    hasAmountClarity: true, // Will check if amounts are specified
    hasSourceClarity: true  // Will check if sources are clear
  };
  
  // Check for ambiguous language
  const ambiguousTerms = ['some', 'might', 'could', 'maybe', 'sometimes'];
  const hasAmbiguousTerms = ambiguousTerms.some(term => text.includes(term));
  
  if (hasAmbiguousTerms) {
    checks.hasTargetClarity = false;
  }
  
  // Check for missing amounts in numbered effects
  if (text.match(/\b(draw|discard|steal|destroy)\b/) && !text.match(/\d+/)) {
    checks.hasAmountClarity = false;
  }
  
  // Check for clear targeting in destruction/theft
  if (text.includes('destroy') || text.includes('steal')) {
    const hasTargetClarity = text.includes('target') || text.includes('random') || text.includes('opponent');
    checks.hasTargetClarity = hasTargetClarity;
  }
  
  const isValid = Object.values(checks).every(check => check);
  
  return {
    isValid,
    checks,
    issues: Object.entries(checks)
      .filter(([_, isValid]) => !isValid)
      .map(([check]) => check)
  };
}
