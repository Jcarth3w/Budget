import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';

const baseLog = createLogger('services:sheets');

/**
 * Credentials (first match wins):
 * - GOOGLE_SERVICE_ACCOUNT_JSON — full service account JSON (recommended on Railway).
 * - GOOGLE_CREDENTIALS_B64 — base64 of that JSON.
 * - GOOGLE_APPLICATION_CREDENTIALS — either a filesystem path to the .json file, OR the same JSON
 *   pasted inline (many hosts use this name; we detect `{` and parse as JSON).
 * - Default file: credentials.json in the Backend cwd.
 */
function resolveGoogleAuthOptions(log) {

    const creds = [
        'GOOGLE_SERVICE_ACCOUNT_JSON',
        'GOOGLE_CREDENTIALS_B64',
        'GOOGLE_APPLICATION_CREDENTIALS',
      ];
      
    for (const cred of creds) {
        const credValue = process.env[cred]?.trim();
        if (credValue) {
            try {
                switch (cred) {
                    case 'GOOGLE_SERVICE_ACCOUNT_JSON': {
                        const credentials = JSON.parse(credValue);
                        return {
                            options: { credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
                            meta: { authMode: 'GOOGLE_SERVICE_ACCOUNT_JSON' },
                        };
                    }
                    case 'GOOGLE_CREDENTIALS_B64': {
                        const json = Buffer.from(credValue, 'base64').toString('utf8');
                        const credentials = JSON.parse(json);
                        return {
                            options: { credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
                            meta: { authMode: 'GOOGLE_CREDENTIALS_B64' },
                        };
                    }
                    case 'GOOGLE_APPLICATION_CREDENTIALS': {
                        if (gac.startsWith('{')) {
                            try {
                              const credentials = JSON.parse(gac);
                              return {
                                options: { credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
                                meta: { authMode: 'GOOGLE_APPLICATION_CREDENTIALS_json' },
                              };
                            } catch (e) {
                              throw new Error(
                                `GOOGLE_APPLICATION_CREDENTIALS starts with "{" but is not valid JSON (${e.message}). ` +
                                  'Fix the value or use a file path to your key file.'
                              );
                            }
                          }
                          const resolved = resolveCredentialsPath(gac);
                          if (fs.existsSync(resolved)) {
                            return {
                              options: { keyFile: resolved, scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
                              meta: { authMode: 'keyFile', credentialsPath: resolved },
                            };
                          }
                          log.error('Google credentials file not found', { path: gac, resolved });
                          throw new Error(
                            `GOOGLE_APPLICATION_CREDENTIALS is set to a path that does not exist: ${gac} (resolved: ${resolved}). ` +
                              'Use a real path to your .json key file, paste the full service account JSON (object starting with "{"), ' +
                              'or set GOOGLE_SERVICE_ACCOUNT_JSON instead.'
                          );
                    }
                    default:
                        throw new Error(`Invalid credential type: ${cred}`);
                }
                break;

                const defaultPath = path.resolve(BACKEND_ROOT, 'credentials.json');
                if (!fs.existsSync(defaultPath)) {
                log.error('Google credentials file not found', { path: defaultPath });
                throw new Error(
                    'No Google credentials: set GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_CREDENTIALS_B64, ' +
                    'GOOGLE_APPLICATION_CREDENTIALS (path or inline JSON), or add credentials.json in the Backend folder.'
                );
                }
                return {
                    options: { keyFile: defaultPath, scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
                    meta: { authMode: 'keyFile', credentialsPath: defaultPath },
                  };
            } catch (e) {
                throw new Error(`${cred} is not valid JSON: ${e.message}`);
            }
        }
    }
}
  
  const { options: googleAuthOptions, meta: authMeta } = resolveGoogleAuthOptions(baseLog);
  
  baseLog.info('Sheets service initialized', {
    sheetId: SHEET_ID,
    sheetName: SHEET_NAME,
    ...authMeta,
  });


export { resolveGoogleAuthOptions };