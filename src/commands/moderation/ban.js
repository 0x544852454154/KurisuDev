'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done, reasonOf, auditReason } = require('../_util');
const perms = require('../../permissions');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Ban Members',
  examples: { '': '/ban user:@member reason:Spam' },
  data: new SlashCommandBuilder().setName('ban').setDescription('Ban a member from the server.')
    .setDefaultMemberPermissions(P.BanMembers)
    .addUserOption((o) => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400))
    .addIntegerOption((o) => o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)),
  async execute(i) {
    const err = guard(i, { user: [P.BanMembers], bot: [P.BanMembers] });
    if (err) return fail(i, err);
    const user = i.options.getUser('user', true);
    const bad = perms.checkTarget({ guild: i.guild, moderator: i.member, targetId: user.id, targetMember: i.options.getMember('user'), verb: 'ban' });
    if (bad) return fail(i, bad);
    const reason = reasonOf(i);
    await i.deferReply();
    try {
      await i.guild.members.ban(user.id, { reason: auditReason(i, reason), deleteMessageSeconds: (i.options.getInteger('delete_days') || 0) * 86400 });
      const c = await moderation.record(i.guild, { userId: user.id, moderatorId: i.user.id, action: 'ban', reason });
      return done(i, E.banHammer, `Banned **${user.username}**. Case #${c.case_number}`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
