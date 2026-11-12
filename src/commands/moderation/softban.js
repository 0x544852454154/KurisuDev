'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done, reasonOf, auditReason } = require('../_util');
const perms = require('../../permissions');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Ban Members',
  examples: { '': '/softban user:@member reason:Spam cleanup' },
  data: new SlashCommandBuilder().setName('softban').setDescription('Ban and immediately unban to delete recent messages.')
    .setDefaultMemberPermissions(P.BanMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  async execute(i) {
    const err = guard(i, { user: [P.BanMembers], bot: [P.BanMembers] });
    if (err) return fail(i, err);
    const user = i.options.getUser('user', true);
    const bad = perms.checkTarget({ guild: i.guild, moderator: i.member, targetId: user.id, targetMember: i.options.getMember('user'), verb: 'softban' });
    if (bad) return fail(i, bad);
    const reason = reasonOf(i);
    await i.deferReply();
    try {
      await i.guild.members.ban(user.id, { reason: auditReason(i, `softban: ${reason}`), deleteMessageSeconds: 7 * 86400 });
      await i.guild.bans.remove(user.id, 'Softban: immediate unban');
      const c = await moderation.record(i.guild, { userId: user.id, moderatorId: i.user.id, action: 'softban', reason });
      return done(i, E.banHammer, `Softbanned **${user.username}**. Case #${c.case_number}`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
