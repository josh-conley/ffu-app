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
import { Target, TrendingDown, TrendingUp, Calendar, ChevronDown, Crown, Sparkles, Gauge, Zap, Skull, Laugh, Swords, Angry, Bomb, ArrowUp, ArrowDown, ChevronUp} from 'lucide-react';

export const Records = () => {
  const { getParam, updateParams } = useUrlParams();
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [topScoresLeague, setTopScoresLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [topScoresYear, setTopScoresYear] = useState<string>('ALL');
  const [topScoresTeam, setTopScoresTeam] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [closestMatchupsLeague, setClosestMatchupsLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [closestMatchupsYear, setClosestMatchupsYear] = useState<string>('ALL');
  const [closestMatchupsTeam, setClosestMatchupsTeam] = useState<string>('ALL');
  const [singleGameCollapsed, setSingleGameCollapsed] = useState(false);
  const [seasonCollapsed, setSeasonCollapsed] = useState(false);
  const [specialGameCollapsed, setSpecialGameCollapsed] = useState(false);
  const [topScoresCollapsed, setTopScoresCollapsed] = useState(true);
  const [closestMatchupsCollapsed, setClosestMatchupsCollapsed] = useState(true);
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

  // Get all unique teams from closest matchups
  const allMatchupTeams = useMemo(() => {
    if (!records?.topClosestMatchups) return [];
    const teams = new Set<string>();
    records.topClosestMatchups.forEach(matchup => {
      teams.add(matchup.winner.teamName);
      teams.add(matchup.loser.teamName);
    });
    return Array.from(teams).sort();
  }, [records?.topClosestMatchups]);

  // Filter and sort top scores
  const filteredAndSortedTopScores = useMemo(() => {
    if (!records?.topScores) return [];

    let filtered = [...records.topScores];

    // Filter by league
    if (topScoresLeague !== 'ALL') {
      filtered = filtered.filter(record => record.league === topScoresLeague);
    }

    // Filter by year
    if (topScoresYear !== 'ALL') {
      filtered = filtered.filter(record => record.year === topScoresYear);
    }

    // Filter by team
    if (topScoresTeam !== 'ALL') {
      filtered = filtered.filter(record => record.userInfo.teamName === topScoresTeam);
    }

    // Sort by score
    filtered.sort((a, b) => {
      return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
    });

    return filtered;
  }, [records?.topScores, topScoresLeague, topScoresYear, topScoresTeam, sortOrder]);

  // Filter closest matchups
  const filteredClosestMatchups = useMemo(() => {
    if (!records?.topClosestMatchups) return [];

    let filtered = [...records.topClosestMatchups];

    // Filter by league
    if (closestMatchupsLeague !== 'ALL') {
      filtered = filtered.filter(matchup => matchup.league === closestMatchupsLeague);
    }

    // Filter by year
    if (closestMatchupsYear !== 'ALL') {
      filtered = filtered.filter(matchup => matchup.year === closestMatchupsYear);
    }

    // Filter by team (either winner or loser)
    if (closestMatchupsTeam !== 'ALL') {
      filtered = filtered.filter(matchup =>
        matchup.winner.teamName === closestMatchupsTeam ||
        matchup.loser.teamName === closestMatchupsTeam
      );
    }

    return filtered;
  }, [records?.topClosestMatchups, closestMatchupsLeague, closestMatchupsYear, closestMatchupsTeam]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

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

      {/* Filters */}
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

      {/* Records Display */}
      {records && (
        <div className="space-y-6">
          {/* Single Game Records */}
          <div className="card">
            <h2
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center justify-between cursor-pointer hover:text-ffu-red transition-colors"
              onClick={() => setSingleGameCollapsed(!singleGameCollapsed)}
            >
              <div className="flex items-center">
                <Gauge className="h-6 w-6 mr-3 text-ffu-red" />
                Single Game Records
              </div>
              {singleGameCollapsed ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
            </h2>
            {!singleGameCollapsed && (
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
            )}
          </div>

          {/* Season Records */}
          <div className="card">
            <h2
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center justify-between cursor-pointer hover:text-ffu-red transition-colors"
              onClick={() => setSeasonCollapsed(!seasonCollapsed)}
            >
              <div className="flex items-center">
                <Zap className="h-6 w-6 mr-3 text-ffu-red" />
                Season Records
              </div>
              {seasonCollapsed ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
            </h2>
            {!seasonCollapsed && (
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
            )}
          </div>

          {/* Special Game Records */}
          <div className="card">
            <h2
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center justify-between cursor-pointer hover:text-ffu-red transition-colors"
              onClick={() => setSpecialGameCollapsed(!specialGameCollapsed)}
            >
              <div className="flex items-center">
                <Sparkles className="h-6 w-6 mr-3 text-ffu-red" />
                Special Game Records
              </div>
              {specialGameCollapsed ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
            </h2>
            {!specialGameCollapsed && (
              <div>
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
            )}
          </div>

          {/* Top 100 Highest Scores */}
          <div className="card">
            <h2
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center justify-between cursor-pointer hover:text-ffu-red transition-colors"
              onClick={() => setTopScoresCollapsed(!topScoresCollapsed)}
            >
              <div className="flex items-center">
                <Crown className="h-6 w-6 mr-3 text-ffu-red" />
                Top 100 Highest Scores
              </div>
              {topScoresCollapsed ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
            </h2>
            {!topScoresCollapsed && (
              <div>
                {/* Filters for Top Scores Table */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                          Team
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                          onClick={toggleSortOrder}
                        >
                          <div className="flex items-center justify-end space-x-1">
                            <span>Score</span>
                            {sortOrder === 'desc' ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUp className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          vs
                        </th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Opp Score
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
                      {filteredAndSortedTopScores.map((record, index) => (
                        <tr
                          key={`${record.userInfo.userId}-${record.year}-${record.week}-${index}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <TeamLogo
                                teamName={record.userInfo.teamName}
                                size="sm"
                                clickable
                                onClick={() => openTeamProfile(record.userInfo.userId, record.userInfo.teamName)}
                              />
                              <div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {record.userInfo.teamName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {record.userInfo.abbreviation}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                              {record.score.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {record.opponent && (
                              <div className="flex items-center space-x-2">
                                <TeamLogo
                                  teamName={record.opponent.teamName}
                                  size="sm"
                                  clickable
                                  onClick={() => openTeamProfile(record.opponent!.userId, record.opponent!.teamName)}
                                />
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {record.opponent.teamName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {record.opponent.abbreviation}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right">
                            {record.opponentScore !== undefined && (
                              <div className="text-sm font-bold text-gray-600 dark:text-gray-400 font-mono">
                                {record.opponentScore.toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {record.year}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              Week {record.week}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <LeagueBadge league={record.league} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Top 25 Closest Matchups */}
          <div className="card">
            <h2
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center justify-between cursor-pointer hover:text-ffu-red transition-colors"
              onClick={() => setClosestMatchupsCollapsed(!closestMatchupsCollapsed)}
            >
              <div className="flex items-center">
                <Swords className="h-6 w-6 mr-3 text-ffu-red" />
                Top 25 Closest Matchups
              </div>
              {closestMatchupsCollapsed ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
            </h2>
            {!closestMatchupsCollapsed && (
            <div>
              {/* Filters for Closest Matchups */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Filter by League</label>
                  <div className="relative">
                    <select
                      value={closestMatchupsLeague}
                      onChange={(e) => setClosestMatchupsLeague(e.target.value as LeagueTier | 'ALL')}
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
                      value={closestMatchupsYear}
                      onChange={(e) => setClosestMatchupsYear(e.target.value)}
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
                      value={closestMatchupsTeam}
                      onChange={(e) => setClosestMatchupsTeam(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 appearance-none"
                    >
                      <option value="ALL">All Teams</option>
                      {allMatchupTeams.map(team => (
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
                      Winner
                    </th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Winner Score
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Loser
                    </th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Loser Score
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
                  {filteredClosestMatchups.map((matchup, index) => (
                    <tr
                      key={`${matchup.winner.userId}-${matchup.loser.userId}-${matchup.year}-${matchup.week}-${index}`}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <TeamLogo
                            teamName={matchup.winner.teamName}
                            size="sm"
                            clickable
                            onClick={() => openTeamProfile(matchup.winner.userId, matchup.winner.teamName)}
                          />
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {matchup.winner.teamName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {matchup.winner.abbreviation}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                          {matchup.winnerScore.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <TeamLogo
                            teamName={matchup.loser.teamName}
                            size="sm"
                            clickable
                            onClick={() => openTeamProfile(matchup.loser.userId, matchup.loser.teamName)}
                          />
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {matchup.loser.teamName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {matchup.loser.abbreviation}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-gray-600 dark:text-gray-400 font-mono">
                          {matchup.loserScore.toFixed(2)}
                        </div>
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
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            )}
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