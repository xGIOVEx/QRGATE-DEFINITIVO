"""
QRGate Backend API Tests
Testing auth, public venue, dashboard, admin, and scan endpoints
"""
import pytest
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # fallback: read from frontend env
    frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
    if frontend_env.exists():
        with open(frontend_env) as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                    break

# Test credentials
DEMO_EMAIL = "demo@qrgate.com"
DEMO_PASSWORD = "Demo1234!"
ADMIN_EMAIL = "admin@qrgate.com"
ADMIN_PASSWORD = "Admin1234!"
STAFF_EMAIL = "staff@qrgate.com"
STAFF_PASSWORD = "Staff1234!"
DEMO_VENUE_SLUG = "museo-civico-brescia"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_token(session):
    """Get demo admin token"""
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert resp.status_code == 200, f"Demo login failed: {resp.text}"
    data = resp.json()
    return data["token"]


@pytest.fixture(scope="module")
def admin_token(session):
    """Get superadmin token"""
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ==================== SYSTEM HEALTH ====================

class TestSystemHealth:
    """System health check"""
    
    def test_health_endpoint(self, session):
        resp = session.get(f"{BASE_URL}/api/system/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("mongodb") == "connected"
        print(f"Health: {data}")


# ==================== AUTH ====================

class TestAuth:
    """Authentication tests"""

    def test_demo_login_success(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert "venue" in data
        assert data["user"]["email"] == DEMO_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"Demo login success - venue: {data['venue'].get('name')}")

    def test_admin_login_success(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "superadmin"
        print(f"Admin login success")

    def test_staff_login_success(self, session):
        resp = session.post(f"{BASE_URL}/api/staff/login", json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "staff" in data
        print(f"Staff login success - role: {data['staff'].get('role')}")

    def test_invalid_login(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@test.com", "password": "wrongpass"})
        assert resp.status_code == 401

    def test_get_current_user(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/auth/me", headers=demo_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        assert "venue" in data

    def test_unauthorized_without_token(self, session):
        resp = session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401


# ==================== PUBLIC VENUE ====================

class TestPublicVenue:
    """Public venue endpoints"""

    def test_get_venue_by_slug(self, session):
        resp = session.get(f"{BASE_URL}/api/public/venue/{DEMO_VENUE_SLUG}")
        assert resp.status_code == 200
        data = resp.json()
        assert "venue" in data
        assert "tickets" in data
        assert data["venue"]["slug"] == DEMO_VENUE_SLUG
        assert len(data["tickets"]) > 0
        print(f"Venue: {data['venue']['name']}, Tickets: {len(data['tickets'])}")

    def test_get_nonexistent_venue(self, session):
        resp = session.get(f"{BASE_URL}/api/public/venue/nonexistent-venue-xyz")
        assert resp.status_code == 404

    def test_payment_intent_mock(self, session):
        """Test mock payment flow"""
        # First get venue and ticket
        venue_resp = session.get(f"{BASE_URL}/api/public/venue/{DEMO_VENUE_SLUG}")
        assert venue_resp.status_code == 200
        venue_data = venue_resp.json()
        ticket_id = venue_data["tickets"][0]["id"]

        resp = session.post(f"{BASE_URL}/api/public/payment-intent", json={
            "venue_slug": DEMO_VENUE_SLUG,
            "ticket_id": ticket_id,
            "quantity": 1,
            "visitor_email": "test_qrgate@example.com",
            "channel": "online"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("mock") == True
        assert "order_id" in data
        print(f"Mock payment success - order_id: {data['order_id']}")
        return data["order_id"]

    def test_get_public_order(self, session):
        """Test getting a public order"""
        # First create an order
        venue_resp = session.get(f"{BASE_URL}/api/public/venue/{DEMO_VENUE_SLUG}")
        ticket_id = venue_resp.json()["tickets"][0]["id"]
        
        create_resp = session.post(f"{BASE_URL}/api/public/payment-intent", json={
            "venue_slug": DEMO_VENUE_SLUG,
            "ticket_id": ticket_id,
            "quantity": 1,
            "visitor_email": "test_order@example.com",
            "channel": "online"
        })
        assert create_resp.status_code == 200
        order_id = create_resp.json()["order_id"]
        
        # Get the order
        get_resp = session.get(f"{BASE_URL}/api/public/orders/{order_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert "order" in data
        assert data["order"]["id"] == order_id
        print(f"Public order fetch success")


# ==================== DASHBOARD ====================

class TestDashboard:
    """Dashboard endpoints (requires admin auth)"""

    def test_get_dashboard_stats(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/dashboard/stats", headers=demo_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "today" in data
        assert "week" in data
        assert "month" in data
        assert "validation_rate" in data
        print(f"Stats OK - month revenue: €{data['month']['revenue_cents']/100:.2f}")

    def test_get_tickets(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/dashboard/tickets", headers=demo_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Tickets: {len(data)} found")

    def test_create_ticket(self, session, demo_headers):
        resp = session.post(f"{BASE_URL}/api/dashboard/tickets", headers=demo_headers, json={
            "name": "TEST_Biglietto Prova",
            "description": "Test ticket",
            "price": 500,
            "type": "standard"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Biglietto Prova"
        assert data["price"] == 500
        assert "id" in data
        print(f"Ticket created: {data['id']}")
        return data["id"]

    def test_update_ticket(self, session, demo_headers):
        # Create a ticket first
        create_resp = session.post(f"{BASE_URL}/api/dashboard/tickets", headers=demo_headers, json={
            "name": "TEST_Update Ticket",
            "price": 700,
            "type": "standard"
        })
        assert create_resp.status_code == 200
        ticket_id = create_resp.json()["id"]

        # Update it
        update_resp = session.put(f"{BASE_URL}/api/dashboard/tickets/{ticket_id}", headers=demo_headers, json={
            "name": "TEST_Updated Name",
            "price": 900
        })
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["name"] == "TEST_Updated Name"
        assert data["price"] == 900
        print("Ticket update success")

    def test_delete_ticket(self, session, demo_headers):
        # Create a ticket
        create_resp = session.post(f"{BASE_URL}/api/dashboard/tickets", headers=demo_headers, json={
            "name": "TEST_Delete Ticket",
            "price": 300,
            "type": "standard"
        })
        ticket_id = create_resp.json()["id"]

        delete_resp = session.delete(f"{BASE_URL}/api/dashboard/tickets/{ticket_id}", headers=demo_headers)
        assert delete_resp.status_code == 200
        data = delete_resp.json()
        assert "message" in data
        print("Ticket delete success")

    def test_get_orders(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/dashboard/orders", headers=demo_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "orders" in data
        assert "total" in data
        assert "pages" in data
        print(f"Orders: {data['total']} total")

    def test_refund_order(self, session, demo_headers):
        """Test order refund"""
        orders_resp = session.get(f"{BASE_URL}/api/dashboard/orders", headers=demo_headers)
        orders = orders_resp.json()["orders"]
        # Find a paid order
        paid_order = next((o for o in orders if o.get("stripe_payment_status") == "paid"), None)
        if not paid_order:
            pytest.skip("No paid orders found")
        
        refund_resp = session.post(f"{BASE_URL}/api/dashboard/orders/{paid_order['id']}/refund", headers=demo_headers)
        assert refund_resp.status_code == 200
        print(f"Refund success for order {paid_order['id']}")

    def test_get_staff(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/dashboard/staff", headers=demo_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"Staff: {len(data)} members")

    def test_create_staff(self, session, demo_headers):
        resp = session.post(f"{BASE_URL}/api/dashboard/staff", headers=demo_headers, json={
            "email": "test_staff_member@qrgate.com",
            "password": "TestStaff123!",
            "role": "scanner"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test_staff_member@qrgate.com"
        assert "id" in data
        # Cleanup
        session.delete(f"{BASE_URL}/api/dashboard/staff/{data['id']}", headers=demo_headers)
        print(f"Staff created and deleted")

    def test_get_settings(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/dashboard/settings", headers=demo_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "name" in data
        assert "slug" in data
        print(f"Settings OK - venue: {data['name']}")

    def test_update_settings(self, session, demo_headers):
        resp = session.put(f"{BASE_URL}/api/dashboard/settings", headers=demo_headers, json={
            "description": "Updated description for testing",
            "opening_hours": "Lun-Dom 9:00-18:00"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["description"] == "Updated description for testing"
        print("Settings update success")

    def test_get_stripe_status(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/dashboard/stripe/status", headers=demo_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "stripe_onboarded" in data
        print(f"Stripe status: {data.get('status', 'N/A')}")

    def test_stripe_connect_mock(self, session, demo_headers):
        resp = session.post(f"{BASE_URL}/api/dashboard/stripe/connect", headers=demo_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "mock" in data or "onboarding_url" in data or "stripe_onboarded" in data
        print(f"Stripe connect: {data}")

    def test_reports_export_csv(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/dashboard/reports/export", headers=demo_headers)
        assert resp.status_code == 200
        content_type = resp.headers.get("content-type", "")
        assert "csv" in content_type or "text" in content_type
        print(f"CSV export OK - size: {len(resp.content)} bytes")

    def test_poster_download(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/dashboard/poster/download", headers=demo_headers)
        assert resp.status_code == 200
        assert "pdf" in resp.headers.get("content-type", "").lower()
        print(f"Poster PDF download OK - size: {len(resp.content)} bytes")


# ==================== SCAN ====================

class TestScan:
    """QR scan verification"""

    def test_scan_valid_qr(self, session):
        """Create an order, then scan its QR token"""
        # Create order
        venue_resp = session.get(f"{BASE_URL}/api/public/venue/{DEMO_VENUE_SLUG}")
        ticket_id = venue_resp.json()["tickets"][0]["id"]
        
        order_resp = session.post(f"{BASE_URL}/api/public/payment-intent", json={
            "venue_slug": DEMO_VENUE_SLUG,
            "ticket_id": ticket_id,
            "quantity": 1,
            "visitor_email": "scan_test@example.com",
            "channel": "entrance"
        })
        assert order_resp.status_code == 200
        order_id = order_resp.json()["order_id"]
        
        # Get the order to find qr_token
        get_resp = session.get(f"{BASE_URL}/api/public/orders/{order_id}")
        qr_token = get_resp.json()["order"]["qr_token"]
        
        # Scan it
        scan_resp = session.post(f"{BASE_URL}/api/scan/verify", json={"token": qr_token})
        assert scan_resp.status_code == 200
        data = scan_resp.json()
        assert data["result"] == "VALID"
        print(f"QR scan VALID")

        # Scan again - should be ALREADY_USED
        scan2_resp = session.post(f"{BASE_URL}/api/scan/verify", json={"token": qr_token})
        assert scan2_resp.status_code == 200
        data2 = scan2_resp.json()
        assert data2["result"] == "ALREADY_USED"
        print(f"QR double-scan: ALREADY_USED")

    def test_scan_invalid_qr(self, session):
        resp = session.post(f"{BASE_URL}/api/scan/verify", json={"token": "invalid-token-xyz"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["result"] == "INVALID"
        print(f"Invalid QR test: INVALID")


# ==================== ADMIN ====================

class TestAdminPanel:
    """Admin panel endpoints"""

    def test_admin_stats(self, session, admin_headers):
        resp = session.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_venues" in data
        assert "total_orders" in data
        assert data["total_venues"] >= 4  # We have 4 seeded venues
        print(f"Admin stats: {data['total_venues']} venues, {data['total_orders']} orders")

    def test_admin_venues_list(self, session, admin_headers):
        resp = session.get(f"{BASE_URL}/api/admin/venues", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "venues" in data
        assert len(data["venues"]) >= 4  # 4 seeded venues
        print(f"Admin venues: {len(data['venues'])}")

    def test_admin_orders_list(self, session, admin_headers):
        resp = session.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "orders" in data
        assert "total" in data
        assert data["total"] > 0
        print(f"Admin orders: {data['total']}")

    def test_admin_users_list(self, session, admin_headers):
        resp = session.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        emails = [u["email"] for u in data]
        assert ADMIN_EMAIL in emails
        print(f"Admin users: {len(data)}")

    def test_admin_forbidden_for_regular_user(self, session, demo_headers):
        resp = session.get(f"{BASE_URL}/api/admin/stats", headers=demo_headers)
        assert resp.status_code == 403
        print("Access correctly forbidden for non-superadmin")

    def test_admin_venue_toggle_status(self, session, admin_headers):
        """Toggle Colosseo venue status"""
        venues_resp = session.get(f"{BASE_URL}/api/admin/venues", headers=admin_headers)
        venues = venues_resp.json()["venues"]
        colosseo = next((v for v in venues if v["slug"] == "colosseo-roma"), None)
        if not colosseo:
            pytest.skip("Colosseo venue not found")
        
        initial_status = colosseo["stripe_onboarded"]
        resp = session.put(f"{BASE_URL}/api/admin/venues/{colosseo['id']}/status", 
                          headers=admin_headers, json={})
        assert resp.status_code == 200
        data = resp.json()
        assert data["stripe_onboarded"] != initial_status
        
        # Toggle back
        session.put(f"{BASE_URL}/api/admin/venues/{colosseo['id']}/status", 
                   headers=admin_headers, json={})
        print(f"Venue status toggle: OK")


# ==================== TEST UTILITY ====================

class TestCreateTestOrder:
    """Test utility endpoint"""

    def test_create_test_order(self, session):
        resp = session.get(f"{BASE_URL}/api/test/create-test-order")
        assert resp.status_code == 200
        data = resp.json()
        assert "order_id" in data
        assert "qr_token" in data
        assert "qr_base64" in data
        print(f"Test order created: {data['order_id']}")
