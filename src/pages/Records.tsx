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
import { Target, TrendingDown, TrendingUp, Calendar, ChevronDown, Crown, Sparkles, Gauge, Zap, Skull, Laugh, Swords, Angry, Bomb } from 'lucide-react';

export const Records = () => {
  const { getParam, updateParams } = useUrlParams();
  const [activeView, setActiveView] = useState<'all-time' | 'top-scores'>('all-time');
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [topScoresLeague, setTopScoresLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [topScoresYear, setTopScoresYear] = useState<string>('ALL');
  const [topScoresTeam, setTopScoresTeam] = useState<string>('ALL');
  const [sortMode, setSortMode] = useState<'highest' | 'lowest' | 'closest' | 'blowout'>('highest');
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
    const view = getParam('view', 'all-time');
    if (['all-time', 'top-scores'].includes(view)) {
      setActiveView(view as 'all-time' | 'top-scores');
    }

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

    // Sort by score descending to get highest-to-lowest rankings
    const sortedByHighest = [...records.topScores].sort((a, b) => b.score - a.score);
    const highestRanks = new Map<string, number>();
    sortedByHighest.forEach((record, index) => {
      const key = `${record.userInfo.userId}-${record.year}-${record.week}`;
      highestRanks.set(key, index + 1);
    });

    // Sort by score ascending to get lowest-to-highest rankings
    const sortedByLowest = [...records.topScores].sort((a, b) => a.score - b.score);
    const lowestRanks = new Map<string, number>();
    sortedByLowest.forEach((record, index) => {
      const key = `${record.userInfo.userId}-${record.year}-${record.week}`;
      lowestRanks.set(key, index + 1);
    });

    return { highestRanks, lowestRanks };
  }, [records?.topScores]);

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
        lowestScore: Math.min(team1.score, team2.score)
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
        default:
          return 0;
      }
    });

    return filtered;
  }, [matchupsData, topScoresLeague, topScoresYear, topScoresTeam, sortMode]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [topScoresLeague, topScoresYear, topScoresTeam, sortMode]);

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

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">League</label>
            <select
              disabled
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sm:text-sm rounded-md"
            >
              <option>Loading...</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
            <select
              disabled
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sm:text-sm rounded-md"
            >
              <option>Loading...</option>
            </select>
          </div>
        </div>

        {/* Loading Records Display */}
        <div className="space-y-6">
          {/* Single Game Records Loading */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Single Game Records
            </h2>
            <div className="flex justify-center items-center min-h-32">
              <LoadingSpinner size="md" />
            </div>
          </div>

          {/* Season Records Loading */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Season Records
            </h2>
            <div className="flex justify-center items-center min-h-32">
              <LoadingSpinner size="md" />
            </div>
          </div>

          {/* Special Game Records Loading */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Special Game Records
            </h2>
            <div className="flex justify-center items-center min-h-40">
              <LoadingSpinner size="md" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">All-Time Records</h1>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => {
                setActiveView('all-time');
                updateParams({ view: 'all-time' });
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeView === 'all-time'
                  ? 'border-ffu-red text-ffu-red dark:text-ffu-red'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              All-Time Records
            </button>
            <button
              onClick={() => {
                setActiveView('top-scores');
                updateParams({ view: 'top-scores' });
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeView === 'top-scores'
                  ? 'border-ffu-red text-ffu-red dark:text-ffu-red'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              All Scores
            </button>
          </nav>
        </div>
      </div>

      {/* All-Time Records Tab - Filters */}
      {activeView === 'all-time' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">League</label>
            <div className="relative">
              <select
                value={selectedLeague}
                onChange={(e) => {
                  const league = e.target.value as LeagueTier | 'ALL';
                  setSelectedLeague(league);
                  updateParams({ league: league === 'ALL' ? null : league });
                }}
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {leagues.map(league => (
                  <option key={league} value={league}>{getLeagueName(league)}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Year</label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  const year = e.target.value;
                  setSelectedYear(year);
                  updateParams({ year: year === 'ALL' ? null : year });
                }}
                className="block w-full pl-4 pr-12 py-3 text-base font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
              >
                {filteredYears.map(year => (
                  <option key={year} value={year}>{year === 'ALL' ? 'All Years' : year}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All-Time Records Tab Content */}
      {activeView === 'all-time' && records && (
        <div className="space-y-6">
          {/* Single Game Records */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <Gauge className="h-6 w-6 mr-3 text-ffu-red" />
              Single Game Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Highest Single Game */}
              <div className="bg-green-50 dark:bg-green-900/30 angular-cut-medium p-6 border-l-4 border-green-500 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-green-800 dark:text-green-300 uppercase tracking-wide">Highest Score</h3>
                  <Crown className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.highestSingleGame.userInfo.teamName}
                    size="md"
                    clickable
                    onClick={() => openTeamProfile(records.highestSingleGame.userInfo.userId, records.highestSingleGame.userInfo.teamName)}
                  />
                  <div className="flex-1">
                    <div className="font-heading font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {records.highestSingleGame.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                      Week {records.highestSingleGame.week}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-heading font-black text-gray-900 dark:text-gray-100 font-mono">{records.highestSingleGame.score.toFixed(2)}</div>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <LeagueBadge league={records.highestSingleGame.league} />
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{records.highestSingleGame.year}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lowest Single Game */}
              <div className="bg-red-50 dark:bg-red-900/30 angular-cut-medium p-6 border-l-4 border-red-500 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-red-800 dark:text-red-300 uppercase tracking-wide">Lowest Score</h3>
                  <Skull className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.lowestSingleGame.userInfo.teamName}
                    size="md"
                    clickable
                    onClick={() => openTeamProfile(records.lowestSingleGame.userInfo.userId, records.lowestSingleGame.userInfo.teamName)}
                  />
                  <div className="flex-1">
                    <div className="font-heading font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {records.lowestSingleGame.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                      Week {records.lowestSingleGame.week}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-heading font-black text-gray-900 dark:text-gray-100 font-mono">{records.lowestSingleGame.score.toFixed(2)}</div>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <LeagueBadge league={records.lowestSingleGame.league} />
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{records.lowestSingleGame.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Season Records */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <Zap className="h-6 w-6 mr-3 text-ffu-red" />
              Season Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Points Season */}
              <div className="bg-blue-50 dark:bg-blue-900/30 angular-cut-medium p-6 border-l-4 border-blue-500 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">Most Points</h3>
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.mostPointsSeason.userInfo.teamName}
                    size="md"
                    clickable
                    onClick={() => openTeamProfile(records.mostPointsSeason.userInfo.userId, records.mostPointsSeason.userInfo.teamName)}
                  />
                  <div className="flex-1">
                    <div className="font-heading font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {records.mostPointsSeason.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                      {records.mostPointsSeason.year} Season
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-heading font-black text-gray-900 dark:text-gray-100 font-mono">{records.mostPointsSeason.points.toFixed(2)}</div>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <LeagueBadge league={records.mostPointsSeason.league} />
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{records.mostPointsSeason.year}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Least Points Season */}
              <div className="bg-amber-50 dark:bg-amber-900/30 angular-cut-medium p-6 border-l-4 border-amber-500 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Fewest Points</h3>
                  <TrendingDown className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.leastPointsSeason.userInfo.teamName}
                    size="md"
                    clickable
                    onClick={() => openTeamProfile(records.leastPointsSeason.userInfo.userId, records.leastPointsSeason.userInfo.teamName)}
                  />
                  <div className="flex-1">
                    <div className="font-heading font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {records.leastPointsSeason.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                      {records.leastPointsSeason.year} Season
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-heading font-black text-gray-900 dark:text-gray-100 font-mono">{records.leastPointsSeason.points.toFixed(2)}</div>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <LeagueBadge league={records.leastPointsSeason.league} />
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{records.leastPointsSeason.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Special Game Records */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <Sparkles className="h-6 w-6 mr-3 text-ffu-red" />
              Special Game Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Points in Loss */}
              <div className="bg-orange-50 dark:bg-orange-900/30 angular-cut-medium p-6 border-l-4 border-orange-500 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wide text-sm">Most Points in a Loss</h3>
                  <Angry className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.mostPointsInLoss.userInfo.teamName}
                    size="md"
                    clickable
                    onClick={() => openTeamProfile(records.mostPointsInLoss.userInfo.userId, records.mostPointsInLoss.userInfo.teamName)}
                  />
                  <div className="flex-1">
                    <div className="font-heading font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {records.mostPointsInLoss.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                      Week {records.mostPointsInLoss.week}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-heading font-black text-gray-900 dark:text-gray-100 font-mono">{records.mostPointsInLoss.score.toFixed(2)}</div>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <LeagueBadge league={records.mostPointsInLoss.league} />
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{records.mostPointsInLoss.year}</span>
                    </div>
                  </div>
                </div>
                {records.mostPointsInLoss.opponent && (
                  <div className="pt-3 mt-3 border-t border-orange-200 dark:border-orange-700">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Lost to:</div>
                    <div className="flex items-center space-x-2">
                      <TeamLogo
                        teamName={records.mostPointsInLoss.opponent.teamName}
                        size="sm"
                        clickable
                        onClick={() => records.mostPointsInLoss.opponent && openTeamProfile(records.mostPointsInLoss.opponent.userId, records.mostPointsInLoss.opponent.teamName)}
                      />
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {records.mostPointsInLoss.opponent.teamName}
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                        {records.mostPointsInLoss.opponentScore?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fewest Points in Win */}
              <div className="bg-purple-50 dark:bg-purple-900/30 angular-cut-medium p-6 border-l-4 border-purple-500 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide text-sm">Fewest Points in a Win</h3>
                  <Laugh className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.fewestPointsInWin.userInfo.teamName}
                    size="md"
                    clickable
                    onClick={() => openTeamProfile(records.fewestPointsInWin.userInfo.userId, records.fewestPointsInWin.userInfo.teamName)}
                  />
                  <div className="flex-1">
                    <div className="font-heading font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {records.fewestPointsInWin.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                      Week {records.fewestPointsInWin.week}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-heading font-black text-gray-900 dark:text-gray-100 font-mono">{records.fewestPointsInWin.score.toFixed(2)}</div>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <LeagueBadge league={records.fewestPointsInWin.league} />
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{records.fewestPointsInWin.year}</span>
                    </div>
                  </div>
                </div>
                {records.fewestPointsInWin.opponent && (
                  <div className="pt-3 mt-3 border-t border-purple-200 dark:border-purple-700">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Beat:</div>
                    <div className="flex items-center space-x-2">
                      <TeamLogo
                        teamName={records.fewestPointsInWin.opponent.teamName}
                        size="sm"
                        clickable
                        onClick={() => records.fewestPointsInWin.opponent && openTeamProfile(records.fewestPointsInWin.opponent.userId, records.fewestPointsInWin.opponent.teamName)}
                      />
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {records.fewestPointsInWin.opponent.teamName}
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                        {records.fewestPointsInWin.opponentScore?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Closest Game */}
              <div className="bg-yellow-50 dark:bg-yellow-900/30 angular-cut-medium p-6 border-l-4 border-yellow-500 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-yellow-800 dark:text-yellow-300 uppercase tracking-wide text-sm">Closest Game</h3>
                  <Swords className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-heading font-black text-gray-900 dark:text-gray-100 font-mono">
                      {records.closestGame.margin.toFixed(2)} pts
                    </div>
                  </div>

                  {/* Team Logos vs each other */}
                  <div className="flex items-start justify-center space-x-4 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <TeamLogo
                        teamName={records.closestGame.winner.teamName}
                        size="md"
                        clickable
                        onClick={() => openTeamProfile(records.closestGame.winner.userId, records.closestGame.winner.teamName)}
                      />
                      <div className="text-sm font-semibold text-center text-gray-900 dark:text-gray-100">
                        {records.closestGame.winner.teamName}
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                        {records.closestGame.winnerScore.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-gray-900 dark:text-gray-100 font-heading font-black text-lg self-center">VS</div>

                    <div className="flex flex-col items-center space-y-1">
                      <TeamLogo
                        teamName={records.closestGame.loser.teamName}
                        size="md"
                        clickable
                        onClick={() => openTeamProfile(records.closestGame.loser.userId, records.closestGame.loser.teamName)}
                      />
                      <div className="text-sm font-semibold text-center text-gray-900 dark:text-gray-100">
                        {records.closestGame.loser.teamName}
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                        {records.closestGame.loserScore.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center items-center space-x-2">
                    <LeagueBadge league={records.closestGame.league} />
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Week {records.closestGame.week}</span>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{records.closestGame.year}</span>
                  </div>
                </div>
              </div>

              {/* Biggest Blowout */}
              <div className="bg-pink-50 dark:bg-pink-900/30 angular-cut-medium p-6 border-l-4 border-pink-500 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-pink-800 dark:text-pink-300 uppercase tracking-wide text-sm">Biggest Blowout</h3>
                  <Bomb className="h-6 w-6 text-pink-600" />
                </div>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-heading font-black text-gray-900 dark:text-gray-100 font-mono">
                      {records.biggestBlowout.margin.toFixed(2)} pts
                    </div>
                  </div>

                  {/* Team Logos vs each other */}
                  <div className="flex items-start justify-center space-x-4 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <TeamLogo
                        teamName={records.biggestBlowout.winner.teamName}
                        size="md"
                        clickable
                        onClick={() => openTeamProfile(records.biggestBlowout.winner.userId, records.biggestBlowout.winner.teamName)}
                      />
                      <div className="text-sm font-semibold text-center text-gray-900 dark:text-gray-100">
                        {records.biggestBlowout.winner.teamName}
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                        {records.biggestBlowout.winnerScore.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-gray-900 dark:text-gray-100 font-heading font-black text-lg self-center">VS</div>

                    <div className="flex flex-col items-center space-y-1">
                      <TeamLogo
                        teamName={records.biggestBlowout.loser.teamName}
                        size="md"
                        clickable
                        onClick={() => openTeamProfile(records.biggestBlowout.loser.userId, records.biggestBlowout.loser.teamName)}
                      />
                      <div className="text-sm font-semibold text-center text-gray-900 dark:text-gray-100">
                        {records.biggestBlowout.loser.teamName}
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                        {records.biggestBlowout.loserScore.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center items-center space-x-2">
                    <LeagueBadge league={records.biggestBlowout.league} />
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Week {records.biggestBlowout.week}</span>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{records.biggestBlowout.year}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Scores Tab Content */}
      {activeView === 'top-scores' && records && (
        <div className="space-y-6">
          {/* All Game Scores */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <Crown className="h-6 w-6 mr-3 text-ffu-red" />
              All Game Scores
            </h2>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Sort By</label>
                    <div className="relative">
                      <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as 'highest' | 'lowest' | 'closest' | 'blowout')}
                        className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                      >
                        <option value="highest">Highest Score</option>
                        <option value="lowest">Lowest Score</option>
                        <option value="closest">Closest Game</option>
                        <option value="blowout">Biggest Blowout</option>
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

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Rank
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Team 1
                        </th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Team 1 Score
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Team 2 Score
                        </th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Team 2
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Margin
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

                        // Helper to render score with rank badge
                        const renderScoreWithBadge = (score: number, highRank: number, lowRank: number, isWinner: boolean) => {
                          let showBadge = false;
                          let badgeRank = 0;
                          let badgeColor = '';

                          // Show high rank badge for highest/closest/blowout sorts
                          if ((sortMode === 'highest' || sortMode === 'closest' || sortMode === 'blowout') && highRank <= 100) {
                            showBadge = true;
                            badgeRank = highRank;
                            badgeColor = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
                          }
                          // Show low rank badge for lowest sort
                          else if (sortMode === 'lowest' && lowRank <= 100) {
                            showBadge = true;
                            badgeRank = lowRank;
                            badgeColor = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
                          }

                          return (
                            <div className="flex items-center justify-end space-x-2">
                              <div className={`text-sm font-bold font-mono ${isWinner ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                {score.toFixed(2)}
                              </div>
                              {showBadge && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${badgeColor}`}>
                                  #{badgeRank}
                                </span>
                              )}
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
                                  teamName={matchup.team1.teamName}
                                  size="sm"
                                  clickable
                                  onClick={() => openTeamProfile(matchup.team1.userId, matchup.team1.teamName)}
                                />
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {matchup.team1.teamName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {matchup.team1.abbreviation}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-right">
                              {renderScoreWithBadge(
                                matchup.team1Score,
                                matchup.team1HighRank,
                                matchup.team1LowRank,
                                matchup.team1Score > matchup.team2Score
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <TeamLogo
                                  teamName={matchup.team2.teamName}
                                  size="sm"
                                  clickable
                                  onClick={() => openTeamProfile(matchup.team2.userId, matchup.team2.teamName)}
                                />
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {matchup.team2.teamName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {matchup.team2.abbreviation}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-right">
                              {renderScoreWithBadge(
                                matchup.team2Score,
                                matchup.team2HighRank,
                                matchup.team2LowRank,
                                matchup.team2Score > matchup.team1Score
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400 font-mono">
                                {matchup.margin.toFixed(2)}
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
  );
};