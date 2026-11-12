'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done, reasonOf, auditReason } = require('../_util');
const perms = require('../../permissions');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

const sub = (name, desc) => (s) => s.setName(name).setDescription(desc)
  .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
  .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400));

module.exports = {
  category: 'moderation', permission: 'Manage Roles',
  examples: { add: '/role add user:@member role:@Member', remove: '/role remove user:@member role:@Member' },
  data: new SlashCommandBuilder().setName('role').setDescription('Add or remove a role.')
    .setDefaultMemberPermissions(P.ManageRoles)
    .addSubcommand(sub('add', 'Give a role to a member.'))
    .addSubcommand(sub('remove', 'Take a role from a member.')),
  async execute(i) {
    const err = guard(i, { user: [P.ManageRoles], bot: [P.ManageRoles] });
    if (err) return fail(i, err);
    const adding = i.options.getSubcommand() === 'add';
    const member = i.options.getMember('user');
    const role = i.options.getRole('role', true);
    if (!member) return fail(i, 'That user is not in this server.');
    if (role.id === i.guild.id || role.managed) return fail(i, 'That role cannot be assigned manually.');
    const me = i.guild.members.me;
    if (role.position >= me.roles.highest.position) return fail(i, 'That role is above or equal to my highest role.');
    if (i.user.id !== i.guild.ownerId && role.position >= i.member.roles.highest.position) return fail(i, 'That role is above or equal to your highest role.');
    const bad = perms.checkTarget({ guild: i.guild, moderator: i.member, targetId: member.id, targetMember: member, verb: 'modify' });
    if (bad && member.id !== i.user.id) return fail(i, bad);
    if (adding === member.roles.cache.has(role.id)) return fail(i, adding ? 'They already have that role.' : 'They do not have that role.');
    const reason = reasonOf(i);
    await i.deferReply();
    try {
      if (adding) await member.roles.add(role.id, auditReason(i, reason)); else await member.roles.remove(role.id, auditReason(i, reason));
      await moderation.record(i.guild, { userId: member.id, moderatorId: i.user.id, action: 'role', reason: `${adding ? 'Added' : 'Removed'} ${role.name}: ${reason}` });
      return done(i, E.modernStaff, `${adding ? 'Added' : 'Removed'} **${role.name}** ${adding ? 'to' : 'from'} **${member.user.username}**.`);
    } catch (e) { return fail(i, describeError(e)); }
  },
};
