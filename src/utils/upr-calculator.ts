import { isRegularSeasonWeek } from './era-detection';
import type { WeekMatchup } from '../types';

export interface UPRCalculationData {
  wins: number;
  losses: number;
  averageScore: number;
  highGame: number;
  lowGame: number;
}

export const calculateUPR = (data: UPRCalculationData): number => {
  const { wins, losses, averageScore, highGame, lowGame } = data;
  
  const totalGames = wins + losses;
  const winPercentage = totalGames > 0 ? wins / totalGames : 0;
  
  const upr = ((averageScore * 6) + ((highGame + lowGame) * 2) + (winPercentage * 400)) / 10;
  
  return Math.round(upr * 100) / 100;
};

export const calculateWinPercentage = (wins: number, losses: number): number => {
  const totalGames = wins + losses;
  return totalGames > 0 ? wins / totalGames : 0;
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
): { wins: number; losses: number } => {
  let wins = 0;
  let losses = 0;

  Object.entries(matchupsByWeek).forEach(([weekStr, matchups]) => {
    const week = parseInt(weekStr);
    
    if (!isRegularSeasonWeek(week, year)) {
      return;
    }

    matchups.forEach(matchup => {
      if (matchup.winner === userId) {
        wins++;
      } else if (matchup.loser === userId) {
        losses++;
      }
    });
  });

  return { wins, losses };
};

export const calculateRegularSeasonStats = (
  userId: string,
  matchupsByWeek: Record<number, WeekMatchup[]>,
  year: string
): { wins: number; losses: number; averageScore: number; highGame: number; lowGame: number } => {
  let wins = 0;
  let losses = 0;
  let highGame = 0;
  let lowGame = Number.MAX_SAFE_INTEGER;
  const userScores: number[] = [];

  Object.entries(matchupsByWeek).forEach(([weekStr, matchups]) => {
    const week = parseInt(weekStr);
    
    if (!isRegularSeasonWeek(week, year)) {
      return;
    }

    matchups.forEach(matchup => {
      let userScore: number | null = null;

      if (matchup.winner === userId) {
        userScore = matchup.winnerScore;
        wins++;
      } else if (matchup.loser === userId) {
        userScore = matchup.loserScore;
        losses++;
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
    averageScore,
    highGame: highGame > 0 ? highGame : 0,
    lowGame: lowGame < Number.MAX_SAFE_INTEGER ? lowGame : 0
  };
};