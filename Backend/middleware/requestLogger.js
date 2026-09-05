import { randomUUID } from 'crypto';
import { createLogger } from '../utils/logger.js';

const log = createLogger('http');

// Attach a per-request id and log every request in / out so we can trace
// a single call all the way through the route -> service -> Google Sheets chain.
export default function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.id = requestId;
  req.log = log.child(requestId.slice(0, 8));
  res.setHeader('x-request-id', requestId);

  const start = process.hrtime.bigint();

  req.log.info(`--> ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    ua: req.get('user-agent'),
    body: safeBody(req.body),
  });

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const meta = {
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };
    if (res.statusCode >= 500) {
      req.log.error(`<-- ${req.method} ${req.originalUrl}`, meta);
    } else if (res.statusCode >= 400) {
      req.log.warn(`<-- ${req.method} ${req.originalUrl}`, meta);
    } else {
      req.log.info(`<-- ${req.method} ${req.originalUrl}`, meta);
    }
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      req.log.warn(`-x- ${req.method} ${req.originalUrl} (client disconnected)`);
    }
  });

  next();
}

// Avoid logging huge payloads and never echo obvious secrets back to stdout.
function safeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const clone = {};
  for (const [k, v] of Object.entries(body)) {
    if (/pass|secret|token|key/i.test(k)) {
      clone[k] = '[redacted]';
    } else if (typeof v === 'string' && v.length > 200) {
      clone[k] = v.slice(0, 200) + `…(+${v.length - 200} chars)`;
    } else {
      clone[k] = v;
    }
  }
  return clone;
}
