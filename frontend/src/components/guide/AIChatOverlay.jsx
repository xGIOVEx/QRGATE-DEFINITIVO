import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, MessageSquare, PlayCircle, Loader2 } from 'lucide-react';

export default function AIChatOverlay({ isOpen, onClose, sessionToken, venue, activePoi }) {
    const [isRecording, setIsRecording] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', text: `Ciao! Sono la tua guida interattiva per ${venue?.name}. Vuoi chiedermi qualcosa su ${activePoi ? activePoi.name : 'questo luogo'}?` }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [questionsRemaining, setQuestionsRemaining] = useState(5);
    const [showUpsell, setShowUpsell] = useState(false);

    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const responseAudioRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll al nuovo messaggio
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startRecording = async () => {
        if (questionsRemaining <= 0) {
            setShowUpsell(true);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = e => {
                if (e.data.size > 0) audioChunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = processAudio;
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic error:", err);
            // Fallback a text o mostrami un alert in un'app reale
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            // Ferma i track del microfono
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const processAudio = async () => {
        setIsLoading(true);
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result.split(',')[1];

            // Aggiungi un placeholder per the user message (Whisper dal backend ci darà il text reale)
            setMessages(p => [...p, { role: 'user', text: "🎤 Audio inviato...", isAudio: true }]);

            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/v1/visitor/conversation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sessionToken,
                        question_audio_base64: base64Audio,
                        poi_id: activePoi?.id,
                        language: "it" // verrebbe dal JWT locale
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    // Update remaining questions
                    setQuestionsRemaining(data.questions_remaining);

                    // Aggiorna la trascrizione utente (reale) se fornita, per MVP lascio il placeholder

                    // Aggiungi AI Message
                    setMessages(p => [...p, {
                        role: 'ai',
                        text: data.answer_text,
                        audioUrl: data.answer_audio_url
                    }]);

                    // Auto play
                    if (data.answer_audio_url && responseAudioRef.current) {
                        responseAudioRef.current.src = data.answer_audio_url;
                        responseAudioRef.current.play();
                        // Stop background music temporarily in a real app (could use global state)
                    }

                    if (data.questions_remaining === 0) {
                        setTimeout(() => setShowUpsell(true), 5000);
                    }
                } else {
                    // Mock Logic for MVP UI Testing without backend
                    mockAIResponse();
                }
            } catch (e) {
                mockAIResponse(); // Fallback for pure UI demo
            } finally {
                setIsLoading(false);
            }
        };
    };

    // Mock function to show UI workflow without backend
    const mockAIResponse = () => {
        setTimeout(() => {
            setQuestionsRemaining(q => q - 1);
            setMessages(p => {
                const newMsgs = [...p];
                newMsgs[newMsgs.length - 1].text = "Chi era l'autore?"; // Mock whisper
                return [...newMsgs, { role: 'ai', text: "L'autore dell'opera è ancora dibattuto tra gli storici, ma molti attribuiscono questo capolavoro a un pittore della scuola veneziana del XVI secolo.", audioUrl: null }];
            });
            setIsLoading(false);
            if (questionsRemaining - 1 === 0) setTimeout(() => setShowUpsell(true), 3000);
        }, 1500);
    };

    const getCounterColor = () => {
        if (questionsRemaining > 5) return 'text-green-500 bg-green-500/10 border-green-500/20';
        if (questionsRemaining >= 3) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        return 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse';
    };

    return (
        <div className={`absolute inset-0 bg-slate-900 z-[60] flex flex-col transition-transform duration-500 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/90 backdrop-blur z-10 pt-safe-offset-4">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                        <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white leading-tight">Guida Interattiva</h3>
                        <p className="text-xs text-blue-400 font-medium">In ascolto...</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full border text-xs font-bold font-mono ${getCounterColor()}`}>
                        💬 {questionsRemaining} rimaste
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 pb-32">
                {messages.map((m, i) => (
                    <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-md ${m.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-slate-800 text-slate-200 border border-white/5 rounded-bl-sm'
                            }`}>
                            <p className="text-[15px] leading-relaxed relative z-10">{m.text}</p>
                            {m.audioUrl && (
                                <button
                                    className="mt-3 flex items-center text-sm text-blue-400 font-semibold bg-blue-900/30 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                                    onClick={() => {
                                        if (responseAudioRef.current) {
                                            responseAudioRef.current.src = m.audioUrl;
                                            responseAudioRef.current.play();
                                        }
                                    }}
                                >
                                    <PlayCircle className="w-4 h-4 mr-2" /> Riascolta
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="bg-slate-800 border border-white/5 rounded-2xl rounded-bl-sm p-4 flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            <span className="text-sm text-slate-400">Elaborazione in corso...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* PTT Controls Area */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pt-12 pb-8 px-6 pb-safe-offset-8 flex justify-center pointer-events-none">
                <div className="pointer-events-auto flex flex-col items-center relative">

                    {/* Pulsating waves when recording */}
                    {isRecording && (
                        <>
                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20 scale-150"></div>
                            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-40 scale-125" style={{ animationDelay: '0.2s' }}></div>
                        </>
                    )}

                    <button
                        onPointerDown={startRecording}
                        onPointerUp={stopRecording}
                        onPointerLeave={stopRecording}
                        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-4 ${isRecording
                                ? 'bg-blue-500 border-blue-400 scale-110'
                                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                            }`}
                    >
                        <Mic className={`w-10 h-10 ${isRecording ? 'text-white' : 'text-blue-500'}`} />
                    </button>
                    <p className="mt-4 text-xs font-bold text-slate-400 tracking-wider uppercase">Tieni premuto per parlare</p>
                </div>
            </div>

            {/* Audios */}
            <audio ref={responseAudioRef} className="hidden" />

            {/* Upsell Modal */}
            {showUpsell && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-6">
                    <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl animate-in slide-in-from-bottom-10">
                        <div className="text-6xl mb-4">🌟</div>
                        <h2 className="text-2xl font-bold text-white mb-2 leading-tight">Sei proprio curioso!</h2>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            Hai fatto domande fantastiche su questa visita. Per continuare a esplorare ogni segreto e dialogare senza limiti con l'IA...
                        </p>
                        <button
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl mb-3 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95"
                            onClick={() => {
                                // In a real app we would navigate to a Stripe link using session data
                                window.location.href = `https://buy.stripe.com/test_upgrade_link?client_reference_id=${sessionToken}`;
                            }}
                        >
                            Continua senza limiti — EUR 1,50
                        </button>
                        <button
                            className="block w-full py-3 text-slate-500 font-semibold hover:text-white transition-colors"
                            onClick={() => setShowUpsell(false)}
                        >
                            No grazie, ho finito
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
