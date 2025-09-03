import { TeamLogo } from '../Common/TeamLogo';
import { LeagueBadge } from '../League/LeagueBadge';
import { ComparisonLeagueProgressionChart } from './ComparisonLeagueProgressionChart';
import { Trophy, Medal, Award, TrendingDown, Calendar, Users } from 'lucide-react';
import type { UserInfo, HeadToHeadStats, LeagueTier } from '../../types';

interface PlayerStats {
  userInfo: UserInfo;
  pastTeamNames: string[];
  totalWins: number;
  totalLosses: number;
  playoffWins: number;
  playoffLosses: number;
  winPercentage: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  pointDifferential: number;
  averageSeasonRank: number;
  averageUPR: number;
  championships?: number;
  playoffAppearances?: number;
  firstPlaceFinishes?: number;
  secondPlaceFinishes?: number;
  thirdPlaceFinishes?: number;
  lastPlaceFinishes?: number;
  seasonHistory: {
    year: string;
    league: LeagueTier;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    rank: number;
    playoffFinish?: number;
    unionPowerRating?: number;
  }[];
}

interface CompareMembersProps {
  selectedPlayer: PlayerStats | null;
  selectedPlayer2: PlayerStats | null;
  headToHeadData: HeadToHeadStats | null;
}

export function CompareMembers({ selectedPlayer, selectedPlayer2, headToHeadData }: CompareMembersProps) {

  if (!selectedPlayer || !selectedPlayer2) {
    return (
      <div className="card text-center py-12">
        <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Select Two Members to Compare
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Choose two members above to compare their career statistics
        </p>
      </div>
    );
  }

  const calculatePPG = (player: PlayerStats) => {
    const totalGames = player.totalWins + player.totalLosses;
    return totalGames > 0 ? (player.totalPointsFor / totalGames) : 0;
  };

  const getWinnerStyle = (value1: number, value2: number, higherIsBetter: boolean = true) => {
    const isWinner = higherIsBetter ? value1 > value2 : value1 < value2;
    return isWinner ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Player Headers */}
      <div className="card">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {selectedPlayer.userInfo.abbreviation} vs {selectedPlayer2.userInfo.abbreviation}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Career Statistics Comparison</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Player 1 Header */}
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-700">
            <TeamLogo
              teamName={selectedPlayer.userInfo.teamName}
              abbreviation={selectedPlayer.userInfo.abbreviation}
              size="lg"
              className="w-16 h-16 mb-3"
            />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {selectedPlayer.userInfo.teamName}
              </h3>
              <div className="flex items-center justify-center space-x-2 mt-1">
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedPlayer.userInfo.abbreviation}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {selectedPlayer.seasonHistory?.length || 0} seasons
                </span>
              </div>
              {selectedPlayer.pastTeamNames.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Previously: {selectedPlayer.pastTeamNames.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Player 2 Header */}
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-700">
            <TeamLogo
              teamName={selectedPlayer2.userInfo.teamName}
              abbreviation={selectedPlayer2.userInfo.abbreviation}
              size="lg"
              className="w-16 h-16 mb-3"
            />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {selectedPlayer2.userInfo.teamName}
              </h3>
              <div className="flex items-center justify-center space-x-2 mt-1">
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedPlayer2.userInfo.abbreviation}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {selectedPlayer2.seasonHistory?.length || 0} seasons
                </span>
              </div>
              {selectedPlayer2.pastTeamNames.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Previously: {selectedPlayer2.pastTeamNames.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Head-to-Head Record */}
        {headToHeadData && (
          <div className="text-center mb-6 bg-gray-50 dark:bg-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Head-to-Head Record
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {headToHeadData.totalGames} game{headToHeadData.totalGames !== 1 ? 's' : ''} played
            </p>

            <div className="grid grid-cols-3 gap-8 items-center">
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${
                  headToHeadData.player1Wins > headToHeadData.player2Wins 
                    ? 'text-green-600' 
                    : headToHeadData.player1Wins === headToHeadData.player2Wins 
                    ? 'text-gray-600' 
                    : 'text-gray-400'
                }`}>
                  {headToHeadData.player1Wins}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {selectedPlayer.userInfo.abbreviation}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {headToHeadData.player1AvgScore.toFixed(1)} avg
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400 mb-2">vs</div>
              </div>

              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${
                  headToHeadData.player2Wins > headToHeadData.player1Wins 
                    ? 'text-green-600' 
                    : headToHeadData.player2Wins === headToHeadData.player1Wins 
                    ? 'text-gray-600' 
                    : 'text-gray-400'
                }`}>
                  {headToHeadData.player2Wins}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {selectedPlayer2.userInfo.abbreviation}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {headToHeadData.player2AvgScore.toFixed(1)} avg
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Comparison */}
        <div className="space-y-3">
          {/* Record */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3">
              <div className={`text-2xl font-bold ${getWinnerStyle(selectedPlayer.totalWins, selectedPlayer2.totalWins)}`}>
                {selectedPlayer.totalWins}-{selectedPlayer.totalLosses}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">Record</div>
            </div>
            <div className="p-3">
              <div className={`text-2xl font-bold ${getWinnerStyle(selectedPlayer2.totalWins, selectedPlayer.totalWins)}`}>
                {selectedPlayer2.totalWins}-{selectedPlayer2.totalLosses}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">Record</div>
            </div>
          </div>

          {/* Win Rate */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3">
              <div className={`text-2xl font-bold ${getWinnerStyle(selectedPlayer.winPercentage, selectedPlayer2.winPercentage)}`}>
                {selectedPlayer.winPercentage.toFixed(1)}%
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">Win Rate</div>
            </div>
            <div className="p-3">
              <div className={`text-2xl font-bold ${getWinnerStyle(selectedPlayer2.winPercentage, selectedPlayer.winPercentage)}`}>
                {selectedPlayer2.winPercentage.toFixed(1)}%
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">Win Rate</div>
            </div>
          </div>

          {/* Points Per Game */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3">
              <div className={`text-2xl font-bold ${getWinnerStyle(calculatePPG(selectedPlayer), calculatePPG(selectedPlayer2))}`}>
                {calculatePPG(selectedPlayer).toFixed(1)}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">Points Per Game</div>
            </div>
            <div className="p-3">
              <div className={`text-2xl font-bold ${getWinnerStyle(calculatePPG(selectedPlayer2), calculatePPG(selectedPlayer))}`}>
                {calculatePPG(selectedPlayer2).toFixed(1)}
              </div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">Points Per Game</div>
            </div>
          </div>

          {/* Average Rank */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2">
              <div className={`text-lg font-semibold ${getWinnerStyle(selectedPlayer.averageSeasonRank, selectedPlayer2.averageSeasonRank, false)}`}>
                #{selectedPlayer.averageSeasonRank.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Average Rank</div>
            </div>
            <div className="p-2">
              <div className={`text-lg font-semibold ${getWinnerStyle(selectedPlayer2.averageSeasonRank, selectedPlayer.averageSeasonRank, false)}`}>
                #{selectedPlayer2.averageSeasonRank.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Average Rank</div>
            </div>
          </div>

          {/* Average UPR */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2">
              <div className={`text-lg font-semibold ${getWinnerStyle(selectedPlayer.averageUPR || 0, selectedPlayer2.averageUPR || 0)}`}>
                {selectedPlayer.averageUPR ? selectedPlayer.averageUPR.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Average UPR</div>
            </div>
            <div className="p-2">
              <div className={`text-lg font-semibold ${getWinnerStyle(selectedPlayer2.averageUPR || 0, selectedPlayer.averageUPR || 0)}`}>
                {selectedPlayer2.averageUPR ? selectedPlayer2.averageUPR.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Average UPR</div>
            </div>
          </div>

          {/* Playoff Record */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2">
              <div className={`text-lg font-semibold ${getWinnerStyle(selectedPlayer.playoffWins, selectedPlayer2.playoffWins)}`}>
                {selectedPlayer.playoffWins}-{selectedPlayer.playoffLosses}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Playoff Record</div>
            </div>
            <div className="p-2">
              <div className={`text-lg font-semibold ${getWinnerStyle(selectedPlayer2.playoffWins, selectedPlayer.playoffWins)}`}>
                {selectedPlayer2.playoffWins}-{selectedPlayer2.playoffLosses}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Playoff Record</div>
            </div>
          </div>

          {/* Point Differential */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2">
              <div className={`text-lg font-semibold ${getWinnerStyle(selectedPlayer.pointDifferential, selectedPlayer2.pointDifferential)} ${selectedPlayer.pointDifferential >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedPlayer.pointDifferential > 0 ? '+' : ''}{selectedPlayer.pointDifferential.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Point Differential</div>
            </div>
            <div className="p-2">
              <div className={`text-lg font-semibold ${getWinnerStyle(selectedPlayer2.pointDifferential, selectedPlayer.pointDifferential)} ${selectedPlayer2.pointDifferential >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedPlayer2.pointDifferential > 0 ? '+' : ''}{selectedPlayer2.pointDifferential.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Point Differential</div>
            </div>
          </div>
        </div>

        {/* Podium Showcase */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 text-center">Career Finishes</h3>
          <div className="grid grid-cols-2 gap-8">
            {/* Player 1 Podium */}
            <div className="space-y-3">
              <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {selectedPlayer.userInfo.abbreviation}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer.firstPlaceFinishes || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">1st</div>
                </div>
                <div className="text-center">
                  <Medal className="h-8 w-8 text-gray-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer.secondPlaceFinishes || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">2nd</div>
                </div>
                <div className="text-center">
                  <Award className="h-8 w-8 text-amber-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer.thirdPlaceFinishes || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">3rd</div>
                </div>
                <div className="text-center">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer.lastPlaceFinishes || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Last</div>
                </div>
              </div>
            </div>

            {/* Player 2 Podium */}
            <div className="space-y-3">
              <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {selectedPlayer2.userInfo.abbreviation}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer2.firstPlaceFinishes || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">1st</div>
                </div>
                <div className="text-center">
                  <Medal className="h-8 w-8 text-gray-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer2.secondPlaceFinishes || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">2nd</div>
                </div>
                <div className="text-center">
                  <Award className="h-8 w-8 text-amber-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer2.thirdPlaceFinishes || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">3rd</div>
                </div>
                <div className="text-center">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedPlayer2.lastPlaceFinishes || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Last</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* League Tier Progression Comparison */}
      <ComparisonLeagueProgressionChart
        player1={selectedPlayer}
        player2={selectedPlayer2}
      />


      {/* Matchup History */}
      {headToHeadData && headToHeadData.matchups.length > 0 && (
        <div className="card">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Matchup History</h3>
            <p className="text-gray-600 dark:text-gray-400">All games between these players</p>
          </div>

          <div className="space-y-4">
            {headToHeadData.matchups.map((matchup, index: number) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <LeagueBadge league={matchup.league} />
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{matchup.year} • Week {matchup.week}</span>
                      </div>
                      {matchup.placementType && (
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold">
                          {matchup.placementType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between lg:justify-end space-x-3">
                      <div className="flex items-center space-x-2">
                        <TeamLogo
                          teamName={matchup.winnerInfo?.teamName || 'Unknown Team'}
                          abbreviation={matchup.winnerInfo?.abbreviation || 'UNK'}
                          size="sm"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {matchup.winnerInfo?.abbreviation || 'UNK'}
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="font-bold text-lg">
                          <span className="text-emerald-600">{matchup.winnerScore.toFixed(1)}</span>
                          <span className="text-gray-400 mx-2">-</span>
                          <span className="text-red-600">{matchup.loserScore.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {matchup.loserInfo?.abbreviation || 'UNK'}
                        </span>
                        <TeamLogo
                          teamName={matchup.loserInfo?.teamName || 'Unknown Team'}
                          abbreviation={matchup.loserInfo?.abbreviation || 'UNK'}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}