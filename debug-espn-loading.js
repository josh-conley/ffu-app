// Debug script to test ESPN data loading
// Simple test without importing TypeScript files

const ESPN_LEAGUES = [
  { sleeperId: 'espn-2020-premier', year: '2020', tier: 'PREMIER' },
  { sleeperId: 'espn-2019-premier', year: '2019', tier: 'PREMIER' },
  { sleeperId: 'espn-2018-premier', year: '2018', tier: 'PREMIER' },
  { sleeperId: 'espn-2020-national', year: '2020', tier: 'NATIONAL' },
  { sleeperId: 'espn-2019-national', year: '2019', tier: 'NATIONAL' },
  { sleeperId: 'espn-2018-national', year: '2018', tier: 'NATIONAL' },
];

console.log('=== ESPN League Loading Debug ===');

// Test league configs
console.log('\n1. ESPN League Configurations:');
console.log('ESPN leagues configured:', ESPN_LEAGUES.length);
ESPN_LEAGUES.forEach(league => {
  console.log(`  ${league.year} ${league.tier}: ${league.sleeperId}`);
});

// Test data loading simulation
console.log('\n2. Testing data access:');
try {
  const response = await fetch('http://localhost:5174/data/2018/premier.json');
  if (response.ok) {
    const data = await response.json();
    console.log('✅ 2018 Premier JSON loaded successfully');
    console.log('Sample standing:', data.standings[0].userInfo);
    console.log('Total teams:', data.standings.length);
  } else {
    console.log('❌ Failed to load 2018 Premier JSON:', response.status);
  }
} catch (error) {
  console.log('❌ Error loading data:', error.message);
}

// Test national league
try {
  const response = await fetch('http://localhost:5174/data/2018/national.json');
  if (response.ok) {
    const data = await response.json();
    console.log('✅ 2018 National JSON loaded successfully');
    console.log('Sample standing:', data.standings[0].userInfo);
    console.log('Total teams:', data.standings.length);
  } else {
    console.log('❌ Failed to load 2018 National JSON:', response.status);
  }
} catch (error) {
  console.log('❌ Error loading National data:', error.message);
}