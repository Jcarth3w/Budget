import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('auth:users');

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const usersFile = path.join(dataDir, 'users.json');

/**
 * File-backed user store. Same function names as a future DB repository:
 * findUserByEmail, findUserById, createUser.
 */
async function readAll() {
  try {
    const raw = await fs.readFile(usersFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(users) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export async function findUserByEmail(email) {
  const needle = String(email || '').trim().toLowerCase();
  const users = await readAll();
  return users.find((u) => u.email === needle) || null;
}

export async function findUserById(id) {
  const users = await readAll();
  return users.find((u) => u.id === id) || null;
}

export async function countUsers() {
  const users = await readAll();
  return users.length;
}

export async function isRegistrationOpen() {
  return (await countUsers()) === 0;
}

export async function createUser({ email, passwordHash }) {
  const normalized = String(email || '').trim().toLowerCase();
  const users = await readAll();
  if (users.length >= 1) {
    const err = new Error('This budget already has an owner');
    err.status = 403;
    throw err;
  }
  if (users.some((u) => u.email === normalized)) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const user = {
    id: randomUUID(),
    email: normalized,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeAll(users);
  log.info('Created user', { id: user.id, email: user.email });
  return user;
}
