import React from 'react';
import { motion } from 'framer-motion';
import { Award, Trophy, Star, Zap, Shield, Target } from 'lucide-react';

const GamificationBadges = ({ stats }) => {
    const badges = [
        {
            id: 'first_sale',
            icon: <Zap className="w-5 h-5" />,
            name: 'Pioniere Digitale',
            description: 'Hai emesso il tuo primo biglietto con QRGate.',
            unlocked: stats?.month?.ticket_count > 0,
            color: 'text-amber-500 bg-amber-500/10'
        },
        {
            id: 'high_volume',
            icon: <Trophy className="w-5 h-5" />,
            name: 'Elite Venue',
            description: 'Più di 1.000 biglietti emessi in un mese.',
            unlocked: stats?.month?.ticket_count > 1000,
            color: 'text-blue-500 bg-blue-500/10'
        },
        {
            id: 'perfect_scan',
            icon: <Shield className="w-5 h-5" />,
            name: 'Guardiano del Varco',
            description: '100% di scansioni valide oggi (nessun errore manuale).',
            unlocked: stats?.today?.ticket_count > 5, // Mock condition
            color: 'text-emerald-500 bg-emerald-500/10'
        },
        {
            id: 'loyal_partner',
            icon: <Star className="w-5 h-5" />,
            name: 'Ambasciatore QRGate',
            description: 'Hai invitato con successo un altra venue.',
            unlocked: true, // Mock unlocked
            color: 'text-purple-500 bg-purple-500/10'
        }
    ];

    return (
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">I Tuoi Traguardi</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Sblocca premi e vantaggi esclusivi</p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-full text-[10px] font-black text-slate-500 border border-slate-100">
                    LIVELLO 4
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badges.map((badge) => (
                    <motion.div
                        key={badge.id}
                        whileHover={{ scale: 1.05 }}
                        className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-3 ${badge.unlocked ? 'border-slate-100 bg-white shadow-sm' : 'border-dashed border-slate-100 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'}`}
                    >
                        <div className={`p-4 rounded-2xl ${badge.color}`}>
                            {badge.icon}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-900 mb-1">{badge.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">{badge.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default GamificationBadges;
