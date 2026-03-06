// Parser VTT basico per estrarre cue points
// Formato atteso: 
// WEBVTT
// 
// 00:00:01.000 --> 00:00:04.500
// Testo del sottotitolo 1
//
// 00:00:05.000 --> 00:00:08.000
// Testo del sottotitolo 2

export function parseVTT(vttString) {
    if (!vttString) return [];

    const lines = vttString.split('\n');
    const cues = [];
    let currCue = null;

    // RegEx per il match dei timestamp VTT (es: 00:00:01.000 --> 00:00:04.500)
    const timeRegex = /^(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/;

    const timeToSeconds = (h = '00:', m, s, ms) => {
        const hours = h ? parseInt(h.replace(':', ''), 10) : 0;
        return (hours * 3600) + (parseInt(m, 10) * 60) + parseInt(s, 10) + (parseInt(ms, 10) / 1000);
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line === 'WEBVTT') continue;

        const match = line.match(timeRegex);
        if (match) {
            // Se avevamo un cue precedente, pushamolo
            if (currCue && currCue.text) {
                cues.push(currCue);
            }

            const startSec = timeToSeconds(match[1], match[2], match[3], match[4]);
            const endSec = timeToSeconds(match[5], match[6], match[7], match[8]);

            currCue = { startTime: startSec, endTime: endSec, text: '' };
        } else if (currCue) {
            // Accoda il testo (può essere su più righe)
            currCue.text += (currCue.text ? ' ' : '') + line;
        }
    }

    // Push the very last cue
    if (currCue && currCue.text) cues.push(currCue);

    return cues;
}
