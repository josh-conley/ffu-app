/**
 * FFU Data Service - Fetches data from the FFU website
 */

const FFU_BASE_URL = process.env.FFU_DATA_BASE_URL || 'https://josh-conley.github.io/ffu-app/data';

export class FFUDataService {
  constructor() {
    this.baseUrl = FFU_BASE_URL;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Team name mapping from your constants
    this.teamMapping = new Map([
      ['331590801261883392', 'The Stallions'],
      ['396808818157182976', 'FFUcked Up'],
      ['398574272387297280', 'Dmandre161'],
      ['398576262546735104', 'Blood, Sweat, and Beers'],
      ['467404039059927040', 'Malibu Leopards'],
      ['470715135581745152', 'Pottsville Maroons'],
      ['705642514408886272', 'Dark Knights'],
      ['710981985102802944', 'Frank\'s Little Beauties'],
      ['727368657923063808', 'Fort Wayne Banana Bread'],
      ['729741648338210816', 'ChicagoPick6'],
      ['798327505219096576', 'TKO Blow'],
      ['860973514839199744', 'Show Biz Kitten'],
      ['862142522036703232', 'Boca Ciega Banditos'],
      ['84604928349585408', 'The (Teddy) Bears'],
      ['398552306884345856', 'arcorey15'],
      ['578691097983754240', 'MustachePapi'],
      ['602712418325442560', 'The Riveters'],
      ['804551335088361472', 'Crawfordsville\'s Finest'],
      ['821067488811909120', 'LegendsRise'],
      ['856248808915480576', 'The Tooth Tuggers'],
      ['864966364937461760', 'Nighthawks'],
      ['865078270985629696', 'The Gaston Ramblers'],
      ['84006772809285632', 'The Minutemen'],
      ['325766631336714240', 'Act More Stupidly'],
      ['386791325690994688', 'Indianapolis Aztecs'],
      ['462383465753473024', 'Raging Rhinos'],
      ['465884883869233152', 'CamDelphia'],
      ['507633950666584064', 'El Guapo Puto'],
      ['508719015656099840', 'Team Pancake'],
      ['527884868880531456', 'Johnkshire Cats'],
      ['726572095210930176', 'Team Dogecoin'],
      ['731211092713402368', 'Team Dogecoin'],
      ['639877229681147904', 'He Hate Me'],
      ['664739261735591936', 'CENATION'],
      ['715362669380591616', 'ZBoser'],
      ['727366898383122432', 'Big Ten Bandits'],
      ['865323291064291328', 'Head Cow Always Grazing'],
      ['1124071986805829632', 'Odin\'s Herr'],
      ['1133491276038426624', 'Bucky Badgers'],
      ['1133492104077946880', 'The Sha\'Dynasty'],
      ['399322397750124544', 'Team Jacamart'],
      ['472876832719368192', 'Stark Direwolves'],
      ['399297882890440704', 'Circle City Phantoms'],
      ['467553389673181184', 'Shton\'s Strikers'],
      ['599711204499312640', 'Team Black Death'],
      ['739275676649144320', 'Birds of War'],
      ['563223565497249792', 'bstarrr'],
      ['1003144735223099392', 'dewdoc'],
      ['726584695151734784', 'The Ducklings'],
      ['729571025750208512', 'chetmaynard'],
      ['399379352174768128', 'Stone Cold Steve Irwins'],
      ['1132015239492591616', 'The Steel Tigers'],
      ['1256013880681832448', 'Jawn of Arc'],
      ['1259227854642622464', 'The Underdogs'],
      ['797222154151247872', 'Dawn Island Straw Hats'],
      ['866063012375719936', 'The Inferno Swarm']
    ]);
  }

  /**
   * Fetch league data for a specific year and league
   */
  async getLeagueData(league, year) {
    const cacheKey = `${league}-${year}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/${year}/${league.toLowerCase()}.json`;
      console.log(`Fetching data from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${league} ${year}: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error(`Error fetching league data:`, error);
      throw error;
    }
  }

  /**
   * Get standings for a league and year
   */
  async getStandings(league, year) {
    const data = await this.getLeagueData(league, year);
    return data.standings || [];
  }

  /**
   * Get draft data for a league and year
   */
  async getDraftData(league, year) {
    const data = await this.getLeagueData(league, year);
    return data.draftData || null;
  }

  /**
   * Get matchups for a specific week
   */
  async getMatchups(league, year, week) {
    const data = await this.getLeagueData(league, year);
    return data.matchupsByWeek?.[week] || [];
  }

  /**
   * Get all matchups for a league/year
   */
  async getAllMatchups(league, year) {
    const data = await this.getLeagueData(league, year);
    return data.matchupsByWeek || {};
  }

  /**
   * Get playoff results
   */
  async getPlayoffResults(league, year) {
    const data = await this.getLeagueData(league, year);
    return data.playoffResults || [];
  }

  /**
   * Get team info by user ID
   */
  async getTeamInfo(league, year, userId) {
    const standings = await this.getStandings(league, year);
    return standings.find(team => team.userId === userId) || null;
  }

  /**
   * Get available years for a league
   */
  getAvailableYears(league) {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Determine year range based on league
    switch (league.toUpperCase()) {
      case 'PREMIER':
        for (let year = 2018; year <= currentYear; year++) {
          years.push(year.toString());
        }
        break;
      case 'MASTERS':
        for (let year = 2022; year <= currentYear; year++) {
          years.push(year.toString());
        }
        break;
      case 'NATIONAL':
        for (let year = 2018; year <= currentYear; year++) {
          years.push(year.toString());
        }
        break;
    }
    
    return years;
  }

  /**
   * Validate league and year combination
   */
  isValidLeagueYear(league, year) {
    const availableYears = this.getAvailableYears(league);
    return availableYears.includes(year);
  }

  /**
   * Get league display name
   */
  getLeagueDisplayName(league) {
    const names = {
      'PREMIER': 'Premier League',
      'MASTERS': 'Masters League',
      'NATIONAL': 'National League'
    };
    return names[league.toUpperCase()] || league;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('FFU Data cache cleared');
  }

  /**
   * Get team name for a user ID
   */
  getTeamName(userId) {
    return this.teamMapping.get(userId) || `Team ${userId?.slice(-4) || 'Unknown'}`;
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp < this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheTimeoutMinutes: this.cacheTimeout / (60 * 1000)
    };
  }
}