import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Code, Copy, Check, Layout, Pointer, MessageSquare,
    ExternalLink, Smartphone, Monitor, Info
} from 'lucide-react';
import { toast } from 'sonner';

const WidgetGenerator = () => {
    const [copied, setCopied] = useState(false);
    const [widgetType, setWidgetType] = useState('button'); // 'button', 'banner', 'modal'
    const [color, setColor] = useState('#2563eb');
    const [position, setPosition] = useState('bottom-right');

    const venueSlug = "vatican-museums"; // Mock slug

    const generateCode = () => {
        const scriptUrl = "https://cdn.qrgate.com/widget.v1.js";

        if (widgetType === 'button') {
            return `<script src="${scriptUrl}"></script>\n<script>\n  QRGate.init({\n    slug: "${venueSlug}",\n    type: "floating-button",\n    color: "${color}",\n    position: "${position}",\n    text: "Acquista Biglietti"\n  });\n</script>`;
        } else if (widgetType === 'banner') {
            return `<div id="qrgate-banner"></div>\n<script src="${scriptUrl}"></script>\n<script>\n  QRGate.renderBanner("#qrgate-banner", { slug: "${venueSlug}" });\n</script>`;
        }
        return `<!-- QRGate Modal Script -->\n<script src="${scriptUrl}"></script>`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateCode());
        setCopied(true);
        toast.success("Codice copiato negli appunti!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">Widget Generator</h1>
                <p className="text-slate-500 text-lg font-medium">Trasforma il tuo sito web in una macchina da vendita. Copia e incolla il codice qui sotto nel tuo sito per iniziare a vendere biglietti istantaneamente.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
                {/* Configuration */}
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                        <h3 className="text-slate-900 font-black mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Layout className="w-4 h-4 text-blue-600" />
                            1. Scegli il Formato
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setWidgetType('button')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${widgetType === 'button' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                <Pointer className="w-6 h-6" />
                                <span className="font-bold text-sm">Bottone Fluttuante</span>
                            </button>
                            <button
                                onClick={() => setWidgetType('banner')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${widgetType === 'banner' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                <Smartphone className="w-6 h-6" />
                                <span className="font-bold text-sm">Banner Inline</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                        <h3 className="text-slate-900 font-black mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Code className="w-4 h-4 text-blue-600" />
                            2. Personalizzazione
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Colore Brand</label>
                                <div className="flex gap-3">
                                    {['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#000000'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setColor(c)}
                                            className={`w-10 h-10 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {widgetType === 'button' && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Posizione</label>
                                    <select
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold"
                                    >
                                        <option value="bottom-right">In basso a destra</option>
                                        <option value="bottom-left">In basso a sinistra</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Output & Preview */}
                <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white/50 font-black uppercase tracking-widest text-[10px]">Codice da Copiare</h3>
                            <button
                                onClick={handleAction}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>

                        <pre className="text-blue-300 font-mono text-sm overflow-x-auto h-48 scrollbar-thin scrollbar-thumb-white/10">
                            {generateCode()}
                        </pre>

                        <button
                            onClick={handleCopy}
                            className={`w-full mt-6 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900 hover:scale-[1.02]'}`}
                        >
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            {copied ? "Copiato!" : "Copia Codice HTML"}
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border-2 border-dashed border-slate-200">
                        <h3 className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-8 text-center">Anteprima Live</h3>
                        <div className="relative h-64 border-2 border-slate-50 rounded-2xl flex items-center justify-center overflow-hidden bg-slate-50/50">
                            {widgetType === 'button' && (
                                <motion.button
                                    className={`absolute ${position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'} px-6 py-4 rounded-full text-white font-black shadow-xl flex items-center gap-2`}
                                    style={{ backgroundColor: color }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <Pointer className="w-5 h-5" />
                                    Acquista Biglietti
                                </motion.button>
                            )}
                            {widgetType === 'banner' && (
                                <div className="w-full max-w-sm bg-white p-4 mx-4 rounded-xl shadow-md border-t-4" style={{ borderColor: color }}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-serif font-black text-slate-800">Vatican Museums</span>
                                        <button className="px-4 py-2 rounded-lg text-white text-xs font-black uppercase" style={{ backgroundColor: color }}>
                                            Tickets
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="text-slate-300 font-bold select-none">SIMULAZIONE SITO WEB</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WidgetGenerator;
