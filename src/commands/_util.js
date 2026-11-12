'use strict';
const { PermissionsBitField } = require('discord.js');
const ui = require('../components/common/ui');
const perms = require('../permissions');

const names = (bits) => bits.map((b) => new PermissionsBitField(b).toArray().join(', ')).join(', ');

/** Returns an error string or null. Checks guild context, the invoker's permissions and the bot's. */
function guard(i, { user = [], bot = [], channel = null } = {}) {
  if (!i.inGuild() || !i.guild) return 'This command only works in a server.';
  const missingUser = user.filter((p) => !i.memberPermissions?.has(p));
  if (missingUser.length) return `You need ${names(missingUser)} to use this.`;
  const missingBot = perms.botMissing(i.guild, channel, bot);
  if (missingBot) return `I need ${names(missingBot)}${channel ? ` in ${channel}` : ''}.`;
  return null;
}

/** Error reply that works before or after deferral. */
function fail(i, line) {
  if (i.deferred || i.replied) return i.editReply(ui.edit([`${ui.E.redDot} ${line}`]));
  return i.reply(ui.error(line));
}
function done(i, emoji, line, opts = {}) {
  if (i.deferred || i.replied) return i.editReply(ui.edit([`${emoji} ${line}`]));
  return i.reply(ui.notice(emoji, line, opts));
}
const reasonOf = (i) => i.options.getString('reason') || 'No reason provided';
const auditReason = (i, reason) => `${i.user.tag}: ${reason}`.slice(0, 480);

module.exports = { guard, fail, done, reasonOf, auditReason };
