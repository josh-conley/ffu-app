import React from 'react';
import type { DraftData, DraftPick, UserInfo } from '../../types';
import { TeamLogo } from '../Common/TeamLogo';
import { getDisplayTeamName } from '../../config/constants';

interface MobileDraftBoardProps {
  draftData: DraftData;
  userMap: Record<string, UserInfo>;
}

export const MobileDraftBoard: React.FC<MobileDraftBoardProps> = ({ draftData, userMap }) => {
  const { picks, settings } = draftData;
  const { teams, rounds } = settings;

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
    const userId = Object.keys(draftOrder).find(uid => draftOrder[uid] === team);
    const userInfo = userId ? userMap[userId] : null;
    teamHeaders.push({
      slot: team,
      userId: userId,
      teamName: userInfo?.teamName ? getDisplayTeamName(userId || '', userInfo.teamName, draftData.year) : `Team ${team}`,
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

  // Check if a pick was traded
  const isPickTraded = (pick: DraftPick, columnUserId: string | undefined): boolean => {
    return columnUserId ? pick.pickedBy !== columnUserId : false;
  };

  // Get the team info for who actually made the pick
  const getTradingTeamInfo = (pick: DraftPick): string => {
    const tradingUserInfo = userMap[pick.pickedBy];
    // For trading banners, prefer abbreviation to keep it compact, but fall back to enhanced team name
    return tradingUserInfo?.abbreviation || 
           (tradingUserInfo?.teamName ? getDisplayTeamName(pick.pickedBy, tradingUserInfo.teamName, draftData.year) : 'UNK');
  };

  // Format player name for wrapping - first name on first line, last name on second
  const formatPlayerName = (fullName: string): { firstName: string; lastName: string } => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) {
      return { firstName: fullName, lastName: '' };
    }
    
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    return { firstName, lastName };
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

  // Calculate column width for mobile - sized so ~4 columns fit on 375px screen
  const mobileColumnWidth = '94px';

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-4 px-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {draftData.metadata.name} - {draftData.year}
        </h2>
      </div>

      {/* Mobile Draft Table - Horizontal Scroll */}
      <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
        <table className="min-w-full table-fixed" style={{ width: `${94 * teams}px` }}>
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
                  className={`px-1 py-2 text-center text-xs font-bold text-white uppercase tracking-wider ${
                    index < teams - 1 ? 'border-r border-ffu-red-700' : ''
                  }`}
                  style={{ width: mobileColumnWidth, padding: '4px' }}
                >
                  <div className="flex flex-col items-center">
                    <TeamLogo 
                      teamName={team.teamName} 
                      abbreviation={team.abbreviation}
                      size="sm"
                    />
                    <div className="text-center break-words text-xs leading-tight" title={team.teamName} style={{ fontSize: '0.6rem' }}>
                      {team.teamName}
                    </div>
                    <div className="text-xs opacity-75 text-center" style={{ fontSize: '0.6rem' }}>{team.abbreviation}</div>
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
                {round.map((pick, teamIndex) => (
                  <td 
                    key={teamIndex}
                    className={`align-top relative overflow-hidden group ${
                      teamIndex < teams - 1 ? 'border-r border-gray-200 dark:border-gray-600' : ''
                    } ${pick ? getPositionBackgroundColor(pick.playerInfo.position) : ''}`}
                    style={{ 
                      width: mobileColumnWidth,
                      height: mobileColumnWidth,
                      minHeight: mobileColumnWidth
                    }}
                  >
                    {/* Traded Pick Banner */}
                    {pick && isPickTraded(pick, teamHeaders[teamIndex]?.userId) && (
                      <div className="absolute top-0 left-0 right-0 bg-gray-400 dark:bg-gray-600 text-white text-xs px-1 py-0.5 text-center z-10 flex items-center justify-center gap-1" style={{ height: '12px' }}>
                        <span>→</span>
                        <span className="text-[10px]">{getTradingTeamInfo(pick)}</span>
                      </div>
                    )}
                    
                    {pick ? (
                      <div className="h-full flex flex-col justify-between relative pt-3 px-2 pb-2">
                        {(() => {
                          const playerName = formatPlayerName(pick.playerInfo.name);
                          return (
                            <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1 text-left">
                              <div>{playerName.firstName}</div>
                              {playerName.lastName && <div>{playerName.lastName}</div>}
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className={`px-1 py-0.5 text-xs font-bold uppercase tracking-wider angular-cut-small ${getPositionColor(pick.playerInfo.position)}`} style={{ fontSize: '10px' }}>
                              {pick.playerInfo.position}
                            </span>
                            {pick.playerInfo.team && (
                              <span className="text-gray-600 dark:text-gray-400 font-medium" style={{ fontSize: '10px' }}>
                                {pick.playerInfo.team}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 dark:text-gray-400 font-mono" style={{ fontSize: '9px' }}>
                            {formatPickNumber(roundIndex + 1, teamIndex)}
                          </span>
                        </div>
                        {/* Subtle arrow positioned at bottom right */}
                        {(() => {
                          const arrow = getNextPickArrow(roundIndex + 1, teamIndex);
                          return arrow ? (
                            <div className="absolute top-3.5 right-1 text-gray-400" style={{ fontSize: '10px' }}>
                              {arrow}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 italic text-xs">
                        —
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};