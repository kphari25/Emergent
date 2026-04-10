# Tatva Ayurved - Hospital Management System PRD

## Original Problem Statement
Build a comprehensive Ayurvedic hospital management program "Tatva Ayurved" with Patient Management (IP/OP), Inventory Management, Billing (GST, A4 invoices), Reporting, HR Module, and RBAC. Extended with Therapy Scheduling, Consolidated Billing, CRM, and WhatsApp messaging.

## Tech Stack
- Backend: FastAPI + MongoDB (Motor) + PyJWT
- Frontend: React + Tailwind CSS + Shadcn/UI + Recharts
- Auth: JWT with role-based access (Admin, Doctor, Front Desk, Therapist, HR)

## Completed Features
- Authentication & RBAC with User Management (Admin only)
- Patient Management: CRUD, check-in/out, CSV/Excel import, Auto-PID, Prakriti profiles
- Inventory Management: CRUD, edit, import, sale price auto-calculation
- Billing: IP/OP tabs, 18% GST, A4 printable Tax Invoice with Tatva Ayurved logo
- Consolidated Billing: Patient summary (therapy + room + mess), advance deposits, apply advance to bills
- HR: Staff management, leave tracking, salary
- Mess Management: Meal sections, pricing, patient meal assignments
- Queue Dashboard: Kanban layout, token system, priority flagging
- Room Management: Floor maps, OP-to-IP conversion, packages
- Executive Dashboard: Revenue, occupancy, OP/IP counts
- Lead Management CRM: Sales tracking
- Feedback: Star ratings, escalation
- REQ-4: Therapy Scheduling - Types CRUD, session scheduling, gender validation, conflict detection, status workflow
- REQ-5: Consolidated Billing - Advance deposits, billing summary, auto-fill, multi-mode payments
- Logo Integration: Custom Tatva Ayurved logo on sidebar, mobile header, printable invoices
- **WhatsApp Messaging** - Click-to-chat (wa.me links) on Patient Details (4 templates), Appointments (reminders), Therapy Scheduling (session reminders)
- Deployment guides: Self-hosting, Windows install

## WhatsApp Message Templates
1. Appointment Reminder - Date, time, treatment, doctor
2. Therapy Session Reminder - Therapy name, date, time, duration
3. Follow-up Reminder - Last visit date, recommendation to schedule
4. Post-discharge Diet Instructions - Ayurvedic diet guidelines
5. Medicine Refill Reminder - List of medicines due for refill
6. General Message - Open-ended communication

## Upcoming (P1)
- Payroll reminders for admin

## Backlog (P2)
- REQ-1.6: Document Vault (file uploads)
- Frontend accessibility fixes (ARIA labels)
- server.py modularization (2900+ lines monolith)

## Credentials
- Admin: admin@ayurcare.com / admin1234
