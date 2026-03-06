"""
Test Suite for P5 Session Features:
P0 - MongoDB Query Optimization (dashboard/admin stats)
P1 - Stripe Live Keys Management (admin stripe-config endpoints)
P2 - Wallet Pass Integration (wallet config, ticket PDF download)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cultural-pass.preview.emergentagent.com').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "admin@qrgate.com"
SUPERADMIN_PASSWORD = "Admin1234!"
DEMO_EMAIL = "demo@qrgate.com"
DEMO_PASSWORD = "Demo1234!"
TEST_ORDER_ID = "20512ee2-47c3-4a34-bc22-99e322139160"  # Valid order from DB


class TestAuth:
    """Helper class for authentication"""
    
    @staticmethod
    def get_superadmin_token():
        """Get superadmin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    @staticmethod
    def get_demo_token():
        """Get demo venue admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None


# ==================== P0: Dashboard Stats with Optimized Aggregation ====================
class TestDashboardStats:
    """P0: Test dashboard stats API with optimized aggregation pipeline"""
    
    def test_dashboard_stats_returns_200(self):
        """Dashboard stats endpoint returns 200 for authenticated venue admin"""
        token = TestAuth.get_demo_token()
        assert token is not None, "Failed to get demo token"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_dashboard_stats_structure(self):
        """Dashboard stats returns expected structure with aggregated data"""
        token = TestAuth.get_demo_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        # Verify structure
        assert "today" in data, "Missing 'today' in stats"
        assert "week" in data, "Missing 'week' in stats"
        assert "month" in data, "Missing 'month' in stats"
        assert "validation_rate" in data, "Missing 'validation_rate'"
        assert "recent_orders" in data, "Missing 'recent_orders'"
        assert "channel_split" in data, "Missing 'channel_split'"
        assert "country_split" in data, "Missing 'country_split'"
        
        # Verify today/week/month structure
        assert "revenue_cents" in data["today"], "today missing revenue_cents"
        assert "ticket_count" in data["today"], "today missing ticket_count"
        
    def test_dashboard_stats_integer_values(self):
        """Dashboard stats returns integer values for metrics"""
        token = TestAuth.get_demo_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        # All revenue/count values should be integers
        assert isinstance(data["today"]["revenue_cents"], int), "revenue_cents not int"
        assert isinstance(data["today"]["ticket_count"], int), "ticket_count not int"
        assert isinstance(data["validation_rate"], int), "validation_rate not int"


# ==================== P0: Admin Stats with Optimized Aggregation ====================
class TestAdminStats:
    """P0: Test admin stats API returns integer fee values"""
    
    def test_admin_stats_returns_200(self):
        """Admin stats endpoint returns 200 for superadmin"""
        token = TestAuth.get_superadmin_token()
        assert token is not None, "Failed to get superadmin token"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_admin_stats_structure(self):
        """Admin stats returns expected structure"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        # Verify structure
        assert "total_venues" in data, "Missing total_venues"
        assert "active_venues" in data, "Missing active_venues"
        assert "total_users" in data, "Missing total_users"
        assert "total_orders" in data, "Missing total_orders"
        assert "total_revenue_cents" in data, "Missing total_revenue_cents"
        assert "total_fees_cents" in data, "Missing total_fees_cents"
        assert "month_revenue_cents" in data, "Missing month_revenue_cents"
        assert "month_fees_cents" in data, "Missing month_fees_cents"
        
    def test_admin_stats_integer_fees(self):
        """P0: Admin stats returns INTEGER fee values (not floats)"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        # Critical P0 check: fees should be integers
        assert isinstance(data["total_fees_cents"], int), f"total_fees_cents is {type(data['total_fees_cents'])}, expected int"
        assert isinstance(data["month_fees_cents"], int), f"month_fees_cents is {type(data['month_fees_cents'])}, expected int"
        assert isinstance(data["total_revenue_cents"], int), "total_revenue_cents not int"
        assert isinstance(data["month_revenue_cents"], int), "month_revenue_cents not int"
        
    def test_admin_stats_requires_superadmin(self):
        """Admin stats returns 403 for non-superadmin"""
        token = TestAuth.get_demo_token()  # Not superadmin
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-superadmin, got {response.status_code}"


# ==================== P1: Stripe Config GET Endpoint ====================
class TestStripeConfigGet:
    """P1: Test Stripe config GET endpoint returns mode and checklist"""
    
    def test_stripe_config_get_returns_200(self):
        """GET /api/admin/stripe-config returns 200 for superadmin"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stripe-config",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_stripe_config_structure(self):
        """Stripe config returns mode badge and checklist structure"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stripe-config",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        # Verify mode
        assert "mode" in data, "Missing 'mode'"
        assert data["mode"] in ["test", "live", "unconfigured"], f"Invalid mode: {data['mode']}"
        
        # Verify masked keys
        assert "secret_key_masked" in data, "Missing secret_key_masked"
        assert "publishable_key_masked" in data, "Missing publishable_key_masked"
        
        # Verify checklist
        assert "checklist" in data, "Missing checklist"
        checklist = data["checklist"]
        assert "secret_key" in checklist, "checklist missing secret_key"
        assert "publishable_key" in checklist, "checklist missing publishable_key"
        assert "webhook_secret" in checklist, "checklist missing webhook_secret"
        assert "live_mode" in checklist, "checklist missing live_mode"
        
    def test_stripe_config_requires_superadmin(self):
        """GET stripe config returns 403 for non-superadmin"""
        token = TestAuth.get_demo_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stripe-config",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403


# ==================== P1: Stripe Config PUT Validation ====================
class TestStripeConfigPut:
    """P1: Test Stripe config PUT endpoint validates key format"""
    
    def test_stripe_config_rejects_invalid_secret_key(self):
        """PUT stripe config rejects invalid secret key format"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        # Try with invalid key format (doesn't start with sk_test_ or sk_live_)
        response = requests.put(
            f"{BASE_URL}/api/admin/stripe-config",
            json={"stripe_secret_key": "invalid_key_format"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid key, got {response.status_code}"
        
    def test_stripe_config_rejects_invalid_publishable_key(self):
        """PUT stripe config rejects invalid publishable key format"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        # Try with invalid key format (doesn't start with pk_test_ or pk_live_)
        response = requests.put(
            f"{BASE_URL}/api/admin/stripe-config",
            json={"stripe_publishable_key": "invalid_key_format"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid key, got {response.status_code}"
        
    def test_stripe_config_accepts_test_key(self):
        """PUT stripe config accepts valid sk_test_ key"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        # Use a test key that follows the format
        response = requests.put(
            f"{BASE_URL}/api/admin/stripe-config",
            json={"stripe_secret_key": "sk_test_12345678901234567890123456789012"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 for valid test key, got {response.status_code}: {response.text}"
        
    def test_stripe_config_requires_superadmin(self):
        """PUT stripe config returns 403 for non-superadmin"""
        token = TestAuth.get_demo_token()
        assert token is not None
        
        response = requests.put(
            f"{BASE_URL}/api/admin/stripe-config",
            json={"stripe_secret_key": "sk_test_12345"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403


# ==================== P2: Wallet Config Public Endpoint ====================
class TestWalletConfig:
    """P2: Test wallet config public endpoint"""
    
    def test_wallet_config_public_no_auth(self):
        """GET /api/wallet/config is public (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/wallet/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_wallet_config_structure(self):
        """Wallet config returns enabled status for Google/Apple"""
        response = requests.get(f"{BASE_URL}/api/wallet/config")
        data = response.json()
        
        assert "google_wallet_enabled" in data, "Missing google_wallet_enabled"
        assert "apple_wallet_enabled" in data, "Missing apple_wallet_enabled"
        
        # Values should be boolean
        assert isinstance(data["google_wallet_enabled"], bool), "google_wallet_enabled not bool"
        assert isinstance(data["apple_wallet_enabled"], bool), "apple_wallet_enabled not bool"


# ==================== P2: Admin Wallet Config ====================
class TestWalletAdminConfig:
    """P2: Test admin wallet config endpoint"""
    
    def test_admin_wallet_config_returns_200(self):
        """GET /api/admin/wallet-config returns 200 for superadmin"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/wallet-config",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_admin_wallet_config_structure(self):
        """Admin wallet config shows Google/Apple wallet status"""
        token = TestAuth.get_superadmin_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/wallet-config",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        # Verify Google Wallet structure
        assert "google_wallet" in data, "Missing google_wallet"
        assert "configured" in data["google_wallet"], "google_wallet missing configured"
        
        # Verify Apple Wallet structure
        assert "apple_wallet" in data, "Missing apple_wallet"
        assert "configured" in data["apple_wallet"], "apple_wallet missing configured"
        
    def test_admin_wallet_config_requires_superadmin(self):
        """Admin wallet config returns 403 for non-superadmin"""
        token = TestAuth.get_demo_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/admin/wallet-config",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403


# ==================== P2: Ticket PDF Download ====================
class TestTicketPdfDownload:
    """P2: Test ticket image PDF download endpoint"""
    
    def test_ticket_image_returns_pdf(self):
        """GET /api/wallet/ticket-image/{order_id} returns PDF"""
        response = requests.get(f"{BASE_URL}/api/wallet/ticket-image/{TEST_ORDER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', f"Expected PDF, got {response.headers.get('content-type')}"
        
    def test_ticket_image_has_filename(self):
        """Ticket PDF response has proper filename header"""
        response = requests.get(f"{BASE_URL}/api/wallet/ticket-image/{TEST_ORDER_ID}")
        
        assert response.status_code == 200
        content_disp = response.headers.get('content-disposition', '')
        assert 'biglietto' in content_disp.lower() or 'filename' in content_disp.lower(), f"Missing filename in: {content_disp}"
        
    def test_ticket_image_404_for_invalid_order(self):
        """Ticket PDF returns 404 for non-existent order"""
        response = requests.get(f"{BASE_URL}/api/wallet/ticket-image/nonexistent-order-id")
        assert response.status_code == 404, f"Expected 404 for invalid order, got {response.status_code}"


# ==================== Waitlist Endpoint Optimization ====================
class TestWaitlistOptimized:
    """Test waitlist endpoint with batch ticket fetching optimization"""
    
    def test_waitlist_returns_200(self):
        """GET /api/dashboard/waitlist returns 200"""
        token = TestAuth.get_demo_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/waitlist",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_waitlist_structure(self):
        """Waitlist returns entries and counts"""
        token = TestAuth.get_demo_token()
        assert token is not None
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/waitlist",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        assert "entries" in data, "Missing entries"
        assert "counts" in data, "Missing counts"
        assert "waiting" in data["counts"], "counts missing waiting"
        assert "notified" in data["counts"], "counts missing notified"


# ==================== Google/Apple Wallet Pass Endpoints ====================
class TestWalletPassGeneration:
    """Test wallet pass generation endpoints (expected to fail without credentials)"""
    
    def test_google_wallet_pass_503_without_config(self):
        """Google Wallet pass returns 503 when not configured"""
        response = requests.get(f"{BASE_URL}/api/wallet/google-pass/{TEST_ORDER_ID}")
        # Should return 503 since Google Wallet is not configured
        assert response.status_code == 503, f"Expected 503 (not configured), got {response.status_code}"
        
    def test_apple_wallet_pass_503_without_config(self):
        """Apple Wallet pass returns 503 when not configured"""
        response = requests.get(f"{BASE_URL}/api/wallet/apple-pass/{TEST_ORDER_ID}")
        # Should return 503 since Apple Wallet is not configured
        assert response.status_code == 503, f"Expected 503 (not configured), got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
