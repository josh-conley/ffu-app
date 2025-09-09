import { useState, useEffect } from 'react';
import { useNFLStats } from '../../hooks/useNFLStats';
import { LoadingSpinner } from './LoadingSpinner';
import type { NFLPlayerStats } from '../../types/nfl-stats';

interface PlayerCardProps {
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

const PlayerCard = ({ player, position }: PlayerCardProps) => {
  const displayName = player.player?.full_name || 
                     `${player.player?.first_name || ''} ${player.player?.last_name || ''}`.trim() ||
                     'Unknown Player';
  
  const team = player.player?.team || 'UNK';
  const points = player.pts_half_ppr?.toFixed(1) || '0.0';

  // Get yards stats for top line
  const getYardsStats = () => {
    const stats = [];
    
    switch (position) {
      case 'QB':
        if (player.pass_yd) stats.push(`${player.pass_yd} Pass YDS`);
        if (player.rush_yd) stats.push(`${player.rush_yd} Rush YDS`);
        break;
        
      case 'RB':
        if (player.rush_yd) stats.push(`${player.rush_yd} Rush YDS`);
        if (player.rec_yd) stats.push(`${player.rec_yd} Rec YDS`);
        break;
        
      case 'WR':
      case 'TE':
        if (player.rec_yd) stats.push(`${player.rec_yd} Rec YDS`);
        if (player.rush_yd) stats.push(`${player.rush_yd} Rush YDS`);
        break;
        
      case 'DEF':
        // DEF doesn't have yards - show main defensive stats
        if (player.def_sack) stats.push(`${player.def_sack} SACKS`);
        if (player.def_int) stats.push(`${player.def_int} INT`);
        break;
    }
    
    return stats.join(', ');
  };

  // Get TDs/Fumbles/Ints for middle line
  const getTdFumStats = () => {
    const stats = [];
    
    switch (position) {
      case 'QB':
        if (player.pass_td) stats.push(`${player.pass_td} Pass TD`);
        if (player.rush_td) stats.push(`${player.rush_td} Rush TD`);
        if (player.pass_int) stats.push(`${player.pass_int} INT`);
        if (player.fum) stats.push(`${player.fum} FUM`);
        break;
        
      case 'RB':
        if (player.rush_td) stats.push(`${player.rush_td} Rush TD`);
        if (player.rec_td) stats.push(`${player.rec_td} Rec TD`);
        if (player.fum) stats.push(`${player.fum} FUM`);
        break;
        
      case 'WR':
      case 'TE':
        if (player.rec_td) stats.push(`${player.rec_td} Rec TD`);
        if (player.rush_td) stats.push(`${player.rush_td} Rush TD`);
        if (player.fum) stats.push(`${player.fum} FUM`);
        break;
        
      case 'DEF':
        if (player.def_td) stats.push(`${player.def_td} TD`);
        if (player.def_fum_rec) stats.push(`${player.def_fum_rec} FUM REC`);
        break;
    }
    
    return stats.join(', ');
  };

  // Get Receptions/First Downs for bottom line
  const getRecFirstDownStats = () => {
    const stats = [];
    
    switch (position) {
      case 'QB':
        if (player.pass_fd) stats.push(`${player.pass_fd} Pass 1D`);
        if (player.rush_fd) stats.push(`${player.rush_fd} Rush 1D`);
        break;
        
      case 'RB':
        if (player.rec) stats.push(`${player.rec} REC`);
        if (player.rush_fd) stats.push(`${player.rush_fd} Rush 1D`);
        if (player.rec_fd) stats.push(`${player.rec_fd} Rec 1D`);
        break;
        
      case 'WR':
      case 'TE':
        if (player.rec) stats.push(`${player.rec} REC`);
        if (player.rec_fd) stats.push(`${player.rec_fd} Rec 1D`);
        if (player.rush_fd) stats.push(`${player.rush_fd} Rush 1D`);
        break;
        
      case 'DEF':
        // DEF doesn't have receptions/first downs
        break;
    }
    
    return stats.join(', ');
  };

  return (
    <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mx-2 w-[200px] h-[140px] flex flex-col">
      {/* Top row: Player info and score */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {displayName}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`text-xs font-bold px-2 py-1 rounded ${getPositionColors(position)}`}>
              {position}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {team}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {points}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            pts
          </div>
        </div>
      </div>
      
      {/* Stats - three lines */}
      <div className="flex-1 flex flex-col justify-end space-y-0.5">
        {/* Yards (top) */}
        {getYardsStats() && (
          <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
            {getYardsStats()}
          </div>
        )}
        
        {/* TDs/Fumbles/Ints (middle) */}
        {getTdFumStats() && (
          <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
            {getTdFumStats()}
          </div>
        )}
        
        {/* Receptions/First Downs (bottom) */}
        {getRecFirstDownStats() && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getRecFirstDownStats()}
          </div>
        )}
      </div>
    </div>
  );
};

export const PlayerTicker = () => {
  const { data: nflStats, isLoading, error } = useNFLStats();
  const [currentPage, setCurrentPage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const playersPerPage = 4; // Show 4 player cards at a time

  // Combine all players into one array for pagination - grouped by position QB → RB → WR → TE → DEF
  const allPlayersBase: (NFLPlayerStats & { positionLabel: string })[] = nflStats ? [
    ...nflStats.quarterbacks.map(p => ({ ...p, positionLabel: 'QB' })),
    ...nflStats.runningBacks.map(p => ({ ...p, positionLabel: 'RB' })),
    ...nflStats.wideReceivers.map(p => ({ ...p, positionLabel: 'WR' })),
    ...nflStats.tightEnds.map(p => ({ ...p, positionLabel: 'TE' })),
    ...nflStats.defenses.map(p => ({ ...p, positionLabel: 'DEF' }))
  ] : [];

  // Filter players by position
  const allPlayers = selectedPosition === 'ALL' 
    ? allPlayersBase 
    : allPlayersBase.filter(player => player.positionLabel === selectedPosition);

  // Calculate pagination
  const totalPages = Math.ceil(allPlayers.length / playersPerPage);
  const startIndex = currentPage * playersPerPage;
  const visiblePlayers = allPlayers.slice(startIndex, startIndex + playersPerPage);

  // Reset to page 0 when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedPosition]);

  // Auto-advance when not hovered and not paused
  useEffect(() => {
    if (!isHovered && !isPaused && totalPages > 1) {
      const interval = setInterval(() => {
        setCurrentPage(prev => (prev + 1) % totalPages);
      }, 5000); // Change page every 5 seconds (1 second slower)
      
      return () => clearInterval(interval);
    }
  }, [isHovered, isPaused, totalPages]);

  const goToNextPage = () => {
    setCurrentPage(prev => (prev + 1) % totalPages);
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => (prev - 1 + totalPages) % totalPages);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading weekly leaders...</span>
        </div>
      </div>
    );
  }

  if (error || !nflStats) {
    return (
      <div className="card">
        <div className="text-center py-4">
          <p className="text-gray-500 dark:text-gray-400">
            {error || 'No NFL stats available'}
          </p>
        </div>
      </div>
    );
  }

  console.log('Players to display:', allPlayers.length);
  console.log('Sample players with scores:', allPlayers.slice(0, 5).map(p => ({
    name: p.player?.full_name || 'Unknown',
    position: p.positionLabel,
    halfPPR: p.pts_half_ppr,
    fullPPR: p.pts_ppr
  })));

  // If no players have good scores, show message
  if (allPlayers.length === 0) {
    return (
      <div className="hidden md:block card">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Weekly Leaders
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No player statistics available for this week yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="hidden md:block card overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Weekly Leaders
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {selectedPosition === 'ALL' ? 'Top performing NFL players this week' : `Top ${selectedPosition}s this week`}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Position Filter */}
          <select 
            value={selectedPosition} 
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="ALL">All Positions</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
            <option value="DEF">DEF</option>
          </select>

          {/* Pause/Play Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={isPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
          >
            {isPaused ? (
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            )}
          </button>
          
          {/* Page indicator */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentPage + 1} of {totalPages}
          </div>
        </div>
      </div>
      
      <div className="relative">
        {/* Navigation arrows */}
        {totalPages > 1 && (
          <>
            <button
              onClick={goToPrevPage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-600 transition-colors"
              aria-label="Previous page"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={goToNextPage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-600 transition-colors"
              aria-label="Next page"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Player cards container */}
        <div className="flex transition-all duration-500 ease-in-out space-x-2 px-12 min-h-[140px] items-center">
          {visiblePlayers.map((player, index) => (
            <PlayerCard
              key={`${player.player_id}-${startIndex + index}`}
              player={player}
              position={player.positionLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
};