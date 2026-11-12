'use strict';
const { AuditLogEvent } = require('discord.js');
const repo = require('../../database/repo');
const perms = require('../../permissions');
const recovery = require('../recovery');
const logging = require('../logging');
const punish = require('./punish');
const log = require('../../utils/logger');
const { MODULES, byAction } = require('./modules');
const { DANGEROUS_BITS, PUNISHED_LABEL } = require('../../config/settings');

// ---- in-memory state (everything durable lives in SQLite) ----
const windows = new Map();   // `${guild}:${exec}:${module}` -> [{ t, w, entry }]
const seen = new Map();      // audit entry id -> timestamp (dedupe)
const locks = new Map();     // `${guild}:${exec}` -> expiry; after a breach, more actions are mitigated but not re-punished
const mitigated = new Set(); // entry ids already reverted
const LOCK_MS = 60_000;

const humanize = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2');
const actionLabel = (action) => humanize(AuditLogEvent[action] || `Action ${action}`);

/** Sliding window counter. Returns { total, items }. Exported for tests. */
function slide(key, windowMs, weight, entry, nowMs = Date.now()) {
  const arr = (windows.get(key) || []).filter((x) => nowMs - x.t <= windowMs);
  arr.push({ t: nowMs, w: weight, entry });
  windows.set(key, arr);
  return { total: arr.reduce((a, b) => a + b.w, 0), items: arr };
}

function cleanup() {
  const n = Date.now();
  for (const [k, v] of seen) if (n - v > 120_000) seen.delete(k);
  for (const [k, v] of locks) if (v < n) locks.delete(k);
  for (const [k, arr] of windows) { const f = arr.filter((x) => n - x.t < 300_000); if (f.length) windows.set(k, f); else windows.delete(k); }
  if (mitigated.size > 5000) mitigated.clear();
}
setInterval(cleanup, 60_000).unref();

const changeOf = (entry, key) => entry.changes?.find((c) => c.key === key);

/** Which modules does this audit entry feed, and with what weight? */
function classify(entry, guild) {
  const mods = (byAction.get(entry.action) || []).slice();
  const out = [];
  for (const key of mods) {
    let weight = 1;
    if (key === 'massDelete') weight = Number(entry.extra?.count) || 1;
    if (key === 'vanityChange') { if (!changeOf(entry, 'vanity_url_code')) continue; }
    if (key === 'guildUpdate') {
      const others = (entry.changes || []).filter((c) => c.key !== 'vanity_url_code');
      if (!others.length && entry.changes?.length) continue;
    }
    if (key === 'permEscalation') {
      if (entry.action === AuditLogEvent.RoleUpdate) {
        const p = changeOf(entry, 'permissions');
        if (!p) continue;
        if (!(BigInt(p.new ?? 0) & ~BigInt(p.old ?? 0) & DANGEROUS_BITS)) continue;
      } else if (entry.action === AuditLogEvent.MemberRoleUpdate) {
        const added = changeOf(entry, '$add')?.new || [];
        const dangerous = added.some((r) => {
          const role = guild.roles.cache.get(r.id);
          return role && (role.permissions.bitfield & DANGEROUS_BITS);
        });
        if (!dangerous) continue;
      }
    }
    out.push({ key, weight });
  }
  return out;
}

async function handleAuditEntry(entry, guild) {
  try {
    if (!entry?.id || seen.has(entry.id)) return;
    seen.set(entry.id, Date.now());
    const executorId = entry.executorId;
    if (!executorId) return; // cannot attribute: never punish an arbitrary member
    if (!repo.getGuild(guild.id).antinuke_enabled) return;
    for (const { key, weight } of classify(entry, guild)) {
      await evaluate(guild, key, executorId, entry, weight);
    }
  } catch (err) {
    log.error(`antinuke pipeline error in ${guild?.id}`, err);
  }
}

/** Keep snapshots current, but only from changes made by trusted actors. */
function refreshSnapshot(guild, entry) {
  const A = AuditLogEvent;
  if ([A.ChannelCreate, A.ChannelUpdate, A.ChannelOverwriteCreate, A.ChannelOverwriteUpdate, A.ChannelOverwriteDelete].includes(entry.action)) {
    const ch = guild.channels.cache.get(entry.targetId); if (ch) recovery.snapshotChannel(ch);
  } else if ([A.RoleCreate, A.RoleUpdate].includes(entry.action)) {
    const r = guild.roles.cache.get(entry.targetId); if (r) recovery.snapshotRole(r);
  }
}

async function evaluate(guild, key, executorId, entry, weight) {
  const mod = MODULES[key];
  const cfg = repo.getModule(guild.id, key, MODULES);
  if (!cfg.enabled) return;
  if (perms.isExempt(guild, executorId, mod.group, key)) { if (entry?.action) refreshSnapshot(guild, entry); return; }

  const lockKey = `${guild.id}:${executorId}`;
  if (locks.has(lockKey) && locks.get(lockKey) > Date.now()) {
    if (entry) await mitigate(guild, key, entry, executorId);
    return;
  }
  const { total, items } = slide(`${guild.id}:${executorId}:${key}`, cfg.window_sec * 1000, weight, entry);
  if (total < cfg.threshold) return;

  locks.set(lockKey, Date.now() + LOCK_MS);
  windows.delete(`${guild.id}:${executorId}:${key}`);
  await respond(guild, key, cfg, executorId, total, items.map((i) => i.entry).filter(Boolean), entry);
}

async function respond(guild, key, cfg, executorId, total, entries, lastEntry) {
  const mod = MODULES[key];
  let kind = cfg.punishment;
  const g = repo.getGuild(guild.id);
  const prior = repo.countExecutorIncidents(guild.id, executorId, Date.now() - 24 * 3600 * 1000);
  let escalated = false;
  if (g.escalation_threshold > 0 && prior + 1 >= g.escalation_threshold && kind !== 'ban') { kind = 'ban'; escalated = true; }
  const member = await punish.fetchMember(guild, executorId);
  if (member?.user.bot && kind !== 'ban') kind = 'ban';

  const result = await punish.apply(guild, executorId, kind, `Kurisu antinuke: ${mod.name}`);

  const notes = [];
  for (const e of entries) { const n = await mitigate(guild, key, e, executorId); if (n) notes.push(n); }
  if (key === 'everyoneMention' || key === 'massMention') notes.push('offending messages removed');

  const response = result.ok ? PUNISHED_LABEL[result.kind] : 'Punishment failed';
  const status = result.ok ? 'Neutralized' : 'Unresolved - manual action needed';
  const details = [escalated ? 'escalated after repeat offence' : null, result.detail, ...notes].filter(Boolean).join('; ').slice(0, 400);
  const label = lastEntry?.action !== undefined ? actionLabel(lastEntry.action) : mod.name.replace(/^Anti-/, '');
  repo.addIncident(guild.id, { executorId, module: key, action: label, count: total, threshold: cfg.threshold, response, status, details });
  await logging.incidentLog(guild, { executorId, actionLabel: label, count: total, threshold: cfg.threshold, response, status, details });
}

/** Undo what a violating action did. Idempotent per audit entry. */
async function mitigate(guild, key, entry, executorId) {
  if (!entry?.id) return null;
  const A = AuditLogEvent;
  const id = `${entry.id}`;
  if (mitigated.has(id)) return null;
  mitigated.add(id);
  switch (entry.action) {
    case A.ChannelDelete: return `channel: ${await recovery.restoreChannel(guild, entry.targetId)}`;
    case A.RoleDelete: return `role: ${await recovery.restoreRole(guild, entry.targetId)}`;
    case A.ChannelCreate: { const c = guild.channels.cache.get(entry.targetId); if (c) { await c.delete('Kurisu: removed during antinuke response').catch(() => {}); return 'created channel removed'; } return null; }
    case A.RoleCreate: { const r = guild.roles.cache.get(entry.targetId); if (r) { await r.delete('Kurisu: removed during antinuke response').catch(() => {}); return 'created role removed'; } return null; }
    case A.ChannelUpdate: return `channel: ${await recovery.revertChannelUpdate(guild, entry)}`;
    case A.RoleUpdate: return `role: ${await recovery.revertRoleUpdate(guild, entry)}`;
    case A.WebhookCreate: return `webhook: ${await recovery.deleteWebhook(guild, entry.targetId)}`;
    case A.BotAdd: return `bot: ${await recovery.removeBot(guild, entry.targetId)}`;
    case A.InviteCreate: return `invites: ${await recovery.deleteInvitesBy(guild, executorId)}`;
    case A.GuildUpdate: return `server: ${await recovery.revertGuildUpdate(guild, entry)}`;
    case A.MemberRoleUpdate: {
      if (key !== 'permEscalation') return null;
      const target = await punish.fetchMember(guild, entry.targetId);
      const added = (changeOf(entry, '$add')?.new || []).map((r) => r.id).filter((rid) => {
        const role = guild.roles.cache.get(rid); return role && (role.permissions.bitfield & DANGEROUS_BITS) && role.position < guild.members.me.roles.highest.position;
      });
      if (target && added.length) { await target.roles.remove(added, 'Kurisu: unauthorised privileged role removed').catch(() => {}); return 'privileged roles removed from target'; }
      return null;
    }
    default: return null;
  }
}

/** Message-based modules: @everyone and mass mention. */
async function handleMessage(message) {
  try {
    if (!message.guild || !message.member || message.webhookId || message.system) return;
    if (!repo.getGuild(message.guild.id).antinuke_enabled) return;
    const guild = message.guild;
    const authorId = message.author.id;

    const checks = [];
    if (message.mentions.everyone) checks.push(['everyoneMention', 1]);
    const n = message.mentions.users.size + message.mentions.roles.size;
    if (n > 1) checks.push(['massMention', n]);
    for (const [key, weight] of checks) {
      const cfg = repo.getModule(guild.id, key, MODULES);
      if (!cfg.enabled || perms.isExempt(guild, authorId, 'message', key, message.member)) continue;
      if (key === 'everyoneMention') await message.delete().catch(() => {});
      else if (weight >= cfg.threshold) await message.delete().catch(() => {});
      await evaluateMessage(guild, key, authorId, weight, message);
    }
  } catch (err) { log.error('antinuke message handler error', err); }
}

async function evaluateMessage(guild, key, executorId, weight, message) {
  const cfg = repo.getModule(guild.id, key, MODULES);
  const lockKey = `${guild.id}:${executorId}`;
  if (locks.has(lockKey) && locks.get(lockKey) > Date.now()) { await message.delete().catch(() => {}); return; }
  const { total, items } = slide(`${guild.id}:${executorId}:${key}`, cfg.window_sec * 1000, weight, null);
  if (total < cfg.threshold) return;
  locks.set(lockKey, Date.now() + LOCK_MS);
  windows.delete(`${guild.id}:${executorId}:${key}`);
  void items;
  await respond(guild, key, cfg, executorId, total, [], null);
}

module.exports = { handleAuditEntry, handleMessage, slide, classify, actionLabel, _state: { windows, seen, locks } };
