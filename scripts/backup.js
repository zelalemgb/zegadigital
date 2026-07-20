'use strict';

/**
 * Consistent hot backup of the SQLite database.
 *
 * Uses `VACUUM INTO`, which writes a fresh, defragmented, single-file copy while
 * holding only a READ lock on the source — so it is WAL-safe and can run while
 * the bot is live and serving learners. No downtime, no torn reads.
 *
 * Usage:
 *   node scripts/backup.js [destPath]
 *     ZEGA_DB          source database (default ../data/zega.db — matches the app)
 *     ZEGA_BACKUP_DIR  where timestamped backups land (default <db-dir>/backups)
 *
 * In production (Render), run this on a schedule against ZEGA_DB=/var/data/zega.db,
 * writing to durable/off-box storage. Verify a restore regularly (see restore.js).
 */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const src = process.env.ZEGA_DB || path.join(__dirname, '..', 'data', 'zega.db');

if (src === ':memory:') {
  console.error('✗ ZEGA_DB is :memory: — there is nothing on disk to back up.');
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error(`✗ Source database not found: ${src}`);
  process.exit(1);
}

const dir = process.env.ZEGA_BACKUP_DIR || path.join(path.dirname(src), 'backups');
fs.mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = process.argv[2] || path.join(dir, `zega-${stamp}.db`);

const db = new DatabaseSync(src);
try {
  // Escape single quotes for the SQL string literal.
  db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
} finally {
  db.close();
}

const kb = (fs.statSync(dest).size / 1024).toFixed(0);
console.log(`✓ Backup written: ${dest} (${kb} KB)`);
