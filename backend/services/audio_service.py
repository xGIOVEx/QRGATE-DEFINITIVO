import os
import httpx
import logging
import asyncio
from typing import Dict, Any, Optional

logger = logging.getLogger("audio_service")

VOICE_MAPPING = {
    "standard": {
        "it": "VOICE_ID_IT_STANDARD", "fr": "VOICE_ID_FR_STANDARD", "de": "VOICE_ID_DE_STANDARD",
        "en": "VOICE_ID_EN_STANDARD", "es": "VOICE_ID_ES_STANDARD", "pt": "VOICE_ID_PT_STANDARD",
        "nl": "VOICE_ID_NL_STANDARD", "ja": "VOICE_ID_JA_STANDARD", "zh": "VOICE_ID_ZH_STANDARD",
    },
    "kids": {
        "it": "VOICE_ID_IT_KIDS", "fr": "VOICE_ID_FR_KIDS", "en": "VOICE_ID_EN_KIDS",
    }
}

BG_MUSIC = {
    "museum": "strings_modern_ambient.mp3",
    "church": "organ_soft_ambient.mp3",
    "monument": "wind_epic_ambient.mp3",
    "palace": "baroque_soft_ambient.mp3",
    "archaeological": "ancient_wind_ambient.mp3",
    "historic_house": "piano_intimate_ambient.mp3",
    "park": "nature_ambient.mp3"
}

BG_VOL = { "standard": 0.07, "kids": 0.15, "expert": 0.04, "quick": 0.07, "mystery": 0.12 }

class AudioService:
    @staticmethod
    async def generate_audio(
        script: str, lang: str, tour_type: str, venue_type: str,
        poi_index: int, voice_clone_id: Optional[str] = None, is_demo: bool = False
    ) -> Optional[bytes]:
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        if not api_key: return None
        
        voice_id = voice_clone_id if voice_clone_id and tour_type != 'kids' else \
                   VOICE_MAPPING.get(tour_type, VOICE_MAPPING['standard']).get(lang, "VOICE_ID_EN_STANDARD")
        
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
        headers = { "Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": api_key }
        payload = {
            "text": script, "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.75 if tour_type != 'kids' else 0.65,
                "similarity_boost": 0.80 if tour_type != 'kids' else 0.75,
                "style": 0.20 if tour_type != 'kids' else 0.45,
                "use_speaker_boost": True
            }
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                return await AudioService.mix_audio(resp.content, venue_type, tour_type, poi_index, is_demo)
        except Exception as e:
            logger.error(f"TTS/Mixing Error: {e}")
            return None

    @staticmethod
    async def mix_audio(speech_bytes: bytes, venue_type: str, tour_type: str, poi_index: int, is_demo: bool = False) -> bytes:
        import tempfile
        bg_file = BG_MUSIC.get(venue_type, "strings_modern_ambient.mp3")
        bg_path = f"/Users/giovannimanenti/Downloads/QRGATE-main/backend/assets/bg_music/{bg_file}"
        wm_path = "/Users/giovannimanenti/Downloads/QRGATE-main/backend/assets/watermark_demo.mp3"
        bg_vol = BG_VOL.get(tour_type, 0.07)
        delay = 1500 if poi_index == 1 else 500
        
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as speech_tmp:
            speech_tmp.write(speech_bytes)
            s_path = speech_tmp.name
        o_path = s_path.replace(".mp3", "_mixed.mp3")
        
        f_str = f"[1:a]volume={bg_vol}[bg]; [bg]adelay={delay}|{delay}[bgd]; [0:a][bgd]amix=inputs=2:duration=first[m];"
        if is_demo:
            f_str += " [2:a]aloop=loop=-1:size=30*44100[wm]; [m][wm]amix=inputs=2:duration=first[out]"
            inputs = ["-i", s_path, "-i", bg_path, "-i", wm_path]
        else:
            f_str += " [m]loudnorm=I=-16:TP=-1.5:LRA=11[out]"
            inputs = ["-i", s_path, "-i", bg_path]

        cmd = ["ffmpeg", "-y"] + inputs + ["-filter_complex", f_str, "-map", "[out]", "-ar", "44100", "-ac", "2", o_path]
        try:
            p = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            await p.communicate()
            with open(o_path, "rb") as f: res = f.read()
            os.remove(s_path); os.remove(o_path)
            return res
        except Exception: return speech_bytes
 Riverside
