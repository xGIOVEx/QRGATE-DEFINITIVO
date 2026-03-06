import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useGeofencing — detects when user is near a venue
 * Uses Geolocation API + Haversine distance
 * Polling every 30s (not continuous watch — saves battery)
 * Returns: { isNearVenue, distance, permissionState, error }
 */

const GEOFENCE_RADIUS_METERS = 200; // 200m radius
const POLL_INTERVAL_MS = 30000;      // 30 seconds

// Haversine formula
function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function useGeofencing(venue) {
    const [isNearVenue, setIsNearVenue] = useState(false);
    const [distance, setDistance] = useState(null);
    const [permissionState, setPermissionState] = useState('prompt'); // 'granted' | 'denied' | 'prompt'
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    const venueLat = venue?.latitude || venue?.lat;
    const venueLng = venue?.longitude || venue?.lng;

    const checkPosition = useCallback(() => {
        if (!venueLat || !venueLng) return;
        if (!navigator.geolocation) {
            setError('Geolocation non supportata');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const d = getDistanceMeters(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    parseFloat(venueLat),
                    parseFloat(venueLng)
                );
                setDistance(Math.round(d));
                setIsNearVenue(d <= GEOFENCE_RADIUS_METERS);
                setPermissionState('granted');
                setError(null);
            },
            (err) => {
                if (err.code === 1) {
                    setPermissionState('denied');
                }
                // Don't set error on TIMEOUT or POSITION_UNAVAILABLE — just silently fail
            },
            {
                enableHighAccuracy: false, // low-power mode
                timeout: 10000,
                maximumAge: 20000, // accept cached positions up to 20s old
            }
        );
    }, [venueLat, venueLng]);

    useEffect(() => {
        // Don't activate if venue has no coordinates
        if (!venueLat || !venueLng) return;

        // Check permission state if available
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionState(result.state);
                result.onchange = () => setPermissionState(result.state);
            }).catch(() => { });
        }

        // Initial check
        checkPosition();

        // Polling every 30s
        intervalRef.current = setInterval(checkPosition, POLL_INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [venueLat, venueLng, checkPosition]);

    return { isNearVenue, distance, permissionState, error };
}
