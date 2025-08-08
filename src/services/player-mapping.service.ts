import type { SleeperPlayer, NFLverseRosterEntry, PlayerTeamMapping, HistoricalTeamData } from '../types';

export class PlayerMappingService {
  private mappingCache: Map<string, PlayerTeamMapping> = new Map();

  async buildPlayerMappings(
    sleeperPlayers: Record<string, SleeperPlayer>,
    nflverseRosters: NFLverseRosterEntry[]
  ): Promise<PlayerTeamMapping[]> {
    const mappings: PlayerTeamMapping[] = [];
    
    for (const [sleeperId, sleeperPlayer] of Object.entries(sleeperPlayers)) {
      if (!sleeperPlayer.active || !sleeperPlayer.position) continue;
      
      const mapping = this.findPlayerMapping(sleeperPlayer, nflverseRosters, sleeperId);
      if (mapping) {
        mappings.push(mapping);
        this.mappingCache.set(sleeperId, mapping);
      }
    }
    
    console.log(`Created ${mappings.length} player mappings from ${Object.keys(sleeperPlayers).length} Sleeper players`);
    return mappings;
  }

  private findPlayerMapping(
    sleeperPlayer: SleeperPlayer,
    nflverseRosters: NFLverseRosterEntry[],
    sleeperId: string
  ): PlayerTeamMapping | null {
    const { full_name, position } = sleeperPlayer;
    
    if (!full_name || !position) return null;

    // Try exact name match first
    const exactMatch = nflverseRosters.find(roster =>
      this.normalizePlayerName(roster.full_name) === this.normalizePlayerName(full_name) &&
      this.normalizePosition(roster.position) === this.normalizePosition(position)
    );

    if (exactMatch) {
      return {
        sleeperId,
        nflverseKey: this.createNFLverseKey(exactMatch.full_name, exactMatch.position),
        confidence: 'high',
        matchedOn: 'exact_name'
      };
    }

    // Try fuzzy name matching within same position
    const fuzzyMatch = this.findFuzzyMatch(sleeperPlayer, nflverseRosters);
    if (fuzzyMatch) {
      return {
        sleeperId,
        nflverseKey: this.createNFLverseKey(fuzzyMatch.full_name, fuzzyMatch.position),
        confidence: 'medium',
        matchedOn: 'fuzzy_name'
      };
    }

    return null;
  }

  private findFuzzyMatch(
    sleeperPlayer: SleeperPlayer,
    nflverseRosters: NFLverseRosterEntry[]
  ): NFLverseRosterEntry | null {
    const normalizedSleeperName = this.normalizePlayerName(sleeperPlayer.full_name);
    const sleeperPosition = this.normalizePosition(sleeperPlayer.position);
    
    // Filter by position first
    const samePositionPlayers = nflverseRosters.filter(roster =>
      this.normalizePosition(roster.position) === sleeperPosition
    );

    // Check for partial matches
    for (const roster of samePositionPlayers) {
      const normalizedRosterName = this.normalizePlayerName(roster.full_name);
      
      // Split names into parts for more flexible matching
      const sleeperParts = normalizedSleeperName.split(' ');
      const rosterParts = normalizedRosterName.split(' ');
      
      // Check if we have matching first and last name components
      if (sleeperParts.length >= 2 && rosterParts.length >= 2) {
        const matchingParts = sleeperParts.filter(part => 
          rosterParts.some(rosterPart => 
            part.length > 2 && rosterPart.includes(part) || part.includes(rosterPart)
          )
        );
        
        // Consider it a match if at least 2 name parts match or if it's a very close match
        if (matchingParts.length >= 2) {
          return roster;
        }
      }
      
      // Check for nickname/shortened name matches
      if (this.isLikelyNicknameMatch(sleeperPlayer, roster)) {
        return roster;
      }
    }

    return null;
  }

  private isLikelyNicknameMatch(sleeperPlayer: SleeperPlayer, roster: NFLverseRosterEntry): boolean {
    const sleeperFirst = sleeperPlayer.first_name?.toLowerCase() || '';
    const sleeperLast = sleeperPlayer.last_name?.toLowerCase() || '';
    const rosterFirst = roster.first_name?.toLowerCase() || '';
    const rosterLast = roster.last_name?.toLowerCase() || '';
    
    // Last names should match exactly or very closely
    if (this.normalizePlayerName(sleeperLast) !== this.normalizePlayerName(rosterLast)) {
      return false;
    }
    
    // Check common nickname patterns
    const commonNicknames: Record<string, string[]> = {
      'alexander': ['alex'],
      'anthony': ['tony'],
      'benjamin': ['ben'],
      'christopher': ['chris'],
      'daniel': ['dan', 'danny'],
      'david': ['dave'],
      'edward': ['ed', 'eddie'],
      'james': ['jim', 'jimmy'],
      'jonathan': ['jon'],
      'joseph': ['joe', 'joey'],
      'joshua': ['josh'],
      'matthew': ['matt'],
      'michael': ['mike'],
      'nicholas': ['nick'],
      'robert': ['rob', 'bobby'],
      'thomas': ['tom', 'tommy'],
      'william': ['will', 'bill', 'billy']
    };
    
    // Check if one name is a nickname of the other
    for (const [fullName, nicknames] of Object.entries(commonNicknames)) {
      if ((sleeperFirst === fullName && nicknames.includes(rosterFirst)) ||
          (rosterFirst === fullName && nicknames.includes(sleeperFirst))) {
        return true;
      }
    }
    
    return false;
  }

  private normalizePlayerName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.\-']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizePosition(position: string): string {
    // Handle position variations
    const positionMap: Record<string, string> = {
      'def': 'dst',
      'dst': 'dst',
      'defense': 'dst'
    };
    
    const normalized = position.toLowerCase();
    return positionMap[normalized] || normalized;
  }

  private createNFLverseKey(fullName: string, position: string): string {
    return `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${position.toLowerCase()}`;
  }

  getHistoricalTeamForPlayer(
    sleeperId: string,
    season: number,
    historicalData: HistoricalTeamData
  ): string | null {
    const mapping = this.mappingCache.get(sleeperId);
    if (!mapping) return null;
    
    return historicalData[mapping.nflverseKey]?.[season]?.team || null;
  }

  async resolvePlayerTeam(
    sleeperId: string,
    playerData: SleeperPlayer,
    season: number,
    historicalData?: HistoricalTeamData
  ): Promise<string | null> {
    // First try to get historical team if data is available
    if (historicalData) {
      const historicalTeam = this.getHistoricalTeamForPlayer(sleeperId, season, historicalData);
      if (historicalTeam) {
        return historicalTeam;
      }
    }
    
    // Fallback to current team from Sleeper data
    return playerData.team || null;
  }

  clearCache(): void {
    this.mappingCache.clear();
  }

  // Export mappings for caching
  exportMappings(): PlayerTeamMapping[] {
    return Array.from(this.mappingCache.values());
  }

  // Import cached mappings
  importMappings(mappings: PlayerTeamMapping[]): void {
    this.mappingCache.clear();
    mappings.forEach(mapping => {
      this.mappingCache.set(mapping.sleeperId, mapping);
    });
  }
}