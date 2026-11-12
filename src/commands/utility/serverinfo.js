'use strict';
const { SlashCommandBuilder, ChannelType } = require('discord.js');
const ui = require('../../components/common/ui');
const { clip } = require('../../utils/helpers');

const { E } = ui;
const VERIFICATION = ['None', 'Low', 'Medium', 'High', 'Very High'];

module.exports = {
  category: 'utility', permission: 'None',
  examples: { '': '/serverinfo' },
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show information about this server.'),
  async execute(i) {
    if (!i.inGuild()) return i.reply(ui.error('This command only works in a server.'));
    const g = i.guild;
    const text = g.channels.cache.filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement).size;
    const voice = g.channels.cache.filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).size;
    const categories = g.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
    const icon = g.iconURL({ extension: 'png', size: 256 });
    return i.reply(ui.message([
      `### ${E.crown} ${clip(g.name, 80)}`,
      {
        section: `**Server information**\n-# ID \`${g.id}\`\nCreated <t:${Math.floor(g.createdTimestamp / 1000)}:R>`,
        thumbnail: icon || undefined,
      },
      'sep',
      `Members  **${g.memberCount.toLocaleString('en-US')}**\nOwner  <@${g.ownerId}>\nBoosts  **${(g.premiumSubscriptionCount || 0).toLocaleString('en-US')}**  ·  Tier **${g.premiumTier}**`,
      'sep',
      `Text channels  **${text}**\nVoice channels  **${voice}**\nCategories  **${categories}**\nRoles  **${g.roles.cache.size}**\nEmojis  **${g.emojis?.cache?.size ?? 0}**\nStickers  **${g.stickers?.cache?.size ?? 0}**`,
      'sep',
      `Verification  **${VERIFICATION[g.verificationLevel] || 'Unknown'}**\nFeatures  **${g.features.length ? clip(g.features.join(', '), 300) : 'None'}**`,
    ]));
  },
};
