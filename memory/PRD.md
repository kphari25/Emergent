# Tatva Ayurved - Ayurvedic Hospital Management System

## Original Problem Statement
Comprehensive Ayurvedic hospital management system with patient management, inventory, billing, HR, RBAC, and hospital-specific modules.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB

## What's Been Implemented

### Phase 1-5 (Previous Sessions)
- Auth, RBAC (5 roles), Patient CRUD, IP/OP Check-in, Inventory, Appointments, Dashboard, Reports, HR, Billing (GST + A4 invoices), CSV/Excel imports, Self-hosting guides

### Phase 6 - HR Enhancements & Mess Module
- Edit Staff, Leave Tracker, Mess Module (meal pricing, patient meal assignment)

### Phase 7 - Enhanced Patient Profiles & Live Queue
- Auto PID (TAH-0001), Phone Lookup, Extended Profiles (DOB, blood group, occupation, marital status, emergency contact, lifestyle), Prakriti dropdown, Referral tracking, Priority flagging, Live Queue Dashboard (3-column kanban)

### Phase 8 - REQ-3: IP & Room Management
- **OP→IP Conversion**: One-click with room assignment, attender details, digital consent, advance payment
- **Bed Management**: Interactive floor map with color-coded room types (General/Private/Semi-Private/Deluxe/ICU), occupancy indicators, edit/delete
- **Treatment Packages**: CRUD for packages (e.g., 7-Day Panchakarma), therapy lists, cost, inclusions
- **Admission Records**: Full audit trail with attender/consent/package/advance details

### Phase 9 - REQ-6: Dashboards & Communications
- **Executive Dashboard**: 6 metric cards (OP/IP today, revenue, occupancy, leads), live queue widget, appointments progress, active patients, patient distribution chart, doctor performance, revenue summary, quick stats
- **Lead Management**: Full CRM with status pipeline (New→Contacted→Follow-Up→Converted→Lost), lead-to-patient conversion with auto PID, follow-up dates, source tracking
- **Feedback & Reviews**: Star ratings, auto-escalation for ≤2 stars, escalation resolution, Google Review link sharing, summary analytics

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ayurcare.com | admin1234 |
| Doctor | dr.sharma@ayurcare.com | doctor123 |

## Key Files
- `/app/backend/server.py` - All backend APIs
- `/app/frontend/src/pages/Dashboard.js` - Executive Dashboard
- `/app/frontend/src/pages/Patients.js` - Enhanced patient registration
- `/app/frontend/src/pages/QueueDashboard.js` - Live Queue
- `/app/frontend/src/pages/RoomManagement.js` - Floor map & packages
- `/app/frontend/src/pages/LeadManagement.js` - Lead/Sales CRM
- `/app/frontend/src/pages/FeedbackPage.js` - Feedback & escalations
- `/app/frontend/src/pages/PatientDetails.js` - Patient profile + Admit as IP
- `/app/frontend/src/pages/HR.js` - Staff, salary, leaves
- `/app/frontend/src/pages/Mess.js` - Food management
- `/app/frontend/src/pages/Billing.js` - IP/OP billing with GST
- `/app/frontend/src/pages/Inventory.js` - Inventory management

## MOCKED Features
- Password Reset Email (token logged to console)
- Google Review URL is placeholder (needs real Google Business link)

## Prioritized Backlog

### P0 (User Requested - Next)
- **REQ-4**: Therapy Scheduling (Abhyanga/Shirodhara scheduler, resource conflict, gender-based assignment, daily calendar)
- **REQ-5**: Billing & Pharmacy (consolidated billing, advance deposits, prescription→pharmacy, batch/expiry, multi-mode payment)
- **REQ-6.2**: Automated WhatsApp follow-ups (needs Twilio integration)

### P1
- Document Vault (upload ID proofs/reports - needs object storage)
- Payroll reminders
- Report export (PDF/Excel)
- Low-stock alerts

### P2
- Email integration for password reset
- Patient portal, Multi-language, Audit logs

### Refactoring
- Split monolithic server.py into FastAPI router structure
