import './config.js';
import app from './app.js';
import { createLogger } from './utils/logger.js';
import { verifyGoogleCredentials } from './services/Auth/sheetsConnection.js';

const log = createLogger('server');
const PORT = process.env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  log.info(`Server running on http://0.0.0.0:${PORT}`);
  log.info('Try: GET /health  and  GET /budget');

  verifyGoogleCredentials({ log }).catch((err) => {
    const authFailed = /invalid_grant|invalid jwt|unauthorized/i.test(err.message || '');
    log.error('Google Sheets auth check failed — budget endpoints will return errors until fixed', {
      message: err.message,
      fix: authFailed
        ? 'In Google Cloud Console: IAM → Service Accounts → your account → Keys → Add key → JSON. Replace Backend/credentials.json and restart. Share the sheet with the service account email.'
        : 'Check SHEET_ID, SHEET_NAME, and that the sheet is shared with the service account.',
    });
  });
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection', {
    message: reason?.message,
    stack: reason?.stack,
  });
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception', { message: err.message, stack: err.stack });
});
