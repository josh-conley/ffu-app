import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import type { DraftData, UserInfo, LeagueTier } from '../types';
import { dataService } from '../services/data.service';
import { getAllLeagueConfigs, getUserInfoBySleeperId, getFFUIdBySleeperId } from '../config/constants';
import { ArrowLeft, Target, Users, BarChart3, Search, ChevronDown } from 'lucide-react';

interface PlayerDraftInfo {
  name: string;
  position: string;
  adp: number;
  totalDrafts: number;
  pickRange: { min: number; max: number };
  draftedBy: {
    teamName: string;
    count: number;
    avgPick: number;
    picks: { pickNumber: number; year: string }[];
  }[];
}

interface DraftStats {
  totalDrafts: number;
  totalPicks: number;
  totalPlayers: number;
  playerStats: PlayerDraftInfo[];
  positionBreakdown: Record<string, number>;
  draftYearData: Record<string, { positions: Record<string, number>; players: number }>;
}


export const DraftFunFacts: React.FC = () => {
  const [draftData, setDraftData] = useState<DraftData[]>([]);
  const [userMaps, setUserMaps] = useState<Record<string, Record<string, UserInfo>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDraftInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'players' | 'teams'>('players');
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('');

  const loadAllDraftData = async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const allLeagues = getAllLeagueConfigs();
      const draftsWithData: DraftData[] = [];
      const allUserMaps: Record<string, Record<string, UserInfo>> = {};

      for (const league of allLeagues) {
        try {
          const historicalData = await dataService.loadHistoricalLeagueData(
            league.tier as LeagueTier,
            league.year
          );

          if (historicalData?.draftData && historicalData.draftData.picks.length > 0) {
            draftsWithData.push(historicalData.draftData);

            // Create user mapping for this league/year
            const userMapping: Record<string, UserInfo> = {};
            const uniqueUserIds = [...new Set(historicalData.draftData.picks.map(pick => pick.userInfo.userId))];
            
            uniqueUserIds.forEach(userId => {
              const pickWithUser = historicalData.draftData?.picks.find(pick => pick.userInfo.userId === userId);
              
              // Try to get team name from draft data first, then fall back to constants
              let teamName = pickWithUser?.userInfo.teamName;
              let abbreviation = pickWithUser?.userInfo.abbreviation;
              
              if (!teamName) {
                const userInfo = getUserInfoBySleeperId(userId);
                if (userInfo) {
                  teamName = userInfo.teamName;
                  abbreviation = userInfo.abbreviation;
                }
              }
              
              if (teamName) {
                const ffuUserId = getFFUIdBySleeperId(userId) || 'unknown';
                userMapping[userId] = {
                  userId,
                  ffuUserId,
                  teamName,
                  abbreviation: abbreviation || 'UNK'
                };
              }
            });

            allUserMaps[`${league.tier}-${league.year}`] = userMapping;
          }
        } catch (err) {
          console.warn(`Failed to load draft data for ${league.tier} ${league.year}:`, err);
        }
      }

      setDraftData(draftsWithData);
      setUserMaps(allUserMaps);
    } catch (err) {
      console.error('Failed to load draft data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load draft data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllDraftData();
  }, []);

  const draftStats = useMemo((): DraftStats => {
    const stats: DraftStats = {
      totalDrafts: draftData.length,
      totalPicks: 0,
      totalPlayers: 0,
      playerStats: [],
      positionBreakdown: {},
      draftYearData: {}
    };

    if (draftData.length === 0) return stats;

    // Track player draft data across all drafts
    const playerData: Record<string, {
      name: string;
      position: string;
      picks: number[];
      draftedBy: Record<string, { picks: { pickNumber: number; year: string }[]; count: number }>;
    }> = {};

    draftData.forEach(draft => {
      const userMap = userMaps[`${draft.league}-${draft.year}`] || {};
      stats.totalPicks += draft.picks.length;
      
      // Initialize year data
      if (!stats.draftYearData[draft.year]) {
        stats.draftYearData[draft.year] = { positions: {}, players: 0 };
      }
      
      stats.draftYearData[draft.year].players += draft.picks.length;

      draft.picks.forEach(pick => {
        const playerName = pick.playerInfo.name;
        const position = pick.playerInfo.position;
        const userInfo = userMap[pick.userInfo.userId];
        const teamName = userInfo?.teamName || pick.userInfo.teamName || 'Unknown Team';

        if (teamName === 'Unknown Team') return;

        // Year data
        stats.draftYearData[draft.year].positions[position] = 
          (stats.draftYearData[draft.year].positions[position] || 0) + 1;

        // Position breakdown
        stats.positionBreakdown[position] = (stats.positionBreakdown[position] || 0) + 1;

        // Initialize player data if not exists
        if (!playerData[playerName]) {
          playerData[playerName] = {
            name: playerName,
            position,
            picks: [],
            draftedBy: {}
          };
        }

        // Add this pick to the player's data
        playerData[playerName].picks.push(pick.pickNumber);

        // Track which team drafted this player
        if (!playerData[playerName].draftedBy[teamName]) {
          playerData[playerName].draftedBy[teamName] = {
            picks: [],
            count: 0
          };
        }
        
        playerData[playerName].draftedBy[teamName].picks.push({
          pickNumber: pick.pickNumber,
          year: draft.year
        });
        playerData[playerName].draftedBy[teamName].count++;
      });
    });

    // Convert player data to PlayerDraftInfo format
    stats.playerStats = Object.values(playerData)
      .filter(player => player.picks.length >= 1) // Only players drafted at least once
      .map(player => {
        const adp = player.picks.reduce((sum, pick) => sum + pick, 0) / player.picks.length;
        const pickRange = {
          min: Math.min(...player.picks),
          max: Math.max(...player.picks)
        };

        const draftedBy = Object.entries(player.draftedBy).map(([teamName, data]) => ({
          teamName,
          count: data.count,
          avgPick: data.picks.reduce((sum, pick) => sum + pick.pickNumber, 0) / data.picks.length,
          picks: data.picks
        }));

        return {
          name: player.name,
          position: player.position,
          adp,
          totalDrafts: player.picks.length,
          pickRange,
          draftedBy: draftedBy.sort((a, b) => b.count - a.count) // Sort by most drafts first
        };
      })
      .sort((a, b) => a.adp - b.adp); // Sort by ADP ascending

    stats.totalPlayers = stats.playerStats.length;

    return stats;
  }, [draftData, userMaps]);

  // Filter players based on search query
  const filteredPlayerStats = useMemo(() => {
    if (!searchQuery.trim()) return draftStats.playerStats;
    return draftStats.playerStats.filter(player => 
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.position.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [draftStats.playerStats, searchQuery]);

  // Get team member stats for the "By Team Member" tab
  const teamMemberStats = useMemo(() => {
    const teamStats: Record<string, {
      teamName: string;
      players: {
        name: string;
        position: string;
        timesSelected: number;
        avgPickByTeam: number;
        picks: number[];
        overallAdp: number;
      }[];
    }> = {};

    // Build team member statistics
    draftStats.playerStats.forEach(player => {
      player.draftedBy.forEach(team => {
        if (!teamStats[team.teamName]) {
          teamStats[team.teamName] = {
            teamName: team.teamName,
            players: []
          };
        }

        teamStats[team.teamName].players.push({
          name: player.name,
          position: player.position,
          timesSelected: team.count,
          avgPickByTeam: team.avgPick,
          picks: team.picks.map(p => p.pickNumber),
          overallAdp: player.adp
        });
      });
    });

    // Sort each team's players by: 1) times selected (desc), 2) avgPickByTeam (asc)
    Object.values(teamStats).forEach(team => {
      team.players.sort((a, b) => {
        if (a.timesSelected !== b.timesSelected) {
          return b.timesSelected - a.timesSelected;
        }
        return a.avgPickByTeam - b.avgPickByTeam;
      });
    });

    return teamStats;
  }, [draftStats.playerStats]);

  const availableTeamMembers = useMemo(() => {
    const teams = Object.keys(teamMemberStats).sort();
    return teams.map(team => ({ value: team, label: team }));
  }, [teamMemberStats]);

  // Set default team member when data loads
  useEffect(() => {
    if (!selectedTeamMember && availableTeamMembers.length > 0) {
      setSelectedTeamMember(availableTeamMembers[0].value);
    }
  }, [availableTeamMembers, selectedTeamMember]);

  const selectedTeamData = useMemo(() => {
    return teamMemberStats[selectedTeamMember]?.players || [];
  }, [teamMemberStats, selectedTeamMember]);

  // Get players drafted 3+ times by any team member
  const frequentlyDraftedPlayers = useMemo(() => {
    const results: Array<{
      playerName: string;
      position: string;
      overallAdp: number;
      teams: Array<{
        teamName: string;
        timesSelected: number;
        avgPick: number;
        picks: number[];
      }>;
    }> = [];

    draftStats.playerStats.forEach(player => {
      const qualifyingTeams = player.draftedBy.filter(team => team.count >= 3);
      if (qualifyingTeams.length > 0) {
        results.push({
          playerName: player.name,
          position: player.position,
          overallAdp: player.adp,
          teams: qualifyingTeams.map(team => ({
            teamName: team.teamName,
            timesSelected: team.count,
            avgPick: team.avgPick,
            picks: team.picks.map(p => p.pickNumber)
          }))
        });
      }
    });

    // Sort by highest number of times selected by a single team, then by overall ADP
    return results.sort((a, b) => {
      const maxSelectionsA = Math.max(...a.teams.map(t => t.timesSelected));
      const maxSelectionsB = Math.max(...b.teams.map(t => t.timesSelected));
      
      if (maxSelectionsA !== maxSelectionsB) {
        return maxSelectionsB - maxSelectionsA;
      }
      return a.overallAdp - b.overallAdp;
    });
  }, [draftStats.playerStats]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/drafts"
          className="flex items-center gap-2 text-ffu-red hover:text-red-700 transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Draft</span>
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Draft Fun Facts</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Analyzing {draftStats.totalDrafts} drafts with {draftStats.totalPicks.toLocaleString()} total picks
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <div className="card text-center py-3 md:py-6">
          <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-ffu-red mx-auto mb-1 md:mb-2" />
          <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {draftStats.totalDrafts}
          </div>
          <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Drafts</div>
        </div>
        
        <div className="card text-center py-3 md:py-6">
          <Target className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mx-auto mb-1 md:mb-2" />
          <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {draftStats.totalPicks.toLocaleString()}
          </div>
          <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Picks</div>
        </div>
        
        <div className="card text-center py-3 md:py-6">
          <Users className="h-6 w-6 md:h-8 md:w-8 text-green-600 mx-auto mb-1 md:mb-2" />
          <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {draftStats.totalPlayers.toLocaleString()}
          </div>
          <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Unique Players</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('players')}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors duration-200 ${
            activeTab === 'players'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          All Players
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors duration-200 ${
            activeTab === 'teams'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          By Team Member
        </button>
      </div>

      {activeTab === 'players' && (
        <>
      {/* Player Draft List with Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Player List */}
        <div className="lg:col-span-2 card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-ffu-red" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Player Draft Statistics</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Players sorted by Average Draft Position (ADP). Click on any player to see their draft details.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-ffu-red">
              {searchQuery ? filteredPlayerStats.length : draftStats.playerStats.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {searchQuery ? 'Filtered' : 'Total'} Players
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search players by name or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red"
            />
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto relative border-2 border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gradient-to-b from-transparent via-transparent to-gray-100 dark:to-gray-700">
          {filteredPlayerStats.map((player) => (
            <div
              key={player.name}
              onClick={() => setSelectedPlayer(player)}
              className={`cursor-pointer flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ${
                selectedPlayer?.name === player.name
                  ? 'bg-ffu-red/10 border-2 border-ffu-red'
                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
              }`}
            >
              {/* Player Info */}
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-8 bg-blue-600 text-white rounded font-bold text-sm">
                  {player.adp.toFixed(1)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {player.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {player.position} • Drafted {player.totalDrafts} time{player.totalDrafts !== 1 ? 's' : ''} 
                    • Range: {player.pickRange.min}-{player.pickRange.max}
                  </div>
                </div>
              </div>

              {/* Draft Count */}
              <div className="text-right">
                <div className="text-lg font-bold text-ffu-red">
                  {player.totalDrafts}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">drafts</div>
              </div>

            </div>
          ))}
        </div>

        {filteredPlayerStats.length === 0 && searchQuery && (
          <div className="text-center text-gray-600 dark:text-gray-400 py-8">
            No players found matching "{searchQuery}"
          </div>
        )}
        </div>

        {/* Right side - Player Details Panel */}
        <div className="card">
          {selectedPlayer ? (
            <div>
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-12 h-8 bg-blue-600 text-white rounded font-bold text-sm">
                    {selectedPlayer.adp.toFixed(1)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedPlayer.name}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPlayer.position} • {selectedPlayer.totalDrafts} draft{selectedPlayer.totalDrafts !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Pick Range: {selectedPlayer.pickRange.min}-{selectedPlayer.pickRange.max}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Drafted By:
                </h4>
                <div className="space-y-3">
                  {selectedPlayer.draftedBy.map(team => (
                    <div key={team.teamName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {team.teamName}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600">
                          {team.count}x
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {team.picks.length > 1 
                            ? `Picks: ${team.picks.map(p => `${p.pickNumber} (${p.year})`).join(', ')}`
                            : `Pick ${team.picks[0].pickNumber} (${team.picks[0].year})`
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Select a Player
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Click on any player from the list to see their draft history and which teams selected them.
              </p>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {activeTab === 'teams' && (
        <>
      {/* By Team Member Tab */}
      <div className="space-y-6">
        
        {/* Frequently Drafted Players (3+) */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Players Drafted 3+ Times by Same Team Member
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Players showing loyalty patterns - sorted by highest selection count, then by overall ADP
            </p>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto border-2 border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gradient-to-b from-transparent via-transparent to-gray-100 dark:to-gray-700">
            {frequentlyDraftedPlayers.map((player, index) => (
              <div
                key={player.playerName}
                className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {/* Player Info */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded font-bold text-xs">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {player.playerName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {player.position} • Overall ADP: {player.overallAdp.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Team Selection Details */}
                <div className="text-right">
                  {player.teams.map((team, teamIndex) => (
                    <div key={`${team.teamName}-${teamIndex}`} className="mb-2 last:mb-0">
                      <div className="font-bold text-purple-600">
                        {team.teamName}: {team.timesSelected}x
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Avg Pick: {team.avgPick.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {team.picks.length > 1 ? `Picks: ${team.picks.join(', ')}` : `Pick ${team.picks[0]}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {frequentlyDraftedPlayers.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No players have been drafted 3 or more times by the same team member.
            </div>
          )}
        </div>
        {/* Team Member Dropdown */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Team Member:
          </label>
          <div className="relative">
            <select
              value={selectedTeamMember}
              onChange={(e) => setSelectedTeamMember(e.target.value)}
              className="block w-64 pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
            >
              {availableTeamMembers.map(member => (
                <option key={member.value} value={member.value}>{member.label}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Player List by Team */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Players Drafted by {selectedTeamMember}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Players sorted by times selected by this team, then by average pick position by this team
            </p>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto border-2 border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gradient-to-b from-transparent via-transparent to-gray-100 dark:to-gray-700">
            {selectedTeamData.map((player, index) => (
              <div
                key={`${player.name}-${index}`}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {/* Player Info */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-600 text-white rounded font-bold text-xs">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {player.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {player.position} • Overall ADP: {player.overallAdp.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Selection Stats */}
                <div className="text-right">
                  <div>
                    <div className="font-bold text-ffu-red">
                      {player.timesSelected}x
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Avg Pick: {player.avgPickByTeam.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {player.picks.length > 1 ? `Picks: ${player.picks.join(', ')}` : `Pick ${player.picks[0]}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedTeamData.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No players found for the selected team member.
            </div>
          )}
        </div>
      </div>
        </>
      )}

    </div>
  );
};