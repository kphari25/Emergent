# Tatva Ayurved - Ayurvedic Hospital Management System

## Original Problem Statement
Build a comprehensive Ayurvedic hospital management program with:
- Inventory management (purchase price, markup, profit tracking)
- IP/OP (In-patient/Out-patient) check-in/check-out
- Patient scheduling and treatment records
- Billing and payment tracking with GST
- Financial reports (revenue, expenses, profit/loss)
- HR module (staff management, salary payments, leave tracking)
- Prescription management with auto stock deduction
- Role-Based Access Control (RBAC) with user management
- Data import from CSV/Excel for inventory and patients
- Printable A4 invoices with hospital branding
- Mess/Food management module for patients
- Enhanced patient profiles with auto PID, phone lookup, Ayurveda-specific fields
- Live Queue Dashboard with priority flagging

## Hospital Details
- **Name**: Tatva Ayurved Hospital
- **Address**: Thekkuveedu Lane, Kannur Rd., Near Christian College, Kozhikode, Kerala - 673001
- **Phone**: +91 9895112264
- **Email**: info@tatvaayurved.com

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB

## What's Been Implemented

### Phase 1 - Core MVP
- User Authentication (JWT-based)
- Patient Management (CRUD, medical history, Prakriti)
- IP Check-in with room assignment
- OP Check-in with token generation
- Patient Check-out workflow
- Inventory Management with pricing
- Appointment Scheduling
- Dashboard with key metrics

### Phase 2 - Reports & HR
- Financial Report (revenue, expenses, profit/loss)
- HR Module (staff management, salary payments)
- Expense Management
- Prescription Management with auto stock deduction

### Phase 3 - RBAC & User Management
- Role-Based Access Control (5 roles)
- User Management page (Admin only)
- Role-based navigation filtering
- Forgot Password flow (MOCKED)

### Phase 4 - Data Import & Inventory Edit
- Inventory Import (CSV/Excel)
- Patient Import (CSV/Excel)
- Inventory Edit (full edit dialog)

### Phase 5 - Separate IP/OP Billing with GST
- Two separate tabs: Out-Patient (OP) and In-Patient (IP)
- GST (18%) toggle with printable A4 Tax Invoice
- Hospital branding on invoices

### Phase 6 - HR Enhancements & Mess Module (Dec 2025)
- Edit Staff Details dialog in HR
- Leave Tracker tab with Record Leave dialog (staff selection, date, type, half-day with time, reason)
- Mess Module: Meal price config, patient meal assignment, daily summary

### Phase 7 - Enhanced Patient Profiles & Live Queue (Dec 2025)
- **Auto PID**: Unique Patient ID (TAH-0001, TAH-0002...) auto-generated on registration
- **Phone Lookup**: Search returning patients by mobile number to prevent duplicates
- **Extended Profiles**: DOB, Email, Blood Group, Occupation, Marital Status, Emergency Contact, Lifestyle
- **Prakriti Dropdown**: Vata/Pitta/Kapha/dual/Tridosha selector
- **Referral Tracking**: Lead source dropdown (Google, Word of Mouth, Doctor Referral, Social Media, Walk-in, etc.)
- **Duplicate Prevention**: System blocks duplicate phone numbers with informative error
- **Priority Flagging**: Tag patients as Normal/Elderly/Emergency during check-in
- **Live Queue Dashboard**: Three-column kanban (Waiting → In Consultation → Completed)
- **Queue Status Transitions**: One-click move between statuses
- **Priority Sorting**: Emergency patients appear first in queue
- **Auto-refresh**: Queue refreshes every 15 seconds

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ayurcare.com | admin1234 |
| Doctor | dr.sharma@ayurcare.com | doctor123 |

## Key Files
- `/app/backend/server.py` - All backend APIs
- `/app/frontend/src/pages/Patients.js` - Enhanced patient registration with phone lookup, PID
- `/app/frontend/src/pages/QueueDashboard.js` - Live Queue Dashboard
- `/app/frontend/src/pages/PatientDetails.js` - Extended patient info display
- `/app/frontend/src/pages/HR.js` - HR with staff edit, salary, leaves
- `/app/frontend/src/pages/Mess.js` - Mess/food management
- `/app/frontend/src/pages/Billing.js` - IP/OP billing with GST & invoices
- `/app/frontend/src/pages/Inventory.js` - Inventory management
- `/app/frontend/src/components/Layout.js` - Sidebar navigation

## MOCKED Features
- **Password Reset Email**: Reset tokens are logged to server console.

## Prioritized Backlog

### P0 (User Requested - Next)
- **REQ-3**: IP & Room Management (OP→IP conversion, bed management, digital consent, treatment packages)
- **REQ-4**: Therapy Scheduling (Abhyanga/Shirodhara scheduler, resource conflict check, gender-based assignment, daily therapy calendar)
- **REQ-5**: Billing & Pharmacy (consolidated billing, advance deposits, prescription→pharmacy bill, batch/expiry tracking, multi-mode payment)
- **REQ-6**: Dashboards (user message was cut off)

### P1 (Important)
- Document Vault (upload ID proofs, medical reports) - needs object storage
- Payroll reminders (notify admin when salary due)
- Report export (PDF/Excel)
- Low-stock alerts for inventory

### P2 (Future)
- SMS/WhatsApp automated reminders (needs Twilio)
- Email integration for password reset
- Patient portal
- Multi-language support
- Audit logs

### Refactoring
- Split monolithic server.py into FastAPI router structure
