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
  { sleeperId: '1124841088360660992', year: '2024', tier: 'PREMIER', status: 'active', startYear: 2024 },
  { sleeperId: '989237166217723904', year: '2023', tier: 'PREMIER', status: 'completed', startYear: 2023 },
  { sleeperId: '856271024054996992', year: '2022', tier: 'PREMIER', status: 'completed', startYear: 2022 },
  { sleeperId: '710961812656455680', year: '2021', tier: 'PREMIER', status: 'completed', startYear: 2021 },
  { sleeperId: 'espn-2020-premier', year: '2020', tier: 'PREMIER', status: 'completed', startYear: 2020 },
  { sleeperId: 'espn-2019-premier', year: '2019', tier: 'PREMIER', status: 'completed', startYear: 2019 },
  { sleeperId: 'espn-2018-premier', year: '2018', tier: 'PREMIER', status: 'completed', startYear: 2018 },
  
  // MASTERS LEAGUE  
  { sleeperId: '1124833010697379840', year: '2024', tier: 'MASTERS', status: 'active', startYear: 2024 },
  { sleeperId: '989238596353794048', year: '2023', tier: 'MASTERS', status: 'completed', startYear: 2023 },
  { sleeperId: '856271401471029248', year: '2022', tier: 'MASTERS', status: 'completed', startYear: 2022 },
  // Note: No Masters league in ESPN era (2018-2020)
  
  // NATIONAL LEAGUE
  { sleeperId: '1124834889196134400', year: '2024', tier: 'NATIONAL', status: 'active', startYear: 2024 },
  { sleeperId: '989240797381951488', year: '2023', tier: 'NATIONAL', status: 'completed', startYear: 2023 },
  { sleeperId: '856271753788403712', year: '2022', tier: 'NATIONAL', status: 'completed', startYear: 2022 },
  { sleeperId: '726573082608775168', year: '2021', tier: 'NATIONAL', status: 'completed', startYear: 2021 },
  { sleeperId: 'espn-2020-national', year: '2020', tier: 'NATIONAL', status: 'completed', startYear: 2020 },
  { sleeperId: 'espn-2019-national', year: '2019', tier: 'NATIONAL', status: 'completed', startYear: 2019 },
  { sleeperId: 'espn-2018-national', year: '2018', tier: 'NATIONAL', status: 'completed', startYear: 2018 },
];

// Master user configuration - single source of truth
export const USERS: UserConfig[] = [
  { sleeperId: '331590801261883392', teamName: 'The Stallions', abbreviation: 'STA', joinedYear: 2021, isActive: true },
  { sleeperId: '396808818157182976', teamName: 'FFUcked Up', abbreviation: 'FU', joinedYear: 2021, isActive: true },
  { sleeperId: '398574272387297280', teamName: 'Dmandre161', abbreviation: 'DMAN', joinedYear: 2021, isActive: true },
  { sleeperId: '398576262546735104', teamName: 'Blood, Sweat, and Beers', abbreviation: 'BEER', joinedYear: 2021, isActive: true },
  { sleeperId: '467404039059927040', teamName: 'Malibu Leopards', abbreviation: 'MLBU', joinedYear: 2021, isActive: true },
  { sleeperId: '470715135581745152', teamName: 'Pottsville Maroons', abbreviation: 'POTT', joinedYear: 2021, isActive: true },
  { sleeperId: '705642514408886272', teamName: 'The Dark Knights', abbreviation: 'BATS', joinedYear: 2021, isActive: true },
  { sleeperId: '710981985102802944', teamName: 'Frank\'s Little Beauties', abbreviation: 'FLB', joinedYear: 2021, isActive: true },
  { sleeperId: '727368657923063808', teamName: 'Fort Wayne Banana Bread', abbreviation: 'FWBB', joinedYear: 2021, isActive: true },
  { sleeperId: '729741648338210816', teamName: 'ChicagoPick6', abbreviation: 'CP6', joinedYear: 2021, isActive: true },
  { sleeperId: '798327505219096576', teamName: 'TKO Blow', abbreviation: 'TKO', joinedYear: 2021, isActive: true },
  { sleeperId: '860973514839199744', teamName: 'Show Biz Kitten', abbreviation: 'SBK', joinedYear: 2021, isActive: true },
  { sleeperId: '862142522036703232', teamName: 'Boca Ciega Banditos', abbreviation: 'BOCA', joinedYear: 2021, isActive: true },
  { sleeperId: '84604928349585408', teamName: 'The (Teddy) Bears', abbreviation: 'TTB', joinedYear: 2021, isActive: true },
  { sleeperId: '398552306884345856', teamName: 'arcorey15', abbreviation: 'ARCO', joinedYear: 2021, isActive: true },
  { sleeperId: '578691097983754240', teamName: 'MustachePapi', abbreviation: 'MUST', joinedYear: 2021, isActive: true },
  { sleeperId: '602712418325442560', teamName: 'The Riveters', abbreviation: 'RVTR', joinedYear: 2021, isActive: true },
  { sleeperId: '804551335088361472', teamName: 'Crawfordsville\'s Finest', abbreviation: 'CRAW', joinedYear: 2021, isActive: true },
  { sleeperId: '821067488811909120', teamName: 'LegendsRise', abbreviation: 'RISE', joinedYear: 2021, isActive: true },
  { sleeperId: '856248808915480576', teamName: 'The Tooth Tuggers', abbreviation: 'TT', joinedYear: 2021, isActive: true },
  { sleeperId: '864966364937461760', teamName: 'Nighthawks', abbreviation: 'HAWK', joinedYear: 2021, isActive: true },
  { sleeperId: '865078270985629696', teamName: 'The Gaston Ramblers', abbreviation: 'TGR', joinedYear: 2021, isActive: true },
  { sleeperId: '84006772809285632', teamName: 'The Minutemen', abbreviation: 'MMEN', joinedYear: 2021, isActive: true },
  { sleeperId: '325766631336714240', teamName: 'Act More Stupidly', abbreviation: 'AMS', joinedYear: 2021, isActive: true },
  { sleeperId: '386791325690994688', teamName: 'Indianapolis Aztecs', abbreviation: 'AZTC', joinedYear: 2021, isActive: true },
  { sleeperId: '462383465753473024', teamName: 'Raging Rhinos', abbreviation: 'RAGE', joinedYear: 2021, isActive: true },
  { sleeperId: '465884883869233152', teamName: 'CamDelphia', abbreviation: 'CAM', joinedYear: 2021, isActive: true },
  { sleeperId: '507633950666584064', teamName: 'El Guapo Puto', abbreviation: 'EGP', joinedYear: 2021, isActive: true },
  { sleeperId: '508719015656099840', teamName: 'Team Pancake', abbreviation: 'TP', joinedYear: 2021, isActive: true },
  { sleeperId: '527884868880531456', teamName: 'Johnkshire Cats', abbreviation: 'CATS', joinedYear: 2021, isActive: true },
  { sleeperId: '726572095210930176', teamName: 'Team Dogecoin', abbreviation: 'DOGE', joinedYear: 2021, isActive: true },
  { sleeperId: '731211092713402368', teamName: 'Team Dogecoin', abbreviation: 'DOGE', joinedYear: 2021, isActive: true },
  { sleeperId: '639877229681147904', teamName: 'He Hate Me', abbreviation: 'HATE', joinedYear: 2021, isActive: true },
  { sleeperId: '664739261735591936', teamName: 'CENATION', abbreviation: 'CENA', joinedYear: 2021, isActive: true },
  { sleeperId: '715362669380591616', teamName: 'ZBoser', abbreviation: 'ZBOS', joinedYear: 2021, isActive: true },
  { sleeperId: '727366898383122432', teamName: 'Big Ten Bandits', abbreviation: 'B1G', joinedYear: 2021, isActive: true },
  { sleeperId: '865323291064291328', teamName: 'Head Cow Always Grazing', abbreviation: 'HCAG', joinedYear: 2021, isActive: true },
  { sleeperId: '1124071986805829632', teamName: 'Odin\'s Herr', abbreviation: 'ODIN', joinedYear: 2024, isActive: true },
  { sleeperId: '1133491276038426624', teamName: 'Bucky Badgers', abbreviation: 'BDGR', joinedYear: 2024, isActive: true },
  { sleeperId: '1133492104077946880', teamName: 'The Sha\'Dynasty', abbreviation: 'NSTY', joinedYear: 2024, isActive: true },
  { sleeperId: '399322397750124544', teamName: 'Team Jacamart', abbreviation: 'JACA', joinedYear: 2021, isActive: true },
  { sleeperId: '472876832719368192', teamName: 'Stark Direwolves', abbreviation: 'STRK', joinedYear: 2021, isActive: true },
  { sleeperId: '399297882890440704', teamName: 'Circle City Phantoms', abbreviation: 'CCP', joinedYear: 2021, isActive: true },
  { sleeperId: '467553389673181184', teamName: 'Shton\'s Strikers', abbreviation: 'SHTN', joinedYear: 2021, isActive: true },
  { sleeperId: '599711204499312640', teamName: 'Drixxlepix48', abbreviation: 'DRIX', joinedYear: 2021, isActive: true },
  { sleeperId: '739275676649144320', teamName: 'Birds of War', abbreviation: 'BOW', joinedYear: 2021, isActive: true },
  { sleeperId: '563223565497249792', teamName: 'bstarrr', abbreviation: 'BSTA', joinedYear: 2021, isActive: true },
  { sleeperId: '1003144735223099392', teamName: 'dewdoc', abbreviation: 'DEW', joinedYear: 2021, isActive: true },
  { sleeperId: '726584695151734784', teamName: 'The Ducklings', abbreviation: 'DUCK', joinedYear: 2021, isActive: true },
  { sleeperId: '729571025750208512', teamName: 'chetmaynard', abbreviation: 'CHET', joinedYear: 2021, isActive: true },
  { sleeperId: '399379352174768128', teamName: 'Stone Cold Steve Irwins', abbreviation: 'SCSI', joinedYear: 2021, isActive: true },
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

export const getUserInfoBySleeperId = (sleeperId: string): { teamName: string; abbreviation: string } | null => {
  if (!sleeperId?.trim()) return null;
  const user = getUserById(sleeperId);
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

// Era-specific helper functions
export const getLeaguesByYear = (year: string): LeagueConfig[] => {
  const availableLeagues = getAvailableLeagues(year);
  return LEAGUES.filter(l => l.year === year && availableLeagues.includes(l.tier));
};

export const isValidLeagueForYear = (tier: LeagueTier, year: string): boolean => {
  return getAvailableLeagues(year).includes(tier);
};

// Re-export era detection utilities for convenience
export { isEspnEra, isSleeperEra, getAvailableLeagues };

// Type exports for the configs
export type { LeagueConfig, UserConfig };