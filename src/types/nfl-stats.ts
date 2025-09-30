export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'DEF' | 'K';

export interface NFLPlayer {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: PlayerPosition;
  team?: string;
  number?: number;
  active?: boolean;
}

export interface NFLPlayerStats {
  player_id: string;
  player?: NFLPlayer;
  week?: number;
  season?: string;
  season_type?: string;
  
  // Fantasy Points
  pts_ppr?: number;
  pts_std?: number;
  pts_half_ppr?: number;
  
  // Passing Stats (QB)
  pass_yd?: number;
  pass_td?: number;
  pass_int?: number;
  pass_att?: number;
  pass_cmp?: number;
  
  // Rushing Stats (QB, RB)
  rush_yd?: number;
  rush_td?: number;
  rush_att?: number;
  
  // Receiving Stats (RB, WR, TE)
  rec_yd?: number;
  rec_td?: number;
  rec?: number;
  rec_tgt?: number;
  
  // Fumbles
  fum?: number;
  fum_lost?: number;
  
  // First Downs
  pass_fd?: number;
  rush_fd?: number;
  rec_fd?: number;
  
  // Defense/Special Teams
  def_int?: number;
  def_fum_rec?: number;
  def_td?: number;
  def_sack?: number;
  def_safe?: number;
  def_safety?: number;
  def_pa?: number; // Points allowed
  def_pts_allowed?: number;
  def_ya?: number; // Yards allowed
  def_tackled_for_loss?: number;
  def_4_and_stop?: number;
  
  // Kicking
  fgm?: number; // Field goals made
  fga?: number; // Field goals attempted
  xpm?: number; // Extra points made
  xpa?: number; // Extra points attempted
}

export interface NFLWeeklyLeaders {
  quarterbacks: NFLPlayerStats[];
  runningBacks: NFLPlayerStats[];
  wideReceivers: NFLPlayerStats[];
  tightEnds: NFLPlayerStats[];
  defenses: NFLPlayerStats[];
}

export interface UseNFLStatsReturn {
  data: NFLWeeklyLeaders | null;
  isLoading: boolean;
  error?: string;
}