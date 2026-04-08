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
- Removed Register button from login page
- Inventory Import (CSV/Excel)
- Patient Import (CSV/Excel)
- Inventory Edit (full edit dialog)

### Phase 5 - Separate IP/OP Billing with GST
- Two separate tabs: Out-Patient (OP) and In-Patient (IP)
- Type filter dropdown to view OP/IP bills separately
- GST (18%) toggle with printable A4 Tax Invoice
- Hospital branding on invoices

### Phase 6 - HR Enhancements & Mess Module (Dec 2025)
- **Edit Staff Details**: Edit button on each staff row opens prefilled dialog, save updates persist
- **Leave Tracker**: New tab in HR with Record Leave dialog (staff selection, date, leave type, half-day with time fields, reason), leave table with delete, year-to-date summary cards
- **Mess Module**: New sidebar page with:
  - Meal price configuration (Breakfast, Lunch, Dinner, Snacks, Tea/Coffee)
  - Patient meal assignment with dropdown and checkbox selection
  - Auto cost calculation based on set prices
  - Daily summary cards (patients fed, total cost, per-meal counts)
  - Today's Meals and Meal Prices tabs

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ayurcare.com | admin1234 |
| Doctor | dr.sharma@ayurcare.com | doctor123 |

## Key Files
- `/app/backend/server.py` - All backend APIs
- `/app/frontend/src/pages/HR.js` - HR management with staff, salary, leaves
- `/app/frontend/src/pages/Mess.js` - Mess/food management module
- `/app/frontend/src/pages/Billing.js` - IP/OP billing with GST & invoices
- `/app/frontend/src/pages/Inventory.js` - Inventory management
- `/app/frontend/src/pages/Patients.js` - Patient management
- `/app/frontend/src/components/Layout.js` - Sidebar navigation with Mess

## MOCKED Features
- **Password Reset Email**: Reset tokens are logged to server console.

## Prioritized Backlog

### P1 (Important - Future)
- Payroll reminders (notify admin when salary due)
- Report export (PDF/Excel)
- Low-stock alerts for inventory

### P2 (Nice to Have)
- Email integration for password reset
- Email/SMS notifications
- Patient portal
- Multi-language support
- Audit logs

### Refactoring
- Split monolithic server.py into FastAPI router structure
