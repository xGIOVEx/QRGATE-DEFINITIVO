import pytest
from services.fee_service import calculate_order_fees

def test_single_ticket_no_guide():
    # Biglietto EUR 10 senza guida -> fee EUR 1,09, netto EUR 8,91
    order = {
        "tickets": [{"price": 10, "ticket_type_code": "ENTRY", "has_slot_booking": False}],
        "audio_guide": None
    }
    result = calculate_order_fees(order)
    
    assert result["tickets_fee"] == 1.09
    assert result["guide_fee"] == 0.00
    assert result["extra_lang_fee"] == 0.00
    assert result["slot_fee"] == 0.00
    assert result["qrgate_total_fee"] == 1.09
    assert result["venue_net_total"] == 8.91
    assert result["ai_questions_included"] == 0

def test_single_ticket_with_base_guide():
    # Biglietto EUR 8 + guida EUR 4 in IT -> fee totale = EUR 0,97 + EUR 1,40 = EUR 2,37
    order = {
        "tickets": [{"price": 8, "ticket_type_code": "ENTRY", "has_slot_booking": False}],
        "audio_guide": {
            "price": 4,
            "is_premium_tour": False,
            "languages": ["it"],
            "base_languages": ["it", "en"]
        }
    }
    result = calculate_order_fees(order)
    
    assert result["tickets_fee"] == 0.97
    assert result["guide_fee"] == 1.40
    assert result["extra_lang_fee"] == 0.00
    assert result["qrgate_total_fee"] == 2.37
    assert result["ai_questions_included"] == 10  # FLOOR(4 * 0.50 / 0.20)

def test_single_ticket_with_extra_lang_guide():
    # Biglietto EUR 8 + guida EUR 4 in FR (extra) -> fee = EUR 2,37 + EUR 0,30 = EUR 2,67
    order = {
        "tickets": [{"price": 8, "ticket_type_code": "ENTRY", "has_slot_booking": False}],
        "audio_guide": {
            "price": 4,
            "is_premium_tour": False,
            "languages": ["fr"],
            "base_languages": ["it", "en"]
        }
    }
    result = calculate_order_fees(order)
    
    assert result["tickets_fee"] == 0.97
    assert result["guide_fee"] == 1.40
    assert result["extra_lang_fee"] == 0.30
    assert result["qrgate_total_fee"] == 2.67

def test_group_tickets_with_guide():
    # Gruppo 4 biglietti EUR 10 + 4 guide EUR 4 in IT -> calcolo corretto per tutti e 4
    order = {
        "tickets": [
            {"price": 10, "ticket_type_code": "ENTRY", "has_slot_booking": False},
            {"price": 10, "ticket_type_code": "ENTRY", "has_slot_booking": False},
            {"price": 10, "ticket_type_code": "ENTRY", "has_slot_booking": False},
            {"price": 10, "ticket_type_code": "ENTRY", "has_slot_booking": False}
        ],
        "audio_guide": {
            "price": 4,
            "is_premium_tour": False,
            "languages": ["it"],
            "base_languages": ["it", "en"]
        }
    }
    result = calculate_order_fees(order)
    
    assert result["tickets_fee"] == 4.36   # 4 * 1.09
    assert result["guide_fee"] == 5.60     # 4 * 1.40
    assert result["qrgate_total_fee"] == 9.96
    assert result["venue_net_total"] == 46.04 # (40 + 16) - 9.96 = 56 - 9.96

def test_premium_tour():
    # Tour premium EUR 5 -> 40% = EUR 2,00 commissione guida
    order = {
        "tickets": [{"price": 10, "ticket_type_code": "ENTRY", "has_slot_booking": False}],
        "audio_guide": {
            "price": 5,
            "is_premium_tour": True,
            "languages": ["it"],
            "base_languages": ["it", "en"]
        }
    }
    result = calculate_order_fees(order)
    
    assert result["guide_fee"] == 2.00
    assert result["ai_questions_included"] == 12  # FLOOR(5 * 0.50 / 0.20)
