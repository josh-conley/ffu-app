// Team name to logo filename mapping
const TEAM_LOGO_MAP: Record<string, string> = {
  "Act More Stupidly": "Act More Stupidly.png",
  "Big Ten Bandits": "Big Ten Bandits.png",
  "Blood, Sweat, and Beers": "Blood, Sweat, and Beers.png",
  "Boca Ciega Banditos": "Boca Ciega Banditos.png",
  "Bucky Badgers": "Bucky Badgers.png",
  "CENATION": "CENATION.png",
  "ChicagoPick6": "ChicagoPick6.png",
  "Circle City Phantoms": "Circle City Phantoms.jpg",
  "El Guapo Puto": "El Guapo Puto.png",
  "FFUcked Up": "FFUcked Up.png",
  "Fort Wayne Banana Bread": "Fort Wayne Banana Bread.png",
  "Frank's Little Beauties": "Frank_s Little Beauties.png",
  "Franks Little Beauties": "Frank_s Little Beauties.png",
  "He Hate Me": "He Hate Me.png",
  "Head Cow Always Grazing": "Head Cow Always Grazing.png",
  "Indianapolis Aztecs": "Indianapolis Aztecs.jpg",
  "Johnkshire Cats": "Johnkshire Cats.jpg",
  "LegendsRise": "LegendsRise.png",
  "Malibu Leopards": "Malibu Leopards.jpg",
  "Nighthawks": "Nighthawks.png",
  "Odin's Herr": "Odin_s Herr.jpg",
  "Odins Herr": "Odin_s Herr.jpg",
  "Pottsville Maroons": "Pottsville Maroons.png",
  "Raging Rhinos": "Raging Rhinos.png",
  "Show Biz Kitten": "Show Biz Kitten.png",
  "Shton's Strikers": "Shton_s Strikers.png",
  "Shtons Strikers": "Shton_s Strikers.png",
  "Stark Direwolves": "Stark Direwolves.png",
  "TKO Blow": "TKO Blow.png",
  "Team CamDelphia": "Camdelphia.png",
  "CamDelphia": "Camdelphia.png",
  "Team Jacamart": "Team Jacamart.png",
  "Team Pancake": "Team Pancake.jpg",
  "The (Teddy) Bears": "The (Teddy) Bears.png",
  "Dark Knights": "The Dark Knights.png",
  "The Minutemen": "The Minutemen.jpg",
  "The Riveters": "The Riveters.png",
  "The Sha Dynasty": "The Sha_Dynasty.jpg",
  "The Sha'Dynasty": "The Sha_Dynasty.jpg",
  "Sha Dynasty": "The Sha_Dynasty.jpg",
  "The Stallions": "The Stallions.png",
  "The Tooth Tuggers": "The Tooth Tuggers.png",
  "Jawn of Arc": "Jawn of Arc.png",
  "The Inferno Swarm": "The Inferno Swarm.jpg",
  "The Steel Tigers": "The Steel Tigers.png",
  "Dawn Island Straw Hats": "Dawn Island Straw Hats.jpg",
  "The Underdogs": "The Underdogs.jpg"
};

/**
 * Get the logo filename for a team name
 */
export const getTeamLogoFilename = (teamName: string): string | null => {
  return TEAM_LOGO_MAP[teamName] || null;
};

/**
 * Generate a smart abbreviation for a team name
 * Takes the first letter of each significant word, up to 3 letters
 */
export const generateTeamAbbreviation = (teamName: string): string => {
  // Remove common words and split into significant words
  const insignificantWords = ['the', 'a', 'an', 'and', 'of', 'in', 'on', 'at', 'to', 'for', 'with'];
  
  const words = teamName
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0 && !insignificantWords.includes(word))
    .map(word => word.charAt(0).toUpperCase());

  // Take up to 3 letters
  if (words.length >= 3) {
    return words.slice(0, 3).join('');
  } else if (words.length === 2) {
    return words.join('');
  } else if (words.length === 1) {
    // For single words, take first 2-3 letters
    const word = teamName.trim();
    if (word.length >= 3) {
      return word.substring(0, 3).toUpperCase();
    } else {
      return word.toUpperCase();
    }
  }
  
  // Fallback
  return teamName.substring(0, 3).toUpperCase();
};

/**
 * Get all available team names that have logos
 */
export const getAvailableTeamLogos = (): string[] => {
  return Object.keys(TEAM_LOGO_MAP);
};