"""
Dynamic Pricing Service for QRGate
- Opt-in per venue: il venue sceglie se attivare il pricing dinamico
- Il prezzo sale linearmente quando la disponibilità scende sotto threshold_pct
- Arrotondamento al 50 cents più vicino per accettabilità psicologica
- Pure function: nessuna dipendenza esterna, 100% testabile
"""
import math
from typing import Dict, Any


def calculate_dynamic_price(
    base_price_cents: int,
    capacity: int,
    booked: int,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calcola il prezzo dinamico di un biglietto in base alla disponibilità.
    
    Args:
        base_price_cents: Prezzo base in centesimi (es. 1000 = €10.00)
        capacity: Capienza totale dello slot/giorno
        booked: Posti già prenotati
        config: {
            "enabled": bool,
            "threshold_pct": int,  # % di posti rimasti che triggera il surge (default 20)
            "max_increase_pct": int  # massimo aumento in % (default 30)
        }
    
    Returns:
        {
            "final_price_cents": int,
            "base_price_cents": int,
            "surge_pct": int,        # percentuale di aumento applicata (0-max)
            "is_surge_active": bool,
            "remaining_pct": int,     # % di posti rimasti
        }
    """
    result = {
        "final_price_cents": base_price_cents,
        "base_price_cents": base_price_cents,
        "surge_pct": 0,
        "is_surge_active": False,
        "remaining_pct": 100,
    }
    
    # Guard: disabled or invalid input
    if not config.get("enabled", False):
        return result
    
    if capacity <= 0 or base_price_cents <= 0:
        return result
    
    booked = max(0, min(booked, capacity))  # clamp
    remaining = capacity - booked
    remaining_pct = round((remaining / capacity) * 100)
    result["remaining_pct"] = remaining_pct
    
    threshold_pct = config.get("threshold_pct", 20)
    max_increase_pct = config.get("max_increase_pct", 30)
    
    # Clamp config values to safe ranges
    threshold_pct = max(5, min(threshold_pct, 50))
    max_increase_pct = max(5, min(max_increase_pct, 100))
    
    # Surge only activates when remaining % < threshold %
    if remaining_pct >= threshold_pct:
        return result
    
    # Linear interpolation: at threshold → 0% surge, at 0% remaining → max_increase_pct
    # surge_factor = (threshold_pct - remaining_pct) / threshold_pct
    surge_factor = (threshold_pct - remaining_pct) / threshold_pct
    surge_pct = round(surge_factor * max_increase_pct)
    
    # Calculate new price
    increase_cents = round(base_price_cents * surge_pct / 100)
    final_cents = base_price_cents + increase_cents
    
    # Round to nearest 50 cents (psychologically more acceptable)
    final_cents = _round_to_nearest_50(final_cents)
    
    # Ensure final is at least base
    final_cents = max(final_cents, base_price_cents)
    
    # Recalculate actual surge_pct after rounding
    actual_surge_pct = round(((final_cents - base_price_cents) / base_price_cents) * 100) if base_price_cents > 0 else 0
    
    result["final_price_cents"] = final_cents
    result["surge_pct"] = actual_surge_pct
    result["is_surge_active"] = actual_surge_pct > 0
    
    return result


def _round_to_nearest_50(cents: int) -> int:
    """Round to nearest 50 cents (e.g. 1237 → 1250, 1224 → 1200)."""
    return round(cents / 50) * 50
