import React, { useState } from 'react';
import type { DraftData, DraftPick, UserInfo } from '../../types';
import { TeamLogo } from '../Common/TeamLogo';

interface DraftBoardProps {
  draftData: DraftData;
  userMap: Record<string, UserInfo>;
}

export const DraftBoard: React.FC<DraftBoardProps> = ({ draftData, userMap }) => {
  const { picks, settings } = draftData;
  const { teams, rounds } = settings;
  const [selectedTeamUserId, setSelectedTeamUserId] = useState<string | null>(null);

  // Create a grid of picks organized by round and team
  const draftGrid: (DraftPick | null)[][] = [];
  
  // Initialize grid
  for (let round = 0; round < rounds; round++) {
    draftGrid[round] = new Array(teams).fill(null);
  }

  // Fill in the picks
  picks.forEach(pick => {
    const roundIndex = pick.round - 1;
    const teamIndex = pick.draftSlot - 1;
    if (roundIndex >= 0 && roundIndex < rounds && teamIndex >= 0 && teamIndex < teams) {
      draftGrid[roundIndex][teamIndex] = pick;
    }
  });

  // Create team headers using draftOrder as source of truth
  const teamHeaders: Array<{
    slot: number;
    userId: string | undefined;
    teamName: string;
    abbreviation: string;
  }> = [];
  const draftOrder = draftData.draftOrder || {};
  
  for (let team = 1; team <= teams; team++) {
    // Find the userId that was assigned to this draft slot
    let userId = Object.keys(draftOrder).find(uid => draftOrder[uid] === team);
    let userInfo = userId ? userMap[userId] : null;
    
    // Handle missing draftOrder entries (e.g., mid-season replacements)
    // If no user found in draftOrder for this slot, look for picks with this draftSlot
    if (!userId) {
      const pickForSlot = picks.find(pick => pick.draftSlot === team);
      if (pickForSlot) {
        userId = pickForSlot.pickedBy;
        userInfo = userMap[userId];
      }
    }
    
    teamHeaders.push({
      slot: team,
      userId: userId,
      teamName: userInfo?.teamName || `Team ${team}`,
      abbreviation: userInfo?.abbreviation || `T${team}`
    });
  }

  const getPositionColor = (position: string): string => {
    switch (position.toLowerCase()) {
      case 'qb': return 'pos-qb-badge';
      case 'rb': return 'pos-rb-badge';
      case 'wr': return 'pos-wr-badge';
      case 'te': return 'pos-te-badge';
      case 'k': return 'pos-k-badge';
      case 'def': return 'pos-def-badge';
      default: return 'bg-gray-50 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400';
    }
  };

  const getPositionBackgroundColor = (position: string): string => {
    switch (position.toLowerCase()) {
      case 'qb': return 'pos-qb-cell';
      case 'rb': return 'pos-rb-cell';
      case 'wr': return 'pos-wr-cell';
      case 'te': return 'pos-te-cell';
      case 'k': return 'pos-k-cell';
      case 'def': return 'pos-def-cell';
      default: return 'bg-gray-25 dark:bg-gray-800/15';
    }
  };

  // Check if a pick was traded (pickedBy doesn't match the column's team)
  const isPickTraded = (pick: DraftPick, columnUserId: string | undefined): boolean => {
    return columnUserId ? pick.pickedBy !== columnUserId : false;
  };

  // Get the team info for who actually made the pick
  const getTradingTeamInfo = (pick: DraftPick): string => {
    const tradingUserInfo = userMap[pick.pickedBy];
    return tradingUserInfo?.abbreviation || tradingUserInfo?.teamName || 'UNK';
  };

  // Format player name to first initial + last name
  const formatPlayerName = (fullName: string): string => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) return fullName;
    
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    return `${firstName[0]}. ${lastName}`;
  };

  // Format pick number as round.pick (e.g., 1.01, 1.02) accounting for snake draft
  const formatPickNumber = (round: number, teamIndex: number): string => {
    let pickInRound;
    if (round % 2 === 1) {
      // Odd rounds: left to right (1, 2, 3, ...)
      pickInRound = teamIndex + 1;
    } else {
      // Even rounds: right to left (reverse order)
      pickInRound = teams - teamIndex;
    }
    return `${round}.${pickInRound.toString().padStart(2, '0')}`;
  };

  // Get the arrow direction for next pick in snake draft
  const getNextPickArrow = (round: number, teamIndex: number): string | null => {
    const currentRound = round;
    const totalPicks = rounds * teams;
    
    // Calculate overall pick number to see if this is the last pick
    let overallPickNumber;
    if (currentRound % 2 === 1) {
      // Odd rounds: left to right
      overallPickNumber = (currentRound - 1) * teams + (teamIndex + 1);
    } else {
      // Even rounds: right to left
      overallPickNumber = (currentRound - 1) * teams + (teams - teamIndex);
    }
    
    if (overallPickNumber >= totalPicks) return null; // Last pick
    
    if (currentRound % 2 === 1) {
      // Odd rounds: going left to right
      if (teamIndex < teams - 1) {
        return '→'; // Next pick is to the right
      } else {
        return '↓'; // End of row, next pick is below (and will go right to left)
      }
    } else {
      // Even rounds: going right to left
      if (teamIndex > 0) {
        return '←'; // Next pick is to the left
      } else {
        return '↓'; // End of row, next pick is below (and will go left to right)
      }
    }
  };

  // Calculate overall pick number based on snake draft order
  // const getOverallPickNumber = (round: number, position: number): number => {
  //   if (round % 2 === 1) {
  //     // Odd rounds: left to right (1, 2, 3, ...)
  //     return (round - 1) * teams + position;
  //   } else {
  //     // Even rounds: right to left (reverse order)
  //     return (round - 1) * teams + (teams - position + 1);
  //   }
  // };

  // Get the arrow direction for next pick
  // const getNextPickArrow = (round: number, position: number): string | null => {
  //   const currentOverall = getOverallPickNumber(round, position);
  //   const totalPicks = rounds * teams;
    
  //   if (currentOverall >= totalPicks) return null; // Last pick
    
  //   if (round % 2 === 1) {
  //     // Odd rounds: going left to right
  //     if (position < teams) {
  //       return '→'; // Next pick is to the right
  //     } else {
  //       return '↓'; // End of row, next pick is below
  //     }
  //   } else {
  //     // Even rounds: going right to left
  //     if (position > 1) {
  //       return '←'; // Next pick is to the left
  //     } else {
  //       return '↓'; // End of row, next pick is below
  //     }
  //   }
  // };

  // Calculate column width for equal distribution
  const columnWidth = `${100 / teams}%`;

  return (
    <div className="w-full" onClick={() => setSelectedTeamUserId(null)}>
      {/* Header Section */}
      <div className="mb-6 px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {draftData.metadata.name} - {draftData.year}
        </h2>
      </div>

      {/* Draft Table - Full Width */}
      <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
        <table className="w-full min-w-full table-fixed">
          {/* Table Header */}
          <thead className="table-header">
            <tr 
              className="relative"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
              }}
            >
              {teamHeaders.map((team, index) => (
                <th 
                  key={team.slot}
                  className={`px-2 py-4 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-ffu-red-600 transition-colors duration-200 ${
                    index < teams - 1 ? 'border-r border-ffu-red-700' : ''
                  } ${selectedTeamUserId === team.userId ? 'bg-ffu-red-600' : ''}`}
                  style={{ width: columnWidth }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTeamUserId(selectedTeamUserId === team.userId ? null : (team.userId || null));
                  }}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <TeamLogo 
                      teamName={team.teamName} 
                      abbreviation={team.abbreviation}
                      size="sm"
                    />
                    <div className="text-center break-words text-sm" title={team.teamName}>
                      {team.teamName}
                    </div>
                    <div className="text-xs opacity-75 text-center">{team.abbreviation}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white dark:bg-gray-800">
            {draftGrid.map((round, roundIndex) => (
              <tr 
                key={roundIndex}
                className={`${
                  roundIndex < rounds - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''
                }`}
              >
                
                {/* Picks for this round */}
                {round.map((pick, teamIndex) => {
                  // Determine if this pick belongs to the selected team (considering trades)
                  const isSelectedTeamPick = selectedTeamUserId && pick && pick.pickedBy === selectedTeamUserId;
                  const shouldDim = selectedTeamUserId && (!pick || pick.pickedBy !== selectedTeamUserId);
                  
                  return (
                    <td 
                      key={teamIndex}
                      className={`align-top relative overflow-hidden group transition-all duration-300 ${
                        teamIndex < teams - 1 ? 'border-r border-gray-200 dark:border-gray-600' : ''
                      } ${pick ? getPositionBackgroundColor(pick.playerInfo.position) : ''} ${
                        shouldDim ? 'opacity-40' : ''
                      } ${isSelectedTeamPick ? 'ring-2 ring-gray-400 ring-inset brightness-110' : ''} ${
                        pick ? 'cursor-pointer' : ''
                      }`}
                      style={{ 
                        width: columnWidth,
                        height: '100px',
                        minHeight: '100px'
                      }}
                      title={pick ? `${pick.playerInfo.name}${isPickTraded(pick, teamHeaders[teamIndex]?.userId) ? `\nDrafted by: ${userMap[pick.pickedBy]?.teamName || userMap[pick.pickedBy]?.abbreviation || 'Unknown'}` : ''}` : ''}
                      onClick={pick ? (e) => {
                        e.stopPropagation();
                        setSelectedTeamUserId(selectedTeamUserId === pick.pickedBy ? null : pick.pickedBy);
                      } : undefined}
                    >
                    {/* Traded Pick Banner - Outside content div */}
                    {pick && isPickTraded(pick, teamHeaders[teamIndex]?.userId) && (
                      <div className="absolute top-0 left-0 right-0 bg-gray-400 dark:bg-gray-600 text-white text-xs px-1 py-0.5 text-center z-10 flex items-center justify-center gap-1" style={{ height: '16px' }}>
                        <span>→</span>
                        <span>{getTradingTeamInfo(pick)}</span>
                      </div>
                    )}
                    
                    {pick ? (
                      <div className={`h-full flex flex-col justify-between ${isPickTraded(pick, teamHeaders[teamIndex]?.userId) ? 'pt-4 px-3 pb-4' : 'px-3 py-4'}`}>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-2">
                          <div className="truncate">
                            {formatPlayerName(pick.playerInfo.name)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider angular-cut-small ${getPositionColor(pick.playerInfo.position)}`} style={{ fontSize: '11px' }}>
                                {pick.playerInfo.position}
                              </span>
                              {pick.playerInfo.team && (
                                <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">
                                  {pick.playerInfo.team}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">
                              {formatPickNumber(roundIndex + 1, teamIndex)}
                            </span>
                          </div>
                        </div>
                        {/* Subtle arrow positioned at top right below trade banner */}
                        {(() => {
                          const arrow = getNextPickArrow(roundIndex + 1, teamIndex);
                          return arrow ? (
                            <div className="absolute top-4 right-1 text-gray-300 dark:text-gray-600" style={{ fontSize: '10px' }}>
                              {arrow}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 italic text-sm">
                        —
                      </div>
                    )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};