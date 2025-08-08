import { Users, Calendar, BarChart3, Award, UserPlus, TrendingUp, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAllStandings } from '../hooks/useLeagues';
import { TeamLogo } from '../components/Common/TeamLogo';
import { getDisplayTeamName, getCurrentTeamName, getCurrentAbbreviation, isActiveYear } from '../config/constants';
import { getLeagueName } from '../constants/leagues';
import type { LeagueTier } from '../types';

export const Overview = () => {
  const { data: standings, isLoading, error } = useAllStandings();
  
  const colorMap = {
    PREMIER: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      borderHeavy: 'border-yellow-500',
      text: 'text-yellow-800 dark:text-yellow-300',
      iconBg: 'bg-yellow-500',
      highlight: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    MASTERS: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-300 dark:border-purple-700',
      borderHeavy: 'border-purple-500',
      text: 'text-purple-800 dark:text-purple-300',
      iconBg: 'bg-purple-500',
      highlight: 'bg-purple-100 dark:bg-purple-900/30'
    },
    NATIONAL: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      borderHeavy: 'border-red-500',
      text: 'text-red-800 dark:text-red-300',
      iconBg: 'bg-red-500',
      highlight: 'bg-red-100 dark:bg-red-900/30'
    }
  };

  // Get champions for each league from completed seasons
  const getLeagueChampions = () => {
    if (!standings) return {
      PREMIER: [],
      MASTERS: [],
      NATIONAL: []
    };
    
    const championsByLeague: Record<LeagueTier, any[]> = {
      PREMIER: [],
      MASTERS: [],
      NATIONAL: []
    };

    // Group by league and year, then get champions (first place finishers)
    const completedSeasons = standings.filter(s => !isActiveYear(s.year));
    
    completedSeasons.forEach(season => {
      const champion = season.standings.find(standing => standing.rank === 1);
      if (champion && season.league in championsByLeague) {
        championsByLeague[season.league as LeagueTier].push({
          ...champion,
          year: season.year,
          league: season.league
        });
      }
    });

    // Sort by year descending for each league
    (Object.keys(championsByLeague) as LeagueTier[]).forEach(league => {
      championsByLeague[league].sort((a: any, b: any) => b.year.localeCompare(a.year));
    });

    return championsByLeague;
  };

  const leagueChampions = getLeagueChampions();

  return (
    <div className="space-y-8">
      <div className="welcome-card-wrap">
        <div className="welcome-card">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Welcome to the FFU</h1>
            <p className="text-base sm:text-lg lg:text-xl text-red-100 mb-8">
              Explore stats, standings, and records across all leagues.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-xlg mx-auto">
              <Link
                to="/standings"
                className="bg-white/10 hover:bg-white/20 angular-cut-small p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
              >
                <Users className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                <div className="font-semibold text-sm sm:text-base">Standings</div>
              </Link>
              <Link
                to="/members"
                className="bg-white/10 hover:bg-white/20 angular-cut-small p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
              >
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                <div className="font-semibold text-sm sm:text-base">Members</div>
              </Link>
              <Link
                to="/matchups"
                className="bg-white/10 hover:bg-white/20 angular-cut-small p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
              >
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                <div className="font-semibold text-sm sm:text-base">Matchups</div>
              </Link>
              <Link
                to="/drafts"
                className="bg-white/10 hover:bg-white/20 angular-cut-small p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
              >
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                <div className="font-semibold text-sm sm:text-base">Drafts</div>
              </Link>
              <Link
                to="/records"
                className="bg-white/10 hover:bg-white/20 angular-cut-small p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
              >
                <Award className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                <div className="font-semibold text-sm sm:text-base">Records</div>
              </Link>
              <Link
                to="/stats"
                className="bg-white/10 hover:bg-white/20 angular-cut-small p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
              >
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
                <div className="font-semibold text-sm sm:text-base">Stats</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className='card'>
        <h1 className="py-4 text-3xl font-bold text-gray-900 dark:text-gray-100">Upcoming 2025 Drafts</h1>
        <div>
          <div className={`champion-highlight angular-cut p-6 mb-6 relative overflow-hidden border-l4 ${colorMap.PREMIER.highlight}`}>
            <span className={`text-lg font-black ${colorMap.PREMIER.text} tracking-wide`}>
              Premier League
            </span>
            <p>Wednesday 9/3 8:30pm ET</p>
          </div>
          <div className={`champion-highlight angular-cut p-6 mb-6 relative overflow-hidden border-l4 ${colorMap.MASTERS.highlight}`}>
            <span className={`text-lg font-black ${colorMap.MASTERS.text} tracking-wide`}>
              Masters League
            </span>
            <p>Thursday 8/28 9:00pm ET</p>
          </div>
          <div className={`champion-highlight angular-cut p-6 mb-6 relative overflow-hidden border-l4 ${colorMap.NATIONAL.highlight}`}>
            <span className={`text-lg font-black ${colorMap.NATIONAL.text} tracking-wide`}>
              National League
            </span>
            <p>Sunday 8/24 10:00pm ET</p>
          </div>
        </div>
      </div>

      {/* League Champions Section */}
      {!isLoading && !error && standings && (
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">League Champions</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['PREMIER', 'MASTERS', 'NATIONAL'] as LeagueTier[]).map(league => {
              const champions = leagueChampions[league] || [];
              const colors = colorMap[league];
              
              if (champions.length === 0) return null;

              return (
                <div key={league} className={`${colors.bg} p-6`}>
                  <div className={`${colors.iconBg} -mx-6 -mt-6 mb-4 p-4`}>
                    <h3 className="text-xl font-black text-white tracking-wide uppercase text-center">
                      {getLeagueName(league)} Champions
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {champions.map((champion) => (
                      <div key={`${champion.year}-${champion.userId}`} className="flex items-center space-x-3">
                        <span className={`w-12 h-8 flex items-center justify-center text-sm font-bold text-white ${colors.iconBg}`}>
                          {champion.year}
                        </span>
                        <div className="hidden sm:block">
                          <TeamLogo 
                            teamName={getCurrentTeamName(champion.userId, champion.userInfo.teamName)}
                            abbreviation={getCurrentAbbreviation(champion.userId, champion.userInfo.abbreviation)}
                            size="sm"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black truncate text-gray-900 dark:text-gray-100">
                            {getDisplayTeamName(champion.userId, champion.userInfo.teamName, champion.year)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {champion.wins}-{champion.losses} • {champion.pointsFor?.toFixed(1)} pts
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};