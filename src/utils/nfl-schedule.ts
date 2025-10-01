// NFL 2025 Season Schedule
// Week dates based on typical NFL schedule pattern
// Weeks run Thursday (TNF) to the following Wednesday (grace day)
// Monday Night Football ends the game week, Tuesday scores finalize, Wednesday is review day

export interface NFLWeekDate {
  week: number;
  startDate: string; // ISO date string (YYYY-MM-DD) - Thursday when TNF starts
  endDate: string;   // Wednesday (grace day after Tuesday score finalization)
}

// 2025 NFL Season Week Schedule
// Format: Thursday (TNF) through Wednesday (grace day)
export const NFL_2025_SCHEDULE: NFLWeekDate[] = [
  { week: 1, startDate: '2025-09-04', endDate: '2025-09-10' }, // Sep 4 (Thu) - Sep 10 (Wed)
  { week: 2, startDate: '2025-09-11', endDate: '2025-09-17' }, // Sep 11 (Thu) - Sep 17 (Wed)
  { week: 3, startDate: '2025-09-18', endDate: '2025-09-24' }, // Sep 18 (Thu) - Sep 24 (Wed)
  { week: 4, startDate: '2025-09-25', endDate: '2025-10-01' }, // Sep 25 (Thu) - Oct 1 (Wed)
  { week: 5, startDate: '2025-10-02', endDate: '2025-10-08' }, // Oct 2 (Thu) - Oct 8 (Wed)
  { week: 6, startDate: '2025-10-09', endDate: '2025-10-15' }, // Oct 9 (Thu) - Oct 15 (Wed)
  { week: 7, startDate: '2025-10-16', endDate: '2025-10-22' }, // Oct 16 (Thu) - Oct 22 (Wed)
  { week: 8, startDate: '2025-10-23', endDate: '2025-10-29' }, // Oct 23 (Thu) - Oct 29 (Wed)
  { week: 9, startDate: '2025-10-30', endDate: '2025-11-05' }, // Oct 30 (Thu) - Nov 5 (Wed)
  { week: 10, startDate: '2025-11-06', endDate: '2025-11-12' }, // Nov 6 (Thu) - Nov 12 (Wed)
  { week: 11, startDate: '2025-11-13', endDate: '2025-11-19' }, // Nov 13 (Thu) - Nov 19 (Wed)
  { week: 12, startDate: '2025-11-20', endDate: '2025-11-26' }, // Nov 20 (Thu) - Nov 26 (Wed) Thanksgiving week
  { week: 13, startDate: '2025-11-27', endDate: '2025-12-03' }, // Nov 27 (Thu) - Dec 3 (Wed)
  { week: 14, startDate: '2025-12-04', endDate: '2025-12-10' }, // Dec 4 (Thu) - Dec 10 (Wed)
  { week: 15, startDate: '2025-12-11', endDate: '2025-12-17' }, // Dec 11 (Thu) - Dec 17 (Wed) Playoffs start
  { week: 16, startDate: '2025-12-18', endDate: '2025-12-24' }, // Dec 18 (Thu) - Dec 24 (Wed)
  { week: 17, startDate: '2025-12-25', endDate: '2025-12-31' }, // Dec 25 (Thu) - Dec 31 (Wed) Christmas week
  { week: 18, startDate: '2026-01-01', endDate: '2026-01-07' }, // Jan 1 (Thu) - Jan 7 (Wed) Final week
];

/**
 * Determines if an NFL week's games are complete (Tuesday or later)
 * @param week - The NFL week number (1-18)
 * @param currentDate - Optional current date for testing, defaults to now
 * @returns true if the week's games are complete (it's Tuesday 12:00 AM or later)
 */
export const isNFLWeekComplete = (week: number, currentDate?: Date): boolean => {
  const now = currentDate || new Date();
  const weekData = NFL_2025_SCHEDULE.find(w => w.week === week);

  if (!weekData) {
    // If week not found, assume it's complete (for safety)
    return true;
  }

  // Games are complete starting Tuesday (endDate is Wednesday, so Tuesday is the day before)
  // Parse endDate and subtract 1 day to get Tuesday at midnight
  const endDateParts = weekData.endDate.split('-').map(Number);
  const tuesdayDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2] - 1, 0, 0, 0, 0);

  return now >= tuesdayDate;
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