#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class AyurCareAPITester:
    def __init__(self, base_url="https://herb-tracker-4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_patient_id = None
        self.test_doctor_id = None
        self.test_inventory_id = None
        self.test_appointment_id = None
        self.test_bill_id = None
        self.test_room_id = None
        self.test_staff_id = None
        self.test_salary_payment_id = None
        self.test_expense_id = None

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
        except json.JSONDecodeError:
            return False, {"error": "Invalid JSON response"}, response.status_code

    # ==================== AUTH TESTS ====================
    
    def test_register_admin(self):
        """Test admin user registration"""
        test_email = f"admin_test_{datetime.now().strftime('%H%M%S')}@ayurcare.com"
        data = {
            "email": test_email,
            "password": "admin123",
            "name": "Test Admin",
            "role": "admin"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', data, 200)
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_result("Admin Registration", True)
            return True
        else:
            self.log_result("Admin Registration", False, f"Status: {status}, Response: {response}")
            return False

    def test_login_with_provided_credentials(self):
        """Test login with provided admin credentials"""
        data = {
            "email": "admin@ayurcare.com",
            "password": "admin123"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', data, 200)
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_result("Login with Provided Credentials", True)
            return True
        else:
            self.log_result("Login with Provided Credentials", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response, status = self.make_request('GET', 'auth/me', expected_status=200)
        if success and 'id' in response:
            self.log_result("Get Current User", True)
            return True
        else:
            self.log_result("Get Current User", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== DOCTOR TESTS ====================
    
    def test_create_doctor(self):
        """Create a test doctor"""
        test_email = f"doctor_test_{datetime.now().strftime('%H%M%S')}@ayurcare.com"
        data = {
            "email": test_email,
            "password": "doctor123",
            "name": "Dr. Test Ayurveda",
            "role": "doctor"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', data, 200)
        if success and 'user' in response:
            self.test_doctor_id = response['user']['id']
            self.log_result("Create Doctor", True)
            return True
        else:
            self.log_result("Create Doctor", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_doctors(self):
        """Test getting doctors list"""
        success, response, status = self.make_request('GET', 'doctors', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Doctors List", True)
            # If we don't have a test doctor, use the first one from the list
            if not self.test_doctor_id and len(response) > 0:
                self.test_doctor_id = response[0]['id']
            return True
        else:
            self.log_result("Get Doctors List", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== ROOM TESTS ====================
    
    def test_create_room(self):
        """Create a test room"""
        room_number = f"TEST-{datetime.now().strftime('%H%M%S')}"
        data = {
            "room_number": room_number,
            "room_type": "general",
            "daily_rate": 1500.0
        }
        
        success, response, status = self.make_request('POST', 'rooms', data, 200)
        if success and 'id' in response:
            self.test_room_id = response['id']
            self.log_result("Create Room", True)
            return True
        else:
            self.log_result("Create Room", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_rooms(self):
        """Test getting rooms list"""
        success, response, status = self.make_request('GET', 'rooms', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Rooms List", True)
            return True
        else:
            self.log_result("Get Rooms List", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_available_rooms(self):
        """Test getting available rooms"""
        success, response, status = self.make_request('GET', 'rooms/available', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Available Rooms", True)
            return True
        else:
            self.log_result("Get Available Rooms", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== PATIENT TESTS ====================
    
    def test_create_patient(self):
        """Test patient creation"""
        data = {
            "name": "Test Patient Ayurveda",
            "age": 35,
            "gender": "male",
            "phone": "9876543210",
            "address": "123 Test Street, Test City",
            "medical_history": "No major medical history",
            "prakriti": "vata-pitta"
        }
        
        success, response, status = self.make_request('POST', 'patients', data, 200)
        if success and 'id' in response:
            self.test_patient_id = response['id']
            self.log_result("Create Patient", True)
            return True
        else:
            self.log_result("Create Patient", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_patients(self):
        """Test getting patients list"""
        success, response, status = self.make_request('GET', 'patients', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Patients List", True)
            return True
        else:
            self.log_result("Get Patients List", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_patient_by_id(self):
        """Test getting specific patient"""
        if not self.test_patient_id:
            self.log_result("Get Patient by ID", False, "No test patient ID available")
            return False
            
        success, response, status = self.make_request('GET', f'patients/{self.test_patient_id}', expected_status=200)
        if success and response.get('id') == self.test_patient_id:
            self.log_result("Get Patient by ID", True)
            return True
        else:
            self.log_result("Get Patient by ID", False, f"Status: {status}, Response: {response}")
            return False

    def test_patient_checkin_op(self):
        """Test OP patient check-in"""
        if not self.test_patient_id:
            self.log_result("Patient OP Check-in", False, "No test patient ID available")
            return False
            
        data = {
            "patient_id": self.test_patient_id,
            "patient_type": "OP",
            "doctor_id": self.test_doctor_id,
            "reason": "Regular consultation for Ayurvedic treatment"
        }
        
        success, response, status = self.make_request('POST', 'patients/checkin', data, 200)
        if success and response.get('patient_type') == 'OP':
            self.log_result("Patient OP Check-in", True)
            return True
        else:
            self.log_result("Patient OP Check-in", False, f"Status: {status}, Response: {response}")
            return False

    def test_patient_checkout(self):
        """Test patient check-out"""
        if not self.test_patient_id:
            self.log_result("Patient Check-out", False, "No test patient ID available")
            return False
            
        success, response, status = self.make_request('POST', f'patients/{self.test_patient_id}/checkout', {}, 200)
        if success and response.get('status') == 'discharged':
            self.log_result("Patient Check-out", True)
            return True
        else:
            self.log_result("Patient Check-out", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== INVENTORY TESTS ====================
    
    def test_create_inventory_item(self):
        """Test inventory item creation"""
        data = {
            "name": "Test Ashwagandha Powder",
            "category": "herbs",
            "quantity": 100,
            "unit": "grams",
            "min_stock": 20,
            "purchase_price": 250.50,
            "markup_percentage": 20,
            "supplier": "Test Ayurvedic Suppliers",
            "batch_number": f"BATCH-{datetime.now().strftime('%Y%m%d')}",
            "expiry_date": (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        }
        
        success, response, status = self.make_request('POST', 'inventory', data, 200)
        if success and 'id' in response:
            self.test_inventory_id = response['id']
            self.log_result("Create Inventory Item", True)
            return True
        else:
            self.log_result("Create Inventory Item", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_inventory(self):
        """Test getting inventory list"""
        success, response, status = self.make_request('GET', 'inventory', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Inventory List", True)
            return True
        else:
            self.log_result("Get Inventory List", False, f"Status: {status}, Response: {response}")
            return False

    def test_update_inventory_stock(self):
        """Test inventory stock update"""
        if not self.test_inventory_id:
            self.log_result("Update Inventory Stock", False, "No test inventory ID available")
            return False
            
        data = {
            "quantity_change": -10,
            "reason": "Patient treatment usage"
        }
        
        success, response, status = self.make_request('POST', f'inventory/{self.test_inventory_id}/update-stock', data, 200)
        if success and 'quantity' in response:
            self.log_result("Update Inventory Stock", True)
            return True
        else:
            self.log_result("Update Inventory Stock", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== APPOINTMENT TESTS ====================
    
    def test_create_appointment(self):
        """Test appointment creation"""
        if not self.test_patient_id or not self.test_doctor_id:
            self.log_result("Create Appointment", False, "Missing patient or doctor ID")
            return False
            
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        data = {
            "patient_id": self.test_patient_id,
            "doctor_id": self.test_doctor_id,
            "date": tomorrow,
            "time": "10:00",
            "treatment_type": "Panchakarma",
            "notes": "Initial consultation for Panchakarma treatment"
        }
        
        success, response, status = self.make_request('POST', 'appointments', data, 200)
        if success and 'id' in response:
            self.test_appointment_id = response['id']
            self.log_result("Create Appointment", True)
            return True
        else:
            self.log_result("Create Appointment", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_appointments(self):
        """Test getting appointments list"""
        success, response, status = self.make_request('GET', 'appointments', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Appointments List", True)
            return True
        else:
            self.log_result("Get Appointments List", False, f"Status: {status}, Response: {response}")
            return False

    def test_update_appointment_status(self):
        """Test appointment status update"""
        if not self.test_appointment_id:
            self.log_result("Update Appointment Status", False, "No test appointment ID available")
            return False
            
        success, response, status = self.make_request('PUT', f'appointments/{self.test_appointment_id}/status?status=completed', {}, 200)
        if success and response.get('status') == 'completed':
            self.log_result("Update Appointment Status", True)
            return True
        else:
            self.log_result("Update Appointment Status", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== BILLING TESTS ====================
    
    def test_create_bill(self):
        """Test bill creation"""
        if not self.test_patient_id:
            self.log_result("Create Bill", False, "No test patient ID available")
            return False
            
        data = {
            "patient_id": self.test_patient_id,
            "items": [
                {"name": "Ashwagandha Powder", "quantity": 2, "price": 250.50},
                {"name": "Consultation Fee", "quantity": 1, "price": 500.00}
            ],
            "treatment_charges": 1000.00,
            "room_charges": 0,
            "notes": "Test bill for Ayurvedic treatment"
        }
        
        success, response, status = self.make_request('POST', 'bills', data, 200)
        if success and 'id' in response:
            self.test_bill_id = response['id']
            self.log_result("Create Bill", True)
            return True
        else:
            self.log_result("Create Bill", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_bills(self):
        """Test getting bills list"""
        success, response, status = self.make_request('GET', 'bills', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Bills List", True)
            return True
        else:
            self.log_result("Get Bills List", False, f"Status: {status}, Response: {response}")
            return False

    def test_record_payment(self):
        """Test payment recording"""
        if not self.test_bill_id:
            self.log_result("Record Payment", False, "No test bill ID available")
            return False
            
        data = {
            "bill_id": self.test_bill_id,
            "amount": 1000.00,
            "payment_method": "cash"
        }
        
        success, response, status = self.make_request('POST', 'bills/payment', data, 200)
        if success and 'paid_amount' in response:
            self.log_result("Record Payment", True)
            return True
        else:
            self.log_result("Record Payment", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== REPORTS TESTS ====================
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response, status = self.make_request('GET', 'reports/dashboard', expected_status=200)
        if success and 'patients' in response and 'inventory' in response:
            self.log_result("Dashboard Statistics", True)
            return True
        else:
            self.log_result("Dashboard Statistics", False, f"Status: {status}, Response: {response}")
            return False

    def test_inventory_analytics(self):
        """Test inventory analytics"""
        success, response, status = self.make_request('GET', 'reports/inventory-analytics', expected_status=200)
        if success and 'category_stats' in response:
            self.log_result("Inventory Analytics", True)
            return True
        else:
            self.log_result("Inventory Analytics", False, f"Status: {status}, Response: {response}")
            return False

    def test_revenue_report(self):
        """Test revenue report"""
        success, response, status = self.make_request('GET', 'reports/revenue', expected_status=200)
        if success and 'daily_revenue' in response:
            self.log_result("Revenue Report", True)
            return True
        else:
            self.log_result("Revenue Report", False, f"Status: {status}, Response: {response}")
            return False

    def test_financial_report(self):
        """Test financial report with IP/OP counts, revenue breakdown, expenses, profit/loss"""
        success, response, status = self.make_request('GET', 'reports/financial', expected_status=200)
        if success and 'patients' in response and 'revenue' in response and 'expenses' in response and 'profit_loss' in response:
            # Check if it has the required fields
            patients = response.get('patients', {})
            revenue = response.get('revenue', {})
            expenses = response.get('expenses', {})
            profit_loss = response.get('profit_loss', {})
            
            required_patient_fields = ['total_ip_checkins', 'total_op_checkins', 'current_ip', 'current_op']
            required_revenue_fields = ['medicine_sales', 'treatment_revenue', 'room_revenue', 'collected']
            required_expense_fields = ['operational', 'salaries', 'total']
            required_profit_fields = ['net_profit', 'is_profit']
            
            missing_fields = []
            for field in required_patient_fields:
                if field not in patients:
                    missing_fields.append(f"patients.{field}")
            for field in required_revenue_fields:
                if field not in revenue:
                    missing_fields.append(f"revenue.{field}")
            for field in required_expense_fields:
                if field not in expenses:
                    missing_fields.append(f"expenses.{field}")
            for field in required_profit_fields:
                if field not in profit_loss:
                    missing_fields.append(f"profit_loss.{field}")
            
            if missing_fields:
                self.log_result("Financial Report", False, f"Missing fields: {missing_fields}")
                return False
            else:
                self.log_result("Financial Report", True)
                return True
        else:
            self.log_result("Financial Report", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== HR/STAFF TESTS ====================
    
    def test_create_staff(self):
        """Test staff creation"""
        data = {
            "name": "Test Staff Member",
            "email": f"staff_test_{datetime.now().strftime('%H%M%S')}@ayurcare.com",
            "phone": "9876543211",
            "role": "nurse",
            "department": "Ayurveda",
            "designation": "Senior Nurse",
            "salary": 35000.0,
            "join_date": datetime.now().strftime('%Y-%m-%d'),
            "address": "123 Staff Colony, Test City"
        }
        
        success, response, status = self.make_request('POST', 'staff', data, 200)
        if success and 'id' in response:
            self.test_staff_id = response['id']
            self.log_result("Create Staff", True)
            return True
        else:
            self.log_result("Create Staff", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_staff(self):
        """Test getting staff list"""
        success, response, status = self.make_request('GET', 'staff', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Staff List", True)
            # If we don't have a test staff, use the first one from the list
            if not hasattr(self, 'test_staff_id') and len(response) > 0:
                self.test_staff_id = response[0]['id']
            return True
        else:
            self.log_result("Get Staff List", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_staff_by_department(self):
        """Test getting staff by department"""
        success, response, status = self.make_request('GET', 'staff?department=Ayurveda', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Staff by Department", True)
            return True
        else:
            self.log_result("Get Staff by Department", False, f"Status: {status}, Response: {response}")
            return False

    def test_record_salary_payment(self):
        """Test recording salary payment"""
        if not hasattr(self, 'test_staff_id') or not self.test_staff_id:
            self.log_result("Record Salary Payment", False, "No test staff ID available")
            return False
            
        data = {
            "staff_id": self.test_staff_id,
            "month": datetime.now().strftime('%Y-%m'),
            "amount": 35000.0,
            "bonus": 2000.0,
            "deductions": 1000.0,
            "payment_date": datetime.now().strftime('%Y-%m-%d'),
            "payment_method": "bank_transfer",
            "notes": "Test salary payment"
        }
        
        success, response, status = self.make_request('POST', 'staff/salary-payment', data, 200)
        if success and 'id' in response and 'net_amount' in response:
            self.test_salary_payment_id = response['id']
            self.log_result("Record Salary Payment", True)
            return True
        else:
            self.log_result("Record Salary Payment", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_salary_payments(self):
        """Test getting salary payments list"""
        success, response, status = self.make_request('GET', 'salary-payments', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Salary Payments", True)
            return True
        else:
            self.log_result("Get Salary Payments", False, f"Status: {status}, Response: {response}")
            return False

    def test_hr_summary(self):
        """Test HR summary report"""
        success, response, status = self.make_request('GET', 'reports/hr-summary', expected_status=200)
        if success and 'total_staff' in response and 'total_monthly_salary' in response:
            self.log_result("HR Summary Report", True)
            return True
        else:
            self.log_result("HR Summary Report", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== EXPENSE TESTS ====================
    
    def test_create_expense(self):
        """Test expense creation"""
        data = {
            "category": "utilities",
            "description": "Test electricity bill payment",
            "amount": 5000.0,
            "date": datetime.now().strftime('%Y-%m-%d'),
            "vendor": "Test Electricity Board",
            "notes": "Monthly electricity bill"
        }
        
        success, response, status = self.make_request('POST', 'expenses', data, 200)
        if success and 'id' in response:
            self.test_expense_id = response['id']
            self.log_result("Create Expense", True)
            return True
        else:
            self.log_result("Create Expense", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_expenses(self):
        """Test getting expenses list"""
        success, response, status = self.make_request('GET', 'expenses', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Expenses List", True)
            return True
        else:
            self.log_result("Get Expenses List", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_expenses_by_category(self):
        """Test getting expenses by category"""
        success, response, status = self.make_request('GET', 'expenses?category=utilities', expected_status=200)
        if success and isinstance(response, list):
            self.log_result("Get Expenses by Category", True)
            return True
        else:
            self.log_result("Get Expenses by Category", False, f"Status: {status}, Response: {response}")
            return False

    # ==================== MAIN TEST RUNNER ====================
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🏥 Starting AyurCare Hospital Management System API Tests")
        print("=" * 60)
        
        # Authentication Tests
        print("\n🔐 Authentication Tests")
        if not self.test_login_with_provided_credentials():
            # If login fails, try registration
            if not self.test_register_admin():
                print("❌ Cannot proceed without authentication")
                return False
        
        self.test_get_current_user()
        
        # Setup Tests (Create required data)
        print("\n🏗️  Setup Tests")
        self.test_create_doctor()
        self.test_get_doctors()
        self.test_create_room()
        self.test_get_rooms()
        self.test_get_available_rooms()
        
        # Core Functionality Tests
        print("\n👥 Patient Management Tests")
        self.test_create_patient()
        self.test_get_patients()
        self.test_get_patient_by_id()
        self.test_patient_checkin_op()
        self.test_patient_checkout()
        
        print("\n📦 Inventory Management Tests")
        self.test_create_inventory_item()
        self.test_get_inventory()
        self.test_update_inventory_stock()
        
        print("\n📅 Appointment Management Tests")
        self.test_create_appointment()
        self.test_get_appointments()
        self.test_update_appointment_status()
        
        print("\n💰 Billing Tests")
        self.test_create_bill()
        self.test_get_bills()
        self.test_record_payment()
        
        print("\n📊 Reports & Analytics Tests")
        self.test_dashboard_stats()
        self.test_inventory_analytics()
        self.test_revenue_report()
        self.test_financial_report()
        
        print("\n👥 HR Management Tests")
        self.test_create_staff()
        self.test_get_staff()
        self.test_get_staff_by_department()
        self.test_record_salary_payment()
        self.test_get_salary_payments()
        self.test_hr_summary()
        
        print("\n💸 Expense Management Tests")
        self.test_create_expense()
        self.test_get_expenses()
        self.test_get_expenses_by_category()
        
        # Print Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return False

def main():
    """Main function"""
    tester = AyurCareAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())