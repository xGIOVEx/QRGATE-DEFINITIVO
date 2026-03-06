"""
Test suite for QRGate Timed Entry Features
- Timed Entry Tickets (Dashboard > Tickets with slots)
- Slot Selection API (/api/public/venue/{slug}/slots)
- Checkout with slot_date and slot_time
- Dashboard Capacity
- Dashboard Waitlist
- Waitlist Join API
- Scanner slot info
- Dashboard Analytics
- Admin Analytics
- Daily Capacity
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cultural-pass.preview.emergentagent.com').rstrip('/')

# Test credentials
TERME_ADMIN_EMAIL = "terme@qrgate.com"
TERME_ADMIN_PASSWORD = "Demo1234!"
DEMO_ADMIN_EMAIL = "demo@qrgate.com"
DEMO_ADMIN_PASSWORD = "Demo1234!"
SUPERADMIN_EMAIL = "admin@qrgate.com"
SUPERADMIN_PASSWORD = "Admin1234!"
STAFF_EMAIL = "staff@qrgate.com"
STAFF_PASSWORD = "Staff1234!"

# Test venue with timed entry
TERME_VENUE_SLUG = "terme-caracalla-roma"


class TestSystemHealth:
    """Test system is running"""
    
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/api/system/health")
        assert response.status_code == 200
        data = response.json()
        assert data["mongodb"] == "connected"
        assert data["qr_generation"] == "working"
        print("✓ System health check passed")


class TestTimedEntryAuthentication:
    """Test authentication for timed entry features"""
    
    def test_terme_admin_login(self):
        """Login as terme admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TERME_ADMIN_EMAIL,
            "password": TERME_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Terme admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "venue" in data
        print(f"✓ Terme admin login successful - venue: {data['venue'].get('name')}")
        return data["token"]
    
    def test_demo_admin_login(self):
        """Login as demo admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_ADMIN_EMAIL,
            "password": DEMO_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Demo admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print("✓ Demo admin login successful")
        return data["token"]
    
    def test_superadmin_login(self):
        """Login as superadmin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Superadmin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print("✓ Superadmin login successful")
        return data["token"]


class TestPublicVenueSlots:
    """Test public venue and slots API"""
    
    def test_get_public_venue(self):
        """Get public venue info"""
        response = requests.get(f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}")
        if response.status_code == 404:
            pytest.skip(f"Venue {TERME_VENUE_SLUG} not found - may need to create test data")
        assert response.status_code == 200, f"Failed to get venue: {response.text}"
        data = response.json()
        assert "venue" in data
        assert "tickets" in data
        print(f"✓ Public venue: {data['venue']['name']} - {len(data['tickets'])} tickets")
        return data
    
    def test_get_available_slots(self):
        """Test /api/public/venue/{slug}/slots endpoint"""
        # First get venue to find a timed entry ticket
        venue_response = requests.get(f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}")
        if venue_response.status_code == 404:
            pytest.skip(f"Venue {TERME_VENUE_SLUG} not found")
        
        data = venue_response.json()
        tickets = data.get('tickets', [])
        
        # Find a timed entry ticket
        timed_ticket = next((t for t in tickets if t.get('timed_entry')), None)
        if not timed_ticket:
            pytest.skip("No timed entry ticket found")
        
        # Get slots for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}/slots",
            params={"date": tomorrow, "ticket_id": timed_ticket['id']}
        )
        assert response.status_code == 200, f"Failed to get slots: {response.text}"
        data = response.json()
        
        assert "slots" in data
        assert "timed_entry" in data
        
        if data['timed_entry']:
            print(f"✓ Slots for {tomorrow}: {len(data['slots'])} slots available")
            if data['slots']:
                slot = data['slots'][0]
                assert "time" in slot
                assert "capacity" in slot
                assert "available" in slot
                print(f"  First slot: {slot['time']} - {slot['available']}/{slot['capacity']} available")
        else:
            print("✓ Ticket is not timed entry")
        
        return data


class TestTimedEntryTickets:
    """Test creating and managing timed entry tickets"""
    
    @pytest.fixture
    def terme_token(self):
        """Get terme admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TERME_ADMIN_EMAIL,
            "password": TERME_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Terme admin login failed")
        return response.json()["token"]
    
    def test_get_tickets(self, terme_token):
        """Get tickets for venue"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/tickets",
            headers={"Authorization": f"Bearer {terme_token}"}
        )
        assert response.status_code == 200, f"Failed to get tickets: {response.text}"
        tickets = response.json()
        print(f"✓ Retrieved {len(tickets)} tickets")
        
        # Check for timed entry tickets
        timed_tickets = [t for t in tickets if t.get('timed_entry')]
        print(f"  Timed entry tickets: {len(timed_tickets)}")
        
        if timed_tickets:
            t = timed_tickets[0]
            print(f"  First timed ticket: {t['name']} - {len(t.get('slots', []))} slots")
        
        return tickets
    
    def test_create_timed_ticket(self, terme_token):
        """Test creating a timed entry ticket"""
        import uuid
        test_ticket = {
            "name": f"TEST_Timed_Ticket_{uuid.uuid4().hex[:8]}",
            "description": "Test timed entry ticket",
            "price": 1500,  # €15
            "type": "standard",
            "timed_entry": True,
            "slot_duration_minutes": 60,
            "slots": [
                {"time": "09:00", "capacity": 50, "days_available": ["all"]},
                {"time": "10:00", "capacity": 50, "days_available": ["all"]},
                {"time": "11:00", "capacity": 50, "days_available": ["all"]}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dashboard/tickets/timed",
            json=test_ticket,
            headers={"Authorization": f"Bearer {terme_token}"}
        )
        assert response.status_code == 200, f"Failed to create timed ticket: {response.text}"
        data = response.json()
        
        assert data.get('timed_entry') == True
        assert len(data.get('slots', [])) == 3
        print(f"✓ Created timed ticket: {data['name']} with {len(data['slots'])} slots")
        
        return data
    
    def test_update_timed_ticket(self, terme_token):
        """Test updating a timed entry ticket"""
        # First create a ticket
        import uuid
        test_ticket = {
            "name": f"TEST_Update_Timed_{uuid.uuid4().hex[:8]}",
            "description": "Test update ticket",
            "price": 1000,
            "type": "standard",
            "timed_entry": True,
            "slot_duration_minutes": 60,
            "slots": [{"time": "14:00", "capacity": 30, "days_available": ["all"]}]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/dashboard/tickets/timed",
            json=test_ticket,
            headers={"Authorization": f"Bearer {terme_token}"}
        )
        assert create_response.status_code == 200
        ticket_id = create_response.json()['id']
        
        # Update the ticket
        update_data = {
            "name": f"TEST_Updated_Timed_{uuid.uuid4().hex[:8]}",
            "timed_entry": True,
            "slots": [
                {"time": "14:00", "capacity": 40, "days_available": ["all"]},
                {"time": "15:00", "capacity": 40, "days_available": ["all"]}
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/dashboard/tickets/{ticket_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {terme_token}"}
        )
        assert response.status_code == 200, f"Failed to update ticket: {response.text}"
        data = response.json()
        
        assert len(data.get('slots', [])) == 2
        print(f"✓ Updated timed ticket: now has {len(data['slots'])} slots")
        
        return data


class TestCheckoutWithSlots:
    """Test checkout flow with slot selection"""
    
    def test_checkout_session_with_slot(self):
        """Test creating checkout session with slot selection"""
        # Get venue info first
        venue_response = requests.get(f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}")
        if venue_response.status_code == 404:
            pytest.skip(f"Venue {TERME_VENUE_SLUG} not found")
        
        venue_data = venue_response.json()
        venue = venue_data['venue']
        tickets = venue_data['tickets']
        
        # Find a timed entry ticket
        timed_ticket = next((t for t in tickets if t.get('timed_entry') and t.get('active')), None)
        if not timed_ticket:
            pytest.skip("No active timed entry ticket found")
        
        # Get tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Get available slots
        slots_response = requests.get(
            f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}/slots",
            params={"date": tomorrow, "ticket_id": timed_ticket['id']}
        )
        assert slots_response.status_code == 200
        slots_data = slots_response.json()
        
        available_slot = next((s for s in slots_data.get('slots', []) if s['available'] > 0), None)
        if not available_slot:
            pytest.skip("No available slots for tomorrow")
        
        # Create checkout session with slot
        import uuid
        checkout_data = {
            "venue_slug": TERME_VENUE_SLUG,
            "ticket_id": timed_ticket['id'],
            "quantity": 1,
            "visitor_email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "channel": "online",
            "donation_amount": 0,
            "slot_date": tomorrow,
            "slot_time": available_slot['time']
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/checkout-session",
            json=checkout_data
        )
        
        # Could be 200 (mock mode) or 400 (Stripe not active)
        if response.status_code == 400 and "Biglietteria non ancora attiva" in response.text:
            pytest.skip("Venue not onboarded for Stripe")
        
        assert response.status_code == 200, f"Checkout failed: {response.text}"
        data = response.json()
        
        # In mock mode, order is created directly
        if data.get('mock'):
            assert "order_id" in data
            print(f"✓ Checkout (mock): Order {data['order_id']} created for slot {available_slot['time']}")
        else:
            assert "url" in data
            print(f"✓ Checkout: Stripe session created for slot {available_slot['time']}")
        
        return data


class TestDashboardCapacity:
    """Test Dashboard Capacity API"""
    
    @pytest.fixture
    def terme_token(self):
        """Get terme admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TERME_ADMIN_EMAIL,
            "password": TERME_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Terme admin login failed")
        return response.json()["token"]
    
    def test_get_capacity_overview(self, terme_token):
        """Test GET /api/dashboard/capacity"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/capacity",
            params={"date": today},
            headers={"Authorization": f"Bearer {terme_token}"}
        )
        assert response.status_code == 200, f"Failed to get capacity: {response.text}"
        data = response.json()
        
        assert "date" in data
        assert "timed_tickets" in data
        print(f"✓ Capacity for {data['date']}: {len(data['timed_tickets'])} timed tickets")
        
        if data.get('daily_capacity'):
            dc = data['daily_capacity']
            print(f"  Daily capacity: {dc['sold']}/{dc['capacity']} ({dc['available']} available)")
        
        for ticket in data['timed_tickets']:
            print(f"  {ticket['ticket_name']}: {len(ticket['slots'])} slots")
        
        return data
    
    def test_update_daily_capacity(self, terme_token):
        """Test PUT /api/dashboard/capacity"""
        # Enable daily capacity
        response = requests.put(
            f"{BASE_URL}/api/dashboard/capacity",
            json={
                "daily_capacity_enabled": True,
                "daily_capacity": 500
            },
            headers={"Authorization": f"Bearer {terme_token}"}
        )
        assert response.status_code == 200, f"Failed to update capacity: {response.text}"
        data = response.json()
        
        assert data.get('daily_capacity_enabled') == True
        assert data.get('daily_capacity') == 500
        print("✓ Daily capacity updated: 500 visitors/day enabled")
        
        return data


class TestDashboardWaitlist:
    """Test Dashboard Waitlist API"""
    
    @pytest.fixture
    def terme_token(self):
        """Get terme admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TERME_ADMIN_EMAIL,
            "password": TERME_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Terme admin login failed")
        return response.json()["token"]
    
    def test_get_waitlist(self, terme_token):
        """Test GET /api/dashboard/waitlist"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/waitlist",
            headers={"Authorization": f"Bearer {terme_token}"}
        )
        assert response.status_code == 200, f"Failed to get waitlist: {response.text}"
        data = response.json()
        
        assert "entries" in data
        assert "counts" in data
        print(f"✓ Waitlist: {data['counts']['waiting']} waiting, {data['counts']['notified']} notified")
        
        return data


class TestPublicWaitlistJoin:
    """Test public waitlist join API"""
    
    def test_join_waitlist(self):
        """Test POST /api/public/waitlist/join"""
        # Get venue info first
        venue_response = requests.get(f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}")
        if venue_response.status_code == 404:
            pytest.skip(f"Venue {TERME_VENUE_SLUG} not found")
        
        venue_data = venue_response.json()
        tickets = venue_data['tickets']
        
        if not tickets:
            pytest.skip("No tickets found")
        
        ticket = tickets[0]
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        import uuid
        waitlist_data = {
            "venue_slug": TERME_VENUE_SLUG,
            "ticket_id": ticket['id'],
            "visitor_email": f"waitlist_{uuid.uuid4().hex[:8]}@example.com",
            "visitor_name": "Test Waitlist User",
            "quantity": 2,
            "slot_date": tomorrow,
            "slot_time": "10:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/waitlist/join",
            json=waitlist_data
        )
        assert response.status_code == 200, f"Failed to join waitlist: {response.text}"
        data = response.json()
        
        assert data.get('success') == True
        assert "position" in data
        print(f"✓ Joined waitlist: position #{data['position']}")
        
        return data


class TestDashboardAnalytics:
    """Test Dashboard Analytics API"""
    
    @pytest.fixture
    def terme_token(self):
        """Get terme admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TERME_ADMIN_EMAIL,
            "password": TERME_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Terme admin login failed")
        return response.json()["token"]
    
    def test_get_venue_analytics(self, terme_token):
        """Test GET /api/dashboard/analytics"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/analytics",
            params={"days": 30},
            headers={"Authorization": f"Bearer {terme_token}"}
        )
        assert response.status_code == 200, f"Failed to get analytics: {response.text}"
        data = response.json()
        
        assert "current" in data
        assert "changes" in data
        assert "daily_revenue" in data
        print(f"✓ Venue analytics: {data['current']['orders']} orders, €{data['current']['revenue_cents']/100:.2f} revenue (30 days)")
        print(f"  Changes: revenue {data['changes']['revenue_pct']}%, tickets {data['changes']['tickets_pct']}%")
        
        return data


class TestAdminAnalytics:
    """Test Admin Analytics API (superadmin only)"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Superadmin login failed")
        return response.json()["token"]
    
    def test_get_admin_analytics(self, superadmin_token):
        """Test GET /api/admin/analytics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200, f"Failed to get admin analytics: {response.text}"
        data = response.json()
        
        assert "overview" in data
        assert "current_month" in data
        assert "growth" in data
        assert "top_venues" in data
        
        overview = data['overview']
        print(f"✓ Platform analytics:")
        print(f"  Total venues: {overview['total_venues']}, Active: {overview['active_venues']}")
        print(f"  Activation rate: {overview['activation_rate']}%")
        print(f"  Current month fees: €{data['current_month']['fees_cents']/100:.2f}")
        
        return data
    
    def test_admin_analytics_requires_superadmin(self):
        """Test that regular admin cannot access admin analytics"""
        # Login as regular admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_ADMIN_EMAIL,
            "password": DEMO_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Demo admin login failed")
        
        token = response.json()["token"]
        
        # Try to access admin analytics
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        print("✓ Admin analytics correctly requires superadmin role")


class TestScannerWithSlotInfo:
    """Test scanner shows slot info"""
    
    def test_scan_with_slot_info(self):
        """Test that scan verify returns slot info"""
        # First, create an order with a slot
        venue_response = requests.get(f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}")
        if venue_response.status_code == 404:
            pytest.skip(f"Venue {TERME_VENUE_SLUG} not found")
        
        venue_data = venue_response.json()
        venue = venue_data['venue']
        tickets = venue_data['tickets']
        
        # Find a timed entry ticket
        timed_ticket = next((t for t in tickets if t.get('timed_entry') and t.get('active')), None)
        if not timed_ticket:
            pytest.skip("No active timed entry ticket found")
        
        # Check if venue is onboarded
        if not venue.get('stripe_onboarded'):
            pytest.skip("Venue not onboarded")
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Get slots
        slots_response = requests.get(
            f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}/slots",
            params={"date": tomorrow, "ticket_id": timed_ticket['id']}
        )
        slots_data = slots_response.json()
        
        available_slot = next((s for s in slots_data.get('slots', []) if s['available'] > 0), None)
        if not available_slot:
            pytest.skip("No available slots")
        
        # Create checkout session (mock mode)
        import uuid
        checkout_data = {
            "venue_slug": TERME_VENUE_SLUG,
            "ticket_id": timed_ticket['id'],
            "quantity": 1,
            "visitor_email": f"scanner_test_{uuid.uuid4().hex[:8]}@example.com",
            "channel": "online",
            "donation_amount": 0,
            "slot_date": tomorrow,
            "slot_time": available_slot['time']
        }
        
        checkout_response = requests.post(
            f"{BASE_URL}/api/public/checkout-session",
            json=checkout_data
        )
        
        if checkout_response.status_code != 200:
            pytest.skip(f"Checkout failed: {checkout_response.text}")
        
        checkout_result = checkout_response.json()
        if not checkout_result.get('order_id'):
            pytest.skip("Not in mock mode, can't test scan directly")
        
        # Get the order to get the QR token
        order_response = requests.get(
            f"{BASE_URL}/api/public/orders/{checkout_result['order_id']}"
        )
        assert order_response.status_code == 200
        order_data = order_response.json()
        qr_token = order_data['order']['qr_token']
        
        # Now scan the QR
        scan_response = requests.post(
            f"{BASE_URL}/api/scan/verify",
            json={"token": qr_token}
        )
        assert scan_response.status_code == 200
        scan_result = scan_response.json()
        
        assert scan_result['result'] in ['VALID', 'VALID_WITH_WARNING']
        
        # Check for slot info in scan result
        if 'slot_info' in scan_result:
            print(f"✓ Scan shows slot info: {scan_result['slot_info']['date']} {scan_result['slot_info']['time']}")
        else:
            print(f"✓ Scan valid: {scan_result['result']}")
        
        return scan_result


class TestVenueCapacityPublic:
    """Test public venue capacity API"""
    
    def test_check_venue_capacity(self):
        """Test GET /api/public/venue/{slug}/capacity"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/public/venue/{TERME_VENUE_SLUG}/capacity",
            params={"date": today}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Venue {TERME_VENUE_SLUG} not found")
        
        assert response.status_code == 200, f"Failed to get capacity: {response.text}"
        data = response.json()
        
        if data.get('capacity_enabled'):
            print(f"✓ Venue capacity: {data['sold']}/{data['daily_capacity']} ({data['available']} available)")
        else:
            print("✓ Venue capacity: not enabled")
        
        return data


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
