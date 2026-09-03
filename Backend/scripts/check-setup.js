import '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyGoogleCredentials } from '../services/sheets.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

if (!process.env.SHEET_ID) {
  fail('Missing SHEET_ID in Backend/.env');
}

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(backendRoot, process.env.GOOGLE_APPLICATION_CREDENTIALS.replace(/^\.\//, ''))
  : path.join(backendRoot, 'credentials.json');

if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_CREDENTIALS_B64) {
  if (!fs.existsSync(credPath)) {
    fail(`credentials file not found at ${credPath}`);
  }
  console.log(`✓ credentials file: ${credPath}`);
}

console.log(`✓ SHEET_ID set, SHEET_NAME=${process.env.SHEET_NAME || new Date().getFullYear()}`);

try {
  await verifyGoogleCredentials();
  console.log('✓ Google service account authenticated successfully');
  console.log('\nRun the API with: npm start\n');
} catch (err) {
  fail(
    `Google rejected the service account key (${err.message}).\n` +
      'Create a new JSON key: Google Cloud Console → IAM & Admin → Service Accounts →\n' +
      '  budget-app@… → Keys → Add key → JSON → save as Backend/credentials.json\n' +
      'Then share your Google Sheet with the service account email (Editor access).'
  );
}
