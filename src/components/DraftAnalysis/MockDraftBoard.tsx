import React, { useState, useEffect } from 'react';
import { mockDraftService, type MockDraftState, type MockDraftPlayer, type MockDraftPick } from '../../services/mockDraft.service';
import { Play, Pause, RotateCcw, Download, Zap, Clock } from 'lucide-react';

interface MockDraftBoardProps {
  draftOrder?: string[];
}

export const MockDraftBoard: React.FC<MockDraftBoardProps> = ({ draftOrder }) => {
  const [draftState, setDraftState] = useState<MockDraftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoPickMode, setIsAutoPickMode] = useState(false);
  const [autoPickSpeed, setAutoPickSpeed] = useState(2000); // ms between picks
  const [availablePlayers, setAvailablePlayers] = useState<MockDraftPlayer[]>([]);
  const [positionFilter, setPositionFilter] = useState<string>('ALL');

  useEffect(() => {
    initializeDraft();
  }, [draftOrder]);

  useEffect(() => {
    if (draftState) {
      // Filter available players by position
      const filtered = positionFilter === 'ALL' 
        ? draftState.playerPool.slice(0, 50) // Show top 50 for performance
        : draftState.playerPool.filter(p => p.position === positionFilter).slice(0, 20);
      setAvailablePlayers(filtered);
    }
  }, [draftState, positionFilter]);

  useEffect(() => {
    let interval: number;
    
    if (isAutoPickMode && draftState && !draftState.isComplete) {
      interval = window.setInterval(async () => {
        setDraftState(prevState => {
          if (!prevState || prevState.isComplete) return prevState;
          
          // Handle async autoPickForCurrentUser
          mockDraftService.autoPickForCurrentUser(prevState).then(newState => {
            setDraftState(newState);
          }).catch(error => {
            console.error('Auto pick failed:', error);
          });
          
          return prevState; // Return current state while waiting for async operation
        });
      }, autoPickSpeed);
    }
    
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isAutoPickMode, autoPickSpeed, draftState?.currentPick]);

  const initializeDraft = async () => {
    setIsLoading(true);
    try {
      const newDraftState = await mockDraftService.initializeMockDraft(draftOrder);
      setDraftState(newDraftState);
    } catch (error) {
      console.error('Failed to initialize mock draft:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualPick = (player: MockDraftPlayer) => {
    if (!draftState || draftState.isComplete) return;
    
    const newState = mockDraftService.makePick(draftState, player.playerId, false);
    setDraftState(newState);
  };

  const handleAutoPick = async () => {
    if (!draftState || draftState.isComplete) return;
    
    try {
      const newState = await mockDraftService.autoPickForCurrentUser(draftState);
      setDraftState(newState);
    } catch (error) {
      console.error('Auto pick failed:', error);
    }
  };

  const resetDraft = () => {
    setIsAutoPickMode(false);
    initializeDraft();
  };

  const exportDraft = () => {
    if (!draftState) return;
    
    const results = mockDraftService.getDraftResults(draftState);
    const csvContent = generateCSV(results);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mock-draft-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const generateCSV = (results: Record<string, MockDraftPick[]>): string => {
    if (!draftState) return '';
    
    const headers = ['Round', ...draftState.members.map(m => m.teamName)];
    const rows = [headers.join(',')];
    
    for (let round = 1; round <= draftState.settings.rounds; round++) {
      const roundRow: string[] = [`Round ${round}`];
      
      draftState.members.forEach(member => {
        const pick = results[member.userId]?.find(p => p.round === round);
        const playerName = pick?.player?.fullName || '';
        const position = pick?.player?.position || '';
        roundRow.push(`"${playerName} (${position})"`);
      });
      
      rows.push(roundRow.join(','));
    }
    
    return rows.join('\n');
  };

  const getCurrentPickingMember = () => {
    if (!draftState || draftState.isComplete) return null;
    
    const round = Math.ceil(draftState.currentPick / draftState.settings.teams);
    const pickInRound = ((draftState.currentPick - 1) % draftState.settings.teams) + 1;
    const actualPosition = round % 2 === 1 ? pickInRound : draftState.settings.teams - pickInRound + 1;
    
    return draftState.members[actualPosition - 1];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ffu-red"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading mock draft...</span>
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="text-center p-8 text-gray-600 dark:text-gray-300">
        Failed to load mock draft. Please try again.
      </div>
    );
  }

  const currentPickingMember = getCurrentPickingMember();
  const draftGrid: (MockDraftPick | null)[][] = [];
  
  // Initialize grid
  for (let round = 0; round < draftState.settings.rounds; round++) {
    draftGrid[round] = new Array(draftState.settings.teams).fill(null);
  }
  
  // Fill in the picks
  draftState.picks.forEach(pick => {
    if (pick.player) {
      const roundIndex = pick.round - 1;
      const memberIndex = draftState.members.findIndex(m => m.userId === pick.userId);
      if (roundIndex >= 0 && memberIndex >= 0) {
        draftGrid[roundIndex][memberIndex] = pick;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Mock Draft Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            2025 Premier League Mock Draft
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Pick {draftState.currentPick} of 180 (15 rounds × 12 teams)
            </span>
            {draftState.isComplete && (
              <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm font-medium rounded-full">
                Complete
              </span>
            )}
          </div>
        </div>

        {currentPickingMember && (
          <div className="mb-4 p-4 bg-ffu-red/10 border border-ffu-red/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Now Picking: {currentPickingMember.teamName}
                </span>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  (Pick {draftState.currentPick})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAutoPick}
                  disabled={draftState.isComplete}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 inline mr-1" />
                  Auto Pick
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsAutoPickMode(!isAutoPickMode)}
              disabled={draftState.isComplete}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                isAutoPickMode
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              } disabled:opacity-50`}
            >
              {isAutoPickMode ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Auto
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Auto Draft
                </>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <select
                value={autoPickSpeed}
                onChange={(e) => setAutoPickSpeed(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
              >
                <option value={500}>Fast (0.5s)</option>
                <option value={1000}>Medium (1s)</option>
                <option value={2000}>Slow (2s)</option>
                <option value={3000}>Very Slow (3s)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={resetDraft}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
            <button
              onClick={exportDraft}
              className="flex items-center px-4 py-2 bg-ffu-red text-white rounded-lg hover:bg-ffu-red/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Draft Board */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Draft Board</h3>
            
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Team Headers */}
                <div className="grid grid-cols-12 gap-1 mb-2">
                  {draftState.members.map((member, index) => (
                    <div key={member.userId} className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-center">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {member.teamName}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Draft Picks */}
                <div className="space-y-1">
                  {draftGrid.map((round, roundIndex) => (
                    <div key={roundIndex} className="grid grid-cols-12 gap-1">
                      {round.map((pick, memberIndex) => (
                        <div
                          key={memberIndex}
                          className={`p-2 border border-gray-200 dark:border-gray-600 rounded min-h-[60px] text-center ${
                            pick 
                              ? 'bg-white dark:bg-gray-800' 
                              : 'bg-gray-50 dark:bg-gray-700'
                          }`}
                        >
                          {pick?.player ? (
                            <>
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                {pick.player.fullName}
                              </div>
                              <div className={`text-xs px-1 py-0.5 rounded mt-1 pos-${pick.player.position.toLowerCase()}-badge`}>
                                {pick.player.position}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {pick.player.team}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-400">
                              R{roundIndex + 1}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Players */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Available Players</h3>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
              >
                <option value="ALL">All</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DEF">DEF</option>
              </select>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availablePlayers.map((player) => (
                <div
                  key={player.playerId}
                  onClick={() => !draftState.isComplete && handleManualPick(player)}
                  className={`p-3 border border-gray-200 dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    draftState.isComplete ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {player.fullName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {player.team} • ADP: {player.adpRank}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider angular-cut-small pos-${player.position.toLowerCase()}-badge`}>
                      {player.position}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};