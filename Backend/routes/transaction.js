import { Router } from 'express';
import { writeTransaction } from '../services/sheets.js';

const router = Router();

// Valid category columns
const VALID_CATEGORIES = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

router.post('/', async (req, res) => {
  const { amount, category, date } = req.body;

  // Validate inputs
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  // Use today's date if none provided
  const transactionDate = date ? new Date(date) : new Date();
  if (isNaN(transactionDate)) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  try {
    const result = await writeTransaction({
      amount: parseFloat(amount),
      category,
      date: transactionDate,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ /transaction error:', err);
    res.status(500).json({ error: err.message || 'Failed to write transaction' });
  }
});

export default router;