'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done, auditReason } = require('../_util');
const perms = require('../../permissions');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Manage Nicknames',
  examples: { '': '/nickname user:@member nickname:New Name' },
  data: new SlashCommandBuilder().setName('nickname').setDescription('Change or reset a member\'s nickname.')
    .setDefaultMemberPermissions(P.ManageNicknames)
    .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption((o) => o.setName('nickname').setDescription('New nickname (empty resets)').setMaxLength(32)),
  async execute(i) {
    const err = guard(i, { user: [P.ManageNicknames], bot: [P.ManageNicknames] });
    if (err) return fail(i, err);
    const member = i.options.getMember('user');
    if (!member) return fail(i, 'That user is not in this server.');
    if (member.id !== i.user.id) {
      const bad = perms.checkTarget({ guild: i.guild, moderator: i.member, targetId: member.id, targetMember: member, verb: 'rename' });
      if (bad) return fail(i, bad);
    }
    const nick = i.options.getString('nickname') || null;
    await i.deferReply();
    try {
      await member.setNickname(nick, auditReason(i, 'nickname'));
      await moderation.record(i.guild, { userId: member.id, moderatorId: i.user.id, action: 'nickname', reason: nick ? `Nickname set to "${nick}"` : 'Nickname reset' });
      return done(i, E.modernStaff, nick ? `Nickname for **${member.user.username}** set to **${nick}**.` : `Nickname for **${member.user.username}** reset.`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
