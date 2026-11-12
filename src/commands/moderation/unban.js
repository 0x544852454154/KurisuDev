'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done, reasonOf, auditReason } = require('../_util');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError, parseIds } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Ban Members',
  examples: { '': '/unban user_id:123456789012345678 reason:Appeal accepted' },
  data: new SlashCommandBuilder().setName('unban').setDescription('Remove a ban.')
    .setDefaultMemberPermissions(P.BanMembers)
    .addStringOption((o) => o.setName('user_id').setDescription('ID of the banned user').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  async execute(i) {
    const err = guard(i, { user: [P.BanMembers], bot: [P.BanMembers] });
    if (err) return fail(i, err);
    const id = parseIds(i.options.getString('user_id', true))[0];
    if (!id) return fail(i, 'Provide a valid user ID.');
    const reason = reasonOf(i);
    await i.deferReply();
    try {
      await i.guild.bans.remove(id, auditReason(i, reason));
      const c = await moderation.record(i.guild, { userId: id, moderatorId: i.user.id, action: 'unban', reason });
      return done(i, E.banHammer, `Unbanned <@${id}>. Case #${c.case_number}`);
    } catch (e) { return fail(i, e.code === 10026 ? 'That user is not banned.' : describeError(e)); }
  },
};
