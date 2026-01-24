#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class LawyerManagementAPITester:
    def __init__(self, base_url="https://legalcms-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.lawyer_id = None
        self.client_id = None
        self.case_id = None
        self.invoice_id = None
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True)
                    return True, response_data
                except:
                    self.log_test(name, True)
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Status {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Status {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION FLOW")
        print("="*50)
        
        # Test mobile number
        test_mobile = "9876543210"
        
        # 1. Send OTP
        success, response = self.run_test(
            "Send OTP",
            "POST",
            "auth/send-otp",
            200,
            data={"mobile": test_mobile}
        )
        
        if not success:
            return False
            
        otp = response.get('otp', '123456')
        
        # 2. Verify OTP (should be new user)
        success, response = self.run_test(
            "Verify OTP (New User)",
            "POST",
            "auth/verify-otp",
            200,
            data={"mobile": test_mobile, "otp": otp}
        )
        
        if not success or not response.get('is_new'):
            return False
        
        # 3. Register new lawyer
        registration_data = {
            "mobile": test_mobile,
            "name": "Test Advocate",
            "email": "test@example.com",
            "bar_council_number": "D/1234/2025",
            "practice_areas": ["Criminal Law", "Civil Law"],
            "courts": ["Delhi District Court", "Delhi High Court"],
            "role": "senior_advocate"
        }
        
        success, response = self.run_test(
            "Register Lawyer",
            "POST",
            "auth/register",
            200,
            data=registration_data
        )
        
        if success and response.get('token'):
            self.token = response['token']
            self.lawyer_id = response['lawyer']['id']
            return True
        
        return False

    def test_lawyer_profile(self):
        """Test lawyer profile operations"""
        print("\n" + "="*50)
        print("TESTING LAWYER PROFILE")
        print("="*50)
        
        # Get profile
        success, response = self.run_test(
            "Get Lawyer Profile",
            "GET",
            "lawyers/profile",
            200
        )
        
        if not success:
            return False
        
        # Update profile
        update_data = {
            "name": "Updated Test Advocate",
            "practice_areas": ["Criminal Law", "Constitutional Law"]
        }
        
        success, response = self.run_test(
            "Update Lawyer Profile",
            "PUT",
            "lawyers/profile",
            200,
            data=update_data
        )
        
        return success

    def test_client_management(self):
        """Test client CRUD operations"""
        print("\n" + "="*50)
        print("TESTING CLIENT MANAGEMENT")
        print("="*50)
        
        # Create client
        client_data = {
            "name": "Test Client",
            "mobile": "9876543211",
            "email": "client@example.com",
            "address": "Test Address",
            "notes": "Test client notes"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clients",
            200,
            data=client_data
        )
        
        if success and response.get('id'):
            self.client_id = response['id']
        else:
            return False
        
        # Get all clients
        success, response = self.run_test(
            "Get All Clients",
            "GET",
            "clients",
            200
        )
        
        if not success:
            return False
        
        # Get specific client
        success, response = self.run_test(
            "Get Specific Client",
            "GET",
            f"clients/{self.client_id}",
            200
        )
        
        if not success:
            return False
        
        # Update client
        update_data = {"name": "Updated Test Client"}
        success, response = self.run_test(
            "Update Client",
            "PUT",
            f"clients/{self.client_id}",
            200,
            data=update_data
        )
        
        return success

    def test_case_management(self):
        """Test case CRUD operations"""
        print("\n" + "="*50)
        print("TESTING CASE MANAGEMENT")
        print("="*50)
        
        if not self.client_id:
            print("❌ Cannot test cases without client_id")
            return False
        
        # Create case
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        case_data = {
            "client_id": self.client_id,
            "case_number": "CRL/123/2025",
            "fir_number": "FIR/456/2025",
            "case_type": "Criminal",
            "court_name": "Delhi District Court",
            "judge_name": "Hon'ble Judge Test",
            "case_stage": "Filed",
            "next_hearing_date": tomorrow,
            "case_description": "Test case description",
            "reminder_enabled": True,
            "reminder_types": ["sms", "call"]
        }
        
        success, response = self.run_test(
            "Create Case",
            "POST",
            "cases",
            200,
            data=case_data
        )
        
        if success and response.get('id'):
            self.case_id = response['id']
        else:
            return False
        
        # Get all cases
        success, response = self.run_test(
            "Get All Cases",
            "GET",
            "cases",
            200
        )
        
        if not success:
            return False
        
        # Get specific case
        success, response = self.run_test(
            "Get Specific Case",
            "GET",
            f"cases/{self.case_id}",
            200
        )
        
        if not success:
            return False
        
        # Get case timeline
        success, response = self.run_test(
            "Get Case Timeline",
            "GET",
            f"cases/{self.case_id}/timeline",
            200
        )
        
        if not success:
            return False
        
        # Add timeline entry
        timeline_data = {
            "case_id": self.case_id,
            "event_type": "hearing",
            "event_date": datetime.now().isoformat(),
            "description": "Test hearing entry",
            "created_by": "Test Advocate"
        }
        
        success, response = self.run_test(
            "Add Timeline Entry",
            "POST",
            f"cases/{self.case_id}/timeline",
            200,
            data=timeline_data
        )
        
        return success

    def test_billing_system(self):
        """Test billing and invoice operations"""
        print("\n" + "="*50)
        print("TESTING BILLING SYSTEM")
        print("="*50)
        
        if not self.client_id:
            print("❌ Cannot test billing without client_id")
            return False
        
        # Create invoice
        due_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        invoice_data = {
            "client_id": self.client_id,
            "case_id": self.case_id,
            "amount": 50000.0,
            "fee_type": "per_hearing",
            "description": "Legal consultation and hearing representation",
            "due_date": due_date
        }
        
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "billing/invoices",
            200,
            data=invoice_data
        )
        
        if success and response.get('id'):
            self.invoice_id = response['id']
        else:
            return False
        
        # Get all invoices
        success, response = self.run_test(
            "Get All Invoices",
            "GET",
            "billing/invoices",
            200
        )
        
        if not success:
            return False
        
        # Update invoice status
        status_data = {"status": "paid"}
        success, response = self.run_test(
            "Update Invoice Status",
            "PUT",
            f"billing/invoices/{self.invoice_id}",
            200,
            data=status_data
        )
        
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD STATS")
        print("="*50)
        
        # Get dashboard stats
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if not success:
            return False
        
        # Get recent activity
        success, response = self.run_test(
            "Get Recent Activity",
            "GET",
            "dashboard/recent-activity",
            200
        )
        
        return success

    def test_calendar_hearings(self):
        """Test calendar and hearing operations"""
        print("\n" + "="*50)
        print("TESTING CALENDAR & HEARINGS")
        print("="*50)
        
        # Get hearings
        success, response = self.run_test(
            "Get Hearings",
            "GET",
            "calendar/hearings",
            200
        )
        
        if not success:
            return False
        
        # Get holidays
        success, response = self.run_test(
            "Get Holidays",
            "GET",
            "calendar/holidays",
            200
        )
        
        return success

    def test_reminder_system(self):
        """Test reminder system (mocked)"""
        print("\n" + "="*50)
        print("TESTING REMINDER SYSTEM")
        print("="*50)
        
        if not self.case_id:
            print("❌ Cannot test reminders without case_id")
            return False
        
        # Send reminder
        success, response = self.run_test(
            "Send Reminder",
            "POST",
            f"reminders/send?case_id={self.case_id}",
            200
        )
        
        return success

    def test_document_management(self):
        """Test document upload and management"""
        print("\n" + "="*50)
        print("TESTING DOCUMENT MANAGEMENT")
        print("="*50)
        
        if not self.case_id:
            print("❌ Cannot test documents without case_id")
            return False
        
        # Create a simple base64 encoded test document
        import base64
        test_content = "This is a test document content"
        encoded_content = base64.b64encode(test_content.encode()).decode()
        
        doc_data = {
            "case_id": self.case_id,
            "document_type": "petition",
            "document_name": "Test Petition.txt",
            "file_data": encoded_content,
            "file_type": "txt"
        }
        
        success, response = self.run_test(
            "Upload Document",
            "POST",
            "documents",
            200,
            data=doc_data
        )
        
        if not success:
            return False
        
        # Get documents
        success, response = self.run_test(
            "Get Documents",
            "GET",
            f"documents?case_id={self.case_id}",
            200
        )
        
        return success

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Indian Lawyer Management System API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        
        # Test authentication first
        if not self.test_auth_flow():
            print("\n❌ Authentication tests failed. Cannot proceed with other tests.")
            return False
        
        # Run all other tests
        test_suites = [
            self.test_lawyer_profile,
            self.test_client_management,
            self.test_case_management,
            self.test_billing_system,
            self.test_dashboard_stats,
            self.test_calendar_hearings,
            self.test_reminder_system,
            self.test_document_management
        ]
        
        for test_suite in test_suites:
            try:
                test_suite()
            except Exception as e:
                print(f"❌ Test suite failed with exception: {str(e)}")
        
        # Print final results
        print("\n" + "="*60)
        print("FINAL TEST RESULTS")
        print("="*60)
        print(f"📊 Tests Run: {self.tests_run}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = LawyerManagementAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "failed_tests": tester.tests_run - tester.tests_passed,
        "success_rate": (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())