'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P, ChannelType } = require('discord.js');
const { guard, fail, done, reasonOf, auditReason } = require('../_util');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { describeError } = require('../../utils/helpers');

/** Builds lock/unlock/hide/unhide: edits one @everyone overwrite flag. */
function make({ name, description, flag, value, action, verbPast, emoji, example }) {
  return {
    category: 'moderation', permission: 'Manage Channels',
    examples: { '': example },
    data: new SlashCommandBuilder().setName(name).setDescription(description)
      .setDefaultMemberPermissions(P.ManageChannels)
      .addChannelOption((o) => o.setName('channel').setDescription('Channel (default: current)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildForum))
      .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),
    async execute(i) {
      const ch = i.options.getChannel('channel') || i.channel;
      const err = guard(i, { user: [P.ManageChannels], bot: [P.ManageChannels], channel: ch });
      if (err) return fail(i, err);
      const reason = reasonOf(i);
      await i.deferReply();
      try {
        await ch.permissionOverwrites.edit(i.guild.roles.everyone, { [flag]: value }, { reason: auditReason(i, reason) });
        await moderation.record(i.guild, { userId: i.user.id, moderatorId: i.user.id, action: action, reason: `${verbPast} #${ch.name}: ${reason}` });
        return done(i, emoji(E), `${verbPast} <#${ch.id}>.`);
      } catch (e) { return fail(i, describeError(e)); }
    },
  };
}
module.exports = { make };
