import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useVisitorSession } from '@/hooks/useVisitorSession';
import { useVisitorSensors } from '@/hooks/useVisitorSensors';
import useGeofencing from '@/hooks/useGeofencing';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

import VisitorSplash from '@/components/guide/VisitorSplash';
import TourSelection from '@/components/guide/TourSelection';
import MapView from '@/components/guide/MapView';
import AudioPlayerView from '@/components/guide/AudioPlayerView';
import AIChatOverlay from '@/components/guide/AIChatOverlay';
import PostVisitScreen from '@/components/guide/PostVisitScreen';
import { trackEvent } from '@/utils/analytics';

export default function VisitorGuide() {
    const { sessionToken } = useParams();
    const session = useVisitorSession(sessionToken);

    const [currentView, setCurrentView] = useState('splash'); // splash | tour-selection | map | player | post-visit
    const [selectedTour, setSelectedTour] = useState(null);
    const [activePoi, setActivePoi] = useState(null);
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);

    // Geofencing for Aria welcome
    const { isNearVenue, permissionState } = useGeofencing(session.guideData?.venue);
    const geofenceTriggeredRef = useRef(false);

    // Helper per controllare se il tour è finito (80% dei POI visti)
    const isTourAlmostComplete = () => {
        if (!session.guideData?.pois) return false;
        const total = session.guideData.pois.length;
        const completed = session.progress?.completedPois?.length || 0;
        return total > 0 && (completed / total) >= 0.8;
    };

    // --- Sensori e Hand-Free ---
    const { requireSensorPermissions } = useVisitorSensors({
        onPause: () => {
            const audioEl = document.querySelector('audio');
            if (audioEl) audioEl.pause();
        },
        onPlay: () => {
            const audioEl = document.querySelector('audio');
            if (audioEl) audioEl.play();
        },
        onNext: () => {
            if (currentView === 'player' && activePoi) {
                const allPois = session.guideData?.pois || [];
                const idx = allPois.findIndex(p => p.id === activePoi.id);
                if (idx !== -1 && idx < allPois.length - 1) setActivePoi(allPois[idx + 1]);
            }
        },
        onPrev: () => {
            if (currentView === 'player' && activePoi) {
                const allPois = session.guideData?.pois || [];
                const idx = allPois.findIndex(p => p.id === activePoi.id);
                if (idx > 0) setActivePoi(allPois[idx - 1]);
            }
        },
        onOpenChat: () => setIsAIChatOpen(true)
    });

    // --- Geofence / Check Completamento ---
    useEffect(() => {
        let watchId;
        if (session.guideData?.venue?.lat && session.guideData?.venue?.lng && currentView === 'map') {
            // Setup geocallback if coordinate exist
            if (navigator.geolocation && isTourAlmostComplete()) {
                watchId = navigator.geolocation.watchPosition((pos) => {
                    const { latitude, longitude } = pos.coords;
                    const vlat = session.guideData.venue.lat;
                    const vlng = session.guideData.venue.lng;
                    // Distanza grezza via Pitagora (semplificata x MVP, da usare Haversine reale)
                    const dist = Math.sqrt(Math.pow(latitude - vlat, 2) + Math.pow(longitude - vlng, 2)) * 111000;
                    if (dist > 300) { // Se a più di 300m e quasi finito -> Scatta post-visita
                        setCurrentView('post-visit');
                        navigator.geolocation.clearWatch(watchId);
                    }
                }, () => { }, { enableHighAccuracy: false, maximumAge: 30000 });
            }
        }
        return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
    }, [session.guideData, currentView, session.progress]);

    // --- Bootstrap logic ---
    useEffect(() => {
        if (!session.isLoading && session.guideData) {
            trackEvent('guide_opened', {
                guide_id: session.guideData?.guide_id || 'unknown',
                language: session.guideData?.language || 'en'
            });

            if (currentView === 'splash') {
                const hasMultipleTours = session.guideData.tour_types?.length > 1;
                if (session.progress?.currentPoiIndex !== null && session.progress?.selectedTour) {
                    setSelectedTour(session.progress.selectedTour);
                    setCurrentView('map');
                } else if (hasMultipleTours) {
                    setCurrentView('tour-selection');
                } else {
                    setSelectedTour('standard');
                    setCurrentView('map');
                }
            }
        }
        // eslint-disable-next-line
    }, [session.isLoading, session.guideData, currentView]);

    // --- Aria AI Action Listener ---
    useEffect(() => {
        const handleAriaAction = (e) => {
            const { action, payload } = e.detail;


            if (action === 'ui_action_play_poi' && session.guideData?.pois) {
                const targetPoi = session.guideData.pois.find(p => p.id === payload.poi_id);
                if (targetPoi) {
                    setActivePoi(targetPoi);
                    setCurrentView('player');
                }
            } else if (action === 'ui_action_navigate_to_poi') {
                // Semplice mockup, torna alla mappa
                setCurrentView('map');
            } else if (action === 'ui_action_open_ai_conversation') {
                setIsAIChatOpen(true);
            } else if (action === 'ui_action_show_map') {
                setCurrentView('map');
            } else if (action === 'ui_action_add_calendar_reminder') {
                alert(`Reminder added to calendar for ${payload.venue_name} on ${payload.suggested_date}`);
            }
        };

        window.addEventListener('aria-action', handleAriaAction);
        return () => window.removeEventListener('aria-action', handleAriaAction);
    }, [session.guideData]);

    // --- Geofence: Aria Auto-Welcome ---
    useEffect(() => {
        if (!isNearVenue || geofenceTriggeredRef.current) return;
        if (sessionStorage.getItem(`aria_geofence_${sessionToken}`)) return;

        const venue = session.guideData?.venue;
        if (!venue?.id) return;

        geofenceTriggeredRef.current = true;
        sessionStorage.setItem(`aria_geofence_${sessionToken}`, 'true');

        // Get time of day
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        const lang = navigator.language?.startsWith('it') ? 'it' : 'en';

        // Fetch welcome message from Aria
        axios.post(`${BACKEND_URL}/api/aria/geofence-welcome`, {
            venue_id: venue.id,
            language: lang,
            time_of_day: timeOfDay
        }).then(res => {
            // Dispatch as Aria message event — AIChatOverlay listens for this
            window.dispatchEvent(new CustomEvent('aria-geofence-welcome', {
                detail: { message: res.data.message, venue_name: res.data.venue_name }
            }));
            // Auto-open chat with welcome
            setIsAIChatOpen(true);
        }).catch(() => {
            // Silent fail — geofencing is enhancement, not critical
        });
    }, [isNearVenue, session.guideData, sessionToken]);
    if (session.isLoading && currentView === 'splash') {
        return <VisitorSplash isLoading={true} venueName="Caricamento in corso..." brandColor="#1A202C" />;
    }

    if (session.error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center text-white">
                <div>
                    <h2 className="text-2xl font-bold mb-4 text-red-500">Impossibile avviare la guida</h2>
                    <p className="text-slate-300 mb-6">{session.error}</p>
                    <button onClick={() => window.location.reload()} className="bg-blue-600 px-6 py-3 rounded-full font-bold">Riprova</button>
                </div>
            </div>
        );
    }

    const guide = session.guideData;
    const brandColor = guide?.venue?.brand_color || "#3B82F6";

    const handleTourSelect = async (tourId) => {
        setSelectedTour(tourId);
        await session.updateProgress({ selectedTour: tourId });
        requireSensorPermissions(); // Sveglia sensors a primo touch
        setCurrentView('map');
    };

    const handlePoiSelect = (poi) => {
        setActivePoi(poi);
        requireSensorPermissions();
        setCurrentView('player');
    };

    const closePlayer = () => {
        setActivePoi(null);
        if (isTourAlmostComplete()) {
            setCurrentView('post-visit');
        } else {
            setCurrentView('map');
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black text-white selection:bg-white/20">

            {/* Geofence badge */}
            {isNearVenue && (
                <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                    <span className="w-2 h-2 bg-white rounded-full" />
                    📍 Sei qui
                </div>
            )}

            {currentView === 'splash' && (
                <VisitorSplash venueName={guide?.venue?.name || "QRGate Stories"} brandColor={brandColor} />
            )}

            {currentView === 'tour-selection' && (
                <TourSelection venue={guide?.venue} tours={guide?.tour_types} onSelect={handleTourSelect} />
            )}

            {currentView === 'map' && (
                <MapView
                    venue={guide?.venue}
                    pois={guide?.pois}
                    progress={session.progress}
                    onPoiSelect={handlePoiSelect}
                    openAIChat={() => setIsAIChatOpen(true)}
                />
            )}

            {currentView === 'player' && activePoi && (
                <AudioPlayerView
                    poi={activePoi}
                    allPois={guide?.pois}
                    venue={guide?.venue}
                    progress={session.progress}
                    updateProgress={session.updateProgress}
                    onClose={closePlayer}
                    openAIChat={() => setIsAIChatOpen(true)}
                    onNextPoi={(nextPoi) => setActivePoi(nextPoi)}
                />
            )}

            {currentView === 'post-visit' && (
                <PostVisitScreen
                    venue={guide?.venue}
                    progress={session.progress}
                    sessionToken={sessionToken}
                    onClose={() => setCurrentView('map')}
                />
            )}

            <AIChatOverlay
                isOpen={isAIChatOpen}
                onClose={() => setIsAIChatOpen(false)}
                sessionToken={sessionToken}
                venue={guide?.venue}
                activePoi={activePoi}
            />
        </div>
    );
}
