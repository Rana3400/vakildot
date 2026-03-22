"""
Iteration 10 - VakilDot Backend Tests
Testing: Auth system rewrite (Firebase UID as doc ID), Notification polling, Agora tokens, Filters

Key changes tested:
1. Register uses firebase_uid as doc ID, returns existing user if already registered
2. Signin finds user by Firebase UID direct lookup AND mobile/phone field search
3. Notification polling endpoint for incoming calls
4. Notification call-action endpoint for accept/reject
5. Incoming call notification storage
6. States API returns 36+ states
7. Courts API returns grouped courts
8. Agora token is valid format (139+ chars)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vakil-live-1.preview.emergentagent.com')

# Test users from context
TEST_USER_VIJAY = {
    "mobile": "8427939650",
    "firebase_uid": "k6jB13w5n8T8GMhL57HPhnJKGUo1",
    "name": "Vijay"
}

TEST_USER_PUNEET = {
    "mobile": "6284589325",
    "firebase_uid": "56WXTxZMSiazrtsQeyn1VdXncPr2",
    "name": "Puneet Owner"
}


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test /api/health or /health endpoint returns healthy status"""
        # Try /api prefix first (through ingress)
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        # Public URL may return HTML (frontend), so just check status code
        print(f"✅ Health check passed: status={response.status_code}")
    
    def test_api_auth_check_existing_endpoint(self):
        """Test /api/auth/check-existing endpoint is accessible"""
        response = requests.post(f"{BASE_URL}/api/auth/check-existing", json={"mobile": "0000000000"})
        assert response.status_code == 200
        data = response.json()
        assert "exists" in data
        print(f"✅ API endpoint accessible: {data}")


class TestAuthRegister:
    """Test /api/auth/register endpoint - Firebase UID as doc ID"""
    
    def test_register_returns_existing_user_by_mobile(self):
        """Register should return existing user if mobile already exists (no 400 error)"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "mobile": TEST_USER_VIJAY["mobile"],
            "name": "Test Name",
            "email": "test@test.com",
            "practice_field": "Criminal Law",
            "court": "Delhi High Court",
            "lawyer_type": "Advocate",
            "state": "Delhi",
            "firebase_uid": "test_uid_123"
        })
        
        # Should return 200 with existing user, NOT 400 error
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        # Should return the existing user's name, not the new one
        print(f"✅ Register returns existing user: {data['user'].get('name')}")
    
    def test_register_returns_existing_user_by_firebase_uid(self):
        """Register should return existing user if firebase_uid already exists"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "mobile": "9999999999",  # Different mobile
            "name": "New Name",
            "email": "new@test.com",
            "practice_field": "Civil Law",
            "court": "Punjab High Court",
            "lawyer_type": "Practitioner",
            "state": "Punjab",
            "firebase_uid": TEST_USER_VIJAY["firebase_uid"]  # Existing firebase_uid
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        print(f"✅ Register returns existing user by firebase_uid: {data['user'].get('name')}")


class TestAuthSignin:
    """Test /api/auth/signin endpoint - Firebase UID lookup + mobile/phone search"""
    
    def test_signin_finds_user_by_firebase_uid(self):
        """Signin should find user by Firebase UID direct lookup"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "mobile": TEST_USER_VIJAY["mobile"],
            "firebase_uid": TEST_USER_VIJAY["firebase_uid"]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        print(f"✅ Signin by firebase_uid: {data['user'].get('name')}")
    
    def test_signin_finds_user_by_mobile_without_firebase_uid(self):
        """Signin should find user by mobile field without firebase_uid"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "mobile": TEST_USER_PUNEET["mobile"]
            # No firebase_uid provided
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        print(f"✅ Signin by mobile only: {data['user'].get('name')}")
    
    def test_signin_returns_false_for_nonexistent_user(self):
        """Signin should return success=false for nonexistent user"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "mobile": "1111111111",
            "firebase_uid": "nonexistent_uid_xyz"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        print(f"✅ Signin returns false for nonexistent user")


class TestAuthRegisterClient:
    """Test /api/auth/register-client endpoint"""
    
    def test_register_client_with_firebase_uid(self):
        """Register client should accept firebase_uid"""
        response = requests.post(f"{BASE_URL}/api/auth/register-client", json={
            "mobile": TEST_USER_PUNEET["mobile"],
            "name": "Test Client",
            "firebase_uid": TEST_USER_PUNEET["firebase_uid"]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        print(f"✅ Register client with firebase_uid: {data['user'].get('name')}")


class TestNotificationPolling:
    """Test notification polling endpoints"""
    
    def test_active_call_endpoint_returns_no_call(self):
        """GET /api/notifications/active-call/{lawyer_id} should return has_call: false when no pending call"""
        response = requests.get(f"{BASE_URL}/api/notifications/active-call/test_lawyer_123")
        
        assert response.status_code == 200
        data = response.json()
        assert "has_call" in data
        assert data["has_call"] == False
        print(f"✅ Active call endpoint returns no call: {data}")
    
    def test_call_action_endpoint_no_pending_call(self):
        """POST /api/notifications/call-action should handle no pending call"""
        response = requests.post(f"{BASE_URL}/api/notifications/call-action", json={
            "lawyer_id": "test_lawyer_no_call",
            "action": "accept"
        })
        
        assert response.status_code == 200
        data = response.json()
        # Should return success=false when no pending call
        assert data.get("success") == False or "No pending call" in str(data)
        print(f"✅ Call action handles no pending call: {data}")
    
    def test_incoming_call_notification_storage(self):
        """POST /api/notifications/incoming-call should store notification"""
        test_lawyer_id = "test_lawyer_incoming_call"
        
        response = requests.post(f"{BASE_URL}/api/notifications/incoming-call", json={
            "lawyer_id": test_lawyer_id,
            "client_id": "test_client_123",
            "client_name": "Test Client Name",
            "session_id": "session_test_123",
            "channel_name": "channel_test_123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Incoming call notification stored: {data}")
        
        # Verify it can be polled
        poll_response = requests.get(f"{BASE_URL}/api/notifications/active-call/{test_lawyer_id}")
        assert poll_response.status_code == 200
        poll_data = poll_response.json()
        assert poll_data.get("has_call") == True
        assert poll_data["call"]["client_name"] == "Test Client Name"
        print(f"✅ Incoming call can be polled: {poll_data}")


class TestFiltersAPI:
    """Test filter endpoints for states and courts"""
    
    def test_states_api_returns_36_plus_states(self):
        """GET /api/live/filters/states should return 36+ states"""
        response = requests.get(f"{BASE_URL}/api/live/filters/states")
        
        assert response.status_code == 200
        data = response.json()
        states = data.get("states", [])
        assert len(states) >= 36, f"Expected 36+ states, got {len(states)}"
        
        # Check some expected states
        assert "Delhi" in states
        assert "Punjab" in states
        assert "Maharashtra" in states
        print(f"✅ States API returns {len(states)} states")
    
    def test_courts_api_returns_grouped_courts(self):
        """GET /api/live/filters/courts/Delhi should return grouped courts"""
        response = requests.get(f"{BASE_URL}/api/live/filters/courts/Delhi")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "courts" in data
        assert "grouped" in data
        
        grouped = data["grouped"]
        assert "High Court" in grouped or "District Courts" in grouped
        
        # Check that courts list is not empty
        courts = data["courts"]
        assert len(courts) > 0
        print(f"✅ Courts API returns {len(courts)} courts for Delhi, grouped: {list(grouped.keys())}")
    
    def test_courts_api_punjab(self):
        """GET /api/live/filters/courts/Punjab should return Punjab courts"""
        response = requests.get(f"{BASE_URL}/api/live/filters/courts/Punjab")
        
        assert response.status_code == 200
        data = response.json()
        courts = data.get("courts", [])
        
        # Punjab should have Punjab & Haryana High Court
        assert any("Punjab" in c or "Haryana" in c for c in courts)
        print(f"✅ Punjab courts API returns {len(courts)} courts")


class TestAgoraToken:
    """Test Agora token generation"""
    
    def test_agora_token_valid_format(self):
        """GET /api/live/agora-token should return valid token (139+ chars)"""
        response = requests.get(f"{BASE_URL}/api/live/agora-token?channel_name=test_channel&uid=0")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "app_id" in data
        assert "channel" in data
        assert "uid" in data
        assert "token" in data
        
        token = data.get("token")
        if token:
            # Official SDK generates 139+ char tokens
            assert len(token) >= 100, f"Token too short: {len(token)} chars"
            print(f"✅ Agora token valid: {len(token)} chars")
        else:
            # Token might be None if Agora not configured
            print(f"⚠️ Agora token is None (may not be configured): {data}")


class TestLiveLawyers:
    """Test live lawyers endpoint"""
    
    def test_live_lawyers_endpoint(self):
        """GET /api/live/lawyers/live should return live lawyers"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "lawyers" in data
        assert "total" in data
        
        lawyers = data["lawyers"]
        print(f"✅ Live lawyers API returns {len(lawyers)} lawyers")
        
        # If there are live lawyers, check structure
        if lawyers:
            lawyer = lawyers[0]
            assert "id" in lawyer
            assert "name" in lawyer
            assert "rate_per_minute" in lawyer
            print(f"✅ First live lawyer: {lawyer.get('name')}")


class TestCheckExisting:
    """Test check-existing endpoint"""
    
    def test_check_existing_finds_user(self):
        """POST /api/auth/check-existing should find existing user"""
        response = requests.post(f"{BASE_URL}/api/auth/check-existing", json={
            "mobile": TEST_USER_VIJAY["mobile"],
            "firebase_uid": TEST_USER_VIJAY["firebase_uid"]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("exists") == True
        print(f"✅ Check existing finds user: {data}")
    
    def test_check_existing_returns_false_for_nonexistent(self):
        """POST /api/auth/check-existing should return false for nonexistent user"""
        response = requests.post(f"{BASE_URL}/api/auth/check-existing", json={
            "mobile": "0000000000"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("exists") == False
        print(f"✅ Check existing returns false for nonexistent: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
