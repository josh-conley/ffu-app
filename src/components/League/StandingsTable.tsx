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
  const getRowClasses = (rank: number) => {
    let classes = 'table-row';
    
    if (rank === 1) {
      classes += ' champion-highlight font-bold border-l-4 border-ffu-red';
    } else if (rank <= 3) {
      classes += ' bg-ffu-red-50 dark:bg-ffu-red-900/20 border-ffu-red-200 dark:border-ffu-red-700 border-l-2 border-ffu-red/50';
    }
    
    return classes;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-ffu-red" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-600 dark:text-gray-300" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    return null;
  };

  return (
    <div className="card">
      {/* Champion Highlight */}
      {standings[0] && (
        <div className="champion-highlight angular-cut p-6 mb-6 relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-ffu-red rounded-full">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-black text-ffu-red tracking-wide uppercase">
              {getLeagueName(league as LeagueTier)} League Champion - {year}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <TeamLogo 
                teamName={standings[0].userInfo.teamName}
                abbreviation={standings[0].userInfo.abbreviation}
                size="lg"
              />
            </div>
            <div>
              <div className="font-black text-gray-900 dark:text-gray-100 text-xl tracking-wide">
                {standings[0].userInfo.teamName}
              </div>
              <div className="text-lg font-bold text-ffu-red">
                {standings[0].wins}-{standings[0].losses} • {standings[0].pointsFor?.toFixed(1)} pts
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 diagonal-border relative pb-3">
        <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-wide uppercase">
          Full Standings
        </h3>
        <LeagueBadge league={league as LeagueTier} />
      </div>
      
      <div className="table-container">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="text-center">Rank</th>
              <th>Team</th>
              <th className="text-center">Record</th>
              <th className="text-center">Points For</th>
              <th className="text-center">Points Against</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing) => (
              <tr key={standing.userId} className={getRowClasses(standing.rank)}>
                <td className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {getRankIcon(standing.rank)}
                    <span className={`font-black text-lg ${standing.rank === 1 ? 'text-ffu-red' : 'text-gray-900 dark:text-gray-100'}`}>
                      #{standing.rank}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center space-x-3">
                    <div className="hidden sm:block">
                      <TeamLogo 
                        teamName={standing.userInfo.teamName}
                        abbreviation={standing.userInfo.abbreviation}
                        size="sm"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{standing.userInfo.teamName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden font-mono">{standing.userInfo.abbreviation}</div>
                    </div>
                  </div>
                </td>
                <td className="text-center">
                  <span className="font-black text-gray-900 dark:text-gray-100 font-mono">
                    {standing.wins}-{standing.losses}
                  </span>
                </td>
                <td className="text-center">
                  <span className="font-bold text-gray-900 dark:text-gray-100 font-mono">
                    {standing.pointsFor?.toFixed(2) || '0.00'}
                  </span>
                </td>
                <td className="text-center">
                  <span className="font-bold text-gray-900 dark:text-gray-100 font-mono">
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