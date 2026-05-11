// Lightweight structured logger for the backend.
// Each line is prefixed with an ISO timestamp, level, and optional scope so
// we can trace a request through the routes -> services -> Google Sheets chain.

const LEVELS = {
  debug: { label: 'DEBUG', icon: '🐛', stream: 'log' },
  info:  { label: 'INFO ', icon: 'ℹ️ ', stream: 'log' },
  warn:  { label: 'WARN ', icon: '⚠️ ', stream: 'warn' },
  error: { label: 'ERROR', icon: '❌', stream: 'error' },
};

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch {
    return ' [unserializable meta]';
  }
}

function emit(level, scope, message, meta) {
  const cfg = LEVELS[level] || LEVELS.info;
  const ts = new Date().toISOString();
  const scopeTag = scope ? ` [${scope}]` : '';
  const line = `${ts} ${cfg.icon} ${cfg.label}${scopeTag} ${message}${formatMeta(meta)}`;
  // eslint-disable-next-line no-console
  console[cfg.stream](line);
}

export function createLogger(scope) {
  return {
    debug: (msg, meta) => emit('debug', scope, msg, meta),
    info:  (msg, meta) => emit('info',  scope, msg, meta),
    warn:  (msg, meta) => emit('warn',  scope, msg, meta),
    error: (msg, meta) => emit('error', scope, msg, meta),
    child: (childScope) => createLogger(scope ? `${scope}:${childScope}` : childScope),
  };
}

export const logger = createLogger();

export default logger;
