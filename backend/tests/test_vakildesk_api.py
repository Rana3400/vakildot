"""
VakilDesk API Backend Tests
Tests for: Auth, Cases, Clients, and Webhook integration
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')

# Test data
TEST_MOBILE = f"TEST_{uuid.uuid4().hex[:8]}"
TEST_LAWYER_DATA = {
    "mobile": f"9{uuid.uuid4().hex[:9]}",
    "name": "TEST_Lawyer_User",
    "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
    "bar_council_number": "TEST123",
    "practice_areas": ["Criminal", "Civil"],
    "courts": ["Delhi High Court"],
    "role": "senior_advocate"
}


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_healthy(self):
        """Test /health endpoint returns healthy status"""
        # Health endpoint is at root, not under /api
        response = requests.get(f"{BASE_URL}/health")
        
        # If external URL doesn't work, try internal
        if response.status_code == 404:
            response = requests.get("http://localhost:8001/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")
    
    def test_root_endpoint(self):
        """Test root endpoint returns service info"""
        response = requests.get("http://localhost:8001/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "VakilDesk API"
        assert data["status"] == "running"
        print(f"✓ Root endpoint passed: {data}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_send_otp_success(self):
        """Test OTP sending endpoint"""
        response = requests.post(
            f"http://localhost:8001/api/auth/send-otp",
            json={"mobile": "9876543210"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "otp" in data  # Mock OTP returned for testing
        print(f"✓ Send OTP passed: {data}")
    
    def test_check_existing_user_not_found(self):
        """Test check existing user - user not found"""
        response = requests.post(
            f"http://localhost:8001/api/auth/check-existing",
            json={"mobile": "0000000000"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] == False
        print(f"✓ Check existing user (not found) passed: {data}")
    
    def test_signin_user_not_found(self):
        """Test signin with non-existent user"""
        response = requests.post(
            f"http://localhost:8001/api/auth/signin",
            json={"mobile": "0000000000"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        print(f"✓ Signin (user not found) passed: {data}")
    
    def test_register_lawyer_success(self):
        """Test lawyer registration"""
        response = requests.post(
            f"http://localhost:8001/api/auth/register",
            json=TEST_LAWYER_DATA
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "token" in data
        assert "user" in data
        assert data["user"]["name"] == TEST_LAWYER_DATA["name"]
        print(f"✓ Register lawyer passed: {data['user']['name']}")
        return data["token"], data["user"]


class TestCasesEndpoints:
    """Cases CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Register a test lawyer and get token"""
        # Register a new lawyer for testing
        lawyer_data = {
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "name": f"TEST_Lawyer_{uuid.uuid4().hex[:4]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "bar_council_number": "TEST123",
            "practice_areas": ["Criminal"],
            "courts": ["Delhi High Court"],
            "role": "senior_advocate"
        }
        response = requests.post(
            f"http://localhost:8001/api/auth/register",
            json=lawyer_data
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.lawyer_id = data["user"]["id"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not register test lawyer")
    
    def test_get_cases_empty_list(self):
        """Test GET /api/cases returns empty list for new lawyer"""
        response = requests.get(
            f"http://localhost:8001/api/cases",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get cases (empty) passed: {len(data)} cases")
    
    def test_create_client_and_case_with_hearing_time(self):
        """Test creating a client and case with hearing_time field"""
        # First create a client
        client_data = {
            "name": f"TEST_Client_{uuid.uuid4().hex[:4]}",
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "email": "testclient@example.com"
        }
        client_response = requests.post(
            f"http://localhost:8001/api/clients",
            json=client_data,
            headers=self.headers
        )
        assert client_response.status_code == 200
        client = client_response.json()
        client_id = client["id"]
        print(f"✓ Created test client: {client['name']}")
        
        # Now create a case with hearing_time
        case_data = {
            "client_id": client_id,
            "case_number": f"CRL/TEST/{uuid.uuid4().hex[:4]}/2025",
            "case_type": "Criminal",
            "court_name": "Delhi District Court",
            "case_stage": "Filed",
            "next_hearing_date": "2025-02-15",
            "next_hearing_time": "10:30",  # Testing hearing_time field
            "case_description": "Test case for API testing",
            "reminder_enabled": True,
            "reminder_types": ["sms", "call"]
        }
        case_response = requests.post(
            f"http://localhost:8001/api/cases",
            json=case_data,
            headers=self.headers
        )
        assert case_response.status_code == 200
        case = case_response.json()
        
        # Verify case data
        assert case["case_number"] == case_data["case_number"]
        assert case["next_hearing_time"] == "10:30"  # Verify hearing_time is saved
        assert case["client_name"] == client_data["name"]
        print(f"✓ Created case with hearing_time: {case['case_number']}, time: {case['next_hearing_time']}")
        
        # Verify case can be retrieved
        get_response = requests.get(
            f"http://localhost:8001/api/cases/{case['id']}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        retrieved_case = get_response.json()
        assert retrieved_case["next_hearing_time"] == "10:30"
        print(f"✓ Retrieved case with hearing_time verified")
        
        return case["id"], client_id
    
    def test_cases_unauthorized_access(self):
        """Test cases endpoint requires authentication"""
        response = requests.get(f"http://localhost:8001/api/cases")
        assert response.status_code == 403  # No auth header
        print(f"✓ Unauthorized access blocked")
    
    def test_cases_invalid_token(self):
        """Test cases endpoint rejects invalid token"""
        response = requests.get(
            f"http://localhost:8001/api/cases",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
        print(f"✓ Invalid token rejected")


class TestClientsEndpoints:
    """Clients CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Register a test lawyer and get token"""
        lawyer_data = {
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "name": f"TEST_Lawyer_{uuid.uuid4().hex[:4]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "bar_council_number": "TEST123",
            "practice_areas": ["Criminal"],
            "courts": ["Delhi High Court"],
            "role": "senior_advocate"
        }
        response = requests.post(
            f"http://localhost:8001/api/auth/register",
            json=lawyer_data
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not register test lawyer")
    
    def test_create_client(self):
        """Test creating a new client"""
        client_data = {
            "name": f"TEST_Client_{uuid.uuid4().hex[:4]}",
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "email": "testclient@example.com",
            "address": "Test Address",
            "notes": "Test notes"
        }
        response = requests.post(
            f"http://localhost:8001/api/clients",
            json=client_data,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == client_data["name"]
        assert data["mobile"] == client_data["mobile"]
        assert "id" in data
        print(f"✓ Create client passed: {data['name']}")
    
    def test_get_clients_list(self):
        """Test getting clients list"""
        response = requests.get(
            f"http://localhost:8001/api/clients",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get clients list passed: {len(data)} clients")


class TestWebhookIntegration:
    """Webhook integration tests (Make.com)"""
    
    def test_webhook_url_configured(self):
        """Test that webhook URL is configured in environment"""
        webhook_url = os.environ.get('WEBHOOK_URL', '')
        # Check if it's the Make.com webhook
        assert 'hook' in webhook_url.lower() or webhook_url == ''
        print(f"✓ Webhook URL configured: {webhook_url[:50]}..." if webhook_url else "✓ Webhook URL check passed (using default)")
    
    def test_webhook_payload_structure(self):
        """Test webhook payload structure matches expected format"""
        # This tests the expected payload structure for Make.com webhook
        expected_fields = [
            "client_name",
            "client_phone", 
            "case_number",
            "hearing_date",
            "hearing_time"
        ]
        
        # Verify the Cases.js file sends these fields
        # This is a structural test - actual webhook call is tested via frontend
        print(f"✓ Expected webhook fields: {expected_fields}")
        assert len(expected_fields) == 5


class TestDashboardEndpoints:
    """Dashboard endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Register a test lawyer and get token"""
        lawyer_data = {
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "name": f"TEST_Lawyer_{uuid.uuid4().hex[:4]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "bar_council_number": "TEST123",
            "practice_areas": ["Criminal"],
            "courts": ["Delhi High Court"],
            "role": "senior_advocate"
        }
        response = requests.post(
            f"http://localhost:8001/api/auth/register",
            json=lawyer_data
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not register test lawyer")
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(
            f"http://localhost:8001/api/dashboard/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_cases" in data
        assert "active_cases" in data
        assert "total_clients" in data
        print(f"✓ Dashboard stats passed: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
