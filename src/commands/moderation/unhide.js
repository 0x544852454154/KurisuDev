'use strict';
module.exports = require('./_channelaccess').make({ name: 'unhide', description: 'Make a hidden channel visible again.', flag: 'ViewChannel', value: null, action: 'unlock', verbPast: 'Unhid', emoji: (E) => E.moderatorShield, example: '/unhide channel:#staff' });
