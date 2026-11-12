'use strict';
const { OAuth2Scopes, PermissionsBitField } = require('discord.js');
const ui = require('./ui');

// Same permission set Kurisu asks for in the README (integer 1100451490998).
const PERMISSIONS = new PermissionsBitField([
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.ManageChannels,
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.ManageGuild,
  PermissionsBitField.Flags.ManageMessages,
  PermissionsBitField.Flags.ManageNicknames,
  PermissionsBitField.Flags.ManageWebhooks,
  PermissionsBitField.Flags.KickMembers,
  PermissionsBitField.Flags.BanMembers,
  PermissionsBitField.Flags.ModerateMembers,
  PermissionsBitField.Flags.ViewAuditLog,
  PermissionsBitField.Flags.UseExternalEmojis,
]);

/** The bot's OAuth2 invite URL (bot + applications.commands). */
function url(client) {
  return client.generateInvite({ scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands], permissions: PERMISSIONS });
}

/** customId: ki:invite - the emoji-only invite button on the mention card and /invite. */
async function handle(i) {
  return i.reply(ui.message([
    `### ${ui.E.shinyLink} INVITE KURISU`,
    `-# Add Kurisu to your server:\n${url(i.client)}`,
  ], { ephemeral: true }));
}

module.exports = { url, handle };
