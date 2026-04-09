import { Router } from 'express';
import { getMonthlyData } from '../services/sheets.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const data = await getMonthlyData();
    res.json(data);
  } catch (err) {
    console.error('❌ /budget error:', err);
    res.status(500).json({ error: 'Failed to read sheet' });
  }
});

export default router;