import { useEffect, useCallback, useState } from 'react';
import { GameStorage, GameSession } from '@/utils/storage';

export interface GamePersistenceHookResult {
  saveSession: (session: GameSession) => void;
  loadSession: () => GameSession | null;
  clearSession: () => void;
  hasStoredSession: boolean;
  attemptReconnection: (
    wsService: any,
    onReconnectSuccess: (session: GameSession) => void,
    onReconnectFailure: (error: string) => void
  ) => Promise<void>;
}

export const useGamePersistence = (): GamePersistenceHookResult => {
  const [hasStoredSession, setHasStoredSession] = useState(GameStorage.isSessionValid());

  // Update hasStoredSession when session changes
  useEffect(() => {
    setHasStoredSession(GameStorage.isSessionValid());
  }, []);

  const saveSession = useCallback((session: GameSession) => {
    GameStorage.saveSession(session);
    setHasStoredSession(true);
  }, []);

  const loadSession = useCallback((): GameSession | null => {
    return GameStorage.loadSession();
  }, []);

  const clearSession = useCallback(() => {
    GameStorage.clearSession();
    setHasStoredSession(false);
  }, []);

  const attemptReconnection = useCallback(async (
    wsService: any,
    onReconnectSuccess: (session: GameSession) => void,
    onReconnectFailure: (error: string) => void
  ) => {
    const session = GameStorage.loadSession();
    if (!session) {
      onReconnectFailure('No stored session found');
      return;
    }

    try {
      console.log('🔄 Attempting to reconnect to game...', session);
      
      // Try to reconnect to the room
      const reconnected = await wsService.reconnectToRoom(session.roomId, session.playerName, session.playerId);
      
      if (reconnected) {
        console.log('✅ Successfully reconnected to game');
        // Update session timestamp
        GameStorage.updateSessionTimestamp();
        onReconnectSuccess(session);
      } else {
        console.log('❌ Failed to reconnect - room may no longer exist');
        GameStorage.clearSession();
        setHasStoredSession(false);
        onReconnectFailure('Failed to reconnect to game room');
      }
    } catch (error) {
      console.error('❌ Reconnection error:', error);
      GameStorage.clearSession();
      setHasStoredSession(false);
      onReconnectFailure('Connection error during reconnection');
    }
  }, []);

  // Keep session alive with periodic updates
  useEffect(() => {
    if (!hasStoredSession) return;

    const interval = setInterval(() => {
      GameStorage.updateSessionTimestamp();
    }, 5 * 60 * 1000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, [hasStoredSession]);

  // Clear session on page unload if user explicitly leaves
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Don't clear session on accidental refresh
      // Session will expire naturally after timeout
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    saveSession,
    loadSession,
    clearSession,
    hasStoredSession,
    attemptReconnection
  };
};
