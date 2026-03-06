import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Send, User, Bot, Sparkles, Bug, MessageSquare, Trash2,
    ChevronRight, CheckCircle2, Layout, Palette, Zap, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";

const AGENTS = [
    {
        id: "cromia",
        name: "Cromia",
        role: "Design & Brand Agent",
        icon: Palette,
        color: "#D4A853", // Amber Gold
        description: "Specialista nel design system European Cultural Premium. Analizza colori, spaziature e coerenza visiva.",
        prompt: `Sei Cromia, l'agente specializzato nel Design System di QRGate.

IL TUO OBIETTIVO:
- Garantire che ogni elemento segua il sistema "European Cultural Premium".
- Verificare l'uso dei colori: #F5F2EC (Ivory), #0F0E0C (Stone-950), #D4A853 (Amber Gold).
- Sostituire qualsiasi residuo di blu o grigi Tailwind standard.
- Assicurarsi che i font siano DM Sans e i bordi siano rounded-2xl.

IL TUO TONO:
- Sofisticato, preciso, autorevole ma collaborativo.
- Parla in italiano (o inglese se richiesto).

CONTESTO:
Lavori per Giovanni e il team Antigravity.`
    },
    {
        id: "glitch",
        name: "Glitch",
        role: "Bug Hunter & Logic Agent",
        icon: Bug,
        color: "#DC2626", // Red
        description: "Individua bug logici, problemi di performance e falle nella sicurezza del codice backend e frontend.",
        prompt: `Sei Glitch, l'agente specializzato in Debugging e Logica di QRGate.

IL TUO OBIETTIVO:
- Trovare bug prima che lo facciano i visitatori.
- Analizzare le integrazioni Stripe, MongoDB e l'AI Aria.
- Suggerire ottimizzazioni per la velocità di caricamento e la gestione degli stati.
- Verificare la robustezza delle API FastAPI.

IL TUO TONO:
- Tecnico, rapido, orientato alla risoluzione dei problemi.
- Vai dritto al punto con snippet di codice chiari.

CONTESTO:
Lavori per Giovanni e il team Antigravity.`
    },
    {
        id: "aria_copy",
        name: "Aria Copy",
        role: "UX & Marketing Agent",
        icon: MessageSquare,
        color: "#10B981", // Success Green
        description: "Analizza il tone of voice, la psicologia di vendita e la precisione delle traduzioni multilingua.",
        prompt: `Sei Aria Copy, l'agente specializzato in UX Writing e Marketing per QRGate.

IL TUO OBIETTIVO:
- Ottimizzare la conversione della Homepage e del Checkout.
- Verificare che le 7 lingue siano naturali e non traduzioni "fredde".
- Assicurarsi che il posizionamento "European Heritage" traspaia da ogni paragrafo.
- Migliorare la chiarezza dei messaggi d'errore e delle CTA.

IL TUO TONO:
- Persuasivo, elegante, empatico verso il visitatore.
- Fokus sulla conversion rate optimization (CRO).

CONTESTO:
Lavori per Giovanni e il team Antigravity.`
    }
];

const ReviewAgents = () => {
    const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [fixes, setFixes] = useState([]);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Nota: Qui andrebbe l'integrazione reale con il backend AI
            // Simulo una risposta basata sul prompt dell'agente
            setTimeout(() => {
                const responseContent = `[SIMULATED ${selectedAgent.name.toUpperCase()} RESPONSE]
Ricevuto. Sto analizzando la questione seguendo le mie linee guida di ${selectedAgent.role}.
Ecco cosa suggerisco...`;

                setMessages((prev) => [...prev, { role: "assistant", content: responseContent }]);
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            console.error("Error sending message:", error);
            setIsLoading(false);
        }
    };

    const addFix = (title, content) => {
        setFixes((prev) => [{ id: Date.now(), title, content, done: false }, ...prev]);
    };

    const toggleFix = (id) => {
        setFixes((prev) => prev.map(f => f.id === id ? { ...f, done: !f.done } : f));
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <div className="min-h-screen bg-[#F5F2EC] flex flex-col font-['DM_Sans']">
            <Navbar />

            <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 lg:p-8 pt-24 gap-8">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#0F0E0C] tracking-tight">Technical Audit Team</h1>
                        <p className="text-stone-600 mt-2 text-lg">Revisiona il progetto con i tuoi agenti specializzati.</p>
                    </div>
                    <div className="flex bg-[#E5E1D9] p-1 rounded-xl shadow-inner">
                        {AGENTS.map((agent) => (
                            <button
                                key={agent.id}
                                onClick={() => {
                                    setSelectedAgent(agent);
                                    clearChat();
                                }}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 font-semibold ${selectedAgent.id === agent.id
                                        ? "bg-white text-[#0F0E0C] shadow-sm scale-[1.02]"
                                        : "text-stone-500 hover:text-stone-800"
                                    }`}
                            >
                                <agent.icon size={18} style={{ color: selectedAgent.id === agent.id ? agent.color : "currentColor" }} />
                                {agent.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8 overflow-hidden">
                    {/* Sidebar - Agent Info & Fixes */}
                    <div className="lg:col-span-1 flex flex-col gap-8">
                        {/* Agent Detail Card */}
                        <motion.div
                            key={selectedAgent.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-md bg-[#F5F2EC]" style={{ color: selectedAgent.color }}>
                                <selectedAgent.icon size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-[#0F0E0C]">{selectedAgent.role}</h3>
                            <p className="text-stone-500 text-sm mt-3 leading-relaxed">{selectedAgent.description}</p>
                        </motion.div>

                        {/* Fix Tracking List */}
                        <div className="bg-white rounded-2xl border border-stone-200 flex flex-col flex-1 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-[#0F0E0C] flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-stone-400" />
                                    Proposed Fixes
                                </h3>
                                {fixes.length > 0 && (
                                    <button onClick={() => setFixes([])} className="text-xs text-stone-400 hover:text-red-500 transition-colors">Clear all</button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {fixes.length === 0 ? (
                                    <div className="text-center py-12 text-stone-300 italic text-sm">
                                        No fixes logged yet.
                                    </div>
                                ) : (
                                    fixes.map((fix) => (
                                        <motion.div
                                            key={fix.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer ${fix.done ? "bg-stone-50 border-stone-100 opacity-60" : "bg-white border-stone-100 hover:border-stone-300"
                                                }`}
                                            onClick={() => toggleFix(fix.id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${fix.done ? "bg-emerald-500 border-emerald-500" : "border-stone-200"
                                                    }`}>
                                                    {fix.done && <CheckCircle2 size={12} className="text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${fix.done ? "line-through text-stone-400" : "text-[#0F0E0C]"}`}>
                                                        {fix.title}
                                                    </p>
                                                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{fix.content}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat Interface */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 flex flex-col shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">Online</div>
                                </div>
                                <div className="text-sm font-semibold text-[#0F0E0C]">Live Session with {selectedAgent.name}</div>
                            </div>
                            <button
                                onClick={clearChat}
                                className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors"
                                title="Reset session"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FCFBF9]">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                                    <div className="w-16 h-16 rounded-3xl bg-white border border-stone-100 flex items-center justify-center shadow-sm text-stone-100" style={{ color: selectedAgent.color }}>
                                        <selectedAgent.icon size={32} />
                                    </div>
                                    <h4 className="text-xl font-bold text-[#0F0E0C]">Inizia la revisione con {selectedAgent.name}</h4>
                                    <p className="text-stone-500 leading-relaxed">Chiedimi di analizzare i colori, cercare bug logici o ottimizzare i testi della tua struttura.</p>
                                    <div className="grid grid-cols-2 gap-3 w-full pt-4">
                                        <button
                                            onClick={() => setInput("Analizza i colori della homepage")}
                                            className="text-xs p-3 rounded-xl border border-stone-100 bg-white hover:border-stone-300 transition-all text-stone-600 text-left"
                                        >
                                            "Analizza i colori..."
                                        </button>
                                        <button
                                            onClick={() => setInput("Verifica integrazione Stripe")}
                                            className="text-xs p-3 rounded-xl border border-stone-100 bg-white hover:border-stone-300 transition-all text-stone-600 text-left"
                                        >
                                            "Verifica Stripe..."
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                messages.map((m, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div className={`max-w-[85%] flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                                            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${m.role === "user" ? "bg-[#0F0E0C] text-white" : "bg-white border border-stone-100"
                                                }`} style={{ color: m.role === "assistant" ? selectedAgent.color : "white" }}>
                                                {m.role === "user" ? <User size={18} /> : <selectedAgent.icon size={18} />}
                                            </div>
                                            <div className={`p-4 rounded-3xl whitespace-pre-wrap leading-relaxed ${m.role === "user"
                                                    ? "bg-[#0F0E0C] text-white rounded-tr-none"
                                                    : "bg-white border border-stone-100 text-[#0F0E0C] shadow-sm rounded-tl-none font-medium"
                                                }`}>
                                                {m.content}
                                                {m.role === "assistant" && (
                                                    <div className="mt-4 pt-4 border-t border-stone-50 flex justify-end">
                                                        <button
                                                            onClick={() => addFix("Nuova Task", "Generata da " + selectedAgent.name)}
                                                            className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-full transition-all"
                                                        >
                                                            <Zap size={10} /> Add to Fixes
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-stone-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                            className="w-2 h-2 rounded-full bg-stone-300"
                                        />
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                            className="w-2 h-2 rounded-full bg-stone-300"
                                        />
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                            className="w-2 h-2 rounded-full bg-stone-300"
                                        />
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-6 bg-white border-t border-stone-100">
                            <form onSubmit={handleSend} className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={`Di cosa vuoi parlare con ${selectedAgent.name}?`}
                                    className="w-full bg-[#F5F2EC]/50 border border-stone-200 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:bg-white transition-all text-[#0F0E0C]"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className={`absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center rounded-xl transition-all ${input.trim() && !isLoading ? "bg-[#0F0E0C] text-white hover:scale-105" : "bg-stone-100 text-stone-300"
                                        }`}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                            <div className="mt-4 flex justify-between items-center px-2">
                                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">QRGate Live Audit System v2.0</p>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-tight">Agent Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReviewAgents;
