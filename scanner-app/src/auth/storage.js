import * as SecureStore from 'expo-secure-store';

const KEYS = {
    JWT: 'qrgate_jwt',
    PIN_HASH: 'qrgate_pin_hash',
    VENUE_ID: 'qrgate_venue_id',
    VENUE_NAME: 'qrgate_venue_name',
    VENUE_SLUG: 'qrgate_venue_slug',
    PUBLIC_KEY: 'qrgate_rs256_pub',
    LAST_SYNC: 'qrgate_last_sync'
};

export const storageService = {
    saveAuth: async (jwt, venueData) => {
        await SecureStore.setItemAsync(KEYS.JWT, jwt);
        await SecureStore.setItemAsync(KEYS.VENUE_ID, venueData.id);
        await SecureStore.setItemAsync(KEYS.VENUE_NAME, venueData.name);
        await SecureStore.setItemAsync(KEYS.VENUE_SLUG, venueData.slug);
    },

    getJWT: async () => await SecureStore.getItemAsync(KEYS.JWT),

    getVenueInfo: async () => {
        const id = await SecureStore.getItemAsync(KEYS.VENUE_ID);
        const name = await SecureStore.getItemAsync(KEYS.VENUE_NAME);
        const slug = await SecureStore.getItemAsync(KEYS.VENUE_SLUG);
        return { id, name, slug };
    },

    savePinHash: async (hash) => await SecureStore.setItemAsync(KEYS.PIN_HASH, hash),
    getPinHash: async () => await SecureStore.getItemAsync(KEYS.PIN_HASH),

    savePublicKey: async (key) => await SecureStore.setItemAsync(KEYS.PUBLIC_KEY, key),
    getPublicKey: async () => await SecureStore.getItemAsync(KEYS.PUBLIC_KEY),

    logout: async () => {
        await SecureStore.deleteItemAsync(KEYS.JWT);
        // Note: We might keep venue info to allow easier re-login
    },

    clearAll: async () => {
        for (const key of Object.values(KEYS)) {
            await SecureStore.deleteItemAsync(key);
        }
    }
};
