import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSleeperIdByAbbreviation, getAbbreviationBySleeperId } from '../config/constants';

interface UseUrlPlayerStateReturn {
  selectedPlayerId: string;
  selectedPlayer2Id: string;
  isCompareMode: boolean;
  setSelectedPlayer: (playerId: string) => void;
  setSelectedPlayer2: (playerId: string) => void;
  setCompareMode: (compareMode: boolean) => void;
  resetSelection: () => void;
}

export const useUrlPlayerState = (): UseUrlPlayerStateReturn => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL parameters and convert abbreviations to sleeper IDs
  const parseStateFromUrl = useCallback(() => {
    try {
      const playerAbbr = searchParams.get('player');
      const player1Abbr = searchParams.get('player1');
      const player2Abbr = searchParams.get('player2');
      const compareParam = searchParams.get('compare');

      const isCompareMode = compareParam === 'true';

      if (isCompareMode) {
        // Compare mode: use player1 and player2 params
        const selectedPlayerId = getSleeperIdByAbbreviation(player1Abbr || '') || '';
        const selectedPlayer2Id = getSleeperIdByAbbreviation(player2Abbr || '') || '';
        
        // Edge case: if only player2 is provided, move it to player1
        if (!selectedPlayerId && selectedPlayer2Id) {
          return { selectedPlayerId: selectedPlayer2Id, selectedPlayer2Id: '', isCompareMode };
        }
        
        return { selectedPlayerId, selectedPlayer2Id, isCompareMode };
      } else {
        // Single player mode: use player param
        const selectedPlayerId = getSleeperIdByAbbreviation(playerAbbr || '') || '';
        return { selectedPlayerId, selectedPlayer2Id: '', isCompareMode };
      }
    } catch (error) {
      console.warn('Error parsing URL state:', error);
      // Return safe defaults on any parsing error
      return { selectedPlayerId: '', selectedPlayer2Id: '', isCompareMode: false };
    }
  }, [searchParams]);

  const { selectedPlayerId, selectedPlayer2Id, isCompareMode } = parseStateFromUrl();

  // Update URL with current state, converting sleeper IDs back to abbreviations
  const updateUrl = useCallback((playerId: string, player2Id: string, compareMode: boolean) => {
    const params = new URLSearchParams();

    if (compareMode) {
      if (playerId || player2Id) {
        params.set('compare', 'true');
        if (playerId) {
          const abbr = getAbbreviationBySleeperId(playerId);
          if (abbr) params.set('player1', abbr);
        }
        if (player2Id) {
          const abbr = getAbbreviationBySleeperId(player2Id);
          if (abbr) params.set('player2', abbr);
        }
      }
    } else {
      if (playerId) {
        const abbr = getAbbreviationBySleeperId(playerId);
        if (abbr) params.set('player', abbr);
      }
    }

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Set selected player (for single view or first player in compare)
  const setSelectedPlayer = useCallback((playerId: string) => {
    updateUrl(playerId, selectedPlayer2Id, isCompareMode);
  }, [updateUrl, selectedPlayer2Id, isCompareMode]);

  // Set second player (for compare mode)
  const setSelectedPlayer2 = useCallback((playerId: string) => {
    updateUrl(selectedPlayerId, playerId, isCompareMode);
  }, [updateUrl, selectedPlayerId, isCompareMode]);

  // Toggle compare mode
  const setCompareMode = useCallback((compareMode: boolean) => {
    if (compareMode) {
      // Switching to compare mode: keep current player as player1, clear player2
      updateUrl(selectedPlayerId, '', true);
    } else {
      // Switching to single mode: keep player1 as the single player, clear player2
      updateUrl(selectedPlayerId, '', false);
    }
  }, [updateUrl, selectedPlayerId]);

  // Enhanced player setters with validation
  const setSelectedPlayerSafe = useCallback((playerId: string) => {
    // Prevent setting the same player for both positions in compare mode
    if (isCompareMode && playerId && playerId === selectedPlayer2Id) {
      // Clear player2 if trying to set same player as player1
      updateUrl(playerId, '', isCompareMode);
    } else {
      setSelectedPlayer(playerId);
    }
  }, [setSelectedPlayer, isCompareMode, selectedPlayer2Id, updateUrl]);

  const setSelectedPlayer2Safe = useCallback((playerId: string) => {
    // Prevent setting the same player for both positions
    if (playerId && playerId === selectedPlayerId) {
      // Don't update if trying to set same player
      return;
    }
    setSelectedPlayer2(playerId);
  }, [setSelectedPlayer2, selectedPlayerId]);

  // Reset all selections
  const resetSelection = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    selectedPlayerId,
    selectedPlayer2Id,
    isCompareMode,
    setSelectedPlayer: setSelectedPlayerSafe,
    setSelectedPlayer2: setSelectedPlayer2Safe,
    setCompareMode,
    resetSelection
  };
};