import pytest
from services.dynamic_pricing_service import calculate_dynamic_price


class TestDynamicPricingDisabled:
    """When smart pricing is disabled, price should never change."""
    
    def test_disabled_returns_base_price(self):
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=99,
            config={"enabled": False, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["final_price_cents"] == 1000
        assert result["is_surge_active"] is False
        assert result["surge_pct"] == 0

    def test_empty_config_returns_base_price(self):
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=99,
            config={}
        )
        assert result["final_price_cents"] == 1000
        assert result["is_surge_active"] is False


class TestDynamicPricingAboveThreshold:
    """When availability is above threshold, no surge."""
    
    def test_50pct_availability_no_surge(self):
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=50,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["final_price_cents"] == 1000
        assert result["is_surge_active"] is False
        assert result["remaining_pct"] == 50

    def test_exactly_at_threshold_no_surge(self):
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=80,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["final_price_cents"] == 1000
        assert result["is_surge_active"] is False
        assert result["remaining_pct"] == 20


class TestDynamicPricingSurge:
    """When availability drops below threshold, surge activates."""
    
    def test_10pct_remaining_proportional_surge(self):
        # 10% remaining with 20% threshold → surge_factor = 0.5 → +15% of 1000 = 150
        # 1150 → rounded to 1150 (already on 50)
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=90,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["is_surge_active"] is True
        assert result["final_price_cents"] == 1150  # 1000 + 150, already on 50
        assert result["surge_pct"] == 15
        assert result["remaining_pct"] == 10

    def test_0pct_remaining_max_surge(self):
        # 0% remaining → max surge → +30% of 1000 = 300
        # 1300 → rounded to 1300 (already on 50 boundary)
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=100,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["is_surge_active"] is True
        assert result["final_price_cents"] == 1300
        assert result["surge_pct"] == 30

    def test_5pct_remaining_surge(self):
        # 5% remaining with 20% threshold → surge_factor = 0.75 → +22.5% → 225 cents
        # 1225 → round(1225/50)=round(24.5)=24 (banker's rounding) → 1200
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=95,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["is_surge_active"] is True
        assert result["final_price_cents"] == 1200  # banker's rounding: 1225 → 1200
        assert result["remaining_pct"] == 5


class TestRounding:
    """Prices round to nearest 50 cents."""
    
    def test_round_up(self):
        # base 850 (€8.50), 0% remaining, +30% = 255 → 1105 → rounds to 1100
        result = calculate_dynamic_price(
            base_price_cents=850, capacity=10, booked=10,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["final_price_cents"] % 50 == 0

    def test_round_down(self):
        # base 750 (€7.50), 0% remaining, +30% = 225 → 975 → rounds to 1000
        result = calculate_dynamic_price(
            base_price_cents=750, capacity=10, booked=10,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["final_price_cents"] % 50 == 0

    def test_final_never_below_base(self):
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=85,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 5}
        )
        assert result["final_price_cents"] >= 1000


class TestEdgeCases:
    """Edge cases: zero capacity, negative values, etc."""
    
    def test_zero_capacity(self):
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=0, booked=0,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["final_price_cents"] == 1000
        assert result["is_surge_active"] is False

    def test_zero_base_price(self):
        # Free tickets should never surge
        result = calculate_dynamic_price(
            base_price_cents=0, capacity=100, booked=100,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["final_price_cents"] == 0

    def test_booked_exceeds_capacity(self):
        # Overbooked — treat as sold out
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=10, booked=15,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["is_surge_active"] is True
        assert result["final_price_cents"] == 1300

    def test_config_values_clamped(self):
        # Extreme config values get clamped
        result = calculate_dynamic_price(
            base_price_cents=1000, capacity=100, booked=100,
            config={"enabled": True, "threshold_pct": 200, "max_increase_pct": 500}
        )
        # threshold clamped to 50, max_increase clamped to 100
        assert result["is_surge_active"] is True
        assert result["surge_pct"] <= 100

    def test_base_price_preserved_in_result(self):
        result = calculate_dynamic_price(
            base_price_cents=1500, capacity=100, booked=99,
            config={"enabled": True, "threshold_pct": 20, "max_increase_pct": 30}
        )
        assert result["base_price_cents"] == 1500
