'use strict';
const crypto = require('node:crypto');
const ui = require('./ui');

const pending = new Map(); // token -> { userId, run, expires }
const TTL = 60_000;

/** Ask the invoker to confirm a destructive action. `run` receives the button interaction. */
async function ask(interaction, { title, lines, run }) {
  for (const [t, v] of pending) if (v.expires < Date.now()) pending.delete(t);
  const token = crypto.randomBytes(6).toString('hex');
  pending.set(token, { userId: interaction.user.id, run, expires: Date.now() + TTL });
  return interaction.reply(ui.message([
    `### ${ui.E.modernRules} ${title}`, lines.join('\n'), '-# This expires in 60 seconds.', 'sep',
    ui.buttons(ui.btn(`kc:${token}:yes`, 'Confirm'), ui.btn(`kc:${token}:no`, 'Cancel')),
  ], { ephemeral: true }));
}

async function handle(interaction) {
  const [, token, answer] = interaction.customId.split(':');
  const p = pending.get(token);
  if (!p || p.expires < Date.now()) {
    return interaction.update(ui.edit([`${ui.E.redDot} This confirmation expired. Run the command again.`]));
  }
  if (interaction.user.id !== p.userId) return interaction.reply(ui.error('This confirmation is not yours.'));
  pending.delete(token);
  if (answer === 'no') return interaction.update(ui.edit([`${ui.E.redDot} Cancelled.`]));
  await interaction.update(ui.edit([`${ui.E.redDot} Working...`]));
  return p.run(interaction);
}

module.exports = { ask, handle };
