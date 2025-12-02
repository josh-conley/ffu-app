import { Info, Star, X } from 'lucide-react';
import { useState } from 'react';
import type { TiebreakerInfo } from '../../utils/ranking';

interface StandingsTooltipProps {
  tiebreakerInfo: TiebreakerInfo;
  size?: 'sm' | 'md';
}

/**
 * Displays a clickable popup with standings information
 * Shows head-to-head records and indicates whether Points For is being used as tiebreaker
 */
export const StandingsTooltip = ({ tiebreakerInfo, size = 'md' }: StandingsTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Get context label for a layer
  const getContextLabel = (layer: any, layerIdx: number, totalLayers: number) => {
    // If this is a division layer with bumped leader AND there are 2 layers, show step 1
    if (layer.context === 'division-leaders' && layer.hasBumpedThirdLeader && totalLayers === 2) {
      return 'Division Leaders';
    }

    // If this is the second layer after a division layer, show step 2
    if (layerIdx === 1 && totalLayers === 2) {
      return 'Cross-Division Ranking';
    }

    switch (layer.context) {
      case 'division-leaders':
        return 'Division Leaders';
      case 'wild-card':
        return 'Seeds 3-12';
      default:
        return 'Tiebreaker';
    }
  };

  return (
    <>
      {/* Clickable Info Icon */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 transition-colors"
        aria-label="Show tiebreaker information"
      >
        <Info className={`${iconSize} text-gray-600 dark:text-gray-300 cursor-pointer`} />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-gray-900 dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 dark:bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div className="font-bold text-white">Tiebreakers</div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 py-3 text-white">

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
                    className={`${fontSize} flex justify-between gap-3 ${team.isCurrentTeam ? 'font-bold' : ''} text-gray-200`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="text-gray-400 font-semibold flex-shrink-0">#{team.rank}</span>
                      <span className="truncate">{team.teamName}</span>
                      {team.isBumpedThirdLeader && (
                        <Star className="h-3 w-3 text-gray-400 flex-shrink-0" fill="currentColor" />
                      )}
                    </span>
                    <span className="whitespace-nowrap">
                      {team.h2hRecord} ({(team.h2hWinPct * 100).toFixed(0)}%) • {team.pointsFor.toFixed(2)} PF
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
                <div className="font-semibold mb-1">⭐ Division Winner</div>
                <div>This team won the division via H2H tiebreaker</div>
              </div>
            )}

            {layer.hasBumpedThirdLeader && layer.context === 'wild-card' && (
              <div className={`${fontSize} mt-2 pt-2 border-t border-gray-600 text-orange-300`}>
                <div className="font-semibold mb-1">⭐ Special Playoff Rule:</div>
                <div>3rd division winner is guaranteed a playoff spot (top 6), but exact seed determined by tiebreakers</div>
              </div>
            )}
          </div>
        ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
