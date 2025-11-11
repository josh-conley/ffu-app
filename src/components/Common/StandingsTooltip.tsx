import { Info } from 'lucide-react';
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
  const getContextLabel = (context: 'division-leaders' | 'wild-card') => {
    switch (context) {
      case 'division-leaders':
        return 'Top 2 Seeds';
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
            <div className="font-semibold text-yellow-400 mb-1">{getContextLabel(layer.context)}</div>

            {layer.h2hRecords.length > 0 && (
              <div className="space-y-1 mb-2">
                {layer.h2hRecords.map((record, idx) => (
                  <div key={idx} className={fontSize}>{record}</div>
                ))}
              </div>
            )}

            {layer.usesPointsFor && (
              <div className={fontSize}>
                {layer.h2hRecords.length > 0 && '(H2H tied) '}
                Using Points For {layer.pointsFor ? `(${layer.pointsFor.toFixed(2)})` : ''}
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
