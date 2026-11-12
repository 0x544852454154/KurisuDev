'use strict';
const { SlashCommandBuilder, PermissionFlagsBits: P } = require('discord.js');
const { guard, fail, done } = require('../_util');
const confirm = require('../../components/common/confirm');
const moderation = require('../../engines/moderation');
const { E } = require('../../components/common/ui');
const { LIMITS } = require('../../config/settings');
const { describeError } = require('../../utils/helpers');

const FILTERS = {
  all: () => true,
  bots: (m) => m.author.bot,
  links: (m) => /https?:\/\/\S+/i.test(m.content),
  attachments: (m) => m.attachments.size > 0,
};

async function purgeNow(channel, amount, predicate) {
  const fetched = await channel.messages.fetch({ limit: 100 });
  const cutoff = Date.now() - 14 * 86400000;
  const targets = [...fetched.values()].filter((m) => m.createdTimestamp > cutoff && !m.pinned && predicate(m)).slice(0, amount);
  if (!targets.length) return 0;
  const res = await channel.bulkDelete(targets, true);
  return res.size;
}

module.exports = {
  category: 'moderation', permission: 'Manage Messages',
  examples: { '': '/purge amount:20 filter:bots' },
  purgeNow, FILTERS,
  data: new SlashCommandBuilder().setName('purge').setDescription('Delete messages in bulk.')
    .setDefaultMemberPermissions(P.ManageMessages)
    .addIntegerOption((o) => o.setName('amount').setDescription('Messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(LIMITS.purgeMax))
    .addUserOption((o) => o.setName('user').setDescription('Only this user\'s messages'))
    .addStringOption((o) => o.setName('filter').setDescription('Message filter').addChoices(
      { name: 'All', value: 'all' }, { name: 'Bots', value: 'bots' }, { name: 'Links', value: 'links' }, { name: 'Attachments', value: 'attachments' })),
  async execute(i) {
    const err = guard(i, { user: [P.ManageMessages], bot: [P.ManageMessages, P.ReadMessageHistory], channel: i.channel });
    if (err) return fail(i, err);
    const amount = i.options.getInteger('amount', true);
    const user = i.options.getUser('user');
    const filter = FILTERS[i.options.getString('filter') || 'all'];
    const predicate = (m) => filter(m) && (!user || m.author.id === user.id);
    const run = async (ctx, useEdit) => {
      try {
        const n = await purgeNow(i.channel, amount, predicate);
        await moderation.record(i.guild, { userId: user?.id || i.user.id, moderatorId: i.user.id, action: 'purge', reason: `Purged ${n} message(s) in #${i.channel.name}` });
        return useEdit ? done(ctx, E.moderatorShield, `Deleted **${n}** message(s). Messages older than 14 days cannot be bulk deleted.`) : null;
      } catch (e) { return fail(ctx, describeError(e)); }
    };
    if (amount > 50) {
      return confirm.ask(i, {
        title: 'Confirm purge', lines: [`Delete up to **${amount}** messages in <#${i.channel.id}>.`],
        run: async (btn) => {
          try {
            const n = await purgeNow(i.channel, amount, predicate);
            await moderation.record(i.guild, { userId: user?.id || i.user.id, moderatorId: i.user.id, action: 'purge', reason: `Purged ${n} message(s) in #${i.channel.name}` });
            await btn.editReply(require('../../components/common/ui').edit([`${E.moderatorShield} Deleted **${n}** message(s).`]));
          } catch (e) { await btn.editReply(require('../../components/common/ui').edit([`${E.redDot} ${describeError(e)}`])); }
        },
      });
    }
    await i.deferReply({ flags: 64 });
    return run(i, true);
  },
};
