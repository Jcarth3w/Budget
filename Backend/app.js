import dotenv from 'dotenv';
import express from 'express';
import budgetRouter from './routes/budget.js';
import transactionRouter from './routes/transaction.js';

dotenv.config();

const app = express();

app.use(express.json());

app.use('/budget', budgetRouter);
app.use('/transaction', transactionRouter);

export default app;