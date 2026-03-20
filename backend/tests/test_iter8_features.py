"""
Iteration 8 Backend Tests - VakilDot Bug Fix Verification
Tests:
1. Homepage API returns live lawyers
2. States API returns 36+ states  
3. Courts API returns grouped courts
4. Signin API checks both mobile and phone fields across lawyers and clients
5. Check-existing API works
6. Register API stores both mobile and phone
7. Register-client API works
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vakil-live-1.preview.emergentagent.com')

class TestLiveLawyersAPI:
    """Test live lawyers endpoint - /api/live/lawyers/live"""
    
    def test_live_lawyers_returns_data(self):
        """GET /api/live/lawyers/live should return lawyers list"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200
        data = response.json()
        assert "lawyers" in data
        assert "total" in data
        assert isinstance(data["lawyers"], list)
        print(f"Live lawyers count: {data['total']}")
        
    def test_live_lawyers_have_required_fields(self):
        """Each lawyer should have id, name, rate_per_minute"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200
        data = response.json()
        for lawyer in data["lawyers"]:
            assert "id" in lawyer
            assert "name" in lawyer
            assert "rate_per_minute" in lawyer
            # Rate should be 20
            assert lawyer["rate_per_minute"] == 20, f"Rate should be 20, got {lawyer['rate_per_minute']}"
            print(f"Lawyer: {lawyer['name']} - ₹{lawyer['rate_per_minute']}/min")


class TestFiltersAPI:
    """Test filter endpoints for states and courts"""
    
    def test_states_api_returns_36_plus_states(self):
        """GET /api/live/filters/states should return 36+ states/UTs"""
        response = requests.get(f"{BASE_URL}/api/live/filters/states")
        assert response.status_code == 200
        data = response.json()
        assert "states" in data
        assert len(data["states"]) >= 36, f"Should have 36+ states, got {len(data['states'])}"
        print(f"States count: {len(data['states'])}")
        
        # Check some expected states
        states = data["states"]
        assert "Delhi" in states
        assert "Punjab" in states
        assert "Maharashtra" in states
        assert "Karnataka" in states
        
    def test_courts_api_returns_grouped_courts(self):
        """GET /api/live/filters/courts/Delhi should return grouped courts"""
        response = requests.get(f"{BASE_URL}/api/live/filters/courts/Delhi")
        assert response.status_code == 200
        data = response.json()
        assert "courts" in data
        assert "grouped" in data
        
        # Check grouped structure
        grouped = data["grouped"]
        assert "High Court" in grouped
        assert "District Courts" in grouped
        assert "Other Courts" in grouped
        
        # Check Delhi High Court present
        assert "Delhi High Court" in grouped["High Court"]
        print(f"Delhi courts: {len(data['courts'])} courts in {len(grouped)} groups")
        
    def test_chandigarh_courts(self):
        """GET /api/live/filters/courts/Chandigarh should return Chandigarh specific courts"""
        response = requests.get(f"{BASE_URL}/api/live/filters/courts/Chandigarh")
        assert response.status_code == 200
        data = response.json()
        assert "grouped" in data
        print(f"Chandigarh courts: {len(data['courts'])} total")


class TestAuthAPIs:
    """Test authentication endpoints for bug fixes"""
    
    def test_signin_returns_user_not_found_for_nonexistent(self):
        """POST /api/auth/signin should return success=false for nonexistent user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signin",
            json={"mobile": "1111111111"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "not found" in data.get("message", "").lower()
        
    def test_signin_requires_mobile_field(self):
        """POST /api/auth/signin should require mobile field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signin",
            json={}
        )
        assert response.status_code == 400
        
    def test_check_existing_returns_false_for_new_number(self):
        """POST /api/auth/check-existing should return exists=false for new number"""
        response = requests.post(
            f"{BASE_URL}/api/auth/check-existing",
            json={"mobile": f"99{uuid.uuid4().hex[:8]}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] == False
        
    def test_check_existing_requires_mobile(self):
        """POST /api/auth/check-existing should require mobile"""
        response = requests.post(
            f"{BASE_URL}/api/auth/check-existing",
            json={}
        )
        assert response.status_code == 400


class TestRegisterAPIs:
    """Test registration endpoints"""
    
    def test_register_lawyer_stores_both_mobile_and_phone(self):
        """POST /api/auth/register should store both mobile and phone fields"""
        test_mobile = f"TEST{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "mobile": test_mobile,
                "name": "Test Lawyer Iter8",
                "email": f"test{uuid.uuid4().hex[:4]}@test.com",
                "practice_field": "Criminal Law",
                "court": "Delhi High Court",
                "lawyer_type": "Advocate",
                "chamber_number": "123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "token" in data
        assert "user" in data
        
        # Both mobile and phone should be present
        user = data["user"]
        assert user.get("mobile") == test_mobile
        assert user.get("phone") == test_mobile
        assert user.get("user_role") == "lawyer"
        print(f"Registered lawyer with mobile={test_mobile}")
        
    def test_register_lawyer_rejects_duplicate(self):
        """POST /api/auth/register should reject duplicate mobile"""
        test_mobile = f"DUPE{uuid.uuid4().hex[:6]}"
        
        # First registration
        response1 = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "mobile": test_mobile,
                "name": "Dupe Test",
                "email": f"dupe{uuid.uuid4().hex[:4]}@test.com"
            }
        )
        assert response1.status_code == 200
        
        # Second registration with same mobile should fail
        response2 = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "mobile": test_mobile,
                "name": "Dupe Test 2",
                "email": f"dupe2{uuid.uuid4().hex[:4]}@test.com"
            }
        )
        assert response2.status_code == 400


class TestRegisterClientAPI:
    """Test client registration endpoint"""
    
    def test_register_client_stores_in_clients_collection(self):
        """POST /api/auth/register-client should store user with user_role=client"""
        test_mobile = f"CLI{uuid.uuid4().hex[:7]}"
        response = requests.post(
            f"{BASE_URL}/api/auth/register-client",
            json={
                "mobile": test_mobile,
                "name": "Test Client Iter8"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "token" in data
        assert "user" in data
        
        user = data["user"]
        assert user.get("mobile") == test_mobile
        assert user.get("phone") == test_mobile
        assert user.get("user_role") == "client"
        print(f"Registered client with mobile={test_mobile}")
        
    def test_register_client_rejects_duplicate(self):
        """POST /api/auth/register-client should reject duplicate mobile"""
        test_mobile = f"CDUP{uuid.uuid4().hex[:6]}"
        
        # First registration
        response1 = requests.post(
            f"{BASE_URL}/api/auth/register-client",
            json={"mobile": test_mobile, "name": "Client Dupe Test"}
        )
        assert response1.status_code == 200
        
        # Second registration should fail
        response2 = requests.post(
            f"{BASE_URL}/api/auth/register-client",
            json={"mobile": test_mobile, "name": "Client Dupe Test 2"}
        )
        assert response2.status_code == 400


class TestWalletAPIs:
    """Test wallet related APIs"""
    
    def test_wallet_get_returns_balance(self):
        """GET /api/live/wallet/{user_id} should return balance"""
        response = requests.get(f"{BASE_URL}/api/live/wallet/test_user_iter8")
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "currency" in data
        assert data["currency"] == "INR"
        
    def test_wallet_recharge(self):
        """POST /api/live/wallet/recharge should add funds"""
        user_id = f"test_iter8_{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/live/wallet/recharge",
            json={"user_id": user_id, "amount": 100}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["new_balance"] >= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
