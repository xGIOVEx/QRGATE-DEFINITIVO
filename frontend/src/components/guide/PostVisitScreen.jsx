import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Star, Share2, Mic, CheckCircle2 } from 'lucide-react';

export default function PostVisitScreen({ venue, progress, sessionToken, onClose }) {
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        // Trigger confetti on mount
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
                colors: ['#3b82f6', '#10b981', '#f59e0b']
            });
            confetti({
                particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
                colors: ['#3b82f6', '#10b981', '#f59e0b']
            });

            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
    }, []);

    const handleRating = (value) => {
        setRating(value);
        setShowFeedbackForm(true);
        // In un app reale farai già qui una submit "soft" del rating
    };

    const submitFeedback = async () => {
        if (isSubmitted) return;
        try {
            await fetch(`${process.env.REACT_APP_API_URL || ''}/api/v1/visitor/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionToken, rating, text: feedbackText })
            });
            setIsSubmitted(true);
        } catch (e) {
            console.warn("Submit fallback");
            setIsSubmitted(true);
        }
    };

    const statCount = progress?.completedPois?.length || 0;
    const questionsCount = 5 - (progress?.questionsRemaining || 5); // Fallback calc for demo
    const durationMin = Math.round((progress?.secondsListened || 2400) / 60);

    return (
        <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col items-center justify-start overflow-y-auto px-6 py-12 animate-in fade-in zoom-in-95 duration-700">

            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <span className="text-4xl">🎉</span>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-2 text-center">Visita completata!</h1>
            <p className="text-slate-500 font-medium mb-10 text-center">{venue?.name}</p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-12">
                <div className="bg-white p-5 file flex flex-col items-center rounded-3xl shadow-sm border border-slate-100">
                    <span className="text-3xl font-black text-blue-600 mb-1">{statCount}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Opere<br />Scoperte</span>
                </div>
                <div className="bg-white p-5 flex flex-col items-center rounded-3xl shadow-sm border border-slate-100">
                    <span className="text-3xl font-black text-emerald-500 mb-1">{durationMin}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Minuti<br />di ascolto</span>
                </div>
                <div className="bg-white p-5 flex flex-col items-center rounded-3xl shadow-sm border border-slate-100 col-span-2">
                    <div className="flex items-center">
                        <span className="text-3xl font-black text-purple-600 mr-3">{questionsCount}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">
                            Domande fatte<br />all'Intelligenza Artificiale
                        </span>
                    </div>
                </div>
            </div>

            {/* Rating Area */}
            {!isSubmitted ? (
                <div className="w-full max-w-sm flex flex-col items-center mb-10 transition-all">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Come valuti la tua esperienza?</h3>
                    <div className="flex space-x-2 mb-6">
                        {[1, 2, 3, 4, 5].map((val) => (
                            <Star
                                key={val}
                                className={`w-12 h-12 cursor-pointer transition-transform ${(hoveredStar || rating) >= val
                                        ? 'fill-yellow-400 text-yellow-500 scale-110'
                                        : 'fill-slate-200 text-slate-300'
                                    }`}
                                onMouseEnter={() => setHoveredStar(val)}
                                onMouseLeave={() => setHoveredStar(0)}
                                onClick={() => handleRating(val)}
                            />
                        ))}
                    </div>

                    {showFeedbackForm && (
                        <div className="w-full animate-in slide-in-from-top-4 duration-500">
                            <textarea
                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 resize-none shadow-sm"
                                rows="3"
                                placeholder="Vuoi aggiungere un commento sulla visita?"
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                            />
                            <div className="flex space-x-3">
                                <button className="flex items-center justify-center p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors">
                                    <Mic className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={submitFeedback}
                                    className="flex-grow bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-colors"
                                >
                                    Invia Feedback
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full max-w-sm flex flex-col items-center mb-10 animate-in fade-in">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Grazie del feedback!</h3>
                    <p className="text-slate-500 text-center">La tua opinione ci aiuta a migliorare.</p>
                </div>
            )}

            {/* Footer Share */}
            <div className="w-full max-w-sm mt-auto">
                <button className="w-full flex items-center justify-center bg-blue-50 text-blue-700 font-bold py-4 px-4 rounded-2xl hover:bg-blue-100 transition-colors">
                    <Share2 className="w-5 h-5 mr-3" /> Condividi le tue scoperte
                </button>
                <p className="text-center text-slate-400 text-sm mt-6 mb-4">
                    Tornerai vero? La tua guida ti aspetta.
                </p>
            </div>

        </div>
    );
}
