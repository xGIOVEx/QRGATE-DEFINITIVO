import React from 'react';
import { Loader2 } from 'lucide-react';

export default function VisitorSplash({ venueName, brandColor, isLoading }) {
    return (
        <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white z-50 transition-opacity duration-500"
            style={{ backgroundColor: brandColor }}
        >
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                {/* Placeholder per Logo Venue */}
                <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center mb-6 shadow-2xl">
                    <span className="text-4xl">🏛️</span>
                </div>

                <h1 className="text-3xl font-extrabold text-center tracking-tight mb-2 drop-shadow-md">
                    {venueName}
                </h1>
                <p className="text-white/80 font-medium tracking-wide mb-12">QRGate Stories</p>

                {isLoading && (
                    <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-white/90" />
                        <span className="text-sm font-medium text-white/70 animate-pulse">Sincronizzazione guida...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
