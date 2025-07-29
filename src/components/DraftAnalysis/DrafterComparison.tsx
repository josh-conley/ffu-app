import React, { useState } from 'react';
import { draftAnalysisService, type DrafterProfile } from '../../services/draftAnalysis.service';
import { Users as UsersIcon } from 'lucide-react';

interface DrafterComparisonProps {
  drafterProfiles: DrafterProfile[];
}

export const DrafterComparison: React.FC<DrafterComparisonProps> = ({ drafterProfiles }) => {
  const [selectedDrafters, setSelectedDrafters] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<{
    comparison: Record<string, DrafterProfile>;
    similarities: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDrafterToggle = (userId: string) => {
    setSelectedDrafters(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else if (prev.length < 4) { // Limit to 4 drafters for comparison
        return [...prev, userId];
      }
      return prev;
    });
  };

  const runComparison = async () => {
    if (selectedDrafters.length < 2) return;
    
    setIsLoading(true);
    try {
      const data = await draftAnalysisService.compareDrafters(selectedDrafters);
      setComparisonData(data);
    } catch (error) {
      console.error('Failed to run comparison:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 80) return 'text-green-600 dark:text-green-400';
    if (similarity >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConsistencyColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-8">
      {/* Drafter Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Select Drafters to Compare
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Choose 2-4 drafters to analyze their similarities and differences in draft strategy.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {drafterProfiles
            .filter(profile => profile.drafts.length >= 2) // Only show drafters with at least 2 drafts
            .sort((a, b) => a.userInfo.teamName.localeCompare(b.userInfo.teamName))
            .map((profile) => (
              <label
                key={profile.userId}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedDrafters.includes(profile.userId)
                    ? 'border-ffu-red bg-ffu-red/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDrafters.includes(profile.userId)}
                  onChange={() => handleDrafterToggle(profile.userId)}
                  disabled={!selectedDrafters.includes(profile.userId) && selectedDrafters.length >= 4}
                  className="mr-3 h-4 w-4 text-ffu-red focus:ring-ffu-red border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {profile.userInfo.teamName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {profile.drafts.length} drafts • {profile.consistencyMetrics.overallConsistencyScore.toFixed(0)}% consistency
                  </div>
                </div>
              </label>
            ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Selected: {selectedDrafters.length}/4 drafters
          </span>
          <button
            onClick={runComparison}
            disabled={selectedDrafters.length < 2 || isLoading}
            className="px-4 py-2 bg-ffu-red text-white font-medium rounded-lg hover:bg-ffu-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Analyzing...' : 'Compare Drafters'}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <div className="space-y-6">
          {/* Similarity Matrix */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Drafter Similarity Matrix
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Similarity scores based on position timing and roster construction patterns (0-100).
            </p>
            
            <div className="space-y-3">
              {Object.entries(comparisonData.similarities).map(([pairKey, similarity]) => {
                const [user1, user2] = pairKey.split('-');
                const drafter1 = comparisonData.comparison[user1];
                const drafter2 = comparisonData.comparison[user2];
                
                if (!drafter1 || !drafter2) return null;
                
                return (
                  <div key={pairKey} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <UsersIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {drafter1.userInfo.teamName} vs {drafter2.userInfo.teamName}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${getSimilarityColor(similarity)}`}>
                      {similarity.toFixed(0)}% similar
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Detailed Comparison
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Metric</th>
                    {Object.values(comparisonData.comparison).map((drafter) => (
                      <th key={drafter.userId} className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">
                        <div className="text-sm">{drafter.userInfo.teamName}</div>
                        <div className="text-xs text-gray-500">{drafter.userInfo.abbreviation}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Total Drafts */}
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Total Drafts
                    </td>
                    {Object.values(comparisonData.comparison).map((drafter) => (
                      <td key={drafter.userId} className="py-2 px-4 text-gray-600 dark:text-gray-400">
                        {drafter.drafts.length}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Consistency Score */}
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Consistency Score
                    </td>
                    {Object.values(comparisonData.comparison).map((drafter) => (
                      <td key={drafter.userId} className="py-2 px-4">
                        <span className={`font-medium ${getConsistencyColor(drafter.consistencyMetrics.overallConsistencyScore)}`}>
                          {drafter.consistencyMetrics.overallConsistencyScore.toFixed(0)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                  
                  {/* Position Timing */}
                  {['QB', 'RB', 'WR', 'TE'].map((position) => (
                    <tr key={position} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider angular-cut-small pos-${position.toLowerCase()}-badge`}>
                          {position}
                        </span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Avg Round</span>
                      </td>
                      {Object.values(comparisonData.comparison).map((drafter) => (
                        <td key={drafter.userId} className="py-2 px-4 text-gray-600 dark:text-gray-400">
                          {drafter.positionTiming.averageFirstPick[position] 
                            ? `R${drafter.positionTiming.averageFirstPick[position].toFixed(1)}`
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {/* Most Common Build */}
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Favorite Build
                    </td>
                    {Object.values(comparisonData.comparison).map((drafter) => (
                      <td key={drafter.userId} className="py-2 px-4 text-gray-600 dark:text-gray-400 font-mono text-sm">
                        {drafter.rosterConstruction.mostCommonConstruction}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategy Evolution Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Strategy Evolution Comparison
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.values(comparisonData.comparison).map((drafter) => (
                <div key={drafter.userId} className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {drafter.userInfo.teamName}
                  </h4>
                  <div className="space-y-2">
                    {drafter.consistencyMetrics.strategyEvolution
                      .sort((a, b) => b.year.localeCompare(a.year))
                      .map((evolution, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {evolution.year}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                            {evolution.strategy.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};