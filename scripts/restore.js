'use strict';

/**
 * Restore a backup over the live database file.
 *
 * ⚠️  Destructive. STOP the bot first — this replaces the database file. It
 * refuses to run without an explicit `--force` so it can never overwrite data
 * by accident, and it moves the current DB (plus its -wal/-shm sidecars) aside
 * with a `.pre-restore` suffix so the previous state is always recoverable.
 *
 * Usage:
 *   1. Stop the web service (and scheduler).
 *   2. node scripts/restore.js <backupPath> --force
 *   3. Start the service, verify, then delete the *.pre-restore files.
 *
 *     ZEGA_DB   target database (default ../data/zega.db — matches the app)
 */

const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const force = args.includes('--force');
const backup = args.find((a) => a !== '--force');
const target = process.env.ZEGA_DB || path.join(__dirname, '..', 'data', 'zega.db');

if (!backup) {
  console.error('Usage: node scripts/restore.js <backupPath> --force');
  process.exit(1);
}
if (target === ':memory:') {
  console.error('✗ ZEGA_DB is :memory: — nothing on disk to restore.');
  process.exit(1);
}
if (!fs.existsSync(backup)) {
  console.error(`✗ Backup not found: ${backup}`);
  process.exit(1);
}
if (!force) {
  console.error(`✗ Refusing to overwrite ${target} without --force.`);
  console.error('  Stop the bot first, then re-run with --force.');
  process.exit(1);
}

// Move the current DB and its WAL/SHM sidecars aside — restoring over a live
// WAL would corrupt the copy. Keeping them lets you roll the restore back.
for (const suffix of ['', '-wal', '-shm']) {
  const f = target + suffix;
  if (fs.existsSync(f)) fs.renameSync(f, `${f}.pre-restore`);
}

fs.copyFileSync(backup, target);

console.log(`✓ Restored ${backup} → ${target}`);
console.log('  Previous database saved with a .pre-restore suffix.');
console.log('  Start the bot, verify, then delete the *.pre-restore files.');
