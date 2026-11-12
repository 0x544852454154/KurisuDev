'use strict';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Retry transient Discord/network failures (5xx, resets). 4xx are never retried. */
async function retry(fn, attempts = 3, baseMs = 400) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) {
      last = err;
      const status = err?.status ?? err?.httpStatus;
      const transient = (status && status >= 500) || ['ECONNRESET', 'ETIMEDOUT', 'UND_ERR_SOCKET'].includes(err?.code);
      if (!transient || i === attempts - 1) throw err;
      await sleep(baseMs * 2 ** i);
    }
  }
  throw last;
}

/** "30s", "10m", "2h", "1d", "1w", "90" (minutes). Returns seconds or null. */
function parseDuration(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  const re = /(\d+)\s*(s|m|h|d|w)?/g;
  const unit = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  let total = 0; let matched = '';
  let m;
  while ((m = re.exec(s)) !== null) { total += Number(m[1]) * unit[m[2] || 'm']; matched += m[0]; }
  if (!total || matched.replace(/\s/g, '') !== s.replace(/\s/g, '')) return null;
  return total;
}

function formatDuration(sec) {
  const parts = [];
  const units = [['w', 604800], ['d', 86400], ['h', 3600], ['m', 60], ['s', 1]];
  for (const [n, v] of units) { if (sec >= v) { parts.push(`${Math.floor(sec / v)}${n}`); sec %= v; } }
  return parts.join(' ') || '0s';
}

const ts = (ms = Date.now(), style = 'R') => `<t:${Math.floor(ms / 1000)}:${style}>`;
const clip = (s, n = 200) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || '');
const parseIds = (s) => [...new Set(String(s || '').match(/\d{17,20}/g) || [])];

/** "1 user", "1,234 users" - the bot's watching presence. */
const presenceName = (n) => `${Number(n).toLocaleString('en-US')} user${Number(n) === 1 ? '' : 's'}`;

/** Human message for the Discord API errors people actually hit. */
function describeError(err) {
  const map = {
    50013: 'I am missing the permissions needed for that.',
    50001: 'I do not have access to that.',
    10007: 'That member is not in this server.',
    10013: 'That user does not exist.',
    10026: 'That ban does not exist.',
    10011: 'That role does not exist.',
    10003: 'That channel does not exist.',
    50035: 'Invalid input.',
    30013: 'The server has hit a limit for that.',
    20028: 'Rate limited by Discord. Try again shortly.',
  };
  return map[err?.code] || (err?.message ? clip(err.message, 160) : 'Unknown error.');
}

module.exports = { sleep, retry, parseDuration, formatDuration, ts, clip, parseIds, presenceName, describeError };
