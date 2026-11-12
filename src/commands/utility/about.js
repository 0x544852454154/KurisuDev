'use strict';
const { SlashCommandBuilder } = require('discord.js');
const about = require('../../components/common/about');
const ui = require('../../components/common/ui');

module.exports = {
  category: 'utility', permission: 'None',
  examples: { '': '/about' },
  data: new SlashCommandBuilder().setName('about').setDescription('Information about Kurisu.'),
  async execute(i) { return i.reply(ui.message(about.items(i.client), { ephemeral: true })); },
};
