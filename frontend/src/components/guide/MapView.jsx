import React, { useState, useRef, useEffect } from 'react';
import { Play, Map as MapIcon, ChevronUp, Lock, Check, Camera, Mic } from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import { usePinch, useDrag } from '@use-gesture/react';

export default function MapView({ venue, pois, progress, onPoiSelect, openAIChat }) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Spring Animation state for Map Transform (Pan & Zoom)
    const [{ x, y, scale }, api] = useSpring(() => ({ x: 0, y: 0, scale: 1 }));
    const mapRef = useRef(null);

    // Gestures per Pan e Pinch simultaneo
    usePinch(({ offset: [s], memo }) => {
        api.start({ scale: Math.max(0.5, Math.min(s, 4)) });
        return memo;
    }, { target: mapRef, eventOptions: { passive: false } });

    useDrag(({ offset: [dx, dy] }) => {
        api.start({ x: dx, y: dy });
    }, { target: mapRef, filterTaps: true, eventOptions: { passive: false } });

    // Prevenzione scroll default del browser (Pull to refresh o zoom nativo) durante l'interazione sulla mappa
    useEffect(() => {
        const preventDefault = (e) => e.preventDefault();
        const el = mapRef.current;
        if (el) el.addEventListener('gesturestart', preventDefault);
        return () => { if (el) el.removeEventListener('gesturestart', preventDefault); }
    }, []);

    // Calcola statistiche guida
    const totalPois = pois?.length || 0;
    const completedCount = progress?.completedPois?.length || 0;

    // Renderizza il colore del pin in base allo stato in IndexedDB
    const getPoiStatus = (poi) => {
        if (progress?.completedPois?.includes(poi.id)) return 'completed';
        if (poi.is_secret && !progress?.unlockedSecrets?.includes(poi.id)) return 'locked';
        if (poi.is_secret) return 'secret_unlocked';
        return 'pending'; // Default Grigio
    };

    const getPinStyle = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-500 text-white border-green-700';
            case 'locked': return 'bg-slate-700 text-white/50 border-slate-900';
            case 'secret_unlocked': return 'bg-yellow-400 text-black border-yellow-600 shadow-[0_0_15px_rgba(250,204,21,0.6)]';
            default: return 'bg-slate-200 text-slate-800 border-slate-400';
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#E5E7EB] relative overflow-hidden">

            {/* Top Bar (Fixed) */}
            <div className="absolute top-0 inset-x-0 h-16 bg-white/90 backdrop-blur border-b border-slate-200 z-30 flex items-center justify-between px-4 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    OPERA {completedCount} di {totalPois}
                </div>
                <div className="font-bold text-slate-900 truncate px-2">{venue?.name || "Mappa"}</div>
                <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200">
                    ⚙️
                </button>
            </div>

            {/* Interactive Pinch/Pan Map Wrapper */}
            <div className="flex-grow relative z-10 touch-none w-screen h-screen overflow-hidden">
                <animated.div
                    ref={mapRef}
                    className="absolute w-[1200px] h-[1200px] bg-slate-100/50"
                    style={{
                        x, y, scale,
                        touchAction: 'none',
                        backgroundImage: `url(${venue?.map_svg_url || ''})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                >
                    {/* Fallback pattern se non c'è mappa */}
                    {!venue?.map_svg_url && (
                        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-6 p-8 opacity-[0.03]">
                            {Array.from({ length: 36 }).map((_, i) => <div key={i} className="border border-slate-500 rounded-lg"></div>)}
                        </div>
                    )}

                    {/* Rendering dei POI Pins Layer */}
                    {pois?.map((poi, idx) => {
                        const status = getPoiStatus(poi);
                        const classes = getPinStyle(status);

                        // Se le coordinate x, y mancano, le generiamo sparse per la demo
                        const xPos = poi.x || (300 + (idx * 150) % 600);
                        const yPos = poi.y || (300 + (idx * 200) % 600);

                        return (
                            <button
                                key={poi.id}
                                onClick={(e) => { e.stopPropagation(); onPoiSelect(poi); }}
                                className={`absolute flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold shadow-md transform transition-transform active:scale-90 ${classes}`}
                                style={{ left: xPos, top: yPos }}
                            >
                                {status === 'locked' ? <Lock className="w-5 h-5" /> : (idx + 1)}
                            </button>
                        );
                    })}
                </animated.div>
            </div>

            {/* Bottom Bar (Fixed) & Trigger per lo sheet */}
            <div className="absolute bottom-0 inset-x-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 rounded-t-3xl transition-transform duration-300 transform">
                <div
                    className="w-full flex items-center justify-between p-4 pb-safe-offset-4"
                    onClick={() => setIsSheetOpen(true)}
                >
                    <button className="flex flex-col items-center justify-center text-slate-400 p-2">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase">Scanner</span>
                    </button>

                    <div className="flex-grow flex flex-col items-center justify-center cursor-pointer px-4">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-2"></div>
                        <span className="font-bold text-slate-800 text-sm truncate w-full text-center">Lista Opere</span>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); openAIChat(); }}
                        className="flex flex-col items-center justify-center text-blue-600 bg-blue-50 p-2 rounded-xl"
                    >
                        <Mic className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase">AI Guide</span>
                    </button>
                </div>
            </div>

            {/* Swipe Up Sheet POI List */}
            <div
                className={`absolute inset-x-0 bottom-0 bg-white z-50 rounded-t-3xl transition-transform duration-500 ease-spring shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col ${isSheetOpen ? 'translate-y-0 h-[85vh]' : 'translate-y-full h-[85vh]'}`}
            >
                <div className="p-4 flex justify-center cursor-pointer w-full" onClick={() => setIsSheetOpen(false)}>
                    <div className="w-16 h-1.5 bg-slate-300 rounded-full"></div>
                </div>
                <div className="px-6 pb-4">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Tutte le Opere</h2>
                    <p className="text-slate-500 text-sm">Seleziona un'opera per iniziare l'ascolto</p>
                </div>

                <div className="flex-grow overflow-y-auto px-4 pb-12 space-y-3">
                    {pois?.map((poi, idx) => {
                        const status = getPoiStatus(poi);
                        return (
                            <div
                                key={poi.id}
                                onClick={() => { setIsSheetOpen(false); onPoiSelect(poi); }}
                                className="flex items-center p-3 rounded-2xl bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
                            >
                                <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 relative">
                                    {poi.image_url ? (
                                        <img src={poi.image_url} alt={poi.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-300"></div>
                                    )}
                                    {status === 'completed' && (
                                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-sm">
                                            <Check className="w-8 h-8 text-white shadow-sm" />
                                        </div>
                                    )}
                                    {status === 'locked' && (
                                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                                            <Lock className="w-6 h-6 text-white/80" />
                                        </div>
                                    )}
                                </div>

                                <div className="ml-4 flex-grow min-w-0">
                                    <h4 className={`font-bold truncate ${status === 'locked' ? 'text-slate-400' : 'text-slate-900'}`}>{poi.name}</h4>
                                    <div className="flex items-center mt-1 text-sm text-slate-500">
                                        <span className="font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded mr-2">{idx + 1}</span>
                                        <span>{Math.floor(poi.duration / 60)}:{(poi.duration % 60).toString().padStart(2, '0')} min</span>
                                    </div>
                                </div>

                                <div className="ml-2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 shrink-0">
                                    <Play className="w-4 h-4 ml-0.5" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Overlay Backdrop per Sheet */}
            {isSheetOpen && (
                <div
                    className="absolute inset-0 bg-black/40 z-40 transition-opacity"
                    onClick={() => setIsSheetOpen(false)}
                />
            )}

        </div>
    );
}
