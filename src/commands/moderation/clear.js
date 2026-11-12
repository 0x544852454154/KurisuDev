'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done } = require('../_util');
const { purgeNow } = require('./purge');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Manage Messages',
  examples: { '': '/clear amount:25' },
  data: new SlashCommandBuilder().setName('clear').setDescription('Clear bot messages from this channel.')
    .setDefaultMemberPermissions(P.ManageMessages)
    .addIntegerOption((o) => o.setName('amount').setDescription('Bot messages to remove (1-50)').setMinValue(1).setMaxValue(50)),
  async execute(i) {
    const err = guard(i, { user: [P.ManageMessages], bot: [P.ManageMessages, P.ReadMessageHistory], channel: i.channel });
    if (err) return fail(i, err);
    await i.deferReply({ flags: 64 });
    try {
      const n = await purgeNow(i.channel, i.options.getInteger('amount') || 20, (m) => m.author.bot);
      await moderation.record(i.guild, { userId: i.client.user.id, moderatorId: i.user.id, action: 'purge', reason: `Cleared ${n} bot message(s) in #${i.channel.name}` });
      return done(i, E.moderatorShield, `Removed **${n}** bot message(s).`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
