"""
VakilDot Iteration 7 Tests
Tests for:
1. Backend health check (via /api/live/lawyers/live)
2. GET /api/live/lawyers/live returns rate_per_minute=20
3. POST /api/live/wallet/deduct returns 66/34 split
4. POST /api/live/wallet/withdraw creates pending withdrawal
5. GET /api/live/wallet/earnings/{lawyer_id} returns earnings breakdown
6. POST /api/auth/signin checks both lawyers and clients collections
7. POST /api/auth/register-client stores in clients collection
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vakil-live-1.preview.emergentagent.com').rstrip('/')

class TestBackendHealth:
    """Health check via live lawyers endpoint"""
    
    def test_backend_reachable(self):
        """Backend should be reachable via live lawyers endpoint"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200, f"Backend not reachable: {response.status_code}"
        data = response.json()
        assert "lawyers" in data
        assert "total" in data
        print(f"PASS: Backend reachable, {data['total']} lawyers online")


class TestLiveLawyersRate:
    """Test that all live lawyers have rate_per_minute=20"""
    
    def test_all_lawyers_rate_20(self):
        """All live lawyers should have rate_per_minute=20"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200
        data = response.json()
        lawyers = data.get("lawyers", [])
        
        assert len(lawyers) > 0, "No lawyers returned (expected at least demo lawyers)"
        
        for lawyer in lawyers:
            rate = lawyer.get("rate_per_minute")
            assert rate == 20, f"Lawyer {lawyer.get('name')} has rate {rate}, expected 20"
            print(f"PASS: Lawyer {lawyer.get('name')} has correct rate ₹{rate}/min")


class TestWalletDeductSplit:
    """Test wallet deduct with 66/34 split"""
    
    def test_deduct_66_34_split(self):
        """POST /api/live/wallet/deduct should return 66% lawyer / 34% platform split"""
        # First recharge wallet for test user
        test_user_id = f"test_client_iter7_{uuid.uuid4().hex[:8]}"
        test_lawyer_id = f"test_lawyer_iter7_{uuid.uuid4().hex[:8]}"
        
        # Recharge client wallet
        recharge_response = requests.post(f"{BASE_URL}/api/live/wallet/recharge", json={
            "user_id": test_user_id,
            "amount": 100
        })
        assert recharge_response.status_code == 200
        recharge_data = recharge_response.json()
        assert recharge_data.get("success") == True
        print(f"PASS: Recharged wallet for {test_user_id}: ₹{recharge_data.get('new_balance')}")
        
        # Deduct from wallet with 66/34 split
        deduct_response = requests.post(
            f"{BASE_URL}/api/live/wallet/deduct",
            params={
                "user_id": test_user_id,
                "amount": 20,
                "lawyer_id": test_lawyer_id,
                "session_id": f"session_iter7_{int(time.time())}"
            }
        )
        assert deduct_response.status_code == 200
        deduct_data = deduct_response.json()
        
        assert deduct_data.get("success") == True
        
        # Verify 66/34 split
        lawyer_share = deduct_data.get("lawyer_share")
        platform_share = deduct_data.get("platform_share")
        
        # For ₹20: lawyer gets 66% = ₹13.2, platform gets 34% = ₹6.8
        assert lawyer_share == 13.2, f"Lawyer share {lawyer_share}, expected 13.2 (66%)"
        assert platform_share == 6.8, f"Platform share {platform_share}, expected 6.8 (34%)"
        
        print(f"PASS: Deduct split correct - Lawyer: ₹{lawyer_share} (66%), Platform: ₹{platform_share} (34%)")


class TestWalletWithdraw:
    """Test wallet withdrawal endpoint"""
    
    def test_withdraw_minimum_100(self):
        """Withdrawal should require minimum ₹100"""
        test_lawyer_id = f"test_withdraw_iter7_{uuid.uuid4().hex[:8]}"
        
        # First recharge with ₹50 so insufficient balance doesn't trigger first
        recharge_response = requests.post(f"{BASE_URL}/api/live/wallet/recharge", json={
            "user_id": test_lawyer_id,
            "amount": 50
        })
        assert recharge_response.status_code == 200
        
        # Try to withdraw less than ₹100 (should fail due to minimum)
        response = requests.post(f"{BASE_URL}/api/live/wallet/withdraw", json={
            "lawyer_id": test_lawyer_id,
            "amount": 50,
            "bank_account": "1234567890",
            "ifsc": "SBIN0001234"
        })
        
        # Should return 400 for minimum amount
        assert response.status_code == 400, f"Expected 400 for below minimum, got {response.status_code}"
        data = response.json()
        assert "minimum" in data.get("detail", "").lower() or "100" in str(data)
        print(f"PASS: Withdrawal correctly rejects amounts below ₹100")
    
    def test_withdraw_success(self):
        """Successful withdrawal should deduct from wallet and create pending withdrawal"""
        test_lawyer_id = f"test_withdraw_success_iter7_{uuid.uuid4().hex[:8]}"
        
        # First recharge lawyer wallet
        recharge_response = requests.post(f"{BASE_URL}/api/live/wallet/recharge", json={
            "user_id": test_lawyer_id,
            "amount": 500
        })
        assert recharge_response.status_code == 200
        initial_balance = recharge_response.json().get("new_balance", 500)
        print(f"PASS: Recharged lawyer wallet: ₹{initial_balance}")
        
        # Withdraw ₹200
        withdraw_response = requests.post(f"{BASE_URL}/api/live/wallet/withdraw", json={
            "lawyer_id": test_lawyer_id,
            "amount": 200,
            "bank_account": "1234567890",
            "ifsc": "SBIN0001234"
        })
        assert withdraw_response.status_code == 200
        withdraw_data = withdraw_response.json()
        
        assert withdraw_data.get("success") == True
        assert withdraw_data.get("status") == "pending"
        assert withdraw_data.get("new_balance") == initial_balance - 200
        assert withdraw_data.get("withdrawal_amount") == 200
        
        print(f"PASS: Withdrawal successful - New balance: ₹{withdraw_data.get('new_balance')}, Status: {withdraw_data.get('status')}")
    
    def test_withdraw_insufficient_balance(self):
        """Withdrawal should fail if insufficient balance"""
        test_lawyer_id = f"test_withdraw_insuff_iter7_{uuid.uuid4().hex[:8]}"
        
        # Don't recharge - try to withdraw from empty wallet
        response = requests.post(f"{BASE_URL}/api/live/wallet/withdraw", json={
            "lawyer_id": test_lawyer_id,
            "amount": 200,
            "bank_account": "1234567890",
            "ifsc": "SBIN0001234"
        })
        
        assert response.status_code == 400
        print(f"PASS: Withdrawal correctly fails with insufficient balance")


class TestLawyerEarnings:
    """Test lawyer earnings endpoint"""
    
    def test_earnings_endpoint(self):
        """GET /api/live/wallet/earnings/{lawyer_id} should return earnings breakdown"""
        test_lawyer_id = f"test_earnings_iter7_{uuid.uuid4().hex[:8]}"
        
        response = requests.get(f"{BASE_URL}/api/live/wallet/earnings/{test_lawyer_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Should have all required fields
        assert "total_earned" in data
        assert "total_calls" in data
        assert "total_withdrawn" in data
        assert "current_balance" in data
        
        print(f"PASS: Earnings endpoint returns: earned=₹{data.get('total_earned')}, calls={data.get('total_calls')}, withdrawn=₹{data.get('total_withdrawn')}, balance=₹{data.get('current_balance')}")


class TestAuthSignIn:
    """Test signin checks both lawyers and clients collections"""
    
    def test_signin_requires_mobile(self):
        """Signin should require mobile field"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={})
        assert response.status_code == 400
        print(f"PASS: Signin requires mobile field")
    
    def test_signin_nonexistent_user(self):
        """Signin should return success=false for nonexistent user"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "mobile": "9999999999"  # Nonexistent number
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        print(f"PASS: Signin returns success=false for nonexistent user")


class TestRegisterClient:
    """Test client registration stores in clients collection"""
    
    def test_register_client_returns_client_role(self):
        """Register client should return user with user_role='client'"""
        test_mobile = f"99999{uuid.uuid4().hex[:5]}"  # Random mobile
        
        response = requests.post(f"{BASE_URL}/api/auth/register-client", json={
            "name": f"Test Client {test_mobile}",
            "mobile": test_mobile,
            "email": f"test_{test_mobile}@example.com"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "user" in data
        assert "token" in data
        
        user = data.get("user")
        assert user.get("user_role") == "client", f"Expected user_role='client', got {user.get('user_role')}"
        assert user.get("name") == f"Test Client {test_mobile}"
        
        print(f"PASS: Register client creates user with user_role='client'")
    
    def test_register_client_duplicate(self):
        """Register client should fail for duplicate mobile"""
        test_mobile = f"88888{uuid.uuid4().hex[:5]}"
        
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/auth/register-client", json={
            "name": "First User",
            "mobile": test_mobile
        })
        assert response1.status_code == 200
        
        # Second registration with same mobile
        response2 = requests.post(f"{BASE_URL}/api/auth/register-client", json={
            "name": "Second User",
            "mobile": test_mobile
        })
        assert response2.status_code == 400
        print(f"PASS: Register client rejects duplicate mobile")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
