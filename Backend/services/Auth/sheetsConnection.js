import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../../utils/logger.js';

const baseLog = createLogger('services:sheets');

export const SHEET_ID = process.env.SHEET_ID;
export const SHEET_NAME = process.env.SHEET_NAME || String(new Date().getFullYear());

if (!SHEET_ID) {
  baseLog.error('Missing SHEET_ID environment variable');
  throw new Error('Missing SHEET_ID environment variable. Add SHEET_ID=your_google_sheet_id to your .env file.');
}


function resolveGoogleAuthOptions(log) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || 'credentials.json';
  const resolved = path.isAbsolute(credPath)
    ? credPath
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', credPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Google credentials file not found: ${resolved}`);
  }
  return {
    options: { keyFile: resolved, scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
    meta: { authMode: 'keyFile', credentialsPath: resolved },
  };
}

const { options: googleAuthOptions } = resolveGoogleAuthOptions(baseLog);

baseLog.info('Sheets service initialized', {googleAuthOptions});

const auth = new google.auth.GoogleAuth(googleAuthOptions);

async function getSheets(log = baseLog) {
  log.debug('Getting Google Sheets client');
  const client = await auth.getClient();
  log.debug('Google auth client obtained');
  return google.sheets({ version: 'v4', auth: client });
}

export { getSheets, auth };

export async function verifyGoogleCredentials({ log = baseLog } = {}) {
  const scoped = log.child ? log.child('verify') : log;
  scoped.debug('Verifying Google service account');
  const client = await auth.getClient();
  await client.getAccessToken();
  scoped.info('Google service account credentials are valid');
}