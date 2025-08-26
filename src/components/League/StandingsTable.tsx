import type { EnhancedSeasonStandings, LeagueTier } from '../../types';
import { TeamLogo } from '../Common/TeamLogo';
import { Trophy, Medal, Award } from 'lucide-react';
import { getLeagueName } from '../../constants/leagues';
import { getDisplayTeamName, getCurrentTeamName, getCurrentAbbreviation, isActiveYear } from '../../config/constants';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';


interface StandingsTableProps {
  standings: EnhancedSeasonStandings[];
  league: string;
  year: string;
}

export const StandingsTable = ({ standings, league, year }: StandingsTableProps) => {
  const isActiveSeason = isActiveYear(year);
  const { openTeamProfile } = useTeamProfileModal();

  const getLeagueColors = (leagueType: string) => {
    const colorMap = {
      PREMIER: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-300 dark:border-yellow-700',
        borderHeavy: 'border-yellow-500',
        text: 'text-yellow-800 dark:text-yellow-300',
        iconBg: 'bg-yellow-500 dark:bg-yellow-600',
        highlight: 'bg-yellow-100 dark:bg-yellow-900/30'
      },
      MASTERS: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        borderHeavy: 'border-purple-500',
        text: 'text-purple-800 dark:text-purple-300',
        iconBg: 'bg-purple-500 dark:bg-purple-600',
        highlight: 'bg-purple-100 dark:bg-purple-900/30'
      },
      NATIONAL: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-300 dark:border-red-700',
        borderHeavy: 'border-red-500',
        text: 'text-red-800 dark:text-red-300',
        iconBg: 'bg-red-500 dark:bg-red-600',
        highlight: 'bg-red-100 dark:bg-red-900/30'
      }
    };
    return colorMap[leagueType as keyof typeof colorMap] || colorMap.NATIONAL;
  };

  const leagueColors = getLeagueColors(league);

  const getRowClasses = (rank: number) => {
    let classes = 'table-row';
    
    if (!isActiveSeason) {
      if (rank === 1) {
        classes += ` champion-highlight font-bold border-l-4 ${leagueColors.borderHeavy} ${leagueColors.highlight}`;
      } else if (rank <= 3) {
        classes += ` ${leagueColors.bg} ${leagueColors.border} border-l-2 ${leagueColors.borderHeavy}/50`;
      }
    }
    
    return classes;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className={`h-5 w-5 ${leagueColors.text}`} />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-600 dark:text-gray-300" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    return null;
  };

  return (
    <div className="card">
      {/* Champion Highlight */}
      {!isActiveSeason && standings[0] && (
        <div className={`champion-highlight angular-cut p-6 mb-6 relative overflow-hidden border-l4 ${leagueColors.highlight}`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className={`p-2 ${leagueColors.iconBg} rounded-full`}>
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <span className={`text-lg font-black ${leagueColors.text} tracking-wide uppercase`}>
              {getLeagueName(league as LeagueTier)} League Champion - {year}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <TeamLogo 
                teamName={getCurrentTeamName(standings[0].userId, standings[0].userInfo.teamName)}
                abbreviation={getCurrentAbbreviation(standings[0].userId, standings[0].userInfo.abbreviation)}
                size="lg"
                clickable
                onClick={() => openTeamProfile(standings[0].userId, standings[0].userInfo.teamName)}
              />
            </div>
            <div>
              <div className="font-black text-gray-900 dark:text-gray-100 text-xl tracking-wide">
                {getDisplayTeamName(standings[0].userId, standings[0].userInfo.teamName, year)}
              </div>
              <div className={`text-lg font-bold ${leagueColors.text}`}>
                {standings[0].wins}-{standings[0].losses} • {standings[0].pointsFor?.toFixed(2)} pts
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 relative pb-3">
        <h3 className={`text-xl font-black tracking-wide uppercase ${leagueColors.text}`}>
          {getLeagueName(league as LeagueTier)} League
        </h3>
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${leagueColors.iconBg}`}></div>
      </div>
      
      <div className="table-container">
        <table className="table">
          <thead className={`table-header ${leagueColors.iconBg} border-0`}>
            <tr>
              <th className="text-center text-white font-bold">Rank</th>
              <th className="text-white font-bold">Team</th>
              <th className="text-center text-white font-bold">Record</th>
              <th className="text-center text-white font-bold">Points For</th>
              <th className="text-center text-white font-bold">Points Against</th>
              <th className="text-center text-white font-bold">UPR</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing) => (
              <tr key={standing.userId} className={getRowClasses(standing.rank)}>
                <td className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {!isActiveSeason && getRankIcon(standing.rank)}
                    {!isActiveSeason && (
                      <span className={`font-black text-lg ${standing.rank === 1 ? leagueColors.text : 'text-gray-900 dark:text-gray-100'}`}>
                        #{standing.rank}
                      </span>
                    )}
                    {isActiveSeason && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                        TBD
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex items-center space-x-3">
                    <TeamLogo 
                      teamName={getCurrentTeamName(standing.userId, standing.userInfo.teamName)}
                      abbreviation={getCurrentAbbreviation(standing.userId, standing.userInfo.abbreviation)}
                      size="sm"
                      clickable
                      onClick={() => openTeamProfile(standing.userId, standing.userInfo.teamName)}
                    />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        {getDisplayTeamName(standing.userId, standing.userInfo.teamName, year)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden font-mono">{getCurrentAbbreviation(standing.userId, standing.userInfo.abbreviation)}</div>
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
                <td className="text-center">
                  {isActiveSeason ? (
                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                      TBD
                    </span>
                  ) : (
                    <span className="font-bold text-gray-900 dark:text-gray-100 font-mono">
                      {standing.unionPowerRating?.toFixed(2) || '0.00'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};