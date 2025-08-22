import type { LeagueTier } from '../types';
import { getAvailableLeagues, isEspnEra, isSleeperEra } from '../utils/era-detection';

// Normalized data structures for better maintainability

interface LeagueConfig {
  sleeperId: string;
  year: string;
  tier: LeagueTier;
  status: 'active' | 'completed';
  startYear: number;
}

interface UserConfig {
  ffuId: string; // Primary identifier for FFU system
  sleeperId: string;
  teamName: string;
  abbreviation: string;
  joinedYear: number;
  isActive: boolean;
  // New fields for ESPN era support
  espnUsername?: string; // For historical mapping
  historicalTeamNames?: { [year: string]: string }; // Year -> team name
}

// Master league configuration - single source of truth
export const LEAGUES: LeagueConfig[] = [
  // PREMIER LEAGUE
  { sleeperId: '1256010768692805632', year: '2025', tier: 'PREMIER', status: 'active', startYear: 2025 },
  { sleeperId: '1124841088360660992', year: '2024', tier: 'PREMIER', status: 'completed', startYear: 2024 },
  { sleeperId: '989237166217723904', year: '2023', tier: 'PREMIER', status: 'completed', startYear: 2023 },
  { sleeperId: '856271024054996992', year: '2022', tier: 'PREMIER', status: 'completed', startYear: 2022 },
  { sleeperId: '710961812656455680', year: '2021', tier: 'PREMIER', status: 'completed', startYear: 2021 },
  { sleeperId: 'espn-2020-premier', year: '2020', tier: 'PREMIER', status: 'completed', startYear: 2020 },
  { sleeperId: 'espn-2019-premier', year: '2019', tier: 'PREMIER', status: 'completed', startYear: 2019 },
  { sleeperId: 'espn-2018-premier', year: '2018', tier: 'PREMIER', status: 'completed', startYear: 2018 },
  
  // MASTERS LEAGUE  
  { sleeperId: '1256011253583708161', year: '2025', tier: 'MASTERS', status: 'active', startYear: 2025 },
  { sleeperId: '1124833010697379840', year: '2024', tier: 'MASTERS', status: 'completed', startYear: 2024 },
  { sleeperId: '989238596353794048', year: '2023', tier: 'MASTERS', status: 'completed', startYear: 2023 },
  { sleeperId: '856271401471029248', year: '2022', tier: 'MASTERS', status: 'completed', startYear: 2022 },
  // Note: No Masters league in ESPN era (2018-2020)
  
  // NATIONAL LEAGUE
  { sleeperId: '1256012193275576320', year: '2025', tier: 'NATIONAL', status: 'active', startYear: 2025 },
  { sleeperId: '1124834889196134400', year: '2024', tier: 'NATIONAL', status: 'completed', startYear: 2024 },
  { sleeperId: '989240797381951488', year: '2023', tier: 'NATIONAL', status: 'completed', startYear: 2023 },
  { sleeperId: '856271753788403712', year: '2022', tier: 'NATIONAL', status: 'completed', startYear: 2022 },
  { sleeperId: '726573082608775168', year: '2021', tier: 'NATIONAL', status: 'completed', startYear: 2021 },
  { sleeperId: 'espn-2020-national', year: '2020', tier: 'NATIONAL', status: 'completed', startYear: 2020 },
  { sleeperId: 'espn-2019-national', year: '2019', tier: 'NATIONAL', status: 'completed', startYear: 2019 },
  { sleeperId: 'espn-2018-national', year: '2018', tier: 'NATIONAL', status: 'completed', startYear: 2018 },
];

// Master user configuration - single source of truth
export const USERS: UserConfig[] = [
  { ffuId: 'ffu-001', sleeperId: '331590801261883392', teamName: 'The Stallions', abbreviation: 'STA', joinedYear: 2020, isActive: true, espnUsername: 'stallions', historicalTeamNames: { '2020': 'The Stallions' } },
  { ffuId: 'ffu-002', sleeperId: '396808818157182976', teamName: 'FFUcked Up', abbreviation: 'FU', joinedYear: 2019, isActive: true },
  { ffuId: 'ffu-003', sleeperId: '398574272387297280', teamName: 'Dmandre161', abbreviation: 'DMAN', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-004', sleeperId: '398576262546735104', teamName: 'Blood, Sweat, and Beers', abbreviation: 'BEER', joinedYear: 2020, isActive: true, espnUsername: 'beers', historicalTeamNames: { '2020': 'Blood, Sweat and Beers' } },
  { ffuId: 'ffu-005', sleeperId: '467404039059927040', teamName: 'Malibu Leopards', abbreviation: 'MLBU', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-006', sleeperId: '470715135581745152', teamName: 'Pottsville Maroons', abbreviation: 'POTT', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-007', sleeperId: '705642514408886272', teamName: 'The Dark Knights', abbreviation: 'BATS', joinedYear: 2021, isActive: true, historicalTeamNames: { '2020': 'Purple Parade' }  },
  { ffuId: 'ffu-008', sleeperId: '710981985102802944', teamName: 'Frank\'s Little Beauties', abbreviation: 'FLB', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-009', sleeperId: '727368657923063808', teamName: 'Fort Wayne Banana Bread', abbreviation: 'FWBB', joinedYear: 2020, isActive: true, espnUsername: 'bread', historicalTeamNames: { '2020': 'Wisconsian Banana Bread' } },
  { ffuId: 'ffu-010', sleeperId: '729741648338210816', teamName: 'ChicagoPick6', abbreviation: 'CP6', joinedYear: 2020, isActive: true, espnUsername: 'picks', historicalTeamNames: { '2020': 'Chicago Pick 6s' } },
  { ffuId: 'ffu-011', sleeperId: '798327505219096576', teamName: 'TKO Blow', abbreviation: 'TKO', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-012', sleeperId: '860973514839199744', teamName: 'Show Biz Kitten', abbreviation: 'SBK', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-013', sleeperId: '862142522036703232', teamName: 'Boca Ciega Banditos', abbreviation: 'BOCA', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-014', sleeperId: '84604928349585408', teamName: 'The (Teddy) Bears', abbreviation: 'TTB', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-015', sleeperId: '398552306884345856', teamName: 'arcorey15', abbreviation: 'ARCO', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-016', sleeperId: '578691097983754240', teamName: 'MustachePapi', abbreviation: 'MUST', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-017', sleeperId: '602712418325442560', teamName: 'The Riveters', abbreviation: 'RVTR', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-018', sleeperId: '804551335088361472', teamName: 'Crawfordsville\'s Finest', abbreviation: 'CRAW', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-019', sleeperId: '821067488811909120', teamName: 'LegendsRise', abbreviation: 'RISE', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-020', sleeperId: '856248808915480576', teamName: 'The Tooth Tuggers', abbreviation: 'TT', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-021', sleeperId: '864966364937461760', teamName: 'Nighthawks', abbreviation: 'HAWK', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-022', sleeperId: '865078270985629696', teamName: 'The Gaston Ramblers', abbreviation: 'TGR', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-023', sleeperId: '84006772809285632', teamName: 'The Minutemen', abbreviation: 'MMEN', joinedYear: 2020, isActive: true, espnUsername: 'mmen', historicalTeamNames: { '2020': 'The Minutemen' } },
  { ffuId: 'ffu-024', sleeperId: '325766631336714240', teamName: 'Act More Stupidly', abbreviation: 'AMS', joinedYear: 2020, isActive: true, espnUsername: 'swaggy', historicalTeamNames: { '2020': 'Goat Emoji II' } },
  { ffuId: 'ffu-025', sleeperId: '386791325690994688', teamName: 'Indianapolis Aztecs', abbreviation: 'AZTC', joinedYear: 2020, isActive: true, espnUsername: 'aztecs' },
  { ffuId: 'ffu-026', sleeperId: '462383465753473024', teamName: 'Raging Rhinos', abbreviation: 'RAGE', joinedYear: 2020, isActive: true, espnUsername: 'rhinos', historicalTeamNames: { '2020': 'Currier Island Raging Rhinos' } },
  { ffuId: 'ffu-027', sleeperId: '465884883869233152', teamName: 'CamDelphia', abbreviation: 'CAM', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-028', sleeperId: '507633950666584064', teamName: 'El Guapo Puto', abbreviation: 'EGP', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-029', sleeperId: '508719015656099840', teamName: 'Team Pancake', abbreviation: 'TP', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-030', sleeperId: '527884868880531456', teamName: 'Johnkshire Cats', abbreviation: 'CATS', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-031', sleeperId: '726572095210930176', teamName: 'Team Dogecoin', abbreviation: 'DOGE', joinedYear: 2020, isActive: true, espnUsername: 'doge', historicalTeamNames: { '2020': 'Team Dogecoin' } },
  { ffuId: 'ffu-032', sleeperId: '731211092713402368', teamName: 'Team Dogecoin', abbreviation: 'DOGE', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-033', sleeperId: '639877229681147904', teamName: 'He Hate Me', abbreviation: 'HATE', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-034', sleeperId: '664739261735591936', teamName: 'CENATION', abbreviation: 'CENA', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-035', sleeperId: '715362669380591616', teamName: 'ZBoser', abbreviation: 'ZBOS', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-036', sleeperId: '727366898383122432', teamName: 'Big Ten Bandits', abbreviation: 'B1G', joinedYear: 2021, isActive: true, historicalTeamNames: { '2018': 'Disney\'s PikskinSlingers' } },
  { ffuId: 'ffu-037', sleeperId: '865323291064291328', teamName: 'Head Cow Always Grazing', abbreviation: 'HCAG', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-038', sleeperId: '1124071986805829632', teamName: 'Odin\'s Herr', abbreviation: 'ODIN', joinedYear: 2024, isActive: true },
  { ffuId: 'ffu-039', sleeperId: '1133491276038426624', teamName: 'Bucky Badgers', abbreviation: 'BDGR', joinedYear: 2024, isActive: true },
  { ffuId: 'ffu-040', sleeperId: '1133492104077946880', teamName: 'The Sha\'Dynasty', abbreviation: 'NSTY', joinedYear: 2024, isActive: true },
  { ffuId: 'ffu-041', sleeperId: '399322397750124544', teamName: 'Team Jacamart', abbreviation: 'JACA', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-042', sleeperId: '472876832719368192', teamName: 'Stark Direwolves', abbreviation: 'STRK', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-043', sleeperId: '399297882890440704', teamName: 'Circle City Phantoms', abbreviation: 'CCP', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-044', sleeperId: '467553389673181184', teamName: 'Shton\'s Strikers', abbreviation: 'SHTN', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-045', sleeperId: '599711204499312640', teamName: 'Team Black Death', abbreviation: 'TBD', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-046', sleeperId: '739275676649144320', teamName: 'Birds of War', abbreviation: 'BOW', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-047', sleeperId: '563223565497249792', teamName: 'bstarrr', abbreviation: 'BSTA', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-048', sleeperId: '1003144735223099392', teamName: 'dewdoc', abbreviation: 'DEW', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-049', sleeperId: '726584695151734784', teamName: 'The Ducklings', abbreviation: 'DUCK', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-050', sleeperId: '729571025750208512', teamName: 'chetmaynard', abbreviation: 'CHET', joinedYear: 2021, isActive: true },
  { ffuId: 'ffu-051', sleeperId: '399379352174768128', teamName: 'Stone Cold Steve Irwins', abbreviation: 'SCSI', joinedYear: 2020, isActive: true, espnUsername: 'scsi', historicalTeamNames: { '2020': 'Stone Cold Steve Irwins' } },
  
  // New members joining for 2025 season
  { ffuId: 'ffu-052', sleeperId: '1132015239492591616', teamName: 'The Steel Tigers', abbreviation: 'STEEL', joinedYear: 2025, isActive: true },
  { ffuId: 'ffu-053', sleeperId: '1256013880681832448', teamName: 'Jawn of Arc', abbreviation: 'JAWN', joinedYear: 2025, isActive: true },
  { ffuId: 'ffu-054', sleeperId: '1259227854642622464', teamName: 'The Underdogs', abbreviation: 'UDOGS', joinedYear: 2025, isActive: true },
  { ffuId: 'ffu-055', sleeperId: '797222154151247872', teamName: 'Dawn Island Straw Hats', abbreviation: 'STRAW', joinedYear: 2025, isActive: true },
  { ffuId: 'ffu-056', sleeperId: '866063012375719936', teamName: 'The Inferno Swarm', abbreviation: 'SWARM', joinedYear: 2025, isActive: true },
  
  // Historical users who participated in ESPN era but didn't continue to Sleeper era
  { ffuId: 'ffu-h01', sleeperId: 'historical-naptown-makos', teamName: 'Naptown Makos', abbreviation: 'NM', joinedYear: 2019, isActive: false, espnUsername: 'makos', historicalTeamNames: { '2019': 'Naptown Makos' } },
  { ffuId: 'ffu-h02', sleeperId: 'historical-speedway-ritual-cog', teamName: 'Speedway\'s Ritual Cog', abbreviation: 'SRC', joinedYear: 2018, isActive: false, espnUsername: 'cog', historicalTeamNames: { '2018': 'Speedway\'s Ritual Cog', '2019': 'Speedway\'s Ritual Cog' } },
  { ffuId: 'ffu-h03', sleeperId: 'historical-well-done-stakes', teamName: 'The Well Done Stakes', abbreviation: 'WDS', joinedYear: 2018, isActive: false, espnUsername: 'twds', historicalTeamNames: { '2018': 'The Well Done Stakes' } },
  { ffuId: 'ffu-h04', sleeperId: 'historical-durham-handsome-devils', teamName: 'Durham Handsome Devils', abbreviation: 'DHD', joinedYear: 2018, isActive: false, espnUsername: 'devils', historicalTeamNames: { '2018': 'Durham Handsome Devils' } },
  { ffuId: 'ffu-h05', sleeperId: 'historical-the-losers', teamName: 'The Losers', abbreviation: 'TL', joinedYear: 2018, isActive: false, espnUsername: 'losers', historicalTeamNames: { '2018': 'The Losers', '2019': 'The Losers' } },
  { ffuId: 'ffu-h06', sleeperId: 'historical-gingy-flame', teamName: 'Gingy Flame', abbreviation: 'GF', joinedYear: 2018, isActive: false, espnUsername: 'flame', historicalTeamNames: { '2018': 'Gingy Flame', '2019': 'Gingy Flame' } },
  { ffuId: 'ffu-h07', sleeperId: 'historical-not-your-average-joes', teamName: 'Not Your Average Joes', abbreviation: 'NYAJ', joinedYear: 2018, isActive: false, espnUsername: 'joes', historicalTeamNames: { '2018': 'Not Your Average Joes' } },
  { ffuId: 'ffu-h08', sleeperId: 'historical-team-team-casa', teamName: 'Team Team Casa', abbreviation: 'TTC', joinedYear: 2018, isActive: false, espnUsername: 'casa', historicalTeamNames: { '2018': 'Team Team Casa' } },
];

// Helper functions for accessing data
export const getLeagueId = (tier: LeagueTier, year: string): string | undefined => {
  const league = LEAGUES.find(l => l.tier === tier && l.year === year);
  return league?.sleeperId;
};

export const getLeaguesByTier = (tier: LeagueTier): LeagueConfig[] => {
  return LEAGUES.filter(l => l.tier === tier).sort((a, b) => b.startYear - a.startYear);
};

export const getActiveLeagues = (): LeagueConfig[] => {
  return LEAGUES.filter(l => l.status === 'active');
};

export const getAllYears = (): string[] => {
  return [...new Set(LEAGUES.map(l => l.year))].sort((a, b) => b.localeCompare(a));
};

export const getUserById = (sleeperId: string): UserConfig | undefined => {
  return USERS.find(u => u.sleeperId === sleeperId);
};

export const getUserByFFUId = (ffuId: string): UserConfig | undefined => {
  return USERS.find(u => u.ffuId === ffuId);
};

export const getActiveUsers = (): UserConfig[] => {
  return USERS.filter(u => u.isActive);
};

export const getUsersByJoinYear = (year: number): UserConfig[] => {
  return USERS.filter(u => u.joinedYear === year);
};

// Additional helper functions for common queries
export const findUserBySleeperId = (sleeperId: string): UserConfig | null => {
  if (!sleeperId?.trim()) return null;
  return getUserById(sleeperId) || null;
};

export const findUserByFFUId = (ffuId: string): UserConfig | null => {
  if (!ffuId?.trim()) return null;
  return getUserByFFUId(ffuId) || null;
};

export const getUserInfoBySleeperId = (sleeperId: string): { teamName: string; abbreviation: string } | null => {
  if (!sleeperId?.trim()) return null;
  const user = getUserById(sleeperId);
  return user ? { teamName: user.teamName, abbreviation: user.abbreviation } : null;
};

export const getUserInfoByFFUId = (ffuId: string): { teamName: string; abbreviation: string } | null => {
  if (!ffuId?.trim()) return null;
  const user = getUserByFFUId(ffuId);
  return user ? { teamName: user.teamName, abbreviation: user.abbreviation } : null;
};

export const validateLeagueAndYear = (tier: LeagueTier, year: string): boolean => {
  if (!tier || !year?.trim()) return false;
  return LEAGUES.some(league => league.tier === tier && league.year === year);
};

export const getDefaultUserInfo = (): { teamName: string; abbreviation: string } => ({
  teamName: 'Unknown Team',
  abbreviation: 'UNK'
});

// Helper function to get current team name for a user
export const getCurrentTeamName = (userId: string, historicalTeamName: string): string => {
  if (!userId || !historicalTeamName) return historicalTeamName || 'Unknown Team';
  
  // Look up current team name
  const user = USERS.find(u => u.sleeperId === userId);
  if (!user || !user.teamName) return historicalTeamName;
  
  return user.teamName;
};

// Helper function to get current abbreviation for a user
export const getCurrentAbbreviation = (userId: string, historicalAbbreviation: string): string => {
  if (!userId || !historicalAbbreviation) return historicalAbbreviation || 'UNK';
  
  // Look up current abbreviation
  const user = USERS.find(u => u.sleeperId === userId);
  if (!user || !user.abbreviation) return historicalAbbreviation;
  
  return user.abbreviation;
};

// Helper function to display current team name (changed behavior - always shows current)
export const getDisplayTeamName = (userId: string, historicalTeamName: string, _year?: string): string => {
  // Always return current team name now
  return getCurrentTeamName(userId, historicalTeamName);
};

// Abbreviation mapping utilities for URL state management
export const getSleeperIdByAbbreviation = (abbreviation: string): string | null => {
  if (!abbreviation?.trim()) return null;
  const user = USERS.find(u => u.abbreviation.toLowerCase() === abbreviation.toLowerCase());
  return user?.sleeperId || null;
};

export const getAbbreviationBySleeperId = (sleeperId: string): string | null => {
  if (!sleeperId?.trim()) return null;
  const user = USERS.find(u => u.sleeperId === sleeperId);
  return user?.abbreviation || null;
};

export const getAbbreviationByFFUId = (ffuId: string): string | null => {
  if (!ffuId?.trim()) return null;
  const user = USERS.find(u => u.ffuId === ffuId);
  return user?.abbreviation || null;
};

export const isValidAbbreviation = (abbreviation: string): boolean => {
  if (!abbreviation?.trim()) return false;
  return USERS.some(u => u.abbreviation.toLowerCase() === abbreviation.toLowerCase());
};

export const getAllLeagueConfigs = (): LeagueConfig[] => {
  return [...LEAGUES].sort((a, b) => {
    if (a.year !== b.year) return b.year.localeCompare(a.year);
    const tierOrder: Record<LeagueTier, number> = { PREMIER: 0, MASTERS: 1, NATIONAL: 2 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });
};

export const LEAGUE_HIERARCHY = ['PREMIER', 'MASTERS', 'NATIONAL'] as const;

// Define which years are historical (cached) vs current (live API)
export const HISTORICAL_YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'] as const;
export const CURRENT_YEAR = '2025'; // Update this when the new season starts

export const isHistoricalYear = (year: string): boolean => {
  return HISTORICAL_YEARS.includes(year as any);
};

export const isCurrentYear = (year: string): boolean => {
  return year === CURRENT_YEAR;
};

// Helper function to check if any league is active for a given year
export const isActiveYear = (year: string): boolean => {
  return LEAGUES.some(league => league.year === year && league.status === 'active');
};

// Era-specific helper functions
export const getLeaguesByYear = (year: string): LeagueConfig[] => {
  const availableLeagues = getAvailableLeagues(year);
  return LEAGUES.filter(l => l.year === year && availableLeagues.includes(l.tier));
};

export const isValidLeagueForYear = (tier: LeagueTier, year: string): boolean => {
  return getAvailableLeagues(year).includes(tier);
};

// FFU ID Conversion Utilities - Critical for unified user system
export const getFFUIdBySleeperId = (sleeperId: string): string | null => {
  if (!sleeperId?.trim()) return null;
  const user = USERS.find(u => u.sleeperId === sleeperId);
  return user?.ffuId || null;
};

export const getSleeperIdByFFUId = (ffuId: string): string | null => {
  if (!ffuId?.trim()) return null;
  const user = USERS.find(u => u.ffuId === ffuId);
  return user?.sleeperId || null;
};

export const getFFUIdByAbbreviation = (abbreviation: string): string | null => {
  if (!abbreviation?.trim()) return null;
  const user = USERS.find(u => u.abbreviation.toLowerCase() === abbreviation.toLowerCase());
  return user?.ffuId || null;
};

// Validation utilities for FFU IDs
export const isValidFFUId = (ffuId: string): boolean => {
  if (!ffuId?.trim()) return false;
  return /^ffu-\d{3}$/.test(ffuId) && USERS.some(u => u.ffuId === ffuId);
};

// Backward compatibility adapters
export const convertSleeperIdToFFUId = (sleeperId: string): string | null => {
  return getFFUIdBySleeperId(sleeperId);
};

export const convertFFUIdToSleeperId = (ffuId: string): string | null => {
  return getSleeperIdByFFUId(ffuId);
};

// Historical team name utilities
export const getTeamNameForYear = (userId: string, year: string): string | null => {
  if (!userId?.trim() || !year?.trim()) return null;
  
  // Try to find user by Sleeper ID first (backward compatibility)
  let user = USERS.find(u => u.sleeperId === userId);
  
  // If not found, try by FFU ID
  if (!user) {
    user = USERS.find(u => u.ffuId === userId);
  }
  
  if (!user) return null;
  
  // Check if we have a historical team name for this year
  if (user.historicalTeamNames && user.historicalTeamNames[year]) {
    return user.historicalTeamNames[year];
  }
  
  // Fall back to current team name
  return user.teamName;
};

export const getTeamNameForYearByFFUId = (ffuId: string, year: string): string | null => {
  if (!ffuId?.trim() || !year?.trim()) return null;
  
  const user = USERS.find(u => u.ffuId === ffuId);
  if (!user) return null;
  
  // Check if we have a historical team name for this year
  if (user.historicalTeamNames && user.historicalTeamNames[year]) {
    return user.historicalTeamNames[year];
  }
  
  // Fall back to current team name
  return user.teamName;
};

export const hasHistoricalTeamName = (userId: string, year: string): boolean => {
  if (!userId?.trim() || !year?.trim()) return false;
  
  // Try to find user by Sleeper ID first (backward compatibility)
  let user = USERS.find(u => u.sleeperId === userId);
  
  // If not found, try by FFU ID
  if (!user) {
    user = USERS.find(u => u.ffuId === userId);
  }
  
  return !!(user?.historicalTeamNames?.[year]);
};

// Get all historical team names for a user
export const getAllHistoricalTeamNames = (userId: string): Record<string, string> => {
  if (!userId?.trim()) return {};
  
  // Try to find user by Sleeper ID first (backward compatibility)
  let user = USERS.find(u => u.sleeperId === userId);
  
  // If not found, try by FFU ID
  if (!user) {
    user = USERS.find(u => u.ffuId === userId);
  }
  
  return user?.historicalTeamNames || {};
};

// Re-export era detection utilities for convenience
export { isEspnEra, isSleeperEra, getAvailableLeagues };

// Type exports for the configs
export type { LeagueConfig, UserConfig };