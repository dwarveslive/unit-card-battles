import { io, Socket } from 'socket.io-client';
import { GameState } from '@/types/game';

class WebSocketSingleton {
  private static instance: WebSocketSingleton;
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): WebSocketSingleton {
    if (!WebSocketSingleton.instance) {
      WebSocketSingleton.instance = new WebSocketSingleton();
    }
    return WebSocketSingleton.instance;
  }

  async connect(): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Return immediately if already connected
    if (this.isConnected && this.socket?.connected) {
      console.log('🔄 Already connected, skipping...');
      return Promise.resolve();
    }

    // Create new connection promise
    this.connectionPromise = this.createConnection();
    
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clean up any existing socket
        if (this.socket) {
          console.log('🧹 Cleaning up existing socket...');
          this.socket.removeAllListeners();
          this.socket.disconnect();
          this.socket = null;
          this.isConnected = false;
        }

        console.log('🔄 Creating new WebSocket connection...');
        
        // Use environment variable or default to localhost
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
        console.log('🌐 Connecting to server:', serverUrl);
        
        this.socket = io(serverUrl, {
          forceNew: true,
          transports: ['polling'],
          timeout: 10000,
          reconnection: false
        });

        const connectionTimeout = setTimeout(() => {
          console.error('⏰ Connection timeout');
          reject(new Error('Connection timeout'));
        }, 10000);

        const onConnect = () => {
          console.log('✅ Connected to server:', this.socket?.id);
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          resolve();
        };

        const onError = (error: any) => {
          console.error('❌ Connection error:', error);
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          reject(error);
        };

        const onDisconnect = (reason: string) => {
          console.log('🔌 Disconnected:', reason);
          this.isConnected = false;
        };

        this.socket.once('connect', onConnect);
        this.socket.once('connect_error', onError);
        this.socket.on('disconnect', onDisconnect);

      } catch (error) {
        console.error('Failed to create socket:', error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('🧹 Disconnecting WebSocket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  createRoom(playerName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
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
      if (!this.socket?.connected) {
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

  startGame() {
    console.log('🚀 startGame() called');
    console.log('🏠 currentRoomId:', this.currentRoomId);
    console.log('🔌 socket connected:', this.socket?.connected);
    
    if (this.currentRoomId && this.socket?.connected) {
      console.log('✅ Emitting startGame event to server with roomId:', this.currentRoomId);
      this.socket.emit('startGame', this.currentRoomId);
    } else {
      console.error('❌ Cannot start game - missing roomId or socket not connected');
      console.error('   - currentRoomId:', this.currentRoomId);
      console.error('   - socket connected:', this.socket?.connected);
    }
  }

  // Game action methods
  drawCard(fromDiscard: boolean = false): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      this.socket.emit('drawCard', { roomId: this.currentRoomId, fromDiscard });
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

  kidnap(cardId: string): boolean {
    if (this.currentRoomId && this.socket && this.isConnected) {
      console.log(`🎭 Kidnapping card ${cardId}`);
      this.socket.emit('kidnap', { roomId: this.currentRoomId, cardId });
      return true;
    }
    console.error('❌ Failed to kidnap card - connection issue');
    return false;
  }

  // Event listeners
  onGameStateUpdate(callback: (gameState: GameState) => void) {
    if (this.socket) {
      this.socket.on('gameStateUpdate', callback);
    }
  }

  onLobbyUpdate(callback: (lobbyData: any) => void) {
    if (this.socket) {
      this.socket.on('lobbyUpdate', callback);
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

  onError(callback: (error: string) => void) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  onGameStarted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('gameStarted', callback);
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

export const wsService = WebSocketSingleton.getInstance();
