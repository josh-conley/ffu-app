import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAllTimeRecords } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import type { LeagueTier } from '../types';
import { Trophy, Target, TrendingDown, Award, Calendar, Zap } from 'lucide-react';

export const Records = () => {
  const [selectedLeague, setSelectedLeague] = useState<LeagueTier | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [, setImageError] = useState(false);
  const basePath = import.meta.env.MODE === 'production' ? '/ffu-app' : '';
  const dakUrl = `${basePath}/dak-head.png`;

  const { data: records, isLoading, error } = useAllTimeRecords(
    selectedLeague === 'ALL' ? undefined : selectedLeague,
    selectedYear === 'ALL' ? undefined : selectedYear
  );

  const leagues: (LeagueTier | 'ALL')[] = ['ALL', 'PREMIER', 'MASTERS', 'NATIONAL'];
  const years = ['ALL', '2024', '2023', '2022', '2021'];
  // const validYearsByLeague: Record<string, string[]> = {
  //   ALL: years,
  //   PREMIER: years,
  //   NATIONAL: years,
  //   MASTERS: ['ALL', '2024', '2023', '2022'], // no 2021
  // };

  // const filteredYears = useMemo(() => {
  //   return validYearsByLeague[selectedLeague] || years;
  // }, [selectedLeague]);

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
            {years.map(year => (
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
              <Zap className="h-5 w-5 mr-2" />
              Single Game Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Highest Single Game */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-green-800 dark:text-green-300">Highest Score</h3>
                  <Trophy className="h-5 w-5 text-green-600" />
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
                  <TrendingDown className="h-5 w-5 text-red-600" />
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
              <Calendar className="h-5 w-5 mr-2" />
              Season Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Points Season */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-800 dark:text-blue-300">Most Points</h3>
                  <Trophy className="h-5 w-5 text-blue-600" />
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
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">Fewest Points</h3>
                  <TrendingDown className="h-5 w-5 text-gray-600" />
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
                    <div className="text-2xl font-bold text-gray-600">{records.leastPointsSeason.points.toFixed(1)}</div>
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
              <Target className="h-5 w-5 mr-2" />
              Special Game Records
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Most Points in Loss */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-orange-800 dark:text-orange-300">Most Points in a Loss</h3>
                  <Award className="h-5 w-5 text-orange-600" />
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
                  <Trophy className="h-5 w-5 text-purple-600" />
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
                  <Zap className="h-5 w-5 text-yellow-600" />
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