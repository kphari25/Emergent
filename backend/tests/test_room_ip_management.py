"""
Test suite for REQ-3: IP & Room Management features:
- Room CRUD (POST/GET/PUT/DELETE /api/rooms)
- Room Overview (GET /api/rooms/overview)
- Treatment Package CRUD (POST/GET/PUT/DELETE /api/treatment-packages)
- OP to IP Conversion (POST /api/patients/{id}/convert-to-ip)
- Admission records (GET /api/admissions)
- Advance payments (GET /api/advance-payments/{patient_id})
- Cannot delete occupied room validation
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ayurcare.com"
ADMIN_PASSWORD = "admin1234"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("access_token")

@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Auth headers for authenticated requests"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestRoomCRUD:
    """Test Room CRUD operations"""
    
    created_room_id = None
    test_room_number = None
    
    def test_create_room(self, api_client, auth_headers):
        """Create a new room with floor, type, and rate"""
        TestRoomCRUD.test_room_number = f"TEST-{uuid.uuid4().hex[:6].upper()}"
        room_payload = {
            "room_number": TestRoomCRUD.test_room_number,
            "room_type": "private",
            "floor": "1st Floor",
            "daily_rate": 2500,
            "description": "TEST room with AC and attached bathroom"
        }
        response = api_client.post(f"{BASE_URL}/api/rooms", json=room_payload, headers=auth_headers)
        assert response.status_code == 200, f"Create room failed: {response.text}"
        
        room = response.json()
        assert 'id' in room
        assert room['room_number'] == TestRoomCRUD.test_room_number
        assert room['room_type'] == "private"
        assert room['floor'] == "1st Floor"
        assert room['daily_rate'] == 2500
        assert room['is_occupied'] == False
        TestRoomCRUD.created_room_id = room['id']
        print(f"Created room: {room['room_number']} (ID: {room['id']})")
    
    def test_get_all_rooms(self, api_client, auth_headers):
        """Get list of all rooms"""
        response = api_client.get(f"{BASE_URL}/api/rooms", headers=auth_headers)
        assert response.status_code == 200
        rooms = response.json()
        assert isinstance(rooms, list)
        assert len(rooms) > 0, "No rooms found"
        
        # Verify our created room is in the list
        room_ids = [r['id'] for r in rooms]
        assert TestRoomCRUD.created_room_id in room_ids, "Created room not in list"
        print(f"Found {len(rooms)} rooms total")
    
    def test_get_rooms_overview(self, api_client, auth_headers):
        """Get floor-wise room overview with occupancy stats"""
        response = api_client.get(f"{BASE_URL}/api/rooms/overview", headers=auth_headers)
        assert response.status_code == 200
        
        overview = response.json()
        assert 'total_rooms' in overview
        assert 'occupied' in overview
        assert 'available' in overview
        assert 'occupancy_rate' in overview
        assert 'by_floor' in overview
        assert 'by_type' in overview
        
        # Verify floor grouping
        assert isinstance(overview['by_floor'], dict)
        print(f"Room overview: {overview['total_rooms']} total, {overview['occupied']} occupied, {overview['available']} available")
        print(f"Floors: {list(overview['by_floor'].keys())}")
    
    def test_get_available_rooms(self, api_client, auth_headers):
        """Get only available (unoccupied) rooms"""
        response = api_client.get(f"{BASE_URL}/api/rooms/available", headers=auth_headers)
        assert response.status_code == 200
        rooms = response.json()
        assert isinstance(rooms, list)
        
        # All returned rooms should be unoccupied
        for room in rooms:
            assert room['is_occupied'] == False, f"Room {room['room_number']} is occupied but returned as available"
        print(f"Found {len(rooms)} available rooms")
    
    def test_update_room(self, api_client, auth_headers):
        """Update room details and verify persistence"""
        update_payload = {
            "room_number": TestRoomCRUD.test_room_number,
            "room_type": "deluxe",
            "floor": "2nd Floor",
            "daily_rate": 3500,
            "description": "TEST upgraded to deluxe"
        }
        response = api_client.put(f"{BASE_URL}/api/rooms/{TestRoomCRUD.created_room_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"Update room failed: {response.text}"
        
        updated_room = response.json()
        assert updated_room['room_type'] == "deluxe"
        assert updated_room['floor'] == "2nd Floor"
        assert updated_room['daily_rate'] == 3500
        print(f"Room updated: type={updated_room['room_type']}, floor={updated_room['floor']}, rate={updated_room['daily_rate']}")
        
        # Verify persistence via GET
        response = api_client.get(f"{BASE_URL}/api/rooms", headers=auth_headers)
        rooms = response.json()
        our_room = next((r for r in rooms if r['id'] == TestRoomCRUD.created_room_id), None)
        assert our_room is not None
        assert our_room['room_type'] == "deluxe"
    
    def test_update_nonexistent_room(self, api_client, auth_headers):
        """Updating non-existent room should return 404"""
        update_payload = {
            "room_number": "FAKE-999",
            "room_type": "general",
            "floor": "Ground",
            "daily_rate": 1000,
            "description": ""
        }
        response = api_client.put(f"{BASE_URL}/api/rooms/nonexistent-room-id", json=update_payload, headers=auth_headers)
        assert response.status_code == 404
    
    def test_delete_room(self, api_client, auth_headers):
        """Delete the created room"""
        response = api_client.delete(f"{BASE_URL}/api/rooms/{TestRoomCRUD.created_room_id}", headers=auth_headers)
        assert response.status_code == 200, f"Delete room failed: {response.text}"
        print(f"Deleted room: {TestRoomCRUD.created_room_id}")
        
        # Verify deletion
        response = api_client.get(f"{BASE_URL}/api/rooms", headers=auth_headers)
        rooms = response.json()
        room_ids = [r['id'] for r in rooms]
        assert TestRoomCRUD.created_room_id not in room_ids, "Room not deleted"
    
    def test_delete_nonexistent_room(self, api_client, auth_headers):
        """Deleting non-existent room should return 404"""
        response = api_client.delete(f"{BASE_URL}/api/rooms/nonexistent-room-id", headers=auth_headers)
        assert response.status_code == 404


class TestTreatmentPackageCRUD:
    """Test Treatment Package CRUD operations"""
    
    created_package_id = None
    
    def test_create_treatment_package(self, api_client, auth_headers):
        """Create a new treatment package with therapies, cost, duration"""
        package_payload = {
            "name": "TEST 14-Day Detox Program",
            "duration_days": 14,
            "therapies": ["Abhyanga", "Shirodhara", "Virechana", "Basti"],
            "description": "Complete detox and rejuvenation program",
            "room_type": "private",
            "total_cost": 85000,
            "includes_room": True,
            "includes_food": True,
            "includes_medicines": True
        }
        response = api_client.post(f"{BASE_URL}/api/treatment-packages", json=package_payload, headers=auth_headers)
        assert response.status_code == 200, f"Create package failed: {response.text}"
        
        package = response.json()
        assert 'id' in package
        assert package['name'] == "TEST 14-Day Detox Program"
        assert package['duration_days'] == 14
        assert package['therapies'] == ["Abhyanga", "Shirodhara", "Virechana", "Basti"]
        assert package['total_cost'] == 85000
        assert package['includes_room'] == True
        assert package['includes_food'] == True
        assert package['includes_medicines'] == True
        TestTreatmentPackageCRUD.created_package_id = package['id']
        print(f"Created package: {package['name']} (ID: {package['id']})")
    
    def test_get_treatment_packages(self, api_client, auth_headers):
        """Get list of active treatment packages"""
        response = api_client.get(f"{BASE_URL}/api/treatment-packages", headers=auth_headers)
        assert response.status_code == 200
        packages = response.json()
        assert isinstance(packages, list)
        
        # Verify our created package is in the list
        package_ids = [p['id'] for p in packages]
        assert TestTreatmentPackageCRUD.created_package_id in package_ids, "Created package not in list"
        print(f"Found {len(packages)} active packages")
        
        # Verify package structure
        our_pkg = next((p for p in packages if p['id'] == TestTreatmentPackageCRUD.created_package_id), None)
        assert our_pkg is not None
        assert 'therapies' in our_pkg
        assert isinstance(our_pkg['therapies'], list)
    
    def test_update_treatment_package(self, api_client, auth_headers):
        """Update package details and verify persistence"""
        update_payload = {
            "name": "TEST 14-Day Premium Detox",
            "duration_days": 14,
            "therapies": ["Abhyanga", "Shirodhara", "Virechana", "Basti", "Nasya"],
            "description": "Premium detox with additional therapies",
            "room_type": "deluxe",
            "total_cost": 95000,
            "includes_room": True,
            "includes_food": True,
            "includes_medicines": True
        }
        response = api_client.put(f"{BASE_URL}/api/treatment-packages/{TestTreatmentPackageCRUD.created_package_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"Update package failed: {response.text}"
        
        updated_pkg = response.json()
        assert updated_pkg['name'] == "TEST 14-Day Premium Detox"
        assert updated_pkg['total_cost'] == 95000
        assert "Nasya" in updated_pkg['therapies']
        print(f"Package updated: {updated_pkg['name']}, cost={updated_pkg['total_cost']}")
        
        # Verify persistence
        response = api_client.get(f"{BASE_URL}/api/treatment-packages", headers=auth_headers)
        packages = response.json()
        our_pkg = next((p for p in packages if p['id'] == TestTreatmentPackageCRUD.created_package_id), None)
        assert our_pkg is not None
        assert our_pkg['total_cost'] == 95000
    
    def test_update_nonexistent_package(self, api_client, auth_headers):
        """Updating non-existent package should return 404"""
        update_payload = {
            "name": "Fake Package",
            "duration_days": 7,
            "therapies": [],
            "description": "",
            "room_type": "general",
            "total_cost": 10000,
            "includes_room": False,
            "includes_food": False,
            "includes_medicines": False
        }
        response = api_client.put(f"{BASE_URL}/api/treatment-packages/nonexistent-pkg-id", json=update_payload, headers=auth_headers)
        assert response.status_code == 404
    
    def test_delete_treatment_package(self, api_client, auth_headers):
        """Delete (deactivate) the created package"""
        response = api_client.delete(f"{BASE_URL}/api/treatment-packages/{TestTreatmentPackageCRUD.created_package_id}", headers=auth_headers)
        assert response.status_code == 200, f"Delete package failed: {response.text}"
        print(f"Deactivated package: {TestTreatmentPackageCRUD.created_package_id}")
        
        # Verify it's no longer in active packages list
        response = api_client.get(f"{BASE_URL}/api/treatment-packages", headers=auth_headers)
        packages = response.json()
        package_ids = [p['id'] for p in packages]
        assert TestTreatmentPackageCRUD.created_package_id not in package_ids, "Package still in active list"


class TestOPToIPConversion:
    """Test OP to IP conversion flow"""
    
    test_patient_id = None
    test_room_number = None
    test_room_id = None
    test_package_id = None
    
    def test_setup_create_test_room(self, api_client, auth_headers):
        """Create a test room for IP conversion"""
        TestOPToIPConversion.test_room_number = f"IP-TEST-{uuid.uuid4().hex[:4].upper()}"
        room_payload = {
            "room_number": TestOPToIPConversion.test_room_number,
            "room_type": "semi_private",
            "floor": "Ground",
            "daily_rate": 1800,
            "description": "Test room for IP conversion"
        }
        response = api_client.post(f"{BASE_URL}/api/rooms", json=room_payload, headers=auth_headers)
        assert response.status_code == 200
        room = response.json()
        TestOPToIPConversion.test_room_id = room['id']
        print(f"Created test room: {TestOPToIPConversion.test_room_number}")
    
    def test_setup_create_test_package(self, api_client, auth_headers):
        """Create a test package for IP conversion"""
        package_payload = {
            "name": "TEST IP Conversion Package",
            "duration_days": 7,
            "therapies": ["Abhyanga", "Shirodhara"],
            "description": "Test package",
            "room_type": "semi_private",
            "total_cost": 35000,
            "includes_room": True,
            "includes_food": True,
            "includes_medicines": False
        }
        response = api_client.post(f"{BASE_URL}/api/treatment-packages", json=package_payload, headers=auth_headers)
        assert response.status_code == 200
        package = response.json()
        TestOPToIPConversion.test_package_id = package['id']
        print(f"Created test package: {package['name']}")
    
    def test_setup_create_test_patient(self, api_client, auth_headers):
        """Create a test OP patient for conversion"""
        patient_payload = {
            "name": "TEST IP Conversion Patient",
            "phone": f"99{uuid.uuid4().hex[:8]}",
            "age": 45,
            "gender": "Male",
            "address": "Test Address",
            "patient_type": "OP",
            "prakriti": "vata"
        }
        response = api_client.post(f"{BASE_URL}/api/patients", json=patient_payload, headers=auth_headers)
        assert response.status_code == 200
        patient = response.json()
        TestOPToIPConversion.test_patient_id = patient['id']
        print(f"Created test patient: {patient['name']} (PID: {patient.get('pid', 'N/A')})")
    
    def test_convert_op_to_ip(self, api_client, auth_headers):
        """Convert OP patient to IP with all details"""
        convert_payload = {
            "room_number": TestOPToIPConversion.test_room_number,
            "attender_name": "Test Attender",
            "attender_relation": "spouse",
            "attender_phone": "9876543210",
            "advance_amount": 10000,
            "consent_given": True,
            "package_id": TestOPToIPConversion.test_package_id,
            "notes": "TEST conversion notes"
        }
        response = api_client.post(
            f"{BASE_URL}/api/patients/{TestOPToIPConversion.test_patient_id}/convert-to-ip",
            json=convert_payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Convert to IP failed: {response.text}"
        
        patient = response.json()
        assert patient['patient_type'] == 'IP', "Patient type not updated to IP"
        assert patient['room_number'] == TestOPToIPConversion.test_room_number
        print(f"Patient converted to IP, room: {patient['room_number']}")
    
    def test_verify_room_occupied(self, api_client, auth_headers):
        """Verify room is now marked as occupied"""
        response = api_client.get(f"{BASE_URL}/api/rooms", headers=auth_headers)
        assert response.status_code == 200
        rooms = response.json()
        
        our_room = next((r for r in rooms if r['id'] == TestOPToIPConversion.test_room_id), None)
        assert our_room is not None
        assert our_room['is_occupied'] == True, "Room not marked as occupied"
        assert our_room['patient_id'] == TestOPToIPConversion.test_patient_id
        print(f"Room {our_room['room_number']} is now occupied by patient {our_room.get('patient_name', 'N/A')}")
    
    def test_cannot_delete_occupied_room(self, api_client, auth_headers):
        """Verify cannot delete an occupied room"""
        response = api_client.delete(f"{BASE_URL}/api/rooms/{TestOPToIPConversion.test_room_id}", headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for occupied room deletion, got {response.status_code}"
        
        error = response.json()
        assert "occupied" in error.get('detail', '').lower() or "cannot delete" in error.get('detail', '').lower()
        print(f"Correctly rejected deletion of occupied room: {error.get('detail')}")
    
    def test_get_admissions(self, api_client, auth_headers):
        """Get all admission records"""
        response = api_client.get(f"{BASE_URL}/api/admissions", headers=auth_headers)
        assert response.status_code == 200
        admissions = response.json()
        assert isinstance(admissions, list)
        
        # Find our admission
        our_admission = next((a for a in admissions if a['patient_id'] == TestOPToIPConversion.test_patient_id), None)
        assert our_admission is not None, "Admission record not found"
        
        # Verify admission details
        assert our_admission['room_number'] == TestOPToIPConversion.test_room_number
        assert our_admission['attender_name'] == "Test Attender"
        assert our_admission['attender_relation'] == "spouse"
        assert our_admission['attender_phone'] == "9876543210"
        assert our_admission['advance_amount'] == 10000
        assert our_admission['consent_given'] == True
        assert our_admission['package_id'] == TestOPToIPConversion.test_package_id
        print(f"Admission record verified: {our_admission['id']}")
    
    def test_get_patient_admissions(self, api_client, auth_headers):
        """Get admissions for specific patient"""
        response = api_client.get(f"{BASE_URL}/api/admissions/patient/{TestOPToIPConversion.test_patient_id}", headers=auth_headers)
        assert response.status_code == 200
        admissions = response.json()
        assert isinstance(admissions, list)
        assert len(admissions) > 0, "No admissions found for patient"
        print(f"Found {len(admissions)} admission(s) for patient")
    
    def test_get_advance_payments(self, api_client, auth_headers):
        """Get advance payments for patient"""
        response = api_client.get(f"{BASE_URL}/api/advance-payments/{TestOPToIPConversion.test_patient_id}", headers=auth_headers)
        assert response.status_code == 200
        payments = response.json()
        assert isinstance(payments, list)
        assert len(payments) > 0, "No advance payments found"
        
        # Verify payment details
        payment = payments[0]
        assert payment['amount'] == 10000
        assert payment['type'] == 'advance'
        print(f"Advance payment verified: ₹{payment['amount']}")
    
    def test_convert_to_occupied_room_fails(self, api_client, auth_headers):
        """Converting to an already occupied room should fail"""
        # Create another patient
        patient_payload = {
            "name": "TEST Second Patient",
            "phone": f"88{uuid.uuid4().hex[:8]}",
            "age": 30,
            "gender": "Female",
            "address": "Test Address 2",
            "patient_type": "OP"
        }
        response = api_client.post(f"{BASE_URL}/api/patients", json=patient_payload, headers=auth_headers)
        assert response.status_code == 200
        second_patient_id = response.json()['id']
        
        # Try to convert to the same occupied room
        convert_payload = {
            "room_number": TestOPToIPConversion.test_room_number,
            "attender_name": "",
            "attender_relation": "",
            "attender_phone": "",
            "advance_amount": 0,
            "consent_given": False,
            "package_id": None,
            "notes": ""
        }
        response = api_client.post(
            f"{BASE_URL}/api/patients/{second_patient_id}/convert-to-ip",
            json=convert_payload,
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400 for occupied room, got {response.status_code}"
        print("Correctly rejected conversion to occupied room")
        
        # Cleanup second patient
        api_client.delete(f"{BASE_URL}/api/patients/{second_patient_id}", headers=auth_headers)
    
    def test_cleanup(self, api_client, auth_headers):
        """Cleanup test data - Note: Room cannot be deleted while occupied"""
        # Delete test package
        if TestOPToIPConversion.test_package_id:
            api_client.delete(f"{BASE_URL}/api/treatment-packages/{TestOPToIPConversion.test_package_id}", headers=auth_headers)
            print("Cleaned up test package")
        
        # Note: We cannot delete the room or patient while room is occupied
        # In a real scenario, we'd need to discharge the patient first
        print("Note: Test room and patient left in place (room is occupied)")


class TestRoomOverviewStructure:
    """Test room overview response structure in detail"""
    
    def test_overview_by_floor_structure(self, api_client, auth_headers):
        """Verify by_floor contains room arrays with correct structure"""
        response = api_client.get(f"{BASE_URL}/api/rooms/overview", headers=auth_headers)
        assert response.status_code == 200
        overview = response.json()
        
        for floor, rooms in overview['by_floor'].items():
            assert isinstance(rooms, list), f"Floor {floor} should have list of rooms"
            for room in rooms:
                assert 'id' in room
                assert 'room_number' in room
                assert 'room_type' in room
                assert 'daily_rate' in room
                assert 'is_occupied' in room
                # floor field may not be present in older rooms
        print("Room overview structure verified")
    
    def test_overview_by_type_structure(self, api_client, auth_headers):
        """Verify by_type contains occupancy stats per room type"""
        response = api_client.get(f"{BASE_URL}/api/rooms/overview", headers=auth_headers)
        assert response.status_code == 200
        overview = response.json()
        
        for room_type, stats in overview['by_type'].items():
            assert 'total' in stats, f"Room type {room_type} missing 'total'"
            assert 'occupied' in stats, f"Room type {room_type} missing 'occupied'"
            assert isinstance(stats['total'], int)
            assert isinstance(stats['occupied'], int)
        print("Room type stats structure verified")
