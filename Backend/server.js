import './config.js';
import app from './app.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('server');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  log.info(`Server running on http://localhost:${PORT}`);
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
