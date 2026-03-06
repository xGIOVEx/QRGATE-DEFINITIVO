import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Headphones } from 'lucide-react';
import { analytics } from '@/services/analytics_service';

const EFFICIENCY_UPLIFT = 0.22;
const AUDIOGUIDE_PRICE = 4.0;
const AUDIOGUIDE_VENUE_SHARE = 0.62;
const AUDIOGUIDE_UPTAKE = 0.20;
const QRGATE_FEE_PERCENT = 0.0549; // Real QRGate fee
const QRGATE_FEE_FIXED = 0.49;

function AnimatedNumber({ value, prefix = "", decimals = 0 }) {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef(null);
    const prevValue = useRef(0);

    useEffect(() => {
        const start = prevValue.current;
        const end = value;
        const duration = 700;
        const startTime = performance.now();
        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(start + (end - start) * eased);
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
            else prevValue.current = end;
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [value]);

    return <span>{prefix}{Math.round(display).toLocaleString("it-IT")}</span>;
}

const ExitIntentPopup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasShown, setHasShown] = useState(false);

    // Calculator State
    const [visitors, setVisitors] = useState(1200);
    const [ticketPrice, setTicketPrice] = useState(12);
    const [audioEnabled, setAudioEnabled] = useState(false);

    const triggerPopup = useCallback((triggerType) => {
        if (!hasShown) {
            setIsVisible(true);
            setHasShown(true);
            analytics.trackExitIntentShown(window.location.pathname, 'roi_calculator');
        }
    }, [hasShown]);

    useEffect(() => {
        if (hasShown) return;

        const handleMouseOut = (e) => {
            if (e.clientY <= 0) triggerPopup('mouse');
        };

        let inactivityTimer = setTimeout(() => {
            triggerPopup('timer');
        }, 45000);

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                triggerPopup('timer');
            }, 45000);
        };

        document.addEventListener('mouseleave', handleMouseOut);
        document.addEventListener('mousemove', resetTimer, { passive: true });
        document.addEventListener('touchstart', resetTimer, { passive: true });
        document.addEventListener('scroll', resetTimer, { passive: true });

        return () => {
            document.removeEventListener('mouseleave', handleMouseOut);
            document.removeEventListener('mousemove', resetTimer);
            document.removeEventListener('touchstart', resetTimer);
            document.removeEventListener('scroll', resetTimer);
            clearTimeout(inactivityTimer);
        };
    }, [hasShown, triggerPopup]);

    const handleClose = () => setIsVisible(false);

    const handleAction = () => {
        analytics.trackExitIntentConverted(window.location.pathname, 'roi_calculator');
        window.location.href = 'https://calendly.com/qrgate-demo';
    };

    if (!isVisible) return null;

    // Calculations
    const currentRevenue = visitors * ticketPrice;
    const qrgateTicketingRevenue =
        visitors * ticketPrice * (1 + EFFICIENCY_UPLIFT) -
        visitors * (QRGATE_FEE_FIXED + ticketPrice * QRGATE_FEE_PERCENT);
    const ticketingGain = Math.max(0, qrgateTicketingRevenue - currentRevenue);
    const audioRevenue = visitors * AUDIOGUIDE_UPTAKE * AUDIOGUIDE_PRICE * AUDIOGUIDE_VENUE_SHARE;
    const totalGain = ticketingGain + (audioEnabled ? audioRevenue : 0);

    const sliderBg = (val, min, max) =>
        `linear-gradient(to right, #059669 0%, #059669 ${(val - min) / (max - min) * 100}%, #e2e8f0 ${(val - min) / (max - min) * 100}%, #e2e8f0 100%)`;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
                <style>{`
                    .qrg-slider { -webkit-appearance:none; appearance:none; width:100%; height:8px; border-radius:8px; outline:none; cursor:pointer; border:none; }
                    .qrg-slider::-webkit-slider-thumb { -webkit-appearance:none; width:28px; height:28px; border-radius:50%; background:#10b981; border:3px solid white; box-shadow:0 4px 12px rgba(16,185,129,0.35); cursor:pointer; transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1); }
                    .qrg-slider::-webkit-slider-thumb:active { transform:scale(1.1); box-shadow:0 6px 16px rgba(16,185,129,0.5); }
                    .gain-pulse { animation: gainPulse 2.5s ease-in-out infinite alternate; }
                    @keyframes gainPulse { from { filter:drop-shadow(0 0 10px rgba(16,185,129,0.25)); } to { filter:drop-shadow(0 0 20px rgba(16,185,129,0.7)); } }
                `}</style>

                {/* Overlay Component */}
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.3 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-slate-900/40"
                    aria-hidden="true"
                />

                {/* Modal Component */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    transition={{ type: "spring", damping: 28, stiffness: 300 }}
                    className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-white/20 w-full max-w-lg overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-[#0B1120] via-slate-900 to-[#0F172A] px-8 pt-10 pb-12 relative overflow-hidden">
                        <div className="absolute top-[-80px] right-[-40px] w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                        <div className="absolute bottom-[-40px] left-[-20px] w-40 h-40 bg-teal-500/10 blur-[60px] rounded-full pointer-events-none" />
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full transition-all focus:outline-none"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1 mb-4">
                            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                                📊 Calcolatore Revenue
                            </span>
                        </div>
                        <h2 className="text-white text-2xl font-bold mb-2 leading-tight tracking-tight">
                            Scopri quanto guadagneresti<br />con QRGate questo mese
                        </h2>
                        <p className="text-white/60 text-sm">
                            Inserisci i tuoi dati reali. Il calcolo è basato sulle medie di settore.
                        </p>
                    </div>

                    {/* Body */}
                    <div className="p-8">
                        {/* Sliders */}
                        <div className="flex flex-col gap-6 mb-8">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold text-slate-700">Visitatori mensili</label>
                                    <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                                        {visitors.toLocaleString("it-IT")}
                                    </span>
                                </div>
                                <input type="range" className="qrg-slider" min={100} max={10000} step={100} value={visitors}
                                    onChange={e => setVisitors(Number(e.target.value))}
                                    style={{ background: sliderBg(visitors, 100, 10000) }}
                                />
                                <div className="flex justify-between mt-1.5">
                                    <span className="text-xs text-slate-400">100</span>
                                    <span className="text-xs text-slate-400">10.000</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold text-slate-700">Prezzo medio biglietto</label>
                                    <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                                        €{ticketPrice}
                                    </span>
                                </div>
                                <input type="range" className="qrg-slider" min={3} max={40} step={1} value={ticketPrice}
                                    onChange={e => setTicketPrice(Number(e.target.value))}
                                    style={{ background: sliderBg(ticketPrice, 3, 40) }}
                                />
                                <div className="flex justify-between mt-1.5">
                                    <span className="text-xs text-slate-400">€3</span>
                                    <span className="text-xs text-slate-400">€40</span>
                                </div>
                            </div>
                        </div>

                        {/* Results Card */}
                        <div className="bg-[#0B1120] rounded-3xl p-7 mb-7 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-800/80 relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"></div>
                            <div className="flex justify-between items-end mb-5 relative z-10">
                                <div>
                                    <p className="text-slate-500 text-[11px] font-bold tracking-widest uppercase mb-1.5">Ora (senza QRGate)</p>
                                    <p className="text-slate-300 text-xl font-medium font-mono">
                                        <AnimatedNumber value={currentRevenue} prefix="€" /><span className="text-sm font-sans text-slate-500">/mese</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-400 text-[11px] font-bold tracking-widest uppercase mb-1.5">Guadagno extra</p>
                                    <p className="gain-pulse text-emerald-400 text-4xl font-black font-mono tracking-tighter">
                                        +<AnimatedNumber value={totalGain} prefix="€" />
                                        <span className="text-sm font-medium font-sans text-emerald-500/70 tracking-normal ml-0.5">/mese</span>
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4 flex flex-col gap-2.5 relative z-10">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-xs">📈 Biglietteria digitale (+22% conv.)</span>
                                    <span className="text-slate-200 text-xs font-bold font-mono">
                                        +<AnimatedNumber value={ticketingGain} prefix="€" />
                                    </span>
                                </div>
                                {audioEnabled && (
                                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
                                        <span className="text-slate-400 text-xs">
                                            🎧 Audioguida AI (~{Math.round(visitors * AUDIOGUIDE_UPTAKE)} acquisti)
                                        </span>
                                        <span className="text-emerald-400 text-xs font-bold font-mono">
                                            +<AnimatedNumber value={audioRevenue} prefix="€" />
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Audioguide Toggle */}
                        <div
                            className={`border-2 rounded-2xl mb-7 transition-all duration-300 relative overflow-hidden ${audioEnabled ? 'border-emerald-500/40 bg-emerald-50/40 shadow-[0_8px_30px_rgba(16,185,129,0.08)]' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}`}
                        >
                            <div
                                onClick={() => setAudioEnabled(!audioEnabled)}
                                className="flex items-center justify-between p-5 cursor-pointer relative z-10"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-300 ${audioEnabled ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                        <Headphones className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-bold text-slate-900 leading-tight mb-0.5">Aggiungi Audioguida AI</p>
                                        <p className="text-[13px] text-slate-500 font-medium">Nuova fonte di ricavo, pronta in 10 min</p>
                                    </div>
                                </div>
                                {/* Switch toggle */}
                                <div className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${audioEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 cubic-bezier(0.34,1.56,0.64,1) ${audioEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <a
                            href="https://calendly.com/qrgate-demo"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleAction}
                            className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-1 active:scale-[0.98] transition-all outline-none focus:ring-4 focus:ring-emerald-500/30 group"
                        >
                            Sblocca +€{Math.round(totalGain).toLocaleString("it-IT")}/mese
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform ml-1" />
                        </a>
                        <button
                            onClick={handleClose}
                            className="w-full mt-4 py-2.5 text-slate-400 font-semibold hover:text-slate-600 transition-colors text-xs tracking-widest uppercase text-center focus:outline-none"
                        >
                            Rinuncio a queste entrate
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ExitIntentPopup;
