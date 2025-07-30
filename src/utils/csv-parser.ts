// CSV parsing utilities for ESPN data migration

export interface CsvRow {
  [key: string]: string;
}

// Parse CSV string into array of objects
export const parseCsv = (csvContent: string): CsvRow[] => {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse header row
  const headers = parseRow(lines[0]);
  
  // Parse data rows
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const row: CsvRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
};

// Parse a single CSV row, handling quoted fields with commas
export const parseRow = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add final field
  result.push(current.trim());
  
  return result;
};

// Validate CSV structure
export const validateCsvHeaders = (rows: CsvRow[], expectedHeaders: string[]): boolean => {
  if (rows.length === 0) {
    return false;
  }
  
  const actualHeaders = Object.keys(rows[0]);
  return expectedHeaders.every(header => actualHeaders.includes(header));
};

// Clean and normalize CSV field values
export const cleanCsvValue = (value: string): string => {
  return value
    .trim()
    .replace(/^"|"$/g, '') // Remove surrounding quotes
    .replace(/""/g, '"') // Unescape quotes
    .replace(/\s+/g, ' '); // Normalize whitespace
};

// ESPN-specific parsers
export interface EspnTeamMapping {
  current: string;
  past1: string;
  past2: string;
  past3: string;
}

export interface EspnDraftPick {
  pick: string;
  player: string;
  team: string;
  keeper: string;
  note: string;
  misc: string;
  manage: string;
}

export interface EspnTeam {
  teamMember: string;
  member: string;
  rival: string;
  record: string;
  pointsScored: string;
  pointsAgainst: string;
  inseasonRank: string;
  finalRank: string;
  misc: string;
  manage: string;
}

export interface EspnMatchup {
  week: string;
  team: string;
  score: string;
  opponent: string;
  opponentScore: string;
  misc: string;
  manage: string;
}

// Type-safe parsers for each ESPN CSV format
export const parseTeamMappingCsv = (csvContent: string): EspnTeamMapping[] => {
  const rows = parseCsv(csvContent);
  
  if (!validateCsvHeaders(rows, ['current', 'past1', 'past2', 'past3'])) {
    throw new Error('Invalid team mapping CSV headers');
  }
  
  return rows.map(row => ({
    current: cleanCsvValue(row.current),
    past1: cleanCsvValue(row.past1),
    past2: cleanCsvValue(row.past2),
    past3: cleanCsvValue(row.past3)
  }));
};

export const parseDraftResultsCsv = (csvContent: string): EspnDraftPick[] => {
  const rows = parseCsv(csvContent);
  
  if (!validateCsvHeaders(rows, ['Pick', 'Player', 'Team'])) {
    throw new Error('Invalid draft results CSV headers');
  }
  
  return rows.map(row => ({
    pick: cleanCsvValue(row.Pick || ''),
    player: cleanCsvValue(row.Player || ''),
    team: cleanCsvValue(row.Team || ''),
    keeper: cleanCsvValue(row.Keeper || ''),
    note: cleanCsvValue(row.Note || ''),
    misc: cleanCsvValue(row.Misc || ''),
    manage: cleanCsvValue(row.Manage || '')
  }));
};

export const parseTeamsCsv = (csvContent: string): EspnTeam[] => {
  const rows = parseCsv(csvContent);
  
  if (!validateCsvHeaders(rows, ['Team/Member', 'Member', 'Record'])) {
    throw new Error('Invalid teams CSV headers');
  }
  
  return rows.map(row => ({
    teamMember: cleanCsvValue(row['Team/Member'] || ''),
    member: cleanCsvValue(row.Member || ''),
    rival: cleanCsvValue(row.Rival || ''),
    record: cleanCsvValue(row.Record || ''),
    pointsScored: cleanCsvValue(row['Points Scored'] || ''),
    pointsAgainst: cleanCsvValue(row['Points Against'] || ''),
    inseasonRank: cleanCsvValue(row['Inseason Rank'] || ''),
    finalRank: cleanCsvValue(row['Final Rank'] || ''),
    misc: cleanCsvValue(row.Misc || ''),
    manage: cleanCsvValue(row.Manage || '')
  }));
};

export const parseMatchupsCsv = (csvContent: string): EspnMatchup[] => {
  const rows = parseCsv(csvContent);
  
  if (!validateCsvHeaders(rows, ['Week', 'Team', 'Score', 'Opponent'])) {
    throw new Error('Invalid matchups CSV headers');
  }
  
  return rows.map(row => ({
    week: cleanCsvValue(row.Week || ''),
    team: cleanCsvValue(row.Team || ''),
    score: cleanCsvValue(row.Score || ''),
    opponent: cleanCsvValue(row.Opponent || ''),
    opponentScore: cleanCsvValue(row.Score || ''), // Second Score column
    misc: cleanCsvValue(row.Misc || ''),
    manage: cleanCsvValue(row.Manage || '')
  }));
};