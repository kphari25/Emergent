# AyurCare Pro - Ayurvedic Hospital Management System

## Original Problem Statement
Build a program for an Ayurvedic hospital with inventory management, IP and OP check-in, including reporting, billing, patient scheduling, inventory analytics for fast-moving vs slow-moving medicines, financial reports with profit/loss, and HR module with staff salary management.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui components
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB (collections: users, patients, inventory, appointments, bills, rooms, payments, checkin_history, inventory_movements, staff, salary_payments, expenses)

## User Personas
1. **Admin**: Full access to all modules, user management, HR, financial reports
2. **Doctor**: Patient management, appointments, prescriptions
3. **Staff**: Patient check-in/out, billing, inventory operations

## Core Requirements (Implemented)

### Phase 1 - MVP (Complete)
- [x] User Authentication (JWT-based with role management)
- [x] Patient Management (CRUD, medical history, Prakriti)
- [x] IP Check-in with room assignment
- [x] OP Check-in with token generation
- [x] Patient Check-out workflow
- [x] Inventory Management (Herbs, Medicines, Equipment, Consumables)
- [x] Stock tracking with movement analytics (Fast/Slow/Dead)
- [x] Appointment Scheduling with doctor assignment
- [x] Billing & Payment tracking
- [x] Dashboard with key metrics

### Phase 2 - Enhanced Reports & HR (Complete - January 21, 2026)
- [x] Financial Report with:
  - Total IP Patient count (historical + current)
  - Total OP Patient count (historical + current)
  - Revenue breakdown (Medicine Sales, Treatment, Room Charges)
  - Expense tracking with categories
  - Profit/Loss calculation (Gross & Net)
- [x] HR Module:
  - Staff management (Add, View, Edit, Deactivate)
  - Salary payment recording
  - Salary history per staff
  - Monthly salary summary
  - Department & role filtering
- [x] Expense Management:
  - Add expenses by category (utilities, maintenance, supplies, etc.)
  - View expense history
  - Expense breakdown in reports

## What's Been Implemented

### Backend APIs
- Auth: Register, Login, Get Current User
- Patients: CRUD, Check-in (IP/OP), Check-out
- Inventory: CRUD, Stock updates with movement tracking
- Appointments: CRUD, Status updates
- Billing: Create bills, Record payments
- Rooms: Create, List, Available rooms
- Staff: CRUD, Salary payments
- Expenses: CRUD
- Reports: Dashboard stats, Inventory analytics, Revenue reports, Financial report, HR summary

### Frontend Pages
- Login/Register with split-screen design
- Dashboard with metrics cards and charts
- Patients list with check-in/out functionality
- Inventory management with stock updates
- Appointments calendar view
- Billing with payment recording
- HR Management with staff list and salary payments
- Reports with Financial, Inventory Analytics, and Expenses tabs

## Prioritized Backlog

### P0 (Critical - Not in scope for MVP)
- None remaining

### P1 (Important - Future)
- Prescription management
- Doctor schedule management
- Automated low-stock alerts
- Report export (PDF/Excel)

### P2 (Nice to Have)
- Email/SMS notifications
- Patient portal
- Integration with external lab systems
- Multi-language support

## Test Credentials
- Admin: admin@ayurcare.com / admin123
- Doctor: dr.sharma@ayurcare.com / doctor123

## Sample Data Created
- 3 Staff members (Dr. Priya Sharma, Rahul Kumar, Meera Patel)
- 4 Rooms (101, 102, 201, 301)
- 5 Inventory items (Ayurvedic medicines)
- Sample expenses

## Next Tasks
1. Add prescription management
2. Implement doctor schedule view
3. Add low-stock alerts
4. Export reports to PDF/Excel
