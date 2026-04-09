import express from 'express';
import budgetRouter from './routes/budget.js';
import transactionRouter from './routes/transaction.js';

const app = express();

app.use(express.json());

app.use('/budget', budgetRouter);
app.use('/transaction', transactionRouter);

export default app;