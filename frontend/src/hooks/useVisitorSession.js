import { useState, useEffect } from 'react';

// Semplice wrapper Vanilla per IndexedDB
const idb = {
    dbPromise: new Promise((resolve, reject) => {
        const request = window.indexedDB.open('QRGateVisitorDB', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('guideData')) {
                db.createObjectStore('guideData');
            }
            if (!db.objectStoreNames.contains('userProgress')) {
                db.createObjectStore('userProgress');
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    }),
    async get(storeName, key) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    async set(storeName, key, value) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

function parseJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function getFingerprint() {
    let fp = localStorage.getItem('qrgate_visitor_fp');
    if (!fp) {
        fp = 'fp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('qrgate_visitor_fp', fp);
    }
    return fp;
}

export function useVisitorSession(sessionToken) {
    const [session, setSession] = useState({
        isLoading: true,
        error: null,
        payload: null,
        guideData: null,
        progress: {},
        fingerprint: null
    });

    useEffect(() => {
        async function initSession() {
            if (!sessionToken) return;

            const payload = parseJWT(sessionToken);
            if (!payload) {
                setSession(s => ({ ...s, isLoading: false, error: 'Token invalido o corrotto.' }));
                return;
            }

            const fp = getFingerprint();

            try {
                // 1. Load generic layout data and saved offline progress
                const cachedProgress = await idb.get('userProgress', sessionToken) || {
                    completedPois: [], currentPoiIndex: null, secondsListened: 0, badges: []
                };
                const cachedGuide = await idb.get('guideData', sessionToken);

                setSession(s => ({
                    ...s,
                    payload,
                    fingerprint: fp,
                    progress: cachedProgress,
                    guideData: cachedGuide, // Might be null initially
                    isLoading: false
                }));

                // 2. Fetch fresh data from Network (Background sync)
                // This is a mockup of the real fetch: GET /api/v1/visitor/guide/{session_token}
                if (navigator.onLine) {
                    try {
                        // PATCH /api/v1/tickets/:id/guide-device
                        fetch(`${process.env.REACT_APP_API_URL || ''}/api/v1/tickets/${payload.ticket_id}/guide-device`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fingerprint: fp })
                        }).catch(() => { });

                        // GET Full Guide Data
                        const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/v1/visitor/guide/${sessionToken}`);
                        if (res.ok) {
                            const freshGuide = await res.json();
                            await idb.set('guideData', sessionToken, freshGuide);
                            setSession(s => ({ ...s, guideData: freshGuide }));

                            // Precache media in background
                            precacheMedia(freshGuide);
                        } else if (!cachedGuide) {
                            // Provide a mock guide for Demo purposes if API not ready
                            const mockGuide = generateMockGuide(payload);
                            await idb.set('guideData', sessionToken, mockGuide);
                            setSession(s => ({ ...s, guideData: mockGuide }));
                        }
                    } catch (e) {
                        console.warn("Offline, using cached guide data");
                        // If offline and no cache, use mock for display demo
                        if (!cachedGuide) {
                            const mockGuide = generateMockGuide(payload);
                            await idb.set('guideData', sessionToken, mockGuide);
                            setSession(s => ({ ...s, guideData: mockGuide }));
                        }
                    }
                } else if (!cachedGuide) {
                    // Offline and no cache
                    setSession(s => ({ ...s, error: 'Sei offline e questa guida non è stata ancora scaricata.', isLoading: false }));
                }

            } catch (err) {
                setSession(s => ({ ...s, isLoading: false, error: 'Errore di inizializzazione DB locale.' }));
            }
        }

        initSession();
    }, [sessionToken]);

    const updateProgress = async (newProgress) => {
        const updated = { ...session.progress, ...newProgress };
        setSession(s => ({ ...s, progress: updated }));
        await idb.set('userProgress', sessionToken, updated);
    };

    return { ...session, updateProgress };
}

// Background dynamic media precacher using Cache API
async function precacheMedia(guide) {
    if (!('caches' in window)) return;
    try {
        const cache = await window.caches.open('qrgate-media-v1');
        const urlsToCache = [];

        // Add images
        if (guide.venue?.brand_logo_url) urlsToCache.push(guide.venue.brand_logo_url);
        if (guide.venue?.map_svg_url) urlsToCache.push(guide.venue.map_svg_url);

        guide.pois?.forEach(poi => {
            if (poi.image_url) urlsToCache.push(poi.image_url);
            if (poi.image_url_hd) urlsToCache.push(poi.image_url_hd);
            if (poi.audio_url_128k) urlsToCache.push(poi.audio_url_128k);
        });

        // Strategy: Cache First, add only if missing
        for (let url of urlsToCache) {
            if (!url) continue;
            const cached = await cache.match(url);
            if (!cached) {
                try { await cache.add(url); } catch (e) { /* ignore single fetch errors */ }
            }
        }
    } catch (e) {
        console.warn("Precaching non supportato o fallito", e);
    }
}

// Helper mock generator for UI building
function generateMockGuide(payload) {
    return {
        venue: {
            name: "Museo Test",
            brand_color: "#1E3A8A",
            map_svg_url: "/placeholder-map.svg"
        },
        tour_types: [
            { id: "standard", label: "Visita Completa", duration: "120 min", icon: "🎭" },
            { id: "kids", label: "Per Famiglie", duration: "60 min", icon: "🦁" }
        ],
        pois: [
            {
                id: "p1", name: "La Gioconda", is_secret: false, image_url: "https://images.unsplash.com/photo-1577083165350-14c1cd10fbce?q=80&w=1080",
                audio_url_128k: "/placeholder-audio.mp3", duration: 125, share_moment_sec: 60,
                x: 150, y: 200
            },
            {
                id: "p2", name: "Venere di Milo", is_secret: true, image_url: "https://images.unsplash.com/photo-1542038383-776483fbdd68?q=80&w=1080",
                audio_url_128k: "/placeholder-audio.mp3", duration: 90, share_moment_sec: 40,
                x: 350, y: 400
            }
        ]
    };
}
