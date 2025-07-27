import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAllTimeRecords, useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import type { LeagueTier } from '../types';
import { Target, TrendingDown, TrendingUp, Award, Calendar, BarChart3, ChevronUp, ChevronDown, Crown, Sparkles, Gauge, Zap, Trophy, Skull, Laugh, Swords, Angry} from 'lucide-react';

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
  const years = ['ALL', '2024', '2023', '2022', '2021'];
  const validYearsByLeague: Record<string, string[]> = {
    ALL: years,
    PREMIER: years,
    NATIONAL: years,
    MASTERS: ['ALL', '2024', '2023', '2022'], // no 2021
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
          <p className="mt-2 text-gray-600 dark:text-gray-300">Legendary performances across FFU history</p>
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
        <p className="mt-2 text-gray-600 dark:text-gray-300">Legendary performances across FFU history</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">League</label>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value as LeagueTier | 'ALL')}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            {leagues.map(league => (
              <option key={league} value={league}>{getLeagueName(league)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            {filteredYears.map(year => (
              <option key={year} value={year}>{year === 'ALL' ? 'All Years' : year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Records Display */}
      {records && (
        <div className="space-y-6">
          {/* Single Game Records */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Gauge className="h-5 w-5 mr-2" />
              Single Game Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Highest Single Game */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-green-800 dark:text-green-300">Highest Score</h3>
                  <Crown className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.highestSingleGame.userInfo.teamName}
                    abbreviation={records.highestSingleGame.userInfo.abbreviation}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {records.highestSingleGame.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Week {records.highestSingleGame.week}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{records.highestSingleGame.score.toFixed(2)}</div>
                    <div className="flex items-center justify-end space-x-2">
                      <LeagueBadge league={records.highestSingleGame.league} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{records.highestSingleGame.year}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lowest Single Game */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-red-800 dark:text-red-300">Lowest Score</h3>
                  <Skull className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.lowestSingleGame.userInfo.teamName}
                    abbreviation={records.lowestSingleGame.userInfo.abbreviation}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {records.lowestSingleGame.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Week {records.lowestSingleGame.week}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">{records.lowestSingleGame.score.toFixed(2)}</div>
                    <div className="flex items-center justify-end space-x-2">
                      <LeagueBadge league={records.lowestSingleGame.league} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{records.lowestSingleGame.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Season Records */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Season Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Points Season */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-800 dark:text-blue-300">Most Points</h3>
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.mostPointsSeason.userInfo.teamName}
                    abbreviation={records.mostPointsSeason.userInfo.abbreviation}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {records.mostPointsSeason.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {records.mostPointsSeason.year} Season
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{records.mostPointsSeason.points.toFixed(1)}</div>
                    <div className="flex items-center justify-end space-x-2">
                      <LeagueBadge league={records.mostPointsSeason.league} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{records.mostPointsSeason.year}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Least Points Season */}
              <div className="bg-amber-50 dark:bg-amber-800/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-amber-700 dark:text-amber-300">Fewest Points</h3>
                  <TrendingDown className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex items-center space-x-3">
                  <TeamLogo
                    teamName={records.leastPointsSeason.userInfo.teamName}
                    abbreviation={records.leastPointsSeason.userInfo.abbreviation}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {records.leastPointsSeason.userInfo.teamName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {records.leastPointsSeason.year} Season
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-500">{records.leastPointsSeason.points.toFixed(1)}</div>
                    <div className="flex items-center justify-end space-x-2">
                      <LeagueBadge league={records.leastPointsSeason.league} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{records.leastPointsSeason.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Special Game Records */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              Special Game Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Most Points in Loss */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-orange-800 dark:text-orange-300">Most Points in a Loss</h3>
                  <Angry className="h-5 w-5 text-orange-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <TeamLogo
                      teamName={records.mostPointsInLoss.userInfo.teamName}
                      abbreviation={records.mostPointsInLoss.userInfo.abbreviation}
                      size="md"
                    />
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {records.mostPointsInLoss.userInfo.teamName}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-orange-600">{records.mostPointsInLoss.score.toFixed(2)}</div>
                  <div className="flex items-center space-x-2">
                    <LeagueBadge league={records.mostPointsInLoss.league} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Week {records.mostPointsInLoss.week}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{records.mostPointsInLoss.year}</span>
                  </div>
                  {records.mostPointsInLoss.opponent && (
                    <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
                      <div className="text-xs text-orange-700 dark:text-orange-300 mb-1">Lost to:</div>
                      <div className="flex items-center space-x-2">
                        <TeamLogo
                          teamName={records.mostPointsInLoss.opponent.teamName}
                          abbreviation={records.mostPointsInLoss.opponent.abbreviation}
                          size="md"
                        />
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {records.mostPointsInLoss.opponent.teamName}
                        </div>
                        <div className="text-xs font-medium text-orange-600">
                          {records.mostPointsInLoss.opponentScore?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fewest Points in Win */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-purple-800 dark:text-purple-300">Fewest Points in a Win</h3>
                  <Laugh className="h-5 w-5 text-purple-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <TeamLogo
                      teamName={records.fewestPointsInWin.userInfo.teamName}
                      abbreviation={records.fewestPointsInWin.userInfo.abbreviation}
                      size="md"
                    />
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {records.fewestPointsInWin.userInfo.teamName}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-purple-600">{records.fewestPointsInWin.score.toFixed(2)}</div>
                  <div className="flex items-center space-x-2">
                    <LeagueBadge league={records.fewestPointsInWin.league} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Week {records.fewestPointsInWin.week}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{records.fewestPointsInWin.year}</span>
                  </div>
                  {records.fewestPointsInWin.opponent && (
                    <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                      <div className="text-xs text-purple-700 dark:text-purple-300 mb-1">Beat:</div>
                      <div className="flex items-center space-x-2">
                        <TeamLogo
                          teamName={records.fewestPointsInWin.opponent.teamName}
                          abbreviation={records.fewestPointsInWin.opponent.abbreviation}
                          size="md"
                        />
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {records.fewestPointsInWin.opponent.teamName}
                        </div>
                        <div className="text-xs font-medium text-purple-600">
                          {records.fewestPointsInWin.opponentScore?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Closest Game */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Closest Game</h3>
                  <Swords className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {records.closestGame.margin.toFixed(2)} pts
                    </div>
                  </div>

                  {/* Team Logos vs each other */}
                  <div className="flex items-start justify-center space-x-4 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <TeamLogo
                        teamName={records.closestGame.winner.teamName}
                        abbreviation={records.closestGame.winner.abbreviation}
                        size="md"
                      />
                      <div className="text-xs font-medium text-center">
                        {records.closestGame.winner.teamName}
                      </div>
                      <div className="text-sm font-bold text-green-600">
                        {records.closestGame.winnerScore.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-yellow-600 font-bold text-sm self-center">VS</div>

                    <div className="flex flex-col items-center space-y-1">
                      <TeamLogo
                        teamName={records.closestGame.loser.teamName}
                        abbreviation={records.closestGame.loser.abbreviation}
                        size="md"
                      />
                      <div className="text-xs font-medium text-center">
                        {records.closestGame.loser.teamName}
                      </div>
                      <div className="text-sm font-bold text-red-600">
                        {records.closestGame.loserScore.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center items-center space-x-2">
                    <LeagueBadge league={records.closestGame.league} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Week {records.closestGame.week}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{records.closestGame.year}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Season History Table */}
          {filteredSeasonHistory.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Season History
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({filteredSeasonHistory.length} total)
                </span>
              </h2>
              <div className="overflow-x-auto">
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
                              abbreviation={season.userInfo.abbreviation}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight break-words">
                                {season.userInfo.teamName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
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
                          <span className="text-sm font-medium">{season.wins}-{season.losses}</span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium">{season.pointsFor.toFixed(1)}</span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {season.avgPointsPerGame.toFixed(1)}
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          <span className="text-sm font-medium">{season.pointsAgainst.toFixed(1)}</span>
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
                                <div className="text-sm font-medium">#{season.rank}</div>
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