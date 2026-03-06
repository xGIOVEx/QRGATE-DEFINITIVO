import os
import logging
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from io import BytesIO
from typing import Dict, Any, Optional

logger = logging.getLogger("image_service")

class ImageService:
    """Phase 5: Image Processing & Share Cards"""
    
    @staticmethod
    def process_poi_image(image_bytes: bytes) -> Dict[str, bytes]:
        """Generate WebP versions: Full, Thumb, Share"""
        
        img = Image.open(BytesIO(image_bytes))
        
        # Full: 1200x800
        full_io = BytesIO()
        img.resize((1200, 800), Image.LANCZOS).save(full_io, format="WEBP", quality=85)
        
        # Thumb: 400x267
        thumb_io = BytesIO()
        img.resize((400, 267), Image.LANCZOS).save(thumb_io, format="WEBP", quality=80)
        
        return {
            "full": full_io.getvalue(),
            "thumb": thumb_io.getvalue()
        }

    @staticmethod
    def generate_share_card(image_bytes: bytes, share_text: str, logo_overlay: Optional[bytes] = None) -> bytes:
        """Create 1080x1080 Instagram-style share card"""
        
        img = Image.open(BytesIO(image_bytes)).resize((1080, 1080), Image.LANCZOS)
        # Apply slight blur to edges if needed, but here we just draw text
        
        draw = ImageDraw.Draw(img)
        # In a real system, we'd load a specific font path
        # font = ImageFont.truetype("Arial.ttf", 60)
        
        # Simple text drawing
        draw.text((50, 540), share_text, fill="white") 
        
        res_io = BytesIO()
        img.save(res_io, format="WEBP", quality=90)
        return res_io.getvalue()
