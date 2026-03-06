import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    CheckCircle, ArrowRight, ShieldCheck, Users, HelpCircle,
    BarChart3, Zap, Clock, TrendingUp, AlertCircle, Building2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import { analytics } from '@/services/analytics_service';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const Pricing = () => {
    const { t } = useTranslation();
    const [visitors, setVisitors] = useState(2500);
    const [ticketPrice, setTicketPrice] = useState(12);

    useEffect(() => {
        analytics.trackPricingPageViewed();
    }, []);

    // ROI Calculations
    const grossRevenue = visitors * ticketPrice;
    const qrgateFee = (grossRevenue * 0.05) + (visitors * 0.49);
    const venueNet = grossRevenue - qrgateFee;

    const handleSimulatorChange = (val) => {
        setVisitors(val);
        analytics.trackSimulatorInteracted(val, venueNet);
    };

    return (
        <div className="min-h-screen bg-stone-50 font-sans selection:bg-stone-950/10">
            <Navbar />
            <ExitIntentPopup />

            <main className="pt-24 pb-20 px-4">
                <div className="max-w-6xl mx-auto">

                    {/* 1. Headline: Value-focused (§6.2) */}
                    <div className="text-center mb-16">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-black text-stone-950 mb-6 tracking-tight"
                        >
                            Paghi solo quando vendi. <br />
                            <span className="text-amber-600">Zero costi fissi, mai.</span>
                        </motion.h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                            Attivazione immediata, nessun canone mensile. <br />
                            Il primo biglietto è a costo zero.
                        </p>
                    </div>

                    {/* 2. Interactive ROI Simulator (§6.2) */}
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-stone-200/50 border border-stone-200 p-8 md:p-12 mb-20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full blur-3xl -mr-32 -mt-32"></div>

                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Quanto puoi guadagnare?</h2>
                                <div className="space-y-10">
                                    <div>
                                        <div className="flex justify-between mb-4">
                                            <span className="font-bold text-stone-700 uppercase tracking-widest text-xs">Visitatori Mensili</span>
                                            <span className="text-2xl font-black text-stone-950">{visitors.toLocaleString()}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="100"
                                            max="10000"
                                            step="100"
                                            value={visitors}
                                            onChange={(e) => handleSimulatorChange(parseInt(e.target.value))}
                                            className="w-full h-3 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-950"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-4">
                                            <span className="font-bold text-stone-700 uppercase tracking-widest text-xs">Prezzo Medio Biglietto</span>
                                            <span className="text-2xl font-black text-stone-950">€{ticketPrice}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="5"
                                            max="50"
                                            step="1"
                                            value={ticketPrice}
                                            onChange={(e) => setTicketPrice(parseInt(e.target.value))}
                                            className="w-full h-3 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-950"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-stone-950 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-stone-400 font-bold uppercase tracking-widest text-xs mb-8">Stima Incassi Mensili</p>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                            <span className="text-slate-400">Incasso Lordo</span>
                                            <span className="text-xl font-bold">€{grossRevenue.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                            <span className="text-slate-400 text-sm italic">Commissione QRGate (calcolata)</span>
                                            <span className="text-lg font-bold text-red-400">- €{Math.round(qrgateFee).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-amber-500 font-bold text-lg uppercase tracking-wider">Netto al Venue</span>
                                            <span className="text-5xl font-black tracking-tighter">€{Math.round(venueNet).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="mt-10 h-3 bg-white/5 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-amber-500" style={{ width: `${(venueNet / grossRevenue) * 100}%` }}></div>
                                        <div className="h-full bg-stone-700" style={{ width: `${(qrgateFee / grossRevenue) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Pricing Explained (§6.2) */}
                    <div className="grid md:grid-cols-3 gap-8 mb-20 text-center">
                        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                            <div className="text-6xl font-black text-stone-950 mb-2">€0,49</div>
                            <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Fisso per ticket</p>
                        </div>
                        <div className="bg-stone-950 p-8 rounded-3xl text-white shadow-2xl shadow-stone-950/20 active:scale-[1.02] transition-transform">
                            <div className="text-6xl font-black mb-2 text-amber-500">+ 5%</div>
                            <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Variabile</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                            <p className="text-slate-600 leading-tight">
                                <strong>Esempio:</strong> Un biglietto da €10 ti costa €0,99. <br />
                                <span className="text-slate-900 font-bold">Ricevi €9,01 puliti.</span>
                            </p>
                        </div>
                    </div>

                    {/* 4. Comparison Table (§6.2) */}
                    <div className="mb-20">
                        <h2 className="text-3xl font-black text-slate-900 mb-10 text-center uppercase tracking-tighter">Perché QRGate è la Scelta Ovvia</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                <thead>
                                    <tr className="bg-stone-50">
                                        <th className="p-6 text-left text-stone-400 font-bold uppercase tracking-widest text-xs">Funzionalità</th>
                                        <th className="p-6 text-center text-stone-800 font-bold">Personale Fisico</th>
                                        <th className="p-6 text-center text-stone-800 font-bold">Competitor Enterprise</th>
                                        <th className="p-6 text-center bg-stone-950 text-white font-black text-lg">QRGate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr>
                                        <td className="p-6 font-bold text-slate-700">Costo Setup</td>
                                        <td className="p-6 text-center text-red-500 font-bold">€2.500+</td>
                                        <td className="p-6 text-center text-red-500 font-bold">€1.000+</td>
                                        <td className="p-6 text-center text-green-600 font-black">€0</td>
                                    </tr>
                                    <tr>
                                        <td className="p-6 font-bold text-slate-700">Costo Mensile</td>
                                        <td className="p-6 text-center text-red-500 font-bold">€1.200+</td>
                                        <td className="p-6 text-center text-red-500 font-bold">€150+</td>
                                        <td className="p-6 text-center text-green-600 font-black">€0</td>
                                    </tr>
                                    <tr>
                                        <td className="p-6 font-bold text-stone-700">Tempi di Attivazione</td>
                                        <td className="p-6 text-center text-stone-400">Mesi</td>
                                        <td className="p-6 text-center text-stone-400">Settimane</td>
                                        <td className="p-6 text-center text-stone-950 font-black">24 ORE</td>
                                    </tr>
                                    <tr>
                                        <td className="p-6 font-bold text-stone-700">Controllo Accessi</td>
                                        <td className="p-6 text-center text-stone-400">Manuale</td>
                                        <td className="p-6 text-center text-stone-400">Hardware Dedicato</td>
                                        <td className="p-6 text-center text-stone-950 font-black">APP SCANNER</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 5. Zero Risk Guarantee (§6.2) */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-emerald-50 border-2 border-emerald-500/20 rounded-3xl p-10 mb-20 text-center relative overflow-hidden"
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                        <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-black text-stone-950 mb-4 uppercase tracking-tight">Garanzia Zero Rischi</h2>
                        <p className="text-lg text-emerald-800 font-medium max-w-2xl mx-auto leading-relaxed">
                            Dormi sonni tranquilli. Se non vendi, non paghi nulla. Nessun costo di setup. Nessun abbonamento mensile. Nessun contratto a lungo termine.
                            <span className="font-black text-stone-950"> Puoi smettere quando vuoi con un click.</span>
                        </p>
                    </motion.div>

                    {/* 6. Inline FAQ (§6.2) */}
                    <div className="max-w-3xl mx-auto mb-20">
                        <h2 className="text-3xl font-black text-center mb-10 uppercase tracking-tighter">Domande Frequenti</h2>
                        <Accordion type="single" collapsible className="space-y-4">
                            <AccordionItem value="item-1" className="border-2 border-slate-100 rounded-2xl px-6 bg-white">
                                <AccordionTrigger className="font-bold text-slate-800 hover:no-underline py-6">
                                    Ci sono veramente zero costi fissi?
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-600 pb-6">
                                    Assolutamente sì. Non pagherai mai un centesimo se non effettui vendite. QRGate cresce con te: guadagniamo solo quando il tuo venue incassa.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2" className="border-2 border-slate-100 rounded-2xl px-6 bg-white">
                                <AccordionTrigger className="font-bold text-slate-800 hover:no-underline py-6">
                                    Come ricevo i pagamenti?
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-600 pb-6">
                                    I pagamenti vengono processati via Stripe e accreditati direttamente sul tuo conto corrente bancario ogni settimana o ogni mese, a tua scelta.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3" className="border-2 border-slate-100 rounded-2xl px-6 bg-white">
                                <AccordionTrigger className="font-bold text-slate-800 hover:no-underline py-6">
                                    Serve un hardware speciale per scansionare?
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-600 pb-6">
                                    No, basta un qualsiasi smartphone (iOS o Android). Scarica l'app QRGate Scanner, accedi con le credenziali dello staff e sei pronto a convalidare i biglietti all'ingresso.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>

                    {/* 7. Final CTA (§6.2) */}
                    <div className="bg-stone-950 rounded-[3rem] p-12 md:p-16 text-white text-center shadow-2xl shadow-stone-900/40 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>

                        <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Inizia ora — il tuo primo biglietto è a costo zero</h2>
                        <p className="text-stone-400 text-lg mb-10 opacity-90 max-w-xl mx-auto">
                            Unisciti a centinaia di musei e siti culturali che hanno già eliminato le code e modernizzato la loro biglietteria.
                        </p>
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-stone-950 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-lg group"
                        >
                            Crea il tuo Account Gratis
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <p className="mt-6 text-sm text-stone-500 font-medium">Nessuna carta di credito richiesta per la registrazione.</p>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Pricing;
