import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { LeagueTrendsCharts } from './LeagueTrendsCharts';
import { DrafterComparison } from './DrafterComparison';
import { DraftPreparationInsights } from './DraftPreparationInsights';
import { draftAnalysisService, type DrafterProfile, type ComprehensiveLeagueTrends } from '../../services/draftAnalysis.service';
import { ChevronDown, TrendingUp, Target, Calendar, Users, Lightbulb } from 'lucide-react';

type AnalysisView = 'individual' | 'trends' | 'comparison' | 'preparation';

export const DraftTrendsAnalysis: React.FC = () => {
  const [drafterProfiles, setDrafterProfiles] = useState<DrafterProfile[]>([]);
  const [leagueTrends, setLeagueTrends] = useState<ComprehensiveLeagueTrends[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  
  const [activeView, setActiveView] = useState<AnalysisView>('individual');
  const [selectedDrafter, setSelectedDrafter] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      
      const [profiles, trends] = await Promise.all([
        draftAnalysisService.generateDrafterProfiles(),
        draftAnalysisService.generateLeagueTrends()
      ]);
      
      setDrafterProfiles(profiles);
      setLeagueTrends(trends);
      
      // Set default selected drafter to first one with data
      if (profiles.length > 0 && !selectedDrafter) {
        setSelectedDrafter(profiles[0].userId);
      }
    } catch (err) {
      console.error('Failed to load draft analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis data');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedDrafterProfile = (): DrafterProfile | undefined => {
    return drafterProfiles.find(profile => profile.userId === selectedDrafter);
  };

  const getFilteredTrends = (): ComprehensiveLeagueTrends[] => {
    return leagueTrends.filter(trend => {
      const yearMatch = selectedYear === 'all' || trend.year === selectedYear;
      const leagueMatch = selectedLeague === 'all' || trend.league === selectedLeague;
      return yearMatch && leagueMatch;
    });
  };

  const getYearsFromProfiles = (): string[] => {
    const years = new Set<string>();
    drafterProfiles.forEach(profile => {
      profile.drafts.forEach(draft => years.add(draft.year));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  };

  const getLeaguesFromProfiles = (): string[] => {
    const leagues = new Set<string>();
    drafterProfiles.forEach(profile => {
      profile.drafts.forEach(draft => leagues.add(draft.league));
    });
    return Array.from(leagues).sort();
  };


  const getConsistencyColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStrategyLabel = (strategy: string): string => {
    const labels: Record<string, string> = {
      'RB_HEAVY': 'RB Heavy',
      'WR_HEAVY': 'WR Heavy', 
      'BALANCED': 'Balanced',
      'ZERO_RB': 'Zero RB',
      'HERO_RB': 'Hero RB',
      'LATE_QB': 'Late QB',
      'EARLY_QB': 'Early QB'
    };
    return labels[strategy] || strategy;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Analyzing draft data across all leagues and years...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error Loading Analysis
          </h3>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          FFU Draft Trends Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Comprehensive analysis of drafting patterns and habits across all FFU leagues and years.
          Discover trends, predict behavior, and prepare for the 2025 draft.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveView('individual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeView === 'individual'
                  ? 'border-ffu-red text-ffu-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Individual Analysis
            </button>
            <button
              onClick={() => setActiveView('trends')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeView === 'trends'
                  ? 'border-ffu-red text-ffu-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              League Trends
            </button>
            <button
              onClick={() => setActiveView('comparison')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeView === 'comparison'
                  ? 'border-ffu-red text-ffu-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Drafter Comparison
            </button>
            <button
              onClick={() => setActiveView('preparation')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeView === 'preparation'
                  ? 'border-ffu-red text-ffu-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Lightbulb className="w-4 h-4 inline mr-2" />
              2025 Prep
            </button>
          </nav>
        </div>
      </div>

      {/* Individual Analysis View */}
      {activeView === 'individual' && (
        <div className="space-y-8">
          {/* Drafter Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Select Drafter for Analysis
            </h2>
            <div className="relative max-w-md">
              <select
                value={selectedDrafter}
                onChange={(e) => setSelectedDrafter(e.target.value)}
                className="block w-full pl-4 pr-12 py-3 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red rounded-lg appearance-none"
              >
                <option value="">Choose a drafter...</option>
                {drafterProfiles
                  .sort((a, b) => a.userInfo.teamName.localeCompare(b.userInfo.teamName))
                  .map((profile) => (
                    <option key={profile.userId} value={profile.userId}>
                      {profile.userInfo.teamName} ({profile.drafts.length} drafts)
                    </option>
                  ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Individual Drafter Analysis */}
          {selectedDrafter && getSelectedDrafterProfile() && (
            <div className="space-y-6">
              {(() => {
                const profile = getSelectedDrafterProfile()!;
                
                return (
                  <>
                    {/* Overview Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {profile.userInfo.teamName}
                        </h2>
                        <span className="px-3 py-1 bg-ffu-red text-white text-sm font-medium rounded-full">
                          {profile.userInfo.abbreviation}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {profile.drafts.length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Total Drafts
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {profile.consistencyMetrics.overallConsistencyScore.toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Consistency Score
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {profile.rosterConstruction.mostCommonConstruction}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Favorite Build
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Position Timing Analysis */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Position Timing Analysis
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Position</th>
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Avg Round</th>
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Consistency</th>
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Range</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map((position) => {
                              const avgRound = profile.positionTiming.averageFirstPick[position];
                              const consistency = profile.consistencyMetrics.positionConsistency[position] || 0;
                              const earliest = profile.positionTiming.earliestPick[position];
                              const latest = profile.positionTiming.latestPick[position];
                              
                              if (!avgRound) return null;
                              
                              return (
                                <tr key={position} className="border-b border-gray-100 dark:border-gray-700">
                                  <td className="py-2 px-4">
                                    <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider angular-cut-small pos-${position.toLowerCase()}-badge`}>
                                      {position}
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 text-gray-900 dark:text-gray-100">
                                    Round {avgRound.toFixed(1)}
                                  </td>
                                  <td className="py-2 px-4">
                                    <span className={`font-medium ${getConsistencyColor(consistency)}`}>
                                      {consistency.toFixed(0)}%
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 text-gray-600 dark:text-gray-400">
                                    R{earliest} - R{latest}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Strategy Evolution */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Draft Strategy Evolution
                      </h3>
                      <div className="space-y-3">
                        {profile.consistencyMetrics.strategyEvolution.map((evolution, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {evolution.year}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                                {getStrategyLabel(evolution.strategy)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {(evolution.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Roster Construction Patterns */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Roster Construction Patterns (First 10 Rounds)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                            Average by Position
                          </h4>
                          <div className="space-y-2">
                            {Object.entries(profile.rosterConstruction.averageByPosition)
                              .filter(([, avg]) => avg > 0)
                              .sort(([, a], [, b]) => b - a)
                              .map(([position, average]) => (
                                <div key={position} className="flex justify-between items-center">
                                  <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider angular-cut-small pos-${position.toLowerCase()}-badge`}>
                                    {position}
                                  </span>
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {average.toFixed(1)} players
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                            Common Patterns
                          </h4>
                          <div className="space-y-2">
                            {profile.rosterConstruction.rosterPatterns.slice(0, 5).map((pattern, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-gray-900 dark:text-gray-100 font-mono text-sm">
                                  {pattern.pattern}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {(pattern.frequency * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Draft History */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Draft History
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Year</th>
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">League</th>
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Draft Pos</th>
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Strategy</th>
                              <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-gray-100">Round 10 Build</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.drafts
                              .sort((a, b) => b.year.localeCompare(a.year))
                              .map((draft, index) => {
                                const strategy = profile.consistencyMetrics.strategyEvolution.find(
                                  s => s.year === draft.year
                                );
                                const positions = Object.entries(draft.rosterByRound10)
                                  .filter(([, count]) => count > 0)
                                  .map(([pos, count]) => `${count}${pos}`)
                                  .join('-');
                                
                                return (
                                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="py-2 px-4 text-gray-900 dark:text-gray-100 font-medium">
                                      {draft.year}
                                    </td>
                                    <td className="py-2 px-4">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        draft.league === 'PREMIER' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                        draft.league === 'MASTERS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      }`}>
                                        {draft.league}
                                      </span>
                                    </td>
                                    <td className="py-2 px-4 text-gray-900 dark:text-gray-100">
                                      {draft.draftPosition}
                                    </td>
                                    <td className="py-2 px-4">
                                      {strategy && (
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded">
                                          {getStrategyLabel(strategy.strategy)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400 font-mono text-sm">
                                      {positions || 'N/A'}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* League Trends View */}
      {activeView === 'trends' && (
        <div className="space-y-8">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Filter League Trends
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-ffu-red focus:border-ffu-red rounded-md"
                >
                  <option value="all">All Years</option>
                  {getYearsFromProfiles().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  League
                </label>
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-ffu-red focus:border-ffu-red rounded-md"
                >
                  <option value="all">All Leagues</option>
                  {getLeaguesFromProfiles().map(league => (
                    <option key={league} value={league}>{league}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Trends Visualization */}
          <LeagueTrendsCharts trends={getFilteredTrends()} />
        </div>
      )}

      {/* Comparison View */}
      {activeView === 'comparison' && (
        <DrafterComparison drafterProfiles={drafterProfiles} />
      )}

      {/* 2025 Preparation View */}
      {activeView === 'preparation' && (
        <DraftPreparationInsights 
          drafterProfiles={drafterProfiles}
          leagueTrends={leagueTrends}
          selectedLeague={selectedLeague}
        />
      )}
    </div>
  );
};