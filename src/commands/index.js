'use strict';
const fs = require('node:fs');
const path = require('node:path');

/** Loads every command module (skips files starting with "_" and this file). */
function load() {
  const commands = new Map();
  for (const entry of fs.readdirSync(__dirname, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of fs.readdirSync(path.join(__dirname, entry.name))) {
      if (!file.endsWith('.js') || file.startsWith('_')) continue;
      const mod = require(path.join(__dirname, entry.name, file));
      if (!mod.data || typeof mod.execute !== 'function') throw new Error(`Invalid command module ${entry.name}/${file}`);
      if (!mod.category) throw new Error(`Command ${mod.data.name} has no help category`);
      if (commands.has(mod.data.name)) throw new Error(`Duplicate command ${mod.data.name}`);
      commands.set(mod.data.name, mod);
    }
  }
  return commands;
}
module.exports = { load };
