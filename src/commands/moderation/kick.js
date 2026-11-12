'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done, reasonOf, auditReason } = require('../_util');
const perms = require('../../permissions');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Kick Members',
  examples: { '': '/kick user:@member reason:Rule violation' },
  data: new SlashCommandBuilder().setName('kick').setDescription('Remove a member from the server.')
    .setDefaultMemberPermissions(P.KickMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  async execute(i) {
    const err = guard(i, { user: [P.KickMembers], bot: [P.KickMembers] });
    if (err) return fail(i, err);
    const member = i.options.getMember('user');
    if (!member) return fail(i, 'That user is not in this server.');
    const bad = perms.checkTarget({ guild: i.guild, moderator: i.member, targetId: member.id, targetMember: member, verb: 'kick' });
    if (bad) return fail(i, bad);
    const reason = reasonOf(i);
    await i.deferReply();
    try {
      await member.kick(auditReason(i, reason));
      const c = await moderation.record(i.guild, { userId: member.id, moderatorId: i.user.id, action: 'kick', reason });
      return done(i, E.moderatorShield, `Kicked **${member.user.username}**. Case #${c.case_number}`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
