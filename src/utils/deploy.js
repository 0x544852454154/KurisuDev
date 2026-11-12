'use strict';
const { REST, Routes } = require('discord.js');
const log = require('./logger');

/** Registers every command. Guild-only (contexts: [0]). Uses DEV_GUILD_ID for instant guild registration if set. */
async function deployCommands(commands) {
  const token = process.env.DISCORD_TOKEN; const clientId = process.env.CLIENT_ID;
  if (!token || !clientId) throw new Error('DISCORD_TOKEN and CLIENT_ID are required to register commands');
  const body = [...commands.values()].map((c) => ({ ...c.data.toJSON(), contexts: [0] }));
  const rest = new REST({ version: '10' }).setToken(token);
  const route = process.env.DEV_GUILD_ID ? Routes.applicationGuildCommands(clientId, process.env.DEV_GUILD_ID) : Routes.applicationCommands(clientId);
  await rest.put(route, { body });
  log.info(`registered ${body.length} commands ${process.env.DEV_GUILD_ID ? `to guild ${process.env.DEV_GUILD_ID}` : 'globally'}`);
  return body.length;
}
module.exports = { deployCommands };
