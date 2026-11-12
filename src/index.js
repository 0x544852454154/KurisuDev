'use strict';
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const db = require('./database');
const log = require('./utils/logger');
const { load } = require('./commands');
const events = require('./events/core');
const guildLogs = require('./events/guildlogs');

if (!process.env.DISCORD_TOKEN) { console.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.'); process.exit(1); }

db.open();

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
client.commands = new Collection([...load()]);

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

client.login(process.env.DISCORD_TOKEN);
