# Tatva Ayurved - Ayurvedic Hospital Management System

## Local Installation Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
- Git

### Quick Setup

#### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd app
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL and JWT secret

# Run backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
yarn install  # or npm install

# Configure environment
cp .env.example .env
# Set REACT_APP_BACKEND_URL=http://localhost:8001

# Run frontend
yarn start  # or npm start
```

#### 4. MongoDB Setup
```bash
# Install MongoDB locally or use MongoDB Atlas
# Update MONGO_URL in backend/.env

# Default local MongoDB:
MONGO_URL="mongodb://localhost:27017"
DB_NAME="ayurcare_db"
```

### Environment Variables

#### Backend (.env)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="ayurcare_db"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="your-secret-key-change-in-production"
```

#### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Default Login Credentials
- **Admin**: admin@ayurcare.com / admin123
- **Doctor**: dr.sharma@ayurcare.com / doctor123

### Features
- Patient Management (IP/OP Check-in)
- Inventory Management with Fast/Slow Moving Analytics
- Appointment Scheduling
- Billing & Payments
- HR Module (Staff & Salary Management)
- Financial Reports (Revenue, Expense, Profit/Loss)

### Tech Stack
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: FastAPI, Pydantic, JWT Auth
- **Database**: MongoDB with Motor (async driver)

### Production Deployment
For production, consider:
1. Use environment variables for all secrets
2. Enable HTTPS
3. Use a process manager (PM2, Supervisor)
4. Set up MongoDB replica set for reliability
5. Configure proper CORS origins

### Support
For issues, check the /app/memory/PRD.md for detailed documentation.
