import axios from 'axios';
import { storageService } from '../auth/storage';

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Update with proper backend URL

const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// Inject JWT into headers
client.interceptors.request.use(async (config) => {
    const token = await storageService.getJWT();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const apiService = {
    // Auth
    login: async (slug, pin) => {
        return await client.post('/scanner/login', { slug, pin });
    },

    // Sync
    getSyncData: async (venueId) => {
        return await client.get(`/scanner/sync?venue_id=${venueId}`);
    },

    // Batch Sync (Offline scans)
    syncBatch: async (batch) => {
        return await client.post('/scanner/sync-batch', { batch });
    },

    // Public Key for RS256
    getPublicKey: async () => {
        return await client.get('/public-key');
    }
};

export default client;
