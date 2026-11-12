'use strict';
module.exports = require('./_channelaccess').make({ name: 'lock', description: 'Lock a channel for @everyone.', flag: 'SendMessages', value: false, action: 'lock', verbPast: 'Locked', emoji: (E) => E.modernRules, example: '/lock channel:#general reason:Raid' });
