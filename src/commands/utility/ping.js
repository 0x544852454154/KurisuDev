'use strict';
const { SlashCommandBuilder } = require('discord.js');
const ui = require('../../components/common/ui');
const { formatDuration } = require('../../utils/helpers');

const { E } = ui;

module.exports = {
  category: 'utility', permission: 'None',
  examples: { '': '/ping' },
  data: new SlashCommandBuilder().setName('ping').setDescription('Check Kurisu\'s latency.'),
  async execute(i) {
    const gateway = Math.round(i.client.ws.ping);
    const roundtrip = Date.now() - i.createdTimestamp;
    return i.reply(ui.message([
      `### ${E.redDot} PONG`,
      {
        section: `${E.ping} Gateway  **${gateway}ms**\n${E.ping} Roundtrip  **${roundtrip}ms**\n${E.ping} Uptime  **${formatDuration(Math.floor(process.uptime()))}**`,
        thumbnail: i.client.user.displayAvatarURL({ extension: 'png', size: 128 }),
      },
      'sep',
      `-# Shards ${i.client.ws.shards.size}  ·  Node ${process.versions.node}`,
    ], { ephemeral: true }));
  },
};
