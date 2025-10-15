import { isRegularSeasonWeek } from './era-detection';
import { isNFLWeekComplete } from './nfl-schedule';
import type { WeekMatchup } from '../types';

export interface UPRCalculationData {
  wins: number;
  losses: number;
  ties?: number;
  averageScore: number;
  highGame: number;
  lowGame: number;
}

export const calculateUPR = (data: UPRCalculationData): number => {
  const { wins, losses, ties = 0, averageScore, highGame, lowGame } = data;

  const totalGames = wins + losses + ties;
  const winPercentage = totalGames > 0 ? (wins + ties * 0.5) / totalGames : 0;

  const upr = ((averageScore * 6) + ((highGame + lowGame) * 2) + (winPercentage * 400)) / 10;

  return Math.round(upr * 100) / 100;
};

export const calculateWinPercentage = (wins: number, losses: number, ties: number = 0): number => {
  const totalGames = wins + losses + ties;
  return totalGames > 0 ? (wins + ties * 0.5) / totalGames : 0;
};

export const getRegularSeasonUPRData = (
  userId: string,
  matchupsByWeek: Record<number, WeekMatchup[]>,
  year: string
): Omit<UPRCalculationData, 'wins' | 'losses'> => {
  let highGame = 0;
  let lowGame = Number.MAX_SAFE_INTEGER;
  const userScores: number[] = [];

  Object.entries(matchupsByWeek).forEach(([weekStr, matchups]) => {
    const week = parseInt(weekStr);

    if (!isRegularSeasonWeek(week, year)) {
      return;
    }

    // For active seasons (2025), only include completed weeks
    if (year === '2025' && !isNFLWeekComplete(week)) {
      return;
    }

    matchups.forEach(matchup => {
      let userScore: number | null = null;

      if (matchup.winner === userId) {
        userScore = matchup.winnerScore;
      } else if (matchup.loser === userId) {
        userScore = matchup.loserScore;
      }

      if (userScore !== null) {
        userScores.push(userScore);
        highGame = Math.max(highGame, userScore);
        lowGame = Math.min(lowGame, userScore);
      }
    });
  });

  const averageScore = userScores.length > 0 
    ? userScores.reduce((sum, score) => sum + score, 0) / userScores.length 
    : 0;

  return {
    averageScore,
    highGame: highGame > 0 ? highGame : 0,
    lowGame: lowGame < Number.MAX_SAFE_INTEGER ? lowGame : 0
  };
};

export const calculateRegularSeasonRecord = (
  userId: string,
  matchupsByWeek: Record<number, WeekMatchup[]>,
  year: string
): { wins: number; losses: number; ties: number } => {
  let wins = 0;
  let losses = 0;
  let ties = 0;

  Object.entries(matchupsByWeek).forEach(([weekStr, matchups]) => {
    const week = parseInt(weekStr);

    if (!isRegularSeasonWeek(week, year)) {
      return;
    }

    // For active seasons (2025), only include completed weeks
    if (year === '2025' && !isNFLWeekComplete(week)) {
      return;
    }

    matchups.forEach(matchup => {
      if (matchup.winner === userId) {
        // Check if it's a tie game (same score)
        if (matchup.winnerScore === matchup.loserScore) {
          ties++;
        } else {
          wins++;
        }
      } else if (matchup.loser === userId) {
        // Check if it's a tie game (same score)
        if (matchup.winnerScore === matchup.loserScore) {
          // Already counted above, don't double count
          return;
        } else {
          losses++;
        }
      }
    });
  });

  return { wins, losses, ties };
};

export const calculateRegularSeasonStats = (
  userId: string,
  matchupsByWeek: Record<number, WeekMatchup[]>,
  year: string
): { wins: number; losses: number; ties: number; averageScore: number; highGame: number; lowGame: number } => {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let highGame = 0;
  let lowGame = Number.MAX_SAFE_INTEGER;
  const userScores: number[] = [];

  Object.entries(matchupsByWeek).forEach(([weekStr, matchups]) => {
    const week = parseInt(weekStr);

    if (!isRegularSeasonWeek(week, year)) {
      return;
    }

    // For active seasons (2025), only include completed weeks
    if (year === '2025' && !isNFLWeekComplete(week)) {
      return;
    }

    matchups.forEach(matchup => {
      let userScore: number | null = null;

      if (matchup.winner === userId) {
        userScore = matchup.winnerScore;
        // Check if it's a tie game (same score)
        if (matchup.winnerScore === matchup.loserScore) {
          ties++;
        } else {
          wins++;
        }
      } else if (matchup.loser === userId) {
        userScore = matchup.loserScore;
        // Check if it's a tie game (same score)
        if (matchup.winnerScore === matchup.loserScore) {
          // Already counted above, don't double count
          return;
        } else {
          losses++;
        }
      }

      if (userScore !== null) {
        userScores.push(userScore);
        highGame = Math.max(highGame, userScore);
        lowGame = Math.min(lowGame, userScore);
      }
    });
  });

  const averageScore = userScores.length > 0
    ? userScores.reduce((sum, score) => sum + score, 0) / userScores.length
    : 0;

  return {
    wins,
    losses,
    ties,
    averageScore,
    highGame: highGame > 0 ? highGame : 0,
    lowGame: lowGame < Number.MAX_SAFE_INTEGER ? lowGame : 0
  };
};