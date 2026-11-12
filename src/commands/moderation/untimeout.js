'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done, reasonOf, auditReason } = require('../_util');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Moderate Members',
  examples: { '': '/untimeout user:@member' },
  data: new SlashCommandBuilder().setName('untimeout').setDescription('Remove a member\'s timeout.')
    .setDefaultMemberPermissions(P.ModerateMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  async execute(i) {
    const err = guard(i, { user: [P.ModerateMembers], bot: [P.ModerateMembers] });
    if (err) return fail(i, err);
    const member = i.options.getMember('user');
    if (!member) return fail(i, 'That user is not in this server.');
    if (!member.isCommunicationDisabled()) return fail(i, 'That member is not timed out.');
    const reason = reasonOf(i);
    await i.deferReply();
    try {
      await member.timeout(null, auditReason(i, reason));
      const c = await moderation.record(i.guild, { userId: member.id, moderatorId: i.user.id, action: 'untimeout', reason });
      return done(i, E.timeoutClock, `Removed timeout from **${member.user.username}**. Case #${c.case_number}`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
