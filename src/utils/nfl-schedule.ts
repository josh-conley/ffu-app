// NFL 2025 Season Schedule
// Week dates based on typical NFL schedule pattern
// Weeks typically run Thursday to Monday, with Tuesday being when scores are final

export interface NFLWeekDate {
  week: number;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string;   // Tuesday after the week ends (scores final from 12:00 AM)
}

// 2025 NFL Season Week Schedule
// Note: Update these dates based on official NFL schedule when available
export const NFL_2025_SCHEDULE: NFLWeekDate[] = [
  { week: 1, startDate: '2025-09-04', endDate: '2025-09-09' }, // Sep 4 - Sep 9 (Tuesday)
  { week: 2, startDate: '2025-09-10', endDate: '2025-09-16' }, // Sep 10 - Sep 16 (Tuesday)
  { week: 3, startDate: '2025-09-17', endDate: '2025-09-23' }, // Sep 17 - Sep 23 (Tuesday)
  { week: 4, startDate: '2025-09-24', endDate: '2025-09-30' }, // Sep 24 - Sep 30 (Tuesday)
  { week: 5, startDate: '2025-10-01', endDate: '2025-10-07' }, // Oct 1 - Oct 7 (Tuesday)
  { week: 6, startDate: '2025-10-08', endDate: '2025-10-14' }, // Oct 8 - Oct 14 (Tuesday)
  { week: 7, startDate: '2025-10-15', endDate: '2025-10-21' }, // Oct 15 - Oct 21 (Tuesday)
  { week: 8, startDate: '2025-10-22', endDate: '2025-10-28' }, // Oct 22 - Oct 28 (Tuesday)
  { week: 9, startDate: '2025-10-29', endDate: '2025-11-04' }, // Oct 29 - Nov 4 (Tuesday)
  { week: 10, startDate: '2025-11-05', endDate: '2025-11-11' }, // Nov 5 - Nov 11 (Tuesday)
  { week: 11, startDate: '2025-11-12', endDate: '2025-11-18' }, // Nov 12 - Nov 18 (Tuesday)
  { week: 12, startDate: '2025-11-19', endDate: '2025-11-25' }, // Nov 19 - Nov 25 (Tuesday) Thanksgiving week
  { week: 13, startDate: '2025-11-26', endDate: '2025-12-02' }, // Nov 26 - Dec 2 (Tuesday)
  { week: 14, startDate: '2025-12-03', endDate: '2025-12-09' }, // Dec 3 - Dec 9 (Tuesday)
  { week: 15, startDate: '2025-12-10', endDate: '2025-12-16' }, // Dec 10 - Dec 16 (Tuesday) Playoffs start
  { week: 16, startDate: '2025-12-17', endDate: '2025-12-23' }, // Dec 17 - Dec 23 (Tuesday)
  { week: 17, startDate: '2025-12-24', endDate: '2025-12-30' }, // Dec 24 - Dec 30 (Tuesday) Christmas week
  { week: 18, startDate: '2025-12-31', endDate: '2026-01-06' }, // Dec 31 - Jan 6 (Tuesday) Final week
];

/**
 * Determines if an NFL week has ended (start of Tuesday after the week)
 * @param week - The NFL week number (1-18)
 * @param currentDate - Optional current date for testing, defaults to now
 * @returns true if the week has ended (it's Tuesday 12:00 AM or later)
 */
export const isNFLWeekComplete = (week: number, currentDate?: Date): boolean => {
  const now = currentDate || new Date();
  const weekData = NFL_2025_SCHEDULE.find(w => w.week === week);
  
  if (!weekData) {
    // If week not found, assume it's complete (for safety)
    return true;
  }
  
  const endDate = new Date(weekData.endDate + 'T00:00:00'); // Start of Tuesday (12:00 AM)
  return now >= endDate;
};

/**
 * Gets the current active NFL week (the week that is currently in progress or upcoming)
 * @param currentDate - Optional current date for testing, defaults to now
 * @returns The current NFL week number, or null if no active week
 */
export const getCurrentNFLWeek = (currentDate?: Date): number | null => {
  const now = currentDate || new Date();
  
  for (const weekData of NFL_2025_SCHEDULE) {
    const startDate = new Date(weekData.startDate);
    const endDate = new Date(weekData.endDate + 'T23:59:59'); // End of Tuesday (11:59 PM)
    
    if (now >= startDate && now < endDate) {
      return weekData.week;
    }
  }
  
  return null; // No active week found
};

/**
 * Determines if matchup color coding should be shown
 * For active season (2025), don't show winner/loser colors until week is complete
 * @param year - The season year
 * @param week - The week number
 * @param currentDate - Optional current date for testing
 * @returns true if color coding should be shown
 */
export const shouldShowMatchupColors = (year: string, week: number, currentDate?: Date): boolean => {
  // For non-active seasons, always show colors
  if (year !== '2025') {
    return true;
  }
  
  // For active season, only show colors if the week has ended
  return isNFLWeekComplete(week, currentDate);
};

/**
 * Gets week information for display purposes
 * @param week - The NFL week number
 * @returns Week information or null if not found
 */
export const getNFLWeekInfo = (week: number): NFLWeekDate | null => {
  return NFL_2025_SCHEDULE.find(w => w.week === week) || null;
};

/**
 * Helper function to get current date info for debugging
 * @param currentDate - Optional current date for testing
 * @returns Current date and active NFL week info
 */
export const getNFLScheduleDebugInfo = (currentDate?: Date) => {
  const now = currentDate || new Date();
  const currentWeek = getCurrentNFLWeek(currentDate);
  const weekInfo = currentWeek ? getNFLWeekInfo(currentWeek) : null;
  
  return {
    currentDate: now.toISOString(),
    currentNFLWeek: currentWeek,
    weekInfo,
    isActiveWeek: currentWeek !== null,
    nextWeek: currentWeek ? getNFLWeekInfo(currentWeek + 1) : getNFLWeekInfo(1)
  };
};