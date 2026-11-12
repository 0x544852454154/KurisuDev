'use strict';
const { PermissionsBitField } = require('discord.js');

/** Minimal fake Guild good enough for the engine paths under test. */
function fakeGuild(overrides = {}) {
  const banned = []; const kicked = []; const timeouts = [];
  const members = new Map();
  const mk = (id, { bot = false, position = 1, roles = [] } = {}) => ({
    id, user: { bot, tag: `u${id}` }, permissions: new PermissionsBitField(0n),
    roles: { highest: { position }, cache: new Map(roles.map((r) => [r.id, r])), remove: async () => {}, add: async () => {} },
    kick: async () => { kicked.push(id); }, timeout: async (ms) => { timeouts.push([id, ms]); },
  });
  const guild = {
    id: 'g1', ownerId: 'owner', client: { user: { id: 'kurisu' } },
    members: {
      cache: members,
      fetch: async (id) => members.get(id) || null,
      ban: async (id) => { banned.push(id); },
      me: { roles: { highest: { position: 50 } }, permissions: new PermissionsBitField(PermissionsBitField.All) },
    },
    channels: { cache: new Map(), fetch: async () => null },
    roles: { cache: new Map(), everyone: { id: 'g1' } },
    ...overrides,
  };
  return { guild, banned, kicked, timeouts, addMember: (id, o) => { members.set(id, mk(id, o)); return members.get(id); } };
}

/** Walk serialized components, collecting every node. */
function walk(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  out.push(node);
  for (const v of Object.values(node)) { if (Array.isArray(v)) v.forEach((x) => walk(x, out)); else if (typeof v === 'object') walk(v, out); }
  return out;
}

module.exports = { fakeGuild, walk };
