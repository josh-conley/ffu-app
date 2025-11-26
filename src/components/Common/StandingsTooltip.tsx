import { Info, Star } from 'lucide-react';
import type { TiebreakerInfo } from '../../utils/ranking';

interface StandingsTooltipProps {
  tiebreakerInfo: TiebreakerInfo;
  size?: 'sm' | 'md';
}

/**
 * Displays a tooltip with standings information
 * Shows head-to-head records and indicates whether Points For is being used as tiebreaker
 */
export const StandingsTooltip = ({ tiebreakerInfo, size = 'md' }: StandingsTooltipProps) => {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const tooltipWidth = size === 'sm' ? 'w-64' : 'w-72';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Get context label for a layer
  const getContextLabel = (layer: any, layerIdx: number, totalLayers: number) => {
    // If this is a division layer with bumped leader AND there are 2 layers, show step 1
    if (layer.context === 'division-leaders' && layer.hasBumpedThirdLeader && totalLayers === 2) {
      return 'Step 1: Division Tiebreaker';
    }

    // If this is the second layer after a division layer, show step 2
    if (layerIdx === 1 && totalLayers === 2) {
      return 'Step 2: Cross-Division Ranking';
    }

    switch (layer.context) {
      case 'division-leaders':
        return 'Division Tiebreaker';
      case 'wild-card':
        return 'Seeds 3-12';
      default:
        return 'Tiebreaker';
    }
  };

  return (
    <div className="group relative inline-block">
      <Info className={`${iconSize} text-gray-600 dark:text-gray-300 cursor-help`} />
      <div className={`invisible group-hover:visible absolute z-[9999] ${tooltipWidth} px-3 py-2 ${fontSize} text-white bg-gray-900/75 dark:bg-gray-800/75 rounded-lg shadow-xl whitespace-normal pointer-events-none left-full ml-2 top-1/2 -translate-y-1/2 backdrop-blur-sm`}>
        <div className="font-bold mb-2 pb-2 border-b border-gray-700">Tiebreakers</div>

        {tiebreakerInfo.layers.map((layer, layerIdx) => (
          <div key={layerIdx} className={layerIdx > 0 ? 'mt-3 pt-3 border-t border-gray-600' : ''}>
            <div className="font-semibold text-yellow-400 mb-1">{getContextLabel(layer, layerIdx, tiebreakerInfo.layers.length)}</div>

            {layer.allTeamsH2H && layer.allTeamsH2H.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs font-semibold text-gray-300 mb-1">
                  All Tied {layer.tiedRecord || ''} Teams:
                </div>
                {layer.allTeamsH2H.map((team, idx) => (
                  <div
                    key={idx}
                    className={`${fontSize} flex justify-between gap-3 ${team.isCurrentTeam ? 'font-bold text-yellow-300' : 'text-gray-200'}`}
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="truncate">{team.teamName}</span>
                      {team.isBumpedThirdLeader && (
                        <Star className="h-3 w-3 text-gray-400 flex-shrink-0" fill="currentColor" />
                      )}
                    </span>
                    <span className="whitespace-nowrap">
                      {team.h2hRecord} ({(team.h2hWinPct * 100).toFixed(1)}%) • {team.pointsFor.toFixed(2)} PF
                    </span>
                  </div>
                ))}
              </div>
            )}

            {layer.usesPointsFor && (
              <div className={`${fontSize} mt-2 text-blue-300 italic`}>
                Tiebreaker: Points For
              </div>
            )}

            {layer.hasBumpedThirdLeader && layer.context === 'division-leaders' && (
              <div className={`${fontSize} mt-2 pt-2 border-t border-gray-600 text-orange-300`}>
                {tiebreakerInfo.layers.length === 1 ? (
                  // Single layer case: current team is the bumped 3rd leader
                  <>
                    <div className="font-semibold mb-1">⭐ Division Winner</div>
                    <div className="mb-2">This team won the division via H2H tiebreaker</div>
                    <div className="font-semibold mb-1">Special Playoff Rule:</div>
                    <div>As the 3rd division winner, this team receives the 6th seed at minimum</div>
                  </>
                ) : (
                  // Two layer case: showing division tiebreaker for other teams in division
                  <>
                    <div className="font-semibold mb-1">⭐ Division Winner</div>
                    <div>This team won the division via H2H tiebreaker</div>
                  </>
                )}
              </div>
            )}

            {layer.hasBumpedThirdLeader && layer.context === 'wild-card' && (
              <div className={`${fontSize} mt-2 pt-2 border-t border-gray-600 text-orange-300`}>
                <div className="font-semibold mb-1">Special Playoff Rule:</div>
                <div>⭐ Team gets 6th seed as 3rd division winner, bypassing this cross-division tiebreaker</div>
              </div>
            )}
          </div>
        ))}

        {/* Tooltip arrow */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900/75 dark:bg-gray-800/75 transform rotate-45"></div>
      </div>
    </div>
  );
};
