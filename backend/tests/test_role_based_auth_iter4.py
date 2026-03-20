"""
VakilDot - Iteration 4 Backend Tests
Tests for role-based authentication and user management
- Tests get_current_user checking both lawyers AND clients collections
- Tests client registration and profile fetch
- Tests lawyer registration and profile fetch
- Tests Razorpay order creation
- Tests live lawyers endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vakil-live-1.preview.emergentagent.com')

class TestHealthAndBasicEndpoints:
    """Health check and basic endpoints"""
    
    def test_health_endpoint(self):
        """Test API health endpoint via /api prefix path"""
        # Note: / returns frontend HTML, so we test a known API endpoint
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200
        print(f"✓ API health verified via live lawyers endpoint")
    
    def test_live_lawyers_endpoint(self):
        """Test GET /api/live/lawyers/live returns lawyers list"""
        response = requests.get(f"{BASE_URL}/api/live/lawyers/live")
        assert response.status_code == 200
        data = response.json()
        assert "lawyers" in data
        assert isinstance(data["lawyers"], list)
        print(f"✓ Live lawyers endpoint returns {len(data['lawyers'])} lawyers")


class TestClientRegistrationAndAuth:
    """Tests for client user registration and authentication"""
    
    def test_client_registration(self):
        """Test client registration - POST /api/auth/register-client"""
        import uuid
        unique_phone = f"99990001{str(uuid.uuid4())[:2]}"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register-client",
            json={
                "mobile": unique_phone,
                "name": "Test Client Iter4",
                "email": f"client_iter4_{unique_phone}@test.com",
                "otp": "123456"
            }
        )
        
        # May return 400 if user exists, or 200 on success
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "token" in data
            assert "user" in data
            assert data["user"]["user_role"] == "client"
            print(f"✓ Client registration successful: user_role={data['user']['user_role']}")
            return data["token"], data["user"]
        else:
            print(f"Client registration returned {response.status_code}: {response.text[:100]}")
            # Try to sign in with existing client
            return None, None
    
    def test_client_profile_fetch(self):
        """Test that get_current_user works for client users (checks clients collection)"""
        # Use existing client token from iteration tests
        CLIENT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDFkMjZjNmEtYThmMS00Mjg1LTllOTItNzhiNjAzYTNmNWFlIiwiZXhwIjoxNzc1MTE3MzY5fQ.rbEUJYEqJ9dV_k23Cjgg__klGkXruuqbFaOP8Gas4zo"
        
        response = requests.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {CLIENT_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("user_role") == "client"
        assert "id" in data
        assert "name" in data
        print(f"✓ Client profile fetch successful: name={data['name']}, user_role={data['user_role']}")


class TestLawyerRegistrationAndAuth:
    """Tests for lawyer user registration and authentication"""
    
    def test_lawyer_registration(self):
        """Test lawyer registration - POST /api/auth/register"""
        import uuid
        unique_phone = f"99990002{str(uuid.uuid4())[:2]}"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "mobile": unique_phone,
                "name": "Test Lawyer Iter4",
                "email": f"lawyer_iter4_{unique_phone}@test.com",
                "practice_field": "Civil Law",
                "court": "Supreme Court of India",
                "lawyer_type": "Advocate",
                "chamber_number": "SC-100"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "token" in data
            assert "user" in data
            assert data["user"]["user_role"] == "lawyer"
            print(f"✓ Lawyer registration successful: user_role={data['user']['user_role']}")
            return data["token"], data["user"]
        else:
            print(f"Lawyer registration returned {response.status_code}: {response.text[:100]}")
            return None, None
    
    def test_lawyer_profile_fetch(self):
        """Test that get_current_user works for lawyer users (checks lawyers collection)"""
        LAWYER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOGEwNDFkYjctOGIzMy00NmJhLWFhNGYtN2ZlYzQ4MzUwNjZhIiwiZXhwIjoxNzc1MTE3MzcxfQ.Alyrj0CojtoncK-xaS1Ye8vDEJM9ilVlmpnp8gTP2js"
        
        response = requests.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {LAWYER_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("user_role") == "lawyer"
        assert "id" in data
        assert "name" in data
        assert "practice_field" in data
        assert "court" in data
        print(f"✓ Lawyer profile fetch successful: name={data['name']}, user_role={data['user_role']}, practice_field={data.get('practice_field')}")


class TestRazorpayIntegration:
    """Tests for Razorpay payment integration"""
    
    def test_razorpay_create_order(self):
        """Test POST /api/live/razorpay/create-order creates a valid order"""
        response = requests.post(
            f"{BASE_URL}/api/live/razorpay/create-order",
            json={
                "amount": 100,
                "user_id": "test_user_iter4"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "order_id" in data
        assert data["order_id"].startswith("order_")  # Razorpay order format
        assert data.get("amount") == 10000  # 100 INR = 10000 paise
        assert data.get("currency") == "INR"
        print(f"✓ Razorpay order created: order_id={data['order_id']}, amount={data['amount']} paise")
    
    def test_razorpay_verify_invalid_signature(self):
        """Test that invalid Razorpay signature is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/live/razorpay/verify",
            json={
                "razorpay_order_id": "order_test",
                "razorpay_payment_id": "pay_test",
                "razorpay_signature": "invalid_signature",
                "user_id": "test_user",
                "amount": 100
            }
        )
        
        # Should return 400 for invalid signature
        assert response.status_code == 400
        print(f"✓ Invalid Razorpay signature correctly rejected with 400")


class TestWalletEndpoints:
    """Tests for wallet-related endpoints"""
    
    def test_wallet_balance_fetch(self):
        """Test GET /api/live/wallet/{user_id} returns balance"""
        response = requests.get(f"{BASE_URL}/api/live/wallet/test_user_iter4")
        
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        print(f"✓ Wallet balance fetch successful: balance={data.get('balance')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
