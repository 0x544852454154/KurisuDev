'use strict';
require('dotenv').config();

// Report the cause in plain text. Hosting panels (Pterodactyl, Bot-Hosting, ...) run
// `node index.js` and show stderr, so a thrown error is the only visible diagnosis.
function fatal(message, err) {
  console.error(`[kurisu] startup failed: ${message}`);
  if (err) console.error(err.stack || err.message || err);
  console.error('[kurisu] compare your panel settings with the requirements; nothing else was changed.');
  process.exit(1);
}

// better-sqlite3 is a native module: it needs a prebuilt binary for this Node ABI.
// On an unsupported Node version the require() itself throws, which used to surface
// as an opaque stack trace with no explanation.
let Client; let GatewayIntentBits; let Collection;
let db; let log; let load; let events; let guildLogs;
try {
  ({ Client, GatewayIntentBits, Collection } = require('discord.js'));
  db = require('./database');
  log = require('./utils/logger');
  ({ load } = require('./commands'));
  events = require('./events/core');
  guildLogs = require('./events/guildlogs');
} catch (err) {
  fatal(err?.code === 'MODULE_NOT_FOUND' && /better-sqlite3/.test(err.message)
    ? 'better-sqlite3 has no binary for this Node version. Install Node 22+ (or the exact version suitable for this ABI).'
    : 'a dependency failed to load - run `npm install` first', err);
}

// Hosting panels use their own environment variables; accept the common aliases.
if (!process.env.DISCORD_TOKEN) process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.TOKEN || process.env.BOT_TOKEN || '';
if (!process.env.CLIENT_ID) process.env.CLIENT_ID = process.env.APPLICATION_ID || process.env.APP_ID || '';

if (!process.env.DISCORD_TOKEN) {
  fatal('DISCORD_TOKEN is not set. Add it to the environment variables (or .env) of the hosting panel.');
}

try {
  db.open();
} catch (err) {
  fatal(`could not open the database at ${process.env.DATABASE_PATH || './data/kurisu.db'}`, err);
}

// Only the intents Kurisu actually uses:
//  Guilds           - channels/roles/guild cache
//  GuildMembers     - PRIVILEGED: join detection, member fetches, hierarchy checks
//  GuildModeration  - audit log entries (the antinuke detection source) and bans
//  GuildMessages    - message events, mention abuse detection and text commands
//  MessageContent   - PRIVILEGED: read text command arguments (prefix commands)
//  GuildVoiceStates - voice logs
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
  allowedMentions: { parse: [] },
  // Discord's default REST timeout is 15s. Slow or briefly interrupted connections
  // then abort interaction replies; give requests more room and let the REST layer retry.
  rest: { timeout: 30_000, retries: 3 },
});
try {
  client.commands = new Collection([...load()]);
} catch (err) {
  fatal('a command module failed to load', err);
}

for (const ev of [...events, ...guildLogs]) {
  const run = (...args) => Promise.resolve(ev.execute(...args, client)).catch((err) => log.error(`event ${ev.name} failed`, err));
  // Event handlers receive the client as the last argument only when they need it; ready receives it first.
  if (ev.once) client.once(ev.name, (...a) => run(...a)); else client.on(ev.name, run);
}

let closing = false;
async function shutdown(signal) {
  if (closing) return; closing = true;
  log.info(`${signal} received, shutting down`);
  for (const t of client.timers || []) clearInterval(t);
  try { await client.destroy(); } catch { /* ignore */ }
  db.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => log.error('unhandled rejection', err));
process.on('uncaughtException', (err) => log.error('uncaught exception', err));

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  const hint = err?.code === 'TokenInvalid' || err?.message?.includes('token')
    ? 'The token is invalid or was reset - copy a fresh one from the Developer Portal.'
    : err?.code === 'UsedDisallowedIntents'
      ? 'Enable Server Members Intent and Message Content Intent in the Developer Portal.'
      : 'Could not log in to Discord.';
  fatal(hint, err);
});
