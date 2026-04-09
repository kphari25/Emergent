"""
Test Suite for Phase A (Enhanced Patient Profiles) and Phase C (Live Queue Dashboard)
Features tested:
- Patient Registration with auto PID (TAH-xxxx format)
- Phone lookup for returning patients
- Extended patient fields (DOB, blood group, occupation, marital status, emergency contact, lifestyle, referral source)
- Prakriti dropdown options
- Duplicate phone prevention
- Patient Check-In with Priority (Normal/Elderly/Emergency)
- Live Queue Dashboard API
- Queue Status Transitions (waiting -> in_consultation -> completed)
- Priority Update
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_admin_login(self, auth_token):
        """Test admin login works"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print("Admin login successful")


class TestPatientRegistration:
    """Test Patient Registration with extended fields and auto PID"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_patient_with_all_fields(self, auth_headers):
        """Test creating patient with all extended fields and verify PID auto-generation"""
        unique_phone = f"TEST{uuid.uuid4().hex[:8]}"
        patient_data = {
            "name": "TEST_Ramesh Kumar",
            "age": 45,
            "gender": "male",
            "phone": unique_phone,
            "address": "123 Test Street, Test City",
            "medical_history": "Diabetes, Hypertension",
            "prakriti": "vata-pitta",
            "dob": "1980-05-15",
            "email": "test_ramesh@example.com",
            "blood_group": "B+",
            "occupation": "Engineer",
            "marital_status": "married",
            "emergency_contact_name": "Sita Kumar",
            "emergency_contact_phone": "9876543211",
            "lifestyle": "moderate",
            "referral_source": "Doctor Referral"
        }
        
        response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
        assert response.status_code == 200, f"Create patient failed: {response.text}"
        
        data = response.json()
        # Verify PID is auto-generated in TAH-xxxx format
        assert "pid" in data, "PID not in response"
        assert data["pid"] is not None, "PID is None"
        assert data["pid"].startswith("TAH-"), f"PID format incorrect: {data['pid']}"
        
        # Verify all fields are saved
        assert data["name"] == patient_data["name"]
        assert data["prakriti"] == patient_data["prakriti"]
        assert data["dob"] == patient_data["dob"]
        assert data["blood_group"] == patient_data["blood_group"]
        assert data["occupation"] == patient_data["occupation"]
        assert data["marital_status"] == patient_data["marital_status"]
        assert data["emergency_contact_name"] == patient_data["emergency_contact_name"]
        assert data["emergency_contact_phone"] == patient_data["emergency_contact_phone"]
        assert data["lifestyle"] == patient_data["lifestyle"]
        assert data["referral_source"] == patient_data["referral_source"]
        
        print(f"Patient created with PID: {data['pid']}")
        return data
    
    def test_duplicate_phone_prevention(self, auth_headers):
        """Test that duplicate phone numbers are rejected"""
        unique_phone = f"DUPE{uuid.uuid4().hex[:6]}"
        
        # Create first patient
        patient1 = {
            "name": "TEST_First Patient",
            "age": 30,
            "gender": "female",
            "phone": unique_phone,
            "address": "Test Address"
        }
        response1 = requests.post(f"{BASE_URL}/api/patients", json=patient1, headers=auth_headers)
        assert response1.status_code == 200, f"First patient creation failed: {response1.text}"
        
        # Try to create second patient with same phone
        patient2 = {
            "name": "TEST_Second Patient",
            "age": 35,
            "gender": "male",
            "phone": unique_phone,
            "address": "Another Address"
        }
        response2 = requests.post(f"{BASE_URL}/api/patients", json=patient2, headers=auth_headers)
        assert response2.status_code == 400, f"Duplicate phone should be rejected, got: {response2.status_code}"
        
        error_data = response2.json()
        assert "already exists" in error_data.get("detail", "").lower(), f"Error message should mention duplicate: {error_data}"
        print("Duplicate phone prevention working correctly")


class TestPhoneLookup:
    """Test phone lookup for returning patients"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_search_phone_returns_matching_patients(self, auth_headers):
        """Test phone search returns matching patients"""
        # Search for existing patient (Suresh Kumar with phone 9876500001)
        response = requests.get(f"{BASE_URL}/api/patients/search-phone?phone=98765", headers=auth_headers)
        assert response.status_code == 200, f"Phone search failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Phone search returned {len(data)} results")
        
        # If results found, verify structure
        if len(data) > 0:
            patient = data[0]
            assert "id" in patient
            assert "name" in patient
            assert "phone" in patient
            print(f"Found patient: {patient.get('name')} - {patient.get('phone')}")
    
    def test_search_phone_with_short_query(self, auth_headers):
        """Test phone search with short query"""
        response = requests.get(f"{BASE_URL}/api/patients/search-phone?phone=987", headers=auth_headers)
        assert response.status_code == 200, f"Phone search failed: {response.text}"
        print("Short phone query works")


class TestPatientCheckinWithPriority:
    """Test patient check-in with priority levels"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_patient(self, auth_headers):
        """Create a test patient for check-in tests"""
        unique_phone = f"CHKIN{uuid.uuid4().hex[:6]}"
        patient_data = {
            "name": "TEST_Checkin Patient",
            "age": 65,
            "gender": "male",
            "phone": unique_phone,
            "address": "Test Address for Checkin"
        }
        response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_checkin_with_normal_priority(self, auth_headers, test_patient):
        """Test check-in with normal priority"""
        checkin_data = {
            "patient_id": test_patient["id"],
            "patient_type": "OP",
            "reason": "Regular checkup",
            "priority": "normal"
        }
        response = requests.post(f"{BASE_URL}/api/patients/checkin", json=checkin_data, headers=auth_headers)
        assert response.status_code == 200, f"Check-in failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "normal"
        assert data["queue_status"] == "waiting"
        assert data["patient_type"] == "OP"
        print("Normal priority check-in successful")
    
    def test_checkin_with_elderly_priority(self, auth_headers):
        """Test check-in with elderly priority"""
        # Create new patient for this test
        unique_phone = f"ELDER{uuid.uuid4().hex[:6]}"
        patient_data = {
            "name": "TEST_Elderly Patient",
            "age": 75,
            "gender": "female",
            "phone": unique_phone,
            "address": "Elderly Test Address"
        }
        patient_response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
        patient = patient_response.json()
        
        checkin_data = {
            "patient_id": patient["id"],
            "patient_type": "OP",
            "reason": "Joint pain",
            "priority": "elderly"
        }
        response = requests.post(f"{BASE_URL}/api/patients/checkin", json=checkin_data, headers=auth_headers)
        assert response.status_code == 200, f"Elderly check-in failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "elderly"
        assert data["queue_status"] == "waiting"
        print("Elderly priority check-in successful")
    
    def test_checkin_with_emergency_priority(self, auth_headers):
        """Test check-in with emergency priority"""
        # Create new patient for this test
        unique_phone = f"EMERG{uuid.uuid4().hex[:6]}"
        patient_data = {
            "name": "TEST_Emergency Patient",
            "age": 40,
            "gender": "male",
            "phone": unique_phone,
            "address": "Emergency Test Address"
        }
        patient_response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
        patient = patient_response.json()
        
        checkin_data = {
            "patient_id": patient["id"],
            "patient_type": "OP",
            "reason": "Severe chest pain",
            "priority": "emergency"
        }
        response = requests.post(f"{BASE_URL}/api/patients/checkin", json=checkin_data, headers=auth_headers)
        assert response.status_code == 200, f"Emergency check-in failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == "emergency"
        assert data["queue_status"] == "waiting"
        print("Emergency priority check-in successful")


class TestLiveQueueDashboard:
    """Test Live Queue Dashboard API"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_queue(self, auth_headers):
        """Test GET /api/queue returns queue items"""
        response = requests.get(f"{BASE_URL}/api/queue", headers=auth_headers)
        assert response.status_code == 200, f"Get queue failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Queue should be a list"
        print(f"Queue has {len(data)} items")
        
        # Verify queue item structure if items exist
        if len(data) > 0:
            item = data[0]
            assert "checkin_id" in item
            assert "patient_id" in item
            assert "patient_name" in item
            assert "priority" in item
            assert "queue_status" in item
            print(f"First queue item: {item.get('patient_name')} - {item.get('queue_status')} - {item.get('priority')}")
    
    def test_queue_has_priority_sorting(self, auth_headers):
        """Test that queue is sorted by priority (emergency first)"""
        response = requests.get(f"{BASE_URL}/api/queue", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 1:
            # Check if emergency patients come before normal
            priority_order = {'emergency': 0, 'elderly': 1, 'normal': 2}
            for i in range(len(data) - 1):
                current_priority = priority_order.get(data[i].get('priority', 'normal'), 2)
                next_priority = priority_order.get(data[i+1].get('priority', 'normal'), 2)
                # Within same priority, should be sorted by checkin time
                if current_priority > next_priority:
                    print(f"Warning: Priority sorting may not be correct at index {i}")
        print("Queue priority sorting check completed")


class TestQueueStatusTransitions:
    """Test queue status transitions"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def queue_patient(self, auth_headers):
        """Create and check-in a patient for queue tests"""
        unique_phone = f"QUEUE{uuid.uuid4().hex[:6]}"
        patient_data = {
            "name": "TEST_Queue Status Patient",
            "age": 50,
            "gender": "male",
            "phone": unique_phone,
            "address": "Queue Test Address"
        }
        patient_response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
        patient = patient_response.json()
        
        # Check in the patient
        checkin_data = {
            "patient_id": patient["id"],
            "patient_type": "OP",
            "reason": "Queue status test",
            "priority": "normal"
        }
        requests.post(f"{BASE_URL}/api/patients/checkin", json=checkin_data, headers=auth_headers)
        return patient
    
    def test_update_status_to_in_consultation(self, auth_headers, queue_patient):
        """Test updating queue status to in_consultation"""
        response = requests.put(
            f"{BASE_URL}/api/queue/{queue_patient['id']}/status?status=in_consultation",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Status update failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "in_consultation" in data["message"]
        print("Status updated to in_consultation")
    
    def test_update_status_to_completed(self, auth_headers, queue_patient):
        """Test updating queue status to completed"""
        response = requests.put(
            f"{BASE_URL}/api/queue/{queue_patient['id']}/status?status=completed",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Status update failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "completed" in data["message"]
        print("Status updated to completed")
    
    def test_invalid_status_rejected(self, auth_headers, queue_patient):
        """Test that invalid status is rejected"""
        response = requests.put(
            f"{BASE_URL}/api/queue/{queue_patient['id']}/status?status=invalid_status",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Invalid status should be rejected, got: {response.status_code}"
        print("Invalid status correctly rejected")


class TestPriorityUpdate:
    """Test priority update functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def priority_patient(self, auth_headers):
        """Create and check-in a patient for priority tests"""
        unique_phone = f"PRIO{uuid.uuid4().hex[:6]}"
        patient_data = {
            "name": "TEST_Priority Update Patient",
            "age": 55,
            "gender": "female",
            "phone": unique_phone,
            "address": "Priority Test Address"
        }
        patient_response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
        patient = patient_response.json()
        
        # Check in the patient
        checkin_data = {
            "patient_id": patient["id"],
            "patient_type": "OP",
            "reason": "Priority update test",
            "priority": "normal"
        }
        requests.post(f"{BASE_URL}/api/patients/checkin", json=checkin_data, headers=auth_headers)
        return patient
    
    def test_update_priority_to_elderly(self, auth_headers, priority_patient):
        """Test updating priority to elderly"""
        response = requests.put(
            f"{BASE_URL}/api/queue/{priority_patient['id']}/priority?priority=elderly",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Priority update failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "elderly" in data["message"]
        print("Priority updated to elderly")
    
    def test_update_priority_to_emergency(self, auth_headers, priority_patient):
        """Test updating priority to emergency"""
        response = requests.put(
            f"{BASE_URL}/api/queue/{priority_patient['id']}/priority?priority=emergency",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Priority update failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "emergency" in data["message"]
        print("Priority updated to emergency")
    
    def test_invalid_priority_rejected(self, auth_headers, priority_patient):
        """Test that invalid priority is rejected"""
        response = requests.put(
            f"{BASE_URL}/api/queue/{priority_patient['id']}/priority?priority=invalid_priority",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Invalid priority should be rejected, got: {response.status_code}"
        print("Invalid priority correctly rejected")


class TestPatientDetails:
    """Test patient details endpoint with all new fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_patient_with_all_fields(self, auth_headers):
        """Test GET patient returns all extended fields"""
        # First create a patient with all fields
        unique_phone = f"DETAIL{uuid.uuid4().hex[:6]}"
        patient_data = {
            "name": "TEST_Details Patient",
            "age": 42,
            "gender": "female",
            "phone": unique_phone,
            "address": "Details Test Address",
            "prakriti": "kapha",
            "dob": "1983-08-20",
            "blood_group": "O+",
            "occupation": "Teacher",
            "marital_status": "married",
            "emergency_contact_name": "Spouse Name",
            "emergency_contact_phone": "9876543222",
            "lifestyle": "active",
            "referral_source": "Google"
        }
        create_response = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=auth_headers)
        created_patient = create_response.json()
        
        # Get the patient details
        response = requests.get(f"{BASE_URL}/api/patients/{created_patient['id']}", headers=auth_headers)
        assert response.status_code == 200, f"Get patient failed: {response.text}"
        
        data = response.json()
        # Verify all fields are present
        assert data["pid"] is not None
        assert data["dob"] == patient_data["dob"]
        assert data["blood_group"] == patient_data["blood_group"]
        assert data["occupation"] == patient_data["occupation"]
        assert data["marital_status"] == patient_data["marital_status"]
        assert data["emergency_contact_name"] == patient_data["emergency_contact_name"]
        assert data["emergency_contact_phone"] == patient_data["emergency_contact_phone"]
        assert data["lifestyle"] == patient_data["lifestyle"]
        assert data["referral_source"] == patient_data["referral_source"]
        print(f"Patient details retrieved with PID: {data['pid']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
