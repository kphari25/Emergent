"""
Test Suite for REQ-4 (Therapy Scheduling) and REQ-5 (Consolidated Billing with Advance Deposits)
Tests therapy types CRUD, therapy scheduling with conflict detection, advance deposits, and patient billing summary.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ayurcare.com"
ADMIN_PASSWORD = "admin1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def test_patient(auth_headers):
    """Create or get a test patient for therapy scheduling"""
    # First try to find existing test patient
    response = requests.get(f"{BASE_URL}/api/patients", headers=auth_headers)
    if response.status_code == 200:
        patients = response.json()
        for p in patients:
            if p.get('name') == 'TEST_TherapyPatient':
                return p
    
    # Create new test patient
    patient_data = {
        "name": "TEST_TherapyPatient",
        "phone": "9876543210",
        "email": "test.therapy@example.com",
        "gender": "male",
        "age": 35,
        "address": "Test Address",
        "patient_type": "OP"
    }
    response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
    if response.status_code in [200, 201]:
        return response.json()
    pytest.skip(f"Failed to create test patient: {response.text}")


@pytest.fixture(scope="module")
def female_patient(auth_headers):
    """Create or get a female test patient for gender validation tests"""
    response = requests.get(f"{BASE_URL}/api/patients", headers=auth_headers)
    if response.status_code == 200:
        patients = response.json()
        for p in patients:
            if p.get('name') == 'TEST_FemalePatient':
                return p
    
    patient_data = {
        "name": "TEST_FemalePatient",
        "phone": "9876543211",
        "email": "test.female@example.com",
        "gender": "female",
        "age": 30,
        "address": "Test Address",
        "patient_type": "OP"
    }
    response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
    if response.status_code in [200, 201]:
        return response.json()
    pytest.skip(f"Failed to create female test patient: {response.text}")


# ==================== REQ-4: THERAPY TYPES TESTS ====================

class TestTherapyTypes:
    """Tests for therapy type CRUD operations"""
    
    def test_get_therapy_types(self, auth_headers):
        """GET /api/therapy-types returns list of therapy types"""
        response = requests.get(f"{BASE_URL}/api/therapy-types", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} therapy types")
    
    def test_create_therapy_type(self, auth_headers):
        """POST /api/therapy-types creates new therapy type"""
        therapy_data = {
            "name": "TEST_Yoga Therapy",
            "category": "yoga",
            "duration_minutes": 45,
            "base_cost": 500,
            "requires_room": True,
            "gender_specific": None,
            "description": "Test yoga therapy session"
        }
        response = requests.post(f"{BASE_URL}/api/therapy-types", json=therapy_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['name'] == therapy_data['name']
        assert data['category'] == therapy_data['category']
        assert data['duration_minutes'] == therapy_data['duration_minutes']
        assert data['base_cost'] == therapy_data['base_cost']
        assert 'id' in data
        print(f"Created therapy type: {data['name']} with ID {data['id']}")
    
    def test_create_gender_specific_therapy(self, auth_headers):
        """POST /api/therapy-types creates gender-specific therapy"""
        therapy_data = {
            "name": "TEST_Male Only Therapy",
            "category": "general",
            "duration_minutes": 60,
            "base_cost": 800,
            "requires_room": True,
            "gender_specific": "male",
            "description": "Test male-only therapy"
        }
        response = requests.post(f"{BASE_URL}/api/therapy-types", json=therapy_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['gender_specific'] == "male"
        print(f"Created gender-specific therapy: {data['name']}")
    
    def test_get_therapy_types_by_category(self, auth_headers):
        """GET /api/therapy-types?category=yoga filters by category"""
        response = requests.get(f"{BASE_URL}/api/therapy-types?category=yoga", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for therapy in data:
            assert therapy['category'] == 'yoga', f"Expected yoga category, got {therapy['category']}"
        print(f"Found {len(data)} yoga therapy types")
    
    def test_update_therapy_type(self, auth_headers):
        """PUT /api/therapy-types/{id} updates therapy type"""
        # First get existing therapy types
        response = requests.get(f"{BASE_URL}/api/therapy-types", headers=auth_headers)
        therapies = response.json()
        test_therapy = next((t for t in therapies if t['name'].startswith('TEST_')), None)
        
        if not test_therapy:
            pytest.skip("No test therapy type found to update")
        
        update_data = {
            "name": test_therapy['name'],
            "category": test_therapy['category'],
            "duration_minutes": 90,
            "base_cost": 1000,
            "requires_room": True,
            "gender_specific": test_therapy.get('gender_specific'),
            "description": "Updated description"
        }
        response = requests.put(f"{BASE_URL}/api/therapy-types/{test_therapy['id']}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['duration_minutes'] == 90
        assert data['base_cost'] == 1000
        print(f"Updated therapy type: {data['name']}")


# ==================== REQ-4: THERAPY SCHEDULING TESTS ====================

class TestTherapyScheduling:
    """Tests for therapy scheduling with conflict detection"""
    
    def test_create_therapy_schedule(self, auth_headers, test_patient):
        """POST /api/therapy-schedules creates new schedule"""
        # Get a therapy type
        response = requests.get(f"{BASE_URL}/api/therapy-types", headers=auth_headers)
        therapies = response.json()
        if not therapies:
            pytest.skip("No therapy types available")
        
        therapy = therapies[0]
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        schedule_data = {
            "patient_id": test_patient['id'],
            "therapy_type_id": therapy['id'],
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "notes": "Test therapy session"
        }
        response = requests.post(f"{BASE_URL}/api/therapy-schedules", json=schedule_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['patient_id'] == test_patient['id']
        assert data['therapy_type_id'] == therapy['id']
        assert data['status'] == 'scheduled'
        assert 'id' in data
        print(f"Created therapy schedule: {data['therapy_name']} for {data['patient_name']} on {data['scheduled_date']}")
    
    def test_get_therapy_schedules(self, auth_headers):
        """GET /api/therapy-schedules returns list of schedules"""
        response = requests.get(f"{BASE_URL}/api/therapy-schedules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} therapy schedules")
    
    def test_get_schedules_by_date(self, auth_headers):
        """GET /api/therapy-schedules?date=YYYY-MM-DD filters by date"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/therapy-schedules?date={tomorrow}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for schedule in data:
            assert schedule['scheduled_date'] == tomorrow
        print(f"Found {len(data)} schedules for {tomorrow}")
    
    def test_get_schedules_by_status(self, auth_headers):
        """GET /api/therapy-schedules?status=scheduled filters by status"""
        response = requests.get(f"{BASE_URL}/api/therapy-schedules?status=scheduled", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for schedule in data:
            assert schedule['status'] == 'scheduled'
        print(f"Found {len(data)} scheduled therapy sessions")
    
    def test_get_patient_therapy_schedules(self, auth_headers, test_patient):
        """GET /api/therapy-schedules/patient/{id} returns patient's schedules"""
        response = requests.get(f"{BASE_URL}/api/therapy-schedules/patient/{test_patient['id']}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for schedule in data:
            assert schedule['patient_id'] == test_patient['id']
        print(f"Found {len(data)} schedules for patient {test_patient['name']}")
    
    def test_update_schedule_status_to_in_progress(self, auth_headers, test_patient):
        """PUT /api/therapy-schedules/{id}/status?status=in_progress updates status"""
        # Get patient's schedules
        response = requests.get(f"{BASE_URL}/api/therapy-schedules/patient/{test_patient['id']}", headers=auth_headers)
        schedules = response.json()
        scheduled = [s for s in schedules if s['status'] == 'scheduled']
        
        if not scheduled:
            pytest.skip("No scheduled therapy sessions to update")
        
        schedule = scheduled[0]
        response = requests.put(f"{BASE_URL}/api/therapy-schedules/{schedule['id']}/status?status=in_progress", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['status'] == 'in_progress'
        print(f"Updated schedule status to in_progress")
    
    def test_update_schedule_status_to_completed(self, auth_headers, test_patient):
        """PUT /api/therapy-schedules/{id}/status?status=completed updates status"""
        response = requests.get(f"{BASE_URL}/api/therapy-schedules/patient/{test_patient['id']}", headers=auth_headers)
        schedules = response.json()
        in_progress = [s for s in schedules if s['status'] == 'in_progress']
        
        if not in_progress:
            pytest.skip("No in_progress therapy sessions to complete")
        
        schedule = in_progress[0]
        response = requests.put(f"{BASE_URL}/api/therapy-schedules/{schedule['id']}/status?status=completed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'completed'
        assert 'completed_at' in data
        print(f"Updated schedule status to completed")
    
    def test_update_schedule_invalid_status(self, auth_headers, test_patient):
        """PUT /api/therapy-schedules/{id}/status with invalid status returns 400"""
        # Create a new schedule first
        response = requests.get(f"{BASE_URL}/api/therapy-types", headers=auth_headers)
        therapies = response.json()
        if not therapies:
            pytest.skip("No therapy types available")
        
        therapy = therapies[0]
        day_after = (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d')
        
        schedule_data = {
            "patient_id": test_patient['id'],
            "therapy_type_id": therapy['id'],
            "scheduled_date": day_after,
            "scheduled_time": "14:00",
            "notes": "Test for invalid status"
        }
        response = requests.post(f"{BASE_URL}/api/therapy-schedules", json=schedule_data, headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Could not create schedule for test")
        
        schedule = response.json()
        response = requests.put(f"{BASE_URL}/api/therapy-schedules/{schedule['id']}/status?status=invalid_status", headers=auth_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid status correctly rejected with 400")
    
    def test_gender_validation_blocks_wrong_gender(self, auth_headers, female_patient):
        """POST /api/therapy-schedules rejects gender mismatch"""
        # Get male-only therapy
        response = requests.get(f"{BASE_URL}/api/therapy-types", headers=auth_headers)
        therapies = response.json()
        male_only = next((t for t in therapies if t.get('gender_specific') == 'male'), None)
        
        if not male_only:
            pytest.skip("No male-only therapy type found")
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        schedule_data = {
            "patient_id": female_patient['id'],
            "therapy_type_id": male_only['id'],
            "scheduled_date": tomorrow,
            "scheduled_time": "11:00",
            "notes": "Should fail - gender mismatch"
        }
        response = requests.post(f"{BASE_URL}/api/therapy-schedules", json=schedule_data, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for gender mismatch, got {response.status_code}"
        assert "male" in response.json().get('detail', '').lower()
        print("Gender validation correctly blocked female patient from male-only therapy")


# ==================== REQ-5: ADVANCE DEPOSITS TESTS ====================

class TestAdvanceDeposits:
    """Tests for advance deposit management"""
    
    def test_create_advance_deposit(self, auth_headers, test_patient):
        """POST /api/advances creates new advance deposit"""
        advance_data = {
            "patient_id": test_patient['id'],
            "amount": 5000,
            "payment_method": "cash",
            "notes": "Test advance deposit"
        }
        response = requests.post(f"{BASE_URL}/api/advances", json=advance_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['patient_id'] == test_patient['id']
        assert data['amount'] == 5000
        assert data['balance'] == 5000
        assert data['used_amount'] == 0
        assert data['status'] == 'active'
        assert 'id' in data
        print(f"Created advance deposit of INR {data['amount']} for {data['patient_name']}")
    
    def test_get_advances(self, auth_headers):
        """GET /api/advances returns list of advances"""
        response = requests.get(f"{BASE_URL}/api/advances", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} advance deposits")
    
    def test_get_advances_by_patient(self, auth_headers, test_patient):
        """GET /api/advances?patient_id={id} filters by patient"""
        response = requests.get(f"{BASE_URL}/api/advances?patient_id={test_patient['id']}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for advance in data:
            assert advance['patient_id'] == test_patient['id']
        print(f"Found {len(data)} advances for patient {test_patient['name']}")
    
    def test_get_patient_advance_balance(self, auth_headers, test_patient):
        """GET /api/advances/patient/{id}/balance returns total balance"""
        response = requests.get(f"{BASE_URL}/api/advances/patient/{test_patient['id']}/balance", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert 'patient_id' in data
        assert 'total_balance' in data
        assert 'advances' in data
        assert data['patient_id'] == test_patient['id']
        assert isinstance(data['total_balance'], (int, float))
        print(f"Patient advance balance: INR {data['total_balance']}")


# ==================== REQ-5: BILLING WITH GST TESTS ====================

class TestBillingWithGST:
    """Tests for billing with GST and advance application"""
    
    def test_create_op_bill_with_gst(self, auth_headers, test_patient):
        """POST /api/bills creates OP bill with GST"""
        bill_data = {
            "patient_id": test_patient['id'],
            "bill_type": "OP",
            "items": [
                {"name": "Test Medicine", "quantity": 2, "sale_price": 100, "purchase_price": 80}
            ],
            "consultation_charges": 500,
            "treatment_charges": 1000,
            "room_charges": 0,
            "mess_charges": 0,
            "other_charges": 0,
            "discount": 0,
            "gst_rate": 18,
            "gst_amount": 288,  # 18% of 1600
            "subtotal": 1600,
            "total_amount": 1888,  # 1600 + 288
            "notes": "Test OP bill with GST"
        }
        response = requests.post(f"{BASE_URL}/api/bills", json=bill_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['bill_type'] == 'OP'
        assert data['gst_rate'] == 18
        assert data['gst_amount'] == 288
        assert data['total_amount'] == 1888
        assert data['status'] == 'pending'
        print(f"Created OP bill with GST: Total INR {data['total_amount']}")
    
    def test_create_ip_bill_with_gst(self, auth_headers, test_patient):
        """POST /api/bills creates IP bill with room and mess charges"""
        bill_data = {
            "patient_id": test_patient['id'],
            "bill_type": "IP",
            "items": [],
            "consultation_charges": 1000,
            "treatment_charges": 3000,
            "room_charges": 2000,
            "mess_charges": 500,
            "other_charges": 200,
            "discount": 100,
            "gst_rate": 18,
            "gst_amount": 1188,  # 18% of 6600 (6700-100)
            "subtotal": 6700,
            "total_amount": 7788,  # 6600 + 1188
            "notes": "Test IP bill with all charges",
            "admission_date": (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d'),
            "discharge_date": datetime.now().strftime('%Y-%m-%d')
        }
        response = requests.post(f"{BASE_URL}/api/bills", json=bill_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['bill_type'] == 'IP'
        assert data['room_charges'] == 2000
        assert data['mess_charges'] == 500
        assert data['gst_rate'] == 18
        print(f"Created IP bill with GST: Total INR {data['total_amount']}")
    
    def test_get_bills(self, auth_headers):
        """GET /api/bills returns list of bills"""
        response = requests.get(f"{BASE_URL}/api/bills", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} bills")
    
    def test_get_bills_by_status(self, auth_headers):
        """GET /api/bills?status=pending filters by status"""
        response = requests.get(f"{BASE_URL}/api/bills?status=pending", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for bill in data:
            assert bill['status'] == 'pending'
        print(f"Found {len(data)} pending bills")
    
    def test_record_payment(self, auth_headers, test_patient):
        """POST /api/bills/payment records payment"""
        # Get a pending bill
        response = requests.get(f"{BASE_URL}/api/bills?status=pending", headers=auth_headers)
        bills = response.json()
        patient_bills = [b for b in bills if b['patient_id'] == test_patient['id']]
        
        if not patient_bills:
            pytest.skip("No pending bills for test patient")
        
        bill = patient_bills[0]
        payment_data = {
            "bill_id": bill['id'],
            "amount": 500,
            "payment_method": "cash"
        }
        response = requests.post(f"{BASE_URL}/api/bills/payment", json=payment_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['paid_amount'] >= 500
        print(f"Recorded payment of INR 500. Bill status: {data['status']}")
    
    def test_apply_advance_to_bill(self, auth_headers, test_patient):
        """POST /api/advances/apply-to-bill applies advance to bill"""
        # First ensure patient has advance balance
        balance_response = requests.get(f"{BASE_URL}/api/advances/patient/{test_patient['id']}/balance", headers=auth_headers)
        balance_data = balance_response.json()
        
        if balance_data['total_balance'] <= 0:
            # Create an advance first
            advance_data = {
                "patient_id": test_patient['id'],
                "amount": 2000,
                "payment_method": "cash",
                "notes": "Advance for bill application test"
            }
            requests.post(f"{BASE_URL}/api/advances", json=advance_data, headers=auth_headers)
        
        # Get a pending/partial bill
        response = requests.get(f"{BASE_URL}/api/bills", headers=auth_headers)
        bills = response.json()
        patient_bills = [b for b in bills if b['patient_id'] == test_patient['id'] and b['status'] in ['pending', 'partial']]
        
        if not patient_bills:
            pytest.skip("No pending/partial bills for test patient")
        
        bill = patient_bills[0]
        remaining = bill['total_amount'] - bill['paid_amount']
        apply_amount = min(1000, remaining)
        
        response = requests.post(f"{BASE_URL}/api/advances/apply-to-bill?bill_id={bill['id']}&amount={apply_amount}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'applied_amount' in data
        assert 'bill' in data
        print(f"Applied INR {data['applied_amount']} from advance to bill")


# ==================== REQ-5: PATIENT BILLING SUMMARY TESTS ====================

class TestPatientBillingSummary:
    """Tests for consolidated patient billing summary"""
    
    def test_get_patient_billing_summary(self, auth_headers, test_patient):
        """GET /api/billing/patient-summary/{id} returns consolidated summary"""
        response = requests.get(f"{BASE_URL}/api/billing/patient-summary/{test_patient['id']}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all required fields
        assert 'patient' in data
        assert 'therapy_charges' in data
        assert 'therapy_sessions' in data
        assert 'room_charges' in data
        assert 'mess_charges' in data
        assert 'advance_balance' in data
        assert 'billed_total' in data
        assert 'paid_total' in data
        assert 'outstanding' in data
        
        # Verify data types
        assert isinstance(data['therapy_charges'], (int, float))
        assert isinstance(data['therapy_sessions'], int)
        assert isinstance(data['room_charges'], (int, float))
        assert isinstance(data['mess_charges'], (int, float))
        assert isinstance(data['advance_balance'], (int, float))
        
        print(f"Patient Summary for {data['patient']['name']}:")
        print(f"  - Therapy Sessions: {data['therapy_sessions']}, Charges: INR {data['therapy_charges']}")
        print(f"  - Room Charges: INR {data['room_charges']}")
        print(f"  - Mess Charges: INR {data['mess_charges']}")
        print(f"  - Advance Balance: INR {data['advance_balance']}")
        print(f"  - Outstanding: INR {data['outstanding']}")
    
    def test_patient_summary_not_found(self, auth_headers):
        """GET /api/billing/patient-summary/{id} returns 404 for non-existent patient"""
        response = requests.get(f"{BASE_URL}/api/billing/patient-summary/non-existent-id", headers=auth_headers)
        assert response.status_code == 404
        print("Non-existent patient correctly returns 404")


# ==================== CLEANUP TESTS ====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_therapy_schedules(self, auth_headers, test_patient):
        """Delete test therapy schedules"""
        response = requests.get(f"{BASE_URL}/api/therapy-schedules/patient/{test_patient['id']}", headers=auth_headers)
        if response.status_code == 200:
            schedules = response.json()
            for schedule in schedules:
                requests.delete(f"{BASE_URL}/api/therapy-schedules/{schedule['id']}", headers=auth_headers)
            print(f"Deleted {len(schedules)} test therapy schedules")
    
    def test_delete_test_therapy_types(self, auth_headers):
        """Delete test therapy types"""
        response = requests.get(f"{BASE_URL}/api/therapy-types", headers=auth_headers)
        if response.status_code == 200:
            therapies = response.json()
            test_therapies = [t for t in therapies if t['name'].startswith('TEST_')]
            for therapy in test_therapies:
                requests.delete(f"{BASE_URL}/api/therapy-types/{therapy['id']}", headers=auth_headers)
            print(f"Deleted {len(test_therapies)} test therapy types")
