import React, { useState } from 'react';
import type { DraftData, UserInfo } from '../../types';
import { historicalTeamResolver } from '../../utils/historical-team-resolver';

interface DraftListProps {
  draftData: DraftData;
  userMap: Record<string, UserInfo>;
}

export const DraftList: React.FC<DraftListProps> = ({ draftData, userMap }) => {
  const [selectedTeam, setSelectedTeam] = useState<string | 'all'>('all');
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

  const { picks } = draftData;
  // const { teams, rounds } = settings;

  // Filter picks based on selections
  const filteredPicks = picks.filter(pick => {
    if (selectedTeam !== 'all' && pick.userInfo.userId !== selectedTeam) return false;
    return true;
  });

  // Get unique teams for filter
  const uniqueTeams = Array.from(new Set(picks.map(p => p.userInfo.userId)))
    .map(userId => {
      const userInfo = userMap[userId];
      return { userId, name: userInfo?.teamName || userInfo?.abbreviation || `User ${userId}` };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const getPositionColor = (position: string): string => {
    switch (position.toLowerCase()) {
      case 'qb': return 'pos-qb-badge';
      case 'rb': return 'pos-rb-badge';
      case 'wr': return 'pos-wr-badge';
      case 'te': return 'pos-te-badge';
      case 'k': return 'pos-k-badge';
      case 'def': return 'pos-def-badge';
      default: return 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Format pick number as round.pick (e.g., 1.01, 1.02) accounting for snake draft
  const formatPickNumber = (pick: { round: number; draftSlot: number }): string => {
    const { round, draftSlot } = pick;
    let pickInRound;
    if (round % 2 === 1) {
      // Odd rounds: left to right (1, 2, 3, ...)
      pickInRound = draftSlot;
    } else {
      // Even rounds: right to left (reverse order)
      // Need to calculate total teams from the draftData settings
      const totalTeams = draftData.settings.teams;
      pickInRound = totalTeams - draftSlot + 1;
    }
    return `${round}.${pickInRound.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {draftData.metadata.name} - {draftData.year}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label htmlFor="team-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Team
          </label>
          <select
            id="team-filter"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Teams</option>
            {uniqueTeams.map((team) => (
              <option key={team.userId} value={team.userId}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Draft List */}
      <div className="table-container">
        <table className="table min-w-full">
          <thead className="table-header">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider min-w-[50px]">Pick</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider min-w-[140px]">Player</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider min-w-[60px]">Pos</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider min-w-[50px]">NFL</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider min-w-[80px]">Drafted By</th>
            </tr>
          </thead>
          <tbody>
            {filteredPicks.map((pick) => {
              const userInfo = userMap[pick.userInfo.userId];
              const isEvenRound = pick.round % 2 === 0;
              const rowBackgroundClass = isEvenRound 
                ? 'bg-gray-50 dark:bg-gray-800/50' 
                : 'bg-white dark:bg-gray-800';
              
              return (
                <tr key={pick.pickNumber} className={`border-b border-gray-200 dark:border-gray-600 ${rowBackgroundClass}`}>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono">{formatPickNumber(pick)}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {pick.playerInfo.name}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <span className={`px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider angular-cut-small ${getPositionColor(pick.playerInfo.position)}`}>
                      {pick.playerInfo.position}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white">{historicalTeamResolver.getDisplayTeam(pick, parseInt(draftData.year, 10)) || '-'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white relative">
                    <div 
                      className="cursor-pointer touch-manipulation transition-all duration-200 active:scale-95 active:brightness-90 select-none"
                      onTouchStart={() => setTooltipVisible(pick.userInfo.userId)}
                      onTouchEnd={() => setTimeout(() => setTooltipVisible(null), 2000)}
                      onMouseEnter={() => setTooltipVisible(pick.userInfo.userId)}
                      onMouseLeave={() => setTooltipVisible(null)}
                    >
                      {userInfo?.abbreviation || userInfo?.teamName || `User ${pick.userInfo.userId}`}
                      
                      {/* Tooltip */}
                      {tooltipVisible === pick.userInfo.userId && userInfo?.teamName && userInfo?.abbreviation !== userInfo?.teamName && (
                        <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded shadow-lg whitespace-nowrap z-10">
                          {userInfo.teamName}
                          <div className="absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPicks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No picks found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};