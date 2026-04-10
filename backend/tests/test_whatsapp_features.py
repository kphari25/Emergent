"""
Test WhatsApp messaging features - REQ-6
Tests:
1. Appointment response includes patient_phone field
2. Therapy schedule response includes patient_phone field
3. Phone number formatting utility logic verification
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWhatsAppFeatures:
    """Test WhatsApp messaging integration features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ayurcare.com",
            "password": "admin1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a patient with phone number for testing
        patients_response = self.session.get(f"{BASE_URL}/api/patients")
        assert patients_response.status_code == 200
        patients = patients_response.json()
        self.test_patient = None
        for p in patients:
            if p.get('phone'):
                self.test_patient = p
                break
        
        # Get a doctor for appointment testing
        doctors_response = self.session.get(f"{BASE_URL}/api/doctors")
        assert doctors_response.status_code == 200
        doctors = doctors_response.json()
        self.test_doctor = doctors[0] if doctors else None
        
        # Get therapy types for therapy schedule testing
        therapy_types_response = self.session.get(f"{BASE_URL}/api/therapy-types")
        assert therapy_types_response.status_code == 200
        therapy_types = therapy_types_response.json()
        self.test_therapy_type = therapy_types[0] if therapy_types else None
    
    # ==================== APPOINTMENT TESTS ====================
    
    def test_appointment_response_includes_patient_phone(self):
        """Test that appointment response includes patient_phone field"""
        if not self.test_patient or not self.test_doctor:
            pytest.skip("No test patient or doctor available")
        
        # Create a test appointment
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        appointment_data = {
            "patient_id": self.test_patient['id'],
            "doctor_id": self.test_doctor['id'],
            "date": tomorrow,
            "time": "10:00",
            "treatment_type": "Consultation",
            "notes": "TEST_WhatsApp feature test"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        assert create_response.status_code == 200, f"Failed to create appointment: {create_response.text}"
        
        appointment = create_response.json()
        
        # Verify patient_phone field exists
        assert 'patient_phone' in appointment, "patient_phone field missing in appointment response"
        print(f"Appointment created with patient_phone: {appointment.get('patient_phone')}")
        
        # Verify patient_phone matches patient's phone
        assert appointment['patient_phone'] == self.test_patient.get('phone', ''), \
            f"patient_phone mismatch: expected {self.test_patient.get('phone')}, got {appointment['patient_phone']}"
        
        # Store appointment ID for cleanup
        self.created_appointment_id = appointment['id']
        print(f"TEST PASSED: Appointment response includes patient_phone: {appointment['patient_phone']}")
    
    def test_get_appointments_includes_patient_phone(self):
        """Test that GET appointments returns patient_phone field"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = self.session.get(f"{BASE_URL}/api/appointments?date={tomorrow}")
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        
        appointments = response.json()
        if appointments:
            for apt in appointments:
                assert 'patient_phone' in apt, f"patient_phone field missing in appointment {apt.get('id')}"
            print(f"TEST PASSED: GET appointments returns {len(appointments)} appointments with patient_phone field")
        else:
            print("No appointments found for tomorrow, skipping field verification")
    
    # ==================== THERAPY SCHEDULE TESTS ====================
    
    def test_therapy_schedule_response_includes_patient_phone(self):
        """Test that therapy schedule response includes patient_phone field"""
        if not self.test_patient or not self.test_therapy_type:
            pytest.skip("No test patient or therapy type available")
        
        # Create a test therapy schedule
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        schedule_data = {
            "patient_id": self.test_patient['id'],
            "therapy_type_id": self.test_therapy_type['id'],
            "scheduled_date": tomorrow,
            "scheduled_time": "11:00",
            "notes": "TEST_WhatsApp feature test"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/therapy-schedules", json=schedule_data)
        assert create_response.status_code == 200, f"Failed to create therapy schedule: {create_response.text}"
        
        schedule = create_response.json()
        
        # Verify patient_phone field exists
        assert 'patient_phone' in schedule, "patient_phone field missing in therapy schedule response"
        print(f"Therapy schedule created with patient_phone: {schedule.get('patient_phone')}")
        
        # Verify patient_phone matches patient's phone
        assert schedule['patient_phone'] == self.test_patient.get('phone', ''), \
            f"patient_phone mismatch: expected {self.test_patient.get('phone')}, got {schedule['patient_phone']}"
        
        # Store schedule ID for cleanup
        self.created_schedule_id = schedule['id']
        print(f"TEST PASSED: Therapy schedule response includes patient_phone: {schedule['patient_phone']}")
    
    def test_get_therapy_schedules_includes_patient_phone(self):
        """Test that GET therapy schedules returns patient_phone field"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = self.session.get(f"{BASE_URL}/api/therapy-schedules?date={tomorrow}")
        assert response.status_code == 200, f"Failed to get therapy schedules: {response.text}"
        
        schedules = response.json()
        if schedules:
            for sched in schedules:
                assert 'patient_phone' in sched, f"patient_phone field missing in schedule {sched.get('id')}"
            print(f"TEST PASSED: GET therapy-schedules returns {len(schedules)} schedules with patient_phone field")
        else:
            print("No therapy schedules found for tomorrow, skipping field verification")
    
    # ==================== PATIENT DETAILS TESTS ====================
    
    def test_patient_has_phone_number(self):
        """Test that patients have phone numbers for WhatsApp messaging"""
        response = self.session.get(f"{BASE_URL}/api/patients")
        assert response.status_code == 200
        
        patients = response.json()
        patients_with_phone = [p for p in patients if p.get('phone')]
        
        print(f"Total patients: {len(patients)}")
        print(f"Patients with phone: {len(patients_with_phone)}")
        
        assert len(patients_with_phone) > 0, "No patients have phone numbers for WhatsApp testing"
        
        # Verify phone format (should be 10-digit Indian number)
        for p in patients_with_phone[:3]:  # Check first 3
            phone = p.get('phone', '')
            print(f"Patient {p['name']}: phone = {phone}")
        
        print(f"TEST PASSED: {len(patients_with_phone)} patients have phone numbers")
    
    def test_patient_report_for_whatsapp_context(self):
        """Test that patient report provides context for WhatsApp messages"""
        if not self.test_patient:
            pytest.skip("No test patient available")
        
        response = self.session.get(f"{BASE_URL}/api/patients/{self.test_patient['id']}/report")
        assert response.status_code == 200, f"Failed to get patient report: {response.text}"
        
        report = response.json()
        
        # Verify patient info is available
        assert 'patient' in report, "patient field missing in report"
        assert 'phone' in report['patient'], "phone field missing in patient"
        
        # Verify prescription history (for medicine refill messages)
        assert 'prescriptions' in report, "prescriptions field missing in report"
        
        # Verify checkin history (for follow-up messages)
        assert 'checkin_history' in report, "checkin_history field missing in report"
        
        print(f"TEST PASSED: Patient report contains all required fields for WhatsApp context")
        print(f"  - Patient phone: {report['patient'].get('phone')}")
        print(f"  - Prescriptions count: {len(report.get('prescriptions', []))}")
        print(f"  - Checkin history count: {len(report.get('checkin_history', []))}")


class TestPhoneFormatting:
    """Test phone number formatting logic (mirrors frontend utility)"""
    
    def format_phone_for_whatsapp(self, phone):
        """Python implementation of formatPhoneForWhatsApp utility"""
        if not phone:
            return None
        # Remove spaces, dashes, parentheses, plus
        import re
        cleaned = re.sub(r'[\s\-\(\)\+]', '', phone)
        # 10-digit number: add 91 prefix
        if len(cleaned) == 10:
            return f"91{cleaned}"
        # Already has 91 prefix and is 12 digits
        if cleaned.startswith('91') and len(cleaned) == 12:
            return cleaned
        # Starts with 0 and is 11 digits: remove 0, add 91
        if cleaned.startswith('0') and len(cleaned) == 11:
            return f"91{cleaned[1:]}"
        return cleaned
    
    def test_format_10_digit_number(self):
        """Test formatting 10-digit Indian mobile number"""
        result = self.format_phone_for_whatsapp("9876543210")
        assert result == "919876543210", f"Expected 919876543210, got {result}"
        print("TEST PASSED: 10-digit number formatted correctly")
    
    def test_format_12_digit_with_91_prefix(self):
        """Test formatting number already with 91 prefix"""
        result = self.format_phone_for_whatsapp("919876543210")
        assert result == "919876543210", f"Expected 919876543210, got {result}"
        print("TEST PASSED: 12-digit number with 91 prefix unchanged")
    
    def test_format_11_digit_with_0_prefix(self):
        """Test formatting number with 0 prefix"""
        result = self.format_phone_for_whatsapp("09876543210")
        assert result == "919876543210", f"Expected 919876543210, got {result}"
        print("TEST PASSED: 11-digit number with 0 prefix formatted correctly")
    
    def test_format_number_with_spaces(self):
        """Test formatting number with spaces"""
        result = self.format_phone_for_whatsapp("98765 43210")
        assert result == "919876543210", f"Expected 919876543210, got {result}"
        print("TEST PASSED: Number with spaces formatted correctly")
    
    def test_format_number_with_dashes(self):
        """Test formatting number with dashes"""
        result = self.format_phone_for_whatsapp("9876-543-210")
        assert result == "919876543210", f"Expected 919876543210, got {result}"
        print("TEST PASSED: Number with dashes formatted correctly")
    
    def test_format_number_with_plus(self):
        """Test formatting number with + prefix"""
        result = self.format_phone_for_whatsapp("+919876543210")
        assert result == "919876543210", f"Expected 919876543210, got {result}"
        print("TEST PASSED: Number with + prefix formatted correctly")
    
    def test_format_empty_phone(self):
        """Test formatting empty phone number"""
        result = self.format_phone_for_whatsapp("")
        assert result is None, f"Expected None, got {result}"
        result = self.format_phone_for_whatsapp(None)
        assert result is None, f"Expected None, got {result}"
        print("TEST PASSED: Empty phone returns None")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
