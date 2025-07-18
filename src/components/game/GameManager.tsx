import React, { useState, useCallback } from 'react';
import { GameState, BattleState, DrawChoice, GameCard, Unit } from '@/types/game';
import { GameBoard } from './GameBoard';
import { BattleModal } from './BattleModal';
import { KidnapModal } from './KidnapModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  createInitialGameState,
  canFormUnit,
  createUnit,
  calculateTotalValue,
  checkWinCondition,
  getAvailableCards,
  resolveBattle,
  canAddCardToUnit
} from '@/utils/gameLogic';
import { cn } from '@/lib/utils';
import { Users, Play, Trophy } from 'lucide-react';

export const GameManager: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1', 'Player 2']);
  const [gameSetup, setGameSetup] = useState(true);
  const [attackUsed, setAttackUsed] = useState(false);
  const [kidnapChoice, setKidnapChoice] = useState<{ targetUnit: Unit; availableCards: GameCard[] } | null>(null);
  const { toast } = useToast();

  const startGame = useCallback(() => {
    try {
      const initialState = createInitialGameState(playerNames.filter(name => name.trim()));
      setGameState(initialState);
      setGameSetup(false);
      toast({
        title: "Game Started!",
        description: `${playerNames.length} players are ready to battle!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [playerNames, toast]);

  const handleDrawCards = useCallback((choice: DrawChoice) => {
    if (!gameState) return;

    const newGameState = { ...gameState };
    const currentPlayer = newGameState.players[newGameState.currentPlayerIndex];
    
    // Draw from deck
    for (let i = 0; i < choice.deckCount; i++) {
      if (newGameState.deck.length > 0) {
        const card = newGameState.deck.pop()!;
        currentPlayer.hand.push(card);
      }
    }
    
    // Draw from discard pile
    for (let i = 0; i < choice.discardCount; i++) {
      if (newGameState.discardPile.length > 0) {
        const card = newGameState.discardPile.pop()!;
        currentPlayer.hand.push(card);
      }
    }
    
    newGameState.phase = 'play';
    setGameState(newGameState);
    setSelectedCards([]);
  }, [gameState]);

  const handlePlayUnit = useCallback((cardIds: string[]) => {
    if (!gameState || cardIds.length < 3) return;

    const newGameState = { ...gameState };
    const currentPlayer = newGameState.players[newGameState.currentPlayerIndex];
    
    // Check if player would have only 1 card left and hasn't attacked (will need to discard)
    const remainingCards = currentPlayer.hand.length - cardIds.length;
    if (remainingCards === 1 && !attackUsed) {
      toast({
        title: "Cannot Play Unit",
        description: "You cannot play your last card unless you have attacked this turn, as you must discard at least one card.",
        variant: "destructive",
      });
      return;
    }
    
    // Get the selected cards
    const selectedCards = cardIds.map(id => 
      currentPlayer.hand.find(card => card.id === id)!
    );
    
    // Check if cards can form a unit
    if (!canFormUnit(selectedCards)) {
      toast({
        title: "Invalid Unit",
        description: "Cards must be the same color or include white cards with other cards of the same color (minimum 3 cards).",
        variant: "destructive",
      });
      return;
    }
    
    // Remove cards from hand
    currentPlayer.hand = currentPlayer.hand.filter(card => !cardIds.includes(card.id));
    
    // Create unit
    const unit = createUnit(selectedCards, currentPlayer.id);
    currentPlayer.units.push(unit);
    
    // Check win condition
    const { winner, finalTurnTriggered } = checkWinCondition(newGameState.players);
    if (finalTurnTriggered && !newGameState.finalTurnTrigger) {
      newGameState.finalTurnTrigger = currentPlayer.id;
      newGameState.finalTurnRemaining = newGameState.players.length - 1;
    }
    
    newGameState.phase = 'attack';
    setGameState(newGameState);
    setSelectedCards([]);
    
    toast({
      title: "Unit Played!",
      description: `Created unit with value ${unit.totalValue}`,
    });
  }, [gameState, toast, attackUsed]);

  const handleAttackUnit = useCallback((attackerCardId: string, targetUnitId: string) => {
    if (!gameState || attackUsed) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const targetUnit = gameState.players
      .flatMap(p => p.units)
      .find(u => u.id === targetUnitId);
    
    if (!targetUnit) return;

    // Find attacker card
    const attackerCard = currentPlayer.hand.find(c => c.id === attackerCardId) ||
                        currentPlayer.units.flatMap(u => u.cards).find(c => c.id === attackerCardId);
    
    if (!attackerCard) return;

    const fromHand = currentPlayer.hand.some(c => c.id === attackerCardId);
    const targetPlayer = gameState.players.find(p => p.id === targetUnit.playerId)!;
    
    // Set up battle
    setBattleState({
      attacker: {
        playerId: currentPlayer.id,
        card: attackerCard,
        fromHand
      },
      defender: {
        playerId: targetPlayer.id
      },
      targetUnit,
      isActive: true
    });
    
    setAttackUsed(true);
  }, [gameState, attackUsed]);

  const handleDefend = useCallback((cardId: string, fromHand: boolean) => {
    if (!battleState) return;

    const defenderPlayer = gameState!.players.find(p => p.id === battleState.defender.playerId)!;
    const defenderCard = fromHand 
      ? defenderPlayer.hand.find(c => c.id === cardId)
      : defenderPlayer.units.flatMap(u => u.cards).find(c => c.id === cardId);
    
    if (!defenderCard) return;

    setBattleState({
      ...battleState,
      defender: {
        ...battleState.defender,
        card: defenderCard,
        fromHand
      }
    });
  }, [battleState, gameState]);

  const handleResolveBattle = useCallback(() => {
    if (!battleState || !gameState || !battleState.defender.card) return;

    const result = resolveBattle(
      battleState.attacker.card,
      battleState.defender.card,
      battleState.attacker.fromHand,
      battleState.defender.fromHand!
    );

    const newGameState = { ...gameState };
    const attackerPlayer = newGameState.players.find(p => p.id === battleState.attacker.playerId)!;
    const defenderPlayer = newGameState.players.find(p => p.id === battleState.defender.playerId)!;

    // Remove defending card from unit if it came from a unit
    if (!battleState.defender.fromHand) {
      const targetUnit = defenderPlayer.units.find(u => u.id === battleState.targetUnit.id)!;
      targetUnit.cards = targetUnit.cards.filter(c => c.id !== battleState.defender.card!.id);
      targetUnit.totalValue -= battleState.defender.card!.value;
      
      // If unit is empty after removing defending card, remove the unit
      if (targetUnit.cards.length === 0) {
        defenderPlayer.units = defenderPlayer.units.filter(u => u.id !== targetUnit.id);
      }
    }

    if (result.winner === 'attacker') {
      // Attacker wins - let them choose which card to kidnap from target unit
      const targetUnit = defenderPlayer.units.find(u => u.id === battleState.targetUnit.id);
      const availableCards = [...(targetUnit?.cards || [])];
      // Also include the defending card that just lost
      if (battleState.defender.card) {
        availableCards.push(battleState.defender.card);
      }
      
      if (availableCards.length > 0) {
        setKidnapChoice({ targetUnit: targetUnit || battleState.targetUnit, availableCards });
        // Don't resolve battle yet - wait for kidnap choice
        return;
      }
    }

    // Move battle cards to appropriate places
    if (battleState.attacker.fromHand) {
      attackerPlayer.hand = attackerPlayer.hand.filter(c => c.id !== battleState.attacker.card.id);
      attackerPlayer.graveyard.push(battleState.attacker.card);
    }
    
    if (battleState.defender.fromHand) {
      defenderPlayer.hand = defenderPlayer.hand.filter(c => c.id !== battleState.defender.card.id);
    }
    // Defending card always goes to defending player's graveyard
    defenderPlayer.graveyard.push(battleState.defender.card);

    // After attack, go to reinforce phase instead of discard
    newGameState.phase = 'reinforce';

    setGameState(newGameState);
    setBattleState(null);
    setSelectedCards([]);

    toast({
      title: "Battle Resolved!",
      description: `${result.winner === 'attacker' ? 'Attacker' : 'Defender'} wins!`,
    });
  }, [battleState, gameState, toast]);

  const handleKidnapChoice = useCallback((cardId: string) => {
    if (!battleState || !gameState || !kidnapChoice) return;

    const newGameState = { ...gameState };
    const attackerPlayer = newGameState.players.find(p => p.id === battleState.attacker.playerId)!;
    const defenderPlayer = newGameState.players.find(p => p.id === battleState.defender.playerId)!;
    const targetUnit = defenderPlayer.units.find(u => u.id === battleState.targetUnit.id);

    const cardToKidnap = kidnapChoice.availableCards.find(c => c.id === cardId)!;
    
    // If the kidnapped card is from the unit (not the defending card), remove it from unit
    if (targetUnit && targetUnit.cards.some(c => c.id === cardId)) {
      targetUnit.cards = targetUnit.cards.filter(c => c.id !== cardId);
      targetUnit.totalValue -= cardToKidnap.value;
      
      // If unit is empty, remove it
      if (targetUnit.cards.length === 0) {
        defenderPlayer.units = defenderPlayer.units.filter(u => u.id !== targetUnit.id);
      }
    } else {
      // If it's the defending card, remove it from graveyard (it was added during battle resolution)
      defenderPlayer.graveyard = defenderPlayer.graveyard.filter(c => c.id !== cardId);
    }
    
    // Add to attacker's hand
    attackerPlayer.hand.push(cardToKidnap);

    // Move battle cards to appropriate places
    if (battleState.attacker.fromHand) {
      attackerPlayer.hand = attackerPlayer.hand.filter(c => c.id !== battleState.attacker.card.id);
      attackerPlayer.graveyard.push(battleState.attacker.card);
    }
    
    if (battleState.defender.fromHand) {
      defenderPlayer.hand = defenderPlayer.hand.filter(c => c.id !== battleState.defender.card.id);
    }
    
    // If the kidnapped card is NOT the defending card, defending card goes to graveyard
    if (cardToKidnap.id !== battleState.defender.card?.id) {
      defenderPlayer.graveyard.push(battleState.defender.card!);
    }

    // After attack, go to reinforce phase instead of discard
    newGameState.phase = 'reinforce';

    setGameState(newGameState);
    setBattleState(null);
    setKidnapChoice(null);
    setSelectedCards([]);

    toast({
      title: "Battle Resolved!",
      description: `Attacker wins and kidnapped a ${cardToKidnap.color} ${cardToKidnap.value}!`,
    });
  }, [battleState, gameState, kidnapChoice, toast]);

  const handleSkipKidnap = useCallback(() => {
    if (!battleState || !gameState) return;

    const newGameState = { ...gameState };
    const attackerPlayer = newGameState.players.find(p => p.id === battleState.attacker.playerId)!;
    const defenderPlayer = newGameState.players.find(p => p.id === battleState.defender.playerId)!;

    // Move battle cards to appropriate places without kidnapping
    if (battleState.attacker.fromHand) {
      attackerPlayer.hand = attackerPlayer.hand.filter(c => c.id !== battleState.attacker.card.id);
      attackerPlayer.graveyard.push(battleState.attacker.card);
    }
    
    if (battleState.defender.fromHand) {
      defenderPlayer.hand = defenderPlayer.hand.filter(c => c.id !== battleState.defender.card.id);
    }
    // Since attacker won but skipped kidnap, defending card goes to defender's graveyard
    defenderPlayer.graveyard.push(battleState.defender.card!);

    // After attack, go to reinforce phase instead of discard
    newGameState.phase = 'reinforce';

    setGameState(newGameState);
    setBattleState(null);
    setKidnapChoice(null);
    setSelectedCards([]);

    toast({
      title: "Battle Resolved!",
      description: "Attacker wins but chose not to kidnap any cards. Defending card goes to graveyard.",
    });
  }, [battleState, gameState, toast]);

  const handleReinforceUnit = useCallback((cardId: string, unitId: string) => {
    if (!gameState) return;

    const newGameState = { ...gameState };
    const currentPlayer = newGameState.players[newGameState.currentPlayerIndex];
    
    // Find the card and unit
    const card = currentPlayer.hand.find(c => c.id === cardId);
    const targetUnit = newGameState.players
      .flatMap(p => p.units)
      .find(u => u.id === unitId);
    
    if (!card || !targetUnit) return;

    // Check if card can be added to unit
    if (!canAddCardToUnit(card, targetUnit)) {
      toast({
        title: "Invalid Reinforcement",
        description: "This card cannot be added to the selected unit due to color restrictions.",
        variant: "destructive",
      });
      return;
    }

    // Add card to unit
    targetUnit.cards.push(card);
    targetUnit.totalValue += card.value;
    
    // Remove card from hand
    currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== cardId);

    setGameState(newGameState);
    setSelectedCards([]);

    toast({
      title: "Unit Reinforced!",
      description: `Added ${card.color} ${card.value} to unit.`,
    });
  }, [gameState, toast]);

  const handleDiscardCard = useCallback((cardId: string) => {
    if (!gameState) return;

    const newGameState = { ...gameState };
    const currentPlayer = newGameState.players[newGameState.currentPlayerIndex];
    
    const card = currentPlayer.hand.find(c => c.id === cardId);
    if (!card) return;

    // Remove from hand and add to discard pile
    currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== cardId);
    newGameState.discardPile.push(card);
    
    // End turn
    newGameState.currentPlayerIndex = (newGameState.currentPlayerIndex + 1) % newGameState.players.length;
    newGameState.phase = 'draw';
    setAttackUsed(false); // Reset attack for new turn
    
    if (newGameState.finalTurnTrigger) {
      newGameState.finalTurnRemaining--;
      if (newGameState.finalTurnRemaining <= 0) {
        newGameState.gameEnded = true;
      }
    }
    
    setGameState(newGameState);
    setSelectedCards([]);
  }, [gameState]);

  const handleEndTurn = useCallback(() => {
    if (!gameState) return;

    const newGameState = { ...gameState };
    
    if (newGameState.phase === 'play') {
      newGameState.phase = 'attack';
      setAttackUsed(false); // Reset attack for new attack phase
    } else if (newGameState.phase === 'attack') {
      // If player attacked, skip discard phase and go directly to next turn
      if (attackUsed) {
        newGameState.currentPlayerIndex = (newGameState.currentPlayerIndex + 1) % newGameState.players.length;
        newGameState.phase = 'draw';
        setAttackUsed(false);
        
        if (newGameState.finalTurnTrigger) {
          newGameState.finalTurnRemaining--;
          if (newGameState.finalTurnRemaining <= 0) {
            newGameState.gameEnded = true;
          }
        }
      } else {
        newGameState.phase = 'reinforce';
      }
    } else if (newGameState.phase === 'reinforce') {
      // If player attacked, skip discard phase and go directly to next turn
      if (attackUsed) {
        newGameState.currentPlayerIndex = (newGameState.currentPlayerIndex + 1) % newGameState.players.length;
        newGameState.phase = 'draw';
        setAttackUsed(false);
        
        if (newGameState.finalTurnTrigger) {
          newGameState.finalTurnRemaining--;
          if (newGameState.finalTurnRemaining <= 0) {
            newGameState.gameEnded = true;
          }
        }
      } else {
        newGameState.phase = 'discard';
      }
    }
    
    setGameState(newGameState);
    setSelectedCards([]);
  }, [gameState, attackUsed]);

  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  }, []);

  const handleUnitSelect = useCallback((unitId: string) => {
    setSelectedUnit(unitId);
  }, []);

  const addPlayer = () => {
    if (playerNames.length < 6) {
      setPlayerNames([...playerNames, `Player ${playerNames.length + 1}`]);
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 2) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  if (gameSetup) {
    return (
      <div className="min-h-screen bg-gradient-table flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gradient-card rounded-lg border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Card Battle Setup</h1>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                Players ({playerNames.length}/6)
              </label>
              <div className="space-y-2">
                {playerNames.map((name, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      placeholder={`Player ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePlayer(index)}
                      disabled={playerNames.length <= 2}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={addPlayer}
                disabled={playerNames.length >= 6}
                className="flex-1"
              >
                Add Player
              </Button>
              <Button 
                onClick={startGame}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  if (gameState.gameEnded) {
    const winner = gameState.players.reduce((prev, current) => 
      calculateTotalValue(current) > calculateTotalValue(prev) ? current : prev
    );
    
    return (
      <div className="min-h-screen bg-gradient-table flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gradient-card rounded-lg border p-6 shadow-card text-center">
          <Trophy className="w-16 h-16 text-accent mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Game Over!</h1>
          <p className="text-xl text-primary mb-4">
            {winner.name} wins with {calculateTotalValue(winner)} points!
          </p>
          <Button onClick={() => setGameSetup(true)} className="w-full">
            Play Again
          </Button>
        </div>
      </div>
    );
  }

  const defenderCards = battleState ? (() => {
    const defender = gameState.players.find(p => p.id === battleState.defender.playerId)!;
    const targetUnit = battleState.targetUnit;
    return [
      ...defender.hand.map(card => ({ id: card.id, card, fromHand: true })),
      ...targetUnit.cards.map(card => ({ id: card.id, card, fromHand: false }))
    ];
  })() : [];

  return (
    <div className="min-h-screen">
      <GameBoard
        gameState={gameState}
        onDrawCards={handleDrawCards}
        onPlayUnit={handlePlayUnit}
        onAttackUnit={handleAttackUnit}
        onDiscardCard={handleDiscardCard}
        onEndTurn={handleEndTurn}
        selectedCards={selectedCards}
        onCardSelect={handleCardSelect}
        onUnitSelect={handleUnitSelect}
        onReinforceUnit={handleReinforceUnit}
        attackUsed={attackUsed}
      />
      
      {battleState && (
        <BattleModal
          battleState={battleState}
          onDefend={handleDefend}
          onResolveBattle={handleResolveBattle}
          onCancelBattle={() => setBattleState(null)}
          defenderCards={defenderCards}
        />
      )}
      
      {kidnapChoice && (
        <KidnapModal
          isOpen={!!kidnapChoice}
          availableCards={kidnapChoice.availableCards}
          onKidnapChoice={handleKidnapChoice}
          onSkip={handleSkipKidnap}
        />
      )}
    </div>
  );
};