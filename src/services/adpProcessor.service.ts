
interface UnderdogADPPlayer {
  Player: string;
  POS: string;
  Team: string;
  'POS ADP': string;
  ADP: string;
  'Prev ADP': string;
  'Δ': string;
}

interface SleeperADPPlayer {
  Player: string;
  Team: string;
  Bye: string;
  POS: string;
  Sleeper: string;
  ADP: string;
}

interface ProcessedADPPlayer {
  name: string;
  position: string;
  team: string;
  adpRank: number;
  sleeperADP?: number;
  underdogADP?: number;
  averageADP: number;
}

export class ADPProcessorService {

  /**
   * Normalize player names for better matching
   */
  private normalizePlayerName(name: string): string {
    return name
      .toLowerCase()
      .replace(/['']/g, '') // Remove apostrophes
      .replace(/\./g, '') // Remove periods
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/ jr$/i, '') // Remove Jr suffix
      .replace(/ sr$/i, '') // Remove Sr suffix
      .replace(/ iii$/i, '') // Remove III suffix
      .replace(/ ii$/i, '') // Remove II suffix
      .replace(/ iv$/i, '') // Remove IV suffix
      .trim();
  }

  /**
   * Calculate similarity score between two normalized names
   */
  private calculateSimilarity(name1: string, name2: string): number {
    const norm1 = this.normalizePlayerName(name1);
    const norm2 = this.normalizePlayerName(name2);

    if (norm1 === norm2) return 1.0;

    // Check if one name contains the other (for nicknames)
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

    // Simple Levenshtein-like scoring for character differences
    const maxLen = Math.max(norm1.length, norm2.length);
    const minLen = Math.min(norm1.length, norm2.length);
    
    if (maxLen === 0) return 1.0;
    
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (norm1[i] === norm2[i]) matches++;
    }

    return matches / maxLen;
  }

  /**
   * Find the best match for a player name in the other dataset
   */
  private findBestMatch(
    targetName: string, 
    candidates: { name: string; position: string }[], 
    targetPosition: string
  ): { name: string; similarity: number } | null {
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const candidate of candidates) {
      // Only match players of the same position
      if (candidate.position !== targetPosition) continue;

      const similarity = this.calculateSimilarity(targetName, candidate.name);
      
      if (similarity > bestSimilarity && similarity > 0.6) {
        bestSimilarity = similarity;
        bestMatch = { name: candidate.name, similarity };
      }
    }

    return bestMatch;
  }

  /**
   * Process and merge ADP data from both sources
   */
  async processADPData(): Promise<ProcessedADPPlayer[]> {
    // Read CSV files
    const underdogData = await this.readUnderdogCSV();
    const sleeperData = await this.readSleeperCSV();

    const processedPlayers = new Map<string, ProcessedADPPlayer>();

    // Process Sleeper data first
    for (const player of sleeperData) {
      const adpValue = parseFloat(player.ADP);
      if (isNaN(adpValue)) continue;

      const normalizedPosition = player.POS.replace(/\d+$/, ''); // Remove position rank (e.g., WR1 -> WR)
      
      // Skip kickers - not used in this league
      if (normalizedPosition === 'K') continue;
      
      const key = `${this.normalizePlayerName(player.Player)}_${normalizedPosition}`;
      processedPlayers.set(key, {
        name: player.Player,
        position: normalizedPosition,
        team: this.convertTeamAbbreviation(player.Team),
        adpRank: Math.round(adpValue),
        sleeperADP: adpValue,
        averageADP: adpValue,
      });
    }

    // Process Underdog data and match with Sleeper
    const sleeperCandidates = sleeperData.map(p => ({ 
      name: p.Player, 
      position: p.POS.replace(/\d+$/, '') 
    }));

    for (const player of underdogData) {
      const adpValue = parseFloat(player.ADP);
      if (isNaN(adpValue)) continue;

      const position = player.POS; // Underdog already has clean positions (WR, RB, etc.)
      const normalizedName = this.normalizePlayerName(player.Player);
      const key = `${normalizedName}_${position}`;

      // Try to find exact match first
      let existingPlayer = processedPlayers.get(key);

      // If no exact match, try fuzzy matching
      if (!existingPlayer) {
        const bestMatch = this.findBestMatch(player.Player, sleeperCandidates, position);
        if (bestMatch) {
          const matchKey = `${this.normalizePlayerName(bestMatch.name)}_${position}`;
          existingPlayer = processedPlayers.get(matchKey);
        }
      }

      if (existingPlayer) {
        // Merge with existing Sleeper data
        existingPlayer.underdogADP = adpValue;
        existingPlayer.averageADP = (existingPlayer.sleeperADP! + adpValue) / 2;
        existingPlayer.adpRank = Math.round(existingPlayer.averageADP);
      } else {
        // Add as new player (Underdog only) - skip kickers
        if (position === 'K') continue;
        
        const teamName = player.Team.includes(' ') 
          ? player.Team // Full team name like "Cincinnati Bengals"
          : player.Team; // Already abbreviated
        
        processedPlayers.set(key, {
          name: player.Player,
          position: position,
          team: this.convertTeamAbbreviation(teamName),
          adpRank: Math.round(adpValue),
          underdogADP: adpValue,
          averageADP: adpValue,
        });
      }
    }

    // Convert to array and sort by average ADP
    const result = Array.from(processedPlayers.values())
      .sort((a, b) => a.averageADP - b.averageADP)
      .map((player, index) => ({
        ...player,
        adpRank: index + 1, // Re-rank based on sorted order
      }));

    return result;
  }

  /**
   * Convert team names to standard abbreviations
   */
  private convertTeamAbbreviation(team: string): string {
    const teamMap: Record<string, string> = {
      'Cincinnati Bengals': 'CIN',
      'Philadelphia Eagles': 'PHI', 
      'Atlanta Falcons': 'ATL',
      'Minnesota Vikings': 'MIN',
      'Detroit Lions': 'DET',
      'Dallas Cowboys': 'DAL',
      'Baltimore Ravens': 'BAL',
      'Los Angeles Rams': 'LAR',
      'New York Giants': 'NYG',
      'Houston Texans': 'HOU',
      'Las Vegas Raiders': 'LV',
      'Jacksonville Jaguars': 'JAC',
      'Miami Dolphins': 'MIA',
      'Tampa Bay Buccaneers': 'TB',
      'Los Angeles Chargers': 'LAC',
      'Arizona Cardinals': 'ARI',
      'New York Jets': 'NYJ',
      'Green Bay Packers': 'GB',
      'Indianapolis Colts': 'IND',
      'Washington Commanders': 'WAS',
      'Buffalo Bills': 'BUF',
      'Kansas City Chiefs': 'KC',
      'Carolina Panthers': 'CAR',
      'Chicago Bears': 'CHI',
      'Pittsburgh Steelers': 'PIT',
      'Denver Broncos': 'DEN',
      'Seattle Seahawks': 'SEA',
      'Cleveland Browns': 'CLE',
      'New Orleans Saints': 'NO',
      'San Francisco 49ers': 'SF',
      'Tennessee Titans': 'TEN',
      'New England Patriots': 'NE',
    };

    return teamMap[team] || team;
  }

  /**
   * Read and parse Underdog CSV
   */
  private async readUnderdogCSV(): Promise<UnderdogADPPlayer[]> {
    try {
      const response = await fetch('/data/UnderdogADP2025.csv');
      if (!response.ok) throw new Error('Failed to fetch Underdog CSV');
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      
      return lines.slice(1).map(line => {
        const values = this.parseCSVLine(line);
        const player: any = {};
        headers.forEach((header, index) => {
          player[header] = values[index] || '';
        });
        return player as UnderdogADPPlayer;
      }).filter(player => player.Player && player.ADP);
    } catch (error) {
      console.error('Error reading Underdog CSV:', error);
      return [];
    }
  }

  /**
   * Read and parse Sleeper CSV
   */
  private async readSleeperCSV(): Promise<SleeperADPPlayer[]> {
    try {
      const response = await fetch('/data/SleeperADP2025.csv');
      if (!response.ok) throw new Error('Failed to fetch Sleeper CSV');
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      
      return lines.slice(1).map(line => {
        const values = this.parseCSVLine(line);
        const player: any = {};
        headers.forEach((header, index) => {
          player[header] = values[index] || '';
        });
        return player as SleeperADPPlayer;
      }).filter(player => player.Player && player.ADP);
    } catch (error) {
      console.error('Error reading Sleeper CSV:', error);
      return [];
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
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
}

export const adpProcessorService = new ADPProcessorService();