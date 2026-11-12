'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P, ChannelType } = require('discord.js');
const { guard, fail, done, auditReason } = require('../_util');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Manage Channels',
  examples: { '': '/slowmode seconds:10 channel:#general' },
  data: new SlashCommandBuilder().setName('slowmode').setDescription('Set a channel\'s slowmode.')
    .setDefaultMemberPermissions(P.ManageChannels)
    .addIntegerOption((o) => o.setName('seconds').setDescription('0 disables slowmode (max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption((o) => o.setName('channel').setDescription('Channel (default: current)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
  async execute(i) {
    const ch = i.options.getChannel('channel') || i.channel;
    const err = guard(i, { user: [P.ManageChannels], bot: [P.ManageChannels], channel: ch });
    if (err) return fail(i, err);
    const sec = i.options.getInteger('seconds', true);
    await i.deferReply();
    try {
      await ch.setRateLimitPerUser(sec, auditReason(i, 'slowmode'));
      await moderation.record(i.guild, { userId: i.user.id, moderatorId: i.user.id, action: 'lock', reason: `Slowmode ${sec}s in #${ch.name}` });
      return done(i, E.timeoutClock, sec ? `Slowmode in <#${ch.id}> set to **${sec}s**.` : `Slowmode disabled in <#${ch.id}>.`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
