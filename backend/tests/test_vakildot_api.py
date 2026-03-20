"""
VakilDot API Backend Tests - Iteration 2
Tests for: Health, Live Lawyers, Client Endpoints, PWA, Auth, Cases, Clients
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vakil-live-1.preview.emergentagent.com')

# Test data
TEST_LAWYER_DATA = {
    "mobile": f"9{uuid.uuid4().hex[:9]}",
    "name": "TEST_Lawyer_User",
    "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
    "practice_field": "Criminal Law",
    "court": "Delhi High Court",
    "lawyer_type": "senior"
}


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_endpoint_internal(self):
        """Test /health endpoint returns healthy status (internal)"""
        response = requests.get("http://localhost:8001/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "VakilDot"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")
    
    def test_root_endpoint(self):
        """Test root endpoint returns service info"""
        response = requests.get("http://localhost:8001/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "VakilDot API"
        assert data["status"] == "running"
        print(f"✓ Root endpoint passed: {data}")


class TestLiveLawyersEndpoint:
    """Live lawyers endpoint tests - homepage lawyer cards"""
    
    def test_get_live_lawyers_returns_list(self):
        """Test GET /api/live/lawyers/live returns lawyers list with profile_photo"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200
        data = response.json()
        assert "lawyers" in data
        assert "total" in data
        assert isinstance(data["lawyers"], list)
        print(f"✓ Live lawyers endpoint returned {data['total']} lawyers")
        
        # Check that lawyers have expected fields including profile_photo
        if data["lawyers"]:
            lawyer = data["lawyers"][0]
            expected_fields = ["id", "name", "profile_photo", "rate_per_minute", "specialization", "court", "is_live"]
            for field in expected_fields:
                assert field in lawyer, f"Missing field: {field}"
            print(f"✓ Lawyer structure verified: {lawyer['name']} - profile_photo: {lawyer.get('profile_photo')}")


class TestPWAEndpoints:
    """PWA manifest and service worker tests"""
    
    def test_manifest_json_served(self):
        """Test PWA manifest.json is accessible and has correct content"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        assert data["short_name"] == "VakilDot"
        assert data["name"] == "VakilDot - Legal Consultation Platform"
        assert "icons" in data
        assert len(data["icons"]) >= 3
        assert data["display"] == "standalone"
        assert data["theme_color"] == "#0f172a"
        print(f"✓ Manifest.json verified: {data['name']}")
    
    def test_service_worker_served(self):
        """Test service-worker.js is accessible"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        assert response.status_code == 200
        assert "CACHE_NAME" in response.text
        assert "vakildot" in response.text.lower()
        print(f"✓ Service worker served (length: {len(response.text)} chars)")
    
    def test_pwa_icons_accessible(self):
        """Test PWA icons are accessible"""
        # Test logo192.png
        response_192 = requests.head(f"{BASE_URL}/logo192.png")
        assert response_192.status_code == 200
        assert "image/png" in response_192.headers.get("content-type", "")
        
        # Test logo512.png
        response_512 = requests.head(f"{BASE_URL}/logo512.png")
        assert response_512.status_code == 200
        assert "image/png" in response_512.headers.get("content-type", "")
        
        print(f"✓ PWA icons accessible: logo192.png, logo512.png")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
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


class TestClientEndpoints:
    """Client-specific endpoints tests - /api/client/my-lawyer and /api/client/my-cases"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Register a test user and get token"""
        lawyer_data = {
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "name": f"TEST_Lawyer_{uuid.uuid4().hex[:4]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "practice_field": "Criminal Law",
            "court": "Delhi High Court",
            "lawyer_type": "senior"
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
            pytest.skip("Could not register test user")
    
    def test_client_my_lawyer_endpoint_exists(self):
        """Test /api/client/my-lawyer endpoint exists"""
        # This endpoint requires client role, lawyer role should get 403
        response = requests.get(
            f"http://localhost:8001/api/client/my-lawyer",
            headers=self.headers
        )
        # 403 means endpoint exists but client access only
        assert response.status_code == 403
        data = response.json()
        assert "Client access only" in data.get("detail", "")
        print(f"✓ /api/client/my-lawyer endpoint exists (returns 403 for lawyer)")
    
    def test_client_my_cases_endpoint_exists(self):
        """Test /api/client/my-cases endpoint exists"""
        # This endpoint requires client role, lawyer role should get 403
        response = requests.get(
            f"http://localhost:8001/api/client/my-cases",
            headers=self.headers
        )
        # 403 means endpoint exists but client access only
        assert response.status_code == 403
        data = response.json()
        assert "Client access only" in data.get("detail", "")
        print(f"✓ /api/client/my-cases endpoint exists (returns 403 for lawyer)")
    
    def test_client_endpoints_require_auth(self):
        """Test client endpoints require authentication"""
        # /api/client/my-lawyer without auth
        response1 = requests.get(f"http://localhost:8001/api/client/my-lawyer")
        assert response1.status_code == 403  # No Bearer token
        
        # /api/client/my-cases without auth  
        response2 = requests.get(f"http://localhost:8001/api/client/my-cases")
        assert response2.status_code == 403
        
        print(f"✓ Client endpoints require authentication")


class TestProfileUploadEndpoint:
    """Profile photo upload endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Register a test user and get token"""
        lawyer_data = {
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "name": f"TEST_Lawyer_{uuid.uuid4().hex[:4]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "practice_field": "Criminal Law",
            "court": "Delhi High Court"
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
            pytest.skip("Could not register test user")
    
    def test_profile_upload_photo_endpoint_exists(self):
        """Test /api/profile/upload-photo endpoint exists"""
        # Test without file to check endpoint exists
        response = requests.post(
            f"http://localhost:8001/api/profile/upload-photo",
            headers=self.headers
        )
        # Should return 422 (no file) or 400, not 404
        assert response.status_code != 404
        print(f"✓ /api/profile/upload-photo endpoint exists (status: {response.status_code})")


class TestCasesEndpoints:
    """Cases CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Register a test lawyer and get token"""
        lawyer_data = {
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "name": f"TEST_Lawyer_{uuid.uuid4().hex[:4]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "practice_field": "Criminal Law",
            "court": "Delhi High Court"
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
    
    def test_create_client_and_case(self):
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
            "next_hearing_time": "10:30",
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
        
        assert case["case_number"] == case_data["case_number"]
        assert case["next_hearing_time"] == "10:30"
        print(f"✓ Created case with hearing_time: {case['case_number']}")
    
    def test_cases_unauthorized_access(self):
        """Test cases endpoint requires authentication"""
        response = requests.get(f"http://localhost:8001/api/cases")
        assert response.status_code == 403
        print(f"✓ Unauthorized access blocked")


class TestDashboardEndpoints:
    """Dashboard endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Register a test lawyer and get token"""
        lawyer_data = {
            "mobile": f"9{uuid.uuid4().hex[:9]}",
            "name": f"TEST_Lawyer_{uuid.uuid4().hex[:4]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "practice_field": "Criminal Law",
            "court": "Delhi High Court"
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
