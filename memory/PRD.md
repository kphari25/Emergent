# Tatva Ayurved - Ayurvedic Hospital Management System

## Original Problem Statement
Build a comprehensive Ayurvedic hospital management program with:
- Inventory management (purchase price, markup, profit tracking)
- IP/OP (In-patient/Out-patient) check-in/check-out
- Patient scheduling and treatment records
- Billing and payment tracking with GST
- Financial reports (revenue, expenses, profit/loss)
- HR module (staff management, salary payments)
- Prescription management with auto stock deduction
- Role-Based Access Control (RBAC) with user management
- Data import from CSV/Excel for inventory and patients
- Printable A4 invoices with hospital branding

## Hospital Details
- **Name**: Tatva Ayurved Hospital
- **Address**: Thekkuveedu Lane, Kannur Rd., Near Christian College, Kozhikode, Kerala - 673001
- **Phone**: +91 9895112264
- **Email**: info@tatvaayurved.com

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB

## What's Been Implemented (Complete)

### Phase 1 - Core MVP ✅
- User Authentication (JWT-based)
- Patient Management (CRUD, medical history, Prakriti)
- IP Check-in with room assignment
- OP Check-in with token generation
- Patient Check-out workflow
- Inventory Management with pricing
- Appointment Scheduling
- Dashboard with key metrics

### Phase 2 - Reports & HR ✅
- Financial Report (revenue, expenses, profit/loss)
- HR Module (staff management, salary payments)
- Expense Management
- Prescription Management with auto stock deduction

### Phase 3 - RBAC & User Management ✅
- Role-Based Access Control (5 roles)
- User Management page (Admin only)
- Role-based navigation filtering
- Forgot Password flow (MOCKED)

### Phase 4 - Data Import & Inventory Edit ✅
- Removed Register button from login page
- Inventory Import (CSV/Excel)
- Patient Import (CSV/Excel)
- Inventory Edit (full edit dialog)

### Phase 5 - Separate IP/OP Billing with GST ✅ (Latest)

**Billing Interface:**
- **Two separate tabs**: Out-Patient (OP) and In-Patient (IP)
- Type filter dropdown to view OP/IP bills separately
- Each bill shows type badge (OP/IP) with color coding

**Out-Patient (OP) Invoice:**
- Consultation Fees
- Treatment Charges
- Other Charges
- Medicine Charges (from inventory)
- Discount
- GST (18%) toggle
- OP Bill Summary

**In-Patient (IP) Invoice:**
- Admission Date & Discharge Date
- Consultation Charges
- Room Charges
- Treatment Charges
- **Mess/Food Charges**
- Other Charges
- Medicine Charges (from inventory)
- Discount
- GST (18%) toggle
- IP Bill Summary

**Printable A4 Invoice:**
- Hospital logo (TA) with color based on bill type
- Full address and contact details
- GSTIN number
- Invoice type label (IN-PATIENT / OUT-PATIENT)
- Patient details with room number (for IP)
- Admission/Discharge dates (for IP)
- Itemized charges table with section headers
- Subtotal, Discount, GST, Grand Total
- Amount in words (Indian numbering)
- Payment status and balance due
- Terms & Conditions (with IP-specific terms)
- Authorized Signatory section
- Print button

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ayurcare.com | admin1234 |
| Doctor | dr.sharma@ayurcare.com | doctor123 |

## Key Files
- `/app/backend/server.py` - All backend APIs
- `/app/frontend/src/pages/Billing.js` - IP/OP billing with GST & invoices
- `/app/frontend/src/pages/Inventory.js` - Inventory management
- `/app/frontend/src/pages/Patients.js` - Patient management

## MOCKED Features
⚠️ **Password Reset Email**: Reset tokens are logged to server console.

## Prioritized Backlog

### P1 (Important - Future)
- Email integration for password reset
- Payroll reminders
- Report export (PDF/Excel)
- Low-stock alerts

### P2 (Nice to Have)
- Email/SMS notifications
- Patient portal
- Multi-language support
- Audit logs
