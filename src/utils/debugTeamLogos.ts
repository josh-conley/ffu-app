import { getTeamLogoFilename, generateTeamAbbreviation, getAvailableTeamLogos } from './teamLogos';

/**
 * Debug utility to help identify team name mismatches
 * Use this in development to see which teams don't have logos
 */
export const debugTeamLogos = () => {
  const availableLogos = getAvailableTeamLogos();
  console.log('Available team logos:', availableLogos.length);
  console.log('Teams with logos:', availableLogos);
  
  // Test some common team name variations
  const testTeams = [
    'Frank\'s Little Beauties',
    'Franks Little Beauties',
    'The Sha Dynasty',
    'Odin\'s Herr',
    'Odins Herr',
    'Shton\'s Strikers',
    'The (Teddy) Bears',
    'The Teddy Bears'
  ];
  
  console.log('\nTesting team name variations:');
  testTeams.forEach(teamName => {
    const logoFile = getTeamLogoFilename(teamName);
    const abbreviation = generateTeamAbbreviation(teamName);
    console.log(`${teamName}: ${logoFile ? logoFile : 'NO LOGO'} | Abbrev: ${abbreviation}`);
  });
};

/**
 * Check if a team has a logo available
 */
export const hasTeamLogo = (teamName: string): boolean => {
  return getTeamLogoFilename(teamName) !== null;
};

// Expose to window for development debugging
if (typeof window !== 'undefined') {
  (window as typeof window & { debugTeamLogos: typeof debugTeamLogos }).debugTeamLogos = debugTeamLogos;
}