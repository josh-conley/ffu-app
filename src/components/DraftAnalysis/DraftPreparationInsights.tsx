import React from 'react';
import { type DrafterProfile } from '../../services/draftAnalysis.service';
import { TrendingUp, Target } from 'lucide-react';

interface DraftPreparationInsightsProps {
  drafterProfiles: DrafterProfile[];
}

export const DraftPreparationInsights: React.FC<DraftPreparationInsightsProps> = ({
  drafterProfiles
}) => {

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

  const predictableDrafters = getPredictableDrafters();
  const unpredictableDrafters = getUnpredictableDrafters();

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Member Predictability Analysis
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Understanding how consistent each member is with their draft strategy helps you predict their moves and plan accordingly.
        </p>
      </div>

      {/* Drafter Predictability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Predictable */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Most Consistent Members
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            These members follow consistent patterns - easier to predict their moves.
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
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Wildcard Members
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            These members change strategies frequently - expect the unexpected.
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

      {/* Strategy Tips */}
      <div className="bg-gradient-to-r from-ffu-red/5 to-blue-500/5 border border-ffu-red/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          How to Use This Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Consistent Members
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Review their individual analysis to predict their picks</li>
              <li>• They're good trade partners - you can anticipate their needs</li>
              <li>• Plan around their typical position timing</li>
              <li>• Less likely to make surprising picks that disrupt your strategy</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Wildcard Members
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Stay flexible when they're picking near you</li>
              <li>• Don't bank on them following typical patterns</li>
              <li>• They might create unexpected value opportunities</li>
              <li>• Consider multiple backup plans when they're on the clock</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};