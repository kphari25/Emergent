# AyurCare Pro - Ayurvedic Hospital Management System

## Original Problem Statement
Build a program for an Ayurvedic hospital with inventory management, IP and OP check-in, including reporting, billing, patient scheduling, and inventory analytics for fast-moving vs slow-moving medicines decision making.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui components
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB (collections: users, patients, inventory, appointments, bills, rooms, payments, checkin_history, inventory_movements)

## User Personas
1. **Admin**: Full access to all modules, user management
2. **Doctor**: Patient management, appointments, prescriptions
3. **Staff**: Patient check-in/out, billing, inventory operations

## Core Requirements (Implemented)
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
- [x] Reports (Inventory Analytics, Revenue Reports)

## What's Been Implemented (January 21, 2026)
### Backend APIs
- Auth: Register, Login, Get Current User
- Patients: CRUD, Check-in (IP/OP), Check-out
- Inventory: CRUD, Stock updates with movement tracking
- Appointments: CRUD, Status updates
- Billing: Create bills, Record payments
- Rooms: Create, List, Available rooms
- Reports: Dashboard stats, Inventory analytics, Revenue reports

### Frontend Pages
- Login/Register with split-screen design
- Dashboard with metrics cards and charts
- Patients list with check-in/out functionality
- Inventory management with stock updates
- Appointments calendar view
- Billing with payment recording
- Reports with Inventory Analytics and Revenue tabs

## Prioritized Backlog

### P0 (Critical - Not in scope for MVP)
- None remaining

### P1 (Important - Future)
- Doctor schedule management
- Prescription management
- Medicine dispensing from inventory
- Patient treatment history
- Multi-language support

### P2 (Nice to Have)
- Email/SMS notifications
- Report export (PDF/Excel)
- Patient portal
- Inventory alerts and reordering
- Integration with external lab systems

## Test Credentials
- Admin: admin@ayurcare.com / admin123
- Doctor: dr.sharma@ayurcare.com / doctor123

## Next Tasks
1. Add prescription management feature
2. Implement doctor schedule view
3. Add low-stock alerts/notifications
4. Export reports to PDF
5. Add patient treatment timeline
