import type { 
  SleeperPlayer, 
  DraftPick, 
  HistoricalTeamData, 
  PlayerTeamMapping
} from '../types';

interface HistoricalTeamCache {
  lastUpdated: string;
  totalPlayers: number;
  totalSeasonEntries: number;
  dataSourceSeasons: number[];
  historicalTeams: HistoricalTeamData;
}

interface PlayerMappingsCache {
  lastUpdated: string;
  totalMappings: number;
  mappings: PlayerTeamMapping[];
}

export class HistoricalTeamResolver {
  private historicalTeamData: HistoricalTeamData | null = null;
  private playerMappings: Map<string, PlayerTeamMapping> = new Map();
  private dataLoaded = false;
  private baseUrl = import.meta.env.MODE === 'production' ? '/ffu-app' : '';

  // Sleeper era years (when historical team data is needed)
  private readonly SLEEPER_ERA_START = 2021;

  // Map NFLverse team abbreviations to standard NFL abbreviations
  private normalizeTeamAbbreviation(team: string, draftYear?: number): string {
    const teamMap: Record<string, string> = {
      'LA': 'LAR',  // NFLverse uses "LA" for Rams, but we want "LAR"
      // 'LAC' stays as 'LAC' for Chargers
    };
    
    let normalizedTeam = teamMap[team] || team;
    
    // Apply historical team corrections based on draft year
    if (draftYear) {
      normalizedTeam = this.applyHistoricalTeamCorrections(normalizedTeam, draftYear);
    }
    
    return normalizedTeam;
  }

  // Apply historical team name corrections based on the year
  private applyHistoricalTeamCorrections(team: string, year: number): string {
    // Raiders: Oakland (OAK) through 2019, Las Vegas (LV) from 2020+
    if (team === 'LV' && year <= 2019) {
      return 'OAK';
    }
    
    // Future: Can add other team relocations/name changes here
    // e.g., Chargers: SD -> LAC in 2017
    // e.g., Rams: STL -> LA in 2016
    
    return team;
  }

  async loadHistoricalData(): Promise<void> {
    if (this.dataLoaded) return;

    try {
      // Load historical team data
      const historicalResponse = await fetch(`${this.baseUrl}/data/historical-teams/historical-teams.json`);
      if (historicalResponse.ok) {
        const historicalCache: HistoricalTeamCache = await historicalResponse.json();
        this.historicalTeamData = historicalCache.historicalTeams;
        console.log(`Loaded historical team data for ${historicalCache.totalPlayers} players`);
      } else {
        console.warn('Historical team data not available - run fetch-historical-teams.js');
      }

      // Load player mappings
      const mappingsResponse = await fetch(`${this.baseUrl}/data/historical-teams/player-mappings.json`);
      if (mappingsResponse.ok) {
        const mappingsCache: PlayerMappingsCache = await mappingsResponse.json();
        mappingsCache.mappings.forEach(mapping => {
          this.playerMappings.set(mapping.sleeperId, mapping);
        });
        console.log(`Loaded ${mappingsCache.totalMappings} player mappings`);
      } else {
        console.warn('Player mappings not available - run fetch-historical-teams.js');
      }

      this.dataLoaded = true;
    } catch (error) {
      console.error('Failed to load historical team data:', error);
      // Continue without historical data - fallback to current teams
    }
  }

  // Check if a year is in the Sleeper era (when historical data should be applied)
  private isSleeperEra(year: number): boolean {
    return year >= this.SLEEPER_ERA_START;
  }

  // Check if a year is in the ESPN era
  private isEspnEra(year: number): boolean {
    return year >= 2018 && year <= 2020;
  }

  async resolvePlayerTeam(
    playerId: string,
    playerData: SleeperPlayer,
    draftYear: number,
    playerName?: string,
    playerPosition?: string
  ): Promise<string | null> {
    // Load historical data if we need it for any era
    if (this.isSleeperEra(draftYear) || this.isEspnEra(draftYear)) {
      await this.loadHistoricalData();
    }

    // Sleeper era: always try historical team data first
    if (this.isSleeperEra(draftYear)) {
      if (this.historicalTeamData && this.playerMappings.has(playerId)) {
        const mapping = this.playerMappings.get(playerId)!;
        const historicalTeam = this.historicalTeamData[mapping.nflverseKey]?.[draftYear]?.team;
        
        if (historicalTeam) {
          return historicalTeam;
        }
      }
    }
    
    // ESPN era: only use historical data if current team is "FA"
    if (this.isEspnEra(draftYear) && playerData.team === 'FA') {
      // For ESPN era, try name-based lookup since ESPN player IDs don't match Sleeper
      if (this.historicalTeamData && playerName && playerPosition) {
        const historicalTeam = this.findTeamByNameAndPosition(playerName, playerPosition, draftYear);
        if (historicalTeam) {
          return historicalTeam;
        }
      }
      
      // Also try the regular mapping if available (fallback)
      if (this.historicalTeamData && this.playerMappings.has(playerId)) {
        const mapping = this.playerMappings.get(playerId)!;
        const historicalTeam = this.historicalTeamData[mapping.nflverseKey]?.[draftYear]?.team;
        
        if (historicalTeam) {
          return historicalTeam;
        }
      }
    }

    // Fallback to current team data with historical corrections
    const currentTeam = playerData.team;
    return currentTeam ? this.applyHistoricalTeamCorrections(currentTeam, draftYear) : null;
  }

  // Find team by player name and position for ESPN era players
  private findTeamByNameAndPosition(playerName: string, position: string, season: number): string | null {
    if (!this.historicalTeamData) return null;
    
    const normalizedName = this.normalizePlayerName(playerName);
    const normalizedPosition = position.toUpperCase();
    
    // Search through historical team data for name/position match
    for (const seasonData of Object.values(this.historicalTeamData)) {
      const seasonInfo = seasonData[season];
      if (seasonInfo) {
        const historicalName = this.normalizePlayerName(seasonInfo.full_name);
        const historicalPosition = seasonInfo.position.toUpperCase();
        
        if (historicalName === normalizedName && historicalPosition === normalizedPosition) {
          return seasonInfo.team;
        }
      }
    }
    
    return null;
  }

  private normalizePlayerName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.\-']/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  async enhanceDraftPick(
    pick: DraftPick,
    playerData: Record<string, SleeperPlayer>,
    draftYear: number
  ): Promise<DraftPick> {
    const player = playerData[pick.playerId];
    
    // For ESPN era picks without Sleeper data, create a mock player object
    const playerToUse = player || {
      player_id: pick.playerId,
      team: pick.playerInfo.team,
      full_name: pick.playerInfo.name,
      position: pick.playerInfo.position
    } as SleeperPlayer;

    const historicalTeam = await this.resolvePlayerTeam(
      pick.playerId, 
      playerToUse, 
      draftYear,
      pick.playerInfo.name,  // Pass name for ESPN era lookups
      pick.playerInfo.position // Pass position for ESPN era lookups
    );
    
    // Only set historicalTeam if it's different from current team
    const enhancedPick: DraftPick = {
      ...pick,
      playerInfo: {
        ...pick.playerInfo,
        historicalTeam: (historicalTeam && historicalTeam !== pick.playerInfo.team) ? historicalTeam : undefined
      }
    };

    return enhancedPick;
  }

  async enhanceDraftData(
    picks: DraftPick[],
    playerData: Record<string, SleeperPlayer>,
    draftYear: number
  ): Promise<DraftPick[]> {
    // Check if we should apply historical team enhancements
    if (!this.isSleeperEra(draftYear) && !this.isEspnEra(draftYear)) {
      console.log(`📝 ${draftYear} is before our historical data coverage - no enhancements applied`);
      return picks;
    }

    if (this.isSleeperEra(draftYear)) {
      console.log(`🔍 Enhancing Sleeper era ${draftYear} draft with historical team data...`);
    } else if (this.isEspnEra(draftYear)) {
      const faCount = picks.filter(pick => pick.playerInfo.team === 'FA').length;
      console.log(`🔧 Fixing ESPN era ${draftYear} draft - ${faCount} FA players need team data...`);
    }
    
    const enhancedPicks: DraftPick[] = [];
    
    // Process picks in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < picks.length; i += batchSize) {
      const batch = picks.slice(i, i + batchSize);
      const enhancedBatch = await Promise.all(
        batch.map(pick => this.enhanceDraftPick(pick, playerData, draftYear))
      );
      enhancedPicks.push(...enhancedBatch);
    }

    const enhancedCount = enhancedPicks.filter(pick => pick.playerInfo.historicalTeam).length;
    if (this.isSleeperEra(draftYear)) {
      console.log(`✅ Enhanced ${enhancedCount}/${picks.length} Sleeper era draft picks with historical team data`);
    } else {
      console.log(`✅ Fixed ${enhancedCount} FA players in ESPN era ${draftYear} draft with historical team data`);
    }

    return enhancedPicks;
  }

  // Get the team to display for a draft pick (historical if available, otherwise current)
  getDisplayTeam(pick: DraftPick, draftYear?: number): string | null {
    const team = pick.playerInfo.historicalTeam || pick.playerInfo.team;
    return team ? this.normalizeTeamAbbreviation(team, draftYear) : null;
  }

  // Check if a pick has historical team data
  hasHistoricalTeam(pick: DraftPick): boolean {
    return !!pick.playerInfo.historicalTeam;
  }

  // Get mapping confidence for a player if available
  getMappingConfidence(playerId: string): 'high' | 'medium' | 'low' | null {
    const mapping = this.playerMappings.get(playerId);
    return mapping?.confidence || null;
  }

  // Get statistics about available historical data
  getDataStats(): {
    isLoaded: boolean;
    totalPlayers: number;
    totalMappings: number;
    seasonsAvailable: number[];
    sleeperEraSeasons: number[];
    espnEraNote: string;
  } {
    const seasonsAvailable = this.historicalTeamData 
      ? [...new Set(
          Object.values(this.historicalTeamData)
            .flatMap(playerSeasons => Object.keys(playerSeasons).map(Number))
        )].sort((a, b) => a - b)
      : [];

    const sleeperEraSeasons = seasonsAvailable.filter(year => this.isSleeperEra(year));

    return {
      isLoaded: this.dataLoaded,
      totalPlayers: this.historicalTeamData ? Object.keys(this.historicalTeamData).length : 0,
      totalMappings: this.playerMappings.size,
      seasonsAvailable,
      sleeperEraSeasons,
      espnEraNote: 'ESPN era drafts (2018-2020) use existing accurate team data'
    };
  }

  // Clear cached data (useful for testing or forcing refresh)
  clearCache(): void {
    this.historicalTeamData = null;
    this.playerMappings.clear();
    this.dataLoaded = false;
  }
}

// Export a singleton instance
export const historicalTeamResolver = new HistoricalTeamResolver();