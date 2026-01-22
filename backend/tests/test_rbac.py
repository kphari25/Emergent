"""
RBAC (Role-Based Access Control) Tests for Tatva Ayurved Hospital Management System
Tests: User Management, Role-based API access, Password Reset
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@ayurcare.com", "password": "admin123"}
DOCTOR_CREDS = {"email": "dr.sharma@ayurcare.com", "password": "doctor123"}


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_admin_login_success(self):
        """Admin should be able to login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_CREDS["email"]
        print(f"✓ Admin login successful - role: {data['user']['role']}")
    
    def test_doctor_login_success(self):
        """Doctor should be able to login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DOCTOR_CREDS)
        assert response.status_code == 200, f"Doctor login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "doctor"
        assert data["user"]["email"] == DOCTOR_CREDS["email"]
        print(f"✓ Doctor login successful - role: {data['user']['role']}")
    
    def test_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


class TestUserManagementAdminOnly:
    """Test User Management endpoints - Admin only access"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def doctor_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DOCTOR_CREDS)
        return response.json()["access_token"]
    
    def test_admin_can_get_all_users(self, admin_token):
        """Admin should be able to get all users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        print(f"✓ Admin can view all users - count: {len(users)}")
    
    def test_doctor_cannot_get_all_users(self, doctor_token):
        """Doctor should NOT be able to get all users (403)"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Doctor correctly denied access to user list")
    
    def test_admin_can_create_user(self, admin_token):
        """Admin should be able to create a new user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        new_user = {
            "email": "TEST_newuser@ayurcare.com",
            "password": "testpass123",
            "name": "Test New User",
            "role": "front_desk"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        created = response.json()
        assert created["email"] == new_user["email"]
        assert created["role"] == new_user["role"]
        print(f"✓ Admin created user: {created['email']}")
        
        # Cleanup - delete the test user
        user_id = created["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Test user cleaned up")
    
    def test_doctor_cannot_create_user(self, doctor_token):
        """Doctor should NOT be able to create users (403)"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        new_user = {
            "email": "TEST_doctorcreate@ayurcare.com",
            "password": "testpass123",
            "name": "Doctor Created User",
            "role": "front_desk"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Doctor correctly denied user creation")
    
    def test_admin_can_reset_user_password(self, admin_token):
        """Admin should be able to reset another user's password"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a test user
        new_user = {
            "email": "TEST_resetpwd@ayurcare.com",
            "password": "oldpassword123",
            "name": "Reset Password Test",
            "role": "therapist"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Reset password
        reset_response = requests.post(
            f"{BASE_URL}/api/users/{user_id}/reset-password",
            json={"new_password": "newpassword123"},
            headers=headers
        )
        assert reset_response.status_code == 200, f"Failed: {reset_response.text}"
        print("✓ Admin can reset user password")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=headers)
    
    def test_admin_can_delete_user(self, admin_token):
        """Admin should be able to delete a user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test user first
        new_user = {
            "email": "TEST_deleteuser@ayurcare.com",
            "password": "testpass123",
            "name": "Delete Test User",
            "role": "front_desk"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Delete the user
        delete_response = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        assert delete_response.status_code == 200
        print("✓ Admin can delete user")
        
        # Verify user is deleted
        get_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = get_response.json()
        assert not any(u["id"] == user_id for u in users)
        print("✓ User deletion verified")
    
    def test_get_available_roles(self, admin_token):
        """Should return available roles"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/roles", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "roles" in data
        assert "admin" in data["roles"]
        assert "doctor" in data["roles"]
        assert "restricted_roles" in data
        print(f"✓ Available roles: {data['roles']}")


class TestHRAccessControl:
    """Test HR/Staff endpoints - Restricted for doctor/front_desk/therapist"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def doctor_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DOCTOR_CREDS)
        return response.json()["access_token"]
    
    def test_admin_can_access_staff_list(self, admin_token):
        """Admin should be able to access staff list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/staff", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("✓ Admin can access /api/staff")
    
    def test_doctor_cannot_access_staff_list(self, doctor_token):
        """Doctor should NOT be able to access staff list (403)"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        response = requests.get(f"{BASE_URL}/api/staff", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Doctor correctly denied access to /api/staff")
    
    def test_doctor_cannot_create_staff(self, doctor_token):
        """Doctor should NOT be able to create staff (403)"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        staff_data = {
            "name": "Test Staff",
            "email": "teststaff@ayurcare.com",
            "phone": "1234567890",
            "role": "nurse",
            "department": "General",
            "designation": "Nurse",
            "salary": 30000,
            "join_date": "2024-01-01"
        }
        response = requests.post(f"{BASE_URL}/api/staff", json=staff_data, headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Doctor correctly denied staff creation")


class TestReportsAccessControl:
    """Test Reports endpoints - Restricted for doctor/front_desk/therapist"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def doctor_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DOCTOR_CREDS)
        return response.json()["access_token"]
    
    def test_admin_can_access_financial_reports(self, admin_token):
        """Admin should be able to access financial reports"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/reports/financial", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("✓ Admin can access /api/reports/financial")
    
    def test_doctor_cannot_access_financial_reports(self, doctor_token):
        """Doctor should NOT be able to access financial reports (403)"""
        headers = {"Authorization": f"Bearer {doctor_token}"}
        response = requests.get(f"{BASE_URL}/api/reports/financial", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Doctor correctly denied access to /api/reports/financial")


class TestForgotPasswordMocked:
    """Test Forgot Password flow (MOCKED - logs token to console)"""
    
    def test_forgot_password_existing_email(self):
        """Forgot password should return success for existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ADMIN_CREDS["email"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Forgot password success message: {data['message']}")
    
    def test_forgot_password_nonexistent_email(self):
        """Forgot password should return success even for non-existent email (security)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@test.com"
        })
        # Should return 200 for security (don't reveal if email exists)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Forgot password returns success for non-existent email (security best practice)")
    
    def test_reset_password_invalid_token(self):
        """Reset password with invalid token should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid-token-12345",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        print("✓ Invalid reset token correctly rejected")


class TestChangeOwnPassword:
    """Test change own password functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["access_token"]
    
    def test_change_own_password_short_password(self, admin_token):
        """Should reject password less than 6 characters"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/auth/change-password", 
            json={"new_password": "12345"},
            headers=headers
        )
        assert response.status_code == 400
        print("✓ Short password correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
