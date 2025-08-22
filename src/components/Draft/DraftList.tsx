import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DraftData, UserInfo } from '../../types';
import { historicalTeamResolver } from '../../utils/historical-team-resolver';
import { getUserInfoBySleeperId } from '../../config/constants';

interface DraftListProps {
  draftData: DraftData;
  userMap: Record<string, UserInfo>;
}

export const DraftList: React.FC<DraftListProps> = ({ draftData, userMap }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get team filter from URL
  const [selectedTeam, setSelectedTeam] = useState<string | 'all'>(
    searchParams.get('team') || 'all'
  );

  const { picks } = draftData;
  // const { teams, rounds } = settings;

  // Update URL when team filter changes
  const handleTeamFilterChange = (team: string | 'all') => {
    setSelectedTeam(team);
    const newParams = new URLSearchParams(searchParams);
    
    if (team === 'all') {
      newParams.delete('team');
    } else {
      newParams.set('team', team);
    }
    
    setSearchParams(newParams);
  };

  // Handle URL parameter changes (back/forward navigation)
  useEffect(() => {
    const urlTeam = searchParams.get('team');
    const newSelectedTeam = urlTeam || 'all';
    
    if (newSelectedTeam !== selectedTeam) {
      setSelectedTeam(newSelectedTeam);
    }
  }, [searchParams]);

  // Filter picks based on selections
  const filteredPicks = (picks || []).filter(pick => {
    if (selectedTeam !== 'all' && pick.userInfo.userId !== selectedTeam) return false;
    return true;
  });

  // Get unique teams for filter
  const uniqueTeams = Array.from(new Set((picks || []).map(p => p.userInfo.userId)))
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
      <div className="flex justify-center mb-6">
        <div className="w-full sm:w-auto sm:max-w-[800px] sm:min-w-[500px]">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="team-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Member
              </label>
              <select
                id="team-filter"
                value={selectedTeam}
                onChange={(e) => handleTeamFilterChange(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Members</option>
                {uniqueTeams.map((team) => (
                  <option key={team.userId} value={team.userId}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Draft List */}
      <div className="flex justify-center">
        <div className="table-container w-full sm:w-auto">
          <table className="table w-full sm:max-w-[800px] sm:min-w-[500px]">
          <thead className="table-header">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Pick</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Player</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Pos</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Team</th>
            </tr>
          </thead>
          <tbody>
            {filteredPicks.map((pick) => {
              const userInfo = userMap[pick.userInfo.userId];
              // Get current team name instead of historical
              const currentUserInfo = getUserInfoBySleeperId(pick.userInfo.userId);
              const currentTeamName = currentUserInfo?.teamName || userInfo?.teamName || `User ${pick.userInfo.userId}`;
              
              const isEvenRound = pick.round % 2 === 0;
              const rowBackgroundClass = isEvenRound 
                ? 'bg-gray-100 dark:bg-gray-800/50' 
                : 'bg-white dark:bg-gray-800';
              
              return (
                <tr key={pick.pickNumber} className={`border-b border-gray-200 dark:border-gray-600 ${rowBackgroundClass}`}>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono">
                    <div>{formatPickNumber(pick)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">#{pick.pickNumber}</div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {pick.playerInfo.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {currentTeamName}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <span className={`px-1 py-0.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-sm ${getPositionColor(pick.playerInfo.position)}`}>
                      {pick.playerInfo.position}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white">{historicalTeamResolver.getDisplayTeam(pick, parseInt(draftData.year, 10)) || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPicks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {!picks || picks.length === 0 ? 
              'No draft data available for this league and year.' : 
              'No picks found for the selected filters.'}
          </div>
        )}
      </div>
      </div>

    </div>
  );
};