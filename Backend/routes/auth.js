import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createLogger } from '../utils/logger.js';
import { createUser, findUserByEmail, findUserById, isRegistrationOpen, publicUser } from '../services/Auth/users.js';
import { signToken } from '../services/Auth/tokens.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();
const baseLog = createLogger('routes:auth');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCredentials(body) 
{
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (!EMAIL_RE.test(email)) {
    const err = new Error('Enter a valid email');
    err.status = 400;
    throw err;
  }
  if (password.length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }
  return { email, password };
}

function assertOwnerEmail(email) {
  const owner = process.env.AUTH_EMAIL?.trim().toLowerCase();
  if (owner && email !== owner) {
    const err = new Error('This budget is limited to its owner');
    err.status = 403;
    throw err;
  }
}

function sendAuth(res, user) {
  res.json({
    token: signToken(user),
    user: publicUser(user),
  });
}

router.get('/status', async (req, res) => {
  res.json({ registrationOpen: await isRegistrationOpen() });
});

router.post('/register', async (req, res) => {
  const log = req.log ? req.log.child('auth:register') : baseLog;

  try {
    if (!(await isRegistrationOpen())) {
      const err = new Error('This budget already has an owner');
      err.status = 403;
      throw err;
    }
    const { email, password } = parseCredentials(req.body);
    assertOwnerEmail(email);
    log.info('Registering user', { email });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, passwordHash });
    sendAuth(res, user);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      log.error('Register failed', { message: err.message, stack: err.stack });
    } else {
      log.warn('Register rejected', { message: err.message });
    }
    res.status(status).json({ error: err.message || 'Could not register' });
  }
});

router.post('/login', async (req, res) => {
  const log = req.log ? req.log.child('auth:login') : baseLog;

  try {
    const { email, password } = parseCredentials(req.body);
    log.info('Login attempt', { email });
    const user = await findUserByEmail(email);
    const ok = user && await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    sendAuth(res, user);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      log.error('Login failed', { message: err.message, stack: err.stack });
    } else {
      log.warn('Login rejected', { message: err.message });
    }
    res.status(status).json({ error: err.message || 'Could not sign in' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const log = req.log ? req.log.child('auth:me') : baseLog;
  const user = await findUserById(req.user.id);
  if (!user) {
    log.warn('Token user no longer exists', { id: req.user.id });
    return res.status(401).json({ error: 'Session expired. Sign in again.' });
  }
  res.json({ user: publicUser(user) });
});

export default router;
