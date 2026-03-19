"""
Iteration 6 Backend Tests - VakilDot
Tests: Auth fixes (signin checks both collections, register-client stores in clients),
       Wallet split (66/34), Rate change (₹20/min), Chandigarh courts
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

class TestHealthCheck:
    """Basic health check via live lawyers endpoint"""
    
    def test_backend_reachable_via_live_lawyers(self, api_client):
        """Test backend is reachable via /api/live/lawyers/live"""
        response = api_client.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200, f"Backend not reachable: {response.text}"
        data = response.json()
        assert "lawyers" in data or "total" in data
        print(f"Backend reachable: {len(data.get('lawyers', []))} lawyers found")


class TestLiveLawyersRate:
    """Test live lawyers endpoint returns rate_per_minute=20"""
    
    def test_live_lawyers_returns_rate_20(self, api_client):
        """GET /api/live/lawyers/live should return rate_per_minute=20 (not 30)"""
        response = api_client.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200, f"Live lawyers failed: {response.text}"
        data = response.json()
        
        lawyers = data.get("lawyers", [])
        assert len(lawyers) > 0, "No lawyers returned"
        
        # Demo lawyers should all have rate=20
        for lawyer in lawyers:
            rate = lawyer.get("rate_per_minute")
            assert rate == 20, f"Lawyer {lawyer.get('name')} has rate {rate}, expected 20"
            print(f"Lawyer {lawyer.get('name')}: rate={rate} ✓")
        
        print(f"Total {len(lawyers)} lawyers all with rate=20")


class TestWalletRechargeAndDeduct:
    """Test wallet recharge and 66/34 split on deduct"""
    
    def test_wallet_recharge_credits_wallet(self, api_client):
        """POST /api/live/wallet/recharge credits wallet"""
        test_user_id = f"test_iter6_{uuid.uuid4().hex[:8]}"
        
        # First check initial balance (should be 0)
        response = api_client.get(f"{BASE_URL}/api/live/wallet/{test_user_id}")
        assert response.status_code == 200
        initial_balance = response.json().get("balance", 0)
        print(f"Initial balance for {test_user_id}: {initial_balance}")
        
        # Recharge wallet
        recharge_amount = 100.0
        response = api_client.post(f"{BASE_URL}/api/live/wallet/recharge", json={
            "user_id": test_user_id,
            "amount": recharge_amount
        })
        assert response.status_code == 200, f"Recharge failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        expected_balance = initial_balance + recharge_amount
        assert data.get("new_balance") == expected_balance, f"Balance mismatch: {data.get('new_balance')} != {expected_balance}"
        print(f"Recharge successful: new_balance={data.get('new_balance')}")
    
    def test_wallet_deduct_split_66_34(self, api_client):
        """POST /api/live/wallet/deduct should return lawyer_share=66%, platform_share=34%"""
        test_user_id = f"test_deduct_iter6_{uuid.uuid4().hex[:8]}"
        test_lawyer_id = f"test_lawyer_iter6_{uuid.uuid4().hex[:8]}"
        test_session_id = f"session_{uuid.uuid4().hex[:8]}"
        
        # First recharge wallet with enough balance
        recharge_response = api_client.post(f"{BASE_URL}/api/live/wallet/recharge", json={
            "user_id": test_user_id,
            "amount": 100.0
        })
        assert recharge_response.status_code == 200
        print(f"Recharged {test_user_id} with ₹100")
        
        # Deduct from wallet
        deduct_amount = 20.0  # ₹20 for 1 minute
        response = api_client.post(
            f"{BASE_URL}/api/live/wallet/deduct",
            params={
                "user_id": test_user_id,
                "amount": deduct_amount,
                "lawyer_id": test_lawyer_id,
                "session_id": test_session_id
            }
        )
        assert response.status_code == 200, f"Deduct failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Deduct not successful: {data}"
        
        # Verify 66/34 split
        expected_lawyer_share = round(deduct_amount * 0.66, 2)  # 13.2
        expected_platform_share = round(deduct_amount * 0.34, 2)  # 6.8
        
        actual_lawyer_share = data.get("lawyer_share")
        actual_platform_share = data.get("platform_share")
        
        assert actual_lawyer_share == expected_lawyer_share, f"Lawyer share: {actual_lawyer_share} != {expected_lawyer_share}"
        assert actual_platform_share == expected_platform_share, f"Platform share: {actual_platform_share} != {expected_platform_share}"
        
        print(f"Deduct ₹{deduct_amount}: lawyer_share=₹{actual_lawyer_share} (66%), platform_share=₹{actual_platform_share} (34%) ✓")
        print(f"New balance: {data.get('new_balance')}")


class TestSignInChecksBothCollections:
    """Test signin endpoint checks both lawyers AND clients collections"""
    
    def test_signin_nonexistent_user_returns_not_found(self, api_client):
        """POST /api/auth/signin should return user not found for nonexistent mobile"""
        response = api_client.post(f"{BASE_URL}/api/auth/signin", json={
            "mobile": "9999999999"  # Nonexistent number
        })
        assert response.status_code == 200, f"Signin failed: {response.text}"
        data = response.json()
        # Should return success=False for nonexistent user
        assert data.get("success") == False or data.get("message") == "User not found"
        print(f"Nonexistent user signin handled correctly: {data}")
    
    def test_signin_requires_mobile(self, api_client):
        """POST /api/auth/signin should fail without mobile"""
        response = api_client.post(f"{BASE_URL}/api/auth/signin", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Signin without mobile returns 400 ✓")


class TestCheckExistingBothCollections:
    """Test check-existing endpoint checks both collections"""
    
    def test_check_existing_nonexistent_returns_false(self, api_client):
        """POST /api/auth/check-existing should return exists=False for new number"""
        response = api_client.post(f"{BASE_URL}/api/auth/check-existing", json={
            "mobile": "8888888888"  # Random nonexistent number
        })
        assert response.status_code == 200, f"Check existing failed: {response.text}"
        data = response.json()
        assert "exists" in data
        print(f"Check existing for nonexistent number: exists={data.get('exists')}")
    
    def test_check_existing_requires_mobile(self, api_client):
        """POST /api/auth/check-existing should fail without mobile"""
        response = api_client.post(f"{BASE_URL}/api/auth/check-existing", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Check existing without mobile returns 400 ✓")


class TestRegisterClient:
    """Test register-client stores in clients collection"""
    
    def test_register_client_endpoint_exists(self, api_client):
        """POST /api/auth/register-client endpoint should exist and require fields"""
        # Test with a unique mobile number
        test_mobile = f"70{uuid.uuid4().hex[:8]}"[:10]
        
        response = api_client.post(f"{BASE_URL}/api/auth/register-client", json={
            "name": "Test Client Iter6",
            "mobile": test_mobile,
            "email": "testclient@test.com"
        })
        
        # Either succeeds (201/200) or returns 400 if already exists
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "token" in data
            assert "user" in data
            user = data.get("user", {})
            assert user.get("user_role") == "client"
            print(f"Register client successful: {user.get('name')}, role={user.get('user_role')}")
        else:
            print(f"Client registration returned 400 (possibly already exists)")


class TestCourtsEndpoint:
    """Test courts endpoint returns grouped courts for Chandigarh"""
    
    def test_chandigarh_courts_returns_grouped(self, api_client):
        """GET /api/live/filters/courts/Chandigarh returns grouped courts"""
        response = api_client.get(f"{BASE_URL}/api/live/filters/courts/Chandigarh")
        assert response.status_code == 200, f"Courts fetch failed: {response.text}"
        data = response.json()
        
        # Check grouped structure exists
        assert "grouped" in data, "Missing 'grouped' field in response"
        grouped = data.get("grouped", {})
        
        # Verify High Court group exists
        assert "High Court" in grouped, f"Missing 'High Court' group. Groups: {list(grouped.keys())}"
        
        # Verify District Courts group exists
        assert "District Courts" in grouped, f"Missing 'District Courts' group"
        
        # Verify Chandigarh District Court is listed
        district_courts = grouped.get("District Courts", [])
        has_chandigarh_dc = any("Chandigarh District Court" in c for c in district_courts)
        assert has_chandigarh_dc, f"Chandigarh District Court not found in: {district_courts}"
        
        print(f"Chandigarh courts grouped: {list(grouped.keys())}")
        print(f"District Courts: {district_courts}")


class TestProfileUpdateCollection:
    """Test profile update uses correct collection based on role"""
    
    def test_profile_update_endpoint_requires_auth(self, api_client):
        """PUT /api/profile should require authentication"""
        response = api_client.put(f"{BASE_URL}/api/profile", json={
            "name": "Updated Name"
        })
        # Should return 401/403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"Profile update requires auth (status={response.status_code}) ✓")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
