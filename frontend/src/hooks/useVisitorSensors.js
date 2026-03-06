import { useEffect, useRef } from 'react';

export function useVisitorSensors({ onPause, onPlay, onNext, onPrev, onOpenChat }) {
    const recognitionRef = useRef(null);

    useEffect(() => {
        // 1. Auricolari scollegati -> Auto-pausa (MediaDevices change)
        const handleDeviceChange = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasAudioOutput = devices.some(d => d.kind === 'audiooutput' && (d.label.toLowerCase().includes('head') || d.label.toLowerCase().includes('pods')));
                // Se non troviamo dispositivi bluetooth/cuffie e prima c'erano, mettiamo in pausa.
                // Nella realtà è complesso via Web API standard senza polling, un approssimazione:
                console.debug("Devices changed, triggering safe pause");
                onPause?.();
            } catch (e) { }
        };
        navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

        // 2. Down-face auto-pausa (DeviceOrientation)
        const handleOrientation = (e) => {
            // e.beta è la rotazione avanti/indietro, -180 a 180. -90 è telefono a faccia in giù piatto.
            if (e.beta && e.beta < -45 && e.beta > -135) {
                onPause?.(); // Telefono capovolto verso il basso
            }
        };
        // Necessita di permessi su iOS 13+
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // Generalmente deve essere chiamato a seguito di un tap
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }

        // 3. Web Speech API (Hands-Free Voice Commands)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            // Ottimizzazione: disabilitato il continuous background per non bruciare la batteria
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'it-IT';

            recognitionRef.current.onresult = (e) => {
                const command = e.results[0][0].transcript.trim().toLowerCase();

                if (command.includes('pausa') || command.includes('stop') || command.includes('ferma')) {
                    onPause?.();
                } else if (command.includes('play') || command.includes('avvia') || command.includes('riprendi')) {
                    onPlay?.();
                } else if (command.includes('avanti') || command.includes('next') || command.includes('successivo')) {
                    onNext?.();
                } else if (command.includes('indietro') || command.includes('precedente')) {
                    onPrev?.();
                } else if (command.includes('hey qrgate') || command.includes('qr gate')) {
                    onPause?.(); onOpenChat?.();
                }
            };

            // Auto-riavvio in caso di stop silenzioso (tipico WebSpeech) a meno che non siamo in background
            recognitionRef.current.onend = () => {
                if (document.visibilityState === 'visible') {
                    try { recognitionRef.current.start(); } catch (e) { }
                }
            }

            const handleVisibility = () => {
                if (document.visibilityState === 'hidden') {
                    try { recognitionRef.current.stop(); } catch (e) { }
                } else {
                    try { recognitionRef.current.start(); } catch (e) { }
                }
            }
            document.addEventListener('visibilitychange', handleVisibility);

            try { recognitionRef.current.start(); } catch (err) { }
        }

        return () => {
            navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
            window.removeEventListener('deviceorientation', handleOrientation);
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        };
    }, [onPause, onPlay, onNext, onPrev, onOpenChat]);

    // Restituiamo una funzione per "svegliare" i permessi che richiedono gesture dell'utente (iOS)
    const requireSensorPermissions = async () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const response = await DeviceOrientationEvent.requestPermission();
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', () => { }); // Register
                }
            } catch (err) { }
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) { }
        }
    };

    return { requireSensorPermissions };
}
