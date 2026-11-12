'use strict';
require('dotenv').config();
const { load } = require('../src/commands');
const { deployCommands } = require('../src/utils/deploy');

deployCommands(load()).then((n) => { console.log(`Registered ${n} commands.`); process.exit(0); })
  .catch((err) => { console.error(err.message); process.exit(1); });
