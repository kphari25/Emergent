# Tatva Ayurved - Ayurvedic Hospital Management System

## Original Problem Statement
Build a comprehensive Ayurvedic hospital management program with:
- Inventory management (purchase price, markup, profit tracking)
- IP/OP (In-patient/Out-patient) check-in/check-out
- Patient scheduling and treatment records
- Billing and payment tracking
- Financial reports (revenue, expenses, profit/loss)
- HR module (staff management, salary payments)
- Prescription management with auto stock deduction
- Role-Based Access Control (RBAC) with user management

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB

## User Personas & Roles
| Role | Access Level |
|------|--------------|
| Admin | Full access to all modules including User Management, HR, Reports |
| HR Manager | Access to HR module and Reports |
| Doctor | Core modules only (Patients, Inventory, Appointments, Billing) |
| Front Desk | Core modules only |
| Therapist | Core modules only |

## What's Been Implemented (Complete)

### Phase 1 - Core MVP ✅
- User Authentication (JWT-based)
- Patient Management (CRUD, medical history, Prakriti)
- IP Check-in with room assignment
- OP Check-in with token generation
- Patient Check-out workflow
- Inventory Management with pricing (purchase, markup, sale price)
- Stock tracking with movement analytics (Fast/Slow/Dead)
- Appointment Scheduling
- Billing & Payment tracking
- Dashboard with key metrics

### Phase 2 - Reports & HR ✅
- Financial Report (revenue, expenses, profit/loss)
- HR Module (staff management, salary payments)
- Expense Management
- Prescription Management with auto stock deduction

### Phase 3 - RBAC & User Management ✅ (January 22, 2026)
- Role-Based Access Control (5 roles)
- User Management page (Admin only)
  - View all users with role badges
  - Create new users with role assignment
  - Reset user passwords
  - Delete users
- Role-based navigation filtering (restricted roles don't see HR/Reports/Users)
- Route protection for restricted pages
- Forgot Password flow (MOCKED - tokens logged to console)
- Backend API protection for sensitive endpoints

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ayurcare.com | admin123 |
| Doctor | dr.sharma@ayurcare.com | doctor123 |

## Key Files
- `/app/backend/server.py` - All backend APIs
- `/app/frontend/src/pages/` - Frontend pages
- `/app/frontend/src/components/Layout.js` - Navigation with RBAC
- `/app/frontend/src/context/AuthContext.js` - Auth state management

## MOCKED Features
⚠️ **Password Reset Email**: Reset tokens are logged to server console instead of being emailed. No email service is configured.

## Prioritized Backlog

### P1 (Important - Future)
- Email integration for password reset (SendGrid/Resend)
- Payroll reminders (notify admin when salary due)
- Report export (PDF/Excel)
- Automated low-stock alerts

### P2 (Nice to Have)
- Email/SMS notifications for appointments
- Patient portal
- Multi-language support
- Audit logs
