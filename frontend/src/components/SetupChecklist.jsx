import React from 'react';
import { CheckCircle, Circle, ArrowRight, Ticket, CreditCard, Camera, LayoutDashboard, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const SetupChecklist = ({ venueData, stats }) => {
    const navigate = useNavigate();

    const steps = [
        {
            id: 'tickets',
            title: 'Configura i tuoi Biglietti',
            description: 'Aggiungi prezzi e descrizioni per i tuoi ingressi.',
            icon: <Ticket className="w-5 h-5" />,
            completed: stats?.total_tickets > 0,
            link: '/dashboard/tickets'
        },
        {
            id: 'stripe',
            title: 'Collega il Conto Bancario',
            description: 'Necessario per ricevere i pagamenti ogni settimana.',
            icon: <CreditCard className="w-5 h-5" />,
            completed: venueData?.stripe_onboarded,
            link: '/dashboard/payments'
        },
        {
            id: 'media',
            title: 'Carica Foto & Logo',
            description: 'I luoghi con foto convertono il 40% in più.',
            icon: <Camera className="w-5 h-5" />,
            completed: !!venueData?.logo_url && !!venueData?.cover_url,
            link: '/dashboard/settings'
        },
        {
            id: 'test',
            title: 'Fai una Scansione di Prova',
            description: 'Usa lo Staff Scanner per simulare un ingresso.',
            icon: <LayoutDashboard className="w-5 h-5" />,
            completed: stats?.total_orders > 0,
            link: '/scanner'
        }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const progressPercent = (completedCount / steps.length) * 100;

    if (completedCount === steps.length) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-[#E5E1D9] rounded-[2.5rem] p-8 shadow-sm mb-10 overflow-hidden relative"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
                <div>
                    <h3 className="text-2xl font-black text-[#0F0E0C] tracking-tighter mb-1">Completa il Setup</h3>
                    <p className="text-stone-500 font-medium text-sm">Mancano pochi passaggi per iniziare a scalare.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Progresso</p>
                        <p className="text-xl font-black text-[#D4A853] tabular-nums">{completedCount}/{steps.length}</p>
                    </div>
                    <div className="w-32 h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            className="h-full bg-[#D4A853] rounded-full"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                {steps.map((step) => (
                    <button
                        key={step.id}
                        onClick={() => navigate(step.link)}
                        className={`p-6 rounded-3xl border-2 transition-all text-left flex flex-col justify-between h-full group ${step.completed
                                ? 'bg-emerald-50/50 border-emerald-100 opacity-60'
                                : 'bg-white border-stone-100 hover:border-[#D4A853] hover:shadow-xl hover:shadow-[#D4A853]/5'
                            }`}
                    >
                        <div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${step.completed ? 'bg-emerald-500 text-white' : 'bg-stone-50 text-stone-400 group-hover:bg-[#F5F2EC] group-hover:text-[#0F0E0C]'
                                }`}>
                                {step.completed ? <CheckCircle className="w-6 h-6" /> : step.icon}
                            </div>
                            <h4 className={`font-black text-sm mb-2 tracking-tight ${step.completed ? 'text-emerald-900' : 'text-[#0F0E0C]'}`}>
                                {step.title}
                            </h4>
                            <p className="text-xs font-medium text-stone-500 leading-relaxed mb-4">
                                {step.description}
                            </p>
                        </div>
                        {!step.completed && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-[#D4A853] uppercase tracking-widest">
                                Configura Ora <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="absolute top-0 right-0 -m-12 w-48 h-48 bg-[#D4A853]/5 rounded-full blur-3xl pointer-events-none"></div>
        </motion.div>
    );
};

export default SetupChecklist;
