'use strict';
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
function current() { return LEVELS[process.env.LOG_LEVEL] || LEVELS.info; }
function emit(level, msg, meta) {
  if (LEVELS[level] < current()) return;
  const line = { t: new Date().toISOString(), level, msg };
  if (meta !== undefined) line.meta = meta instanceof Error ? { message: meta.message, stack: meta.stack, code: meta.code } : meta;
  (level === 'error' || level === 'warn' ? console.error : console.log)(JSON.stringify(line));
}
module.exports = {
  debug: (m, x) => emit('debug', m, x), info: (m, x) => emit('info', m, x),
  warn: (m, x) => emit('warn', m, x), error: (m, x) => emit('error', m, x),
};
