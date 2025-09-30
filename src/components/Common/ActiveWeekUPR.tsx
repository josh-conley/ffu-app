import { useMemo, useEffect, useRef, useState } from 'react';
import { Crown, Award } from 'lucide-react';
import { useAllStandings } from '../../hooks/useLeagues';
import { LoadingSpinner } from './LoadingSpinner';
import { TeamLogo } from './TeamLogo';
import { getCurrentNFLWeek, isNFLWeekComplete } from '../../utils/nfl-schedule';
import { getDisplayTeamName, getCurrentTeamName, getCurrentAbbreviation } from '../../config/constants';
import { useTeamProfileModal } from '../../contexts/TeamProfileModalContext';
import type { LeagueTier, EnhancedSeasonStandings } from '../../types';

interface UPREntry {
  userId: string;
  teamName: string;
  abbreviation: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  highGame?: number;
  lowGame?: number;
  upr: number;
  league: LeagueTier;
}

export const ActiveWeekUPR = () => {
  const { data: allStandings, isLoading, error } = useAllStandings();
  const { openTeamProfile } = useTeamProfileModal();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const currentNFLWeek = getCurrentNFLWeek();

  const uprData = useMemo(() => {
    console.log('UPR DEBUG: Starting calculation', {
      currentNFLWeek,
      allStandings: !!allStandings,
      allStandingsLength: allStandings?.length
    });

    if (!currentNFLWeek || !allStandings) {
      console.log('UPR DEBUG: Missing data', { currentNFLWeek, allStandings: !!allStandings });
      return [];
    }

    // Show all available years
    const allYears = allStandings.map(s => s.year);
    console.log('UPR DEBUG: All available years:', allYears);

    const uprEntries: UPREntry[] = [];

    // Get all 2025 standings and extract UPR data
    const currentSeasons = allStandings.filter(season => season.year === '2025');
    console.log('UPR DEBUG: Found 2025 seasons:', currentSeasons.length);

    if (currentSeasons.length === 0) {
      console.log('UPR DEBUG: No 2025 data available yet');
      return [];
    }

    currentSeasons.forEach(season => {
      console.log(`UPR DEBUG: Processing ${season.league} with ${season.standings.length} standings`);

      season.standings.forEach((standing: EnhancedSeasonStandings) => {
        console.log(`UPR DEBUG: Standing for ${standing.userId}:`, {
          hasUserInfo: !!standing.userInfo,
          unionPowerRating: standing.unionPowerRating,
          wins: standing.wins,
          losses: standing.losses
        });

        if (!standing.userInfo || !standing.unionPowerRating) {
          console.log('UPR DEBUG: Skipping standing due to missing data');
          return;
        }

        uprEntries.push({
          userId: standing.userId,
          teamName: standing.userInfo.teamName,
          abbreviation: standing.userInfo.abbreviation,
          wins: standing.wins,
          losses: standing.losses,
          pointsFor: standing.pointsFor,
          pointsAgainst: standing.pointsAgainst,
          highGame: standing.highGame,
          lowGame: standing.lowGame,
          upr: standing.unionPowerRating,
          league: season.league as LeagueTier
        });
      });
    });

    console.log('UPR DEBUG: Final entries:', uprEntries.length, uprEntries.slice(0, 3));

    // Sort by UPR descending
    return uprEntries.sort((a, b) => b.upr - a.upr);
  }, [allStandings, currentNFLWeek]);

  const shouldShow = useMemo(() => {
    if (!currentNFLWeek) return false;
    return true; // Always show for now - can add week completion check later
  }, [currentNFLWeek]);

  // Auto-scroll functionality like Weekly Leaders
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isHovered || uprData.length === 0) return;

    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const scroll = () => {
      scrollContainer.scrollTop += 1;
      if (scrollContainer.scrollTop >= scrollContainer.scrollHeight - scrollContainer.clientHeight) {
        scrollContainer.scrollTop = 0;
        clearInterval(interval);
        timeout = setTimeout(() => {
          interval = setInterval(scroll, 30);
        }, 2000);
      }
    };

    timeout = setTimeout(() => {
      interval = setInterval(scroll, 30);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [uprData, isHovered]);

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Union Power Rating
        </h3>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !allStandings) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Union Power Rating
        </h3>
        <div className="text-center py-4">
          <p className="text-sm text-red-500">
            {error ? 'Error loading data' : 'No standings data available'}
          </p>
        </div>
      </div>
    );
  }

  if (!shouldShow) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Union Power Rating
        </h3>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Available after week completion
          </p>
        </div>
      </div>
    );
  }

  const getLeagueColor = (league: LeagueTier) => {
    switch (league) {
      case 'PREMIER':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'MASTERS':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'NATIONAL':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  const calculateAverageScore = (pointsFor: number, wins: number, losses: number) => {
    const totalGames = wins + losses;
    return totalGames > 0 ? pointsFor / totalGames : 0;
  };

  return (
    <div
      className="card h-[calc(100vh-12rem)] overflow-hidden flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Union Power Rating
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Through Week {currentNFLWeek}
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {uprData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No UPR data available yet
              </p>
            </div>
          ) : (
            uprData.map((entry, index) => (
              <div
                key={`${entry.userId}-${entry.league}`}
                className="flex items-center space-x-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 cursor-pointer transition-colors"
                onClick={() => openTeamProfile(entry.userId, entry.teamName)}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-6 h-6 mr-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{index + 1}</span>
                </div>

                {/* Team Logo */}
                <div>
                  <TeamLogo
                    teamName={getCurrentTeamName(entry.userId, entry.teamName)}
                    abbreviation={getCurrentAbbreviation(entry.userId, entry.abbreviation)}
                    size="sm"
                    clickable
                    onClick={() => openTeamProfile(entry.userId, entry.teamName)}
                  />
                </div>

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {getDisplayTeamName(entry.userId, entry.teamName, '2025')}
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getLeagueColor(entry.league)}`}>
                      {entry.league}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {entry.wins}-{entry.losses} • {calculateAverageScore(entry.pointsFor, entry.wins, entry.losses).toFixed(1)} avg
                    {entry.highGame && entry.lowGame && (
                      <> • H: {entry.highGame.toFixed(1)} L: {entry.lowGame.toFixed(1)}</>
                    )}
                  </div>
                </div>

                {/* UPR Score */}
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {entry.upr.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    UPR
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};