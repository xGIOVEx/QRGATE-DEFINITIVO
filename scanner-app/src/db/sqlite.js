import * as SQLite from 'expo-sqlite';

const DB_NAME = 'qrgate_scanner.db';

export const initDatabase = async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // Create valid_tickets table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS valid_tickets (
      qr_hash TEXT PRIMARY KEY,
      ticket_id TEXT,
      type_name TEXT,
      valid_from INTEGER,
      valid_until INTEGER,
      group_index INTEGER,
      group_total INTEGER,
      used_at INTEGER DEFAULT NULL
    );
  `);

    // Create sync_queue table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_hash TEXT,
      scanned_at INTEGER,
      result TEXT,
      override_data TEXT
    );
  `);

    console.log('[DB] Database initialized');
    return db;
};

export const getDatabase = () => SQLite.openDatabaseSync(DB_NAME);

export const dbService = {
    // Save synced tickets
    saveTickets: async (tickets) => {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const t of tickets) {
                await db.runAsync(
                    `INSERT OR REPLACE INTO valid_tickets 
          (qr_hash, ticket_id, type_name, valid_from, valid_until, group_index, group_total, used_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [t.qr_hash, t.ticket_id, t.type_name, t.valid_from, t.valid_until, t.group_index, t.group_total, t.used_at]
                );
            }
        });
    },

    // Lookup ticket
    lookupTicket: async (qrHash) => {
        const db = await getDatabase();
        return await db.getFirstAsync('SELECT * FROM valid_tickets WHERE qr_hash = ?', [qrHash]);
    },

    // Mark ticket as used and add to sync queue
    useTicket: async (qrHash, result, overrideData = null) => {
        const db = await getDatabase();
        const now = Math.floor(Date.now() / 1000);

        await db.withTransactionAsync(async () => {
            // Mark as used locally
            await db.runAsync('UPDATE valid_tickets SET used_at = ? WHERE qr_hash = ?', [now, qrHash]);

            // Add to sync queue
            await db.runAsync(
                'INSERT INTO sync_queue (qr_hash, scanned_at, result, override_data) VALUES (?, ?, ?, ?)',
                [qrHash, now, result, overrideData ? JSON.stringify(overrideData) : null]
            );
        });
    },

    // Get pending sync items
    getSyncQueue: async () => {
        const db = await getDatabase();
        return await db.getAllAsync('SELECT * FROM sync_queue ORDER BY id ASC');
    },

    // Clear items from sync queue after successful upload
    clearSyncQueue: async (upToId) => {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM sync_queue WHERE id <= ?', [upToId]);
    },

    // Cleanup old tickets (> 24h expired)
    cleanupOldTickets: async () => {
        const db = await getDatabase();
        const now = Math.floor(Date.now() / 1000);
        const limit = now - (24 * 3600);
        const result = await db.runAsync('DELETE FROM valid_tickets WHERE valid_until < ?', [limit]);
        console.log(`[DB] Cleaned up ${result.changes} old tickets`);
    }
};
