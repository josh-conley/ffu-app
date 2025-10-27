const fs = require('fs');
const path = require('path');

// Import constants from TypeScript file
// Since this is JS, we'll need to read and parse the constants ourselves
// Or we can read the JSON files and build the mappings

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// Years and leagues to process
const YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
const LEAGUES = ['premier', 'masters', 'national'];

// Map sleeper IDs to team names from constants
// This is a simplified version - we'll read from the TypeScript constants file
const USERS = [
  { sleeperId: '331590801261883392', teamName: 'The Stallions' },
  { sleeperId: '396808818157182976', teamName: 'FFUcked Up' },
  { sleeperId: '398574272387297280', teamName: 'Dmandre161' },
  { sleeperId: '398576262546735104', teamName: 'Blood, Sweat, and Beers' },
  { sleeperId: '467404039059927040', teamName: 'Malibu Leopards' },
  { sleeperId: '470715135581745152', teamName: 'Pottsville Maroons' },
  { sleeperId: '705642514408886272', teamName: 'Dark Knights' },
  { sleeperId: '710981985102802944', teamName: 'Frank\'s Little Beauties' },
  { sleeperId: '727368657923063808', teamName: 'Fort Wayne Banana Bread' },
  { sleeperId: '729741648338210816', teamName: 'ChicagoPick6' },
  { sleeperId: '798327505219096576', teamName: 'TKO Blow' },
  { sleeperId: '860973514839199744', teamName: 'Show Biz Kitten' },
  { sleeperId: '862142522036703232', teamName: 'Boca Ciega Banditos' },
  { sleeperId: '84604928349585408', teamName: 'The (Teddy) Bears' },
  { sleeperId: '398552306884345856', teamName: 'arcorey15' },
  { sleeperId: '578691097983754240', teamName: 'MustachePapi' },
  { sleeperId: '602712418325442560', teamName: 'The Riveters' },
  { sleeperId: '804551335088361472', teamName: 'Crawfordsville\'s Finest' },
  { sleeperId: '821067488811909120', teamName: 'LegendsRise' },
  { sleeperId: '856248808915480576', teamName: 'The Tooth Tuggers' },
  { sleeperId: '864966364937461760', teamName: 'Nighthawks' },
  { sleeperId: '865078270985629696', teamName: 'The Gaston Ramblers' },
  { sleeperId: '84006772809285632', teamName: 'The Minutemen' },
  { sleeperId: '325766631336714240', teamName: 'Act More Stupidly' },
  { sleeperId: '386791325690994688', teamName: 'Indianapolis Aztecs' },
  { sleeperId: '462383465753473024', teamName: 'Raging Rhinos' },
  { sleeperId: '465884883869233152', teamName: 'CamDelphia' },
  { sleeperId: '507633950666584064', teamName: 'El Guapo Puto' },
  { sleeperId: '508719015656099840', teamName: 'Team Pancake' },
  { sleeperId: '527884868880531456', teamName: 'Johnkshire Cats' },
  { sleeperId: '726572095210930176', teamName: 'Team Dogecoin' },
  { sleeperId: '731211092713402368', teamName: 'Team Dogecoin' },
  { sleeperId: '639877229681147904', teamName: 'He Hate Me' },
  { sleeperId: '664739261735591936', teamName: 'CENATION' },
  { sleeperId: '715362669380591616', teamName: 'ZBoser' },
  { sleeperId: '727366898383122432', teamName: 'Big Ten Bandits' },
  { sleeperId: '865323291064291328', teamName: 'Head Cow Always Grazing' },
  { sleeperId: '1124071986805829632', teamName: 'Odin\'s Herr' },
  { sleeperId: '1133491276038426624', teamName: 'Bucky Badgers' },
  { sleeperId: '1133492104077946880', teamName: 'The Sha\'Dynasty' },
  { sleeperId: '399322397750124544', teamName: 'Team Jacamart' },
  { sleeperId: '472876832719368192', teamName: 'Stark Direwolves' },
  { sleeperId: '399297882890440704', teamName: 'Circle City Phantoms' },
  { sleeperId: '467553389673181184', teamName: 'Shton\'s Strikers' },
  { sleeperId: '599711204499312640', teamName: 'Team Black Death' },
  { sleeperId: '739275676649144320', teamName: 'Birds of War' },
  { sleeperId: '563223565497249792', teamName: 'bstarrr' },
  { sleeperId: '1003144735223099392', teamName: 'dewdoc' },
  { sleeperId: '726584695151734784', teamName: 'The Ducklings' },
  { sleeperId: '729571025750208512', teamName: 'chetmaynard' },
  { sleeperId: '399379352174768128', teamName: 'Stone Cold Steve Irwins' },
  { sleeperId: '1132015239492591616', teamName: 'The Steel Tigers' },
  { sleeperId: '1256013880681832448', teamName: 'Jawn of Arc' },
  { sleeperId: '1259227854642622464', teamName: 'The Underdogs' },
  { sleeperId: '797222154151247872', teamName: 'Dawn Island Straw Hats' },
  { sleeperId: '866063012375719936', teamName: 'The Inferno Swarm' },
  // Historical users
  { sleeperId: 'historical-naptown-makos', teamName: 'Naptown Makos' },
  { sleeperId: 'historical-speedway-ritual-cog', teamName: 'Speedway\'s Ritual Cog' },
  { sleeperId: 'historical-well-done-stakes', teamName: 'The Well Done Stakes' },
  { sleeperId: 'historical-durham-handsome-devils', teamName: 'Durham Handsome Devils' },
  { sleeperId: 'historical-the-losers', teamName: 'The Losers' },
  { sleeperId: 'historical-gingy-flame', teamName: 'Gingy Flame' },
  { sleeperId: 'historical-not-your-average-joes', teamName: 'Not Your Average Joes' },
  { sleeperId: 'historical-team-team-casa', teamName: 'Team Team Casa' },
];

function getUserTeamName(sleeperId) {
  const user = USERS.find(u => u.sleeperId === sleeperId);
  return user ? user.teamName : sleeperId;
}

function getRegularSeasonEndWeek(year) {
  // ESPN era (2018-2020): playoffs start week 14, so regular season is weeks 1-13
  // Sleeper era (2021+): playoffs start week 15, so regular season is weeks 1-14
  const yearNum = parseInt(year);
  return yearNum <= 2020 ? 13 : 14;
}

function main() {
  const allTeamScores = [];

  // Process each year and league
  for (const year of YEARS) {
    for (const league of LEAGUES) {
      const filePath = path.join(DATA_DIR, year, `${league}.json`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        continue;
      }

      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!data.matchupsByWeek) {
          console.error(`No matchupsByWeek found in ${year}/${league}.json`, { file: 'stderr' });
          continue;
        }

        const regularSeasonEndWeek = getRegularSeasonEndWeek(year);

        // Build a map of team scores by week and track wins/losses/ties
        const teamWeekScores = {};
        const teamRecords = {};

        // Process each week
        for (const [week, matchups] of Object.entries(data.matchupsByWeek)) {
          const weekNum = parseInt(week);

          for (const matchup of matchups) {
            const { winner, loser, winnerScore, loserScore } = matchup;

            // Initialize team entries if they don't exist
            if (!teamWeekScores[winner]) {
              teamWeekScores[winner] = {};
              teamRecords[winner] = { wins: 0, losses: 0, ties: 0 };
            }
            if (!teamWeekScores[loser]) {
              teamWeekScores[loser] = {};
              teamRecords[loser] = { wins: 0, losses: 0, ties: 0 };
            }

            // Store scores for the week
            teamWeekScores[winner][week] = winnerScore;
            teamWeekScores[loser][week] = loserScore;

            // Track wins/losses/ties for regular season only
            if (weekNum <= regularSeasonEndWeek) {
              // Skip if both scores are 0 (no game played/bye week)
              if (winnerScore === 0 && loserScore === 0) {
                continue;
              }

              // Check for ties (scores are equal)
              if (winnerScore === loserScore) {
                teamRecords[winner].ties++;
                teamRecords[loser].ties++;
              } else {
                teamRecords[winner].wins++;
                teamRecords[loser].losses++;
              }
            }
          }
        }

        // Convert to output format
        for (const [sleeperId, weekScores] of Object.entries(teamWeekScores)) {
          const teamName = getUserTeamName(sleeperId);
          const record = teamRecords[sleeperId];

          const row = {
            team: teamName,
            year: year,
            league: league.toUpperCase(),
            wins: record.wins,
            losses: record.losses,
            ties: record.ties,
          };

          // Add columns for each week (1-17)
          for (let i = 1; i <= 17; i++) {
            row[`week${i}`] = weekScores[i.toString()] || '';
          }

          allTeamScores.push(row);
        }
      } catch (error) {
        console.error(`Error processing ${year}/${league}.json:`, error.message, { file: 'stderr' });
      }
    }
  }

  // Output as CSV
  if (allTeamScores.length === 0) {
    console.error('No data found');
    return;
  }

  // Get all column names
  const columns = ['team', 'year', 'league', 'wins', 'losses', 'ties'];
  for (let i = 1; i <= 17; i++) {
    columns.push(`week${i}`);
  }

  // Build CSV content
  const csvLines = [];

  // Add header
  csvLines.push(columns.join(','));

  // Add rows
  for (const row of allTeamScores) {
    const values = columns.map(col => {
      const value = row[col];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvLines.push(values.join(','));
  }

  // Write to file
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'weekly-scores.csv');
  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
  console.log(`Successfully exported ${allTeamScores.length} rows to ${outputPath}`);
}

main();
