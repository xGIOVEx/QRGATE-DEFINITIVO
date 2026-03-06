import KJUR from 'jsrsasign';
import { storageService } from '../auth/storage';

const FALLBACK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALzJ+...
-----END PUBLIC KEY-----`; // Placeholder

export const cryptoService = {
    verifyQRCode: async (token) => {
        try {
            const publicKey = await storageService.getPublicKey() || FALLBACK_PUBLIC_KEY;

            // Verification logic using jsrsasign
            const isValid = KJUR.jws.JWS.verify(token, publicKey, ['RS256']);

            if (!isValid) return { valid: false, reason: 'invalid_signature' };

            // Parse payload
            const payload = KJUR.jws.JWS.readSafeJSONString(KJUR.jws.JWS.parse(token).payloadB64);
            return { valid: true, payload };
        } catch (e) {
            console.error('[Crypto] Verification error', e);
            return { valid: false, reason: 'error' };
        }
    }
};
