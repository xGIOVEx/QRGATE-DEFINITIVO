import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, RotateCw, Share, Mic, ChevronDown } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { parseVTT } from '@/utils/vttParser';

export default function AudioPlayerView({ poi, allPois, venue, progress, updateProgress, onClose, onNextPoi, openAIChat }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(poi?.duration || 0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showShareCard, setShowShareCard] = useState(false);
    const [shareMomentTriggered, setShareMomentTriggered] = useState(false);

    // Karaoke Sync
    const [cues, setCues] = useState([]);
    const [activeCueText, setActiveCueText] = useState("");

    // Per POI segreti
    const [isSecretLocked, setIsSecretLocked] = useState(poi?.is_secret && !progress?.unlockedSecrets?.includes(poi.id));
    const [secretCountdown, setSecretCountdown] = useState(15);

    const audioRef = useRef(null);

    useEffect(() => {
        if (poi?.vtt_transcript) {
            setCues(parseVTT(poi.vtt_transcript));
        } else if (poi?.script) {
            const words = poi.script.split(' ');
            const mockCues = [];
            const wordsPerCue = 6;
            for (let i = 0; i < words.length; i += wordsPerCue) {
                const start = (i / wordsPerCue) * 3;
                mockCues.push({ startTime: start, endTime: start + 3, text: words.slice(i, i + wordsPerCue).join(' ') });
            }
            setCues(mockCues);
        } else {
            setCues([{ startTime: 0, endTime: 999, text: "Ascolta la storia di quest'opera..." }]);
        }
    }, [poi]);

    useEffect(() => {
        // Media Session API Support
        if ('mediaSession' in navigator && poi) {
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: poi.name,
                artist: venue?.name || "QRGate",
                album: 'QRGate Stories',
                artwork: [{ src: poi.image_url || '', sizes: '512x512', type: 'image/jpeg' }]
            });

            navigator.mediaSession.setActionHandler('play', playAudio);
            navigator.mediaSession.setActionHandler('pause', pauseAudio);
            navigator.mediaSession.setActionHandler('seekbackward', skip(-15));
            navigator.mediaSession.setActionHandler('seekforward', skip(15));
        }
    }, [poi]);

    // Audio Events
    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);

        // Karaoke Sync Update
        const activeItem = cues.find(c => time >= c.startTime && time <= c.endTime);
        if (activeItem && activeItem.text !== activeCueText) {
            setActiveCueText(activeItem.text);
        }

        // Share Moment Trigger
        const shareSec = poi?.share_moment_sec || 30;
        if (time >= shareSec && !shareMomentTriggered) {
            setShowShareCard(true);
            setShareMomentTriggered(true);
        }

        // Progress update (80% completion = completed)
        const currentDur = audioRef.current.duration || poi.duration;
        if (time / currentDur > 0.8 && !progress?.completedPois?.includes(poi.id)) {
            updateProgress({ completedPois: [...(progress?.completedPois || []), poi.id] });
            trackEvent('poi_audio_completed', { guide_id: allPois?.[0]?.guide_id || 'unknown', poi_id: poi.id, completion_rate: Math.round((time / currentDur) * 100) });
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        // Find next poi
        const currentIndex = allPois?.findIndex(p => p.id === poi.id);
        if (currentIndex !== -1 && currentIndex < allPois?.length - 1) {
            onNextPoi(allPois[currentIndex + 1]);
        } else {
            onClose(); // Torna alla mappa
        }
    };

    const playAudio = async () => {
        if (!audioRef.current || isSecretLocked) return;
        if (progress?.settings?.vibration) window.navigator.vibrate?.(10);
        try {
            await audioRef.current.play();
            if (!isPlaying) {
                setIsPlaying(true);
                trackEvent('poi_audio_started', { guide_id: allPois?.[0]?.guide_id || 'unknown', poi_id: poi.id });
            }
        } catch (e) { console.error("Play prevented", e); }
    };

    const pauseAudio = () => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        setIsPlaying(false);
    };

    const togglePlay = () => isPlaying ? pauseAudio() : playAudio();

    const skip = (seconds) => () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    };

    const toggleRate = () => {
        const rates = [0.75, 1, 1.25, 1.5];
        const newIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        setPlaybackRate(rates[newIdx]);
        if (audioRef.current) audioRef.current.playbackRate = rates[newIdx];
    };

    const shareStory = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Ascolta ${poi.name} su QRGate Stories`,
                    text: `Ho appena scoperto ${poi.name} a ${venue?.name}!`,
                    url: window.location.href, // Sarebbe il deep link
                });
                trackEvent('guide_shared', { guide_id: allPois?.[0]?.guide_id || 'unknown', method: 'navigator.share' });
            } catch (err) { console.error("Share failed", err); }
        }
    };

    // Logica Countdown Segreto
    useEffect(() => {
        let interval;
        if (isSecretLocked) {
            interval = setInterval(() => {
                setSecretCountdown(c => {
                    if (c <= 1) {
                        setIsSecretLocked(false);
                        updateProgress({ unlockedSecrets: [...(progress?.unlockedSecrets || []), poi.id] });
                        clearInterval(interval);
                        setTimeout(() => playAudio(), 500);
                        return 0;
                    }
                    return c - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isSecretLocked]);

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col font-sans">
            {/* Background Image Layer */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000"
                style={{
                    backgroundImage: `url('${poi?.image_url || ''}')`,
                    transform: isPlaying ? 'scale(1.03)' : 'scale(1)'
                }}
            />

            {/* Dark Overlay Gradient (Bottom->Top) */}
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/80 to-black/10" />

            {/* Top Header Controls */}
            <div className="relative z-20 flex justify-between items-center p-4 pt-safe-offset-4">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center text-white">
                    <ChevronDown className="w-6 h-6" />
                </button>
                <span className="text-xs uppercase tracking-widest font-bold text-white/70 shadow-sm">{venue?.name}</span>
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center text-white">
                    ⚙️
                </button>
            </div>

            <div className="relative z-20 flex-grow flex flex-col justify-end px-6 pb-6">
                {/* Nome Opera e Sottotitoli */}
                <div className="mb-8 w-full">
                    <h2 className="text-4xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg">{poi?.name}</h2>

                    {/* Karaoke Text Area */}
                    <div className="h-[72px] relative flex items-center fade-edges-y">
                        <p key={activeCueText} className="text-xl text-white font-medium leading-relaxed drop-shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
                            {activeCueText}
                        </p>
                    </div>
                </div>

                {/* Controlli Riproduzione */}
                <div className="w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 pb-safe-offset-6">
                    <div className="flex items-center space-x-3 text-xs font-mono text-slate-400 mb-6 font-semibold">
                        <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}</span>
                        <div className="flex-grow h-1.5 bg-white/20 rounded-full overflow-hidden relative"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const val = (e.clientX - rect.left) / rect.width;
                                if (audioRef.current) audioRef.current.currentTime = val * duration;
                            }}>
                            <div className="absolute top-0 left-0 h-full bg-emerald-400 pointer-events-none transition-all duration-100 ease-linear" style={{ width: `${(currentTime ? currentTime / duration : 0) * 100}%` }}></div>
                        </div>
                        <span>-{Math.floor((duration - currentTime) / 60)}:{(Math.floor(duration - currentTime) % 60).toString().padStart(2, '0')}</span>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <button onClick={toggleRate} className="text-white/60 font-bold w-12 text-center text-sm">{playbackRate}x</button>

                        <div className="flex items-center space-x-6">
                            <button onClick={skip(-15)} className="text-white hover:text-white/80 transition-colors"><RotateCcw className="w-8 h-8" /></button>
                            <button
                                onClick={togglePlay}
                                className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center transform active:scale-90 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            >
                                {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1" />}
                            </button>
                            <button onClick={skip(15)} className="text-white hover:text-white/80 transition-colors"><RotateCw className="w-8 h-8" /></button>
                        </div>

                        <button onClick={(e) => {
                            e.stopPropagation();
                            trackEvent('guide_ai_chat_used', { guide_id: allPois?.[0]?.guide_id || 'unknown', poi_id: poi?.id });
                            openAIChat();
                        }} className="text-blue-400 font-bold flex flex-col items-center">
                            <Mic className="w-6 h-6 mb-1" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Secret Overlay se IsLocked */}
            {isSecretLocked && (
                <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center">
                    <h2 className="text-5xl mb-6">🔒</h2>
                    <h3 className="text-2xl font-bold text-white mb-2">Segreto Nascosto</h3>
                    <p className="text-white/80 mb-8">Rimani in questa zona per sbloccare la storia esclusiva.</p>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="absolute w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                            <circle cx="48" cy="48" r="45" fill="none" stroke="#EAB308" strokeWidth="6"
                                strokeDasharray="283" strokeDashoffset={283 - (15 - secretCountdown) / 15 * 283}
                                className="transition-all duration-1000 ease-linear"
                            />
                        </svg>
                        <span className="text-3xl font-mono text-yellow-400 font-bold">{secretCountdown}s</span>
                    </div>
                </div>
            )}

            {/* Share Moment Card Bottom Sheet */}
            <div className={`absolute inset-x-0 bottom-0 z-50 p-4 transition-transform duration-500 will-change-transform ${showShareCard ? 'translate-y-0' : 'translate-y-[150%]'}`}>
                <div className="bg-slate-900 shadow-2xl rounded-3xl overflow-hidden border border-white/10">
                    <div className="w-full h-40 bg-cover bg-center relative" style={{ backgroundImage: `url('${poi?.image_url || ''}')` }}>
                        <button onClick={() => setShowShareCard(false)} className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white/70 backdrop-blur">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-1">Un fatto incredibile!</h3>
                        <p className="text-slate-400 text-sm mb-6 line-clamp-2">Sapevi che questa è una delle opere più misteriose della collezione?</p>
                        <button onClick={shareStory} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                            <Share className="w-5 h-5 mr-2" /> Condividi questa Storia
                        </button>
                    </div>
                </div>
            </div>

            {/* Elemento Audio Nascosto */}
            {poi?.audio_url_128k && (
                <audio
                    ref={audioRef}
                    src={poi.audio_url_128k}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    preload="auto"
                />
            )}
        </div>
    );
}
