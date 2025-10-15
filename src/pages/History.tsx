import { useLeagueHistory } from '../hooks/useLeagues';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { TeamLogo } from '../components/Common/TeamLogo';
import { LeagueBadge } from '../components/League/LeagueBadge';
import type { LeagueTier } from '../types';
import { Trophy } from 'lucide-react';

const getLeagueName = (league: string) => {
  const leagueNames = {
    PREMIER: 'Premier',
    MASTERS: 'Masters',
    NATIONAL: 'National'
  };
  return leagueNames[league as LeagueTier] || league;
};

export const History = () => {
  const { data: history, isLoading, error } = useLeagueHistory();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  const years = Object.keys(history).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">League History</h1>
        <p className="mt-2 text-gray-600">Historical standings and champions across all seasons</p>
      </div>

      <div className="space-y-8">
        {years.map(year => (
          <div key={year} className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-semibold text-gray-900">{year} Season</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {['PREMIER', 'MASTERS', 'NATIONAL'].map(league => {
                const leagueData = (history as Record<string, Record<string, { standings?: Array<{ userId: string; wins: number; losses: number; pointsFor?: number; userInfo?: { teamName: string } }> }>>)[year]?.[league];
                
                if (!leagueData) return (
                  <div key={league} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{getLeagueName(league)} League</h3>
                      <LeagueBadge league={league as LeagueTier} />
                    </div>
                    <div className="text-center text-gray-500 py-8">
                      No data available
                    </div>
                  </div>
                );

                return (
                  <div key={league} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{getLeagueName(league)} League</h3>
                      <LeagueBadge league={league as LeagueTier} />
                    </div>
                    
                    <div className="space-y-3">
                      {/* Champion */}
                      {leagueData.standings?.[0] && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">Champion</span>
                          </div>
                          <div className="mt-1 flex items-center space-x-2">
                            <TeamLogo 
                              teamName={leagueData.standings[0].userInfo?.teamName || 'Unknown Team'}
                              size="sm"
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {leagueData.standings[0].userInfo?.teamName || 'Unknown Team'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {leagueData.standings[0].wins}-{leagueData.standings[0].losses}{leagueData.standings[0].ties ? `-${leagueData.standings[0].ties}` : ''} • {leagueData.standings[0].pointsFor?.toFixed(2)} pts
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Final Standings Preview */}
                      <div className="space-y-2">
                        {leagueData.standings?.slice(0, 5).map((team, index: number) => (
                          <div key={team.userId} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 text-gray-500">#{index + 1}</span>
                              <TeamLogo 
                                teamName={team.userInfo?.teamName || 'Unknown Team'}
                                size="sm"
                                className="w-6 h-6"
                              />
                              <span className="font-medium text-gray-900">
                                {team.userInfo?.teamName || 'Unknown Team'}
                              </span>
                            </div>
                            <span className="text-gray-600">{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''}</span>
                          </div>
                        ))}
                        {leagueData.standings && leagueData.standings.length > 5 && (
                          <div className="text-center text-xs text-gray-500 pt-1 border-t">
                            ... and {leagueData.standings.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {years.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            No historical data available
          </div>
        </div>
      )}
    </div>
  );
};