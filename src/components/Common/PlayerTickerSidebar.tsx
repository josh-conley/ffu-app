import React, { useEffect, useRef, useState } from 'react';
import { useNFLStats } from '../../hooks/useNFLStats';
import { LoadingSpinner } from './LoadingSpinner';
import type { NFLPlayerStats } from '../../types/nfl-stats';

interface PlayerItemProps {
  player: NFLPlayerStats;
  position: string;
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

const PlayerItem = ({ player, position }: PlayerItemProps) => {
  const displayName = player.player?.full_name ||
                     `${player.player?.first_name || ''} ${player.player?.last_name || ''}`.trim() ||
                     'Unknown Player';

  const team = player.player?.team || 'UNK';
  const points = player.pts_half_ppr?.toFixed(2) || '0.00';

  // Show position-specific stats
  const getStatsDisplay = () => {
    if (position === 'QB') {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {player.pass_yd || 0} PY, {player.pass_td || 0} PTD, {player.pass_int || 0} INT
          {player.rush_yd ? `, ${player.rush_yd} RY` : ''}
          {player.rush_td ? `, ${player.rush_td} RTD` : ''}
          {player.pass_fd ? `, ${player.pass_fd} PFD` : ''}
          {player.rush_fd ? `, ${player.rush_fd} RFD` : ''}
        </div>
      );
    } else if (position === 'RB') {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {player.rush_yd || 0} RY, {player.rush_td || 0} RTD, {player.rush_att || 0} ATT
          {player.rec ? `, ${player.rec} REC` : ''}
          {player.rec_yd ? `, ${player.rec_yd} RECY` : ''}
          {player.rec_td ? `, ${player.rec_td} RECTD` : ''}
          {player.rush_fd ? `, ${player.rush_fd} RFD` : ''}
          {player.rec_fd ? `, ${player.rec_fd} RECFD` : ''}
        </div>
      );
    } else if (position === 'WR' || position === 'TE') {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {player.rec || 0} REC, {player.rec_yd || 0} RECY, {player.rec_td || 0} RECTD
          {player.rush_yd ? `, ${player.rush_yd} RY` : ''}
          {player.rush_td ? `, ${player.rush_td} RTD` : ''}
          {player.rec_fd ? `, ${player.rec_fd} RECFD` : ''}
          {player.rush_fd ? `, ${player.rush_fd} RFD` : ''}
        </div>
      );
    } else if (position === 'DEF') {
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
    return null;
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {displayName}
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getPositionColors(position)}`}>
            {position}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {team}
          </span>
        </div>
        {getStatsDisplay()}
      </div>
      <div className="text-right ml-2">
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {points}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          pts
        </div>
      </div>
    </div>
  );
};

export const PlayerTickerSidebar = () => {
  const { data: nflStats, isLoading, error } = useNFLStats();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Combine all players into one array - top performers across all positions
  const allPlayers: (NFLPlayerStats & { positionLabel: string })[] = nflStats ? [
    ...nflStats.quarterbacks.map(p => ({ ...p, positionLabel: 'QB' })),
    ...nflStats.runningBacks.map(p => ({ ...p, positionLabel: 'RB' })),
    ...nflStats.wideReceivers.map(p => ({ ...p, positionLabel: 'WR' })),
    ...nflStats.tightEnds.map(p => ({ ...p, positionLabel: 'TE' })),
    ...nflStats.defenses.map(p => ({ ...p, positionLabel: 'DEF' }))
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
      className="card h-[calc(100vh-12rem)] overflow-hidden flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Weekly Leaders
        </h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {allPlayers.map((player, index) => (
            <PlayerItem
              key={`${player.player_id}-${index}`}
              player={player}
              position={player.positionLabel}
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
    </div>
  );
};