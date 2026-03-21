"""
Iteration 9 - Test OTP/reCAPTCHA fix and Lazy Loading Performance Fix
Tests:
1. Backend signin API finds user 6284589325
2. Backend check-existing API works
3. Agora token endpoint returns proper token (100+ chars with official SDK)
4. States API returns 36 states
5. Courts API returns grouped courts
6. Live lawyers API returns live lawyers
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vakil-live-1.preview.emergentagent.com').rstrip('/')

class TestAuthAPIs:
    """Test authentication endpoints - signin checks both mobile and phone fields"""
    
    def test_signin_finds_existing_user(self):
        """Test signin API finds user 6284589325 (Vijay Deshmukh)"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={"mobile": "6284589325"})
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "token" in data, "Token should be present"
        assert "user" in data, "User data should be present"
        
        user = data["user"]
        assert user.get("name") == "Vijay Deshmukh", f"Expected Vijay Deshmukh, got {user.get('name')}"
        assert user.get("user_role") == "lawyer", f"Expected lawyer role, got {user.get('user_role')}"
        print(f"PASS: Signin found user {user.get('name')} with role {user.get('user_role')}")
    
    def test_signin_returns_false_for_nonexistent_user(self):
        """Test signin returns success=false for nonexistent mobile"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={"mobile": "9999999999"})
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == False, f"Expected success=False for nonexistent user, got {data}"
        print("PASS: Signin correctly returns success=false for nonexistent user")
    
    def test_check_existing_finds_user(self):
        """Test check-existing API finds user 6284589325"""
        response = requests.post(f"{BASE_URL}/api/auth/check-existing", json={"mobile": "6284589325"})
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("exists") == True, f"Expected exists=True, got {data}"
        print("PASS: check-existing found user 6284589325")
    
    def test_check_existing_returns_false_for_nonexistent(self):
        """Test check-existing returns false for nonexistent mobile"""
        response = requests.post(f"{BASE_URL}/api/auth/check-existing", json={"mobile": "9999999999"})
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("exists") == False, f"Expected exists=False, got {data}"
        print("PASS: check-existing correctly returns false for nonexistent user")


class TestAgoraToken:
    """Test Agora token generation with official SDK"""
    
    def test_agora_token_returns_proper_token(self):
        """Test Agora token endpoint returns token 100+ characters (official SDK)"""
        response = requests.get(f"{BASE_URL}/api/live/agora-token?channel_name=test&uid=0")
        assert response.status_code == 200
        
        data = response.json()
        assert "app_id" in data, "app_id should be present"
        assert "token" in data, "token should be present"
        assert "channel" in data, "channel should be present"
        
        token = data.get("token")
        assert token is not None, "Token should not be None"
        token_length = len(token) if token else 0
        assert token_length >= 100, f"Token should be 100+ chars (official SDK), got {token_length}"
        
        print(f"PASS: Agora token generated with length {token_length} (100+ chars confirms official SDK)")
    
    def test_agora_token_with_custom_uid(self):
        """Test Agora token with custom UID"""
        response = requests.get(f"{BASE_URL}/api/live/agora-token?channel_name=consultation_123&uid=12345")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("uid") == 12345, f"Expected uid=12345, got {data.get('uid')}"
        assert data.get("channel") == "consultation_123", f"Expected channel=consultation_123"
        print("PASS: Agora token works with custom UID and channel")


class TestFiltersAPIs:
    """Test filter endpoints for states and courts"""
    
    def test_states_api_returns_36_states(self):
        """Test states API returns 36 states/UTs"""
        response = requests.get(f"{BASE_URL}/api/live/filters/states")
        assert response.status_code == 200
        
        data = response.json()
        states = data.get("states", [])
        assert len(states) == 36, f"Expected 36 states, got {len(states)}"
        
        # Check some key states are present
        assert "Delhi" in states, "Delhi should be in states"
        assert "Punjab" in states, "Punjab should be in states"
        assert "Maharashtra" in states, "Maharashtra should be in states"
        assert "Karnataka" in states, "Karnataka should be in states"
        
        print(f"PASS: States API returns {len(states)} states/UTs")
    
    def test_courts_api_returns_grouped_courts_delhi(self):
        """Test courts API returns grouped courts for Delhi"""
        response = requests.get(f"{BASE_URL}/api/live/filters/courts/Delhi")
        assert response.status_code == 200
        
        data = response.json()
        assert "courts" in data, "courts should be present"
        assert "grouped" in data, "grouped should be present"
        
        grouped = data.get("grouped", {})
        assert "High Court" in grouped, "High Court group should be present"
        assert "District Courts" in grouped, "District Courts group should be present"
        assert "Other Courts" in grouped, "Other Courts group should be present"
        
        # Check specific courts
        high_courts = grouped.get("High Court", [])
        assert "Delhi High Court" in high_courts, "Delhi High Court should be in High Court group"
        
        district_courts = grouped.get("District Courts", [])
        assert len(district_courts) > 0, "District Courts should have entries"
        
        print(f"PASS: Courts API returns grouped courts for Delhi with {len(data.get('courts', []))} total courts")
    
    def test_courts_api_returns_grouped_courts_punjab(self):
        """Test courts API returns grouped courts for Punjab"""
        response = requests.get(f"{BASE_URL}/api/live/filters/courts/Punjab")
        assert response.status_code == 200
        
        data = response.json()
        grouped = data.get("grouped", {})
        
        # Punjab uses Punjab & Haryana High Court
        high_courts = grouped.get("High Court", [])
        assert any("Punjab" in c or "Haryana" in c for c in high_courts), "Punjab High Court should be present"
        
        print(f"PASS: Courts API returns grouped courts for Punjab")
    
    def test_courts_api_national(self):
        """Test courts API returns national courts"""
        response = requests.get(f"{BASE_URL}/api/live/filters/courts/National")
        assert response.status_code == 200
        
        data = response.json()
        courts = data.get("courts", [])
        
        assert "Supreme Court of India" in courts, "Supreme Court should be in national courts"
        print(f"PASS: Courts API returns national courts including Supreme Court")


class TestLiveLawyersAPI:
    """Test live lawyers endpoint"""
    
    def test_live_lawyers_returns_lawyers(self):
        """Test live lawyers API returns live lawyers"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200
        
        data = response.json()
        assert "lawyers" in data, "lawyers should be present"
        assert "total" in data, "total should be present"
        
        lawyers = data.get("lawyers", [])
        total = data.get("total", 0)
        
        assert total >= 1, f"Expected at least 1 live lawyer, got {total}"
        
        # Check lawyer structure
        if lawyers:
            lawyer = lawyers[0]
            assert "id" in lawyer, "Lawyer should have id"
            assert "name" in lawyer, "Lawyer should have name"
            assert "rate_per_minute" in lawyer, "Lawyer should have rate_per_minute"
            assert "is_live" in lawyer, "Lawyer should have is_live"
            assert lawyer.get("is_live") == True, "Lawyer should be live"
            assert lawyer.get("rate_per_minute") == 20, f"Rate should be ₹20/min, got {lawyer.get('rate_per_minute')}"
        
        print(f"PASS: Live lawyers API returns {total} live lawyers")
    
    def test_live_lawyers_includes_known_lawyers(self):
        """Test live lawyers includes Puneet Anand or Vijay Deshmukh"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200
        
        data = response.json()
        lawyers = data.get("lawyers", [])
        
        lawyer_names = [l.get("name", "").strip() for l in lawyers]
        
        # Check if either Puneet Anand or Vijay Deshmukh is present
        has_known_lawyer = any("Puneet" in name or "Vijay" in name for name in lawyer_names)
        assert has_known_lawyer, f"Expected Puneet Anand or Vijay Deshmukh in live lawyers, got {lawyer_names}"
        
        print(f"PASS: Live lawyers includes known lawyers: {lawyer_names}")


class TestWalletAPI:
    """Test wallet endpoints"""
    
    def test_wallet_get_balance(self):
        """Test wallet balance endpoint"""
        # Use a test user ID
        response = requests.get(f"{BASE_URL}/api/live/wallet/test_user_123")
        assert response.status_code == 200
        
        data = response.json()
        assert "balance" in data, "balance should be present"
        assert "currency" in data, "currency should be present"
        assert data.get("currency") == "INR", f"Expected INR currency, got {data.get('currency')}"
        print(f"PASS: Wallet API returns balance: {data.get('balance')}")
    
    def test_live_status_endpoint(self):
        """Test live status endpoint for a lawyer"""
        response = requests.get(f"{BASE_URL}/api/live/status/56WXTxZMSiazrtsQeyn1VdXncPr2")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_live" in data, "is_live should be present"
        assert "rate_per_minute" in data, "rate_per_minute should be present"
        print(f"PASS: Live status API returns is_live={data.get('is_live')}, rate={data.get('rate_per_minute')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
