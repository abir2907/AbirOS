#!/usr/bin/env node
/**
 * Generates a bcrypt hash for the single AbirOS account.
 * Run: `pnpm setup:password`
 * Paste the printed hash into AUTH_PASSWORD_HASH in your .env file.
 *
 * Input is muted (not echoed). Accepts the password as argv[2] for
 * non-interactive use, e.g. `node scripts/setup-password.mjs 'mypassword'`.
 */
import bcrypt from 'bcryptjs';
import readline from 'node:readline';

const ROUNDS = 12;

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Mute echoing of typed characters.
    const onData = () => {
      rl.output.write('[2K[200D' + question);
    };
    process.stdout.write(question);
    rl.input.on('keypress', onData);
    rl._writeToOutput = () => {}; // suppress echo
    rl.question('', (answer) => {
      rl.input.removeListener('keypress', onData);
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  let password = process.argv[2];
  if (!password) {
    password = await promptHidden('Enter the AbirOS password to hash: ');
  }
  if (!password || password.length < 8) {
    console.error('\n✗ Password must be at least 8 characters.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, ROUNDS);
  console.log('\nAdd this line to your .env file:\n');
  console.log(`AUTH_PASSWORD_HASH=${hash}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
