/**
 * Storage utility for game persistence
 */

export interface GameSession {
  roomId: string;
  playerId: string;
  playerName: string;
  timestamp: number;
  isHost?: boolean;
}

export interface StoredGameState {
  session: GameSession;
  appState: 'connecting' | 'lobby' | 'waiting' | 'playing';
  lobbyPlayers?: Array<{ id: string; name: string; isHost?: boolean }>;
}

const STORAGE_KEY = 'unitCardBattles_gameSession';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export class GameStorage {
  static saveSession(session: GameSession): void {
    try {
      const sessionWithTimestamp = {
        ...session,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionWithTimestamp));
      console.log('💾 Game session saved:', sessionWithTimestamp);
    } catch (error) {
      console.error('Failed to save game session:', error);
    }
  }

  static loadSession(): GameSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const session: GameSession = JSON.parse(stored);
      
      // Check if session has expired
      if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
        console.log('🕐 Game session expired, clearing...');
        this.clearSession();
        return null;
      }

      console.log('🔄 Game session loaded:', session);
      return session;
    } catch (error) {
      console.error('Failed to load game session:', error);
      this.clearSession(); // Clear corrupted data
      return null;
    }
  }

  static clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🧹 Game session cleared');
    } catch (error) {
      console.error('Failed to clear game session:', error);
    }
  }

  static updateSessionTimestamp(): void {
    const session = this.loadSession();
    if (session) {
      this.saveSession({ ...session, timestamp: Date.now() });
    }
  }

  static isSessionValid(): boolean {
    const session = this.loadSession();
    return session !== null;
  }
}
