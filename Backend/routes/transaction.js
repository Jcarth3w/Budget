import { Router } from 'express';
import { writeTransaction } from '../services/writes.js';
import { createLogger } from '../utils/logger.js';
import { EARNED_COLS, SPENDING_COLS, parseClientDate } from '../utils/parseTools.js';

const router = Router();
const baseLog = createLogger('routes:transaction');

const NOTE_MAX = 500;

router.post('/', async (req, res) => {
  const log = req.log ? req.log.child('transaction') : baseLog;
  const { amount, category, date, note } = req.body;
  const type = req.body.type === 'income' ? 'income' : 'spend';

  log.info('Handling POST /transaction', { amount, category, date, type, user: req.user?.email });

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    log.warn('Rejected: invalid amount', { amount });
    return res.status(400).json({ error: 'Invalid amount' });
  }

  let column = category;
  if (type === 'income') {
    column = EARNED_COLS.includes(column) ? column : 'D';
  } else if (!column || !SPENDING_COLS.includes(column)) {
    log.warn('Rejected: invalid category', { category });
    return res.status(400).json({ error: 'Invalid category' });
  }

  const transactionDate = parseClientDate(date);
  if (!transactionDate || isNaN(transactionDate.getTime())) {
    log.warn('Rejected: invalid date', { date });
    return res.status(400).json({ error: 'Invalid date' });
  }

  const trimmedNote = typeof note === 'string' ? note.trim().slice(0, NOTE_MAX) : '';

  try {
    log.debug('Calling sheets.writeTransaction()', {
      amount: parseFloat(amount),
      category: column,
      type,
      date: transactionDate.toISOString(),
      hasNote: Boolean(trimmedNote),
    });
    const result = await writeTransaction({
      amount: parseFloat(amount),
      category: column,
      date: transactionDate,
      note: trimmedNote,
      log,
    });

    log.info('Transaction written successfully', result);
    res.json({ success: true, type, ...result });
  } catch (err) {
    log.error('POST /transaction failed', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message || 'Failed to write transaction' });
  }
});

export default router;
