import { useState, useMemo, useEffect } from 'react';
import { useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import { ChevronDown, X, Calendar, ArrowUpDown, RotateCcw } from 'lucide-react';
import { useUrlParams } from '../hooks/useUrlParams';
import { useTeamProfileModal } from '../contexts/TeamProfileModalContext';
import { USERS, CURRENT_YEAR } from '../config/constants';
import type { LeagueTier } from '../types';

interface H2HRecord {
  wins: number;
  losses: number;
  ties: number;
  totalGames: number;
}

interface TeamInfo {
  userId: string;
  teamName: string;
  abbreviation: string;
}

interface MatchupDetail {
  year: string;
  league: LeagueTier;
  week: number;
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerInfo: TeamInfo;
  loserInfo: TeamInfo;
  placementType?: string;
  isTie?: boolean;
}

type LeagueFilter = LeagueTier | 'ALL_TIME';
type HighlightOption = 'none' | 'lopsided' | 'closest' | 'most_played';

export const H2HMatrix = () => {
  const { getParam, updateParams } = useUrlParams();
  const [selectedFilter, setSelectedFilter] = useState<LeagueFilter>('PREMIER');
  const [sortByTeam, setSortByTeam] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterBySeasons, setFilterBySeasons] = useState(false);
  const [excludePlayoffs, setExcludePlayoffs] = useState(false);
  const [highlightOption, setHighlightOption] = useState<HighlightOption>('none');
  const [highlightThreshold, setHighlightThreshold] = useState(75); // Percentage threshold (0-100)
  const [minGames, setMinGames] = useState(3); // Minimum games for lopsided/closest
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMatchups, setSelectedMatchups] = useState<MatchupDetail[]>([]);
  const [modalTeam1, setModalTeam1] = useState<TeamInfo | null>(null);
  const [modalTeam2, setModalTeam2] = useState<TeamInfo | null>(null);
  const { data: standings, isLoading, error } = useAllStandings();
  const { openTeamProfile } = useTeamProfileModal();

  // Initialize from URL params on mount
  useEffect(() => {
    const filter = getParam('filter', 'PREMIER');
    if (['PREMIER', 'MASTERS', 'NATIONAL', 'ALL_TIME'].includes(filter)) {
      setSelectedFilter(filter as LeagueFilter);
    }
  }, []);

  const filterOptions: { value: LeagueFilter; label: string }[] = [
    { value: 'PREMIER', label: 'Premier - 2025' },
    { value: 'MASTERS', label: 'Masters - 2025' },
    { value: 'NATIONAL', label: 'National - 2025' },
    { value: 'ALL_TIME', label: 'All Members' },
  ];

  const getLeagueName = (league: LeagueTier): string => {
    switch (league) {
      case 'PREMIER': return 'Premier';
      case 'MASTERS': return 'Masters';
      case 'NATIONAL': return 'National';
    }
  };

  // Determine if a week is a playoff week based on year
  const isPlayoffWeek = (year: string, week: number): boolean => {
    const yearNum = parseInt(year);
    // ESPN era: 2018-2020 had playoffs in weeks 14, 15, 16
    // Sleeper era: 2021+ has playoffs in weeks 15, 16, 17
    if (yearNum >= 2021) {
      return week >= 15;
    } else {
      return week >= 14;
    }
  };

  // Get members for the selected league/filter
  const currentSeasonMembers = useMemo(() => {
    if (!standings || standings.length === 0) return [];

    let members: TeamInfo[] = [];

    if (selectedFilter === 'ALL_TIME') {
      // Get all unique users who have ever played across ALL leagues
      const userMap = new Map<string, { info: TeamInfo; seasonCount: number }>();

      standings.forEach(leagueData => {
        leagueData.standings.forEach(standing => {
          if (!userMap.has(standing.userId)) {
            userMap.set(standing.userId, {
              info: {
                userId: standing.userId,
                teamName: standing.userInfo.teamName,
                abbreviation: standing.userInfo.abbreviation
              },
              seasonCount: 1
            });
          } else {
            const existing = userMap.get(standing.userId)!;
            existing.seasonCount++;
          }
        });
      });

      // Filter by season count if checkbox is enabled
      members = Array.from(userMap.values())
        .filter(user => !filterBySeasons || user.seasonCount >= 5)
        .map(user => user.info);
    } else {
      // Find the current year standings for the selected league
      const currentLeagueData = standings.find(
        s => s.league === selectedFilter && s.year === CURRENT_YEAR
      );

      if (!currentLeagueData) return [];

      // Get team info for each member
      members = currentLeagueData.standings.map(standing => ({
        userId: standing.userId,
        teamName: standing.userInfo.teamName,
        abbreviation: standing.userInfo.abbreviation
      }));
    }

    // Sort alphabetically by team name
    return members.sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [standings, selectedFilter, filterBySeasons]);

  // Calculate H2H records and store matchup details for all matchups across all time
  const { h2hMatrix, matchupDetails } = useMemo(() => {
    if (!standings || standings.length === 0) return {
      h2hMatrix: new Map<string, Map<string, H2HRecord>>(),
      matchupDetails: new Map<string, MatchupDetail[]>()
    };

    const matrix = new Map<string, Map<string, H2HRecord>>();
    const details = new Map<string, MatchupDetail[]>();

    // Initialize matrix for current season members
    currentSeasonMembers.forEach(team1 => {
      const team1Map = new Map<string, H2HRecord>();
      currentSeasonMembers.forEach(team2 => {
        if (team1.userId !== team2.userId) {
          team1Map.set(team2.userId, { wins: 0, losses: 0, ties: 0, totalGames: 0 });
          // Initialize matchup details with sorted key
          const key = [team1.userId, team2.userId].sort().join('-');
          if (!details.has(key)) {
            details.set(key, []);
          }
        }
      });
      matrix.set(team1.userId, team1Map);
    });

    // Process all matchup data from all seasons
    standings.forEach(leagueData => {
      if (!leagueData.matchupsByWeek) return;

      Object.entries(leagueData.matchupsByWeek).forEach(([weekStr, weekMatchups]: [string, any]) => {
        if (!Array.isArray(weekMatchups)) return;

        const week = parseInt(weekStr);

        // Skip playoff weeks if exclude checkbox is enabled
        if (excludePlayoffs && isPlayoffWeek(leagueData.year, week)) return;

        weekMatchups.forEach((matchup: any) => {
          const winner = matchup.winner;
          const loser = matchup.loser;

          if (!winner || !loser) return;

          // Skip unplayed matchups (both scores are 0)
          if (matchup.winnerScore === 0 && matchup.loserScore === 0) return;

          // Check if it's a tie
          const isTie = matchup.winnerScore === matchup.loserScore;

          // Only count matchups where both teams are in current season
          const winnerInMatrix = matrix.has(winner);
          const loserInMatrix = matrix.has(loser);

          if (winnerInMatrix && loserInMatrix) {
            if (isTie) {
              // For ties, increment ties and total games for both teams
              const record1 = matrix.get(winner)?.get(loser);
              const record2 = matrix.get(loser)?.get(winner);
              if (record1) {
                record1.ties++;
                record1.totalGames++;
              }
              if (record2) {
                record2.ties++;
                record2.totalGames++;
              }
            } else {
              // Winner's record vs loser
              const winnerRecord = matrix.get(winner)?.get(loser);
              if (winnerRecord) {
                winnerRecord.wins++;
                winnerRecord.totalGames++;
              }

              // Loser's record vs winner
              const loserRecord = matrix.get(loser)?.get(winner);
              if (loserRecord) {
                loserRecord.losses++;
                loserRecord.totalGames++;
              }
            }

            // Store matchup detail
            const key = [winner, loser].sort().join('-');
            const winnerTeam = currentSeasonMembers.find(t => t.userId === winner);
            const loserTeam = currentSeasonMembers.find(t => t.userId === loser);

            if (winnerTeam && loserTeam) {
              details.get(key)?.push({
                year: leagueData.year,
                league: leagueData.league,
                week: parseInt(weekStr),
                winner,
                loser,
                winnerScore: matchup.winnerScore,
                loserScore: matchup.loserScore,
                winnerInfo: winnerTeam,
                loserInfo: loserTeam,
                placementType: matchup.placementType,
                isTie
              });
            }
          }
        });
      });
    });

    // Sort matchup details by year and week (most recent first)
    details.forEach((matchups) => {
      matchups.sort((a, b) => {
        if (a.year !== b.year) return b.year.localeCompare(a.year);
        return b.week - a.week;
      });
    });

    return { h2hMatrix: matrix, matchupDetails: details };
  }, [standings, currentSeasonMembers, excludePlayoffs, isPlayoffWeek]);

  // Sort members based on selected team's record
  const sortedMembers = useMemo(() => {
    if (!sortByTeam) {
      return currentSeasonMembers;
    }

    const sorted = [...currentSeasonMembers].sort((a, b) => {
      // Don't sort the selected team itself
      if (a.userId === sortByTeam) return -1;
      if (b.userId === sortByTeam) return 1;

      const recordA = h2hMatrix.get(a.userId)?.get(sortByTeam);
      const recordB = h2hMatrix.get(b.userId)?.get(sortByTeam);

      const winPctA = recordA && recordA.totalGames > 0 ? recordA.wins / recordA.totalGames : 0;
      const winPctB = recordB && recordB.totalGames > 0 ? recordB.wins / recordB.totalGames : 0;

      if (sortDirection === 'desc') {
        return winPctB - winPctA;
      } else {
        return winPctA - winPctB;
      }
    });

    return sorted;
  }, [currentSeasonMembers, h2hMatrix, sortByTeam, sortDirection]);

  // Handle team header click for sorting
  const handleTeamSort = (teamId: string) => {
    if (sortByTeam === teamId) {
      // Toggle direction if same team
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // New team, default to descending
      setSortByTeam(teamId);
      setSortDirection('desc');
    }
  };

  // Reset sorting
  const handleResetSort = () => {
    setSortByTeam(null);
    setSortDirection('desc');
  };

  // Calculate interesting matchups for highlighting - SIMPLIFIED
  const highlightedMatchups = useMemo(() => {
    if (highlightOption === 'none') return new Set<string>();

    const matchupStats: Array<{
      key: string;
      value: number; // The metric we're highlighting by
    }> = [];

    // Calculate stats for all unique matchups
    currentSeasonMembers.forEach(team1 => {
      currentSeasonMembers.forEach(team2 => {
        if (team1.userId < team2.userId) { // Only process each pair once
          const record1 = h2hMatrix.get(team1.userId)?.get(team2.userId);

          if (record1 && record1.totalGames > 0) {
            const key = [team1.userId, team2.userId].sort().join('-');
            const totalGames = record1.totalGames;
            const wins1 = record1.wins;
            const wins2 = record1.totalGames - record1.wins - (record1.ties || 0);

            let value = 0;
            let meetsThreshold = false;

            if (highlightOption === 'lopsided') {
              // Lopsidedness = max wins / total games (0.5 = even, 1.0 = total domination)
              if (totalGames >= minGames) {
                const maxWins = Math.max(wins1, wins2);
                const winPct = (maxWins / totalGames) * 100;
                value = winPct;
                meetsThreshold = winPct >= highlightThreshold;
              }
            } else if (highlightOption === 'closest') {
              // Closeness = how close to 50/50 (100 = perfectly even, 0 = totally lopsided)
              if (totalGames >= minGames) {
                const maxWins = Math.max(wins1, wins2);
                const winPct = maxWins / totalGames;
                const closeness = (1 - Math.abs(winPct - 0.5) * 2) * 100; // 0-100 scale
                value = closeness;
                meetsThreshold = closeness >= highlightThreshold;
              }
            } else if (highlightOption === 'most_played') {
              value = totalGames;
              meetsThreshold = totalGames >= highlightThreshold;
            }

            if (meetsThreshold) {
              matchupStats.push({ key, value });
            }
          }
        }
      });
    });

    // Return all matchups that meet threshold
    return new Set(matchupStats.map(m => m.key));
  }, [highlightOption, currentSeasonMembers, h2hMatrix, highlightThreshold, minGames]);

  // Check if a matchup should be highlighted
  const isHighlighted = (team1Id: string, team2Id: string): boolean => {
    if (team1Id === team2Id) return false;
    const key = [team1Id, team2Id].sort().join('-');
    return highlightedMatchups.has(key);
  };

  // Handle cell click to show matchup details
  const handleCellClick = (team1: TeamInfo, team2: TeamInfo) => {
    const key = [team1.userId, team2.userId].sort().join('-');
    const matchups = matchupDetails.get(key) || [];

    if (matchups.length > 0) {
      setModalTeam1(team1);
      setModalTeam2(team2);
      setSelectedMatchups(matchups);
      setModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Head-to-Head Matrix</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Compare matchup records between all teams</p>
          </div>
          <div className="flex justify-center items-center min-h-96">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Head-to-Head Matrix</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">All-time head-to-head records for current season members</p>
        </div>

        {/* H2H Matrix Table */}
        {currentSeasonMembers.length > 0 ? (
          <div className="card overflow-x-auto">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedFilter === 'ALL_TIME' ? 'All Members' : `${getLeagueName(selectedFilter as LeagueTier)} League - ${CURRENT_YEAR}`}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedFilter === 'ALL_TIME'
                    ? 'All-time records between all FFU members (rows beat columns)'
                    : 'All-time records between current season members (rows beat columns)'}
                </p>
              </div>

              {/* Filter Dropdown and Controls */}
              <div className="flex flex-col gap-3">
                {/* Dropdowns Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide whitespace-nowrap">
                      View
                    </label>
                    <div className="relative w-48">
                      <select
                        value={selectedFilter}
                        onChange={(e) => {
                          const filter = e.target.value as LeagueFilter;
                          setSelectedFilter(filter);
                          updateParams({ filter });
                        }}
                        className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                      >
                        {filterOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide whitespace-nowrap">
                      Highlight
                    </label>
                    <div className="relative w-48">
                      <select
                        value={highlightOption}
                        onChange={(e) => {
                          const option = e.target.value as HighlightOption;
                          setHighlightOption(option);
                          // Set default threshold based on option
                          if (option === 'lopsided') {
                            setHighlightThreshold(75);
                            setMinGames(3);
                          } else if (option === 'closest') {
                            setHighlightThreshold(80);
                            setMinGames(5);
                          } else if (option === 'most_played') {
                            setHighlightThreshold(10);
                          }
                        }}
                        className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                      >
                        <option value="none">None</option>
                        <option value="lopsided">Most Lopsided</option>
                        <option value="closest">Closest Records</option>
                        <option value="most_played">Most Played</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {sortByTeam && (
                    <button
                      onClick={handleResetSort}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Sort
                    </button>
                  )}
                </div>

                {/* Checkboxes and Slider Row */}
                <div className="flex flex-wrap items-center gap-4">
                  {selectedFilter === 'ALL_TIME' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterBySeasons}
                        onChange={(e) => setFilterBySeasons(e.target.checked)}
                        className="w-4 h-4 text-ffu-red bg-gray-100 border-gray-300 rounded focus:ring-ffu-red dark:focus:ring-ffu-red dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        5+ Seasons
                      </span>
                    </label>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludePlayoffs}
                      onChange={(e) => setExcludePlayoffs(e.target.checked)}
                      className="w-4 h-4 text-ffu-red bg-gray-100 border-gray-300 rounded focus:ring-ffu-red dark:focus:ring-ffu-red dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      Exclude Playoffs
                    </span>
                  </label>

                  {highlightOption !== 'none' && (
                    <>
                      {(highlightOption === 'lopsided' || highlightOption === 'closest') && (
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            Min Games ≥ {minGames}
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={15}
                            value={minGames}
                            onChange={(e) => setMinGames(parseInt(e.target.value))}
                            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-500"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {highlightOption === 'lopsided' && `Win % ≥ ${highlightThreshold}%`}
                          {highlightOption === 'closest' && `Closeness ≥ ${highlightThreshold}%`}
                          {highlightOption === 'most_played' && `Games ≥ ${highlightThreshold}`}
                        </label>
                        <input
                          type="range"
                          min={highlightOption === 'most_played' ? 5 : 50}
                          max={highlightOption === 'most_played' ? 30 : 100}
                          value={highlightThreshold}
                          onChange={(e) => setHighlightThreshold(parseInt(e.target.value))}
                          className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center justify-center gap-1">
                        <span>Team</span>
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      </div>
                    </th>
                    {sortedMembers.map(team => (
                      <th
                        key={team.userId}
                        className={`bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 min-w-[60px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${sortByTeam === team.userId ? 'ring-2 ring-ffu-red ring-inset' : ''}`}
                        onClick={() => handleTeamSort(team.userId)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <TeamLogo
                            teamName={team.teamName}
                            abbreviation={team.abbreviation}
                            size="xs"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 font-mono">
                              {team.abbreviation}
                            </span>
                            {sortByTeam === team.userId && (
                              <ArrowUpDown className="h-3 w-3 text-ffu-red" />
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.map(rowTeam => (
                    <tr key={rowTeam.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td
                        className={`sticky left-0 z-10 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${sortByTeam === rowTeam.userId ? 'ring-2 ring-ffu-red ring-inset' : ''}`}
                        onClick={() => handleTeamSort(rowTeam.userId)}
                      >
                        <div className="flex items-center gap-2">
                          <TeamLogo
                            teamName={rowTeam.teamName}
                            abbreviation={rowTeam.abbreviation}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {rowTeam.teamName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {rowTeam.abbreviation}
                            </div>
                          </div>
                          {sortByTeam === rowTeam.userId && (
                            <ArrowUpDown className="h-4 w-4 text-ffu-red flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      {sortedMembers.map(colTeam => {
                        if (rowTeam.userId === colTeam.userId) {
                          return (
                            <td
                              key={colTeam.userId}
                              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 text-center"
                            >
                              <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                            </td>
                          );
                        }

                        const record = h2hMatrix.get(rowTeam.userId)?.get(colTeam.userId);
                        const wins = record?.wins || 0;
                        const losses = record?.losses || 0;
                        const ties = record?.ties || 0;
                        const totalGames = record?.totalGames || 0;
                        const highlighted = isHighlighted(rowTeam.userId, colTeam.userId);

                        // Determine cell color based on record
                        let cellColor = 'bg-white dark:bg-gray-900';

                        if (highlighted) {
                          // Simple purple highlight for top 10
                          cellColor = 'bg-purple-200 dark:bg-purple-900/40';
                        } else if (totalGames > 0) {
                          const winPct = wins / totalGames;
                          if (winPct > 0.6) {
                            cellColor = 'bg-green-50 dark:bg-green-900/20';
                          } else if (winPct < 0.4) {
                            cellColor = 'bg-red-50 dark:bg-red-900/20';
                          } else {
                            cellColor = 'bg-yellow-50 dark:bg-yellow-900/20';
                          }
                        }

                        const borderClass = highlighted
                          ? 'border-2 border-purple-500 dark:border-purple-400'
                          : 'border border-gray-300 dark:border-gray-600';

                        return (
                          <td
                            key={colTeam.userId}
                            className={`${cellColor} ${borderClass} p-2 text-center ${totalGames > 0 ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
                            onClick={() => totalGames > 0 && handleCellClick(rowTeam, colTeam)}
                          >
                            {totalGames > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
                                  {wins}-{losses}{ties > 0 ? `-${ties}` : ''}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({totalGames})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-600">0-0</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>• Green indicates winning record (60%+), Yellow indicates even record (40-60%), Red indicates losing record (&lt;40%)</p>
              <p>• Records show: Wins-Losses (Total Games)</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <p className="text-center text-gray-500 dark:text-gray-400">
              No data available for {getLeagueName(selectedLeague)} league in {CURRENT_YEAR}
            </p>
          </div>
        )}

        {/* Matchup Details Modal */}
        {modalOpen && modalTeam1 && modalTeam2 && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setModalOpen(false)}>
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" />

              {/* Center modal */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

              {/* Modal panel */}
              <div
                className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="space-y-4">
                  {/* Header with team info and record in one compact section */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                    <div className="flex items-center justify-between gap-4">
                      {/* Team 1 */}
                      <div className="flex items-center gap-3">
                        <TeamLogo
                          teamName={modalTeam1.teamName}
                          abbreviation={modalTeam1.abbreviation}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {modalTeam1.teamName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {modalTeam1.abbreviation}
                          </div>
                        </div>
                      </div>

                      {/* Record */}
                      <div className="text-center">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const team1Wins = selectedMatchups.filter(m => !m.isTie && m.winner === modalTeam1.userId).length;
                            const team2Wins = selectedMatchups.filter(m => !m.isTie && m.winner === modalTeam2.userId).length;
                            const ties = selectedMatchups.filter(m => m.isTie).length;

                            return (
                              <>
                                <span className={`text-2xl font-bold ${
                                  team1Wins > team2Wins ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {team1Wins}
                                </span>
                                <span className="text-lg text-gray-400">-</span>
                                <span className={`text-2xl font-bold ${
                                  team2Wins > team1Wins ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {team2Wins}
                                </span>
                                {ties > 0 && (
                                  <>
                                    <span className="text-lg text-gray-400">-</span>
                                    <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                      {ties}
                                    </span>
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {selectedMatchups.length} game{selectedMatchups.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {modalTeam2.teamName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {modalTeam2.abbreviation}
                          </div>
                        </div>
                        <TeamLogo
                          teamName={modalTeam2.teamName}
                          abbreviation={modalTeam2.abbreviation}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Matchup List */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      All Games
                    </h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedMatchups.map((matchup, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 p-4 rounded">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <LeagueBadge league={matchup.league} />
                              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>{matchup.year} • Week {matchup.week}</span>
                              </div>
                              {matchup.placementType && (
                                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded">
                                  {matchup.placementType}
                                </span>
                              )}
                              {matchup.isTie && (
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded">
                                  TIE
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between lg:justify-end space-x-3">
                              <div className="flex items-center space-x-2">
                                <TeamLogo
                                  teamName={matchup.winnerInfo.teamName}
                                  abbreviation={matchup.winnerInfo.abbreviation}
                                  size="sm"
                                />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {matchup.winnerInfo.abbreviation}
                                </span>
                              </div>

                              <div className="text-center">
                                <div className="font-bold text-lg">
                                  <span className={matchup.isTie ? 'text-gray-600 dark:text-gray-400' : 'text-emerald-600'}>
                                    {matchup.winnerScore.toFixed(1)}
                                  </span>
                                  <span className="text-gray-400 mx-2">-</span>
                                  <span className={matchup.isTie ? 'text-gray-600 dark:text-gray-400' : 'text-red-600'}>
                                    {matchup.loserScore.toFixed(1)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {matchup.loserInfo.abbreviation}
                                </span>
                                <TeamLogo
                                  teamName={matchup.loserInfo.teamName}
                                  abbreviation={matchup.loserInfo.abbreviation}
                                  size="sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
