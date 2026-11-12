'use strict';
module.exports = require('./_channelaccess').make({ name: 'unlock', description: 'Unlock a channel for @everyone.', flag: 'SendMessages', value: null, action: 'unlock', verbPast: 'Unlocked', emoji: (E) => E.modernRules, example: '/unlock channel:#general' });
