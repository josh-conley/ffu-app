import type { EnhancedSeasonStandings, LeagueTier } from '../../types';
import { LeagueBadge } from './LeagueBadge';
import { TeamLogo } from '../Common/TeamLogo';
import { Trophy, Medal, Award } from 'lucide-react';
import { getLeagueName } from '../../constants/leagues';


interface StandingsTableProps {
  standings: EnhancedSeasonStandings[];
  league: string;
  year: string;
}

export const StandingsTable = ({ standings, league, year }: StandingsTableProps) => {
  const getRowClasses = (rank: number, totalTeams: number) => {
    let classes = 'table-row';
    
    if (rank === 1) {
      classes += ' bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700';
    } else if (rank <= 3) {
      classes += ' bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
    } else if (rank === totalTeams) {
      classes += ' bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
    }
    
    return classes;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    return null;
  };

  return (
    <div className="card">
      {/* Champion Highlight */}
      {standings[0] && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6 transition-colors">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {getLeagueName(league as LeagueTier)} League Champion - {year}
            </span>
          </div>
          <div className="mt-2 flex items-center space-x-3">
            <TeamLogo 
              teamName={standings[0].userInfo.teamName}
              abbreviation={standings[0].userInfo.abbreviation}
              size="md"
            />
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                {standings[0].userInfo.teamName}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {standings[0].wins}-{standings[0].losses} • {standings[0].pointsFor?.toFixed(1)} pts
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Full Standings
        </h3>
        <LeagueBadge league={league as LeagueTier} />
      </div>
      
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Record</th>
              <th>Points For</th>
              <th>Points Against</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing) => (
              <tr key={standing.userId} className={getRowClasses(standing.rank, standings.length)}>
                <td>
                  <div className="flex items-center space-x-2">
                    {getRankIcon(standing.rank)}
                    <span className="font-semibold text-lg">#{standing.rank}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center space-x-3">
                    <TeamLogo 
                      teamName={standing.userInfo.teamName}
                      abbreviation={standing.userInfo.abbreviation}
                      size="sm"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{standing.userInfo.teamName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{standing.userInfo.abbreviation}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="font-medium">
                    {standing.wins}-{standing.losses}
                  </span>
                </td>
                <td>
                  <span className="font-medium">
                    {standing.pointsFor?.toFixed(2) || '0.00'}
                  </span>
                </td>
                <td>
                  <span className="font-medium">
                    {standing.pointsAgainst?.toFixed(2) || '0.00'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};