"""
Test suite for P2 Features:
- Dashboard Analytics with advanced charts data
- Season Passes CRUD
- Season Pass verification API
- CSV Export
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cultural-pass.preview.emergentagent.com')

# Test credentials
DEMO_ADMIN = {"email": "demo@qrgate.com", "password": "Demo1234!"}
SUPERADMIN = {"email": "admin@qrgate.com", "password": "Admin1234!"}


class TestAuthentication:
    """Authentication tests"""
    
    def test_demo_admin_login(self):
        """Test demo admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert "venue" in data
        assert data["user"]["email"] == DEMO_ADMIN["email"]
        print(f"✓ Demo admin login successful - token: {data['token'][:30]}...")

    def test_superadmin_login(self):
        """Test superadmin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "superadmin"
        print(f"✓ Superadmin login successful")


class TestDashboardAnalytics:
    """Test Dashboard Analytics endpoint for charts data"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_ADMIN)
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_analytics_endpoint_exists(self, auth_headers):
        """Test analytics endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Analytics endpoint returned data with keys: {list(data.keys())}")
        
    def test_analytics_has_required_fields(self, auth_headers):
        """Test analytics returns required fields for charts"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check for KPI data
        assert "current" in data
        assert "changes" in data
        
        # Check current period data
        current = data.get("current", {})
        assert "revenue_cents" in current or "tickets" in current
        print(f"✓ Analytics has current period data: {current}")
        
        # Check comparison changes
        changes = data.get("changes", {})
        print(f"✓ Analytics has comparison data: {changes}")
        
    def test_analytics_has_daily_revenue(self, auth_headers):
        """Test analytics returns daily revenue for trend chart"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics?days=30", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have daily_revenue for line chart
        assert "daily_revenue" in data
        daily_revenue = data["daily_revenue"]
        assert isinstance(daily_revenue, dict)
        print(f"✓ Daily revenue data available: {len(daily_revenue)} days")
        
    def test_analytics_has_channel_split(self, auth_headers):
        """Test analytics returns channel split for pie chart"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have channel_split for donut chart
        assert "channel_split" in data
        channel = data["channel_split"]
        assert "entrance" in channel or "online" in channel
        print(f"✓ Channel split data: {channel}")
        
    def test_analytics_has_ticket_breakdown(self, auth_headers):
        """Test analytics returns ticket breakdown for bar chart"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have ticket_breakdown for performance bars
        assert "ticket_breakdown" in data
        breakdown = data["ticket_breakdown"]
        assert isinstance(breakdown, list)
        print(f"✓ Ticket breakdown available: {len(breakdown)} ticket types")
        
    def test_analytics_day_and_hour_data(self, auth_headers):
        """Test analytics has day of week and hour sales data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Day of week data for heatmap
        assert "day_of_week_sales" in data
        print(f"✓ Day of week sales: {data.get('day_of_week_sales', {})}")
        
        # Hour data for area chart  
        assert "hour_sales" in data
        print(f"✓ Hour sales data available")
        
    def test_analytics_country_data(self, auth_headers):
        """Test analytics has country data for geographic map"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Country data for geographic map
        assert "countries" in data
        countries = data["countries"]
        assert isinstance(countries, list)
        print(f"✓ Country data available: {len(countries)} countries")


class TestCSVExport:
    """Test CSV Export functionality"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_ADMIN)
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_csv_export_endpoint(self, auth_headers):
        """Test CSV export returns file"""
        response = requests.get(f"{BASE_URL}/api/dashboard/reports/export", headers=auth_headers)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert len(response.content) > 0
        print(f"✓ CSV export successful - size: {len(response.content)} bytes")


class TestSeasonPassesCRUD:
    """Test Season Passes CRUD operations"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_ADMIN)
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_season_passes(self, auth_headers):
        """Test listing season passes"""
        response = requests.get(f"{BASE_URL}/api/dashboard/season-passes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get season passes: {len(data)} passes found")
        
    def test_create_season_pass(self, auth_headers):
        """Test creating a season pass"""
        pass_data = {
            "name": f"TEST_Annual Pass {uuid.uuid4().hex[:6]}",
            "description": "Test annual subscription",
            "price": 5000,  # €50.00
            "visits_allowed": -1,  # Unlimited
            "valid_days": 365,
            "ticket_types": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dashboard/season-passes", 
            json=pass_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == pass_data["name"]
        assert data["price"] == pass_data["price"]
        assert data["visits_allowed"] == -1
        assert data["active"] == True
        print(f"✓ Created season pass: {data['name']} (ID: {data['id']})")
        
        return data["id"]
    
    def test_update_season_pass(self, auth_headers):
        """Test updating a season pass"""
        # First create a pass
        pass_data = {
            "name": f"TEST_Update Pass {uuid.uuid4().hex[:6]}",
            "description": "To be updated",
            "price": 3000,
            "visits_allowed": 10,
            "valid_days": 180,
            "ticket_types": []
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/dashboard/season-passes",
            json=pass_data,
            headers=auth_headers
        )
        assert create_resp.status_code == 200
        pass_id = create_resp.json()["id"]
        
        # Now update it
        update_data = {
            "name": f"TEST_Updated Pass {uuid.uuid4().hex[:6]}",
            "description": "Updated description",
            "price": 4000,
            "visits_allowed": 15,
            "valid_days": 365,
            "ticket_types": []
        }
        
        response = requests.put(
            f"{BASE_URL}/api/dashboard/season-passes/{pass_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["price"] == 4000
        assert data["visits_allowed"] == 15
        print(f"✓ Updated season pass: {data['name']}")
        
    def test_delete_season_pass(self, auth_headers):
        """Test deactivating a season pass"""
        # First create a pass
        pass_data = {
            "name": f"TEST_Delete Pass {uuid.uuid4().hex[:6]}",
            "description": "To be deleted",
            "price": 2000,
            "visits_allowed": 5,
            "valid_days": 30,
            "ticket_types": []
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/dashboard/season-passes",
            json=pass_data,
            headers=auth_headers
        )
        assert create_resp.status_code == 200
        pass_id = create_resp.json()["id"]
        
        # Delete (deactivate) it
        response = requests.delete(
            f"{BASE_URL}/api/dashboard/season-passes/{pass_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"✓ Deleted (deactivated) season pass: {pass_id}")
        
    def test_get_season_pass_holders(self, auth_headers):
        """Test listing season pass holders"""
        response = requests.get(f"{BASE_URL}/api/dashboard/season-pass-holders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get season pass holders: {len(data)} holders found")


class TestPublicSeasonPassAPI:
    """Test public season pass endpoints"""
    
    def test_public_season_passes_endpoint(self):
        """Test getting public season passes for a venue"""
        response = requests.get(f"{BASE_URL}/api/public/venue/museo-civico-brescia/season-passes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public season passes for museo-civico-brescia: {len(data)} active passes")


class TestSeasonPassVerification:
    """Test season pass verification endpoint"""
    
    def test_verify_pass_invalid_token(self):
        """Test verifying an invalid season pass token"""
        response = requests.post(
            f"{BASE_URL}/api/scan/verify-pass",
            json={"token": "invalid-token-12345"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "INVALID"
        print(f"✓ Invalid season pass correctly rejected: {data['message']}")
        
    def test_verify_pass_endpoint_exists(self):
        """Test that verify-pass endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/scan/verify-pass",
            json={"token": "test-token"}
        )
        # Should return 200 with INVALID result, not 404
        assert response.status_code == 200
        print(f"✓ Season pass verification endpoint exists")


class TestDashboardStats:
    """Test Dashboard Stats endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_ADMIN)
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_stats_endpoint(self, auth_headers):
        """Test dashboard stats returns expected structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "today" in data
        assert "week" in data
        assert "month" in data
        assert "validation_rate" in data
        assert "channel_split" in data
        print(f"✓ Dashboard stats structure valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
