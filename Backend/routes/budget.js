import { Router } from 'express';
import { getMonthlyData } from '../services/sheets.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const baseLog = createLogger('routes:budget');

router.get('/', async (req, res) => {
  const log = req.log ? req.log.child('budget') : baseLog;
  log.info('Handling GET /budget');

  try {
    log.debug('Calling sheets.getMonthlyData()');
    const data = await getMonthlyData({ log });
    log.info('Returning monthly budget data', {
      earned: data.earned,
      spent: data.spent,
      rollover: data.rollover,
      available: data.available,
      remaining: data.remaining,
    });
    res.json(data);
  } catch (err) {
    log.error('GET /budget failed', { message: err.message, stack: err.stack });
    const authFailed = /invalid_grant|invalid jwt|unauthorized/i.test(err.message || '');
    res.status(500).json({
      error: authFailed
        ? 'Google rejected the service account key. Create a new JSON key (Keys → Add key) and replace Backend/credentials.json, then restart the server.'
        : 'Failed to read sheet',
    });
  }
});

export default router;
