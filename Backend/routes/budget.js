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
      remaining: data.remaining,
    });
    res.json(data);
  } catch (err) {
    log.error('GET /budget failed', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to read sheet' });
  }
});

export default router;
