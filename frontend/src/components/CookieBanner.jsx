import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const CookieBanner = () => {
    const [visible, setVisible] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [preferences, setPreferences] = useState({
        technical: true,
        analytics: true,
        marketing: false
    });

    useEffect(() => {
        const consent = localStorage.getItem('qrgate_cookie_consent');
        if (!consent) {
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptAll = () => {
        const consent = { technical: true, analytics: true, marketing: true, timestamp: new Date().toISOString() };
        localStorage.setItem('qrgate_cookie_consent', JSON.stringify(consent));
        setVisible(false);
        toast.success("Preferenze salvate");
    };

    const handleSavePreferences = () => {
        localStorage.setItem('qrgate_cookie_consent', JSON.stringify({ ...preferences, timestamp: new Date().toISOString() }));
        setVisible(false);
        toast.success("Preferenze salvate");
    };

    const handleDecline = () => {
        const consent = { technical: true, analytics: false, marketing: false, timestamp: new Date().toISOString() };
        localStorage.setItem('qrgate_cookie_consent', JSON.stringify(consent));
        setVisible(false);
        toast.success("Cookie non necessari rifiutati");
    };

    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[440px] z-[9999]"
                role="dialog"
                aria-labelledby="cookie-title"
                aria-describedby="cookie-desc"
            >
                <div className="bg-slate-900 border-2 border-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 -m-16 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl"></div>

                    {!showPreferences ? (
                        <>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <ShieldCheck className="w-7 h-7 text-white" />
                                </div>
                                <h3 id="cookie-title" className="font-black text-xl tracking-tighter uppercase">Privacy & Cookies</h3>
                            </div>
                            <p id="cookie-desc" className="text-slate-400 text-sm leading-relaxed mb-8">
                                Utilizziamo i cookie per garantire la migliore esperienza su QRGate. Alcuni sono necessari, altri ci aiutano a migliorare il servizio.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleAcceptAll}
                                    aria-label="Accetta tutti i cookie"
                                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 active:scale-95"
                                >
                                    Accetta Tutti
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPreferences(true)}
                                        aria-label="Personalizza preferenze cookie"
                                        className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Personalizza
                                    </button>
                                    <button
                                        onClick={handleDecline}
                                        aria-label="Rifiuta cookie non necessari"
                                        className="px-6 py-4 bg-white/5 border border-white/10 text-slate-400 font-bold rounded-2xl hover:bg-white/10 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Rifiuta
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-black text-xl uppercase tracking-tighter">Preferenze</h3>
                                <button onClick={() => setShowPreferences(false)} className="text-slate-500 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="font-bold text-sm">Tecnici</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-black">Sempre Attivi</p>
                                    </div>
                                    <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center px-1">
                                        <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="font-bold text-sm">Analitici</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-black">Performance</p>
                                    </div>
                                    <button
                                        onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                                        className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${preferences.analytics ? 'bg-blue-600' : 'bg-slate-700'}`}
                                    >
                                        <motion.div animate={{ x: preferences.analytics ? 20 : 0 }} className="w-4 h-4 bg-white rounded-full" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="font-bold text-sm">Marketing</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-black">Personalizzazione</p>
                                    </div>
                                    <button
                                        onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                                        className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${preferences.marketing ? 'bg-blue-600' : 'bg-slate-700'}`}
                                    >
                                        <motion.div animate={{ x: preferences.marketing ? 20 : 0 }} className="w-4 h-4 bg-white rounded-full" />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleSavePreferences}
                                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40"
                            >
                                Salva Preferenze
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CookieBanner;
