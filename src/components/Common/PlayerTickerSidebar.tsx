import { useEffect, useRef, useState } from 'react';
import { useNFLStats } from '../../hooks/useNFLStats';
import { LoadingSpinner } from './LoadingSpinner';
import { TeamLogo } from './TeamLogo';
import { RosterModal } from './RosterModal';
import { leagueApi } from '../../services/api';
import { getCurrentNFLWeek } from '../../utils/nfl-schedule';
import { isSleeperEra } from '../../utils/era-detection';
import { getLeagueId, getUserById } from '../../config/constants';
import type { NFLPlayerStats } from '../../types/nfl-stats';
import type { LeagueTier, WeekMatchupsResponse } from '../../types';

interface PlayerItemProps {
  player: NFLPlayerStats;
  position: string;
  positionRank: number;
  overallRank: number;
  onTeamClick?: (userId: string, teamName: string, abbreviation: string) => void;
  isLoadingMatchup?: boolean;
}

const getPositionColors = (position: string) => {
  switch (position) {
    case 'QB':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    case 'RB':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'WR':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'TE':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'DEF':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    default:
      return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
  }
};

const PlayerItem = ({ player, position, positionRank, overallRank, onTeamClick, isLoadingMatchup }: PlayerItemProps) => {
  const displayName = player.player?.full_name ||
                     `${player.player?.first_name || ''} ${player.player?.last_name || ''}`.trim() ||
                     'Unknown Player';

  const team = player.player?.team || 'UNK';
  const points = player.pts_half_ppr?.toFixed(2) || '0.00';
  const ffuStarters = (player as any).ffuStarters || [];

  // Show position-specific stats
  const getStatsDisplay = () => {
    const hasPassingStats = (player.pass_yd || 0) > 0 || (player.pass_td || 0) > 0 || (player.pass_int || 0) > 0;
    const hasRushingStats = (player.rush_yd || 0) > 0 || (player.rush_td || 0) > 0;
    const hasReceivingStats = (player.rec_yd || 0) > 0 || (player.rec_td || 0) > 0 || (player.rec || 0) > 0;
    const hasFumbles = (player.fum_lost || 0) > 0;

    if (position === 'DEF') {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {player.def_sack || 0} SACK, {player.def_int || 0} INT, {player.def_fum_rec || 0} FR
          {player.def_safety ? `, ${player.def_safety} SAF` : ''}
          {player.def_pts_allowed !== null && player.def_pts_allowed !== undefined ? `, ${player.def_pts_allowed} PA` : ''}
          {player.def_tackled_for_loss ? `, ${player.def_tackled_for_loss} TFL` : ''}
          {player.def_4_and_stop ? `, ${player.def_4_and_stop} 4DS` : ''}
        </div>
      );
    }

    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
        {hasPassingStats && (
          <div>
            {player.pass_yd || 0} PY, {player.pass_td || 0} PTD, {player.pass_int || 0} INT
          </div>
        )}
        {hasRushingStats && (
          <div>
            {player.rush_att || 0} RUSH, {player.rush_yd || 0} YDS{(player.rush_td || 0) > 0 ? `, ${player.rush_td} TD` : ''}
          </div>
        )}
        {hasReceivingStats && (
          <div>
            {player.rec || 0} REC, {player.rec_yd || 0} YDS{(player.rec_td || 0) > 0 ? `, ${player.rec_td} TD` : ''}
          </div>
        )}
        {hasFumbles && (
          <div>
            {player.fum_lost} FUM
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-2">
      {/* Overall Rank - Far Left */}
      <div className="flex items-center justify-center w-6 flex-shrink-0 self-stretch">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{overallRank}</span>
      </div>

      {/* Player Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: Name, Position, Team, and Points */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2 flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {displayName}
            </div>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded leading-none ${getPositionColors(position)}`}>
              {position} {positionRank}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {team}
            </span>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {points}
            </span>
          </div>
        </div>

        {/* Bottom row: Stats and FFU Team Logos */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex-1">
          {getStatsDisplay()}
        </div>

        {/* FFU Team Logos */}
        {ffuStarters.length > 0 && (
          <div className="flex items-center space-x-1 ml-2">
            {ffuStarters.map((starter: any, index: number) => (
              <div key={`${starter.userId}-${index}`} className="flex flex-col items-center">
                <div className="relative">
                  <TeamLogo
                    teamName={starter.teamName}
                    abbreviation={starter.abbreviation}
                    size="sm"
                    clickable={!isLoadingMatchup}
                    onClick={() => onTeamClick?.(starter.userId, starter.teamName, starter.abbreviation)}
                    className={isLoadingMatchup ? 'opacity-50' : ''}
                  />
                  {isLoadingMatchup && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                  {starter.abbreviation}
                </span>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export const PlayerTickerSidebar = () => {
  const { data: nflStats, isLoading, error } = useNFLStats();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rosterModal, setRosterModal] = useState<{
    isOpen: boolean;
    leagueId: string;
    winnerUserId: string;
    loserUserId: string;
    week: number;
    year: string;
    winnerTeamName: string;
    loserTeamName: string;
    winnerAbbreviation: string;
    loserAbbreviation: string;
  }>({
    isOpen: false,
    leagueId: '',
    winnerUserId: '',
    loserUserId: '',
    week: 0,
    year: '',
    winnerTeamName: '',
    loserTeamName: '',
    winnerAbbreviation: '',
    loserAbbreviation: ''
  });
  const [matchupsCache, setMatchupsCache] = useState<Map<LeagueTier, WeekMatchupsResponse>>(new Map());
  const [isLoadingMatchup, setIsLoadingMatchup] = useState(false);

  const currentNFLWeek = getCurrentNFLWeek();

  // Pre-fetch matchup data for all leagues when component mounts
  useEffect(() => {
    const preloadMatchups = async () => {
      if (!currentNFLWeek || !isSleeperEra('2025')) return;

      const leagues: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'];

      for (const league of leagues) {
        try {
          if (!matchupsCache.has(league)) {
            console.log(`Pre-loading matchups for ${league}`);
            const matchups = await leagueApi.getWeekMatchups(league, '2025', currentNFLWeek);

            // Validate the response structure
            if (matchups && typeof matchups === 'object' && Array.isArray(matchups.matchups)) {
              setMatchupsCache(prev => new Map(prev).set(league, matchups));
              console.log(`Successfully loaded ${matchups.matchups.length} matchups for ${league}`);
            } else {
              console.warn(`Invalid matchup data structure for ${league}:`, matchups);
            }
          }
        } catch (error) {
          console.error(`Failed to pre-load matchups for ${league}:`, error);
          // Don't set partial/invalid data in the cache
        }
      }
    };

    preloadMatchups();
  }, [currentNFLWeek, isSleeperEra]);

  // Helper function to get league tier from user ID
  const getLeagueTierForUser = async (userId: string): Promise<LeagueTier | null> => {
    const user = getUserById(userId);
    if (!user) return null;

    // Check each league to see which one the user is in for 2025
    const leagues: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'];

    for (const league of leagues) {
      const leagueId = getLeagueId(league, '2025');
      if (!leagueId) continue;

      try {
        // Check if this league has matchups cached
        if (matchupsCache.has(league)) {
          const matchups = matchupsCache.get(league)!;
          const userInLeague = matchups.matchups.some(m =>
            m.winnerInfo.userId === userId || m.loserInfo.userId === userId
          );
          if (userInLeague) return league;
        } else {
          // Fetch and cache matchups for this league
          console.log(`Fetching matchups for ${league}, week ${currentNFLWeek}`);
          const matchups = await leagueApi.getWeekMatchups(league, '2025', currentNFLWeek || 1);
          console.log(`Successfully fetched matchups for ${league}:`, matchups);
          setMatchupsCache(prev => new Map(prev).set(league, matchups));

          const userInLeague = matchups.matchups.some(m =>
            m.winnerInfo.userId === userId || m.loserInfo.userId === userId
          );
          if (userInLeague) return league;
        }
      } catch (error) {
        console.error(`Failed to fetch matchups for ${league}:`, error);
      }
    }
    return null;
  };

  // Helper function to open roster modal for team
  const openTeamMatchupModal = async (userId: string, teamName: string, _abbreviation: string) => {
    if (!isSleeperEra('2025') || !currentNFLWeek) {
      console.warn('Not in Sleeper era or no current NFL week');
      return;
    }

    if (isLoadingMatchup) {
      console.log('Already loading matchup data, ignoring click');
      return;
    }

    try {
      setIsLoadingMatchup(true);
      console.log('Opening matchup modal for user:', userId, teamName);

      const league = await getLeagueTierForUser(userId);
      if (!league) {
        console.warn('Could not find league for user:', userId);
        return;
      }

      console.log('Found league:', league);

      const leagueId = getLeagueId(league, '2025');
      if (!leagueId) {
        console.warn('No league ID found for:', league);
        return;
      }

      const matchups = matchupsCache.get(league);
      if (!matchups || !matchups.matchups || !Array.isArray(matchups.matchups)) {
        console.warn('No cached matchups or invalid matchup data for league:', league);
        return;
      }

      console.log('Found matchups:', matchups);

      // Find the matchup containing this user
      const matchup = matchups.matchups.find(m =>
        m?.winnerInfo?.userId === userId || m?.loserInfo?.userId === userId
      );

      if (!matchup || !matchup.winnerInfo || !matchup.loserInfo) {
        console.warn('No valid matchup found for user:', userId);
        return;
      }

      console.log('Found matchup:', matchup);
      console.log('About to open modal with:', {
        winnerUserId: matchup.winnerInfo.userId,
        loserUserId: matchup.loserInfo.userId,
        leagueId,
        week: currentNFLWeek
      });

      setRosterModal({
        isOpen: true,
        leagueId,
        winnerUserId: matchup.winnerInfo.userId,
        loserUserId: matchup.loserInfo.userId,
        week: currentNFLWeek,
        year: '2025',
        winnerTeamName: matchup.winnerInfo.teamName,
        loserTeamName: matchup.loserInfo.teamName,
        winnerAbbreviation: matchup.winnerInfo.abbreviation,
        loserAbbreviation: matchup.loserInfo.abbreviation
      });
    } catch (error) {
      console.error('Failed to open team matchup modal:', error);
      console.error('Error details:', error);
    } finally {
      setIsLoadingMatchup(false);
    }
  };

  const closeRosterModal = () => {
    setRosterModal(prev => ({ ...prev, isOpen: false }));
  };

  // Combine players by position with limits and positional ranks
  const allPlayers: (NFLPlayerStats & { positionLabel: string; positionRank: number })[] = nflStats ? [
    ...nflStats.quarterbacks.slice(0, 12).map((p, i) => ({ ...p, positionLabel: 'QB', positionRank: i + 1 })),
    ...nflStats.runningBacks.slice(0, 24).map((p, i) => ({ ...p, positionLabel: 'RB', positionRank: i + 1 })),
    ...nflStats.wideReceivers.slice(0, 24).map((p, i) => ({ ...p, positionLabel: 'WR', positionRank: i + 1 })),
    ...nflStats.tightEnds.slice(0, 12).map((p, i) => ({ ...p, positionLabel: 'TE', positionRank: i + 1 })),
    ...nflStats.defenses.slice(0, 12).map((p, i) => ({ ...p, positionLabel: 'DEF', positionRank: i + 1 }))
  ].sort((a, b) => (b.pts_half_ppr || 0) - (a.pts_half_ppr || 0)) : [];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isHovered) return;

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
  }, [allPlayers, isHovered]);

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Weekly Leaders
        </h3>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !nflStats || allPlayers.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Weekly Leaders
        </h3>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No stats available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card h-[calc(100vh-12rem)] overflow-hidden flex flex-col p-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Weekly Leaders
        </h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide -mx-2">
        <div className="px-2">
          {allPlayers.map((player, index) => (
            <PlayerItem
              key={`${player.player_id}-${index}`}
              player={player}
              position={player.positionLabel}
              positionRank={player.positionRank}
              overallRank={index + 1}
              onTeamClick={openTeamMatchupModal}
              isLoadingMatchup={isLoadingMatchup}
            />
          ))}
          <div className="h-32"></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `
      }} />

      <RosterModal
        {...rosterModal}
        onClose={closeRosterModal}
      />
    </div>
  );
};