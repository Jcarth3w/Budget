import { Router } from 'express';
import { getMonthlyData, getTrendsData } from '../services/reads.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const baseLog = createLogger('routes:budget');

router.get('/trends', async (req, res) => {
  const log = req.log ? req.log.child('budget:trends') : baseLog;
  log.info('Handling GET /budget/trends');

  try {
    const data = await getTrendsData({ log, monthCount: req.query.months });
    log.info('Returning trends', { monthCount: data.months.length });
    res.json(data);
  } catch (err) {
    log.error('GET /budget/trends failed', { message: err.message, stack: err.stack });
    const authFailed = /invalid_grant|invalid jwt|unauthorized/i.test(err.message || '');
    res.status(500).json({
      error: authFailed
        ? 'Google rejected the service account key. Create a new JSON key (Keys → Add key) and replace Backend/credentials.json, then restart the server.'
        : 'Failed to read sheet',
    });
  }
});

router.get('/', async (req, res) => {
  const log = req.log ? req.log.child('budget') : baseLog;
  log.info('Handling GET /budget', { month: req.query.month, year: req.query.year });

  let monthIndex;
  let year;
  if (req.query.month != null || req.query.year != null) {
    const m = parseInt(req.query.month, 10);
    const y = parseInt(req.query.year, 10);
    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }
    monthIndex = m - 1;
    year = y;
  }

  try {
    log.debug('Calling sheets.getMonthlyData()');
    const data = await getMonthlyData({ log, month: monthIndex, year });
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
