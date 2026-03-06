import React, { useState } from 'react';
import { Copy, Gift, Users, Share2, ArrowRight, MessageSquare, Mail } from 'lucide-react';
import { toast } from 'sonner';

const ReferralProgram = ({ venueData }) => {
    const referralCode = venueData?.slug?.toUpperCase() || 'QRGATE24';
    const referralLink = `https://qrgate.io/join?ref=${referralCode}`;

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast.success('Link di affiliazione copiato!');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 -m-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full border border-white/30 backdrop-blur-md">
                            <Gift className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Programma Partner QRGate</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-black leading-tight">
                            Porta un collega,<br />guadagna per sempre.
                        </h1>
                        <p className="text-lg text-white/90 max-w-xl">
                            Ricevi il <b>20% di commissione ricorrente</b> su ogni vendita effettuata dai venue che si iscrivono tramite il tuo link.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-8 text-gray-900 md:w-80 shadow-xl border border-white/20">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Il tuo Link Unico</p>
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between group hover:border-amber-400 transition-all cursor-pointer" onClick={copyLink}>
                            <span className="font-mono font-bold text-amber-600 truncate mr-2">{referralLink}</span>
                            <Copy className="w-5 h-5 text-gray-400 group-hover:text-amber-500 shrink-0" />
                        </div>
                        <button onClick={copyLink} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-500 transition-all shadow-lg shadow-orange-900/20 uppercase tracking-widest text-sm mb-4">
                            Copia e Condividi
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Entra anche tu in QRGate e modernizza il tuo sito culturale! Usa il mio link: ${referralLink}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl font-bold text-xs hover:opacity-90 transition-opacity"
                            >
                                <MessageSquare className="w-4 h-4" /> WhatsApp
                            </a>
                            <a
                                href={`mailto:?subject=Invito a QRGate&body=${encodeURIComponent(`Ciao, volevo consigliarti QRGate per la gestione dei biglietti digitali del tuo sito culturale. È fantastico! Ecco il link: ${referralLink}`)}`}
                                className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
                            >
                                <Mail className="w-4 h-4" /> Email
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { icon: <Share2 />, title: "Condividi il Link", desc: "Invia il tuo link a gestori di musei, chiese o siti culturali." },
                    { icon: <Users />, title: "Registrazione", desc: "Il tuo collega si iscrive e inizia a vendere ticket digitali." },
                    { icon: <ArrowRight />, title: "Incassa Mensilmente", desc: "Ogni mese accreditiamo la tua quota sul tuo conto Stripe." }
                ].map((step, i) => (
                    <div key={i} className="glass-card p-6 border-t-4 border-amber-500 hover:scale-105 transition-transform">
                        <div className="w-12 h-12 bg-amber-100/50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                            {step.icon}
                        </div>
                        <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReferralProgram;
