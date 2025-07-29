import React, { useState } from 'react';
import { type ComprehensiveLeagueTrends } from '../../services/draftAnalysis.service';

interface LeagueTrendsChartsProps {
  trends: ComprehensiveLeagueTrends[];
}

export const LeagueTrendsCharts: React.FC<LeagueTrendsChartsProps> = ({ trends }) => {
  const [showFullDraft, setShowFullDraft] = useState(false);

  if (trends.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No trend data available for the selected filters.
      </div>
    );
  }

  // Calculate position ADP averages across selected trends
  const calculatePositionADP = () => {
    const positionADPs: Record<string, { total: number; count: number; picks: number[] }> = {};
    
    trends.forEach(trend => {
      Object.entries(trend.positionADP).forEach(([position, picks]) => {
        if (!positionADPs[position]) {
          positionADPs[position] = { total: 0, count: 0, picks: [] };
        }
        positionADPs[position].picks.push(...picks);
        positionADPs[position].total += picks.reduce((sum, pick) => sum + pick, 0);
        positionADPs[position].count += picks.length;
      });
    });

    return Object.entries(positionADPs)
      .map(([position, data]) => ({
        position,
        averageADP: data.count > 0 ? data.total / data.count : 0,
        totalPicks: data.count,
        earliestPick: Math.min(...data.picks),
        latestPick: Math.max(...data.picks)
      }))
      .filter(item => item.totalPicks > 0)
      .sort((a, b) => a.averageADP - b.averageADP);
  };

  // Calculate round trends (early rounds 1-6 or full draft)
  const calculateRoundTrends = (useFullDraft = false) => {
    const roundData: Record<number, Record<string, number>> = {};
    
    trends.forEach(trend => {
      const trendsToUse = useFullDraft ? trend.fullDraftTrends : trend.earlyRoundFocus;
      trendsToUse.forEach(roundTrend => {
        if (!roundData[roundTrend.round]) {
          roundData[roundTrend.round] = {};
        }
        
        Object.entries(roundTrend.positionDistribution).forEach(([position, percentage]) => {
          if (!roundData[roundTrend.round][position]) {
            roundData[roundTrend.round][position] = 0;
          }
          roundData[roundTrend.round][position] += percentage;
        });
      });
    });

    // Average the percentages across leagues/years
    const numTrends = trends.length;
    Object.keys(roundData).forEach(round => {
      const roundNum = parseInt(round);
      Object.keys(roundData[roundNum]).forEach(position => {
        roundData[roundNum][position] /= numTrends;
      });
    });

    return roundData;
  };

  // Identify most common position runs
  const getPositionRuns = () => {
    const allRuns: Array<{ position: string; length: number; round: number; league: string; year: string }> = [];
    
    trends.forEach(trend => {
      trend.positionRuns.forEach(run => {
        allRuns.push({
          position: run.position,
          length: run.pickCount,
          round: run.round,
          league: trend.league,
          year: trend.year
        });
      });
    });

    // Group by position and calculate averages
    const runsByPosition: Record<string, { runs: number[]; totalRuns: number }> = {};
    allRuns.forEach(run => {
      if (!runsByPosition[run.position]) {
        runsByPosition[run.position] = { runs: [], totalRuns: 0 };
      }
      runsByPosition[run.position].runs.push(run.length);
      runsByPosition[run.position].totalRuns++;
    });

    return Object.entries(runsByPosition)
      .map(([position, data]) => ({
        position,
        averageRunLength: data.runs.reduce((sum, len) => sum + len, 0) / data.runs.length,
        maxRunLength: Math.max(...data.runs),
        totalRuns: data.totalRuns,
        frequency: data.totalRuns / trends.length // Runs per draft on average
      }))
      .sort((a, b) => b.frequency - a.frequency);
  };

  const positionADPs = calculatePositionADP();
  const roundTrends = calculateRoundTrends(showFullDraft);
  const positionRuns = getPositionRuns();


  return (
    <div className="space-y-8">
      {/* Position ADP Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Average Draft Position by Position
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {positionADPs.map((item) => (
            <div key={item.position} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider angular-cut-small pos-${item.position.toLowerCase()}-badge`}>
                  {item.position}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.totalPicks} picks
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg ADP:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.averageADP.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Range:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.earliestPick} - {item.latestPick}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Round Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Round-by-Round Position Distribution
          </h3>
          <div className="flex items-center space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showFullDraft}
                onChange={(e) => setShowFullDraft(e.target.checked)}
                className="mr-2 h-4 w-4 text-ffu-red focus:ring-ffu-red border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show Full Draft
              </span>
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {showFullDraft ? 'All Rounds' : 'Early Rounds (1-6)'}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Round</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">QB</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">RB</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">WR</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">TE</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Other</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(roundTrends)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([round, positions]) => (
                  <tr key={round} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Round {round}
                    </td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">
                      {(positions['QB'] || 0).toFixed(0)}%
                    </td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">
                      {(positions['RB'] || 0).toFixed(0)}%
                    </td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">
                      {(positions['WR'] || 0).toFixed(0)}%
                    </td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">
                      {(positions['TE'] || 0).toFixed(0)}%
                    </td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">
                      {(Object.entries(positions)
                        .filter(([pos]) => !['QB', 'RB', 'WR', 'TE'].includes(pos))
                        .reduce((sum, [, pct]) => sum + pct, 0)
                      ).toFixed(0)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Position Runs Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Position Run Analysis
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Analysis of consecutive picks of the same position (3+ picks in a row).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {positionRuns.slice(0, 6).map((run) => (
            <div key={run.position} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider angular-cut-small pos-${run.position.toLowerCase()}-badge`}>
                  {run.position}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {run.totalRuns} total runs
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Frequency:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {run.frequency.toFixed(1)} runs/draft
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg Length:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {run.averageRunLength.toFixed(1)} picks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Max Run:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {run.maxRunLength} picks
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Year-over-Year Comparison */}
      {trends.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Year-over-Year Comparison
          </h3>
          <div className="space-y-4">
            {trends
              .sort((a, b) => b.year.localeCompare(a.year))
              .map((trend) => (
                <div key={`${trend.year}-${trend.league}`} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {trend.year}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        trend.league === 'PREMIER' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        trend.league === 'MASTERS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {trend.league}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {trend.positionRuns.length} position runs
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(trend.positionADP)
                      .slice(0, 4)
                      .map(([position, picks]) => {
                        const avgADP = picks.reduce((sum, pick) => sum + pick, 0) / picks.length;
                        return (
                          <div key={position} className="text-center">
                            <span className={`px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider angular-cut-small pos-${position.toLowerCase()}-badge`}>
                              {position}
                            </span>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              ADP {avgADP.toFixed(1)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};