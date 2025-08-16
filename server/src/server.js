import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  createInitialGameState, 
  resolveBattle, 
  canFormParty, 
  createParty,
  createPartyWithAbilities,
  canAddCardToParty,
  checkWinCondition,
  resolveBattleWithAbilities 
} from "./gameLogic.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8080", "http://192.168.178.65:8080", "https://guild-battles-client.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: ["http://localhost:8080", "http://192.168.178.65:8080", "https://guild-battles-client.onrender.com"],
  credentials: true
}));

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Room storage
const gameRooms = {};

// Helper function to get room by socket
const getRoomBySocket = (socketId) => {
  return Object.values(gameRooms).find(room => 
    room.players.some(p => p.id === socketId)
  );
};

// Safe deep clone function that handles circular references
const safeDeepClone = (obj, seen = new WeakMap()) => {
  // Handle null, undefined, and primitive types
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle functions (skip them)
  if (typeof obj === 'function') {
    return undefined;
  }
  
  // Handle circular references
  if (seen.has(obj)) {
    return {}; // Return empty object for circular references
  }
  seen.set(obj, true);
  
  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => safeDeepClone(item, seen));
  }
  
  // Handle regular objects
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Skip problematic properties that cause circular references or are not serializable
      if (key === 'abilitySystem' || 
          key === 'temporaryEffects' ||
          key === 'effectExecutor' ||
          key === 'battleManager' ||
          key === 'unitManager' ||
          key === 'activatedManager' ||
          key === 'parsedAbility') {
        continue; // Skip ability system related properties to avoid circular refs
      }
      
      try {
        cloned[key] = safeDeepClone(obj[key], seen);
      } catch (error) {
        // If cloning a property fails, skip it
        console.warn(`Skipping property ${key} due to cloning error:`, error.message);
        continue;
      }
    }
  }
  
  return cloned;
};

// Helper function to create player-specific game state view
const createPlayerView = (gameState, playerId) => {
  // Create a deep copy of the game state (excluding circular references)
  const playerView = safeDeepClone(gameState);
  
  // Hide other players' hands - only show hand for the requesting player
  playerView.players = playerView.players.map(player => {
    if (player.id === playerId) {
      // Keep the current player's hand visible
      return player;
    } else {
      // Hide other players' hands
      return {
        ...player,
        hand: [] // Empty the hand for other players
      };
    }
  });
  
  return playerView;
};

// Helper function to broadcast game state updates to all players with player-specific views
const broadcastGameState = (io, roomId, gameState) => {
  console.log(`📡 broadcastGameState called for room ${roomId}`);
  
  const room = gameRooms[roomId];
  if (!room) {
    console.log(`❌ Room ${roomId} not found in broadcastGameState`);
    return;
  }
  
  console.log(`📈 Broadcasting to ${room.players.length} players`);
  
  // Send personalized views to each player
  room.players.forEach((player, index) => {
    console.log(`📤 Sending gameStateUpdate to player ${index + 1}: ${player.name} (${player.id})`);
    const playerView = createPlayerView(gameState, player.id);
    
    console.log(`📄 Player view for ${player.name}:`, {
      currentPlayer: playerView.currentPlayerIndex,
      phase: playerView.phase,
      playersCount: playerView.players.length,
      deckSize: playerView.deck.length
    });
    
    io.to(player.id).emit("gameStateUpdate", playerView);
  });
  
  console.log(`✅ Broadcast complete for room ${roomId}`);
};

// Helper function to advance turn
const advanceTurn = (gameState, roomId) => {
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  gameState.phase = 'draw';

  // Reset turn-specific state
  gameState.actionChosen = null;
  gameState.cardsDrawnThisTurn = 0;
  gameState.attacksUsedThisTurn = 0; // Reset attacks used
  gameState.partyPlayedThisTurn = false; // Reset party play flag

    // Enhanced final round logic
    if (gameState.finalTurnTrigger) {
      // Find the triggering player
      const triggeringPlayer = gameState.players.find(p => p.id === gameState.finalTurnTrigger);
      const triggeringPlayerScore = triggeringPlayer
        ? triggeringPlayer.units.reduce((sum, unit) => sum + unit.totalValue, 0) - 
          triggeringPlayer.graveyard.reduce((sum, card) => sum + card.value, 0)
        : 0;

      // Get the current player (the one who just finished their turn)
      const currentPlayer = gameState.players[gameState.currentPlayerIndex === 0 ? gameState.players.length - 1 : gameState.currentPlayerIndex - 1];

      // If their score drops below 50, cancel the final round and continue normal play
      if (!triggeringPlayer || triggeringPlayerScore < 50) {
        console.log(`🔄 Final round cancelled - triggering player's score dropped to ${triggeringPlayerScore}`);
        gameState.finalTurnTrigger = null;
        gameState.finalTurnRemaining = 0;
        gameState.winningScore = null;
        io.to(roomId).emit('finalRoundCancelled', {
          reason: 'Triggering player\'s score dropped below 50',
          newScore: triggeringPlayerScore
        });
        // Don't return - continue with normal turn advancement
      }
      // Only decrement if this is NOT the triggering player's turn ending
      else if (gameState.finalTurnRemaining > 0 && currentPlayer.id !== gameState.finalTurnTrigger) {
        gameState.finalTurnRemaining--;
        console.log(`⏰ Final round: ${gameState.finalTurnRemaining} turns remaining (Player ${currentPlayer.name} finished their turn)`);
        
        // Check if we've completed the final round
        if (gameState.finalTurnRemaining === 0) {
          // Calculate final scores for all players
          const finalScores = gameState.players.map(player => {
            const unitScore = player.units.reduce((sum, unit) => sum + unit.totalValue, 0);
            const graveyardPenalty = player.graveyard.reduce((sum, card) => sum + card.value, 0);
            const score = unitScore - graveyardPenalty;
            
            // Find most valuable unit
            const mostValuableUnit = player.units.length > 0 
              ? player.units.reduce((max, unit) => unit.totalValue > max.totalValue ? unit : max)
              : null;
            
            return {
              playerId: player.id,
              playerName: player.name,
              score: score,
              unitScore: unitScore,
              graveyardPenalty: graveyardPenalty,
              mostValuableUnit: mostValuableUnit
            };
          });
          
          // Sort by score to find winner
          finalScores.sort((a, b) => b.score - a.score);
          const winnerData = finalScores[0];
          
          console.log(`🏆 Game ending - Winner: ${winnerData.playerName} with score ${winnerData.score}`);
          
          // End the game
          gameState.gameEnded = true;
          gameState.winner = winnerData.playerName;
          gameState.finalScore = winnerData.score;
          
          // Emit comprehensive game end event with all player data
          io.to(roomId).emit('gameEnded', {
            winner: winnerData.playerName,
            winnerScore: winnerData.score,
            finalScores: finalScores,
            gameState: safeDeepClone(gameState)
          });
          
          // Still broadcast the final game state
          broadcastGameState(io, roomId, gameState);
          
          // Stop turn advancement
          return;
        }
      }
      else if (currentPlayer.id === gameState.finalTurnTrigger) {
        console.log(`⏳ Final round: Triggering player ${currentPlayer.name} is finishing their turn - not decrementing counter yet`);
      }
    }
  // ...existing code...
};

function makeid(length) {
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result           = '';
  let charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("createRoom", ({ playerName }, callback) => {
    const roomId = makeid(5);
    gameRooms[roomId] = {
      id: roomId,
      players: [{ id: socket.id, name: playerName, isHost: true }],
      gameState: null,
      gameStarted: false
    };
    socket.join(roomId);
    callback(roomId);
    
    // Emit lobby update instead of game state
    io.to(roomId).emit("lobbyUpdate", {
      roomId,
      players: gameRooms[roomId].players
    });
  });

  socket.on("joinRoom", ({ roomId, playerName }, callback) => {
    const room = gameRooms[roomId];
    if (room && !room.gameStarted && room.players.length < 6) {
      room.players.push({ id: socket.id, name: playerName, isHost: false });
      socket.join(roomId);
      callback(true);
      
      io.to(roomId).emit("lobbyUpdate", {
        roomId,
        players: room.players
      });
      
      socket.to(roomId).emit("playerJoined", { name: playerName });
    } else {
      callback(false);
    }
  });

  socket.on("reconnectToRoom", ({ roomId, playerName, previousPlayerId }, callback) => {
    console.log(`🔄 Reconnection attempt - Room: ${roomId}, Player: ${playerName}, Previous ID: ${previousPlayerId}`);
    
    const room = gameRooms[roomId];
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      callback({ success: false, reason: "Room no longer exists" });
      return;
    }
    
    // Find if this player was previously in the room
    const existingPlayerIndex = room.players.findIndex(p => 
      p.name === playerName || p.id === previousPlayerId
    );
    
    if (existingPlayerIndex === -1) {
      console.log(`❌ Player ${playerName} not found in room ${roomId}`);
      callback({ success: false, reason: "Player not found in this room" });
      return;
    }
    
    // Update the player's socket ID to the new connection
    const existingPlayer = room.players[existingPlayerIndex];
    const oldSocketId = existingPlayer.id;
    existingPlayer.id = socket.id;
    
    // If game has started, update the game state player ID as well
    if (room.gameState) {
      const gamePlayer = room.gameState.players.find(p => p.id === oldSocketId);
      if (gamePlayer) {
        gamePlayer.id = socket.id;
        console.log(`🎮 Updated game state player ID from ${oldSocketId} to ${socket.id}`);
      }
    }
    
    // Join the room with new socket
    socket.join(roomId);
    
    console.log(`✅ Player ${playerName} successfully reconnected to room ${roomId}`);
    callback({ success: true });
    
    // Notify other players of reconnection
    socket.to(roomId).emit("playerReconnected", { name: playerName });
    
    // Send appropriate state update based on game status
    if (room.gameStarted && room.gameState) {
      // Send current game state to the reconnected player
      console.log(`📡 Sending current game state to reconnected player`);
      broadcastGameState(io, roomId, room.gameState);
    } else {
      // Send lobby state for games that haven't started
      io.to(roomId).emit("lobbyUpdate", {
        roomId,
        players: room.players
      });
    }
  });

  socket.on("startGame", (roomId) => {
    console.log(`🎮 StartGame request received for room: ${roomId}`);
    
    const room = gameRooms[roomId];
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }
    
    console.log(`🏠 Room found - Players: ${room.players.length}, Started: ${room.gameStarted}`);
    
    if (room && room.players.length >= 2 && !room.gameStarted) {
      console.log(`✅ Starting game for room ${roomId}`);
      
      room.gameStarted = true;
      
      try {
        console.log(`🎲 Creating initial game state...`);
        room.gameState = createInitialGameState(room.players.map(p => p.name));
        console.log(`✅ Initial game state created:`, {
          players: room.gameState.players.length,
          currentPlayer: room.gameState.currentPlayerIndex,
          phase: room.gameState.phase,
          deckSize: room.gameState.deck.length
        });
        
        // Map socket IDs to player IDs
        room.gameState.players.forEach((player, index) => {
          player.id = room.players[index].id;
          console.log(`👤 Mapped player ${index}: ${player.name} -> ${player.id}`);
        });
        
        // Emit game started event first
        console.log(`📡 Emitting gameStarted event to room ${roomId}`);
        io.to(roomId).emit("gameStarted", {
          message: "Game is starting!",
          roomId: roomId
        });
        
        // Then broadcast the initial game state
        console.log(`📊 Broadcasting initial game state to room ${roomId}`);
        broadcastGameState(io, roomId, room.gameState);
        console.log(`✅ Game start complete for room ${roomId}`);
        
      } catch (error) {
        console.error(`💥 Error starting game for room ${roomId}:`, error);
        io.to(roomId).emit("error", "Failed to start game: " + error.message);
      }
    } else {
      console.log(`❌ Cannot start game - insufficient players or already started`);
    }
  });

  socket.on("drawCard", ({ roomId, fromDiscard, cardsDrawn }) => {
    const room = gameRooms[roomId];
    if (!room || !room.gameState) return;
    
    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.id !== socket.id || gameState.phase !== 'draw') return;
    
    // Check if already drawn 2 cards this turn
    if (gameState.cardsDrawnThisTurn >= 2) return;
    
    let cardDrawn = false;
    if (fromDiscard && gameState.discardPile.length > 0) {
      const card = gameState.discardPile.pop();
      currentPlayer.hand.push(card);
      cardDrawn = true;
    } else if (!fromDiscard && gameState.deck.length > 0) {
      const card = gameState.deck.pop();
      currentPlayer.hand.push(card);
      cardDrawn = true;
    }
    
    if (cardDrawn) {
      gameState.cardsDrawnThisTurn++;
      
      // Check if drawn enough cards (2) to move to play phase
      if (gameState.cardsDrawnThisTurn >= 2) {
        gameState.phase = 'play';
      }
    }
    
    broadcastGameState(io, roomId, gameState);
  }, []);

  socket.on("playParty", async ({ roomId, cardIds }) => {
    const room = gameRooms[roomId];
    if (!room || !room.gameState) return;

    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (currentPlayer.id !== socket.id || gameState.phase !== 'play') return;

    // Restrict to one party per turn
    if (gameState.partyPlayedThisTurn) {
      socket.emit('partyPlayBlocked', { reason: 'You can only play one party per turn.' });
      return;
    }

    const selectedCards = currentPlayer.hand.filter(card => cardIds.includes(card.id));
    if (canFormParty(selectedCards) && selectedCards.length >= 3) {
      // Use enhanced party creation with ability processing
      const partyResult = await createPartyWithAbilities(gameState, selectedCards, currentPlayer.id, { roomId });
      
      currentPlayer.parties.push(partyResult.party);
      currentPlayer.hand = currentPlayer.hand.filter(card => !cardIds.includes(card.id));
      
      // Handle any player input requirements from abilities
      if (partyResult.requiresPlayerInput && partyResult.requiresPlayerInput.length > 0) {
        // Emit ability prompts to the player
        partyResult.requiresPlayerInput.forEach(prompt => {
          io.to(currentPlayer.id).emit('abilityPrompt', {
            type: 'partyFormation',
            cardId: prompt.cardId,
            effect: prompt.effect,
            options: prompt.result.options || []
          });
        });
      }

      // Mark that a party has been played this turn
      gameState.partyPlayedThisTurn = true;

      // Check win condition
      const winCondition = checkWinCondition(gameState.players);
      if (winCondition.finalTurnTriggered && !gameState.finalTurnTrigger) {
        gameState.finalTurnTrigger = winCondition.triggeringPlayerId;
        // Give all OTHER players one turn each to respond
        gameState.finalTurnRemaining = gameState.players.length - 1;
        gameState.winningScore = winCondition.winningScore;
        
        console.log(`🚨 Final round triggered by party formation - Player: ${winCondition.winner.name}, Score: ${winCondition.winningScore}, Turns remaining: ${gameState.finalTurnRemaining}`);
        
        // Notify all players that final round has started
        io.to(roomId).emit('finalRoundStarted', {
          triggeringPlayer: winCondition.winner.name,
          score: winCondition.winningScore
        });
      }

      broadcastGameState(io, roomId, gameState);
    }
  });

  socket.on("chooseAction", ({ roomId, action }) => {
    console.log(`🎯 Server received chooseAction: ${action} for room ${roomId} from socket ${socket.id}`);
    const room = gameRooms[roomId];
    if (!room || !room.gameState) {
      console.log('❌ No room or game state found');
      return;
    }
    
    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    console.log(`👤 Current player: ${currentPlayer.id}, requesting player: ${socket.id}, phase: ${gameState.phase}`);
    
    if (currentPlayer.id !== socket.id || gameState.phase !== 'play') {
      console.log('❌ Not current player or wrong phase');
      return;
    }
    
    console.log(`✅ Valid chooseAction request, changing phase from ${gameState.phase} to ${action}`);
    
    // Store the action choice in game state
    gameState.actionChosen = action;
    
    if (action === 'attack') {
      // Check if there are any enemy parties on the table
      const enemyParties = gameState.players
        .filter(player => player.id !== currentPlayer.id)
        .flatMap(player => player.parties)
        .filter(party => party.cards && party.cards.length > 0);
      
      if (enemyParties.length === 0) {
        console.log('❌ Attack blocked - no enemy parties on the table');
        // Send error message to the player
        socket.emit('attackBlocked', { 
          reason: 'No enemy parties available to attack' 
        });
        return;
      }
      
      console.log(`✅ Attack allowed - found ${enemyParties.length} enemy parties`);
      gameState.phase = 'attack';
    } else if (action === 'discard') {
      gameState.phase = 'discard';
    }
    
    console.log(`📡 Broadcasting game state update with new phase: ${gameState.phase} and actionChosen: ${gameState.actionChosen}`);
    broadcastGameState(io, roomId, gameState);
  });

  socket.on("discardCard", ({ roomId, cardId }) => {
    const room = gameRooms[roomId];
    if (!room || !room.gameState) return;
    
    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.id !== socket.id || gameState.phase !== 'discard') return;
    
    const cardIndex = currentPlayer.hand.findIndex(card => card.id === cardId);
    if (cardIndex !== -1) {
      const [discardedCard] = currentPlayer.hand.splice(cardIndex, 1);
      gameState.discardPile.push(discardedCard);
      
      // End turn
      advanceTurn(gameState, roomId);
      broadcastGameState(io, roomId, gameState);
    }
  });

  socket.on("attackParty", ({ roomId, attackerCardId, targetPartyId }) => {
    console.log(`⚔️ Attack initiated - Room: ${roomId}, Attacker: ${attackerCardId}, Target: ${targetPartyId}`);
    
    const room = gameRooms[roomId];
    if (!room || !room.gameState) {
      console.log('❌ No room or game state found');
      return;
    }
    
    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.id !== socket.id || gameState.phase !== 'attack') {
      console.log(`❌ Invalid attack - Player: ${currentPlayer.id} vs ${socket.id}, Phase: ${gameState.phase}`);
      return;
    }
    
    // Find attacker card in current player's hand or parties
    let attackerCard = currentPlayer.hand.find(c => c.id === attackerCardId);
    let attackerFromHand = true;
    
    if (!attackerCard) {
      // If not in hand, check parties
      attackerCard = currentPlayer.parties.flatMap(p => p.cards).find(c => c.id === attackerCardId);
      attackerFromHand = false;
    }
    
    if (!attackerCard) {
      console.log('❌ Attacker card not found in player hand or parties');
      return;
    }
    
    console.log(`🎯 Found attacker card in ${attackerFromHand ? 'hand' : 'parties'}: ${attackerCard.name}`);
    
    // Find target party (can belong to any player)
    const targetParty = gameState.players.flatMap(p => p.parties).find(p => p.id === targetPartyId);
    if (!targetParty) {
      console.log('❌ Target party not found');
      return;
    }
    
    // Cannot attack own parties
    if (targetParty.playerId === currentPlayer.id) {
      console.log('❌ Cannot attack own parties');
      return;
    }
    
    console.log(`✅ Valid attack initiated`);
    
    // Create battle state - defender will choose their card
    const battleState = {
      attacker: {
        playerId: currentPlayer.id,
        card: attackerCard,
        fromHand: attackerFromHand
      },
      defender: {
        playerId: targetParty.playerId
      },
      targetParty,
      isActive: true,
      status: 'waiting_for_defender'
    };
    
    // Store battle state in game state
    gameState.battleState = battleState;
    gameState.phase = 'battle';
    
    // Emit battle start event
    io.to(roomId).emit('battleStart', battleState);
    
    broadcastGameState(io, roomId, gameState);
  });

  socket.on("defendWithCard", ({ roomId, cardId, fromHand }) => {
    console.log(`🛡️ Defense card chosen - Room: ${roomId}, Card: ${cardId}, From hand: ${fromHand}`);
    
    const room = gameRooms[roomId];
    if (!room || !room.gameState || !room.gameState.battleState) {
      console.log('❌ No battle in progress');
      return;
    }
    
    const gameState = room.gameState;
    const battleState = gameState.battleState;
    
    if (battleState.defender.playerId !== socket.id) {
      console.log('❌ Not the defending player');
      return;
    }
    
    const defender = gameState.players.find(p => p.id === socket.id);
    let defenderCard;
    
    if (fromHand) {
      defenderCard = defender.hand.find(c => c.id === cardId);
    } else {
      // Find card in defender's units
      defenderCard = defender.units.flatMap(u => u.cards).find(c => c.id === cardId);
    }
    
    if (!defenderCard) {
      console.log('❌ Defender card not found');
      return;
    }
    
    console.log(`✅ Resolving battle`);
    
    // Resolve battle using legacy system for now
    const battleResult = resolveBattle(battleState.attacker.card, defenderCard, false, fromHand);
    
      // Handle battle results
      if (battleResult.winner === 'attacker') {
        console.log('🏆 Attacker wins!');
        
        // Set up kidnap choice FIRST, before moving cards to graveyard
        let availableCards = [...battleState.targetParty.cards]; // Cards remaining in the target party
        
        // Add the defender card that was just defeated
        // availableCards.push(defenderCard);
        
        if (availableCards.length > 0) {
          console.log('🎭 Setting up kidnap choice for attacker');
          gameState.kidnapChoice = {
            playerId: battleState.attacker.playerId,
            targetParty: battleState.targetParty,
            availableCards: availableCards,
            defenderCardUsed: defenderCard, // Always include the defender card used
            defenderCardFromHand: fromHand // Track where the defender card came from
          };
          
          // Emit kidnap choice event ONLY to the attacker
          io.to(battleState.attacker.playerId).emit('kidnapChoice', gameState.kidnapChoice);
        }      // Now remove defender card (but don't put it in graveyard yet - kidnap might take it)
      if (fromHand) {
        defender.hand = defender.hand.filter(c => c.id !== cardId);
        // Don't add to graveyard yet - kidnap choice will handle this
      } else {
        // Remove card from party and potentially destroy party
        for (const party of defender.parties) {
          const cardIndex = party.cards.findIndex(c => c.id === cardId);
          if (cardIndex !== -1) {
            party.cards.splice(cardIndex, 1);
            party.totalValue -= defenderCard.value;
            // Don't add to graveyard yet - kidnap choice will handle this
            
            // If party has no cards left, remove it
            if (party.cards.length === 0) {
              defender.parties = defender.parties.filter(p => p.id !== party.id);
            }
            break;
          }
        }
      }
      
    } else {
      console.log('🏆 Defender wins!');
      
      // Remove attacker card from its party
      const attacker = gameState.players.find(p => p.id === battleState.attacker.playerId);
      for (const party of attacker.parties) {
        const cardIndex = party.cards.findIndex(c => c.id === battleState.attacker.card.id);
        if (cardIndex !== -1) {
          party.cards.splice(cardIndex, 1);
          party.totalValue -= battleState.attacker.card.value;
          attacker.graveyard.push(battleState.attacker.card);
          
          // If party has no cards left, remove it
          if (party.cards.length === 0) {
            attacker.parties = attacker.parties.filter(p => p.id !== party.id);
          }
          break;
        }
      }
    }
    
    // Track that an attack was used this turn
    gameState.attacksUsedThisTurn = (gameState.attacksUsedThisTurn || 0) + 1;
    
    // Emit battle end event
    io.to(roomId).emit('battleEnd', {
      winner: battleResult.winner,
      attackerCard: battleState.attacker.card,
      defenderCard: defenderCard
    });
    
    // Clear battle state
    gameState.battleState = null;
    
    // Only end turn if there's no kidnap choice pending
    if (!gameState.kidnapChoice) {
      advanceTurn(gameState, roomId);
    } else {
      // Return to play phase to allow kidnap choice handling
      gameState.phase = 'play';
    }
    
    broadcastGameState(io, roomId, gameState);
  });

  socket.on("reinforceParty", ({ roomId, cardId, partyId }) => {
    console.log(`🔧 Reinforcement attempted - Room: ${roomId}, Card: ${cardId}, Party: ${partyId}`);
    
    const room = gameRooms[roomId];
    if (!room || !room.gameState) {
      console.log('❌ No room or game state found');
      return;
    }
    
    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    console.log(`👤 Current player: ${currentPlayer.id}, requesting player: ${socket.id}, phase: ${gameState.phase}`);
    
    // Allow reinforcement during play phase
    if (currentPlayer.id !== socket.id) {
      console.log('❌ Not the current player');
      return;
    }
    
    if (gameState.phase !== 'play') {
      console.log(`❌ Wrong phase: ${gameState.phase}`);
      return;
    }
    
    const card = currentPlayer.hand.find(c => c.id === cardId);
    if (!card) {
      console.log('❌ Card not found in player hand');
      return;
    }
    
    const unit = gameState.players.flatMap(p => p.units).find(u => u.id === unitId);
    if (!unit) {
      console.log('❌ Unit not found');
      return;
    }
    
    // Can only reinforce own units
    if (unit.playerId !== currentPlayer.id) {
      console.log('❌ Cannot reinforce enemy units');
      return;
    }
    
    const canAdd = canAddCardToUnit(card, unit);
    console.log(`📄 Can add card to unit: ${canAdd}`);
    console.log(`📋 Card: ${card.name} (${card.color})`);
    console.log(`📋 Unit colors: ${unit.cards.map(c => c.color).join(', ')}`);
    
    if (canAdd) {
      // Remove card from hand
      currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== cardId);
      
      // Add to unit
      unit.cards.push(card);
      unit.totalValue += card.value;
      
      console.log(`✅ Card ${card.name} successfully added to unit. New unit value: ${unit.totalValue}`);
      
      // Check win condition after reinforcement
      const winCondition = checkWinCondition(gameState.players);
      if (winCondition.finalTurnTriggered && !gameState.finalTurnTrigger) {
        gameState.finalTurnTrigger = winCondition.triggeringPlayerId;
        // Give all OTHER players one turn each to respond
        gameState.finalTurnRemaining = gameState.players.length - 1;
        gameState.winningScore = winCondition.winningScore;
        
        console.log(`🚨 Final round triggered by reinforcement - Player: ${winCondition.winner.name}, Score: ${winCondition.winningScore}, Turns remaining: ${gameState.finalTurnRemaining}`);
        
        // Notify all players that final round has started
        io.to(roomId).emit('finalRoundStarted', {
          triggeringPlayer: winCondition.winner.name,
          score: winCondition.winningScore
        });
      }
      
      broadcastGameState(io, roomId, gameState);
    } else {
      console.log('❌ Cannot add card to unit - color rules violated');
    }
  });

  socket.on("kidnap", ({ roomId, cardId }) => {
    console.log(`🎭 Kidnap attempted - Room: ${roomId}, Card: ${cardId}`);
    
    const room = gameRooms[roomId];
    if (!room || !room.gameState || !room.gameState.kidnapChoice) {
      console.log('❌ No kidnap choice in progress');
      return;
    }
    
    const gameState = room.gameState;
    const kidnapChoice = gameState.kidnapChoice;
    
    if (kidnapChoice.playerId !== socket.id) {
      console.log('❌ Not the kidnapping player');
      return;
    }
    
    const selectedCard = kidnapChoice.availableCards.find(c => c.id === cardId);
    if (!selectedCard) {
      console.log('❌ Invalid card selection for kidnap');
      return;
    }
    
    const currentPlayer = gameState.players.find(p => p.id === socket.id);
    
    // Handle kidnapping - card could be from target unit or the defender card that was used in battle
    const targetUnit = kidnapChoice.targetUnit;
    const defenderCardUsed = kidnapChoice.defenderCardUsed;
    const defender = gameState.players.find(p => p.id === targetUnit.playerId);
    
    // Check if this is the defender card that was used in battle
    if (defenderCardUsed && defenderCardUsed.id === cardId) {
      // Kidnapping the defender card - it never went to graveyard, just remove it from availability
      console.log(`🎭 Kidnapping defender card: ${selectedCard.name}`);
    } else {
      // Remove the kidnapped card from the target unit
      const cardIndex = targetUnit.cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        targetUnit.cards.splice(cardIndex, 1);
        targetUnit.totalValue -= selectedCard.value;
        
        // If unit has no cards left, remove it
        if (targetUnit.cards.length === 0) {
          const unitOwner = gameState.players.find(p => p.id === targetUnit.playerId);
          if (unitOwner) {
            unitOwner.units = unitOwner.units.filter(u => u.id !== targetUnit.id);
          }
        }
      }
    }
    
    // Put any remaining non-kidnapped cards from the battle into graveyard
    if (defenderCardUsed && defenderCardUsed.id !== cardId && defender) {
      // The defender card was not kidnapped, so put it in graveyard
      defender.graveyard.push(defenderCardUsed);
    }
    
    // Add kidnapped card to player's hand
    currentPlayer.hand.push(selectedCard);
    
    console.log(`✅ Card ${selectedCard.name} kidnapped successfully`);
    
    // Clear kidnap choice and end turn
    gameState.kidnapChoice = null;
    
    // End turn after kidnap is complete
    advanceTurn(gameState, roomId);
    
    broadcastGameState(io, roomId, gameState);
  });

  socket.on("skipKidnap", ({ roomId }) => {
    console.log(`⏭️ Kidnap skipped - Room: ${roomId}`);
    
    const room = gameRooms[roomId];
    if (!room || !room.gameState || !room.gameState.kidnapChoice) {
      console.log('❌ No kidnap choice in progress');
      return;
    }
    
    const gameState = room.gameState;
    const kidnapChoice = gameState.kidnapChoice;
    
    if (kidnapChoice.playerId !== socket.id) {
      console.log('❌ Not the kidnapping player');
      return;
    }
    
    console.log('✅ Kidnap skipped successfully');
    
    // Put the defender card in graveyard since it wasn't kidnapped
    const defenderCardUsed = kidnapChoice.defenderCardUsed;
    if (defenderCardUsed) {
      const defender = gameState.players.find(p => p.id === kidnapChoice.targetUnit.playerId);
      if (defender) {
        defender.graveyard.push(defenderCardUsed);
      }
    }
    
    // Clear kidnap choice and end turn
    gameState.kidnapChoice = null;
    
    // End turn after kidnap is skipped
    advanceTurn(gameState, roomId);
    
    broadcastGameState(io, roomId, gameState);
  });

  socket.on("activateAbility", async ({ roomId, cardId, targetSelections }) => {
    console.log(`🎯 Manual ability activation - Room: ${roomId}, Card: ${cardId}`);
    
    const room = gameRooms[roomId];
    if (!room || !room.gameState) {
      console.log('❌ No room or game state found');
      return;
    }
    
    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.id !== socket.id || gameState.phase !== 'play') {
      console.log('❌ Not current player or wrong phase');
      return;
    }

    try {
      const { GameAbilitySystem } = await import('./abilities/battleIntegration.js');
      const abilitySystem = new GameAbilitySystem(gameState);
      
      const result = await abilitySystem.activatedManager.activateAbility(
        cardId, 
        currentPlayer.id, 
        targetSelections || {}
      );
      
      if (result.success) {
        console.log('✅ Ability activated successfully');
        
        // Handle any player input requirements from the ability effect
        if (result.requiresPlayerInput && result.requiresPlayerInput.length > 0) {
          result.requiresPlayerInput.forEach(prompt => {
            io.to(currentPlayer.id).emit('abilityPrompt', {
              type: 'manualActivation',
              cardId: cardId,
              effect: prompt.effect,
              options: prompt.result.options || []
            });
          });
        }
        
        // Emit success message to player
        socket.emit('abilityActivated', {
          cardId: cardId,
          results: result.results
        });
        
        broadcastGameState(io, roomId, gameState);
      } else {
        console.log(`❌ Ability activation failed: ${result.error}`);
        socket.emit('abilityActivationFailed', {
          cardId: cardId,
          error: result.error
        });
      }
    } catch (error) {
      console.error('💥 Error during ability activation:', error);
      socket.emit('abilityActivationFailed', {
        cardId: cardId,
        error: 'Server error during ability activation'
      });
    }
  });

  socket.on("getAvailableAbilities", ({ roomId }) => {
    const room = gameRooms[roomId];
    if (!room || !room.gameState) return;
    
    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.id !== socket.id) return;
    
    try {
      import('./abilities/battleIntegration.js').then(({ GameAbilitySystem }) => {
        const abilitySystem = new GameAbilitySystem(gameState);
        const availableAbilities = abilitySystem.getAvailableAbilities(currentPlayer.id);
        
        socket.emit('availableAbilities', {
          abilities: availableAbilities
        });
      });
    } catch (error) {
      console.error('💥 Error getting available abilities:', error);
    }
  });

  socket.on("endTurn", ({ roomId }) => {
    const room = gameRooms[roomId];
    if (!room || !room.gameState) return;
    
    const gameState = room.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.id !== socket.id) return;
    
    advanceTurn(gameState, roomId);
    broadcastGameState(io, roomId, gameState);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find and handle room cleanup for disconnected player
    const room = getRoomBySocket(socket.id);
    if (room) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const playerName = room.players[playerIndex].name;
        
        if (room.gameStarted) {
          // For started games, mark player as disconnected but don't remove them
          // This allows for reconnection with preserved game state
          console.log(`📴 Player ${playerName} disconnected from active game in room ${room.id}`);
          socket.to(room.id).emit("playerDisconnected", { name: playerName });
          
          // Set a timeout to remove the player after 10 minutes if no reconnection
          setTimeout(() => {
            const currentRoom = gameRooms[room.id];
            if (currentRoom) {
              const stillDisconnectedIndex = currentRoom.players.findIndex(p => 
                p.name === playerName && p.id === socket.id
              );
              
              if (stillDisconnectedIndex !== -1) {
                console.log(`⏰ Removing ${playerName} after timeout - no reconnection`);
                currentRoom.players.splice(stillDisconnectedIndex, 1);
                
                // Update game state as well
                if (currentRoom.gameState) {
                  const gamePlayerIndex = currentRoom.gameState.players.findIndex(p => p.id === socket.id);
                  if (gamePlayerIndex !== -1) {
                    currentRoom.gameState.players.splice(gamePlayerIndex, 1);
                  }
                }
                
                if (currentRoom.players.length === 0) {
                  delete gameRooms[room.id];
                } else {
                  io.to(room.id).emit("playerRemoved", { name: playerName });
                }
              }
            }
          }, 10 * 60 * 1000); // 10 minutes timeout
          
        } else {
          // For lobby games, remove player immediately
          console.log(`🚪 Player ${playerName} left lobby in room ${room.id}`);
          room.players.splice(playerIndex, 1);
          
          if (room.players.length === 0) {
            delete gameRooms[room.id];
          } else {
            // Assign host to first remaining player if host left
            if (room.players[0] && !room.players.some(p => p.isHost)) {
              room.players[0].isHost = true;
            }
            
            io.to(room.id).emit("playerLeft", { name: playerName });
            io.to(room.id).emit("lobbyUpdate", {
              roomId: room.id,
              players: room.players
            });
          }
        }
      }
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

