'use strict';
module.exports = require('./_channelaccess').make({ name: 'hide', description: 'Hide a channel from @everyone.', flag: 'ViewChannel', value: false, action: 'lock', verbPast: 'Hid', emoji: (E) => E.moderatorShield, example: '/hide channel:#staff' });
