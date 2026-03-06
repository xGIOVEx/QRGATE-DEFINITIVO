import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function TourSelection({ venue, tours, onSelect }) {

    const ICONS = {
        standard: "🎭",
        kids: "🦁",
        expert: "🔬",
        quick: "⚡",
        mystery: "🕵️"
    };

    const LABELS = {
        standard: "Visita Completa",
        kids: "Per Famiglie",
        expert: "Approfondimento",
        quick: "Tour Rapido",
        mystery: "Misteri e Leggende"
    };

    const DESCRIPTIONS = {
        standard: "L'esperienza classica con tutte le opere principali.",
        kids: "Racconti divertenti e interattivi perfetti per i bambini dai 5 anni.",
        expert: "Dettagli tecnici, storia dell'arte e curiosità avanzate.",
        quick: "Hai poco tempo? Scopri solo i capolavori essenziali.",
        mystery: "Scopri i segreti nascosti e le leggende di questo luogo."
    };

    return (
        <div className="absolute inset-0 bg-black z-40 flex flex-col">
            {/* Background Cover con Gradiente Scurito */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1518998053401-a41490918eed?q=80&w=1080')` }}
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/80 to-black/30" />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full overflow-hidden pb-12">
                {/* Header */}
                <div className="pt-20 px-6 mb-auto text-center animate-in slide-in-from-top-10 duration-700">
                    <p className="text-white/70 uppercase tracking-widest text-xs font-bold mb-3">BENVENUTO A</p>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-xl mb-4 leading-tight">
                        {venue?.name || "Museo"}
                    </h1>
                    <p className="text-slate-200 text-lg mx-auto max-w-sm">
                        Scegli come vuoi esplorare questo luogo oggi.
                    </p>
                </div>

                {/* Horizontal Scrollable Cards */}
                <div className="w-full overflow-x-auto pb-8 pt-8 px-6 snap-x snap-mandatory hide-scrollbar">
                    <div className="flex space-x-4 w-max">
                        {tours?.map((tour, idx) => (
                            <div
                                key={tour.id}
                                onClick={() => onSelect(tour.id)}
                                className="snap-center shrink-0 w-[280px] sm:w-[320px] bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col cursor-pointer hover:bg-slate-800/80 transition-all active:scale-95 group animate-in slide-in-from-right-8"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                                        {ICONS[tour.id] || "🎧"}
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white/90">
                                        {tour.duration || "45 min"}
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2">{LABELS[tour.id] || tour.id}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
                                    {DESCRIPTIONS[tour.id] || "Un'esperienza su misura per te."}
                                </p>

                                <div className="flex items-center text-blue-400 font-semibold text-sm group-hover:text-blue-300">
                                    <span className="uppercase tracking-wider">Inizia Tour</span>
                                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
