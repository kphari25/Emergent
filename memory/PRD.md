# Tatva Ayurved - Hospital Management System PRD

## Original Problem Statement
Build a comprehensive Ayurvedic hospital management program "Tatva Ayurved" with Patient Management (IP/OP), Inventory Management, Billing (GST, A4 invoices), Reporting, HR Module, and RBAC.

## Tech Stack
- Backend: FastAPI + MongoDB (Motor) + PyJWT
- Frontend: React + Tailwind CSS + Shadcn/UI + Recharts
- Auth: JWT with role-based access (Admin, Doctor, Front Desk, Therapist, HR)

## Completed Features
- Authentication & RBAC with User Management (Admin only)
- Patient Management: CRUD, check-in/out, CSV/Excel import, Auto-PID, Prakriti profiles
- Inventory Management: CRUD, edit, import, sale price auto-calculation
- Billing: IP/OP tabs, GST, A4 printable Tax Invoice
- HR: Staff management, leave tracking, salary
- Mess Management: Meal sections, pricing, patient meal assignments
- Queue Dashboard: Kanban layout, token system, priority flagging
- Room Management: Floor maps, OP-to-IP conversion, packages
- Executive Dashboard: Revenue, occupancy, OP/IP counts
- Lead Management CRM: Sales tracking
- Feedback: Star ratings, escalation
- Deployment guides: Self-hosting, Windows install

## In Progress
- REQ-4: Ayurveda Therapy Scheduling (backend + frontend)
- REQ-5: Consolidated Billing, Advance Management, Pharmacy Linkage

## Upcoming (P1)
- REQ-6.2: WhatsApp automated follow-ups (Twilio)
- Payroll reminders

## Backlog (P2)
- REQ-1.6: Document Vault (file uploads)
- Frontend accessibility fixes (ARIA labels)
- server.py modularization (2600+ lines monolith)

## Deployment Status
- Preview: Running at https://ayur-system.preview.emergentagent.com
- Production: Deployment failed (GCS template issue - platform-side)
- Health check endpoint added: /api/health
- JWT_SECRET fallback removed for production safety

## Credentials
- Admin: admin@ayurcare.com / admin1234
