"""
Tests for Phase 1 AI Agents (Intake / Prakriti / Knowledge / Review Queue).
Hits real backend + live Emergent LLM key. Keep volume small.
"""
import os
import base64
import io
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ayur-system.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "admin@ayurcare.com"
ADMIN_PWD = "admin1234"


# ---------------- Fixtures ----------------

@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PWD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def tongue_image_b64():
    from PIL import Image, ImageDraw
    img = Image.new('RGB', (256, 256), (220, 90, 90))
    d = ImageDraw.Draw(img)
    d.ellipse([40, 60, 216, 220], fill=(240, 220, 200))
    d.line([128, 70, 128, 210], fill=(180, 60, 60), width=3)
    for x in range(60, 200, 20):
        for y in range(90, 200, 20):
            d.ellipse([x, y, x+4, y+4], fill=(200, 120, 120))
    for y in range(80, 200, 16):
        d.ellipse([36, y, 50, y+10], fill=(200, 80, 80))
        d.ellipse([206, y, 220, y+10], fill=(200, 80, 80))
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=85)
    return base64.b64encode(buf.getvalue()).decode()


# ---------------- Regression: login / patients / rooms ----------------

class TestRegression:
    def test_login_works(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10

    def test_patients_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/patients", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_rooms_overview(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/rooms/overview", headers=admin_headers, timeout=30)
        assert r.status_code == 200

    def test_therapy_schedules(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/therapy-schedules", headers=admin_headers, timeout=30)
        assert r.status_code == 200

    def test_bills(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/bills", headers=admin_headers, timeout=30)
        assert r.status_code == 200

    def test_rooms_post_regression(self, admin_headers):
        # Room add focus bug fix regression
        payload = {
            "room_number": f"TEST-{os.urandom(3).hex()}",
            "room_type": "general",
            "capacity": 1,
            "daily_rate": 1500.0,
            "floor": "1",
            "amenities": ["ac"],
        }
        r = requests.post(f"{BASE_URL}/api/rooms", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code in (200, 201), f"rooms POST failed: {r.status_code} {r.text[:200]}"
        room_id = r.json().get('id')
        if room_id:
            requests.delete(f"{BASE_URL}/api/rooms/{room_id}", headers=admin_headers, timeout=15)


# ---------------- Intake Agent (staff) ----------------

class TestIntakeStaff:
    @pytest.fixture(scope="class")
    def session(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/ai/intake/start",
                          json={"language": "english", "patient_name": "TEST_Ramesh"},
                          headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "session_id" in data and "public_token" in data and "greeting" in data
        return data

    def test_start_returns_fields(self, session):
        assert len(session["public_token"]) >= 20
        assert "Namaste" in session["greeting"] or len(session["greeting"]) > 20

    def test_multi_turn_message(self, session, admin_headers):
        sid = session["session_id"]
        r1 = requests.post(f"{BASE_URL}/api/ai/intake/message",
                           json={"session_id": sid, "message": "I have chronic lower back pain since 2 years, gets worse in cold weather."},
                           headers=admin_headers, timeout=90)
        assert r1.status_code == 200, r1.text[:300]
        j1 = r1.json()
        assert "reply" in j1 and isinstance(j1["reply"], str) and len(j1["reply"]) > 5
        # Second turn
        r2 = requests.post(f"{BASE_URL}/api/ai/intake/message",
                           json={"session_id": sid, "message": "Sleep is 5-6 hrs, vegetarian diet, vata-prone thin frame, dry skin."},
                           headers=admin_headers, timeout=90)
        assert r2.status_code == 200
        j2 = r2.json()
        assert j2["reply"] != j1["reply"], "LLM repeated the exact same reply"

    def test_list_sessions_no_token_leak(self, admin_headers, session):
        r = requests.get(f"{BASE_URL}/api/ai/intake/sessions", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        for it in items:
            assert "public_token" not in it, "public_token leaked in list view"

    def test_submit_session(self, session, admin_headers):
        sid = session["session_id"]
        r = requests.post(f"{BASE_URL}/api/ai/intake/submit",
                          json={"session_id": sid}, headers=admin_headers, timeout=120)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j["status"] == "submitted"
        assert "summary" in j and isinstance(j["summary"], dict)


# ---------------- Intake Agent (patient-self / public) ----------------

class TestIntakePublic:
    @pytest.fixture(scope="class")
    def public_session(self):
        r = requests.post(f"{BASE_URL}/api/ai/intake/start-public",
                          json={"patient_name": "TEST_PublicUser"}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        return r.json()

    def test_public_start_requires_name(self):
        r = requests.post(f"{BASE_URL}/api/ai/intake/start-public", json={}, timeout=15)
        assert r.status_code == 400

    def test_public_message_bad_token(self, public_session):
        r = requests.post(f"{BASE_URL}/api/ai/intake/message-public",
                          json={"session_id": public_session["session_id"],
                                "message": "hi",
                                "public_token": "bogus-token-xxx"}, timeout=30)
        assert r.status_code == 403

    def test_public_message_good_token(self, public_session):
        r = requests.post(f"{BASE_URL}/api/ai/intake/message-public",
                          json={"session_id": public_session["session_id"],
                                "message": "I have anxiety and acidity from 6 months.",
                                "public_token": public_session["public_token"]}, timeout=90)
        assert r.status_code == 200, r.text[:300]
        assert "reply" in r.json()

    def test_public_get_session_requires_token(self, public_session):
        sid = public_session["session_id"]
        # wrong token => 404
        r_bad = requests.get(f"{BASE_URL}/api/ai/intake/session-public/{sid}?token=wrong", timeout=15)
        assert r_bad.status_code == 404
        # correct token => 200
        r_ok = requests.get(f"{BASE_URL}/api/ai/intake/session-public/{sid}?token={public_session['public_token']}", timeout=15)
        assert r_ok.status_code == 200
        body = r_ok.json()
        assert "messages" in body and "patient_name" in body


# ---------------- Prakriti Agent ----------------

class TestPrakriti:
    @pytest.fixture(scope="class")
    def text_analysis(self, admin_headers):
        payload = {
            "text_input": (
                "46-year-old female, thin-frame, dry skin, constipation-prone, "
                "light sleeper, anxious temperament, cold hands, prefers warm food. "
                "Chief complaint: joint pain and insomnia since 1 year."
            )
        }
        r = requests.post(f"{BASE_URL}/api/ai/prakriti/analyze",
                          json=payload, headers=admin_headers, timeout=120)
        assert r.status_code == 200, r.text[:400]
        return r.json()

    def test_text_analysis_schema(self, text_analysis):
        res = text_analysis["result"]
        for k in ("prakriti_scores", "vikriti_scores", "dominant_prakriti",
                  "dominant_vikriti", "reasoning", "suggested_lines_of_treatment", "confidence"):
            assert k in res, f"missing key {k}"
        for d in ("vata", "pitta", "kapha"):
            assert d in res["prakriti_scores"]
            assert d in res["vikriti_scores"]
        assert text_analysis["status"] == "pending_review"
        assert text_analysis["model_used"].startswith("claude")

    def test_list_and_detail(self, text_analysis, admin_headers):
        r = requests.get(f"{BASE_URL}/api/ai/prakriti/analyses", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert text_analysis["id"] in ids
        r2 = requests.get(f"{BASE_URL}/api/ai/prakriti/analysis/{text_analysis['id']}",
                          headers=admin_headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["id"] == text_analysis["id"]

    def test_vision_analysis_with_tongue(self, admin_headers, tongue_image_b64):
        payload = {
            "text_input": "Patient reports dry mouth and metallic taste. Pitta-prone frame.",
            "tongue_image_base64": tongue_image_b64,
        }
        r = requests.post(f"{BASE_URL}/api/ai/prakriti/analyze",
                          json=payload, headers=admin_headers, timeout=180)
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        assert data["has_tongue_image"] is True
        assert data["model_used"].startswith("gemini")
        res = data["result"]
        assert "visual_findings" in res
        tongue_obs = (res["visual_findings"] or {}).get("tongue", "")
        assert isinstance(tongue_obs, str) and len(tongue_obs) > 5, \
            f"tongue visual_findings empty: {res.get('visual_findings')}"

    def test_reject_analysis(self, admin_headers):
        # create one
        payload = {"text_input": "Young male, stocky, sluggish, oily skin, prefers warm and spicy food."}
        r = requests.post(f"{BASE_URL}/api/ai/prakriti/analyze", json=payload,
                          headers=admin_headers, timeout=120)
        assert r.status_code == 200
        aid = r.json()["id"]
        rv = requests.post(f"{BASE_URL}/api/ai/prakriti/analysis/{aid}/review",
                           json={"action": "reject", "reviewer_notes": "test reject"},
                           headers=admin_headers, timeout=30)
        assert rv.status_code == 200
        assert rv.json()["status"] == "rejected"

    def test_approve_writes_to_patient(self, admin_headers):
        # create a TEST patient
        pt = requests.post(f"{BASE_URL}/api/patients", headers=admin_headers, timeout=30,
                           json={"name": "TEST_PrakritiPt", "age": 40, "gender": "male",
                                 "phone": f"98{os.urandom(4).hex()[:8]}", "email": f"test_{os.urandom(2).hex()}@t.com",
                                 "address": "x"})
        assert pt.status_code in (200, 201), pt.text[:200]
        patient_id = pt.json()["id"]
        # analyse
        r = requests.post(f"{BASE_URL}/api/ai/prakriti/analyze",
                          headers=admin_headers, timeout=120,
                          json={"patient_id": patient_id,
                                "text_input": "Cold hands, light sleeper, variable appetite, creative, thin."})
        aid = r.json()["id"]
        # approve
        rv = requests.post(f"{BASE_URL}/api/ai/prakriti/analysis/{aid}/review",
                           json={"action": "approve", "reviewer_notes": "ok"},
                           headers=admin_headers, timeout=30)
        assert rv.status_code == 200 and rv.json()["status"] == "approved"
        # verify via direct Mongo (PatientResponse pydantic model filters unknown fields on GET)
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        async def _check():
            c = AsyncIOMotorClient('mongodb://localhost:27017')
            doc = await c['test_database'].patients.find_one({'id': patient_id}, {'_id': 0})
            return doc
        doc = asyncio.run(_check())
        assert doc is not None, "patient not found"
        assert doc.get("prakriti_assessment"), "prakriti_assessment NOT written to patients collection"
        assert doc.get("prakriti_assessment_at")
        # Note: GET /api/patients/{id} does NOT surface prakriti_assessment — see iteration report.


# ---------------- Knowledge Agent ----------------

class TestKnowledge:
    def test_ask_and_history(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/ai/knowledge/ask",
                          json={"question": "What is the classical Ayurvedic management of Amavata?"},
                          headers=admin_headers, timeout=120)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "answer" in data and len(data["answer"]) > 30
        # history
        h = requests.get(f"{BASE_URL}/api/ai/knowledge/history", headers=admin_headers, timeout=30)
        assert h.status_code == 200
        items = h.json()
        assert isinstance(items, list) and any(x["id"] == data["id"] for x in items)


# ---------------- Review Queue + RBAC ----------------

class TestReviewQueueRBAC:
    def test_queue_admin(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/ai/review-queue", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "pending_prakriti" in body and "submitted_intakes" in body

    @pytest.fixture(scope="class")
    def staff_headers(self, admin_headers):
        # Create a non-admin/non-doctor staff user (role='staff')
        email = f"test_staff_{os.urandom(2).hex()}@t.com"
        pwd = "Staff12345"
        reg = requests.post(f"{BASE_URL}/api/auth/register",
                            json={"name": "TEST Staff", "email": email,
                                  "password": pwd, "role": "staff"}, timeout=30)
        if reg.status_code not in (200, 201):
            # fallback: try admin-create-user
            reg = requests.post(f"{BASE_URL}/api/users", headers=admin_headers, timeout=30,
                                json={"name": "TEST Staff", "email": email,
                                      "password": pwd, "role": "staff"})
        if reg.status_code not in (200, 201):
            pytest.skip(f"Could not create staff user: {reg.status_code} {reg.text[:150]}")
        log = requests.post(f"{BASE_URL}/api/auth/login",
                            json={"email": email, "password": pwd}, timeout=30)
        if log.status_code != 200:
            pytest.skip(f"Staff login failed: {log.status_code}")
        return {"Authorization": f"Bearer {log.json()['access_token']}",
                "Content-Type": "application/json"}

    def test_queue_non_doctor_forbidden(self, staff_headers):
        r = requests.get(f"{BASE_URL}/api/ai/review-queue", headers=staff_headers, timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}"

    def test_review_non_doctor_forbidden(self, admin_headers, staff_headers):
        # Make an analysis (admin)
        r = requests.post(f"{BASE_URL}/api/ai/prakriti/analyze",
                          json={"text_input": "quick rbac test patient"},
                          headers=admin_headers, timeout=120)
        assert r.status_code == 200
        aid = r.json()["id"]
        rv = requests.post(f"{BASE_URL}/api/ai/prakriti/analysis/{aid}/review",
                           json={"action": "approve"}, headers=staff_headers, timeout=30)
        assert rv.status_code == 403
