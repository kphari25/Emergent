# Tatva Ayurved - Hospital Management System PRD

## Original Problem Statement
Build a comprehensive Ayurvedic hospital management program "Tatva Ayurved" with Patient Management (IP/OP), Inventory Management, Billing (GST, A4 invoices), Reporting, HR Module, and RBAC. Extended with Therapy Scheduling, Consolidated Billing, CRM, WhatsApp messaging, and **Phase 1 AI Agents** (Intake, Prakriti/Vikriti analysis with vision, Ayurvedic Knowledge, Doctor Review Queue).

## Tech Stack
- Backend: FastAPI + MongoDB (Motor) + PyJWT + emergentintegrations (Claude Sonnet 4.5, Gemini 2.5 Pro vision)
- Frontend: React + Tailwind CSS + Shadcn/UI + Recharts
- Auth: JWT with role-based access (Admin, Doctor, Front Desk, Therapist, HR)

## Completed Features
- Authentication & RBAC with User Management (Admin only)
- Patient Management: CRUD, check-in/out, CSV/Excel import, Auto-PID, Prakriti profiles
- Inventory, IP/OP Billing (18% GST, A4 Tax Invoice with logo), Consolidated Billing with Advances
- HR, Mess, Live Queue, Room Management (with floor maps + packages)
- Executive Dashboard, Lead Management CRM, Feedback (star ratings)
- REQ-4 Therapy Scheduling, REQ-5 Consolidated Billing with Pharmacy Linkage
- WhatsApp click-to-chat (6 templates across Patient Details, Appointments, Therapy)
- Deployment guides: Windows Server, Vercel+Render+Atlas, scripts (backup/healthcheck/install)
- **Profit & Loss Statement tab** (Feb 2026) — real-time income-statement view under Reports → P&L. Auto-aggregates revenue (patient billing + medicine sales + medicine profit) and expenses (medicine purchase, mess, electricity, salary from HR, misc) with date-range filter and net profit/loss bottom line.

## Phase 1 AI Agents (Feb 2026)
- **Intelligent Intake Agent** — multi-turn conversational history collection (staff-initiated + patient-facing public link with token). Auto-summarises into structured JSON on submit.
- **Prakriti/Vikriti Analysis Agent** — accepts intake text + optional tongue/eye images (JPEG/PNG/WEBP), returns dosha scores, dominant constitution/imbalance, reasoning, treatment lines, confidence. Text-only uses Claude Sonnet 4.5; with images routes to Gemini 2.5 Pro.
- **Ayurvedic Knowledge Agent** — Q&A grounded in classical Samhitas with structured citations format. LLM-seeded baseline; PDF corpus upload is P2.
- **Doctor Review Queue** — all AI outputs land here with status `pending_review`. Admin/doctor can approve (writes `prakriti_assessment` to patient chart) or reject. Approved results also persist assessor name + timestamp.
- **Public Patient Intake** — shareable `/intake/:sessionId?token=xxx` URL, no auth, phone-friendly chat UI, submits back to review queue.

## Key Endpoints (AI)
- POST /api/ai/intake/{start,message,submit,start-public,message-public,submit-public}
- GET /api/ai/intake/sessions, /api/ai/intake/session/:id, /api/ai/intake/session-public/:id?token=
- POST /api/ai/prakriti/analyze, GET /api/ai/prakriti/analyses, POST /api/ai/prakriti/analysis/:id/review
- POST /api/ai/knowledge/ask, GET /api/ai/knowledge/history
- GET /api/ai/review-queue

## Upcoming (P1)
- **Phase 2 AI**: Personalized Treatment Agent, Panchakarma Management Agent, Smart Scheduling Agent
- Payroll reminders for admin

## Backlog (P2)
- **Phase 3 AI**: Pharmacy & Supply Chain Agent, Billing & Claims Agent
- **Phase 4 AI**: Follow-up & Compliance Agent (needs Twilio), Virtual Wellness Coach, Nadi Pariksha Interpreter (manual pulse data)
- Samhita PDF knowledge corpus ingestion
- REQ-1.6: Document Vault (file uploads)
- Frontend accessibility fixes (ARIA labels)
- server.py modularization (3000+ lines monolith)

## Credentials
- Admin: admin@ayurcare.com / admin1234

## Integrations
- EMERGENT_LLM_KEY (universal key) in /app/backend/.env — powers Claude Sonnet 4.5 + Gemini 2.5 Pro via emergentintegrations library
