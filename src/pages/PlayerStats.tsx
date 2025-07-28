import { useState, useMemo } from 'react';
import { useAllStandings } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import type { LeagueTier, UserInfo } from '../types';
import { Trophy, Medal, Award, TrendingDown, Calendar, Target, BarChart3 } from 'lucide-react';

interface PlayerCareerStats {
  userId: string;
  userInfo: UserInfo;
  totalWins: number;
  totalLosses: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  firstPlaceFinishes: number;
  secondPlaceFinishes: number;
  thirdPlaceFinishes: number;
  lastPlaceFinishes: number;
  playoffAppearances: number;
  seasonHistory: {
    year: string;
    league: LeagueTier;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    rank: number;
    playoffFinish?: number;
  }[];
}


export const PlayerStats = () => {
  const { data: standings, isLoading, error } = useAllStandings();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const playerStats = useMemo(() => {
    if (!standings.length) return [];

    const playerMap: Record<string, PlayerCareerStats> = {};

    // Process all standings data
    standings.forEach(leagueData => {
      leagueData.standings.forEach(standing => {
        if (!playerMap[standing.userId]) {
          playerMap[standing.userId] = {
            userId: standing.userId,
            userInfo: standing.userInfo,
            totalWins: 0,
            totalLosses: 0,
            totalPointsFor: 0,
            totalPointsAgainst: 0,
            firstPlaceFinishes: 0,
            secondPlaceFinishes: 0,
            thirdPlaceFinishes: 0,
            lastPlaceFinishes: 0,
            playoffAppearances: 0,
            seasonHistory: []
          };
        }

        const player = playerMap[standing.userId];
        
        // Accumulate totals
        player.totalWins += standing.wins;
        player.totalLosses += standing.losses;
        player.totalPointsFor += standing.pointsFor || 0;
        player.totalPointsAgainst += standing.pointsAgainst || 0;

        // Count finishes
        if (standing.rank === 1) player.firstPlaceFinishes++;
        else if (standing.rank === 2) player.secondPlaceFinishes++;
        else if (standing.rank === 3) player.thirdPlaceFinishes++;
        else if (standing.rank === leagueData.standings.length) player.lastPlaceFinishes++;

        // Check for playoff finish
        const playoffFinish = leagueData.playoffResults?.find(p => p.userId === standing.userId);
        if (playoffFinish) {
          player.playoffAppearances++;
        }

        // Add to season history
        player.seasonHistory.push({
          year: leagueData.year,
          league: leagueData.league as LeagueTier,
          wins: standing.wins,
          losses: standing.losses,
          pointsFor: standing.pointsFor || 0,
          pointsAgainst: standing.pointsAgainst || 0,
          rank: standing.rank,
          playoffFinish: playoffFinish?.placement
        });
      });
    });

    // Sort season history by year (newest first)
    Object.values(playerMap).forEach(player => {
      player.seasonHistory.sort((a, b) => b.year.localeCompare(a.year));
    });

    return Object.values(playerMap).sort((a, b) => 
      a.userInfo.teamName.localeCompare(b.userInfo.teamName)
    );
  }, [standings]);

  const selectedPlayer = playerStats.find(p => p.userId === selectedPlayerId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">League Members</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">View career statistics for any FFU league member</p>
        </div>

        {/* Player Selection Loading */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select a Member</h3>
          <select
            disabled
            className="block w-full pl-3 pr-10 py-2 text-base bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 sm:text-sm rounded-md"
          >
            <option>Loading members...</option>
          </select>
        </div>

        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <div className="mt-4 text-gray-500 dark:text-gray-400">
            Loading player statistics...
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">League Members</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">View career statistics for any FFU league member</p>
      </div>

      {/* Player Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select a Member</h3>
        <select
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md transition-colors"
        >
          <option value="">Choose a member...</option>
          {playerStats.map(player => (
            <option key={player.userId} value={player.userId}>
              {player.userInfo.teamName}
            </option>
          ))}
        </select>
      </div>

      {/* Player Stats Display */}
      {selectedPlayer && (
        <div className="space-y-6">
          {/* Player Header */}
          <div className="card">
            <div className="flex items-center space-x-4">
              <TeamLogo 
                teamName={selectedPlayer.userInfo.teamName}
                abbreviation={selectedPlayer.userInfo.abbreviation}
                size="lg"
                className="w-16 h-16 text-xl"
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.userInfo.teamName}</h2>
                <p className="text-gray-600 dark:text-gray-400">{selectedPlayer.userInfo.abbreviation}</p>
              </div>
            </div>
          </div>

          {/* Career Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center">
              <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.totalWins}-{selectedPlayer.totalLosses}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Win-Loss Record</div>
            </div>
            <div className="card text-center">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="flex justify-center items-end space-x-6 mb-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {((selectedPlayer.totalWins + selectedPlayer.totalLosses) > 0 ? 
                      (selectedPlayer.totalPointsFor / (selectedPlayer.totalWins + selectedPlayer.totalLosses)).toFixed(2) : 
                      '0.0')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Points Per Game</div>
                </div>
              </div>
            </div>
            <div className="card text-center">
              <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.seasonHistory.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Seasons Played</div>
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Career Achievements</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.firstPlaceFinishes}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">1st Place</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Medal className="h-8 w-8 text-gray-500" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.secondPlaceFinishes}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">2nd Place</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Award className="h-8 w-8 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.thirdPlaceFinishes}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">3rd Place</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <TrendingDown className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.lastPlaceFinishes}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Place</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPlayer.playoffAppearances}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Playoff Appearances</div>
              </div>
            </div>
          </div>

          {/* Season History */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Season History</h3>
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th>Year</th>
                    <th>League</th>
                    <th>Record</th>
                    <th>Points For</th>
                    <th>Points Against</th>
                    <th>Final Placement</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPlayer.seasonHistory.map((season) => (
                    <tr key={`${season.year}-${season.league}`} className="table-row">
                      <td>
                        <span className="font-medium">{season.year}</span>
                      </td>
                      <td>
                        <LeagueBadge league={season.league} />
                      </td>
                      <td>
                        <span className="font-mono">{season.wins}-{season.losses}</span>
                      </td>
                      <td>
                        <span className="font-mono">{season.pointsFor.toFixed(2)}</span>
                      </td>
                      <td>
                        <span className="font-mono">{season.pointsAgainst.toFixed(2)}</span>
                      </td>
                      <td>
                        {season.playoffFinish ? (
                          <div className="flex items-center space-x-1">
                            {season.playoffFinish === 1 && <Trophy className="h-4 w-4 text-yellow-600" />}
                            {season.playoffFinish === 2 && <Medal className="h-4 w-4 text-gray-500" />}
                            {season.playoffFinish === 3 && <Award className="h-4 w-4 text-amber-600" />}
                            <span className="font-medium">
                              {season.playoffFinish === 1 ? '1st' :
                               season.playoffFinish === 2 ? '2nd' :
                               season.playoffFinish === 3 ? '3rd' :
                               `${season.playoffFinish}th`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            {season.rank === 1 && <Trophy className="h-4 w-4 text-yellow-600" />}
                            {season.rank === 2 && <Medal className="h-4 w-4 text-gray-500" />}
                            {season.rank === 3 && <Award className="h-4 w-4 text-amber-600" />}
                            <span className="font-medium">#{season.rank}</span>
                            <span className="text-xs text-gray-500 ml-1">(Regular Season)</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!selectedPlayer && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            Select a member above to view their career statistics
          </div>
        </div>
      )}
    </div>
  );
};