import { useEffect, useCallback } from 'react';
import { apiService } from '../api/client';
import { dbService } from '../db/sqlite';
import { storageService } from '../auth/storage';

export const useSync = (venueId, isActive) => {
    const syncData = useCallback(async () => {
        if (!venueId) return;

        console.log('[Sync] Starting synchronization...');

        try {
            // 1. Download valid tickets
            const response = await apiService.getSyncData(venueId);
            if (response.data && response.data.tickets) {
                await dbService.saveTickets(response.data.tickets);
                await dbService.cleanupOldTickets();
                console.log(`[Sync] Downloaded ${response.data.tickets.length} tickets`);
            }

            // 2. Upload pending scans
            const pendingSync = await dbService.getSyncQueue();
            if (pendingSync.length > 0) {
                await apiService.syncBatch(pendingSync);
                const maxId = Math.max(...pendingSync.map(s => s.id));
                await dbService.clearSyncQueue(maxId);
                console.log(`[Sync] Uploaded ${pendingSync.length} scans`);
            }

            // 3. Update public key if missing
            const existingKey = await storageService.getPublicKey();
            if (!existingKey) {
                const keyRes = await apiService.getPublicKey();
                await storageService.savePublicKey(keyRes.data.public_key);
            }

        } catch (error) {
            console.warn('[Sync] Sync failed (Likely offline)', error.message);
        }
    }, [venueId]);

    useEffect(() => {
        if (isActive) {
            syncData();
            const interval = setInterval(syncData, 30000); // Sync every 30s when active
            return () => clearInterval(interval);
        }
    }, [isActive, syncData]);

    return { forceSync: syncData };
};
