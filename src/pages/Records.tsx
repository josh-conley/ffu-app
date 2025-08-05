import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAllTimeRecords, useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import type { LeagueTier } from '../types';
import { Target, TrendingDown, TrendingUp, Award, Calendar, BarChart3, ChevronUp, ChevronDown, Crown, Sparkles, Gauge, Zap, Trophy, Skull, Laugh, Swords, Angry, Bomb} from 'lucide-react';

type SortKey = 'team' | 'year' | 'league' | 'record' | 'pointsFor' | 'avgPPG' | 'pointsAgainst' | 'placement';
type SortOrder = 'asc' | 'desc';

export const Records = () => {
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('year');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [, setImageError] = useState(false);
  const basePath = import.meta.env.MODE === 'production' ? '/ffu-app' : '';
  const dakUrl = `${basePath}/dak-head.png`;

  const { data: records, isLoading, error } = useAllTimeRecords(
    selectedLeague === 'ALL' ? undefined : selectedLeague,
    selectedYear === 'ALL' ? undefined : selectedYear
  );
  const { data: allStandings } = useAllStandings();

  const leagues: (LeagueTier | 'ALL')[] = ['ALL', 'PREMIER', 'MASTERS', 'NATIONAL'];
  const years = ['ALL', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];
  const validYearsByLeague: Record<string, string[]> = {
    ALL: years,
    PREMIER: years,
    NATIONAL: years,
    MASTERS: ['ALL', '2024', '2023', '2022'], // no 2021, 2020
  };

  const filteredYears = useMemo(() => {
    return validYearsByLeague[selectedLeague] || years;
  }, [selectedLeague]);

  useEffect(() => {
    if (!filteredYears.includes(selectedYear)) {
      setSelectedYear('ALL');
    }
  }, [selectedLeague, filteredYears, selectedYear]);

  const getLeagueName = (league: LeagueTier | 'ALL'): string => {
    switch (league) {
      case 'PREMIER': return 'Premier';
      case 'MASTERS': return 'Masters';
      case 'NATIONAL': return 'National';
      case 'ALL': return 'All Leagues';
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const getSortValue = (season: any, key: SortKey) => {
    switch (key) {
      case 'team':
        return season.userInfo.teamName.toLowerCase();
      case 'year':
        return season.year;
      case 'league':
        const leagueOrder: Record<string, number> = { 'PREMIER': 1, 'MASTERS': 2, 'NATIONAL': 3 };
        return leagueOrder[season.league] || 4;
      case 'record':
        return season.wins; // Use wins as sort key for records
      case 'pointsFor':
        return season.pointsFor;
      case 'avgPPG':
        return season.avgPointsPerGame;
      case 'pointsAgainst':
        return season.pointsAgainst;
      case 'placement':
        return season.playoffFinish || season.rank;
      default:
        return 0;
    }
  };

  const filteredSeasonHistory = useMemo(() => {
    if (!allStandings.length) return [];

    const filtered = allStandings.filter(leagueData => {
      if (selectedLeague !== 'ALL' && leagueData.league !== selectedLeague) return false;
      if (selectedYear !== 'ALL' && leagueData.year !== selectedYear) return false;
      return true;
    });

    const seasonEntries = filtered.flatMap(leagueData => 
      leagueData.standings.map(standing => {
        const totalGames = standing.wins + standing.losses;
        const avgScore = totalGames > 0 ? (standing.pointsFor || 0) / totalGames : 0;

        return {
          userId: standing.userId,
          userInfo: standing.userInfo,
          year: leagueData.year,
          league: leagueData.league as LeagueTier,
          wins: standing.wins,
          losses: standing.losses,
          pointsFor: standing.pointsFor || 0,
          pointsAgainst: standing.pointsAgainst || 0,
          rank: standing.rank,
          avgPointsPerGame: avgScore,
          playoffFinish: leagueData.playoffResults?.find(p => p.userId === standing.userId)?.placement
        };
      })
    );

    return seasonEntries.sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = (aValue as number) - (bValue as number);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });
  }, [allStandings, selectedLeague, selectedYear, sortKey, sortOrder]);


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
              onChange={(e) => setSelectedLeague(e.target.value as LeagueTier | 'ALL')}
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
              onChange={(e) => setSelectedYear(e.target.value)}
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

          {/* Season History Table */}
          {filteredSeasonHistory.length > 0 && (
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                <BarChart3 className="h-6 w-6 mr-3 text-ffu-red" />
                Season History
                <span className="ml-3 text-lg font-bold text-gray-500 dark:text-gray-400">
                  ({filteredSeasonHistory.length} total)
                </span>
              </h2>
              <div className="overflow-x-auto table-container">
                <table className="table md:table-fixed w-full min-w-[800px]">
                  <colgroup className="hidden md:table-column-group">
                    <col className="w-[28%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[11%]" />
                    <col className="w-[9%]" />
                    <col className="w-[11%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead className="table-header">
                    <tr>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={() => handleSort('team')}
                      >
                        <div className="flex items-center justify-between text-xs">
                          Team
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${sortKey === 'team' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'team' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={() => handleSort('year')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Year
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${sortKey === 'year' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'year' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={() => handleSort('league')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          League
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${sortKey === 'league' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'league' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={() => handleSort('record')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Record
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${sortKey === 'record' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'record' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={() => handleSort('pointsFor')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Points For
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${sortKey === 'pointsFor' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'pointsFor' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={() => handleSort('avgPPG')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Avg PPG
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${sortKey === 'avgPPG' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'avgPPG' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={() => handleSort('pointsAgainst')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Points Against
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${sortKey === 'pointsAgainst' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'pointsAgainst' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        onClick={() => handleSort('placement')}
                      >
                        <div className="flex items-center justify-center text-xs">
                          Placement
                          <div className="flex flex-col ml-1">
                            <ChevronUp className={`h-3 w-3 ${sortKey === 'placement' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`} />
                            <ChevronDown className={`h-3 w-3 -mt-1 ${sortKey === 'placement' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeasonHistory.map((season) => (
                      <tr key={`${season.userId}-${season.year}-${season.league}`} className="table-row h-16">
                        <td className="align-middle">
                          <div className="flex items-center space-x-2 h-full">
                            <TeamLogo
                              teamName={season.userInfo.teamName}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight break-words">
                                {season.userInfo.teamName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase">
                                {season.userInfo.abbreviation}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium">{season.year}</span>
                        </td>
                        <td className="text-center align-middle">
                          <LeagueBadge league={season.league} />
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium font-mono">{season.wins}-{season.losses}</span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium font-mono">{season.pointsFor.toFixed(2)}</span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 font-mono">
                            {season.avgPointsPerGame.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium font-mono">{season.pointsAgainst.toFixed(2)}</span>
                        </td>
                        <td className="text-center align-middle">
                          {season.playoffFinish ? (
                            <div className="flex items-center justify-center space-x-1">
                              {season.playoffFinish === 1 && <Trophy className="h-3 w-3 text-yellow-600" />}
                              {season.playoffFinish === 2 && <Award className="h-3 w-3 text-gray-500" />}
                              {season.playoffFinish === 3 && <Award className="h-3 w-3 text-amber-600" />}
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {season.playoffFinish === 1 ? '1st' :
                                   season.playoffFinish === 2 ? '2nd' :
                                   season.playoffFinish === 3 ? '3rd' :
                                   `${season.playoffFinish}th`}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1">
                              {season.rank === 1 && <Trophy className="h-3 w-3 text-yellow-600" />}
                              {season.rank === 2 && <Award className="h-3 w-3 text-gray-500" />}
                              {season.rank === 3 && <Award className="h-3 w-3 text-amber-600" />}
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {season.rank === 1 ? '1st' :
                                   season.rank === 2 ? '2nd' :
                                   season.rank === 3 ? '3rd' :
                                   `${season.rank}th`}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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