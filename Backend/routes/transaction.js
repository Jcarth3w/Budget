import { Router } from 'express';
import { writeTransaction } from '../services/sheets.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const baseLog = createLogger('routes:transaction');

// Valid category columns
const VALID_CATEGORIES = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

router.post('/', async (req, res) => {
  const log = req.log ? req.log.child('transaction') : baseLog;
  const { amount, category, date } = req.body;

  log.info('Handling POST /transaction', { amount, category, date });

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    log.warn('Rejected: invalid amount', { amount });
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    log.warn('Rejected: invalid category', { category });
    return res.status(400).json({ error: 'Invalid category' });
  }

  const transactionDate = date ? new Date(date) : new Date();
  if (isNaN(transactionDate)) {
    log.warn('Rejected: invalid date', { date });
    return res.status(400).json({ error: 'Invalid date' });
  }

  try {
    log.debug('Calling sheets.writeTransaction()', {
      amount: parseFloat(amount),
      category,
      date: transactionDate.toISOString(),
    });
    const result = await writeTransaction({
      amount: parseFloat(amount),
      category,
      date: transactionDate,
      log,
    });

    log.info('Transaction written successfully', result);
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('POST /transaction failed', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message || 'Failed to write transaction' });
  }
});

export default router;
