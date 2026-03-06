import React from 'react';
import {
    Code, Lock, Globe, Database, Terminal,
    Copy, ExternalLink, ShieldCheck, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const PublicApiDocs = ({ venueSlug }) => {
    const apiKey = "sk_live_" + Math.random().toString(36).substr(2, 16); // Mock key

    const copyKey = () => {
        navigator.clipboard.writeText(apiKey);
        toast.success("API Key copiata!");
    };

    const endpoints = [
        {
            method: "GET",
            path: "/api/v1/tickets",
            desc: "Recupera la lista dei ticket attivi per la venue.",
            auth: "Required"
        },
        {
            method: "POST",
            path: "/api/v1/orders",
            desc: "Crea un nuovo ordine esternamente (White-label legacy).",
            auth: "Required"
        },
        {
            method: "GET",
            path: "/api/v1/venue/stats",
            desc: "Accedi alle statistiche BI in tempo reale via JSON.",
            auth: "Required"
        }
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="max-w-xl">
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase italic flex items-center gap-3">
                        <Terminal className="w-10 h-10 text-blue-600" /> API Publiche v1.0
                    </h1>
                    <p className="text-slate-500 text-lg font-medium leading-relaxed">
                        Sviluppa integrazioni personalizzate, connetti software legacy o crea la tua dashboard privata usando le nostre API REST Enterprise.
                    </p>
                </div>

                <div className="bg-slate-900 rounded-[2rem] p-8 text-white w-full md:w-80 shadow-2xl relative overflow-hidden border border-white/10 group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                        <Lock className="w-12 h-12" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Chiave API Privata</p>
                    <div className="flex items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                        <code className="text-xs text-blue-200 truncate">{apiKey}</code>
                        <button onClick={copyKey} className="text-white/40 hover:text-white transition-colors">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-white/40 font-bold leading-tight italic">
                        <ShieldCheck className="w-3 h-3 inline mr-1 text-emerald-500" />
                        Non condividere mai questa chiave. È valida solo per {venueSlug}.
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Endpoints Disponibili</h3>
                    {endpoints.map((ep, i) => (
                        <div key={i} className="bg-white border-2 border-slate-100 rounded-3xl p-6 hover:border-blue-500 transition-all group">
                            <div className="flex items-center gap-4 mb-4">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {ep.method}
                                </span>
                                <code className="text-slate-900 font-bold font-mono">{ep.path}</code>
                            </div>
                            <p className="text-slate-500 text-sm font-medium">{ep.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Esempio Request</h3>
                    <div className="bg-slate-900 rounded-[2rem] p-6 text-blue-300 font-mono text-xs overflow-hidden border border-white/10 shadow-xl">
                        <div className="flex items-center gap-2 mb-4 text-white/30 border-b border-white/5 pb-2">
                            <Zap className="w-3 h-3" /> cURL
                        </div>
                        <pre className="whitespace-pre-wrap">
                            {`curl -X GET "https://api.qrgate.io/v1/tickets" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`}
                        </pre>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
                        <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4" /> Webhooks
                        </h4>
                        <p className="text-xs text-blue-700 leading-relaxed font-medium">
                            Ricevi notifiche istantanee via POST quando viene venduto un nuovo biglietto o quando una scansione fallisce.
                        </p>
                        <button className="mt-4 text-xs font-black text-blue-600 flex items-center gap-1 hover:underline">
                            Configura Webhooks <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicApiDocs;
