'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done, reasonOf, auditReason } = require('../_util');
const perms = require('../../permissions');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { LIMITS } = require('../../config/settings');
const { describeError, parseDuration, formatDuration } = require('../../utils/helpers');

module.exports = {
  category: 'moderation', permission: 'Moderate Members',
  examples: { '': '/timeout user:@member duration:1h reason:Spam' },
  data: new SlashCommandBuilder().setName('timeout').setDescription('Temporarily restrict a member.')
    .setDefaultMemberPermissions(P.ModerateMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member to time out').setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription('e.g. 30m, 2h, 1d (max 28d)').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  async execute(i) {
    const err = guard(i, { user: [P.ModerateMembers], bot: [P.ModerateMembers] });
    if (err) return fail(i, err);
    const member = i.options.getMember('user');
    if (!member) return fail(i, 'That user is not in this server.');
    const sec = parseDuration(i.options.getString('duration', true));
    if (!sec || sec > LIMITS.timeoutMaxSec) return fail(i, 'Duration must look like 30m, 2h or 1d, and be at most 28 days.');
    const bad = perms.checkTarget({ guild: i.guild, moderator: i.member, targetId: member.id, targetMember: member, verb: 'time out' });
    if (bad) return fail(i, bad);
    if (!member.moderatable) return fail(i, 'I cannot time out that member (administrator or higher role).');
    const reason = reasonOf(i);
    await i.deferReply();
    try {
      await member.timeout(sec * 1000, auditReason(i, reason));
      const c = await moderation.record(i.guild, { userId: member.id, moderatorId: i.user.id, action: 'timeout', reason, durationSec: sec });
      return done(i, E.timeoutClock, `Timed out **${member.user.username}** for ${formatDuration(sec)}. Case #${c.case_number}`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
