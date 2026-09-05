import { createLogger } from '../utils/logger.js';

const log = createLogger('http');

// Catch-all so unexpected errors are still logged with the request id.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, _next) {
  const reqLog = req.log || log;
  reqLog.error('Unhandled error in request', {
    message: err.message,
    stack: err.stack,
  });
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
