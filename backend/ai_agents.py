"""
Phase 1 AI Agents for Tatva Ayurved
- Intelligent Intake Agent (multi-turn chat)
- Prakriti/Vikriti Analysis Agent (text + vision)
- Ayurvedic Knowledge Agent (Q&A)
- Doctor Review Queue (all AI outputs gated here)
"""
import os
import uuid
import json
import secrets
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv(Path(__file__).parent / '.env')

ai_router = APIRouter(prefix="/api/ai")

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
TEXT_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")
VISION_MODEL = ("gemini", "gemini-2.5-pro")

# ==================== SYSTEM PROMPTS ====================

INTAKE_SYSTEM_PROMPT = """You are the Intake Assistant for Tatva Ayurved, an Ayurvedic hospital.
Conduct a natural, empathetic, single-question-at-a-time conversation to collect:
1. Chief complaint (what brings them in, duration, severity)
2. Medical history (past illnesses, surgeries, current medications)
3. Family history (diabetes, BP, heart disease, etc.)
4. Lifestyle: daily routine, sleep quality & timing, stress level
5. Ahara (diet): food preferences, meal timings, water intake, appetite
6. Vihara (lifestyle): exercise, yoga, occupation
7. Digestion & elimination: bowel regularity, urine frequency, gas/bloating
8. Body signs: body frame, skin texture, hair quality, preferred weather
9. Mental traits: temperament, memory, decision-making style
10. Specific symptoms relevant to Ayurvedic assessment (sleep disturbance, fatigue, pain patterns)

Rules:
- Ask ONE question per turn. Be warm and reassuring.
- Use simple language (Hindi/English mix is fine if the patient writes that way).
- If the patient gives vague answers, gently probe for specifics.
- After 12-18 exchanges you'll have enough data. When you feel you've covered all key areas, end with exactly this line on its own:
  "INTAKE_COMPLETE"
- Do NOT make medical diagnoses or recommend treatments — you only collect information.
"""

PRAKRITI_SYSTEM_PROMPT = """You are an Ayurvedic Constitution Analyst. You analyse patient intake data and optional tongue/eye images to estimate Prakriti (innate constitution) and Vikriti (current imbalance).

You return STRICT JSON matching this schema (no prose outside JSON):
{
  "prakriti_scores": {"vata": <0-100>, "pitta": <0-100>, "kapha": <0-100>},
  "vikriti_scores": {"vata": <0-100>, "pitta": <0-100>, "kapha": <0-100>},
  "dominant_prakriti": "Vata|Pitta|Kapha|Vata-Pitta|Pitta-Kapha|Vata-Kapha|Tridoshic",
  "dominant_vikriti": "<same options>",
  "reasoning": "<2-4 sentence clinical reasoning citing the specific intake traits>",
  "visual_findings": {"tongue": "<observations if tongue image provided else empty>", "eyes": "<observations if eye image provided else empty>"},
  "suggested_lines_of_treatment": ["<short>", "<short>", "<short>"],
  "confidence": "high|medium|low",
  "disclaimers": ["<caution>", "<caution>"]
}

Prakriti score percentages across the 3 doshas must sum to ~100. Same for Vikriti.
Keep clinical nuance: prakriti is innate (body type, childhood traits), vikriti is current (symptoms, recent changes).
NEVER prescribe specific drug dosages. Suggest only therapeutic directions (e.g., "Vata-pacifying diet", "Abhyanga with sesame oil").
This output will be reviewed by a licensed Ayurvedic doctor before patient use.
"""

KNOWLEDGE_SYSTEM_PROMPT = """You are an Ayurvedic Knowledge Agent grounded in classical Samhitas (Charaka, Sushruta, Ashtanga Hridayam) and modern AYUSH research. Answer the doctor's question with:

1. A concise, evidence-based answer (3-6 sentences).
2. Classical references when relevant (e.g., "Charaka Samhita, Chikitsa Sthana, Ch. 3").
3. Modern research notes if the topic has published evidence (cite by study/trial name when confident, never fabricate).
4. Practical clinical considerations (dose ranges, contraindications).
5. If you are uncertain or the query is outside classical Ayurveda, say so explicitly.

Format: plain text with clear headings (## Answer, ## Classical Reference, ## Modern Evidence, ## Clinical Notes, ## Cautions).
NEVER fabricate citations. If unsure, state "Exact reference citation not available in my grounding corpus."
"""

# ==================== MODELS ====================

class StartIntakeRequest(BaseModel):
    patient_id: Optional[str] = None
    language: Optional[str] = "english"  # english | hindi | mixed
    patient_name: Optional[str] = None

class IntakeMessageRequest(BaseModel):
    session_id: str
    message: str
    public_token: Optional[str] = None  # for patient-facing sessions

class SubmitIntakeRequest(BaseModel):
    session_id: str
    public_token: Optional[str] = None

class PrakritiAnalysisRequest(BaseModel):
    patient_id: Optional[str] = None
    intake_session_id: Optional[str] = None
    text_input: Optional[str] = None  # override/summary text if no session
    tongue_image_base64: Optional[str] = None
    eye_image_base64: Optional[str] = None

class KnowledgeQueryRequest(BaseModel):
    question: str
    patient_context: Optional[str] = None

class ReviewActionRequest(BaseModel):
    action: str  # approve | reject | edit
    reviewer_notes: Optional[str] = None
    edited_result: Optional[Dict[str, Any]] = None


# ==================== AUTH DEPENDENCY (lazy) ====================


def register_ai_router(app, db, current_user_dep):
    """Bind db + auth dep into the router closures and attach."""

    # ---------- Helper ----------
    def _new_chat(session_id: str, system_prompt: str, provider_model=TEXT_MODEL):
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=503, detail="LLM key not configured")
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt,
        ).with_model(provider_model[0], provider_model[1])
        return chat

    # ==================== INTAKE AGENT ====================

    @ai_router.post("/intake/start")
    async def start_intake(req: StartIntakeRequest, user: dict = Depends(current_user_dep)):
        """Staff-initiated intake session."""
        session_id = str(uuid.uuid4())
        public_token = secrets.token_urlsafe(24)
        greeting = "Namaste! I'm here to understand your health journey so our doctors can prepare the best Ayurvedic care plan for you. Let's start gently — could you tell me what's bringing you in today, and how long you've been experiencing it?"
        doc = {
            'id': session_id,
            'public_token': public_token,
            'patient_id': req.patient_id,
            'patient_name': req.patient_name,
            'language': req.language,
            'created_by': user['id'],
            'created_by_name': user.get('name'),
            'status': 'active',
            'mode': 'staff_assisted',
            'messages': [
                {'role': 'assistant', 'text': greeting, 'ts': datetime.now(timezone.utc).isoformat()}
            ],
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.intake_sessions.insert_one(doc)
        return {
            'session_id': session_id,
            'public_token': public_token,
            'greeting': greeting,
        }

    @ai_router.post("/intake/start-public")
    async def start_intake_public(req: StartIntakeRequest):
        """Patient-facing intake start (no auth). Requires patient_name."""
        if not req.patient_name:
            raise HTTPException(status_code=400, detail="patient_name required")
        session_id = str(uuid.uuid4())
        public_token = secrets.token_urlsafe(24)
        greeting = f"Namaste {req.patient_name}! I'm your Tatva Ayurved intake assistant. I'll ask you a few gentle questions so our doctors can prepare the right care plan. Could you start by telling me what's troubling you today, and for how long?"
        doc = {
            'id': session_id,
            'public_token': public_token,
            'patient_id': req.patient_id,
            'patient_name': req.patient_name,
            'language': req.language,
            'created_by': 'patient_self',
            'status': 'active',
            'mode': 'patient_self',
            'messages': [
                {'role': 'assistant', 'text': greeting, 'ts': datetime.now(timezone.utc).isoformat()}
            ],
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.intake_sessions.insert_one(doc)
        return {
            'session_id': session_id,
            'public_token': public_token,
            'greeting': greeting,
        }

    @ai_router.post("/intake/message")
    async def intake_message(req: IntakeMessageRequest, user: dict = Depends(current_user_dep)):
        return await _handle_intake_message(req, allow_public=False)

    @ai_router.post("/intake/message-public")
    async def intake_message_public(req: IntakeMessageRequest):
        if not req.public_token:
            raise HTTPException(status_code=400, detail="public_token required")
        return await _handle_intake_message(req, allow_public=True)

    async def _handle_intake_message(req: IntakeMessageRequest, allow_public: bool):
        session = await db.intake_sessions.find_one({'id': req.session_id}, {'_id': 0})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if allow_public:
            if session['mode'] != 'patient_self' or req.public_token != session.get('public_token'):
                raise HTTPException(status_code=403, detail="Unauthorised")
        if session['status'] != 'active':
            raise HTTPException(status_code=400, detail="Session already submitted")

        chat = _new_chat(req.session_id, INTAKE_SYSTEM_PROMPT)
        history = session.get('messages', [])
        recap = "\n".join([f"{m['role'].upper()}: {m['text']}" for m in history])
        user_turn = f"[Prior conversation:]\n{recap}\n\n[New patient message:]\n{req.message}\n\nRespond as the Intake Assistant. Ask the next single best question, or if you have covered all 10 areas above, output exactly 'INTAKE_COMPLETE' on its own line."
        try:
            reply = await chat.send_message(UserMessage(text=user_turn))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM error: {e}")

        reply_text = (reply or "").strip()
        is_complete = reply_text.endswith("INTAKE_COMPLETE") or reply_text == "INTAKE_COMPLETE"
        visible_reply = reply_text.replace("INTAKE_COMPLETE", "").strip()
        if not visible_reply and is_complete:
            visible_reply = "Thank you for sharing all this with me. I have enough to prepare a summary for the doctor. You can now submit the intake."

        now = datetime.now(timezone.utc).isoformat()
        new_msgs = [
            {'role': 'user', 'text': req.message, 'ts': now},
            {'role': 'assistant', 'text': visible_reply, 'ts': now},
        ]
        await db.intake_sessions.update_one(
            {'id': req.session_id},
            {'$push': {'messages': {'$each': new_msgs}}, '$set': {'updated_at': now, 'intake_ready': is_complete}}
        )
        return {'reply': visible_reply, 'intake_ready': is_complete}

    @ai_router.post("/intake/submit")
    async def intake_submit(req: SubmitIntakeRequest, user: dict = Depends(current_user_dep)):
        return await _handle_intake_submit(req, allow_public=False)

    @ai_router.post("/intake/submit-public")
    async def intake_submit_public(req: SubmitIntakeRequest):
        if not req.public_token:
            raise HTTPException(status_code=400, detail="public_token required")
        return await _handle_intake_submit(req, allow_public=True)

    async def _handle_intake_submit(req: SubmitIntakeRequest, allow_public: bool):
        session = await db.intake_sessions.find_one({'id': req.session_id}, {'_id': 0})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if allow_public:
            if session['mode'] != 'patient_self' or req.public_token != session.get('public_token'):
                raise HTTPException(status_code=403, detail="Unauthorised")

        transcript = "\n".join([f"{m['role'].upper()}: {m['text']}" for m in session.get('messages', [])])
        summariser = _new_chat(f"{req.session_id}-summary", (
            "You are a clinical summariser. Extract structured fields from an Ayurvedic intake conversation. "
            "Return STRICT JSON only, no prose. Schema: {chief_complaint, duration, severity, history, medications, lifestyle, diet, digestion, sleep, mental_traits, body_signs, key_symptoms, red_flags}. "
            "Each value is a short string or list. Omit fields not discussed."
        ))
        summary_prompt = f"Intake transcript:\n{transcript}\n\nReturn JSON only."
        try:
            summary_raw = await summariser.send_message(UserMessage(text=summary_prompt))
            s = (summary_raw or "").strip()
            if s.startswith("```"):
                s = s.strip("`")
                if s.startswith("json"):
                    s = s[4:]
            summary = json.loads(s.strip())
        except Exception:
            summary = {'raw_notes': transcript[:4000]}

        now = datetime.now(timezone.utc).isoformat()
        await db.intake_sessions.update_one(
            {'id': req.session_id},
            {'$set': {'status': 'submitted', 'summary': summary, 'submitted_at': now, 'updated_at': now}}
        )
        return {'status': 'submitted', 'summary': summary}

    @ai_router.get("/intake/session/{session_id}")
    async def get_intake_session(session_id: str, user: dict = Depends(current_user_dep)):
        session = await db.intake_sessions.find_one({'id': session_id}, {'_id': 0})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

    @ai_router.get("/intake/session-public/{session_id}")
    async def get_intake_session_public(session_id: str, token: str):
        session = await db.intake_sessions.find_one({'id': session_id}, {'_id': 0})
        if not session or session.get('public_token') != token:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            'id': session['id'],
            'status': session.get('status'),
            'patient_name': session.get('patient_name'),
            'messages': session.get('messages', []),
            'intake_ready': session.get('intake_ready', False),
        }

    @ai_router.get("/intake/sessions")
    async def list_intake_sessions(user: dict = Depends(current_user_dep)):
        cursor = db.intake_sessions.find({}, {'_id': 0}).sort('updated_at', -1).limit(100)
        items = await cursor.to_list(length=100)
        # Trim message lists for list view
        for i in items:
            msgs = i.get('messages', [])
            i['message_count'] = len(msgs)
            i['last_message'] = msgs[-1]['text'][:140] if msgs else ''
            i.pop('messages', None)
            i.pop('public_token', None)
        return items

    # ==================== PRAKRITI ANALYSIS ====================

    @ai_router.post("/prakriti/analyze")
    async def prakriti_analyze(req: PrakritiAnalysisRequest, user: dict = Depends(current_user_dep)):
        # Gather intake context
        context_text = req.text_input or ""
        patient_info = {}
        if req.intake_session_id:
            session = await db.intake_sessions.find_one({'id': req.intake_session_id}, {'_id': 0})
            if not session:
                raise HTTPException(status_code=404, detail="Intake session not found")
            summary = session.get('summary') or {}
            transcript = "\n".join([f"{m['role'].upper()}: {m['text']}" for m in session.get('messages', [])])
            context_text = f"Structured summary:\n{json.dumps(summary, indent=2)}\n\nFull transcript:\n{transcript}"
            patient_info = {'patient_id': session.get('patient_id'), 'patient_name': session.get('patient_name')}
        if not req.patient_id and patient_info.get('patient_id'):
            req.patient_id = patient_info['patient_id']

        has_images = bool(req.tongue_image_base64 or req.eye_image_base64)
        chat = _new_chat(f"prakriti-{uuid.uuid4()}", PRAKRITI_SYSTEM_PROMPT, VISION_MODEL if has_images else TEXT_MODEL)

        image_contents = []
        if req.tongue_image_base64:
            image_contents.append(ImageContent(image_base64=req.tongue_image_base64))
        if req.eye_image_base64:
            image_contents.append(ImageContent(image_base64=req.eye_image_base64))

        prompt = f"Analyse this Ayurvedic intake and produce the JSON result:\n\n{context_text}\n\n"
        if req.tongue_image_base64:
            prompt += "First image = TONGUE photo. Note coating, colour, cracks, body shape, teeth-marks.\n"
        if req.eye_image_base64:
            prompt += "Second image = EYE photo. Note sclera colour, pupil size, conjunctiva, shine.\n"
        prompt += "\nReturn STRICT JSON only — no prose, no code fences."

        try:
            msg = UserMessage(text=prompt, file_contents=image_contents) if image_contents else UserMessage(text=prompt)
            raw = await chat.send_message(msg)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM error: {e}")

        # Parse JSON
        s = (raw or "").strip()
        if s.startswith("```"):
            s = s.strip("`")
            if s.lower().startswith("json"):
                s = s[4:]
        try:
            parsed = json.loads(s.strip())
        except Exception:
            raise HTTPException(status_code=502, detail=f"LLM returned non-JSON: {raw[:300]}")

        analysis_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            'id': analysis_id,
            'patient_id': req.patient_id,
            'patient_name': patient_info.get('patient_name'),
            'intake_session_id': req.intake_session_id,
            'result': parsed,
            'has_tongue_image': bool(req.tongue_image_base64),
            'has_eye_image': bool(req.eye_image_base64),
            'model_used': VISION_MODEL[1] if has_images else TEXT_MODEL[1],
            'status': 'pending_review',
            'created_by': user['id'],
            'created_by_name': user.get('name'),
            'created_at': now,
            'updated_at': now,
        }
        await db.prakriti_analyses.insert_one(doc)
        doc.pop('_id', None)
        return doc

    @ai_router.get("/prakriti/analyses")
    async def list_prakriti_analyses(status: Optional[str] = None, user: dict = Depends(current_user_dep)):
        q = {}
        if status:
            q['status'] = status
        cursor = db.prakriti_analyses.find(q, {'_id': 0}).sort('created_at', -1).limit(100)
        return await cursor.to_list(length=100)

    @ai_router.get("/prakriti/analysis/{analysis_id}")
    async def get_prakriti_analysis(analysis_id: str, user: dict = Depends(current_user_dep)):
        doc = await db.prakriti_analyses.find_one({'id': analysis_id}, {'_id': 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        return doc

    @ai_router.post("/prakriti/analysis/{analysis_id}/review")
    async def review_prakriti(analysis_id: str, req: ReviewActionRequest, user: dict = Depends(current_user_dep)):
        if user.get('role') not in ['admin', 'doctor']:
            raise HTTPException(status_code=403, detail="Only doctors/admins can review")
        doc = await db.prakriti_analyses.find_one({'id': analysis_id}, {'_id': 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        now = datetime.now(timezone.utc).isoformat()
        updates = {
            'status': {'approve': 'approved', 'reject': 'rejected', 'edit': 'approved'}.get(req.action, 'pending_review'),
            'reviewer_notes': req.reviewer_notes,
            'reviewed_by': user['id'],
            'reviewed_by_name': user.get('name'),
            'reviewed_at': now,
            'updated_at': now,
        }
        if req.action == 'edit' and req.edited_result:
            updates['result'] = req.edited_result
            updates['edited'] = True
        await db.prakriti_analyses.update_one({'id': analysis_id}, {'$set': updates})

        # If approved and patient_id exists, append to patient record
        if updates['status'] == 'approved' and doc.get('patient_id'):
            final_result = updates.get('result') or doc.get('result')
            await db.patients.update_one(
                {'id': doc['patient_id']},
                {'$set': {
                    'prakriti_assessment': final_result,
                    'prakriti_assessment_at': now,
                    'prakriti_assessment_by': user.get('name'),
                }}
            )
        return {'status': updates['status']}

    # ==================== KNOWLEDGE AGENT ====================

    @ai_router.post("/knowledge/ask")
    async def knowledge_ask(req: KnowledgeQueryRequest, user: dict = Depends(current_user_dep)):
        chat = _new_chat(f"kb-{uuid.uuid4()}", KNOWLEDGE_SYSTEM_PROMPT)
        prompt = req.question
        if req.patient_context:
            prompt = f"[Patient context: {req.patient_context}]\n\nQuestion: {req.question}"
        try:
            answer = await chat.send_message(UserMessage(text=prompt))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM error: {e}")

        now = datetime.now(timezone.utc).isoformat()
        qid = str(uuid.uuid4())
        await db.knowledge_queries.insert_one({
            'id': qid,
            'question': req.question,
            'patient_context': req.patient_context,
            'answer': answer,
            'asked_by': user['id'],
            'asked_by_name': user.get('name'),
            'created_at': now,
        })
        return {'id': qid, 'answer': answer, 'created_at': now}

    @ai_router.get("/knowledge/history")
    async def knowledge_history(user: dict = Depends(current_user_dep)):
        cursor = db.knowledge_queries.find({'asked_by': user['id']}, {'_id': 0}).sort('created_at', -1).limit(50)
        return await cursor.to_list(length=50)

    # ==================== DOCTOR REVIEW QUEUE ====================

    @ai_router.get("/review-queue")
    async def review_queue(user: dict = Depends(current_user_dep)):
        if user.get('role') not in ['admin', 'doctor']:
            raise HTTPException(status_code=403, detail="Doctor access required")
        pending_prakriti = await db.prakriti_analyses.find({'status': 'pending_review'}, {'_id': 0}).sort('created_at', -1).to_list(length=100)
        submitted_intakes = await db.intake_sessions.find({'status': 'submitted'}, {'_id': 0, 'public_token': 0}).sort('submitted_at', -1).to_list(length=100)
        return {
            'pending_prakriti': pending_prakriti,
            'submitted_intakes': submitted_intakes,
        }

    app.include_router(ai_router)
    return ai_router
