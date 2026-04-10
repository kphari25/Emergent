# Tatva Ayurved - Hospital Management System PRD

## Original Problem Statement
Build a comprehensive Ayurvedic hospital management program "Tatva Ayurved" with Patient Management (IP/OP), Inventory Management, Billing (GST, A4 invoices), Reporting, HR Module, and RBAC. Extended with Therapy Scheduling, Consolidated Billing, and CRM.

## Tech Stack
- Backend: FastAPI + MongoDB (Motor) + PyJWT
- Frontend: React + Tailwind CSS + Shadcn/UI + Recharts
- Auth: JWT with role-based access (Admin, Doctor, Front Desk, Therapist, HR)

## Completed Features
- Authentication & RBAC with User Management (Admin only)
- Patient Management: CRUD, check-in/out, CSV/Excel import, Auto-PID, Prakriti profiles
- Inventory Management: CRUD, edit, import, sale price auto-calculation
- Billing: IP/OP tabs, 18% GST, A4 printable Tax Invoice with Tatva Ayurved logo
- Consolidated Billing: Patient summary (therapy + room + mess charges), advance deposits, apply advance to bills
- HR: Staff management, leave tracking, salary
- Mess Management: Meal sections, pricing, patient meal assignments
- Queue Dashboard: Kanban layout, token system, priority flagging
- Room Management: Floor maps, OP-to-IP conversion, packages
- Executive Dashboard: Revenue, occupancy, OP/IP counts
- Lead Management CRM: Sales tracking
- Feedback: Star ratings, escalation
- **REQ-4: Therapy Scheduling** - Therapy types CRUD, session scheduling with date/time/therapist/room, gender validation, conflict detection, status workflow (scheduled -> in_progress -> completed)
- **REQ-5: Consolidated Billing** - Advance deposits, patient billing summary, apply advance to bills, auto-populate bill from summary
- **Logo Integration** - Custom Tatva Ayurved logo on sidebar, mobile header, and printable invoices
- Deployment guides: Self-hosting, Windows install

## Upcoming (P1)
- REQ-6.2: WhatsApp automated follow-ups (Twilio)
- Payroll reminders

## Backlog (P2)
- REQ-1.6: Document Vault (file uploads)
- Frontend accessibility fixes (ARIA labels)
- server.py modularization (2800+ lines monolith)

## Deployment Status
- Preview: Running at https://ayur-system.preview.emergentagent.com
- Health check endpoint: /api/health
- JWT_SECRET: No hardcoded fallback (fails fast if missing)
- Frontend: CI=false for clean builds

## Key API Endpoints
- POST/GET /api/therapy-types
- POST/GET /api/therapy-schedules
- PUT /api/therapy-schedules/{id}/status
- POST/GET /api/advances
- GET /api/advances/patient/{id}/balance
- POST /api/advances/apply-to-bill
- GET /api/billing/patient-summary/{id}

## Credentials
- Admin: admin@ayurcare.com / admin1234
