"""
REQ-6: Dashboards & Communications Testing
- Executive Dashboard API
- Lead Management CRUD + Status Pipeline + Conversion
- Feedback CRUD + Escalation + Resolution
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for all tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Auth headers for API calls"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestExecutiveDashboard(TestAuth):
    """Executive Dashboard API Tests"""
    
    def test_executive_dashboard_returns_200(self, auth_headers):
        """GET /api/reports/executive-dashboard returns 200"""
        response = requests.get(f"{BASE_URL}/api/reports/executive-dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_executive_dashboard_has_today_stats(self, auth_headers):
        """Dashboard has today's OP/IP counts, revenue, appointments"""
        response = requests.get(f"{BASE_URL}/api/reports/executive-dashboard", headers=auth_headers)
        data = response.json()
        
        assert "today" in data, "Missing 'today' section"
        today = data["today"]
        assert "ip_checkins" in today, "Missing ip_checkins"
        assert "op_checkins" in today, "Missing op_checkins"
        assert "revenue" in today, "Missing revenue"
        assert "collected" in today, "Missing collected"
        assert "appointments" in today, "Missing appointments"
        assert "completed_appointments" in today, "Missing completed_appointments"
    
    def test_executive_dashboard_has_active_patients(self, auth_headers):
        """Dashboard has active IP/OP patients and queue status"""
        response = requests.get(f"{BASE_URL}/api/reports/executive-dashboard", headers=auth_headers)
        data = response.json()
        
        assert "active" in data, "Missing 'active' section"
        active = data["active"]
        assert "ip_patients" in active, "Missing ip_patients"
        assert "op_patients" in active, "Missing op_patients"
        assert "queue_waiting" in active, "Missing queue_waiting"
        assert "queue_in_consultation" in active, "Missing queue_in_consultation"
    
    def test_executive_dashboard_has_monthly_revenue(self, auth_headers):
        """Dashboard has monthly revenue summary"""
        response = requests.get(f"{BASE_URL}/api/reports/executive-dashboard", headers=auth_headers)
        data = response.json()
        
        assert "monthly" in data, "Missing 'monthly' section"
        monthly = data["monthly"]
        assert "revenue" in monthly, "Missing monthly revenue"
        assert "collected" in monthly, "Missing monthly collected"
    
    def test_executive_dashboard_has_room_occupancy(self, auth_headers):
        """Dashboard has room occupancy stats"""
        response = requests.get(f"{BASE_URL}/api/reports/executive-dashboard", headers=auth_headers)
        data = response.json()
        
        assert "rooms" in data, "Missing 'rooms' section"
        rooms = data["rooms"]
        assert "total" in rooms, "Missing total rooms"
        assert "occupied" in rooms, "Missing occupied rooms"
        assert "available" in rooms, "Missing available rooms"
        assert "occupancy_rate" in rooms, "Missing occupancy_rate"
    
    def test_executive_dashboard_has_doctor_performance(self, auth_headers):
        """Dashboard has doctor performance list"""
        response = requests.get(f"{BASE_URL}/api/reports/executive-dashboard", headers=auth_headers)
        data = response.json()
        
        assert "doctor_performance" in data, "Missing 'doctor_performance' section"
        assert isinstance(data["doctor_performance"], list), "doctor_performance should be a list"
    
    def test_executive_dashboard_has_lead_stats(self, auth_headers):
        """Dashboard has lead counts"""
        response = requests.get(f"{BASE_URL}/api/reports/executive-dashboard", headers=auth_headers)
        data = response.json()
        
        assert "leads" in data, "Missing 'leads' section"
        leads = data["leads"]
        assert "total" in leads, "Missing total leads"
        assert "new" in leads, "Missing new leads"


class TestLeadCRUD(TestAuth):
    """Lead Management CRUD Tests"""
    
    created_lead_id = None
    
    def test_create_lead(self, auth_headers):
        """POST /api/leads creates a new lead"""
        lead_data = {
            "name": "TEST_Lead_Priya",
            "phone": "9876543210",
            "email": "priya.test@example.com",
            "source": "whatsapp",
            "inquiry_type": "panchakarma",
            "notes": "Interested in detox package",
            "follow_up_date": "2026-01-20"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Lead_Priya"
        assert data["phone"] == "9876543210"
        assert data["source"] == "whatsapp"
        assert data["status"] == "new"
        assert "id" in data
        
        TestLeadCRUD.created_lead_id = data["id"]
    
    def test_get_leads_list(self, auth_headers):
        """GET /api/leads returns list of leads"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_leads_by_status(self, auth_headers):
        """GET /api/leads?status=new filters by status"""
        response = requests.get(f"{BASE_URL}/api/leads?status=new", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for lead in data:
            assert lead["status"] == "new"
    
    def test_update_lead(self, auth_headers):
        """PUT /api/leads/{id} updates lead details"""
        if not TestLeadCRUD.created_lead_id:
            pytest.skip("No lead created")
        
        update_data = {
            "name": "TEST_Lead_Priya_Updated",
            "phone": "9876543210",
            "email": "priya.updated@example.com",
            "source": "phone_call",
            "inquiry_type": "consultation",
            "notes": "Updated notes - wants consultation first",
            "follow_up_date": "2026-01-25"
        }
        response = requests.put(f"{BASE_URL}/api/leads/{TestLeadCRUD.created_lead_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Lead_Priya_Updated"
        assert data["source"] == "phone_call"
        assert data["inquiry_type"] == "consultation"
    
    def test_update_lead_not_found(self, auth_headers):
        """PUT /api/leads/{id} returns 404 for non-existent lead"""
        response = requests.put(f"{BASE_URL}/api/leads/nonexistent-id", json={
            "name": "Test", "phone": "1234567890", "source": "whatsapp", "inquiry_type": "general"
        }, headers=auth_headers)
        assert response.status_code == 404


class TestLeadStatusPipeline(TestAuth):
    """Lead Status Pipeline Tests: new → contacted → follow_up → converted"""
    
    pipeline_lead_id = None
    
    def test_create_pipeline_lead(self, auth_headers):
        """Create a lead for pipeline testing"""
        lead_data = {
            "name": "TEST_Pipeline_Lead",
            "phone": "9988776655",
            "source": "website",
            "inquiry_type": "treatment"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "new"
        TestLeadStatusPipeline.pipeline_lead_id = data["id"]
    
    def test_status_new_to_contacted(self, auth_headers):
        """PUT /api/leads/{id}/status?status=contacted"""
        if not TestLeadStatusPipeline.pipeline_lead_id:
            pytest.skip("No pipeline lead")
        
        response = requests.put(
            f"{BASE_URL}/api/leads/{TestLeadStatusPipeline.pipeline_lead_id}/status?status=contacted",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "contacted"
    
    def test_status_contacted_to_follow_up(self, auth_headers):
        """PUT /api/leads/{id}/status?status=follow_up"""
        if not TestLeadStatusPipeline.pipeline_lead_id:
            pytest.skip("No pipeline lead")
        
        response = requests.put(
            f"{BASE_URL}/api/leads/{TestLeadStatusPipeline.pipeline_lead_id}/status?status=follow_up",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "follow_up"
    
    def test_status_invalid_value(self, auth_headers):
        """PUT /api/leads/{id}/status with invalid status returns 400"""
        if not TestLeadStatusPipeline.pipeline_lead_id:
            pytest.skip("No pipeline lead")
        
        response = requests.put(
            f"{BASE_URL}/api/leads/{TestLeadStatusPipeline.pipeline_lead_id}/status?status=invalid_status",
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_status_not_found(self, auth_headers):
        """PUT /api/leads/{id}/status returns 404 for non-existent lead"""
        response = requests.put(
            f"{BASE_URL}/api/leads/nonexistent-id/status?status=contacted",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestLeadConversion(TestAuth):
    """Lead Conversion to Patient Tests"""
    
    conversion_lead_id = None
    converted_patient_id = None
    converted_pid = None
    
    def test_create_conversion_lead(self, auth_headers):
        """Create a lead for conversion testing"""
        lead_data = {
            "name": "TEST_Conversion_Lead",
            "phone": "9112233445",
            "email": "convert.test@example.com",
            "source": "google",
            "inquiry_type": "package"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        assert response.status_code == 200
        
        TestLeadConversion.conversion_lead_id = response.json()["id"]
    
    def test_convert_lead_to_patient(self, auth_headers):
        """POST /api/leads/{id}/convert creates a new patient"""
        if not TestLeadConversion.conversion_lead_id:
            pytest.skip("No conversion lead")
        
        response = requests.post(
            f"{BASE_URL}/api/leads/{TestLeadConversion.conversion_lead_id}/convert",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "patient_id" in data
        assert "pid" in data
        assert "TAH-" in data["pid"]  # Auto-generated PID format
        
        TestLeadConversion.converted_patient_id = data["patient_id"]
        TestLeadConversion.converted_pid = data["pid"]
    
    def test_lead_status_is_converted(self, auth_headers):
        """Verify lead status changed to 'converted' after conversion"""
        if not TestLeadConversion.conversion_lead_id:
            pytest.skip("No conversion lead")
        
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        leads = response.json()
        
        converted_lead = next((l for l in leads if l["id"] == TestLeadConversion.conversion_lead_id), None)
        assert converted_lead is not None
        assert converted_lead["status"] == "converted"
        assert converted_lead["converted_patient_id"] == TestLeadConversion.converted_patient_id
    
    def test_patient_created_from_lead(self, auth_headers):
        """Verify patient was created with lead data"""
        if not TestLeadConversion.converted_patient_id:
            pytest.skip("No converted patient")
        
        response = requests.get(f"{BASE_URL}/api/patients/{TestLeadConversion.converted_patient_id}", headers=auth_headers)
        assert response.status_code == 200
        
        patient = response.json()
        assert patient["name"] == "TEST_Conversion_Lead"
        assert patient["phone"] == "9112233445"
        assert patient["email"] == "convert.test@example.com"
        assert patient["pid"] == TestLeadConversion.converted_pid
    
    def test_convert_already_converted_lead(self, auth_headers):
        """POST /api/leads/{id}/convert returns 400 for already converted lead"""
        if not TestLeadConversion.conversion_lead_id:
            pytest.skip("No conversion lead")
        
        response = requests.post(
            f"{BASE_URL}/api/leads/{TestLeadConversion.conversion_lead_id}/convert",
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_convert_nonexistent_lead(self, auth_headers):
        """POST /api/leads/{id}/convert returns 404 for non-existent lead"""
        response = requests.post(
            f"{BASE_URL}/api/leads/nonexistent-id/convert",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestLeadDelete(TestAuth):
    """Lead Delete Tests"""
    
    def test_delete_lead(self, auth_headers):
        """DELETE /api/leads/{id} deletes a lead"""
        # Create a lead to delete
        lead_data = {"name": "TEST_Delete_Lead", "phone": "9000000001", "source": "walkin", "inquiry_type": "general"}
        create_response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        lead_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        leads = get_response.json()
        assert not any(l["id"] == lead_id for l in leads)
    
    def test_delete_lead_not_found(self, auth_headers):
        """DELETE /api/leads/{id} returns 404 for non-existent lead"""
        response = requests.delete(f"{BASE_URL}/api/leads/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404


class TestFeedbackCRUD(TestAuth):
    """Feedback CRUD Tests"""
    
    created_feedback_id = None
    
    def test_create_feedback_high_rating(self, auth_headers):
        """POST /api/feedback with rating >= 3 (no escalation)"""
        fb_data = {
            "patient_name": "TEST_Happy_Patient",
            "rating": 5,
            "feedback_text": "Excellent service and treatment!",
            "source": "in_person"
        }
        response = requests.post(f"{BASE_URL}/api/feedback", json=fb_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["rating"] == 5
        assert data["escalation"] == False
        assert "id" in data
        
        TestFeedbackCRUD.created_feedback_id = data["id"]
    
    def test_get_feedback_list(self, auth_headers):
        """GET /api/feedback returns list of feedback"""
        response = requests.get(f"{BASE_URL}/api/feedback", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_feedback_summary(self, auth_headers):
        """GET /api/feedback/summary returns summary stats"""
        response = requests.get(f"{BASE_URL}/api/feedback/summary", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "average_rating" in data
        assert "escalations" in data
        assert "unresolved" in data
    
    def test_delete_feedback(self, auth_headers):
        """DELETE /api/feedback/{id} deletes feedback"""
        if not TestFeedbackCRUD.created_feedback_id:
            pytest.skip("No feedback created")
        
        response = requests.delete(f"{BASE_URL}/api/feedback/{TestFeedbackCRUD.created_feedback_id}", headers=auth_headers)
        assert response.status_code == 200
    
    def test_delete_feedback_not_found(self, auth_headers):
        """DELETE /api/feedback/{id} returns 404 for non-existent feedback"""
        response = requests.delete(f"{BASE_URL}/api/feedback/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404


class TestFeedbackEscalation(TestAuth):
    """Feedback Escalation Tests - ratings <= 2 auto-escalate"""
    
    escalated_feedback_id = None
    
    def test_create_feedback_low_rating_creates_escalation(self, auth_headers):
        """POST /api/feedback with rating <= 2 creates escalation"""
        fb_data = {
            "patient_name": "TEST_Unhappy_Patient",
            "rating": 1,
            "feedback_text": "Very poor experience, long wait times",
            "source": "form"
        }
        response = requests.post(f"{BASE_URL}/api/feedback", json=fb_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["rating"] == 1
        assert data["escalation"] == True, "Rating <= 2 should create escalation"
        assert data["escalation_resolved"] == False
        
        TestFeedbackEscalation.escalated_feedback_id = data["id"]
    
    def test_create_feedback_rating_2_creates_escalation(self, auth_headers):
        """POST /api/feedback with rating = 2 creates escalation"""
        fb_data = {
            "patient_name": "TEST_Dissatisfied_Patient",
            "rating": 2,
            "feedback_text": "Below average service",
            "source": "whatsapp"
        }
        response = requests.post(f"{BASE_URL}/api/feedback", json=fb_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["escalation"] == True
    
    def test_get_escalations_only(self, auth_headers):
        """GET /api/feedback?escalation_only=true returns only escalated feedback"""
        response = requests.get(f"{BASE_URL}/api/feedback?escalation_only=true", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for fb in data:
            assert fb["escalation"] == True
    
    def test_resolve_escalation(self, auth_headers):
        """PUT /api/feedback/{id}/resolve marks escalation as resolved"""
        if not TestFeedbackEscalation.escalated_feedback_id:
            pytest.skip("No escalated feedback")
        
        response = requests.put(
            f"{BASE_URL}/api/feedback/{TestFeedbackEscalation.escalated_feedback_id}/resolve?notes=Called%20patient%20and%20resolved%20issue",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["escalation_resolved"] == True
        assert "Called patient" in data["escalation_notes"] or data["escalation_notes"] == "Resolved"
    
    def test_summary_counts_escalations(self, auth_headers):
        """GET /api/feedback/summary counts escalations correctly"""
        response = requests.get(f"{BASE_URL}/api/feedback/summary", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["escalations"] >= 1, "Should have at least 1 escalation"


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_leads(self, auth_headers):
        """Delete TEST_ prefixed leads"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        leads = response.json()
        
        deleted = 0
        for lead in leads:
            if lead["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers)
                deleted += 1
        
        print(f"Cleaned up {deleted} test leads")
        assert True
    
    def test_cleanup_test_feedback(self, auth_headers):
        """Delete TEST_ prefixed feedback"""
        response = requests.get(f"{BASE_URL}/api/feedback", headers=auth_headers)
        feedback_list = response.json()
        
        deleted = 0
        for fb in feedback_list:
            if fb.get("patient_name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/feedback/{fb['id']}", headers=auth_headers)
                deleted += 1
        
        print(f"Cleaned up {deleted} test feedback entries")
        assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
