import type { LeagueTier } from '../../types';
import { TeamSelector } from '../Common/TeamSelector';

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

  // Group players by league
  const groupedPlayers = {
    PREMIER: players.filter(p => p.currentLeague === 'PREMIER'),
    MASTERS: players.filter(p => p.currentLeague === 'MASTERS'),
    NATIONAL: players.filter(p => p.currentLeague === 'NATIONAL'),
    PAST: players.filter(p => p.currentLeague === 'PAST')
  };

  // Convert to TeamSelector format
  const getTeamSelectorGroups = (excludePlayerId?: string) => {
    return {
      PREMIER: groupedPlayers.PREMIER
        .filter(p => p.sleeperId !== excludePlayerId)
        .map(p => ({
          teamName: p.userInfo.teamName,
          abbreviation: p.userInfo.abbreviation,
          userId: p.sleeperId
        })),
      MASTERS: groupedPlayers.MASTERS
        .filter(p => p.sleeperId !== excludePlayerId)
        .map(p => ({
          teamName: p.userInfo.teamName,
          abbreviation: p.userInfo.abbreviation,
          userId: p.sleeperId
        })),
      NATIONAL: groupedPlayers.NATIONAL
        .filter(p => p.sleeperId !== excludePlayerId)
        .map(p => ({
          teamName: p.userInfo.teamName,
          abbreviation: p.userInfo.abbreviation,
          userId: p.sleeperId
        })),
      PAST: groupedPlayers.PAST
        .filter(p => p.sleeperId !== excludePlayerId)
        .map(p => ({
          teamName: p.userInfo.teamName,
          abbreviation: p.userInfo.abbreviation,
          userId: p.sleeperId
        }))
    };
  };

  // Get selected player info
  const getSelectedPlayerTeamName = (playerId?: string) => {
    if (!playerId) return 'ALL';
    const player = players.find(p => p.sleeperId === playerId);
    return player?.userInfo.teamName || 'ALL';
  };

  if (!isCompareMode) {
    // Single player selector
    return (
      <div className="card">
        <TeamSelector
          label={label}
          value={getSelectedPlayerTeamName(selectedPlayerId)}
          onChange={(teamName) => {
            if (teamName === 'ALL') {
              onSelectPlayer('');
            } else {
              const player = players.find(p => p.userInfo.teamName === teamName);
              if (player) onSelectPlayer(player.sleeperId);
            }
          }}
          groupedTeams={getTeamSelectorGroups()}
          allTeamsLabel={placeholder}
          placeholder={placeholder}
        />
      </div>
    );
  }

  // Compare mode - dual selectors
  return (
    <div className="card">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Selector */}
          <TeamSelector
            label="First Member"
            value={getSelectedPlayerTeamName(selectedPlayerId)}
            onChange={(teamName) => {
              if (teamName === 'ALL') {
                onSelectPlayer('');
              } else {
                const player = players.find(p => p.userInfo.teamName === teamName);
                if (player) onSelectPlayer(player.sleeperId);
              }
            }}
            groupedTeams={getTeamSelectorGroups(selectedPlayer2Id)}
            allTeamsLabel="Choose first member..."
            placeholder="Choose first member..."
          />

          {/* Player 2 Selector */}
          <TeamSelector
            label="Second Member"
            value={getSelectedPlayerTeamName(selectedPlayer2Id)}
            onChange={(teamName) => {
              if (teamName === 'ALL') {
                if (onSelectPlayer2) onSelectPlayer2('');
              } else {
                const player = players.find(p => p.userInfo.teamName === teamName);
                if (player && onSelectPlayer2) onSelectPlayer2(player.sleeperId);
              }
            }}
            groupedTeams={getTeamSelectorGroups(selectedPlayerId)}
            allTeamsLabel="Choose second member..."
            placeholder="Choose second member..."
          />
        </div>
      </div>
    </div>
  );
}