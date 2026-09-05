import dotenv from 'dotenv';
import express from 'express';
import cors from './middleware/cors.js';
import requestLogger from './middleware/requestLogger.js';
import requireAuth from './middleware/requireAuth.js';
import errorHandler from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import budgetRouter from './routes/budget.js';
import transactionRouter from './routes/transaction.js';

dotenv.config();

const app = express();

// Fresh GETs must not 304 — the web app needs a JSON body every time.
app.set('etag', false);

app.use(express.json());
app.use(cors);
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/budget', requireAuth, budgetRouter);
app.use('/transaction', requireAuth, transactionRouter);

app.use(errorHandler);

export default app;
