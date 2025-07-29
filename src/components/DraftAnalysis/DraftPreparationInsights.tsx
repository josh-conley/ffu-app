import React from 'react';
import { type DrafterProfile, type ComprehensiveLeagueTrends } from '../../services/draftAnalysis.service';
import { TrendingUp, Target, AlertCircle, Lightbulb } from 'lucide-react';

interface DraftPreparationInsightsProps {
  drafterProfiles: DrafterProfile[];
  leagueTrends: ComprehensiveLeagueTrends[];
  selectedLeague?: string;
}

export const DraftPreparationInsights: React.FC<DraftPreparationInsightsProps> = ({
  drafterProfiles,
  leagueTrends,
  selectedLeague = 'all'
}) => {
  // Filter trends by selected league if specified
  const relevantTrends = selectedLeague === 'all' 
    ? leagueTrends 
    : leagueTrends.filter(trend => trend.league === selectedLeague);

  // Calculate league-wide insights
  const calculateLeagueInsights = () => {
    if (relevantTrends.length === 0) return null;

    const mostRecentTrends = relevantTrends.filter(trend => trend.year === '2024');
    const positionADPs: Record<string, number[]> = {};
    
    mostRecentTrends.forEach(trend => {
      Object.entries(trend.positionADP).forEach(([position, picks]) => {
        if (!positionADPs[position]) positionADPs[position] = [];
        positionADPs[position].push(...picks);
      });
    });

    const insights = Object.entries(positionADPs).map(([position, picks]) => {
      const avgADP = picks.reduce((sum, pick) => sum + pick, 0) / picks.length;
      const earliestPick = Math.min(...picks);
      const latestPick = Math.max(...picks);
      
      return {
        position,
        avgADP,
        earliestPick,
        latestPick,
        pickCount: picks.length,
        scarcityScore: earliestPick // Earlier picks indicate higher scarcity
      };
    }).sort((a, b) => a.avgADP - b.avgADP);

    return insights;
  };

  // Identify most predictable drafters
  const getPredictableDrafters = () => {
    return drafterProfiles
      .filter(profile => profile.drafts.length >= 3)
      .sort((a, b) => b.consistencyMetrics.overallConsistencyScore - a.consistencyMetrics.overallConsistencyScore)
      .slice(0, 5);
  };

  // Identify least predictable drafters  
  const getUnpredictableDrafters = () => {
    return drafterProfiles
      .filter(profile => profile.drafts.length >= 3)
      .sort((a, b) => a.consistencyMetrics.overallConsistencyScore - b.consistencyMetrics.overallConsistencyScore)
      .slice(0, 5);
  };

  // Generate strategic recommendations
  const generateRecommendations = () => {
    const insights = calculateLeagueInsights();
    if (!insights) return [];

    const recommendations = [];

    // QB strategy recommendation
    const qbInsight = insights.find(i => i.position === 'QB');
    if (qbInsight) {
      if (qbInsight.avgADP > 50) {
        recommendations.push({
          type: 'strategy',
          title: 'Late QB Strategy Viable',
          description: `QBs are typically drafted after pick ${qbInsight.avgADP.toFixed(0)}. Consider waiting until later rounds.`,
          icon: Target,
          color: 'blue'
        });
      } else if (qbInsight.avgADP < 25) {
        recommendations.push({
          type: 'strategy',
          title: 'Early QB Competition',
          description: `QBs go early (avg pick ${qbInsight.avgADP.toFixed(0)}). Plan accordingly if you want top-tier QB.`,
          icon: AlertCircle,
          color: 'red'
        });
      }
    }

    // RB scarcity analysis
    const rbInsight = insights.find(i => i.position === 'RB');
    if (rbInsight && rbInsight.scarcityScore < 15) {
      recommendations.push({
        type: 'positional',
        title: 'RB Scarcity Alert',
        description: `RBs disappear quickly (earliest: pick ${rbInsight.earliestPick}). Prioritize early rounds.`,
        icon: AlertCircle,
        color: 'orange'
      });
    }

    // WR depth analysis
    const wrInsight = insights.find(i => i.position === 'WR');
    if (wrInsight && wrInsight.latestPick > 100) {
      recommendations.push({
        type: 'positional',
        title: 'WR Depth Available',
        description: `WRs drafted as late as pick ${wrInsight.latestPick}. Depth available in later rounds.`,
        icon: TrendingUp,
        color: 'green'
      });
    }

    return recommendations;
  };

  const leagueInsights = calculateLeagueInsights();
  const predictableDrafters = getPredictableDrafters();
  const unpredictableDrafters = getUnpredictableDrafters();
  const recommendations = generateRecommendations();

  return (
    <div className="space-y-8">
      {/* Strategic Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            2025 Draft Strategy Recommendations
          </h3>
        </div>
        
        {recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((rec, index) => {
              const IconComponent = rec.icon;
              const colorClasses = {
                blue: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
                red: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
                orange: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200',
                green: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
              };
              
              return (
                <div key={index} className={`p-4 border rounded-lg ${colorClasses[rec.color as keyof typeof colorClasses]}`}>
                  <div className="flex items-start space-x-3">
                    <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">{rec.title}</h4>
                      <p className="text-sm opacity-90">{rec.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            Select a specific league to see targeted recommendations for your 2025 draft.
          </p>
        )}
      </div>

      {/* Position Analysis */}
      {leagueInsights && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            2024 Position Analysis (Latest Data)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagueInsights.map((insight) => (
              <div key={insight.position} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider angular-cut-small pos-${insight.position.toLowerCase()}-badge`}>
                    {insight.position}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {insight.pickCount} picks
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg ADP:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {insight.avgADP.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Range:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {insight.earliestPick}-{insight.latestPick}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Scarcity:</span>
                    <span className={`text-sm font-medium ${
                      insight.scarcityScore < 20 ? 'text-red-600 dark:text-red-400' :
                      insight.scarcityScore < 50 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {insight.scarcityScore < 20 ? 'High' : insight.scarcityScore < 50 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drafter Predictability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Predictable */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Most Predictable Drafters
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            These drafters follow consistent patterns - easier to predict their moves.
          </p>
          <div className="space-y-3">
            {predictableDrafters.map((drafter) => (
              <div key={drafter.userId} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {drafter.userInfo.teamName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Favorite: {drafter.rosterConstruction.mostCommonConstruction}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600 dark:text-green-400">
                    {drafter.consistencyMetrics.overallConsistencyScore.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">consistent</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Least Predictable */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Wildcard Drafters
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            These drafters change strategies frequently - expect the unexpected.
          </p>
          <div className="space-y-3">
            {unpredictableDrafters.map((drafter) => (
              <div key={drafter.userId} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {drafter.userInfo.teamName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Strategies vary by year
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {drafter.consistencyMetrics.overallConsistencyScore.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">consistent</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Draft Day Tips */}
      <div className="bg-gradient-to-r from-ffu-red/5 to-blue-500/5 border border-ffu-red/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Draft Day Preparation Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Before the Draft
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Review individual drafter profiles for your league mates</li>
              <li>• Study position scarcity patterns from recent years</li>
              <li>• Prepare multiple draft strategies based on your position</li>
              <li>• Identify potential trade partners based on their tendencies</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              During the Draft
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Watch for position runs - they happen predictably</li>
              <li>• Target consistent drafters for potential trades</li>
              <li>• Pivot quickly when wildcard drafters disrupt patterns</li>
              <li>• Use league-specific ADP data, not generic rankings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};