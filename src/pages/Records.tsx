import { useEffect, useMemo, useState } from 'react';
import { useUrlParams } from '../hooks/useUrlParams';
import { Link } from 'react-router-dom';
import { useAllTimeRecords } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import { useTeamProfileModal } from '../contexts/TeamProfileModalContext';
import type { LeagueTier } from '../types';
import { ChevronDown } from 'lucide-react';

export const Records = () => {
  const { getParam, updateParams } = useUrlParams();
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [topScoresLeague, setTopScoresLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [topScoresYear, setTopScoresYear] = useState<string>('ALL');
  const [topScoresTeam, setTopScoresTeam] = useState<string>('ALL');
  const [sortMode, setSortMode] = useState<'highest' | 'lowest' | 'closest' | 'blowout' | 'most-combined' | 'least-combined'>('highest');
  const [excludePlayoffs, setExcludePlayoffs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [, setImageError] = useState(false);
  const dakUrl = `${import.meta.env.BASE_URL}dak-head.png`;
  const { openTeamProfile } = useTeamProfileModal();

  const { data: records, isLoading, error } = useAllTimeRecords(
    selectedLeague === 'ALL' ? undefined : selectedLeague,
    selectedYear === 'ALL' ? undefined : selectedYear
  );

  // Initialize from URL params on mount
  useEffect(() => {
    const league = getParam('league', 'ALL');
    if (['ALL', 'PREMIER', 'MASTERS', 'NATIONAL'].includes(league)) {
      setSelectedLeague(league as LeagueTier | 'ALL');
    }

    setSelectedYear(getParam('year', 'ALL'));
  }, []); // Empty dependency array - only run on mount

  const leagues: (LeagueTier | 'ALL')[] = ['ALL', 'PREMIER', 'MASTERS', 'NATIONAL'];
  const years = ['ALL', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];
  const validYearsByLeague: Record<string, string[]> = {
    ALL: years,
    PREMIER: years,
    NATIONAL: years,
    MASTERS: ['ALL', '2025', '2024', '2023', '2022'], // no 2021, 2020
  };

  // Playoff weeks mapping by season
  // Most seasons: weeks 15-17 are playoffs
  // Some older seasons: weeks 14-16 are playoffs
  const playoffWeeksByYear: Record<string, number[]> = {
    '2025': [15, 16, 17],
    '2024': [15, 16, 17],
    '2023': [15, 16, 17],
    '2022': [15, 16, 17],
    '2021': [15, 16, 17],
    '2020': [14, 15, 16],
    '2019': [14, 15, 16],
    '2018': [14, 15, 16],
  };

  // Helper function to check if a game is a playoff game
  const isPlayoffGame = (year: string, week: number): boolean => {
    const playoffWeeks = playoffWeeksByYear[year];
    return playoffWeeks ? playoffWeeks.includes(week) : false;
  };

  const filteredYears = useMemo(() => {
    return validYearsByLeague[selectedLeague] || years;
  }, [selectedLeague]);

  useEffect(() => {
    if (!filteredYears.includes(selectedYear)) {
      setSelectedYear('ALL');
      updateParams({ year: null });
    }
  }, [selectedLeague, filteredYears, selectedYear, updateParams]);

  // Get all unique teams from top scores
  const allTeams = useMemo(() => {
    if (!records?.topScores) return [];
    const teams = new Set<string>();
    records.topScores.forEach(record => {
      teams.add(record.userInfo.teamName);
    });
    return Array.from(teams).sort();
  }, [records?.topScores]);

  // Create score rankings for badge display
  const scoreRankings = useMemo(() => {
    if (!records?.topScores) return { highestRanks: new Map<string, number>(), lowestRanks: new Map<string, number>() };

    // Filter out playoff games if checkbox is checked
    let scoresToRank = records.topScores;
    if (excludePlayoffs) {
      scoresToRank = records.topScores.filter(record => !isPlayoffGame(record.year, record.week));
    }

    // Sort by score descending to get highest-to-lowest rankings
    const sortedByHighest = [...scoresToRank].sort((a, b) => b.score - a.score);
    const highestRanks = new Map<string, number>();
    sortedByHighest.forEach((record, index) => {
      const key = `${record.userInfo.userId}-${record.year}-${record.week}`;
      highestRanks.set(key, index + 1);
    });

    // Sort by score ascending to get lowest-to-highest rankings
    const sortedByLowest = [...scoresToRank].sort((a, b) => a.score - b.score);
    const lowestRanks = new Map<string, number>();
    sortedByLowest.forEach((record, index) => {
      const key = `${record.userInfo.userId}-${record.year}-${record.week}`;
      lowestRanks.set(key, index + 1);
    });

    return { highestRanks, lowestRanks };
  }, [records?.topScores, excludePlayoffs]);

  // Convert individual scores to unique matchups
  const matchupsData = useMemo(() => {
    if (!records?.topScores) return [];

    // Group scores by game using both team IDs to create unique matchup keys
    const gamesMap = new Map<string, any[]>();

    records.topScores.forEach(record => {
      // Only include if opponent exists
      if (!record.opponent || record.opponentScore === undefined) return;

      // Create a consistent gameKey using sorted team IDs to ensure both records map to the same key
      const teamIds = [record.userInfo.userId, record.opponent.userId].sort();
      const gameKey = `${record.year}-${record.week}-${record.league}-${teamIds.join('-')}`;

      if (!gamesMap.has(gameKey)) {
        gamesMap.set(gameKey, []);
      }
      gamesMap.get(gameKey)!.push(record);
    });

    // Create matchup objects (one per game)
    const matchups: any[] = [];
    gamesMap.forEach((scores) => {
      if (scores.length !== 2) return; // Skip if we don't have both teams

      const [team1, team2] = scores;
      const margin = Math.abs(team1.score - team2.score);

      // Determine winner and loser
      const winner = team1.score > team2.score ? team1 : team2;
      const loser = team1.score > team2.score ? team2 : team1;

      const team1Key = `${team1.userInfo.userId}-${team1.year}-${team1.week}`;
      const team2Key = `${team2.userInfo.userId}-${team2.year}-${team2.week}`;

      matchups.push({
        year: team1.year,
        week: team1.week,
        league: team1.league,
        team1: team1.userInfo,
        team1Score: team1.score,
        team1HighRank: scoreRankings.highestRanks?.get(team1Key) || 0,
        team1LowRank: scoreRankings.lowestRanks?.get(team1Key) || 0,
        team2: team2.userInfo,
        team2Score: team2.score,
        team2HighRank: scoreRankings.highestRanks?.get(team2Key) || 0,
        team2LowRank: scoreRankings.lowestRanks?.get(team2Key) || 0,
        margin,
        winner,
        loser,
        highestScore: Math.max(team1.score, team2.score),
        lowestScore: Math.min(team1.score, team2.score),
        combinedScore: team1.score + team2.score
      });
    });

    return matchups;
  }, [records?.topScores, scoreRankings]);

  // Filter and sort matchups
  const filteredAndSortedMatchups = useMemo(() => {
    let filtered = [...matchupsData];

    // Filter by league
    if (topScoresLeague !== 'ALL') {
      filtered = filtered.filter(matchup => matchup.league === topScoresLeague);
    }

    // Filter by year
    if (topScoresYear !== 'ALL') {
      filtered = filtered.filter(matchup => matchup.year === topScoresYear);
    }

    // Filter by team (either team1 or team2)
    if (topScoresTeam !== 'ALL') {
      filtered = filtered.filter(matchup =>
        matchup.team1.teamName === topScoresTeam ||
        matchup.team2.teamName === topScoresTeam
      );
    }

    // Filter out playoff games if checkbox is checked
    if (excludePlayoffs) {
      filtered = filtered.filter(matchup => !isPlayoffGame(matchup.year, matchup.week));
    }

    // Sort based on mode
    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'highest':
          return b.highestScore - a.highestScore;
        case 'lowest':
          return a.lowestScore - b.lowestScore;
        case 'closest':
          return a.margin - b.margin;
        case 'blowout':
          return b.margin - a.margin;
        case 'most-combined':
          return b.combinedScore - a.combinedScore;
        case 'least-combined':
          return a.combinedScore - b.combinedScore;
        default:
          return 0;
      }
    });

    return filtered;
  }, [matchupsData, topScoresLeague, topScoresYear, topScoresTeam, sortMode, excludePlayoffs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [topScoresLeague, topScoresYear, topScoresTeam, sortMode, excludePlayoffs]);

  // Paginate matchups
  const paginatedMatchups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedMatchups.slice(startIndex, endIndex);
  }, [filteredAndSortedMatchups, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedMatchups.length / itemsPerPage);

  const getLeagueName = (league: LeagueTier | 'ALL'): string => {
    switch (league) {
      case 'PREMIER': return 'Premier';
      case 'MASTERS': return 'Masters';
      case 'NATIONAL': return 'National';
      case 'ALL': return 'All Leagues';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">All-Time Records</h1>
        </div>
        <div className="flex justify-center items-center min-h-96">
          <LoadingSpinner size="lg" />
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">All-Time Records</h1>
        </div>

        {records && (
          <div className="space-y-6">
            <div className="card">
              <div>
                {/* Pagination Controls - Top */}
                {totalPages > 1 && (
                  <div className="mb-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedMatchups.length)} of {filteredAndSortedMatchups.length} games
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}

                {/* Filters and Sort for Matchups Table */}
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Sort By</label>
                      <div className="relative">
                        <select
                          value={sortMode}
                          onChange={(e) => setSortMode(e.target.value as 'highest' | 'lowest' | 'closest' | 'blowout' | 'most-combined' | 'least-combined')}
                          className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                        >
                          <option value="highest">Highest Score</option>
                          <option value="lowest">Lowest Score</option>
                          <option value="closest">Closest Game</option>
                          <option value="blowout">Biggest Blowout</option>
                          <option value="most-combined">Most Combined Points</option>
                          <option value="least-combined">Least Combined Points</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Filter by League</label>
                      <div className="relative">
                        <select
                          value={topScoresLeague}
                          onChange={(e) => setTopScoresLeague(e.target.value as LeagueTier | 'ALL')}
                          className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                        >
                          {leagues.map(league => (
                            <option key={league} value={league}>{getLeagueName(league)}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Filter by Year</label>
                      <div className="relative">
                        <select
                          value={topScoresYear}
                          onChange={(e) => setTopScoresYear(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                        >
                          {years.map(year => (
                            <option key={year} value={year}>{year === 'ALL' ? 'All Years' : year}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Filter by Team</label>
                      <div className="relative">
                        <select
                          value={topScoresTeam}
                          onChange={(e) => setTopScoresTeam(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                        >
                          <option value="ALL">All Teams</option>
                          {allTeams.map(team => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Playoff Filter Checkbox */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="excludePlayoffs"
                      checked={excludePlayoffs}
                      onChange={(e) => setExcludePlayoffs(e.target.checked)}
                      className="h-4 w-4 text-ffu-red focus:ring-ffu-red border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="excludePlayoffs"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                    >
                      Exclude Playoff & Consolation Games
                    </label>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        </th>
                        <th scope="col" colSpan={2} className="px-3 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Winner
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Margin
                        </th>
                        <th scope="col" colSpan={2} className="px-3 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Loser
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Year
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Week
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          League
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedMatchups.map((matchup, index) => {
                        const startRank = (currentPage - 1) * itemsPerPage + index + 1;

                        // Determine winner and loser
                        const isTeam1Winner = matchup.team1Score > matchup.team2Score;
                        const winnerTeam = isTeam1Winner ? matchup.team1 : matchup.team2;
                        const loserTeam = isTeam1Winner ? matchup.team2 : matchup.team1;
                        const winnerScore = isTeam1Winner ? matchup.team1Score : matchup.team2Score;
                        const loserScore = isTeam1Winner ? matchup.team2Score : matchup.team1Score;
                        const winnerHighRank = isTeam1Winner ? matchup.team1HighRank : matchup.team2HighRank;
                        const winnerLowRank = isTeam1Winner ? matchup.team1LowRank : matchup.team2LowRank;
                        const loserHighRank = isTeam1Winner ? matchup.team2HighRank : matchup.team1HighRank;
                        const loserLowRank = isTeam1Winner ? matchup.team2LowRank : matchup.team1LowRank;

                        // Helper to render score with badge
                        const renderScoreWithBadge = (score: number, highRank: number, lowRank: number, alignment: 'left' | 'right') => {
                          let showBadge = false;
                          let badgeRank = 0;
                          let badgeColor = '';

                          // Show high rank badge if in top 100 highest scores
                          if (highRank <= 100 && highRank > 0) {
                            showBadge = true;
                            badgeRank = highRank;
                            badgeColor = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
                          }
                          // Show low rank badge if in bottom 100 lowest scores
                          else if (lowRank <= 100 && lowRank > 0) {
                            showBadge = true;
                            badgeRank = lowRank;
                            badgeColor = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
                          }

                          const badge = showBadge ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${badgeColor}`}>
                              #{badgeRank}
                            </span>
                          ) : null;

                          return (
                            <div className={`flex items-center gap-2 ${alignment === 'right' ? 'justify-end' : 'justify-start'}`}>
                              {alignment === 'right' && badge}
                              <span className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
                                {score.toFixed(2)}
                              </span>
                              {alignment === 'left' && badge}
                            </div>
                          );
                        };

                        return (
                          <tr
                            key={`${matchup.year}-${matchup.week}-${matchup.team1.userId}-${matchup.team2.userId}`}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {startRank}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <TeamLogo
                                  teamName={winnerTeam.teamName}
                                  size="sm"
                                  clickable
                                  onClick={() => openTeamProfile(winnerTeam.userId, winnerTeam.teamName)}
                                />
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {winnerTeam.teamName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {winnerTeam.abbreviation}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {renderScoreWithBadge(winnerScore, winnerHighRank, winnerLowRank, 'right')}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400 font-mono">
                                {matchup.margin.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {renderScoreWithBadge(loserScore, loserHighRank, loserLowRank, 'left')}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-2">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                                    {loserTeam.teamName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                                    {loserTeam.abbreviation}
                                  </div>
                                </div>
                                <TeamLogo
                                  teamName={loserTeam.teamName}
                                  size="sm"
                                  clickable
                                  onClick={() => openTeamProfile(loserTeam.userId, loserTeam.teamName)}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {matchup.year}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                Week {matchup.week}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <LeagueBadge league={matchup.league} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedMatchups.length)} of {filteredAndSortedMatchups.length} games
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!records && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              No records available. Data is being processed...
            </div>
          </div>
        )}

        {/* Secret Dak Trigger - Bottom Right */}
        <Link
          to="/secret-dak"
          className="fixed bottom-4 right-4 group"
          title="Secret Dak"
        >
          <div className="relative">
            {/* You'll need to add the Dak image here */}
            <div className="w-16 h-16 flex items-center justify-center text-white font-bold text-xs transition-all duration-300 transform hover:scale-105">
              <img
                src={dakUrl}
                alt={`dak`}
                className="w-full h-full object-cover transition-colors"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            </div>

            {/* Speech bubble */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap relative">
                pssst! pick me 1.01!
                <div className="absolute top-full right-4 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};