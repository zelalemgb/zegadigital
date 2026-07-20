#!/usr/bin/env node
'use strict';

/**
 * Local terminal simulator — chat with the bot as a WhatsApp user would,
 * with full gamification (XP, streaks, badges) backed by the durable profile.
 *
 *   npm run cli
 *
 * Type your replies and press Enter. Commands: .quit  .reset
 * Each run uses a fixed CLI user id so your progress persists between sessions.
 */

const readline = require('readline');
const runtime = require('../src/runtime');

const USER_ID = process.env.CLI_USER || 'cli-user';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'You ▶ ' });

function botSay(result) {
  for (const m of result.messages) {
    const text = typeof m === 'string' ? m : m.text || '';
    console.log('\n\x1b[32m🤖 Zega\x1b[0m');
    if (m && m.image) console.log('   \x1b[90m[image: ' + m.image + ']\x1b[0m');
    console.log(text.split('\n').map((l) => '   ' + l).join('\n'));
  }
  if (result.actions && result.actions.length) {
    console.log('\n   \x1b[90m[ ' + result.actions.map((a) => `${a.label} → ${a.value}`).join('  |  ') + ' ]\x1b[0m');
  }
  console.log();
}

console.log('\x1b[1mZega Digital ዜጋ ዲጂታል — local simulator\x1b[0m');
console.log('Commands: .quit  .reset\n');

require('../src/store').init().then(async () => {
  botSay(await runtime.startConversation(USER_ID));
  rl.prompt();
});

rl.on('line', async (line) => {
  const input = line.trim();
  if (input === '.quit') return rl.close();
  if (input === '.reset') {
    botSay(await runtime.startConversation(USER_ID));
    return rl.prompt();
  }
  botSay(await runtime.processMessage(USER_ID, input));
  rl.prompt();
});

rl.on('close', () => { console.log('\n👋 Bye!'); process.exit(0); });
