import type { NFLverseRosterEntry, HistoricalTeamData } from '../types';

export class NFLverseService {
  private baseUrl = 'https://github.com/nflverse/nflverse-data/releases/latest/download';
  private cache: Map<string, NFLverseRosterEntry[]> = new Map();

  async fetchRosterDataForSeason(season: number): Promise<NFLverseRosterEntry[]> {
    const cacheKey = `rosters_${season}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/rosters.csv`);
      if (!response.ok) {
        throw new Error(`Failed to fetch roster data: ${response.statusText}`);
      }

      const csvText = await response.text();
      const allRosters = this.parseCSV(csvText);
      
      // Filter for the specific season
      const seasonRosters = allRosters.filter(roster => roster.season === season);
      
      this.cache.set(cacheKey, seasonRosters);
      return seasonRosters;
    } catch (error) {
      console.error(`Failed to fetch NFLverse roster data for ${season}:`, error);
      return [];
    }
  }

  async fetchAllRosterData(): Promise<NFLverseRosterEntry[]> {
    const cacheKey = 'all_rosters';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/rosters.csv`);
      if (!response.ok) {
        throw new Error(`Failed to fetch roster data: ${response.statusText}`);
      }

      const csvText = await response.text();
      const allRosters = this.parseCSV(csvText);
      
      this.cache.set(cacheKey, allRosters);
      return allRosters;
    } catch (error) {
      console.error('Failed to fetch NFLverse roster data:', error);
      return [];
    }
  }

  private parseCSV(csvText: string): NFLverseRosterEntry[] {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const entry: any = {};
      
      headers.forEach((header, index) => {
        const cleanHeader = header.replace(/"/g, '').trim();
        const value = values[index]?.replace(/"/g, '').trim() || '';
        
        // Convert numeric fields
        if (cleanHeader === 'season' || cleanHeader === 'games' || cleanHeader === 'starts' || cleanHeader === 'years' || cleanHeader === 'av') {
          entry[cleanHeader] = value ? parseInt(value, 10) : 0;
        } else {
          entry[cleanHeader] = value;
        }
      });
      
      return entry as NFLverseRosterEntry;
    });
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  buildHistoricalTeamLookup(rosters: NFLverseRosterEntry[]): HistoricalTeamData {
    const lookup: HistoricalTeamData = {};
    
    rosters.forEach(roster => {
      const playerKey = this.createPlayerKey(roster.full_name, roster.position);
      
      if (!lookup[playerKey]) {
        lookup[playerKey] = {};
      }
      
      lookup[playerKey][roster.season] = {
        team: roster.team,
        full_name: roster.full_name,
        position: roster.position,
        games: roster.games || 0,
        starts: roster.starts || 0
      };
    });
    
    return lookup;
  }

  private createPlayerKey(fullName: string, position: string): string {
    return `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${position}`;
  }

  findPlayerTeamForSeason(
    playerName: string, 
    position: string, 
    season: number, 
    historicalData: HistoricalTeamData
  ): string | null {
    const playerKey = this.createPlayerKey(playerName, position);
    return historicalData[playerKey]?.[season]?.team || null;
  }

  // Utility method to normalize player names for matching
  normalizePlayerName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.\-']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Find best match for a player using fuzzy matching
  findBestPlayerMatch(
    targetName: string,
    targetPosition: string,
    rosters: NFLverseRosterEntry[]
  ): NFLverseRosterEntry | null {
    const normalizedTarget = this.normalizePlayerName(targetName);
    
    // First try exact match
    const exactMatch = rosters.find(roster => 
      this.normalizePlayerName(roster.full_name) === normalizedTarget && 
      roster.position === targetPosition
    );
    
    if (exactMatch) return exactMatch;
    
    // Try position match with name similarity
    const positionMatches = rosters.filter(roster => roster.position === targetPosition);
    
    for (const roster of positionMatches) {
      const rosterNameNormalized = this.normalizePlayerName(roster.full_name);
      
      // Check if names contain each other (handles nicknames, etc.)
      if (rosterNameNormalized.includes(normalizedTarget) || 
          normalizedTarget.includes(rosterNameNormalized)) {
        return roster;
      }
    }
    
    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }
}