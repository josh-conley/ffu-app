import { SleeperService } from './sleeper.service';
import { adpProcessorService } from './adpProcessor.service';
import { memberDraftAnalysisService } from './memberDraftAnalysis.service';

export interface MockDraftMember {
  userId: string;
  displayName: string;
  teamName: string;
  draftPosition: number;
}

export interface MockDraftPlayer {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  adpRank: number;
  fantasyPositions: string[];
}

export interface MockDraftPick {
  pickNumber: number;
  round: number;
  pickInRound: number;
  userId: string;
  player: MockDraftPlayer | null;
  isAutoPick: boolean;
}

export interface MockDraftState {
  draftId: string;
  members: MockDraftMember[];
  currentPick: number;
  picks: MockDraftPick[];
  playerPool: MockDraftPlayer[];
  isComplete: boolean;
  settings: MockDraftSettings;
}

export interface MockDraftSettings {
  rounds: number;
  teams: number;
  snakeDraft: boolean;
  leagueId: string;
  draftYear: string;
}

export class MockDraftService {
  private sleeperService = new SleeperService();
  
  // 2025 Premier League ID
  private readonly PREMIER_LEAGUE_ID = '1256010768692805632';
  
  // Comprehensive 2025 fantasy football ADP rankings
  private readonly BASIC_ADP_RANKINGS: Array<{name: string, position: string, team: string, adpRank: number}> = [
    // Top 50 Overall (Rounds 1-4)
    { name: 'Christian McCaffrey', position: 'RB', team: 'SF', adpRank: 1 },
    { name: 'Josh Allen', position: 'QB', team: 'BUF', adpRank: 2 },
    { name: 'Tyreek Hill', position: 'WR', team: 'MIA', adpRank: 3 },
    { name: 'Bijan Robinson', position: 'RB', team: 'ATL', adpRank: 4 },
    { name: 'CeeDee Lamb', position: 'WR', team: 'DAL', adpRank: 5 },
    { name: 'Breece Hall', position: 'RB', team: 'NYJ', adpRank: 6 },
    { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET', adpRank: 7 },
    { name: 'Saquon Barkley', position: 'RB', team: 'PHI', adpRank: 8 },
    { name: 'A.J. Brown', position: 'WR', team: 'PHI', adpRank: 9 },
    { name: 'Jahmyr Gibbs', position: 'RB', team: 'DET', adpRank: 10 },
    { name: 'Lamar Jackson', position: 'QB', team: 'BAL', adpRank: 11 },
    { name: 'Jonathan Taylor', position: 'RB', team: 'IND', adpRank: 12 },
    { name: 'Ja\'Marr Chase', position: 'WR', team: 'CIN', adpRank: 13 },
    { name: 'Kenneth Walker III', position: 'RB', team: 'SEA', adpRank: 14 },
    { name: 'Puka Nacua', position: 'WR', team: 'LAR', adpRank: 15 },
    { name: 'Derrick Henry', position: 'RB', team: 'BAL', adpRank: 16 },
    { name: 'Mike Evans', position: 'WR', team: 'TB', adpRank: 17 },
    { name: 'De\'Von Achane', position: 'RB', team: 'MIA', adpRank: 18 },
    { name: 'DK Metcalf', position: 'WR', team: 'SEA', adpRank: 19 },
    { name: 'Davante Adams', position: 'WR', team: 'LV', adpRank: 20 },
    { name: 'Josh Jacobs', position: 'RB', team: 'GB', adpRank: 21 },
    { name: 'Cooper Kupp', position: 'WR', team: 'LAR', adpRank: 22 },
    { name: 'Travis Kelce', position: 'TE', team: 'KC', adpRank: 23 },
    { name: 'Stefon Diggs', position: 'WR', team: 'HOU', adpRank: 24 },
    { name: 'DeVonta Smith', position: 'WR', team: 'PHI', adpRank: 25 },
    { name: 'Alvin Kamara', position: 'RB', team: 'NO', adpRank: 26 },
    { name: 'Joe Mixon', position: 'RB', team: 'HOU', adpRank: 27 },
    { name: 'Chris Olave', position: 'WR', team: 'NO', adpRank: 28 },
    { name: 'Garrett Wilson', position: 'WR', team: 'NYJ', adpRank: 29 },
    { name: 'DJ Moore', position: 'WR', team: 'CHI', adpRank: 30 },
    { name: 'Jalen Hurts', position: 'QB', team: 'PHI', adpRank: 31 },
    { name: 'Jaylen Waddle', position: 'WR', team: 'MIA', adpRank: 32 },
    { name: 'Calvin Ridley', position: 'WR', team: 'TEN', adpRank: 33 },
    { name: 'Rachaad White', position: 'RB', team: 'TB', adpRank: 34 },
    { name: 'Tee Higgins', position: 'WR', team: 'CIN', adpRank: 35 },
    { name: 'Brandon Aiyuk', position: 'WR', team: 'SF', adpRank: 36 },
    { name: 'James Cook', position: 'RB', team: 'BUF', adpRank: 37 },
    { name: 'Nico Collins', position: 'WR', team: 'HOU', adpRank: 38 },
    { name: 'Mark Andrews', position: 'TE', team: 'BAL', adpRank: 39 },
    { name: 'Isiah Pacheco', position: 'RB', team: 'KC', adpRank: 40 },
    { name: 'Terry McLaurin', position: 'WR', team: 'WAS', adpRank: 41 },
    { name: 'Tank Dell', position: 'WR', team: 'HOU', adpRank: 42 },
    { name: 'Sam LaPorta', position: 'TE', team: 'DET', adpRank: 43 },
    { name: 'Kyren Williams', position: 'RB', team: 'LAR', adpRank: 44 },
    { name: 'George Pickens', position: 'WR', team: 'PIT', adpRank: 45 },
    { name: 'Rhamondre Stevenson', position: 'RB', team: 'NE', adpRank: 46 },
    { name: 'Amari Cooper', position: 'WR', team: 'CLE', adpRank: 47 },
    { name: 'Drake London', position: 'WR', team: 'ATL', adpRank: 48 },

    // Rounds 5-8 (Picks 49-96)
    { name: 'Dak Prescott', position: 'QB', team: 'DAL', adpRank: 49 },
    { name: 'Tony Pollard', position: 'RB', team: 'TEN', adpRank: 50 },
    { name: 'Keenan Allen', position: 'WR', team: 'CHI', adpRank: 51 },
    { name: 'Jordan Love', position: 'QB', team: 'GB', adpRank: 52 },
    { name: 'Trey McBride', position: 'TE', team: 'ARI', adpRank: 53 },
    { name: 'Rome Odunze', position: 'WR', team: 'CHI', adpRank: 54 },
    { name: 'Jayden Reed', position: 'WR', team: 'GB', adpRank: 55 },
    { name: 'Brian Robinson Jr.', position: 'RB', team: 'WAS', adpRank: 56 },
    { name: 'Christian Watson', position: 'WR', team: 'GB', adpRank: 57 },
    { name: 'Zay Flowers', position: 'WR', team: 'BAL', adpRank: 58 },
    { name: 'C.J. Stroud', position: 'QB', team: 'HOU', adpRank: 59 },
    { name: 'Najee Harris', position: 'RB', team: 'PIT', adpRank: 60 },
    { name: 'Marvin Harrison Jr.', position: 'WR', team: 'ARI', adpRank: 61 },
    { name: 'Tua Tagovailoa', position: 'QB', team: 'MIA', adpRank: 62 },
    { name: 'Diontae Johnson', position: 'WR', team: 'CAR', adpRank: 63 },
    { name: 'Travis Etienne Jr.', position: 'RB', team: 'JAX', adpRank: 64 },
    { name: 'Anthony Richardson', position: 'QB', team: 'IND', adpRank: 65 },
    { name: 'Michael Pittman Jr.', position: 'WR', team: 'IND', adpRank: 66 },
    { name: 'Aaron Jones', position: 'RB', team: 'MIN', adpRank: 67 },
    { name: 'Kyle Pitts', position: 'TE', team: 'ATL', adpRank: 68 },
    { name: 'Joe Burrow', position: 'QB', team: 'CIN', adpRank: 69 },
    { name: 'Courtland Sutton', position: 'WR', team: 'DEN', adpRank: 70 },
    { name: 'Malik Nabers', position: 'WR', team: 'NYG', adpRank: 71 },
    { name: 'Josh Downs', position: 'WR', team: 'IND', adpRank: 72 },
    { name: 'Dallas Goedert', position: 'TE', team: 'PHI', adpRank: 73 },
    { name: 'Saquon Barkley', position: 'RB', team: 'PHI', adpRank: 74 }, // Backup entry
    { name: 'Jayden Daniels', position: 'QB', team: 'WAS', adpRank: 75 },
    { name: 'Hollywood Brown', position: 'WR', team: 'KC', adpRank: 76 },
    { name: 'Gus Edwards', position: 'RB', team: 'LAC', adpRank: 77 },
    { name: 'Tyler Lockett', position: 'WR', team: 'SEA', adpRank: 78 },
    { name: 'David Montgomery', position: 'RB', team: 'DET', adpRank: 79 },
    { name: 'Khalil Shakir', position: 'WR', team: 'BUF', adpRank: 80 },
    
    // Rounds 9-12 (Picks 97-144)
    { name: 'Brock Bowers', position: 'TE', team: 'LV', adpRank: 97 },
    { name: 'DeAndre Washington', position: 'RB', team: 'MIA', adpRank: 98 },
    { name: 'Ladd McConkey', position: 'WR', team: 'LAC', adpRank: 99 },
    { name: 'Evan Engram', position: 'TE', team: 'JAX', adpRank: 100 },
    { name: 'Brock Purdy', position: 'QB', team: 'SF', adpRank: 101 },
    { name: 'Zamir White', position: 'RB', team: 'LV', adpRank: 102 },
    { name: 'Pat Freiermuth', position: 'TE', team: 'PIT', adpRank: 103 },
    { name: 'Jordan Mason', position: 'RB', team: 'SF', adpRank: 104 },
    { name: 'Tyler Boyd', position: 'WR', team: 'TEN', adpRank: 105 },
    { name: 'Jaxon Smith-Njigba', position: 'WR', team: 'SEA', adpRank: 106 },
    { name: 'Jerome Ford', position: 'RB', team: 'CLE', adpRank: 107 },
    { name: 'Wan\'Dale Robinson', position: 'WR', team: 'NYG', adpRank: 108 },
    { name: 'T.J. Hockenson', position: 'TE', team: 'MIN', adpRank: 109 },
    { name: 'Tyjae Spears', position: 'RB', team: 'TEN', adpRank: 110 },
    { name: 'Darnell Mooney', position: 'WR', team: 'ATL', adpRank: 111 },
    { name: 'Cole Kmet', position: 'TE', team: 'CHI', adpRank: 112 },
    { name: 'Chuba Hubbard', position: 'RB', team: 'CAR', adpRank: 113 },
    { name: 'Mike Williams', position: 'WR', team: 'NYJ', adpRank: 114 },
    { name: 'Austin Ekeler', position: 'RB', team: 'WAS', adpRank: 115 },
    { name: 'Jonnu Smith', position: 'TE', team: 'MIA', adpRank: 116 },
    { name: 'Xavier Worthy', position: 'WR', team: 'KC', adpRank: 117 },
    { name: 'Miles Sanders', position: 'RB', team: 'CAR', adpRank: 118 },
    { name: 'Curtis Samuel', position: 'WR', team: 'BUF', adpRank: 119 },
    { name: 'Tyler Higbee', position: 'TE', team: 'LAR', adpRank: 120 },

    // Late Rounds - DEF/K (Picks 145-180)
    { name: 'San Francisco', position: 'DEF', team: 'SF', adpRank: 145 },
    { name: 'Buffalo', position: 'DEF', team: 'BUF', adpRank: 146 },
    { name: 'Dallas', position: 'DEF', team: 'DAL', adpRank: 147 },
    { name: 'Pittsburgh', position: 'DEF', team: 'PIT', adpRank: 148 },
    { name: 'Baltimore', position: 'DEF', team: 'BAL', adpRank: 149 },
    { name: 'Miami', position: 'DEF', team: 'MIA', adpRank: 150 },
    { name: 'New York Jets', position: 'DEF', team: 'NYJ', adpRank: 151 },
    { name: 'Cleveland', position: 'DEF', team: 'CLE', adpRank: 152 },
    { name: 'Kansas City', position: 'DEF', team: 'KC', adpRank: 153 },
    { name: 'Philadelphia', position: 'DEF', team: 'PHI', adpRank: 154 },
    { name: 'Houston', position: 'DEF', team: 'HOU', adpRank: 155 },
    { name: 'Detroit', position: 'DEF', team: 'DET', adpRank: 156 },
    
  ];

  async get2025PremierMembers(): Promise<MockDraftMember[]> {
    try {
      const users = await this.sleeperService.getLeagueUsers(this.PREMIER_LEAGUE_ID);
      
      return users.map((user, index) => ({
        userId: user.user_id,
        displayName: user.display_name,
        teamName: (user as any).metadata?.team_name || user.display_name,
        draftPosition: index + 1, // Placeholder - will be set when user provides order
      }));
    } catch (error) {
      console.error('Failed to fetch 2025 Premier League members:', error);
      // Fallback to known members if API fails
      return this.getFallbackMembers();
    }
  }

  private getFallbackMembers(): MockDraftMember[] {
    return [
      { userId: '84006772809285632', displayName: 'JoshC94', teamName: 'The Minutemen', draftPosition: 1 },
      { userId: '331590801261883392', displayName: 'TheMurdockle', teamName: 'The Stallions', draftPosition: 2 },
      { userId: '399297882890440704', displayName: 'TCoolDaGoat', teamName: 'Circle City Phantoms', draftPosition: 3 },
      { userId: '399322397750124544', displayName: 'Jacamart', teamName: 'Jacamart', draftPosition: 4 },
      { userId: '465884883869233152', displayName: 'CamDelphia', teamName: 'CamDelphia', draftPosition: 5 },
      { userId: '467553389673181184', displayName: 'ExtremeSolution', teamName: 'Shton\'s Strikers', draftPosition: 6 },
      { userId: '470715135581745152', displayName: 'Pressthecot', teamName: 'Pottsville Maroons', draftPosition: 7 },
      { userId: '507633950666584064', displayName: 'DavrilOfKurth', teamName: 'El Guapo Puto', draftPosition: 8 },
      { userId: '508719015656099840', displayName: 'Jamauro', teamName: 'Team Pancake', draftPosition: 9 },
      { userId: '527884868880531456', displayName: 'ItsAllOgre', teamName: 'Johnkshire Cats', draftPosition: 10 },
      { userId: '710981985102802944', displayName: 'GooberX', teamName: 'GooberX', draftPosition: 11 },
      { userId: '727368657923063808', displayName: 'Haunter151', teamName: 'Fort Wayne Banana Bread', draftPosition: 12 },
    ];
  }

  async initializeMockDraft(draftOrder?: string[]): Promise<MockDraftState> {
    // Get league members
    const members = await this.get2025PremierMembers();
    
    // Apply user-provided draft order if given
    if (draftOrder && draftOrder.length === 12) {
      draftOrder.forEach((userId, index) => {
        const member = members.find(m => m.userId === userId);
        if (member) {
          member.draftPosition = index + 1;
        }
      });
      members.sort((a, b) => a.draftPosition - b.draftPosition);
    }

    // Create player pool from Sleeper API + ADP rankings
    const playerPool = await this.createPlayerPool();

    // Initialize draft state - 15 rounds for 1QB, 2RB, 2WR, 2FLEX, 1TE, 1DEF, 6BENCH
    const draftState: MockDraftState = {
      draftId: `mock_${Date.now()}`,
      members,
      currentPick: 1,
      picks: this.initializePicks(12, 15), // 12 teams, 15 rounds
      playerPool,
      isComplete: false,
      settings: {
        rounds: 15,
        teams: 12,
        snakeDraft: true,
        leagueId: this.PREMIER_LEAGUE_ID,
        draftYear: '2025',
      },
    };

    return draftState;
  }

  private async createPlayerPool(): Promise<MockDraftPlayer[]> {
    try {
      // Get processed ADP data from combined sources
      const adpPlayers = await adpProcessorService.processADPData();
      const sleeperPlayers = await this.sleeperService.getNFLPlayers();
      const pool: MockDraftPlayer[] = [];

      // Add ADP-ranked players with matched Sleeper data
      adpPlayers.forEach(adpPlayer => {
        // Find matching player in Sleeper data
        const sleeperPlayer = Object.entries(sleeperPlayers).find(
          ([, player]) => {
            const nameMatch = player.full_name?.toLowerCase().replace(/['']/g, '') === 
                             adpPlayer.name.toLowerCase().replace(/['']/g, '');
            const posMatch = player.position === adpPlayer.position;
            return nameMatch && posMatch;
          }
        );

        if (sleeperPlayer) {
          const [playerId, playerData] = sleeperPlayer;
          pool.push({
            playerId,
            fullName: playerData.full_name,
            position: playerData.position,
            team: playerData.team || adpPlayer.team,
            adpRank: adpPlayer.adpRank,
            fantasyPositions: playerData.fantasy_positions || [playerData.position],
          });
        } else {
          // Add player even without Sleeper match, using generated ID
          pool.push({
            playerId: `adp_${adpPlayer.adpRank}`,
            fullName: adpPlayer.name,
            position: adpPlayer.position,
            team: adpPlayer.team,
            adpRank: adpPlayer.adpRank,
            fantasyPositions: [adpPlayer.position],
          });
        }
      });

      // Add additional fantasy-relevant players from Sleeper not in ADP data
      const existingPlayerIds = new Set(pool.map(p => p.playerId));
      
      Object.entries(sleeperPlayers)
        .filter(([playerId, player]) => 
          player.fantasy_positions && 
          ['QB', 'RB', 'WR', 'TE', 'DEF'].includes(player.position) &&
          !existingPlayerIds.has(playerId)
        )
        .slice(0, 200) // Limit additional players
        .forEach(([playerId, player], index) => {
          pool.push({
            playerId,
            fullName: player.full_name || 'Unknown Player',
            position: player.position,
            team: player.team,
            adpRank: adpPlayers.length + index + 1,
            fantasyPositions: player.fantasy_positions,
          });
        });

      // Final deduplication by name and position
      const uniquePool = new Map<string, MockDraftPlayer>();
      
      pool.forEach(player => {
        const key = `${player.fullName.toLowerCase().replace(/['']/g, '')}_${player.position}`;
        const existing = uniquePool.get(key);
        
        // Keep the player with the better (lower) ADP rank
        if (!existing || player.adpRank < existing.adpRank) {
          uniquePool.set(key, player);
        }
      });
      
      return Array.from(uniquePool.values()).sort((a, b) => a.adpRank - b.adpRank);
    } catch (error) {
      console.error('Failed to create player pool:', error);
      return this.getFallbackPlayerPool();
    }
  }

  private getFallbackPlayerPool(): MockDraftPlayer[] {
    return this.BASIC_ADP_RANKINGS.map((player, index) => ({
      playerId: `fallback_${index}`,
      fullName: player.name,
      position: player.position,
      team: player.team,
      adpRank: player.adpRank,
      fantasyPositions: [player.position],
    }));
  }

  private initializePicks(teams: number, rounds: number): MockDraftPick[] {
    const picks: MockDraftPick[] = [];
    
    for (let round = 1; round <= rounds; round++) {
      for (let pick = 1; pick <= teams; pick++) {
        const pickNumber = (round - 1) * teams + pick;
        
        // Snake draft logic
        const actualPick = round % 2 === 1 ? pick : teams - pick + 1;
        
        picks.push({
          pickNumber,
          round,
          pickInRound: actualPick,
          userId: '', // Will be filled when determining picking order
          player: null,
          isAutoPick: false,
        });
      }
    }
    
    return picks;
  }

  makePick(draftState: MockDraftState, playerId: string, isAutoPick = false): MockDraftState {
    const currentPickObj = draftState.picks[draftState.currentPick - 1];
    const player = draftState.playerPool.find(p => p.playerId === playerId);
    
    if (!currentPickObj || !player) {
      return draftState;
    }

    // Determine which user is picking (snake draft)
    const pickingMember = this.getPickingMember(draftState, draftState.currentPick);
    
    currentPickObj.userId = pickingMember.userId;
    currentPickObj.player = player;
    currentPickObj.isAutoPick = isAutoPick;
    
    // Remove player from pool
    draftState.playerPool = draftState.playerPool.filter(p => p.playerId !== playerId);
    
    // Advance to next pick
    draftState.currentPick++;
    
    // Check if draft is complete
    if (draftState.currentPick > draftState.settings.teams * draftState.settings.rounds) {
      draftState.isComplete = true;
    }
    
    return { ...draftState };
  }

  private getPickingMember(draftState: MockDraftState, pickNumber: number): MockDraftMember {
    const round = Math.ceil(pickNumber / draftState.settings.teams);
    const pickInRound = ((pickNumber - 1) % draftState.settings.teams) + 1;
    
    // Snake draft logic
    const actualPosition = round % 2 === 1 ? pickInRound : draftState.settings.teams - pickInRound + 1;
    
    return draftState.members[actualPosition - 1];
  }

  async getAIPickForUser(draftState: MockDraftState, userId: string): Promise<MockDraftPlayer | null> {
    const userPicks = draftState.picks.filter(p => p.userId === userId && p.player);
    const round = Math.ceil(draftState.currentPick / draftState.settings.teams);
    const currentRoster = userPicks.map(p => p.player!);
    
    // Try member-specific prediction first
    const memberPrediction = await this.getMemberSpecificPrediction(draftState, userId, userPicks, round);
    if (memberPrediction) {
      return memberPrediction;
    }

    // Fallback to enhanced generic logic if member analysis isn't available
    return this.getFallbackAIPick(draftState, currentRoster, round);
  }

  /**
   * Get member-specific prediction using historical analysis
   */
  private async getMemberSpecificPrediction(
    draftState: MockDraftState, 
    userId: string, 
    userPicks: MockDraftPick[], 
    round: number
  ): Promise<MockDraftPlayer | null> {
    try {
      // Ensure member profiles are loaded
      await memberDraftAnalysisService.generateMemberProfiles();
      
      // Convert current roster to analysis format
      const currentRoster = userPicks.map(pick => ({
        position: pick.player!.position,
        round: pick.round || round
      }));

      // Convert available players to analysis format
      const availablePlayers = draftState.playerPool.map(player => ({
        position: player.position,
        adpRank: player.adpRank
      }));

      // Get draft position for this user
      const draftPosition = draftState.members.findIndex(m => m.userId === userId) + 1;

      // Analyze board context for scarcity and runs
      const boardContext = this.analyzeBoardContext(draftState, round);

      // Get member-specific prediction
      const prediction = memberDraftAnalysisService.predictMemberPick(
        userId,
        currentRoster,
        availablePlayers,
        round,
        draftPosition,
        boardContext
      );

      if (!prediction) {
        return null;
      }

      // Find the best available player for the predicted position
      const positionCandidates = draftState.playerPool
        .filter(player => player.position === prediction.position)
        .slice(0, 5); // Top 5 available at position

      if (positionCandidates.length === 0) {
        return null;
      }

      // Apply member-specific value preferences within the position
      return this.selectPlayerWithinPosition(positionCandidates, prediction.confidence);

    } catch (error) {
      console.warn('Member-specific prediction failed:', error);
      return null;
    }
  }

  /**
   * Analyze current board context for position runs and scarcity
   */
  private analyzeBoardContext(draftState: MockDraftState, currentRound: number): { positionRuns?: string[]; scarcityAlerts?: string[] } {
    const recentPicks = draftState.picks
      .filter(pick => pick.player !== null)
      .slice(-6) // Last 6 picks
      .map(pick => pick.player!.position);

    const positionRuns: string[] = [];
    const scarcityAlerts: string[] = [];

    // Check for position runs (3+ of same position in recent picks)
    if (recentPicks.length >= 3) {
      const positionCounts: Record<string, number> = {};
      for (const position of recentPicks) {
        positionCounts[position] = (positionCounts[position] || 0) + 1;
      }

      for (const [position, count] of Object.entries(positionCounts)) {
        if (count >= 3) {
          positionRuns.push(position);
        } else if (count >= 2) {
          scarcityAlerts.push(position);
        }
      }
    }

    // Check position scarcity based on remaining players
    const positionCounts: Record<string, number> = {};
    for (const player of draftState.playerPool.slice(0, 20)) { // Top 20 available
      positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
    }

    for (const [position, count] of Object.entries(positionCounts)) {
      if (count <= 2 && currentRound <= 10) { // Scarcity in early-mid rounds
        scarcityAlerts.push(position);
      }
    }

    return { positionRuns, scarcityAlerts };
  }

  /**
   * Select specific player within a position based on member preferences
   */
  private selectPlayerWithinPosition(candidates: MockDraftPlayer[], confidence: number): MockDraftPlayer {
    // For now, use confidence to determine how much to deviate from ADP
    if (confidence > 0.8) {
      // High confidence: stick closer to ADP (best available)
      return candidates[0];
    } else if (confidence > 0.6) {
      // Medium confidence: slight preference for value or upside
      const randomIndex = Math.random() < 0.7 ? 0 : Math.min(1, candidates.length - 1);
      return candidates[randomIndex];
    } else {
      // Lower confidence: more variation in selection
      const randomIndex = Math.floor(Math.random() * Math.min(3, candidates.length));
      return candidates[randomIndex];
    }
  }

  /**
   * Enhanced fallback AI logic when member analysis isn't available
   */
  private getFallbackAIPick(draftState: MockDraftState, currentRoster: MockDraftPlayer[], round: number): MockDraftPlayer | null {
    // Get realistic position needs based on roster construction
    const neededPositions = this.getRealisticPositionNeeds(currentRoster, round);
    
    // Filter available players by position need
    const candidates = draftState.playerPool.filter(player => 
      neededPositions.includes(player.position)
    );
    
    if (candidates.length === 0) {
      // Fall back to best available player
      return draftState.playerPool[0] || null;
    }
    
    // Apply enhanced draft strategy variations
    return this.applyEnhancedDraftStrategy(candidates, round, currentRoster);
  }

  /**
   * Enhanced draft strategy logic for fallback scenarios
   */
  private applyEnhancedDraftStrategy(candidates: MockDraftPlayer[], round: number, currentRoster: MockDraftPlayer[]): MockDraftPlayer {
    const positionCounts = currentRoster.reduce((acc, player) => {
      acc[player.position] = (acc[player.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Early rounds: Prioritize skill positions and elite talents
    if (round <= 6) {
      // Prioritize RB/WR in early rounds
      const skillPositionCandidates = candidates.filter(p => ['RB', 'WR'].includes(p.position));
      if (skillPositionCandidates.length > 0) {
        // 80% chance to take skill position, 20% chance to consider other positions
        if (Math.random() < 0.8) {
          return skillPositionCandidates[0];
        }
      }

      // Consider elite QB if available and no QB yet
      if ((positionCounts.QB || 0) === 0) {
        const eliteQBs = candidates.filter(p => p.position === 'QB' && p.adpRank <= 50);
        if (eliteQBs.length > 0 && Math.random() < 0.3) {
          return eliteQBs[0];
        }
      }

      // Consider elite TE if available and no TE yet
      if ((positionCounts.TE || 0) === 0) {
        const eliteTEs = candidates.filter(p => p.position === 'TE' && p.adpRank <= 30);
        if (eliteTEs.length > 0 && Math.random() < 0.4) {
          return eliteTEs[0];
        }
      }
    }

    // Mid rounds: Address positional needs
    if (round >= 7 && round <= 12) {
      // Prioritize QB if still needed
      if ((positionCounts.QB || 0) === 0) {
        const qbs = candidates.filter(p => p.position === 'QB');
        if (qbs.length > 0 && Math.random() < 0.7) {
          return qbs[0];
        }
      }

      // Prioritize TE if still needed
      if ((positionCounts.TE || 0) === 0) {
        const tes = candidates.filter(p => p.position === 'TE');
        if (tes.length > 0 && Math.random() < 0.6) {
          return tes[0];
        }
      }
    }

    // Late rounds: Fill remaining needs and get depth
    if (round >= 13) {
      // Must get DEF if don't have one
      if ((positionCounts.DEF || 0) === 0) {
        const defenses = candidates.filter(p => p.position === 'DEF');
        if (defenses.length > 0) {
          return defenses[0];
        }
      }

      // Get backup QB if only have one
      if ((positionCounts.QB || 0) === 1) {
        const qbs = candidates.filter(p => p.position === 'QB');
        if (qbs.length > 0 && Math.random() < 0.4) {
          return qbs[0];
        }
      }
    }

    // Default: take best available
    return candidates[0];
  }

  private getRealisticPositionNeeds(currentRoster: MockDraftPlayer[], round: number): string[] {
    const positionCounts = currentRoster.reduce((acc, player) => {
      acc[player.position] = (acc[player.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const needs: string[] = [];
    
    // Required roster: 1QB, 2RB, 2WR, 2FLEX (RB/WR/TE), 1TE, 1DEF, 6BENCH
    // Optimal draft approach: Get solid starters first, then depth
    
    const qbCount = positionCounts.QB || 0;
    const rbCount = positionCounts.RB || 0;
    const wrCount = positionCounts.WR || 0;
    const teCount = positionCounts.TE || 0;
    const defCount = positionCounts.DEF || 0;
    
    // Early rounds (1-6): Focus on premium skill positions
    if (round <= 6) {
      // RB/WR heavy early - need at least 2-3 RBs and 2-3 WRs for starting lineup + flex
      if (rbCount < 2 || (rbCount < 3 && round <= 4)) needs.push('RB');
      if (wrCount < 2 || (wrCount < 3 && round <= 4)) needs.push('WR');
      
      // Elite QB or TE if available
      if (qbCount === 0 && round >= 2) needs.push('QB');
      if (teCount === 0 && round >= 4) needs.push('TE');
    } 
    // Mid rounds (7-10): Fill starters and get depth
    else if (round <= 10) {
      // Ensure we have starting lineup covered
      if (qbCount === 0) needs.push('QB');
      if (rbCount < 3) needs.push('RB'); // Need depth for bye weeks/injuries
      if (wrCount < 4) needs.push('WR'); // Need WR depth
      if (teCount === 0) needs.push('TE');
      
      // Start considering depth pieces
      if (rbCount >= 2) needs.push('WR'); // Prioritize WR depth over RB depth
      if (wrCount >= 3) needs.push('RB');
    }
    // Late rounds (11-14): Depth and QB2
    else if (round <= 14) {
      // Get backup QB
      if (qbCount < 2) needs.push('QB');
      
      // Continue building depth
      needs.push('RB', 'WR', 'TE');
      
      // Additional TE for depth/matchups
      if (teCount < 2) needs.push('TE');
    }
    // Final round (15): DEF only
    else {
      if (defCount === 0) needs.push('DEF');
      else needs.push('RB', 'WR'); // Extra depth if DEF already picked
    }
    
    return needs.length > 0 ? needs : ['RB', 'WR'];
  }


  async autoPickForCurrentUser(draftState: MockDraftState): Promise<MockDraftState> {
    const pickingMember = this.getPickingMember(draftState, draftState.currentPick);
    const aiPick = await this.getAIPickForUser(draftState, pickingMember.userId);
    
    if (aiPick) {
      return this.makePick(draftState, aiPick.playerId, true);
    }
    
    return draftState;
  }

  getDraftResults(draftState: MockDraftState): Record<string, MockDraftPick[]> {
    const results: Record<string, MockDraftPick[]> = {};
    
    draftState.members.forEach(member => {
      results[member.userId] = draftState.picks
        .filter(pick => pick.userId === member.userId && pick.player)
        .sort((a, b) => a.pickNumber - b.pickNumber);
    });
    
    return results;
  }
}

export const mockDraftService = new MockDraftService();