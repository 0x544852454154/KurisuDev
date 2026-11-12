'use strict';
const { SlashCommandBuilder } = require('discord.js');
const ui = require('../../components/common/ui');
const { BRANDING_GIF } = require('../../config/branding');

const { E } = ui;

module.exports = {
  category: 'utility', permission: 'None',
  examples: { '': '/invite' },
  data: new SlashCommandBuilder().setName('invite').setDescription('Get the link to add Kurisu to your server.'),
  async execute(i) {
    return i.reply(ui.message([
      `### ${E.shinyLink} INVITE KURISU`,
      '**Antinuke, Security & Moderation**\n-# Add Kurisu to your server with the button below.',
      { media: BRANDING_GIF },
      'sep',
      ui.buttons(ui.emojiBtn('ki:invite', E.shinyLink)),
    ]));
  },
};
