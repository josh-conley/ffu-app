import { TeamLogo } from '../Common/TeamLogo';
import { ChevronDown } from 'lucide-react';

interface PlayerOption {
  sleeperId: string;
  userInfo: {
    teamName: string;
    abbreviation: string;
    displayName?: string;
  };
  totalWins: number;
  totalLosses: number;
  winPercentage: number;
  championships: number;
  isSelected?: boolean;
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
  const selectedPlayer = players.find(p => p.sleeperId === selectedPlayerId);
  const selectedPlayer2 = players.find(p => p.sleeperId === selectedPlayer2Id);

  const handlePlayer1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSelectPlayer(e.target.value);
  };

  const handlePlayer2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onSelectPlayer2) {
      onSelectPlayer2(e.target.value);
    }
  };

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
              {players.map((player) => (
                <option key={player.sleeperId} value={player.sleeperId}>
                  {player.userInfo.teamName} ({player.userInfo.abbreviation}) - {player.totalWins}-{player.totalLosses}
                </option>
              ))}
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
                {players
                  .filter(p => p.sleeperId !== selectedPlayer2Id)
                  .map((player) => (
                    <option key={player.sleeperId} value={player.sleeperId}>
                      {player.userInfo.teamName} ({player.userInfo.abbreviation}) - {player.totalWins}-{player.totalLosses}
                    </option>
                  ))}
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
                {players
                  .filter(p => p.sleeperId !== selectedPlayerId)
                  .map((player) => (
                    <option key={player.sleeperId} value={player.sleeperId}>
                      {player.userInfo.teamName} ({player.userInfo.abbreviation}) - {player.totalWins}-{player.totalLosses}
                    </option>
                  ))}
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