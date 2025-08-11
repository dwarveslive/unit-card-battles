import { io, Socket } from 'socket.io-client';
import { GameState } from '@/types/game';

const serverIp = import.meta.env.VITE_SERVER_URL || 'http://localhost';
const serverPort = import.meta.env.PORT || import.meta.env.FALLBACK_PORT_BOO;
const serverUrl = serverIp + ':' + serverPort;

export class WebSocketService {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private isConnected: boolean = false;

  constructor() {
    // Don't initialize socket in constructor
  }

  async connect(): Promise<void> {
    // Prevent multiple simultaneous connections
    if (this.isConnected && this.socket?.connected) {
      console.log('🔄 Already connected, skipping...');
      return;
    }

    // Add a small delay to prevent rapid reconnections
    await new Promise(resolve => setTimeout(resolve, 500));

    return new Promise((resolve, reject) => {
      try {
        // Clean up any existing socket first
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
          this.socket = null;
        }

        console.log(`🔄 Creating new WebSocket connection to ${serverUrl}...`);
        this.socket = io(serverUrl, {
          forceNew: true,
          transports: ['websocket', 'polling'], // Start with polling only to avoid websocket issues
          timeout: 60000,
          reconnection: false // Disable automatic reconnection
        });

        const connectionTimeout = setTimeout(() => {
          console.error('⏰ Connection timeout');
          this.socket?.disconnect();
          reject(new Error('Connection timeout'));
        }, 15000);

        const onConnect = () => {
          console.log('✅ Connected to server:', this.socket?.id);
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onError);
          resolve();
        };

        const onError = (error: any) => {
          console.error('❌ Connection error:', error);
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onError);
          reject(error);
        };

        const onDisconnect = (reason: string) => {
          console.log('🔌 Disconnected:', reason);
          this.isConnected = false;
        };

        this.socket.on('connect', onConnect);
        this.socket.on('connect_error', onError);
        this.socket.on('disconnect', onDisconnect);

        // Start connection
        this.socket.connect();
        
      } catch (error) {
        console.error('Failed to create socket:', error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  createRoom(playerName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      console.log('🎯 Creating room for:', playerName);
      this.socket.emit('createRoom', { playerName }, (roomId: string) => {
        console.log('🏠 Room created:', roomId);
        this.currentRoomId = roomId;
        resolve(roomId);
      });
    });
  }

  joinRoom(roomId: string, playerName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      this.socket.emit('joinRoom', { roomId, playerName }, (success: boolean) => {
        if (success) {
          this.currentRoomId = roomId;
        }
        resolve(success);
      });
    });
  }

  reconnectToRoom(roomId: string, playerName: string, previousPlayerId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      console.log('🔄 Attempting to reconnect to room:', { roomId, playerName, previousPlayerId });
      
      // Emit reconnection attempt with previous player ID for server validation
      this.socket.emit('reconnectToRoom', { 
        roomId, 
        playerName, 
        previousPlayerId 
      }, (response: { success: boolean, reason?: string }) => {
        if (response.success) {
          console.log('✅ Successfully reconnected to room');
          this.currentRoomId = roomId;
          resolve(true);
        } else {
          console.log('❌ Failed to reconnect:', response.reason);
          resolve(false);
        }
      });
    });
  }

  startGame() {
    if (this.currentRoomId && this.socket) {
      this.socket.emit('startGame', this.currentRoomId);
    }
  }

  drawCard(fromDiscard: boolean = false, cardsDrawn: number): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      this.socket.emit('drawCard', { roomId: this.currentRoomId, fromDiscard, cardsDrawn });
      return true;
    }
    return false;
  }

  playUnit(cardIds: string[]): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      this.socket.emit('playUnit', { roomId: this.currentRoomId, cardIds });
      return true;
    }
    return false;
  }

  attackUnit(attackerCardId: string, targetUnitId: string): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      console.log(`⚔️ Attacking unit ${targetUnitId} with card ${attackerCardId}`);
      this.socket.emit('attackUnit', { roomId: this.currentRoomId, attackerCardId, targetUnitId });
      return true;
    }
    console.error('❌ Failed to attack unit - connection issue');
    return false;
  }

  defendWithCard(cardId: string, fromHand: boolean): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      console.log(`🛡️ Defending with card ${cardId}, from hand: ${fromHand}`);
      this.socket.emit('defendWithCard', { roomId: this.currentRoomId, cardId, fromHand });
      return true;
    }
    console.error('❌ Failed to defend - connection issue');
    return false;
  }

  reinforceUnit(cardId: string, unitId: string): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      console.log(`🔧 Reinforcing unit ${unitId} with card ${cardId}`);
      this.socket.emit('reinforceUnit', { roomId: this.currentRoomId, cardId, unitId });
      return true;
    }
    console.error('❌ Failed to reinforce unit - connection issue');
    return false;
  }

  discardCard(cardId: string): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      this.socket.emit('discardCard', { roomId: this.currentRoomId, cardId });
      return true;
    }
    return false;
  }

  chooseAction(action: 'attack' | 'discard'): boolean {
    console.log(`🔍 chooseAction called with: ${action}`);
    console.log(`🔍 Connection state - roomId: ${this.currentRoomId}, socket: ${!!this.socket}, connected: ${this.isConnected}`);
    
    if (!this.currentRoomId) {
      console.error('❌ No room ID available');
      return false;
    }
    
    if (!this.socket) {
      console.error('❌ Socket not available');
      return false;
    }
    
    if (!this.isConnected) {
      console.error('❌ Socket not connected');
      return false;
    }
    
    try {
      console.log(`🎯 Emitting chooseAction: ${action}`);
      this.socket.emit('chooseAction', { roomId: this.currentRoomId, action });
      console.log(`✅ Successfully emitted chooseAction`);
      return true;
    } catch (error) {
      console.error('❌ Error emitting chooseAction:', error);
      return false;
    }
  }

  endTurn(): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      this.socket.emit('endTurn', { roomId: this.currentRoomId });
      return true;
    }
    return false;
  }

  resolveBattle(): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      console.log('⚔️ Resolving battle');
      this.socket.emit('resolveBattle', { roomId: this.currentRoomId });
      return true;
    }
    console.error('❌ Failed to resolve battle - connection issue');
    return false;
  }

  kidnap(cardId: string): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      console.log(`🎭 Kidnapping card ${cardId}`);
      this.socket.emit('kidnap', { roomId: this.currentRoomId, cardId });
      return true;
    }
    console.error('❌ Failed to kidnap card - connection issue');
    return false;
  }

  skipKidnap(): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      console.log(`⏭️ Skipping kidnap`);
      this.socket.emit('skipKidnap', { roomId: this.currentRoomId });
      return true;
    }
    console.error('❌ Failed to skip kidnap - connection issue');
    return false;
  }

  onGameStateUpdate(callback: (gameState: GameState) => void) {
    if (this.socket) {
      this.socket.on('gameStateUpdate', callback);
    }
  }

  onBattleStart(callback: (battleData: any) => void) {
    if (this.socket) {
      this.socket.on('battleStart', callback);
    }
  }

  onBattleEnd(callback: (result: any) => void) {
    if (this.socket) {
      this.socket.on('battleEnd', callback);
    }
  }

  onKidnapChoice(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('kidnapChoice', callback);
    }
  }

  onError(callback: (error: string) => void) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  onPlayerJoined(callback: (playerData: any) => void) {
    if (this.socket) {
      this.socket.on('playerJoined', callback);
    }
  }

  onPlayerLeft(callback: (playerData: any) => void) {
    if (this.socket) {
      this.socket.on('playerLeft', callback);
    }
  }

  onLobbyUpdate(callback: (lobbyData: any) => void) {
    if (this.socket) {
      this.socket.on('lobbyUpdate', callback);
    }
  }

  onGameStarted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('gameStarted', callback);
    }
  }

  onPlayerReconnected(callback: (playerData: any) => void) {
    if (this.socket) {
      this.socket.on('playerReconnected', callback);
    }
  }

  onPlayerDisconnected(callback: (playerData: any) => void) {
    if (this.socket) {
      this.socket.on('playerDisconnected', callback);
    }
  }

  onPlayerRemoved(callback: (playerData: any) => void) {
    if (this.socket) {
      this.socket.on('playerRemoved', callback);
    }
  }

  onAttackBlocked(callback: (data: { reason: string }) => void) {
    if (this.socket) {
      this.socket.on('attackBlocked', callback);
    }
  }

  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  getSocketId(): string {
    return this.socket?.id || '';
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}
