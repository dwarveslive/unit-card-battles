import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, BattleState, DrawChoice, GameCard, Unit } from '@/types/game';
import { GameBoard } from './GameBoard';
import { BattleModal } from './BattleModal';
import { KidnapModal } from './KidnapModal';
import { VictoryModal } from './VictoryModal';
import { RoomConnection } from '@/components/lobby/RoomConnection';
import { GameLobby } from '@/components/lobby/GameLobby';
import { ReconnectionPrompt } from '@/components/lobby/ReconnectionPrompt';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useGamePersistence } from '@/hooks/use-game-persistence';
import { WebSocketService } from '@/services/websocket';
import { GameSession } from '@/utils/storage';
import { 
  canFormUnit,
  canAddCardToUnit 
} from '@/utils/gameLogic';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

type AppState = 'connecting' | 'lobby' | 'waiting' | 'playing';

interface LobbyPlayer {
  id: string;
  name: string;
  isHost?: boolean;
}

export const MultiplayerGameManager: React.FC = () => {
  // Connection state
  const [appState, setAppState] = useState<AppState>('connecting');
  const [isConnected, setIsConnected] = useState(false);
  const wsService = useRef<WebSocketService | null>(null);

  // Persistence state
  const [showReconnectionPrompt, setShowReconnectionPrompt] = useState(false);
  const [storedSession, setStoredSession] = useState<GameSession | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Room state
  const [roomId, setRoomId] = useState<string>('');
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [currentPlayerName, setCurrentPlayerName] = useState<string>('');
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [kidnapChoice, setKidnapChoice] = useState<{ targetUnit: Unit; availableCards: GameCard[] } | null>(null);
  const [cardsDrawn, setCardsDrawn] = useState(0);
  const [unitsPlayedThisTurn, setUnitsPlayedThisTurn] = useState(0);
  
  // Victory modal state
  const [victoryData, setVictoryData] = useState<{
    winner: string;
    winnerScore: number;
    finalScores: Array<{
      playerId: string;
      playerName: string;
      score: number;
      unitScore: number;
      graveyardPenalty: number;
      mostValuableUnit: any;
    }>;
  } | null>(null);

  const { toast } = useToast();
  const { saveSession, loadSession, clearSession, hasStoredSession, attemptReconnection } = useGamePersistence();

  const handleResolveBattle = useCallback(() => {
    if (wsService.current) {
      wsService.current.resolveBattle();
    }
  }, []);


  // Initialize WebSocket connection
  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      try {
        // Prevent multiple connections
        if (wsService.current) {
          return;
        }

        console.log('🔄 Initializing WebSocket connection...');
        wsService.current = new WebSocketService();
        
        await wsService.current.connect();
        
        if (!mounted) {
          // Component unmounted during connection
          wsService.current.disconnect();
          return;
        }

        setIsConnected(true);
        setCurrentPlayerId(wsService.current.getSocketId());
        
        // Check for stored session after connection is established
        const session = loadSession();
        if (session) {
          console.log('📱 Found stored session, showing reconnection prompt');
          setStoredSession(session);
          setShowReconnectionPrompt(true);
        } else {
          console.log('🆕 No stored session found, proceeding to lobby');
          setAppState('lobby');
        }

        // Set up event listeners only once
        wsService.current.onGameStarted((data) => {
          console.log('🎮 Game started event received:', data);
          toast({
            title: "Game Started!",
            description: "The battle begins!",
          });
        });

        wsService.current.onGameStateUpdate((newGameState: GameState) => {
          try {
            console.log('📊 Game state update received:', {
              players: newGameState?.players?.length,
              currentPlayer: newGameState?.currentPlayerIndex,
              phase: newGameState?.phase,
              deck: newGameState?.deck?.length,
              fullState: newGameState
            });
            
            // Validate game state structure
            if (!newGameState) {
              console.error('❌ Received null/undefined game state');
              return;
            }
            
            if (!newGameState.players || !Array.isArray(newGameState.players)) {
              console.error('❌ Invalid players array in game state:', newGameState.players);
              return;
            }
            
            if (typeof newGameState.currentPlayerIndex !== 'number') {
              console.error('❌ Invalid currentPlayerIndex:', newGameState.currentPlayerIndex);
              return;
            }
            
            console.log('✅ Game state validation passed, setting state...');
            setGameState(newGameState);
            setAppState('playing');
            console.log('✅ App state set to playing');
            
            // Reset turn-specific state when it's a new turn
            if (newGameState.players[newGameState.currentPlayerIndex]?.id === wsService.current?.getSocketId()) {
              setUnitsPlayedThisTurn(0);
            }
            
          } catch (error) {
            console.error('💥 Error in onGameStateUpdate:', error);
            console.error('💥 Problematic game state:', newGameState);
          }
        });

        wsService.current.onBattleStart((battleData) => {
          console.log('⚔️ BattleStart event received:', {
            playerId: currentPlayerId,
            battleData,
            isAttacker: battleData.attacker.playerId === currentPlayerId,
            isDefender: battleData.defender.playerId === currentPlayerId
          });
          setBattleState(battleData);
        });

        wsService.current.onBattleEnd((result) => {
          setBattleState(null);
          toast({
            title: "Battle Resolved!",
            description: `${result.winner === 'attacker' ? 'Attacker' : 'Defender'} wins!`,
          });
          // Remove the client-side turn ending logic - let server handle turn progression
        });

        wsService.current.onKidnapChoice((data) => {
          console.log('🎭 Kidnap choice received:', data);
          setKidnapChoice(data);
        });

        wsService.current.onPlayerJoined((playerData) => {
          toast({
            title: "Player Joined",
            description: `${playerData.name} joined the room`,
          });
        });

        wsService.current.onPlayerLeft((playerData) => {
          toast({
            title: "Player Left",
            description: `${playerData.name} left the room`,
            variant: "destructive",
          });
        });

        wsService.current.onError((error) => {
          toast({
            title: "Connection Error",
            description: error,
            variant: "destructive",
          });
        });

        wsService.current.onLobbyUpdate((lobbyData) => {
          setLobbyPlayers(lobbyData.players);
        });

        wsService.current.onPlayerReconnected((playerData) => {
          toast({
            title: "Player Reconnected",
            description: `${playerData.name} has reconnected`,
          });
        });

        wsService.current.onPlayerDisconnected((playerData) => {
          toast({
            title: "Player Disconnected",
            description: `${playerData.name} has disconnected`,
            variant: "default",
          });
        });

        wsService.current.onPlayerRemoved((playerData) => {
          toast({
            title: "Player Removed",
            description: `${playerData.name} was removed from the game (connection timeout)`,
            variant: "destructive",
          });
        });

        wsService.current.onAttackBlocked((data) => {
          toast({
            title: "Attack Blocked",
            description: data.reason,
            variant: "destructive",
          });
        });

        // Add game ended event handler
        wsService.current.onGameEnded((data) => {
          console.log('🏆 Game ended event received:', data);
          setVictoryData({
            winner: data.winner,
            winnerScore: data.winnerScore,
            finalScores: data.finalScores
          });
          
          toast({
            title: "🎉 Game Over!",
            description: `${data.winner} wins with ${data.winnerScore} points!`,
          });
        });

      } catch (error) {
        console.error('Failed to connect to server:', error);
        if (mounted) {
          setIsConnected(false);
          toast({
            title: "Connection Failed",
            description: "Could not connect to game server. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    initializeConnection();

    return () => {
      mounted = false;
      if (wsService.current) {
        console.log('🧹 Cleaning up WebSocket connection...');
        wsService.current.disconnect();
        wsService.current = null;
      }
    };
  }, [toast, loadSession]);

  // Room management
  const handleCreateRoom = useCallback(async (_, playerName: string) => {
    if (!wsService.current) return;

    try {
      const newRoomId = await wsService.current.createRoom(playerName);
      setRoomId(newRoomId);
      setCurrentPlayerName(playerName);
      setLobbyPlayers([{ id: currentPlayerId, name: playerName, isHost: true }]);
      setAppState('waiting');
      
      toast({
        title: "Room Created!",
        description: `Room ID: ${newRoomId}`,
      });
    } catch (error) {
      throw error;
    }
  }, [currentPlayerId, toast]);

  const handleJoinRoom = useCallback(async (targetRoomId: string, playerName: string) => {
    if (!wsService.current) return;

    try {
      const success = await wsService.current.joinRoom(targetRoomId, playerName);
      if (success) {
        setRoomId(targetRoomId);
        setCurrentPlayerName(playerName);
        setAppState('waiting');
        
        toast({
          title: "Room Joined!",
          description: `Joined room: ${targetRoomId}`,
        });
      } else {
        throw new Error('Failed to join room');
      }
    } catch (error) {
      throw error;
    }
  }, [toast]);

  const handleStartGame = useCallback(() => {
    if (wsService.current) {
      wsService.current.startGame();
    }
  }, []);

  const handleLeaveRoom = useCallback(() => {
    setAppState('lobby');
    setRoomId('');
    setLobbyPlayers([]);
    setGameState(null);
  }, []);

  // Game actions
  const handleDrawCard = useCallback((fromDiscard: boolean = false) => {
    if (wsService.current) {
      wsService.current.drawCard(fromDiscard, 0); // Server tracks cards drawn now
    }
  }, []);

  const handlePlayUnit = useCallback((cardIds: string[]) => {
    if (!gameState || cardIds.length < 3) return;

    const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return;

    const selectedCards = cardIds.map(id => 
      currentPlayer.hand.find(card => card.id === id)!
    );

    if (!canFormUnit(selectedCards)) {
      toast({
        title: "Invalid Unit",
        description: "Cards must be the same color or include white cards with other cards of the same color (minimum 3 cards).",
        variant: "destructive",
      });
      return;
    }

    if (wsService.current) {
      wsService.current.playUnit(cardIds);
      setSelectedCards([])
    }
  }, [gameState, currentPlayerId, toast]);

  const handleAttackUnit = useCallback((attackerCardId: string, targetUnitId: string) => {
    if (wsService.current) {
      wsService.current.attackUnit(attackerCardId, targetUnitId);
    }
  }, []);

  const handleDefend = useCallback((cardId: string, fromHand: boolean) => {
    if (wsService.current) {
      wsService.current.defendWithCard(cardId, fromHand);
    }
  }, []);

  const handleReinforceUnit = useCallback((cardId: string, unitId: string) => {
    if (!gameState || !wsService.current) return;

    const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return;

    const card = currentPlayer.hand.find(c => c.id === cardId);
    const unit = currentPlayer.units.find(u => u.id === unitId);

    if (!card || !unit) {
      toast({
        title: "Invalid Reinforcement",
        description: "Card or unit not found.",
        variant: "destructive",
      });
      return;
    }

    // Client-side validation using the same logic as server
    if (!canAddCardToUnit(card, unit)) {
      toast({
        title: "Invalid Reinforcement",
        description: "This card cannot be added to the unit due to color restrictions.",
        variant: "destructive",
      });
      return;
    }

    // Send to server if validation passes
    wsService.current.reinforceUnit(cardId, unitId);
    
    // Clear selection after successful reinforcement
    setSelectedCards([]);
  }, [gameState, currentPlayerId, toast, canAddCardToUnit]);

  const handleDiscardCard = useCallback((cardId: string) => {
    if (wsService.current) {
      setSelectedCards([])
      wsService.current.discardCard(cardId);
    }
  }, []);

  const handleChooseAction = useCallback((action: 'attack' | 'discard') => {
    if (wsService.current) {
      wsService.current.chooseAction(action);
    }
  }, []);

  const handleEndTurn = useCallback(() => {
    if (wsService.current) {
      setSelectedCards([])
      wsService.current.endTurn();
    }
  }, []);

  const handleKidnap = useCallback((cardId: string) => {
    if (wsService.current) {
      setSelectedCards([])
      wsService.current.kidnap(cardId);
    }
    setKidnapChoice(null);
  }, []);

  const handleSkipKidnap = useCallback(() => {
    if (wsService.current) {
      setSelectedCards([])
      wsService.current.skipKidnap();
    }
    setKidnapChoice(null);
  }, []);

  // Victory modal handlers
  const handleNewGameFromVictory = useCallback(() => {
    setVictoryData(null);
    setGameState(null);
    // Don't need to start a new game automatically, let them go back to lobby
    setAppState('waiting');
  }, []);

  const handleReturnToLobbyFromVictory = useCallback(() => {
    setVictoryData(null);
    setGameState(null);
    setAppState('lobby');
    clearSession();
  }, [clearSession]);

  // UI handlers
  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  }, []);

  const handleUnitSelect = useCallback((unitId: string) => {
    setSelectedUnit(unitId);
  }, []);

  // Persistence handlers
  const handleReconnect = useCallback(async () => {
    if (!wsService.current || !storedSession) return;

    setIsReconnecting(true);

    try {
      await attemptReconnection(
        wsService.current,
        (session: GameSession) => {
          // Reconnection successful
          setRoomId(session.roomId);
          setCurrentPlayerName(session.playerName);
          setShowReconnectionPrompt(false);
          setIsReconnecting(false);
          
          toast({
            title: "Reconnected!",
            description: "Successfully rejoined your game",
          });

          // The server should send updated game state automatically
        },
        (error: string) => {
          // Reconnection failed
          console.log('Reconnection failed:', error);
          setShowReconnectionPrompt(false);
          setIsReconnecting(false);
          setAppState('lobby');
          
          toast({
            title: "Reconnection Failed",
            description: error,
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      setShowReconnectionPrompt(false);
      setIsReconnecting(false);
      setAppState('lobby');
    }
  }, [wsService, storedSession, attemptReconnection, toast]);

  const handleStartNewGame = useCallback(() => {
    clearSession();
    setShowReconnectionPrompt(false);
    setStoredSession(null);
    setAppState('lobby');
  }, [clearSession]);

  // Save session when joining/creating rooms
  useEffect(() => {
    if (roomId && currentPlayerName && currentPlayerId && appState !== 'connecting') {
      const isHost = lobbyPlayers.find(p => p.id === currentPlayerId)?.isHost || false;
      const session: GameSession = {
        roomId,
        playerId: currentPlayerId,
        playerName: currentPlayerName,
        timestamp: Date.now(),
        isHost
      };
      saveSession(session);
      console.log('💾 Session saved:', session);
    }
  }, [roomId, currentPlayerName, currentPlayerId, lobbyPlayers, appState, saveSession]);

  // Clear session when explicitly leaving
  const handleLeaveRoomWithCleanup = useCallback(() => {
    clearSession();
    handleLeaveRoom();
  }, [clearSession, handleLeaveRoom]);

  // Dev helper: Clear session with Ctrl+Shift+C
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        console.log('🧹 [DEV] Manually clearing session via keyboard shortcut');
        clearSession();
        setShowReconnectionPrompt(false);
        setStoredSession(null);
        if (appState === 'connecting') {
          setAppState('lobby');
        }
        toast({
          title: "Session Cleared",
          description: "Local session data has been cleared (Ctrl+Shift+C)",
          variant: "default",
        });
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSession, appState, toast]);

  // Render different app states
  console.log('🎨 Render state:', {
    appState,
    showReconnectionPrompt,
    hasStoredSession: !!storedSession,
    isConnected,
    hasGameState: !!gameState,
    gameStateValid: gameState ? {
      players: gameState.players?.length,
      currentPlayerIndex: gameState.currentPlayerIndex,
      phase: gameState.phase
    } : null
  });

  if (showReconnectionPrompt && storedSession) {
    console.log('🔄 Rendering reconnection prompt');
    return (
      <ReconnectionPrompt
        session={storedSession}
        onReconnect={handleReconnect}
        onStartNew={handleStartNewGame}
        isReconnecting={isReconnecting}
      />
    );
  }

  if (appState === 'connecting') {
    console.log('🔌 Rendering connecting screen');
    return (
      <div className="min-h-screen bg-gradient-table flex items-center justify-center">
        <div className="text-center">
          <Wifi className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Connecting to Server</h2>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }

  if (appState === 'lobby') {
    console.log('🏠 Rendering lobby screen');
    return (
      <RoomConnection
        onRoomCreated={handleCreateRoom}
        onRoomJoined={handleJoinRoom}
        isConnecting={!isConnected}
      />
    );
  }

  if (appState === 'waiting') {
    console.log('⏱️ Rendering waiting room');
    return (
      <GameLobby
        roomId={roomId}
        players={lobbyPlayers}
        currentPlayerId={currentPlayerId}
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
        canStartGame={lobbyPlayers.length >= 2}
      />
    );
  }

  // Playing state
  if (!gameState) {
    console.log('🗺 Rendering loading game screen (no gameState)');
    return (
      <div className="min-h-screen bg-gradient-table flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-2">Loading Game...</div>
          <p className="text-muted-foreground">Setting up the battlefield...</p>
        </div>
      </div>
    );
  }

  console.log('🎮 Rendering GameBoard with:', {
    gameState: !!gameState,
    currentPlayerId,
    appState,
    gameStateDetails: gameState ? {
      players: gameState.players?.length,
      phase: gameState.phase,
      currentPlayerIndex: gameState.currentPlayerIndex
    } : null
  });

  return (
    <div className="relative">
      {/* Connection status indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
          isConnected 
            ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
        )}>
          {isConnected ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <GameBoard
        gameState={gameState}
        currentPlayerId={currentPlayerId}
        onDrawCard={handleDrawCard}
        cardsDrawn={gameState.cardsDrawnThisTurn || 0}
        actionChosen={gameState.actionChosen}
        onChooseAction={handleChooseAction}
        onPlayUnit={handlePlayUnit}
        onAttackUnit={handleAttackUnit}
        onDiscardCard={handleDiscardCard}
        onEndTurn={handleEndTurn}
        selectedCards={selectedCards}
        onCardSelect={handleCardSelect}
        onUnitSelect={handleUnitSelect}
        onReinforceUnit={handleReinforceUnit}
        attackUsed={gameState ? gameState.attacksUsedThisTurn || 0 : 0}
      />

      {(() => {
        const shouldShowBattle = battleState && gameState;
        console.log('🎭 BattleModal render check:', {
          battleState: !!battleState,
          gameState: !!gameState,
          shouldShowBattle,
          currentPlayerId,
          isAttacker: battleState?.attacker.playerId === currentPlayerId,
          isDefender: battleState?.defender.playerId === currentPlayerId
        });
        return shouldShowBattle;
      })() && (
        <BattleModal
          battleState={battleState}
          onDefend={handleDefend}
          onResolveBattle={() => handleResolveBattle()}
          onCancelBattle={() => setBattleState(null)}
          defenderCards={(() => {
            const defender = gameState.players.find(p => p.id === battleState.defender.playerId);
            if (!defender) return [];
            
            const handCards = defender.hand.map(card => ({ id: card.id, card, fromHand: true }));
            const unitCards = battleState.targetUnit.cards.map(card => ({ id: card.id, card, fromHand: false }));
            
            return [...handCards, ...unitCards];
          })()} 
        />
      )}

      {kidnapChoice && (
        <KidnapModal
          isOpen={!!kidnapChoice}
          availableCards={kidnapChoice.availableCards}
          onKidnapChoice={handleKidnap}
          onSkip={handleSkipKidnap}
        />
      )}

      {/* Victory Modal */}
      {victoryData && (
        <VictoryModal
          isOpen={!!victoryData}
          winner={victoryData.winner}
          winnerScore={victoryData.winnerScore}
          finalScores={victoryData.finalScores}
          onNewGame={handleNewGameFromVictory}
          onReturnToLobby={handleReturnToLobbyFromVictory}
        />
      )}
    </div>
  );
};
