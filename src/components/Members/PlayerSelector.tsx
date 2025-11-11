import { ChevronDown } from 'lucide-react';
import type { LeagueTier } from '../../types';

interface PlayerOption {
  sleeperId: string;
  userInfo: {
    teamName: string;
    abbreviation: string;
    displayName?: string;
  };
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  winPercentage: number;
  championships: number;
  isSelected?: boolean;
  currentLeague?: LeagueTier | 'PAST'; // Add league categorization
}

interface PlayerSelectorProps {
  players: PlayerOption[];
  selectedPlayerId?: string;
  selectedPlayer2Id?: string;
  onSelectPlayer: (playerId: string) => void;
  onSelectPlayer2?: (playerId: string) => void;
  isCompareMode: boolean;
  placeholder?: string;
  label?: string;
}

export function PlayerSelector({
  players,
  selectedPlayerId,
  selectedPlayer2Id,
  onSelectPlayer,
  onSelectPlayer2,
  isCompareMode,
  placeholder = "Choose a member...",
  label = "Select Member"
}: PlayerSelectorProps) {

  const handlePlayer1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSelectPlayer(e.target.value);
  };

  const handlePlayer2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onSelectPlayer2) {
      onSelectPlayer2(e.target.value);
    }
  };

  // Group players by league
  const groupedPlayers = {
    PREMIER: players.filter(p => p.currentLeague === 'PREMIER'),
    MASTERS: players.filter(p => p.currentLeague === 'MASTERS'),
    NATIONAL: players.filter(p => p.currentLeague === 'NATIONAL'),
    PAST: players.filter(p => p.currentLeague === 'PAST')
  };

  // Helper to render player options
  const renderPlayerOption = (player: PlayerOption) => (
    <option key={player.sleeperId} value={player.sleeperId}>
      {player.userInfo.teamName} ({player.userInfo.abbreviation}) - {player.totalWins}-{player.totalLosses}{player.totalTies > 0 ? `-${player.totalTies}` : ''}
    </option>
  );

  // Helper to render grouped options
  const renderGroupedOptions = (excludePlayerId?: string) => (
    <>
      {groupedPlayers.PREMIER.length > 0 && (
        <optgroup label="Premier League">
          {groupedPlayers.PREMIER
            .filter(p => p.sleeperId !== excludePlayerId)
            .map(renderPlayerOption)}
        </optgroup>
      )}
      {groupedPlayers.MASTERS.length > 0 && (
        <optgroup label="Masters League">
          {groupedPlayers.MASTERS
            .filter(p => p.sleeperId !== excludePlayerId)
            .map(renderPlayerOption)}
        </optgroup>
      )}
      {groupedPlayers.NATIONAL.length > 0 && (
        <optgroup label="National League">
          {groupedPlayers.NATIONAL
            .filter(p => p.sleeperId !== excludePlayerId)
            .map(renderPlayerOption)}
        </optgroup>
      )}
      {groupedPlayers.PAST.length > 0 && (
        <optgroup label="Past Members">
          {groupedPlayers.PAST
            .filter(p => p.sleeperId !== excludePlayerId)
            .map(renderPlayerOption)}
        </optgroup>
      )}
    </>
  );

  if (!isCompareMode) {
    // Single player selector
    return (
      <div className="card">
        <div className="space-y-2">
          <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
            {label}
          </label>
          <div className="relative">
            <select
              value={selectedPlayerId || ''}
              onChange={handlePlayer1Change}
              className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red"
            >
              <option value="">{placeholder}</option>
              {renderGroupedOptions()}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compare mode - dual selectors
  return (
    <div className="card">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
              First Member
            </label>
            <div className="relative">
              <select
                value={selectedPlayerId || ''}
                onChange={handlePlayer1Change}
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red"
              >
                <option value="">Choose first member...</option>
                {renderGroupedOptions(selectedPlayer2Id)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Player 2 Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
              Second Member
            </label>
            <div className="relative">
              <select
                value={selectedPlayer2Id || ''}
                onChange={handlePlayer2Change}
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red"
              >
                <option value="">Choose second member...</option>
                {renderGroupedOptions(selectedPlayerId)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}