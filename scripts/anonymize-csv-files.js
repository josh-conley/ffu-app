#!/usr/bin/env node

/**
 * Script to anonymize PII in ESPN CSV files
 * Replaces ESPN usernames in the Member column with anonymous identifiers
 * 
 * Usage: node scripts/anonymize-csv-files.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CsvAnonymizer {
  constructor() {
    this.inputDir = path.join(__dirname, '../public/old-league-data');
    this.usernameMap = new Map(); // Maps real username to anonymous ID
    this.anonymousCounter = 1;
  }

  // Get or create anonymous ID for username
  getAnonymousId(username) {
    if (!username || username.trim() === '') return '';
    
    if (this.usernameMap.has(username)) {
      return this.usernameMap.get(username);
    }
    
    const anonymousId = `user${this.anonymousCounter.toString().padStart(3, '0')}`;
    this.usernameMap.set(username, anonymousId);
    this.anonymousCounter++;
    
    return anonymousId;
  }

  // Parse CSV row (simple implementation)
  parseRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Build CSV row from array
  buildRow(values) {
    return values.map(value => {
      // Quote values that contain commas or quotes
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }

  // Anonymize a single CSV file
  anonymizeFile(filename) {
    const filePath = path.join(this.inputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filename}`);
      return false;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      if (lines.length === 0) {
        console.log(`⚠️  Empty file: ${filename}`);
        return false;
      }

      // Parse header to find Member column (should be exactly "Member", not "Team/Member")
      const headers = this.parseRow(lines[0]);
      const memberColumnIndex = headers.findIndex(h => h.trim().toLowerCase() === 'member');
      
      if (memberColumnIndex === -1) {
        console.log(`ℹ️  No Member column found in ${filename}, skipping`);
        return true;
      }

      console.log(`🔄 Anonymizing ${filename}...`);

      // Process each row
      const anonymizedLines = [lines[0]]; // Keep header as-is
      
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseRow(lines[i]);
        
        // Anonymize the Member column
        if (values[memberColumnIndex]) {
          values[memberColumnIndex] = this.getAnonymousId(values[memberColumnIndex]);
        }
        
        anonymizedLines.push(this.buildRow(values));
      }

      // Write back to file
      fs.writeFileSync(filePath, anonymizedLines.join('\n'));
      console.log(`✅ Anonymized ${filename}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
      return false;
    }
  }

  // Anonymize all ESPN CSV files
  async anonymizeAllFiles() {
    console.log('🚀 Starting CSV anonymization...');
    console.log(`📁 Directory: ${this.inputDir}`);

    const files = fs.readdirSync(this.inputDir)
      .filter(file => file.startsWith('ESPN') && file.endsWith('.csv'));

    let successCount = 0;
    let totalCount = files.length;

    for (const file of files) {
      if (this.anonymizeFile(file)) {
        successCount++;
      }
    }

    console.log('\n📊 Anonymization Summary');
    console.log('═'.repeat(50));
    console.log(`✅ Successfully anonymized: ${successCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}`);
    console.log(`🔒 Total usernames anonymized: ${this.usernameMap.size}`);
    console.log('\n🎉 CSV anonymization complete!');
  }
}

// Run the script
async function main() {
  const anonymizer = new CsvAnonymizer();
  await anonymizer.anonymizeAllFiles();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CsvAnonymizer };