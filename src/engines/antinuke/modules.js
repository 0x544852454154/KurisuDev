'use strict';
const { AuditLogEvent: A } = require('discord.js');

/**
 * The 23 protection modules.
 *  - actions: audit log events that feed the module
 *  - group:   'message' modules are also bypassed by Trusted Moderators
 *  - source:  'audit' (guildAuditLogEntryCreate) or 'message' (messageCreate)
 *  - defaults.threshold: number of actions inside defaults.windowSec that triggers the response
 */
const MODULES = {
  channelCreate:   { name: 'Anti-Channel Create',     desc: 'Mass channel creation', actions: [A.ChannelCreate], defaults: { enabled: true, threshold: 3, windowSec: 10, punishment: 'quarantine' } },
  channelDelete:   { name: 'Anti-Channel Delete',     desc: 'Channel deletion',      actions: [A.ChannelDelete], defaults: { enabled: true, threshold: 2, windowSec: 10, punishment: 'ban' } },
  channelUpdate:   { name: 'Anti-Channel Update',     desc: 'Channel and overwrite edits', actions: [A.ChannelUpdate, A.ChannelOverwriteCreate, A.ChannelOverwriteUpdate, A.ChannelOverwriteDelete], defaults: { enabled: true, threshold: 4, windowSec: 10, punishment: 'quarantine' } },
  roleCreate:      { name: 'Anti-Role Create',        desc: 'Mass role creation',    actions: [A.RoleCreate], defaults: { enabled: true, threshold: 3, windowSec: 10, punishment: 'quarantine' } },
  roleDelete:      { name: 'Anti-Role Delete',        desc: 'Role deletion',         actions: [A.RoleDelete], defaults: { enabled: true, threshold: 2, windowSec: 10, punishment: 'ban' } },
  roleUpdate:      { name: 'Anti-Role Update',        desc: 'Role edits',            actions: [A.RoleUpdate], defaults: { enabled: true, threshold: 4, windowSec: 10, punishment: 'quarantine' } },
  massBan:         { name: 'Anti-Mass Ban',           desc: 'Members banned in bulk', actions: [A.MemberBanAdd], defaults: { enabled: true, threshold: 3, windowSec: 15, punishment: 'ban' } },
  massKick:        { name: 'Anti-Mass Kick',          desc: 'Members kicked in bulk', actions: [A.MemberKick], defaults: { enabled: true, threshold: 3, windowSec: 15, punishment: 'ban' } },
  prune:           { name: 'Anti-Prune',              desc: 'Member prune',          actions: [A.MemberPrune], defaults: { enabled: true, threshold: 1, windowSec: 60, punishment: 'ban' } },
  webhookCreate:   { name: 'Anti-Webhook Create',     desc: 'Webhook creation',      actions: [A.WebhookCreate], defaults: { enabled: true, threshold: 2, windowSec: 20, punishment: 'quarantine' } },
  webhookDelete:   { name: 'Anti-Webhook Delete',     desc: 'Webhook deletion',      actions: [A.WebhookDelete], defaults: { enabled: true, threshold: 3, windowSec: 20, punishment: 'strip' } },
  webhookUpdate:   { name: 'Anti-Webhook Update',     desc: 'Webhook edits',         actions: [A.WebhookUpdate], defaults: { enabled: true, threshold: 3, windowSec: 20, punishment: 'strip' } },
  botAdd:          { name: 'Anti-Bot Add',            desc: 'Unapproved bots added', actions: [A.BotAdd], defaults: { enabled: true, threshold: 1, windowSec: 60, punishment: 'quarantine' } },
  guildUpdate:     { name: 'Anti-Guild Update',       desc: 'Server settings changes', actions: [A.GuildUpdate], defaults: { enabled: true, threshold: 2, windowSec: 30, punishment: 'quarantine' } },
  everyoneMention: { name: 'Anti-Everyone Mention',   desc: '@everyone and @here abuse', source: 'message', group: 'message', defaults: { enabled: true, threshold: 2, windowSec: 30, punishment: 'timeout' } },
  massMention:     { name: 'Anti-Mass Mention',       desc: 'Many users or roles pinged', source: 'message', group: 'message', defaults: { enabled: true, threshold: 15, windowSec: 10, punishment: 'timeout' } },
  permEscalation:  { name: 'Anti-Permission Escalation', desc: 'Dangerous permissions granted', actions: [A.RoleUpdate, A.MemberRoleUpdate], defaults: { enabled: true, threshold: 1, windowSec: 60, punishment: 'ban' } },
  integration:     { name: 'Anti-Integration Changes', desc: 'Integrations added or removed', actions: [A.IntegrationCreate, A.IntegrationUpdate, A.IntegrationDelete], defaults: { enabled: true, threshold: 2, windowSec: 30, punishment: 'quarantine' } },
  inviteSpam:      { name: 'Anti-Invite Spam',        desc: 'Mass invite creation',  actions: [A.InviteCreate], group: 'message', defaults: { enabled: true, threshold: 5, windowSec: 30, punishment: 'timeout' } },
  massDelete:      { name: 'Anti-Mass Message Deletion', desc: 'Bulk message deletion', actions: [A.MessageBulkDelete, A.MessageDelete], group: 'message', defaults: { enabled: true, threshold: 30, windowSec: 20, punishment: 'quarantine' } },
  emojiDelete:     { name: 'Anti-Emoji Deletion',     desc: 'Emoji deletion',        actions: [A.EmojiDelete], defaults: { enabled: true, threshold: 3, windowSec: 20, punishment: 'quarantine' } },
  stickerDelete:   { name: 'Anti-Sticker Deletion',   desc: 'Sticker deletion',      actions: [A.StickerDelete], defaults: { enabled: true, threshold: 3, windowSec: 20, punishment: 'quarantine' } },
  vanityChange:    { name: 'Anti-Vanity URL Change',  desc: 'Vanity URL changes (where supported)', actions: [A.GuildUpdate], defaults: { enabled: true, threshold: 1, windowSec: 60, punishment: 'ban' } },
};

const KEYS = Object.keys(MODULES);
const byAction = new Map();
for (const [key, m] of Object.entries(MODULES)) {
  for (const a of m.actions || []) {
    if (!byAction.has(a)) byAction.set(a, []);
    byAction.get(a).push(key);
  }
}

module.exports = { MODULES, KEYS, byAction };
