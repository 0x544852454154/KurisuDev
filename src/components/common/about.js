'use strict';
const ui = require('./ui');
const { version } = require('../../../package.json');
const { formatDuration } = require('../../utils/helpers');

const { E } = ui;

function items(client, extra = []) {
  const guilds = client.guilds.cache.size;
  return [
    `### ${E.crown} ABOUT KURISU`,
    { section: `Antinuke, raid protection and moderation.\n-# Version ${version}`, thumbnail: client.user.displayAvatarURL({ extension: 'png', size: 256 }) },
    'sep',
    `Servers  **${guilds}**\nPing  **${Math.round(client.ws.ping)}ms**\nUptime  **${formatDuration(Math.floor(process.uptime()))}**\nRuntime  **Node ${process.versions.node}**`,
    ...extra,
  ];
}
module.exports = { items };
