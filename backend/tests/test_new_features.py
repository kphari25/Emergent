"""
Test suite for new features:
- Edit Staff (PUT /api/staff/{staff_id})
- Leave Management (POST/GET/DELETE /api/leaves)
- Mess Management (GET/PUT /api/mess/settings, POST/GET/DELETE /api/mess/meals)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
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


class TestEditStaff:
    """Test Edit Staff functionality (PUT /api/staff/{staff_id})"""
    
    def test_get_staff_list(self, api_client, auth_headers):
        """Get list of staff to find one to edit"""
        response = api_client.get(f"{BASE_URL}/api/staff", headers=auth_headers)
        assert response.status_code == 200
        staff_list = response.json()
        assert isinstance(staff_list, list)
        assert len(staff_list) > 0, "No staff found in database"
        print(f"Found {len(staff_list)} staff members")
        return staff_list
    
    def test_edit_staff_success(self, api_client, auth_headers):
        """Edit an existing staff member and verify persistence"""
        # First get a staff member
        response = api_client.get(f"{BASE_URL}/api/staff", headers=auth_headers)
        assert response.status_code == 200
        staff_list = response.json()
        assert len(staff_list) > 0, "No staff to edit"
        
        staff_to_edit = staff_list[0]
        staff_id = staff_to_edit['id']
        original_designation = staff_to_edit.get('designation', '')
        
        # Update the staff with a modified designation
        test_designation = f"TEST_Updated_{datetime.now().strftime('%H%M%S')}"
        update_payload = {
            "name": staff_to_edit['name'],
            "email": staff_to_edit['email'],
            "phone": staff_to_edit['phone'],
            "role": staff_to_edit['role'],
            "department": staff_to_edit['department'],
            "designation": test_designation,
            "salary": staff_to_edit['salary'],
            "join_date": staff_to_edit['join_date'],
            "address": staff_to_edit.get('address', '')
        }
        
        response = api_client.put(f"{BASE_URL}/api/staff/{staff_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"Edit staff failed: {response.text}"
        
        updated_staff = response.json()
        assert updated_staff['designation'] == test_designation
        print(f"Staff {staff_id} designation updated to: {test_designation}")
        
        # Verify persistence with GET
        response = api_client.get(f"{BASE_URL}/api/staff/{staff_id}", headers=auth_headers)
        assert response.status_code == 200
        fetched_staff = response.json()
        assert fetched_staff['designation'] == test_designation, "Update not persisted"
        
        # Restore original designation
        update_payload['designation'] = original_designation or "Staff"
        api_client.put(f"{BASE_URL}/api/staff/{staff_id}", json=update_payload, headers=auth_headers)
        print(f"Restored original designation")
    
    def test_edit_nonexistent_staff(self, api_client, auth_headers):
        """Editing non-existent staff should return 404"""
        fake_id = "nonexistent-staff-id-12345"
        update_payload = {
            "name": "Test",
            "email": "test@test.com",
            "phone": "1234567890",
            "role": "other",
            "department": "Other",
            "designation": "Test",
            "salary": 10000,
            "join_date": "2024-01-01",
            "address": ""
        }
        response = api_client.put(f"{BASE_URL}/api/staff/{fake_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 404


class TestLeaveManagement:
    """Test Leave Tracker functionality"""
    
    created_leave_id = None
    test_staff_id = None
    
    def test_get_staff_for_leave(self, api_client, auth_headers):
        """Get a staff member to record leave for"""
        response = api_client.get(f"{BASE_URL}/api/staff", headers=auth_headers)
        assert response.status_code == 200
        staff_list = response.json()
        assert len(staff_list) > 0
        TestLeaveManagement.test_staff_id = staff_list[0]['id']
        print(f"Using staff ID: {TestLeaveManagement.test_staff_id}")
    
    def test_create_leave_full_day(self, api_client, auth_headers):
        """Create a full-day leave record"""
        leave_payload = {
            "staff_id": TestLeaveManagement.test_staff_id,
            "leave_date": datetime.now().strftime('%Y-%m-%d'),
            "leave_type": "casual",
            "is_half_day": False,
            "reason": "TEST_Leave_FullDay"
        }
        response = api_client.post(f"{BASE_URL}/api/leaves", json=leave_payload, headers=auth_headers)
        assert response.status_code == 200, f"Create leave failed: {response.text}"
        
        leave = response.json()
        assert 'id' in leave
        assert leave['staff_id'] == TestLeaveManagement.test_staff_id
        assert leave['leave_type'] == "casual"
        assert leave['is_half_day'] == False
        TestLeaveManagement.created_leave_id = leave['id']
        print(f"Created leave ID: {leave['id']}")
    
    def test_create_leave_half_day_with_time(self, api_client, auth_headers):
        """Create a half-day leave with time range"""
        leave_payload = {
            "staff_id": TestLeaveManagement.test_staff_id,
            "leave_date": datetime.now().strftime('%Y-%m-%d'),
            "leave_type": "sick",
            "is_half_day": True,
            "from_time": "09:00",
            "to_time": "13:00",
            "reason": "TEST_Leave_HalfDay"
        }
        response = api_client.post(f"{BASE_URL}/api/leaves", json=leave_payload, headers=auth_headers)
        assert response.status_code == 200, f"Create half-day leave failed: {response.text}"
        
        leave = response.json()
        assert leave['is_half_day'] == True
        assert leave['from_time'] == "09:00"
        assert leave['to_time'] == "13:00"
        print(f"Created half-day leave ID: {leave['id']}")
        
        # Clean up this leave
        api_client.delete(f"{BASE_URL}/api/leaves/{leave['id']}", headers=auth_headers)
    
    def test_get_leaves(self, api_client, auth_headers):
        """Get all leave records"""
        response = api_client.get(f"{BASE_URL}/api/leaves", headers=auth_headers)
        assert response.status_code == 200
        leaves = response.json()
        assert isinstance(leaves, list)
        print(f"Found {len(leaves)} leave records")
    
    def test_get_leave_summary(self, api_client, auth_headers):
        """Get leave summary by staff"""
        response = api_client.get(f"{BASE_URL}/api/leaves/summary", headers=auth_headers)
        assert response.status_code == 200
        summary = response.json()
        assert isinstance(summary, list)
        print(f"Leave summary for {len(summary)} staff members")
    
    def test_delete_leave(self, api_client, auth_headers):
        """Delete the created leave record"""
        if TestLeaveManagement.created_leave_id:
            response = api_client.delete(f"{BASE_URL}/api/leaves/{TestLeaveManagement.created_leave_id}", headers=auth_headers)
            assert response.status_code == 200
            print(f"Deleted leave ID: {TestLeaveManagement.created_leave_id}")
            
            # Verify deletion
            response = api_client.get(f"{BASE_URL}/api/leaves", headers=auth_headers)
            leaves = response.json()
            leave_ids = [l['id'] for l in leaves]
            assert TestLeaveManagement.created_leave_id not in leave_ids, "Leave not deleted"
    
    def test_delete_nonexistent_leave(self, api_client, auth_headers):
        """Deleting non-existent leave should return 404"""
        response = api_client.delete(f"{BASE_URL}/api/leaves/nonexistent-leave-id", headers=auth_headers)
        assert response.status_code == 404


class TestMessManagement:
    """Test Mess Module functionality"""
    
    created_meal_id = None
    test_patient_id = None
    
    def test_get_mess_settings_default(self, api_client, auth_headers):
        """Get mess settings - should return default prices if not set"""
        response = api_client.get(f"{BASE_URL}/api/mess/settings", headers=auth_headers)
        assert response.status_code == 200
        
        settings = response.json()
        assert 'breakfast' in settings
        assert 'lunch' in settings
        assert 'dinner' in settings
        assert 'snacks' in settings
        assert 'tea_coffee' in settings
        
        # Check default values
        print(f"Meal prices: Breakfast=₹{settings['breakfast']}, Lunch=₹{settings['lunch']}, Dinner=₹{settings['dinner']}, Snacks=₹{settings['snacks']}, Tea/Coffee=₹{settings['tea_coffee']}")
    
    def test_update_mess_settings(self, api_client, auth_headers):
        """Update meal prices"""
        new_prices = {
            "breakfast": 85,
            "lunch": 125,
            "dinner": 125,
            "snacks": 55,
            "tea_coffee": 35
        }
        response = api_client.put(f"{BASE_URL}/api/mess/settings", json=new_prices, headers=auth_headers)
        assert response.status_code == 200, f"Update prices failed: {response.text}"
        
        updated = response.json()
        assert updated['breakfast'] == 85
        assert updated['lunch'] == 125
        print("Meal prices updated successfully")
        
        # Verify persistence
        response = api_client.get(f"{BASE_URL}/api/mess/settings", headers=auth_headers)
        assert response.status_code == 200
        fetched = response.json()
        assert fetched['breakfast'] == 85
        
        # Restore default prices
        default_prices = {
            "breakfast": 80,
            "lunch": 120,
            "dinner": 120,
            "snacks": 50,
            "tea_coffee": 30
        }
        api_client.put(f"{BASE_URL}/api/mess/settings", json=default_prices, headers=auth_headers)
        print("Restored default prices")
    
    def test_get_patients_for_meal(self, api_client, auth_headers):
        """Get active patients to assign meals"""
        response = api_client.get(f"{BASE_URL}/api/patients", headers=auth_headers)
        assert response.status_code == 200
        patients = response.json()
        
        # Filter active patients
        active_patients = [p for p in patients if p.get('status') == 'active']
        if active_patients:
            TestMessManagement.test_patient_id = active_patients[0]['id']
            print(f"Found {len(active_patients)} active patients. Using: {TestMessManagement.test_patient_id}")
        else:
            print("No active patients found - meal assignment tests will be skipped")
    
    def test_assign_meal_to_patient(self, api_client, auth_headers):
        """Assign meals to a patient"""
        if not TestMessManagement.test_patient_id:
            pytest.skip("No active patient available for meal assignment")
        
        meal_payload = {
            "patient_id": TestMessManagement.test_patient_id,
            "date": datetime.now().strftime('%Y-%m-%d'),
            "breakfast": True,
            "lunch": True,
            "dinner": False,
            "snacks": True,
            "tea_coffee": True,
            "notes": "TEST_Meal_Assignment"
        }
        response = api_client.post(f"{BASE_URL}/api/mess/meals", json=meal_payload, headers=auth_headers)
        assert response.status_code == 200, f"Assign meal failed: {response.text}"
        
        meal = response.json()
        assert 'id' in meal
        assert meal['patient_id'] == TestMessManagement.test_patient_id
        assert meal['breakfast'] == True
        assert meal['lunch'] == True
        assert meal['dinner'] == False
        assert meal['total_cost'] > 0  # Should calculate total
        TestMessManagement.created_meal_id = meal['id']
        print(f"Assigned meal ID: {meal['id']}, Total cost: ₹{meal['total_cost']}")
    
    def test_get_meals_by_date(self, api_client, auth_headers):
        """Get meals for a specific date"""
        today = datetime.now().strftime('%Y-%m-%d')
        response = api_client.get(f"{BASE_URL}/api/mess/meals?date={today}", headers=auth_headers)
        assert response.status_code == 200
        meals = response.json()
        assert isinstance(meals, list)
        print(f"Found {len(meals)} meals for {today}")
    
    def test_get_mess_summary(self, api_client, auth_headers):
        """Get mess summary for a date"""
        today = datetime.now().strftime('%Y-%m-%d')
        response = api_client.get(f"{BASE_URL}/api/mess/summary?date={today}", headers=auth_headers)
        assert response.status_code == 200
        
        summary = response.json()
        assert 'total_patients' in summary
        assert 'total_cost' in summary
        assert 'breakdown' in summary
        print(f"Mess summary: {summary['total_patients']} patients, ₹{summary['total_cost']} total")
    
    def test_delete_meal(self, api_client, auth_headers):
        """Delete the created meal record"""
        if TestMessManagement.created_meal_id:
            response = api_client.delete(f"{BASE_URL}/api/mess/meals/{TestMessManagement.created_meal_id}", headers=auth_headers)
            assert response.status_code == 200
            print(f"Deleted meal ID: {TestMessManagement.created_meal_id}")
            
            # Verify deletion
            today = datetime.now().strftime('%Y-%m-%d')
            response = api_client.get(f"{BASE_URL}/api/mess/meals?date={today}", headers=auth_headers)
            meals = response.json()
            meal_ids = [m['id'] for m in meals]
            assert TestMessManagement.created_meal_id not in meal_ids, "Meal not deleted"
    
    def test_delete_nonexistent_meal(self, api_client, auth_headers):
        """Deleting non-existent meal should return 404"""
        response = api_client.delete(f"{BASE_URL}/api/mess/meals/nonexistent-meal-id", headers=auth_headers)
        assert response.status_code == 404
    
    def test_assign_meal_nonexistent_patient(self, api_client, auth_headers):
        """Assigning meal to non-existent patient should return 404"""
        meal_payload = {
            "patient_id": "nonexistent-patient-id",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "breakfast": True,
            "lunch": False,
            "dinner": False,
            "snacks": False,
            "tea_coffee": False
        }
        response = api_client.post(f"{BASE_URL}/api/mess/meals", json=meal_payload, headers=auth_headers)
        assert response.status_code == 404


class TestLeaveForNonexistentStaff:
    """Test leave creation for non-existent staff"""
    
    def test_create_leave_nonexistent_staff(self, api_client, auth_headers):
        """Creating leave for non-existent staff should return 404"""
        leave_payload = {
            "staff_id": "nonexistent-staff-id",
            "leave_date": datetime.now().strftime('%Y-%m-%d'),
            "leave_type": "casual",
            "is_half_day": False,
            "reason": "Test"
        }
        response = api_client.post(f"{BASE_URL}/api/leaves", json=leave_payload, headers=auth_headers)
        assert response.status_code == 404
