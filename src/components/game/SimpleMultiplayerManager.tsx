// import React, { useState, useCallback, useEffect } from 'react';
// import { RoomConnection } from '@/components/lobby/RoomConnection';
// import { GameLobby } from '@/components/lobby/GameLobby';
// import { GameBoard } from './GameBoard';
// import { BattleModal } from './BattleModal';
// import { KidnapModal } from './KidnapModal';
// import { useToast } from '@/hooks/use-toast';
// import { wsService } from '@/services/websocketSingleton';
// import { GameState, BattleState, GameCard, Unit } from '@/types/game';
// import {
//   canFormUnit,
//   canAddCardToUnit,
//   resolveBattle
// } from '@/utils/gameLogic';
// import { Wifi, WifiOff } from 'lucide-react';
//
// type AppState = 'connecting' | 'lobby' | 'waiting' | 'playing';
//
// interface LobbyPlayer {
//   id: string;
//   name: string;
//   isHost?: boolean;
// }
//
// export const SimpleMultiplayerManager: React.FC = () => {
//   // Connection state
//   const [appState, setAppState] = useState<AppState>('connecting');
//   const [isConnected, setIsConnected] = useState(false);
//
//   // Room state
//   const [roomId, setRoomId] = useState<string>('');
//   const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
//   const [currentPlayerName, setCurrentPlayerName] = useState<string>('');
//   const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
//
//   // Game state
//   const [gameState, setGameState] = useState<GameState | null>(null);
//   const [battleState, setBattleState] = useState<BattleState | null>(null);
//   const [selectedCards, setSelectedCards] = useState<string[]>([]);
//   const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
//   const [attackUsed, setAttackUsed] = useState(false);
//   const [kidnapChoice, setKidnapChoice] = useState<{ targetUnit: Unit; availableCards: GameCard[] } | null>(null);
//   const [cardsDrawn, setCardsDrawn] = useState(0);
//   const [actionChosen, setActionChosen] = useState<'attack' | 'discard' | null>(null);
//   const [unitsPlayedThisTurn, setUnitsPlayedThisTurn] = useState(0);
//
//   const { toast } = useToast();
//
//   // Initialize WebSocket connection
//   useEffect(() => {
//     let mounted = true;
//
//     const initializeConnection = async () => {
//       try {
//         console.log('🔄 Initializing WebSocket connection...');
//
//         await wsService.connect();
//
//         if (!mounted) return;
//
//         setIsConnected(true);
//         setCurrentPlayerId(wsService.getSocketId());
//         setAppState('lobby');
//
//         // Set up event listeners
//         wsService.onLobbyUpdate((lobbyData) => {
//           console.log('📋 Lobby update:', lobbyData);
//           setLobbyPlayers(lobbyData.players);
//         });
//
//         wsService.onPlayerJoined((playerData) => {
//           toast({
//             title: "Player Joined",
//             description: `${playerData.name} joined the room`,
//           });
//         });
//
//         wsService.onPlayerLeft((playerData) => {
//           toast({
//             title: "Player Left",
//             description: `${playerData.name} left the room`,
//             variant: "destructive",
//           });
//         });
//
//         wsService.onError((error) => {
//           toast({
//             title: "Connection Error",
//             description: error,
//             variant: "destructive",
//           });
//         });
//
//         wsService.onGameStarted((data) => {
//           console.log('🎮 Game started:', data);
//           toast({
//             title: "Game Started!",
//             description: data.message || "The game has begun!",
//           });
//           setAppState('playing');
//         });
//
//         wsService.onGameStateUpdate((newGameState) => {
//           console.log('🎲 Game state updated:', newGameState);
//           setGameState(newGameState);
//
//           // Reset turn-specific state when it's a new turn
//           if (newGameState.players[newGameState.currentPlayerIndex]?.id === wsService.getSocketId()) {
//             setCardsDrawn(0);
//             setActionChosen(null);
//             setUnitsPlayedThisTurn(0);
//             setAttackUsed(false);
//           }
//         });
//
//       } catch (error) {
//         console.error('Failed to connect to server:', error);
//         if (mounted) {
//           setIsConnected(false);
//           toast({
//             title: "Connection Failed",
//             description: "Could not connect to game server. Please make sure the server is running on port 3000.",
//             variant: "destructive",
//           });
//         }
//       }
//     };
//
//     initializeConnection();
//
//     return () => {
//       mounted = false;
//     };
//   }, [toast]);
//
//   // Room management
//   const handleCreateRoom = useCallback(async (_, playerName: string) => {
//     try {
//       console.log('🎯 Attempting to create room for:', playerName);
//       const newRoomId = await wsService.createRoom(playerName);
//       setRoomId(newRoomId);
//       setCurrentPlayerName(playerName);
//       setAppState('waiting');
//
//       toast({
//         title: "Room Created!",
//         description: `Room ID: ${newRoomId}`,
//       });
//     } catch (error) {
//       console.error('Failed to create room:', error);
//       toast({
//         title: "Error",
//         description: "Failed to create room. Please try again.",
//         variant: "destructive",
//       });
//       throw error;
//     }
//   }, [toast]);
//
//   const handleJoinRoom = useCallback(async (targetRoomId: string, playerName: string) => {
//     try {
//       const success = await wsService.joinRoom(targetRoomId, playerName);
//       if (success) {
//         setRoomId(targetRoomId);
//         setCurrentPlayerName(playerName);
//         setAppState('waiting');
//
//         toast({
//           title: "Room Joined!",
//           description: `Joined room: ${targetRoomId}`,
//         });
//       } else {
//         throw new Error('Failed to join room');
//       }
//     } catch (error) {
//       console.error('Failed to join room:', error);
//       toast({
//         title: "Error",
//         description: "Failed to join room. Please check the room ID and try again.",
//         variant: "destructive",
//       });
//       throw error;
//     }
//   }, [toast]);
//
//   const handleStartGame = useCallback(() => {
//     console.log('🎮 Start Game button clicked!');
//     console.log('🔍 WebSocket connected:', wsService.isSocketConnected());
//     console.log('🏠 Current room ID:', wsService.getCurrentRoomId());
//
//     wsService.startGame();
//
//     console.log('✅ startGame() called on wsService');
//
//     toast({
//       title: "Game Starting!",
//       description: "The game will begin shortly...",
//     });
//   }, [toast]);
//
//   const handleLeaveRoom = useCallback(() => {
//     setAppState('lobby');
//     setRoomId('');
//     setLobbyPlayers([]);
//   }, []);
//
//   // Game action handlers
//   const handleDrawCard = useCallback((fromDiscard: boolean = false) => {
//     try {
//       const success = wsService.drawCard(fromDiscard);
//       if (success) {
//         setCardsDrawn(prev => prev + 1);
//         toast({
//           title: "Card Drawn",
//           description: `Drew card from ${fromDiscard ? 'discard pile' : 'deck'}`,
//         });
//       } else {
//         throw new Error('Failed to draw card');
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to draw card",
//         variant: "destructive",
//       });
//     }
//   }, [toast]);
//
//   const handleDrawBoth = useCallback(() => {
//     try {
//       const success = wsService.drawBoth();
//       if (success) {
//         setCardsDrawn(2);
//         toast({
//           title: "Cards Drawn",
//           description: "Drew one card from deck and one from discard pile",
//         });
//       } else {
//         throw new Error('Failed to draw both cards');
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to draw both cards",
//         variant: "destructive",
//       });
//     }
//   }, [toast]);
//
//   const handlePlayUnit = useCallback((cardIds: string[]) => {
//     if (!gameState || cardIds.length < 3) return;
//
//     const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
//     if (!currentPlayer) return;
//
//     const selectedCards = cardIds.map(id =>
//       currentPlayer.hand.find(card => card.id === id)!
//     ).filter(Boolean);
//
//     if (!canFormUnit(selectedCards)) {
//       toast({
//         title: "Invalid Unit",
//         description: "Cards must be the same color or include white cards with other cards of the same color (minimum 3 cards).",
//         variant: "destructive",
//       });
//       return;
//     }
//
//     try {
//       const success = wsService.playUnit(cardIds);
//       if (success) {
//         setSelectedCards([]);
//         setUnitsPlayedThisTurn(prev => prev + 1);
//         const totalValue = selectedCards.reduce((sum, card) => sum + card.value, 0);
//         toast({
//           title: "Unit Played!",
//           description: `Created unit with value ${totalValue}`,
//         });
//       } else {
//         throw new Error('Failed to play unit');
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to play unit",
//         variant: "destructive",
//       });
//     }
//   }, [gameState, currentPlayerId, toast]);
//
//   const handleAttackUnit = useCallback((attackerCardId: string, targetUnitId: string) => {
//     try {
//       const success = wsService.attackUnit(attackerCardId, targetUnitId);
//       if (success) {
//         setAttackUsed(true);
//         toast({
//           title: "Attack Initiated!",
//           description: "Battle will be resolved shortly",
//         });
//       } else {
//         throw new Error('Failed to attack unit');
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to attack unit",
//         variant: "destructive",
//       });
//     }
//   }, [toast]);
//
//   const handleDiscardCard = useCallback((cardId: string) => {
//     try {
//       const success = wsService.discardCard(cardId);
//       if (success) {
//         setSelectedCards(prev => prev.filter(id => id !== cardId));
//         toast({
//           title: "Card Discarded",
//           description: "Card sent to discard pile",
//         });
//       } else {
//         throw new Error('Failed to discard card');
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to discard card",
//         variant: "destructive",
//       });
//     }
//   }, [toast]);
//
//   const handleEndTurn = useCallback(() => {
//     try {
//       const success = wsService.endTurn();
//       if (success) {
//         setAttackUsed(false);
//         setCardsDrawn(0);
//         setActionChosen(null);
//         setUnitsPlayedThisTurn(0);
//         setSelectedCards([]);
//         toast({
//           title: "Turn Ended",
//           description: "Passing turn to next player",
//         });
//       } else {
//         throw new Error('Failed to end turn');
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to end turn",
//         variant: "destructive",
//       });
//     }
//   }, [toast]);
//
//   const handleChooseAction = useCallback((action: 'attack' | 'discard') => {
//     console.log(`🎯 handleChooseAction called with: ${action}`);
//
//     try {
//       const success = wsService.chooseAction(action);
//       console.log(`📤 chooseAction result: ${success}`);
//
//       if (success) {
//         // Optimistically update local state - server will confirm via game state update
//         setActionChosen(action);
//         console.log(`✅ Optimistically set actionChosen to: ${action}`);
//
//         toast({
//           title: "Action Selected",
//           description: `Chose to ${action}`,
//         });
//       } else {
//         // Only show error if WebSocket emit actually failed
//         console.error('❌ WebSocket chooseAction failed');
//         toast({
//           title: "Connection Error",
//           description: "Could not send action. Please check your connection.",
//           variant: "destructive",
//         });
//       }
//     } catch (error) {
//       console.error('❌ Exception in handleChooseAction:', error);
//       toast({
//         title: "Error",
//         description: "Failed to choose action",
//         variant: "destructive",
//       });
//     }
//   }, [toast]);
//
//   const handleCardSelect = useCallback((cardId: string) => {
//     setSelectedCards(prev => {
//       if (prev.includes(cardId)) {
//         return prev.filter(id => id !== cardId);
//       } else {
//         return [...prev, cardId];
//       }
//     });
//   }, []);
//
//   const handleUnitSelect = useCallback((unitId: string) => {
//     setSelectedUnit(unitId);
//   }, []);
//
//   const handleReinforceUnit = useCallback(async (cardId: string, unitId: string) => {
//     // Not implemented in server yet
//     toast({
//       title: "Not Implemented",
//       description: "Unit reinforcement coming soon!",
//     });
//   }, [toast]);
//
//   // Render different app states
//   if (appState === 'connecting') {
//     return (
//       <div className="min-h-screen bg-gradient-table flex items-center justify-center">
//         <div className="text-center">
//           <Wifi className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-foreground mb-2">Connecting to Server</h2>
//           <p className="text-muted-foreground">Please wait...</p>
//           <div className="mt-4 text-sm text-muted-foreground">
//             Make sure the server is running on port 3000
//           </div>
//         </div>
//       </div>
//     );
//   }
//
//   if (appState === 'lobby') {
//     return (
//       <div className="relative">
//         {/* Connection indicator */}
//         <div className="fixed top-4 right-4 z-50">
//           <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
//             isConnected
//               ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
//               : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
//           }`}>
//             {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
//             <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
//           </div>
//         </div>
//
//         <RoomConnection
//           onRoomCreated={handleCreateRoom}
//           onRoomJoined={handleJoinRoom}
//           isConnecting={!isConnected}
//         />
//       </div>
//     );
//   }
//
//   if (appState === 'waiting') {
//     return (
//       <GameLobby
//         roomId={roomId}
//         players={lobbyPlayers}
//         currentPlayerId={currentPlayerId}
//         onStartGame={handleStartGame}
//         onLeaveRoom={handleLeaveRoom}
//         canStartGame={lobbyPlayers.length >= 2}
//       />
//     );
//   }
//
//   // Playing state - show loading if no game state yet
//   if (!gameState) {
//     return (
//       <div className="min-h-screen bg-gradient-table flex items-center justify-center">
//         <div className="text-center">
//           <h2 className="text-2xl font-bold text-foreground mb-2">Loading Game...</h2>
//           <p className="text-muted-foreground">Setting up the battlefield...</p>
//         </div>
//       </div>
//     );
//   }
//
//   // Show actual game board once game state is available
//   return (
//     <div className="relative">
//       {/* Connection status indicator */}
//       <div className="fixed top-4 right-4 z-50">
//         <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
//           isConnected
//             ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
//             : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
//         }`}>
//           {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
//           <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
//         </div>
//       </div>
//
//       <GameBoard
//         gameState={gameState}
//         currentPlayerId={currentPlayerId}
//         onDrawCard={handleDrawCard}
//         onDrawBoth={handleDrawBoth}
//         cardsDrawn={cardsDrawn}
//         actionChosen={actionChosen}
//         onChooseAction={handleChooseAction}
//         onPlayUnit={handlePlayUnit}
//         onAttackUnit={handleAttackUnit}
//         onDiscardCard={handleDiscardCard}
//         onEndTurn={handleEndTurn}
//         selectedCards={selectedCards}
//         onCardSelect={handleCardSelect}
//         onUnitSelect={handleUnitSelect}
//         onReinforceUnit={handleReinforceUnit}
//         attackUsed={attackUsed}
//       />
//
//       {battleState && (
//         <BattleModal
//           battleState={battleState}
//           onDefend={() => console.log('Defend not implemented yet')}
//           onResolveBattle={() => console.log('Resolve battle not implemented yet')}
//           onCancelBattle={() => setBattleState(null)}
//           defenderCards={[]}
//         />
//       )}
//
//       {kidnapChoice && (
//         <KidnapModal
//           isOpen={!!kidnapChoice}
//           availableCards={kidnapChoice.availableCards}
//           onKidnapChoice={() => console.log('Kidnap choice not implemented yet')}
//           onSkip={() => setKidnapChoice(null)}
//         />
//       )}
//     </div>
//   );
// };
