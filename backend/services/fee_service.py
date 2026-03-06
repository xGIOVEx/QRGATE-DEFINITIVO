import math
from typing import List, Dict, Any, Optional

def calculate_order_fees(order: Dict[str, Any]) -> Dict[str, Any]:
    """
    QRGate Fee Structure (verified against QA protocol test cases):
    
    TICKET FEE:
    - Standard:    EUR 0.49 fixed + 6% variable
    - With slot:   Standard fee + EUR 0.15 surcharge (for time-slot management)
    
    AUDIO GUIDE FEE:
    - Standard:    35% of guide price
    - Premium:     40% of guide price  
    - Extra lang:  EUR 0.30 per language per person (beyond base_languages)
    
    AI QUESTIONS:
    - Included = floor(guide_price * 0.50 / 0.20)
    
    Notes:
    - Guides purchased without tickets (standalone, e.g. legacy access) 
      do NOT generate a ticket fee.
    - If tickets are 0-price placeholders, skip their ticket_fee.
    """
    tickets = order.get("tickets", [])
    audio_guide = order.get("audio_guide")
    
    tickets_fee = 0.0
    slot_fee = 0.0
    total_ticket_price = 0.0
    
    for ticket in tickets:
        price = float(ticket.get("price", 0.0))
        # Skip zero-price placeholder tickets (used in guide-only orders)
        if price <= 0:
            continue
        total_ticket_price += price
        
        # Standard fee
        t_fee = 0.49 + (price * 0.06)
        
        # Slot surcharge: +0.15 EUR flat per slot-booked ticket
        if ticket.get("has_slot_booking", False):
            s_extra = 0.15
            t_fee += s_extra
            slot_fee += s_extra
            
        tickets_fee += t_fee
            
    guide_fee = 0.0
    extra_lang_fee = 0.0
    ai_questions_included = 0
    total_guide_price = 0.0
    
    if audio_guide:
        guide_price = float(audio_guide.get("price", 0.0))
        is_premium = audio_guide.get("is_premium_tour", False)
        languages = audio_guide.get("languages", [])
        base_languages = audio_guide.get("base_languages", ["it", "en"])
        
        # Quantity = number of (real) tickets; default 1 if guide-only order
        real_tickets = [t for t in tickets if float(t.get("price", 0)) > 0]
        guide_qty = len(real_tickets) if real_tickets else 1
        total_guide_price = guide_price * guide_qty
        
        # Base commission: 40% if premium, else 35%
        commission_rate = 0.40 if is_premium else 0.35
        guide_fee = (guide_price * commission_rate) * guide_qty
        
        # Extra languages fee: EUR 0.30 per extra language per person
        extra_langs = set(languages) - set(base_languages)
        num_extra_langs = len(extra_langs)
        if num_extra_langs > 0:
            extra_lang_fee = (0.30 * num_extra_langs) * guide_qty
            
        # AI questions cap
        ai_questions_included = math.floor((guide_price * 0.50) / 0.20)
        
    qrgate_total_fee = tickets_fee + guide_fee + extra_lang_fee
    gross_total = total_ticket_price + total_guide_price
    venue_net_total = gross_total - qrgate_total_fee
    
    return {
        "tickets_fee": round(tickets_fee, 2),
        "guide_fee": round(guide_fee, 2),
        "extra_lang_fee": round(extra_lang_fee, 2),
        "slot_fee": round(slot_fee, 2),
        "qrgate_total_fee": round(qrgate_total_fee, 2),
        "venue_net_total": round(venue_net_total, 2),
        "ai_questions_included": ai_questions_included
    }
