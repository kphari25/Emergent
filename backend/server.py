from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import pandas as pd
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - graceful handling for deployment
mongo_url = os.environ.get('MONGO_URL', '')
if not mongo_url:
    print("WARNING: MONGO_URL not set. Database features will not work.")
    mongo_url = 'mongodb://localhost:27017'

try:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db_name = os.environ.get('DB_NAME', 'tatva_ayurved')
    db = client[db_name]
    print(f"MongoDB client initialized for database: {db_name}")
except Exception as e:
    print(f"ERROR initializing MongoDB client: {e}")
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['tatva_ayurved']

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-this-secret-in-production')
if JWT_SECRET == 'change-this-secret-in-production':
    print("WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for production.")
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Global exception handler - ensures CORS headers are always sent
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "*")
    cors_origins_env = os.environ.get('CORS_ORIGINS', '*')
    allowed_origin = "*"
    if cors_origins_env != '*':
        origins_list = [o.strip() for o in cors_origins_env.split(',')]
        if origin in origins_list:
            allowed_origin = origin
    
    headers = {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers
        )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers=headers
    )

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "staff"  # admin, doctor, staff

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    address: str
    medical_history: Optional[str] = ""
    prakriti: Optional[str] = ""
    dob: Optional[str] = ""
    email: Optional[str] = ""
    blood_group: Optional[str] = ""
    occupation: Optional[str] = ""
    marital_status: Optional[str] = ""
    emergency_contact_name: Optional[str] = ""
    emergency_contact_phone: Optional[str] = ""
    lifestyle: Optional[str] = ""
    referral_source: Optional[str] = ""

class PatientResponse(BaseModel):
    id: str
    pid: Optional[str] = None
    name: str
    age: int
    gender: str
    phone: str
    address: str
    medical_history: str
    prakriti: str
    dob: Optional[str] = ""
    email: Optional[str] = ""
    blood_group: Optional[str] = ""
    occupation: Optional[str] = ""
    marital_status: Optional[str] = ""
    emergency_contact_name: Optional[str] = ""
    emergency_contact_phone: Optional[str] = ""
    lifestyle: Optional[str] = ""
    referral_source: Optional[str] = ""
    status: str
    patient_type: str
    room_number: Optional[str] = None
    token_number: Optional[int] = None
    admission_date: Optional[str] = None
    priority: Optional[str] = "normal"
    queue_status: Optional[str] = None
    created_at: str

class CheckInRequest(BaseModel):
    patient_id: str
    patient_type: str  # IP or OP
    room_number: Optional[str] = None
    doctor_id: Optional[str] = None
    reason: str
    priority: Optional[str] = "normal"  # normal, elderly, emergency

class InventoryItemCreate(BaseModel):
    name: str
    category: str  # herbs, medicines, equipment, consumables
    quantity: int
    unit: str
    min_stock: int
    purchase_price: float  # Cost price
    markup_percentage: float = 20  # Default 20% markup
    supplier: Optional[str] = ""
    batch_number: Optional[str] = ""
    expiry_date: Optional[str] = ""

class InventoryItemResponse(BaseModel):
    id: str
    name: str
    category: str
    quantity: int
    unit: str
    min_stock: int
    purchase_price: float
    markup_percentage: float
    sale_price: float  # Calculated: purchase_price * (1 + markup/100)
    supplier: str
    batch_number: str
    expiry_date: str
    movement_count: int
    movement_status: str  # fast, slow, dead
    created_at: str

class InventoryUpdateRequest(BaseModel):
    quantity_change: int  # positive for add, negative for remove
    reason: str

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    date: str
    time: str
    treatment_type: str
    notes: Optional[str] = ""

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    patient_phone: Optional[str] = ""
    doctor_id: str
    doctor_name: str
    date: str
    time: str
    treatment_type: str
    notes: str
    status: str  # scheduled, completed, cancelled
    created_at: str

class BillCreate(BaseModel):
    patient_id: str
    bill_type: str = "OP"  # OP or IP
    items: List[dict]  # [{name, quantity, sale_price, purchase_price}]
    treatment_charges: float = 0
    room_charges: float = 0
    consultation_charges: float = 0
    therapy_charges: float = 0
    mess_charges: float = 0  # For IP patients (food charges)
    other_charges: float = 0
    discount: float = 0
    gst_rate: float = 0
    gst_amount: float = 0
    subtotal: float = 0
    total_amount: float = 0
    notes: Optional[str] = ""
    admission_date: Optional[str] = None
    discharge_date: Optional[str] = None

class BillResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    bill_type: str = "OP"
    items: List[dict]  # [{name, quantity, sale_price, purchase_price, profit}]
    treatment_charges: float
    room_charges: float
    consultation_charges: float = 0
    therapy_charges: float = 0
    mess_charges: float = 0
    other_charges: float = 0
    discount: float = 0
    subtotal: float = 0
    gst_rate: float = 0
    gst_amount: float = 0
    total_amount: float
    total_cost: float  # Total purchase cost
    total_profit: float  # Profit from items
    paid_amount: float
    status: str  # pending, partial, paid
    payment_method: Optional[str] = None
    notes: str
    admission_date: Optional[str] = None
    discharge_date: Optional[str] = None
    created_at: str

class PaymentRequest(BaseModel):
    bill_id: str
    amount: float
    payment_method: str

class PrescriptionItem(BaseModel):
    inventory_id: str
    name: str
    quantity: int
    dosage: str  # e.g., "1 tablet twice daily"
    duration: str  # e.g., "7 days"

class PrescriptionCreate(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    diagnosis: str
    items: List[PrescriptionItem]
    notes: Optional[str] = ""

class PrescriptionResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: Optional[str]
    doctor_name: Optional[str]
    diagnosis: str
    items: List[dict]
    notes: str
    status: str  # active, completed, cancelled
    created_at: str

class RoomCreate(BaseModel):
    room_number: str
    room_type: str  # general, private, semi_private, icu, deluxe
    floor: str = "Ground"
    daily_rate: float
    description: Optional[str] = ""

class RoomResponse(BaseModel):
    id: str
    room_number: str
    room_type: str
    floor: str = "Ground"
    daily_rate: float
    is_occupied: bool
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    description: Optional[str] = ""

class TreatmentPackageCreate(BaseModel):
    name: str
    duration_days: int
    therapies: List[str] = []
    description: Optional[str] = ""
    room_type: str = "general"
    total_cost: float
    includes_room: bool = True
    includes_food: bool = True
    includes_medicines: bool = False

class ConvertToIPRequest(BaseModel):
    room_number: str
    attender_name: Optional[str] = ""
    attender_relation: Optional[str] = ""
    attender_phone: Optional[str] = ""
    advance_amount: float = 0
    consent_given: bool = False
    package_id: Optional[str] = None
    notes: Optional[str] = ""

# ==================== AUTH HELPERS ====================

# Define roles and their permissions
ROLES = ['admin', 'doctor', 'front_desk', 'hr', 'therapist']
RESTRICTED_ROLES = ['doctor', 'front_desk', 'therapist']  # Cannot access HR and Reports

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_hr_access(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') in RESTRICTED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user

def require_reports_access(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') in RESTRICTED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({'email': user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'email': user.email,
        'password': hash_password(user.password),
        'name': user.name,
        'role': user.role,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.role)
    return {
        'access_token': token,
        'user': {'id': user_id, 'email': user.email, 'name': user.name, 'role': user.role}
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    try:
        user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection error: {str(e)}")
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['role'])
    return {
        'access_token': token,
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name'], 'role': user['role']}
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        'id': current_user['id'],
        'email': current_user['email'],
        'name': current_user['name'],
        'role': current_user['role']
    }

# ==================== USER MANAGEMENT (ADMIN ONLY) ====================

class UserCreateAdmin(BaseModel):
    email: str
    password: str
    name: str
    role: str  # admin, doctor, front_desk, hr, therapist

class UserUpdateAdmin(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordReset(BaseModel):
    new_password: str

@api_router.get("/users")
async def get_all_users(current_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {'_id': 0, 'password': 0}).to_list(1000)
    return users

@api_router.post("/users")
async def create_user_admin(user: UserCreateAdmin, current_user: dict = Depends(require_admin)):
    if user.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(ROLES)}")
    
    existing = await db.users.find_one({'email': user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'email': user.email,
        'password': hash_password(user.password),
        'name': user.name,
        'role': user.role,
        'is_active': True,
        'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return await db.users.find_one({'id': user_id}, {'_id': 0, 'password': 0})

@api_router.put("/users/{user_id}")
async def update_user_admin(user_id: str, user_update: UserUpdateAdmin, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if user_update.name is not None:
        update_data['name'] = user_update.name
    if user_update.role is not None:
        if user_update.role not in ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(ROLES)}")
        update_data['role'] = user_update.role
    if user_update.is_active is not None:
        update_data['is_active'] = user_update.is_active
    
    if update_data:
        await db.users.update_one({'id': user_id}, {'$set': update_data})
    
    return await db.users.find_one({'id': user_id}, {'_id': 0, 'password': 0})

@api_router.delete("/users/{user_id}")
async def delete_user_admin(user_id: str, current_user: dict = Depends(require_admin)):
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.delete_one({'id': user_id})
    return {"message": "User deleted successfully"}

@api_router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, password_data: PasswordReset, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    hashed = hash_password(password_data.new_password)
    await db.users.update_one({'id': user_id}, {'$set': {'password': hashed}})
    return {"message": "Password reset successfully"}

@api_router.post("/auth/change-password")
async def change_own_password(password_data: PasswordReset, current_user: dict = Depends(get_current_user)):
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    hashed = hash_password(password_data.new_password)
    await db.users.update_one({'id': current_user['id']}, {'$set': {'password': hashed}})
    return {"message": "Password changed successfully"}

@api_router.get("/auth/roles")
async def get_available_roles(current_user: dict = Depends(get_current_user)):
    return {
        'roles': ROLES,
        'role_labels': {
            'admin': 'Administrator',
            'doctor': 'Doctor',
            'front_desk': 'Front Desk Specialist',
            'hr': 'HR Manager',
            'therapist': 'Therapist'
        },
        'restricted_roles': RESTRICTED_ROLES
    }

# ==================== PATIENT ROUTES ====================

async def generate_pid():
    result = await db.counters.find_one_and_update(
        {'type': 'patient_pid'},
        {'$inc': {'value': 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return f"TAH-{result['value']:04d}"

@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    # Check for duplicate phone
    existing = await db.patients.find_one({'phone': patient.phone, 'status': {'$ne': 'deleted'}}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail=f"Patient with phone {patient.phone} already exists (PID: {existing.get('pid', 'N/A')})")
    
    patient_id = str(uuid.uuid4())
    pid = await generate_pid()
    patient_doc = {
        'id': patient_id,
        'pid': pid,
        'name': patient.name,
        'age': patient.age,
        'gender': patient.gender,
        'phone': patient.phone,
        'address': patient.address,
        'medical_history': patient.medical_history or "",
        'prakriti': patient.prakriti or "",
        'dob': patient.dob or "",
        'email': patient.email or "",
        'blood_group': patient.blood_group or "",
        'occupation': patient.occupation or "",
        'marital_status': patient.marital_status or "",
        'emergency_contact_name': patient.emergency_contact_name or "",
        'emergency_contact_phone': patient.emergency_contact_phone or "",
        'lifestyle': patient.lifestyle or "",
        'referral_source': patient.referral_source or "",
        'status': 'active',
        'patient_type': 'None',
        'room_number': None,
        'token_number': None,
        'admission_date': None,
        'priority': 'normal',
        'queue_status': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.patients.insert_one(patient_doc)
    return await db.patients.find_one({'id': patient_id}, {'_id': 0})

@api_router.get("/patients", response_model=List[PatientResponse])
async def get_patients(patient_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if patient_type and patient_type != 'all':
        query['patient_type'] = patient_type
    patients = await db.patients.find(query, {'_id': 0}).to_list(1000)
    return patients

@api_router.get("/patients/search-phone")
async def search_patient_by_phone(phone: str, current_user: dict = Depends(get_current_user)):
    patients = await db.patients.find(
        {'phone': {'$regex': phone}},
        {'_id': 0}
    ).to_list(20)
    return patients

@api_router.get("/patients/template")
async def get_patients_template(current_user: dict = Depends(get_current_user)):
    """Get CSV template for patient import"""
    return {
        "columns": ["name", "age", "gender", "phone", "address", "medical_history", "prakriti"],
        "sample_row": ["Rajesh Kumar", "45", "male", "9876543210", "123 Main St, City", "Hypertension", "Vata-Pitta"],
        "genders": ["male", "female", "other"],
        "prakriti_types": ["Vata", "Pitta", "Kapha", "Vata-Pitta", "Pitta-Kapha", "Vata-Kapha", "Tridosha"]
    }

@api_router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@api_router.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    update_data = patient.model_dump()
    await db.patients.update_one({'id': patient_id}, {'$set': update_data})
    updated = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return updated

@api_router.post("/patients/checkin")
async def patient_checkin(request: CheckInRequest, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': request.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    update_data = {
        'patient_type': request.patient_type,
        'status': 'active',
        'admission_date': datetime.now(timezone.utc).isoformat(),
        'priority': request.priority or 'normal',
        'queue_status': 'waiting'
    }
    
    if request.patient_type == 'IP':
        if not request.room_number:
            raise HTTPException(status_code=400, detail="Room number required for IP")
        room = await db.rooms.find_one({'room_number': request.room_number})
        if room and room.get('is_occupied'):
            raise HTTPException(status_code=400, detail="Room is already occupied")
        update_data['room_number'] = request.room_number
        await db.rooms.update_one(
            {'room_number': request.room_number},
            {'$set': {'is_occupied': True, 'patient_id': request.patient_id}}
        )
    else:  # OP
        # Generate token number
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        count = await db.patients.count_documents({
            'patient_type': 'OP',
            'admission_date': {'$gte': today_start.isoformat()}
        })
        update_data['token_number'] = count + 1
    
    # Record checkin history
    checkin_record = {
        'id': str(uuid.uuid4()),
        'patient_id': request.patient_id,
        'patient_name': patient.get('name', ''),
        'patient_type': request.patient_type,
        'doctor_id': request.doctor_id,
        'reason': request.reason,
        'room_number': request.room_number,
        'priority': request.priority or 'normal',
        'queue_status': 'waiting',
        'checkin_time': datetime.now(timezone.utc).isoformat(),
        'checkout_time': None
    }
    await db.checkin_history.insert_one(checkin_record)
    
    await db.patients.update_one({'id': request.patient_id}, {'$set': update_data})
    updated = await db.patients.find_one({'id': request.patient_id}, {'_id': 0})
    return updated

@api_router.post("/patients/{patient_id}/checkout")
async def patient_checkout(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if patient.get('room_number'):
        await db.rooms.update_one(
            {'room_number': patient['room_number']},
            {'$set': {'is_occupied': False, 'patient_id': None}}
        )
    
    # Update checkin history
    await db.checkin_history.update_one(
        {'patient_id': patient_id, 'checkout_time': None},
        {'$set': {'checkout_time': datetime.now(timezone.utc).isoformat(), 'queue_status': 'completed'}}
    )
    
    update_data = {
        'patient_type': 'None',
        'status': 'discharged',
        'room_number': None,
        'token_number': None,
        'queue_status': 'completed',
        'priority': 'normal'
    }
    await db.patients.update_one({'id': patient_id}, {'$set': update_data})
    updated = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    return updated

# ==================== QUEUE MANAGEMENT ====================

@api_router.get("/queue")
async def get_queue(current_user: dict = Depends(get_current_user)):
    """Get today's live queue - patients checked in today with queue statuses"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    
    # Get all checkins for today that haven't been fully processed
    checkins = await db.checkin_history.find(
        {'checkin_time': {'$gte': today_start}},
        {'_id': 0}
    ).sort('checkin_time', 1).to_list(500)
    
    # Enrich with patient details
    queue_items = []
    for c in checkins:
        patient = await db.patients.find_one({'id': c['patient_id']}, {'_id': 0})
        if patient:
            queue_items.append({
                'checkin_id': c['id'],
                'patient_id': c['patient_id'],
                'patient_name': patient.get('name', c.get('patient_name', '')),
                'pid': patient.get('pid', ''),
                'patient_type': c.get('patient_type', ''),
                'doctor_id': c.get('doctor_id', ''),
                'reason': c.get('reason', ''),
                'room_number': c.get('room_number', ''),
                'priority': c.get('priority', patient.get('priority', 'normal')),
                'queue_status': c.get('queue_status', patient.get('queue_status', 'waiting')),
                'token_number': patient.get('token_number'),
                'checkin_time': c.get('checkin_time', ''),
                'checkout_time': c.get('checkout_time')
            })
    
    # Sort: emergency first, then elderly, then by checkin time
    priority_order = {'emergency': 0, 'elderly': 1, 'normal': 2}
    queue_items.sort(key=lambda x: (priority_order.get(x['priority'], 2), x['checkin_time']))
    
    return queue_items

@api_router.put("/queue/{patient_id}/status")
async def update_queue_status(patient_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Update patient queue status: waiting, in_consultation, completed"""
    if status not in ['waiting', 'in_consultation', 'completed']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.patients.update_one({'id': patient_id}, {'$set': {'queue_status': status}})
    await db.checkin_history.update_one(
        {'patient_id': patient_id, 'checkout_time': None},
        {'$set': {'queue_status': status}}
    )
    
    return {"message": f"Queue status updated to {status}"}

@api_router.put("/queue/{patient_id}/priority")
async def update_patient_priority(patient_id: str, priority: str, current_user: dict = Depends(get_current_user)):
    """Update patient priority: normal, elderly, emergency"""
    if priority not in ['normal', 'elderly', 'emergency']:
        raise HTTPException(status_code=400, detail="Invalid priority")
    
    await db.patients.update_one({'id': patient_id}, {'$set': {'priority': priority}})
    await db.checkin_history.update_one(
        {'patient_id': patient_id, 'checkout_time': None},
        {'$set': {'priority': priority}}
    )
    
    return {"message": f"Priority updated to {priority}"}

# ==================== INVENTORY ROUTES ====================

def calculate_sale_price(purchase_price: float, markup_percentage: float) -> float:
    return round(purchase_price * (1 + markup_percentage / 100), 2)

def add_sale_price_to_item(item: dict) -> dict:
    """Add calculated sale_price to inventory item"""
    if item:
        purchase_price = item.get('purchase_price', item.get('price', 0))
        markup = item.get('markup_percentage', 20)
        item['sale_price'] = calculate_sale_price(purchase_price, markup)
        # Ensure purchase_price exists (for backward compatibility)
        if 'purchase_price' not in item:
            item['purchase_price'] = item.get('price', 0)
        if 'markup_percentage' not in item:
            item['markup_percentage'] = 20
    return item

@api_router.post("/inventory", response_model=InventoryItemResponse)
async def create_inventory_item(item: InventoryItemCreate, current_user: dict = Depends(get_current_user)):
    item_id = str(uuid.uuid4())
    sale_price = calculate_sale_price(item.purchase_price, item.markup_percentage)
    item_doc = {
        'id': item_id,
        'name': item.name,
        'category': item.category,
        'quantity': item.quantity,
        'unit': item.unit,
        'min_stock': item.min_stock,
        'purchase_price': item.purchase_price,
        'markup_percentage': item.markup_percentage,
        'sale_price': sale_price,
        'supplier': item.supplier or "",
        'batch_number': item.batch_number or "",
        'expiry_date': item.expiry_date or "",
        'movement_count': 0,
        'movement_status': 'slow',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.inventory.insert_one(item_doc)
    return await db.inventory.find_one({'id': item_id}, {'_id': 0})

@api_router.get("/inventory", response_model=List[InventoryItemResponse])
async def get_inventory(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category and category != 'all':
        query['category'] = category
    items = await db.inventory.find(query, {'_id': 0}).to_list(1000)
    # Add sale_price to each item (for backward compatibility)
    return [add_sale_price_to_item(item) for item in items]

@api_router.get("/inventory/template")
async def get_inventory_template(current_user: dict = Depends(get_current_user)):
    """Get CSV template for inventory import"""
    return {
        "columns": ["name", "category", "quantity", "unit", "min_stock", "purchase_price", "markup_percentage", "supplier", "batch_number", "expiry_date"],
        "sample_row": ["Ashwagandha Capsules", "medicines", "100", "pieces", "20", "150", "25", "Himalaya", "BATCH001", "2025-12-31"],
        "categories": ["herbs", "medicines", "equipment", "consumables"],
        "units": ["pieces", "bottles", "kg", "grams", "ml", "liters", "strips", "boxes"]
    }

@api_router.get("/inventory/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.inventory.find_one({'id': item_id}, {'_id': 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return add_sale_price_to_item(item)

@api_router.put("/inventory/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(item_id: str, item: InventoryItemCreate, current_user: dict = Depends(get_current_user)):
    sale_price = calculate_sale_price(item.purchase_price, item.markup_percentage)
    update_data = item.model_dump()
    update_data['sale_price'] = sale_price
    await db.inventory.update_one({'id': item_id}, {'$set': update_data})
    updated = await db.inventory.find_one({'id': item_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return add_sale_price_to_item(updated)

@api_router.post("/inventory/{item_id}/update-stock")
async def update_stock(item_id: str, request: InventoryUpdateRequest, current_user: dict = Depends(get_current_user)):
    item = await db.inventory.find_one({'id': item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    new_quantity = item['quantity'] + request.quantity_change
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    # Record movement
    movement_record = {
        'id': str(uuid.uuid4()),
        'item_id': item_id,
        'quantity_change': request.quantity_change,
        'reason': request.reason,
        'user_id': current_user['id'],
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    await db.inventory_movements.insert_one(movement_record)
    
    # Update movement count and status
    movement_count = item.get('movement_count', 0) + abs(request.quantity_change)
    movement_status = 'fast' if movement_count > 50 else ('slow' if movement_count > 10 else 'dead')
    
    await db.inventory.update_one(
        {'id': item_id},
        {'$set': {
            'quantity': new_quantity,
            'movement_count': movement_count,
            'movement_status': movement_status
        }}
    )
    updated = await db.inventory.find_one({'id': item_id}, {'_id': 0})
    return updated

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.inventory.delete_one({'id': item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# ==================== IMPORT ENDPOINTS ====================

@api_router.post("/inventory/import")
async def import_inventory(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Import inventory from CSV or Excel file.
    Expected columns: name, category, quantity, unit, min_stock, purchase_price, markup_percentage, supplier, batch_number, expiry_date
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = file.filename.lower().split('.')[-1]
    if file_ext not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(status_code=400, detail="Invalid file format. Use CSV or Excel (xlsx/xls)")
    
    try:
        content = await file.read()
        
        if file_ext == 'csv':
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        required_cols = ['name', 'quantity']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing_cols)}")
        
        imported = 0
        skipped = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                name = str(row.get('name', '')).strip()
                if not name or pd.isna(row.get('name')):
                    skipped += 1
                    continue
                
                # Check if item already exists
                existing = await db.inventory.find_one({'name': {'$regex': f'^{name}$', '$options': 'i'}})
                if existing:
                    errors.append(f"Row {idx+2}: '{name}' already exists (skipped)")
                    skipped += 1
                    continue
                
                quantity = int(row.get('quantity', 0)) if not pd.isna(row.get('quantity')) else 0
                purchase_price = float(row.get('purchase_price', 0)) if not pd.isna(row.get('purchase_price')) else 0
                markup = float(row.get('markup_percentage', 20)) if not pd.isna(row.get('markup_percentage')) else 20
                sale_price = calculate_sale_price(purchase_price, markup)
                
                item_doc = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'category': str(row.get('category', 'medicines')).strip().lower() if not pd.isna(row.get('category')) else 'medicines',
                    'quantity': quantity,
                    'unit': str(row.get('unit', 'pieces')).strip() if not pd.isna(row.get('unit')) else 'pieces',
                    'min_stock': int(row.get('min_stock', 10)) if not pd.isna(row.get('min_stock')) else 10,
                    'purchase_price': purchase_price,
                    'markup_percentage': markup,
                    'sale_price': sale_price,
                    'supplier': str(row.get('supplier', '')).strip() if not pd.isna(row.get('supplier')) else '',
                    'batch_number': str(row.get('batch_number', '')).strip() if not pd.isna(row.get('batch_number')) else '',
                    'expiry_date': str(row.get('expiry_date', '')).strip() if not pd.isna(row.get('expiry_date')) else '',
                    'movement_count': 0,
                    'movement_status': 'slow',
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.inventory.insert_one(item_doc)
                imported += 1
            except Exception as e:
                errors.append(f"Row {idx+2}: {str(e)}")
                skipped += 1
        
        return {
            "message": f"Import completed. {imported} items imported, {skipped} skipped.",
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:10]  # Return first 10 errors
        }
    except Exception as e:
        logger.error(f"Import error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

@api_router.post("/patients/import")
async def import_patients(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Import patients from CSV or Excel file.
    Expected columns: name, age, gender, phone, address, medical_history, prakriti
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = file.filename.lower().split('.')[-1]
    if file_ext not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(status_code=400, detail="Invalid file format. Use CSV or Excel (xlsx/xls)")
    
    try:
        content = await file.read()
        
        if file_ext == 'csv':
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        required_cols = ['name']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing_cols)}")
        
        imported = 0
        skipped = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                name = str(row.get('name', '')).strip()
                if not name or pd.isna(row.get('name')):
                    skipped += 1
                    continue
                
                phone = str(row.get('phone', '')).strip() if not pd.isna(row.get('phone')) else ''
                
                # Check if patient already exists (by name and phone)
                if phone:
                    existing = await db.patients.find_one({
                        'name': {'$regex': f'^{name}$', '$options': 'i'},
                        'phone': phone
                    })
                    if existing:
                        errors.append(f"Row {idx+2}: '{name}' with phone '{phone}' already exists (skipped)")
                        skipped += 1
                        continue
                
                age = 0
                if not pd.isna(row.get('age')):
                    try:
                        age = int(float(row.get('age', 0)))
                    except:
                        age = 0
                
                gender = str(row.get('gender', 'male')).strip().lower() if not pd.isna(row.get('gender')) else 'male'
                if gender not in ['male', 'female', 'other']:
                    gender = 'male'
                
                patient_doc = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'age': age,
                    'gender': gender,
                    'phone': phone,
                    'address': str(row.get('address', '')).strip() if not pd.isna(row.get('address')) else '',
                    'medical_history': str(row.get('medical_history', '')).strip() if not pd.isna(row.get('medical_history')) else '',
                    'prakriti': str(row.get('prakriti', '')).strip() if not pd.isna(row.get('prakriti')) else '',
                    'status': 'active',
                    'patient_type': 'None',
                    'room_number': None,
                    'token_number': None,
                    'admission_date': None,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.patients.insert_one(patient_doc)
                imported += 1
            except Exception as e:
                errors.append(f"Row {idx+2}: {str(e)}")
                skipped += 1
        
        return {
            "message": f"Import completed. {imported} patients imported, {skipped} skipped.",
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:10]
        }
    except Exception as e:
        logger.error(f"Import error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

# ==================== APPOINTMENT ROUTES ====================

@api_router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(appointment: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': appointment.patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    doctor = await db.users.find_one({'id': appointment.doctor_id, 'role': 'doctor'}, {'_id': 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    appointment_id = str(uuid.uuid4())
    appointment_doc = {
        'id': appointment_id,
        'patient_id': appointment.patient_id,
        'patient_name': patient['name'],
        'patient_phone': patient.get('phone', ''),
        'doctor_id': appointment.doctor_id,
        'doctor_name': doctor['name'],
        'date': appointment.date,
        'time': appointment.time,
        'treatment_type': appointment.treatment_type,
        'notes': appointment.notes or "",
        'status': 'scheduled',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(appointment_doc)
    return appointment_doc

@api_router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(date: Optional[str] = None, doctor_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if date:
        query['date'] = date
    if doctor_id:
        query['doctor_id'] = doctor_id
    appointments = await db.appointments.find(query, {'_id': 0}).to_list(1000)
    return appointments

@api_router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(appointment_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if status not in ['scheduled', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.appointments.update_one({'id': appointment_id}, {'$set': {'status': status}})
    updated = await db.appointments.find_one({'id': appointment_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return updated

# ==================== PRESCRIPTION ROUTES ====================

@api_router.post("/prescriptions")
async def create_prescription(prescription: PrescriptionCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': prescription.patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    doctor_name = None
    if prescription.doctor_id:
        doctor = await db.users.find_one({'id': prescription.doctor_id}, {'_id': 0})
        if doctor:
            doctor_name = doctor.get('name')
    
    # Process items and deduct from inventory
    processed_items = []
    for item in prescription.items:
        inv_item = await db.inventory.find_one({'id': item.inventory_id})
        if not inv_item:
            raise HTTPException(status_code=404, detail=f"Inventory item {item.name} not found")
        
        if inv_item['quantity'] < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {item.name}. Available: {inv_item['quantity']}")
        
        # Deduct from inventory
        new_quantity = inv_item['quantity'] - item.quantity
        movement_count = inv_item.get('movement_count', 0) + item.quantity
        movement_status = 'fast' if movement_count > 50 else ('slow' if movement_count > 10 else 'dead')
        
        await db.inventory.update_one(
            {'id': item.inventory_id},
            {'$set': {
                'quantity': new_quantity,
                'movement_count': movement_count,
                'movement_status': movement_status
            }}
        )
        
        # Record inventory movement
        movement_record = {
            'id': str(uuid.uuid4()),
            'item_id': item.inventory_id,
            'quantity_change': -item.quantity,
            'reason': f"Prescribed to patient: {patient['name']}",
            'user_id': current_user['id'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        await db.inventory_movements.insert_one(movement_record)
        
        # Get pricing info
        purchase_price = inv_item.get('purchase_price', inv_item.get('price', 0))
        sale_price = inv_item.get('sale_price', purchase_price * 1.2)
        
        processed_items.append({
            'inventory_id': item.inventory_id,
            'name': item.name,
            'quantity': item.quantity,
            'dosage': item.dosage,
            'duration': item.duration,
            'purchase_price': purchase_price,
            'sale_price': sale_price,
            'total_cost': purchase_price * item.quantity,
            'total_sale': sale_price * item.quantity
        })
    
    prescription_id = str(uuid.uuid4())
    prescription_doc = {
        'id': prescription_id,
        'patient_id': prescription.patient_id,
        'patient_name': patient['name'],
        'doctor_id': prescription.doctor_id,
        'doctor_name': doctor_name,
        'diagnosis': prescription.diagnosis,
        'items': processed_items,
        'notes': prescription.notes or "",
        'status': 'active',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.prescriptions.insert_one(prescription_doc)
    return await db.prescriptions.find_one({'id': prescription_id}, {'_id': 0})

@api_router.get("/prescriptions")
async def get_prescriptions(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if patient_id:
        query['patient_id'] = patient_id
    prescriptions = await db.prescriptions.find(query, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return prescriptions

@api_router.get("/prescriptions/{prescription_id}")
async def get_prescription(prescription_id: str, current_user: dict = Depends(get_current_user)):
    prescription = await db.prescriptions.find_one({'id': prescription_id}, {'_id': 0})
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription

@api_router.get("/patients/{patient_id}/prescriptions")
async def get_patient_prescriptions(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    prescriptions = await db.prescriptions.find({'patient_id': patient_id}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return prescriptions

@api_router.get("/patients/{patient_id}/report")
async def get_patient_report(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed patient report with all prescriptions and treatment history"""
    patient = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get all prescriptions
    prescriptions = await db.prescriptions.find({'patient_id': patient_id}, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    # Get all appointments
    appointments = await db.appointments.find({'patient_id': patient_id}, {'_id': 0}).sort('date', -1).to_list(100)
    
    # Get all bills
    bills = await db.bills.find({'patient_id': patient_id}, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    # Get checkin history
    checkins = await db.checkin_history.find({'patient_id': patient_id}, {'_id': 0}).sort('checkin_time', -1).to_list(100)
    
    # Calculate totals
    total_medicines_prescribed = sum(
        sum(item['quantity'] for item in p.get('items', []))
        for p in prescriptions
    )
    total_medicine_value = sum(
        sum(item.get('total_sale', 0) for item in p.get('items', []))
        for p in prescriptions
    )
    total_billed = sum(b['total_amount'] for b in bills)
    total_paid = sum(b['paid_amount'] for b in bills)
    
    return {
        'patient': patient,
        'prescriptions': prescriptions,
        'appointments': appointments,
        'bills': bills,
        'checkin_history': checkins,
        'summary': {
            'total_prescriptions': len(prescriptions),
            'total_medicines_prescribed': total_medicines_prescribed,
            'total_medicine_value': total_medicine_value,
            'total_appointments': len(appointments),
            'total_visits': len(checkins),
            'total_billed': total_billed,
            'total_paid': total_paid,
            'balance_due': total_billed - total_paid
        }
    }

@api_router.put("/prescriptions/{prescription_id}/status")
async def update_prescription_status(prescription_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if status not in ['active', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.prescriptions.update_one({'id': prescription_id}, {'$set': {'status': status}})
    updated = await db.prescriptions.find_one({'id': prescription_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return updated

# ==================== BILLING ROUTES ====================

def ensure_bill_profit_fields(bill: dict) -> dict:
    """Ensure bill has all required fields for backward compatibility"""
    if bill:
        if 'total_cost' not in bill:
            bill['total_cost'] = 0
        if 'total_profit' not in bill:
            bill['total_profit'] = 0
        if 'consultation_charges' not in bill:
            bill['consultation_charges'] = 0
        if 'therapy_charges' not in bill:
            bill['therapy_charges'] = 0
        if 'mess_charges' not in bill:
            bill['mess_charges'] = 0
        if 'other_charges' not in bill:
            bill['other_charges'] = 0
        if 'discount' not in bill:
            bill['discount'] = 0
        if 'subtotal' not in bill:
            bill['subtotal'] = bill.get('total_amount', 0)
        if 'gst_rate' not in bill:
            bill['gst_rate'] = 0
        if 'gst_amount' not in bill:
            bill['gst_amount'] = 0
        if 'payment_method' not in bill:
            bill['payment_method'] = None
        if 'bill_type' not in bill:
            bill['bill_type'] = 'OP'
        if 'admission_date' not in bill:
            bill['admission_date'] = None
        if 'discharge_date' not in bill:
            bill['discharge_date'] = None
    return bill

@api_router.post("/bills", response_model=BillResponse)
async def create_bill(bill: BillCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': bill.patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Calculate totals and profit for each item
    items_with_profit = []
    total_sale = 0
    total_cost = 0
    
    for item in bill.items:
        sale_price = item.get('sale_price', item.get('price', 0))
        purchase_price = item.get('purchase_price', 0)
        quantity = item.get('quantity', 1)
        
        item_sale = quantity * sale_price
        item_cost = quantity * purchase_price
        item_profit = item_sale - item_cost
        
        items_with_profit.append({
            'name': item.get('name', ''),
            'quantity': quantity,
            'sale_price': sale_price,
            'purchase_price': purchase_price,
            'item_total': item_sale,
            'item_cost': item_cost,
            'profit': item_profit
        })
        
        total_sale += item_sale
        total_cost += item_cost
    
    total_profit = total_sale - total_cost
    
    # Calculate subtotal with all charges (including mess_charges for IP)
    subtotal = (total_sale + bill.treatment_charges + bill.room_charges + 
                bill.consultation_charges + bill.therapy_charges + 
                bill.mess_charges + bill.other_charges)
    
    # Apply discount
    discounted_total = subtotal - bill.discount
    
    # Calculate GST
    gst_amount = bill.gst_amount if bill.gst_amount > 0 else (discounted_total * bill.gst_rate / 100 if bill.gst_rate > 0 else 0)
    
    # Final total
    total_amount = bill.total_amount if bill.total_amount > 0 else (discounted_total + gst_amount)
    
    bill_id = str(uuid.uuid4())
    bill_doc = {
        'id': bill_id,
        'patient_id': bill.patient_id,
        'patient_name': patient['name'],
        'bill_type': bill.bill_type,
        'items': items_with_profit,
        'treatment_charges': bill.treatment_charges,
        'room_charges': bill.room_charges,
        'consultation_charges': bill.consultation_charges,
        'therapy_charges': bill.therapy_charges,
        'mess_charges': bill.mess_charges,
        'other_charges': bill.other_charges,
        'discount': bill.discount,
        'subtotal': subtotal,
        'gst_rate': bill.gst_rate,
        'gst_amount': gst_amount,
        'total_amount': total_amount,
        'total_cost': total_cost,
        'total_profit': total_profit,
        'paid_amount': 0,
        'status': 'pending',
        'payment_method': None,
        'notes': bill.notes or "",
        'admission_date': bill.admission_date,
        'discharge_date': bill.discharge_date,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.bills.insert_one(bill_doc)
    return await db.bills.find_one({'id': bill_id}, {'_id': 0})

@api_router.get("/bills", response_model=List[BillResponse])
async def get_bills(patient_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if patient_id:
        query['patient_id'] = patient_id
    if status and status != 'all':
        query['status'] = status
    bills = await db.bills.find(query, {'_id': 0}).to_list(1000)
    return [ensure_bill_profit_fields(b) for b in bills]

@api_router.get("/bills/{bill_id}", response_model=BillResponse)
async def get_bill(bill_id: str, current_user: dict = Depends(get_current_user)):
    bill = await db.bills.find_one({'id': bill_id}, {'_id': 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return ensure_bill_profit_fields(bill)

@api_router.post("/bills/payment")
async def record_payment(payment: PaymentRequest, current_user: dict = Depends(get_current_user)):
    bill = await db.bills.find_one({'id': payment.bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    new_paid = bill['paid_amount'] + payment.amount
    if new_paid > bill['total_amount']:
        raise HTTPException(status_code=400, detail="Payment exceeds bill amount")
    
    status = 'paid' if new_paid >= bill['total_amount'] else 'partial'
    
    # Record payment
    payment_record = {
        'id': str(uuid.uuid4()),
        'bill_id': payment.bill_id,
        'amount': payment.amount,
        'payment_method': payment.payment_method,
        'user_id': current_user['id'],
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_record)
    
    await db.bills.update_one(
        {'id': payment.bill_id},
        {'$set': {'paid_amount': new_paid, 'status': status, 'payment_method': payment.payment_method}}
    )
    updated = await db.bills.find_one({'id': payment.bill_id}, {'_id': 0})
    return ensure_bill_profit_fields(updated)

# ==================== ROOM ROUTES ====================

@api_router.post("/rooms")
async def create_room(room: RoomCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.rooms.find_one({'room_number': room.room_number})
    if existing:
        raise HTTPException(status_code=400, detail="Room number already exists")
    
    room_id = str(uuid.uuid4())
    room_doc = {
        'id': room_id,
        'room_number': room.room_number,
        'room_type': room.room_type,
        'floor': room.floor or "Ground",
        'daily_rate': room.daily_rate,
        'description': room.description or "",
        'is_occupied': False,
        'patient_id': None,
        'patient_name': None
    }
    await db.rooms.insert_one(room_doc)
    return await db.rooms.find_one({'id': room_id}, {'_id': 0})

@api_router.get("/rooms")
async def get_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.rooms.find({}, {'_id': 0}).to_list(100)
    # Enrich with patient names
    for room in rooms:
        if room.get('patient_id'):
            patient = await db.patients.find_one({'id': room['patient_id']}, {'_id': 0, 'name': 1, 'pid': 1})
            room['patient_name'] = patient.get('name', '') if patient else ''
            room['patient_pid'] = patient.get('pid', '') if patient else ''
    return rooms

@api_router.get("/rooms/available")
async def get_available_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.rooms.find({'is_occupied': False}, {'_id': 0}).to_list(100)
    return rooms

@api_router.put("/rooms/{room_id}")
async def update_room(room_id: str, room: RoomCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.rooms.find_one({'id': room_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Room not found")
    await db.rooms.update_one({'id': room_id}, {'$set': {
        'room_number': room.room_number,
        'room_type': room.room_type,
        'floor': room.floor or "Ground",
        'daily_rate': room.daily_rate,
        'description': room.description or ""
    }})
    return await db.rooms.find_one({'id': room_id}, {'_id': 0})

@api_router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, current_user: dict = Depends(get_current_user)):
    room = await db.rooms.find_one({'id': room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get('is_occupied'):
        raise HTTPException(status_code=400, detail="Cannot delete an occupied room")
    await db.rooms.delete_one({'id': room_id})
    return {"message": "Room deleted"}

@api_router.get("/rooms/overview")
async def get_rooms_overview(current_user: dict = Depends(get_current_user)):
    """Floor-wise room overview with occupancy stats"""
    rooms = await db.rooms.find({}, {'_id': 0}).to_list(200)
    for room in rooms:
        if room.get('patient_id'):
            patient = await db.patients.find_one({'id': room['patient_id']}, {'_id': 0, 'name': 1, 'pid': 1})
            room['patient_name'] = patient.get('name', '') if patient else ''
            room['patient_pid'] = patient.get('pid', '') if patient else ''
    
    floors = {}
    for r in rooms:
        floor = r.get('floor', 'Ground')
        if floor not in floors:
            floors[floor] = []
        floors[floor].append(r)
    
    total = len(rooms)
    occupied = sum(1 for r in rooms if r.get('is_occupied'))
    
    return {
        'total_rooms': total,
        'occupied': occupied,
        'available': total - occupied,
        'occupancy_rate': round((occupied / total * 100) if total > 0 else 0, 1),
        'by_floor': floors,
        'by_type': {
            rt: {
                'total': sum(1 for r in rooms if r.get('room_type') == rt),
                'occupied': sum(1 for r in rooms if r.get('room_type') == rt and r.get('is_occupied'))
            }
            for rt in set(r.get('room_type', 'general') for r in rooms)
        }
    }

# ==================== OP TO IP CONVERSION ====================

@api_router.post("/patients/{patient_id}/convert-to-ip")
async def convert_op_to_ip(patient_id: str, req: ConvertToIPRequest, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check room availability
    room = await db.rooms.find_one({'room_number': req.room_number})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get('is_occupied'):
        raise HTTPException(status_code=400, detail="Room is already occupied")
    
    # Update room
    await db.rooms.update_one(
        {'room_number': req.room_number},
        {'$set': {'is_occupied': True, 'patient_id': patient_id, 'patient_name': patient.get('name', '')}}
    )
    
    # Update patient
    update_data = {
        'patient_type': 'IP',
        'room_number': req.room_number,
        'admission_date': datetime.now(timezone.utc).isoformat(),
        'status': 'active'
    }
    await db.patients.update_one({'id': patient_id}, {'$set': update_data})
    
    # Store admission record with consent/attender details
    admission_record = {
        'id': str(uuid.uuid4()),
        'patient_id': patient_id,
        'patient_name': patient.get('name', ''),
        'patient_pid': patient.get('pid', ''),
        'room_number': req.room_number,
        'room_type': room.get('room_type', ''),
        'daily_rate': room.get('daily_rate', 0),
        'attender_name': req.attender_name or "",
        'attender_relation': req.attender_relation or "",
        'attender_phone': req.attender_phone or "",
        'advance_amount': req.advance_amount,
        'consent_given': req.consent_given,
        'package_id': req.package_id,
        'notes': req.notes or "",
        'admitted_by': current_user['id'],
        'admission_date': datetime.now(timezone.utc).isoformat(),
        'discharge_date': None,
        'status': 'active'
    }
    
    # If package selected, link it
    if req.package_id:
        package = await db.treatment_packages.find_one({'id': req.package_id}, {'_id': 0})
        if package:
            admission_record['package_name'] = package.get('name', '')
            admission_record['package_cost'] = package.get('total_cost', 0)
    
    await db.admissions.insert_one(admission_record)
    
    # Track advance payment if any
    if req.advance_amount > 0:
        advance_doc = {
            'id': str(uuid.uuid4()),
            'patient_id': patient_id,
            'admission_id': admission_record['id'],
            'amount': req.advance_amount,
            'payment_date': datetime.now(timezone.utc).isoformat(),
            'recorded_by': current_user['id'],
            'type': 'advance'
        }
        await db.advance_payments.insert_one(advance_doc)
    
    return await db.patients.find_one({'id': patient_id}, {'_id': 0})

@api_router.get("/admissions")
async def get_admissions(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query['status'] = status
    admissions = await db.admissions.find(query, {'_id': 0}).sort('admission_date', -1).to_list(500)
    return admissions

@api_router.get("/admissions/patient/{patient_id}")
async def get_patient_admissions(patient_id: str, current_user: dict = Depends(get_current_user)):
    admissions = await db.admissions.find({'patient_id': patient_id}, {'_id': 0}).sort('admission_date', -1).to_list(100)
    return admissions

@api_router.get("/advance-payments/{patient_id}")
async def get_advance_payments(patient_id: str, current_user: dict = Depends(get_current_user)):
    payments = await db.advance_payments.find({'patient_id': patient_id}, {'_id': 0}).sort('payment_date', -1).to_list(100)
    return payments

# ==================== TREATMENT PACKAGES ====================

@api_router.post("/treatment-packages")
async def create_treatment_package(pkg: TreatmentPackageCreate, current_user: dict = Depends(require_admin)):
    pkg_id = str(uuid.uuid4())
    pkg_doc = {
        'id': pkg_id,
        'name': pkg.name,
        'duration_days': pkg.duration_days,
        'therapies': pkg.therapies,
        'description': pkg.description or "",
        'room_type': pkg.room_type,
        'total_cost': pkg.total_cost,
        'includes_room': pkg.includes_room,
        'includes_food': pkg.includes_food,
        'includes_medicines': pkg.includes_medicines,
        'status': 'active',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.treatment_packages.insert_one(pkg_doc)
    return await db.treatment_packages.find_one({'id': pkg_id}, {'_id': 0})

@api_router.get("/treatment-packages")
async def get_treatment_packages(current_user: dict = Depends(get_current_user)):
    packages = await db.treatment_packages.find({'status': 'active'}, {'_id': 0}).to_list(100)
    return packages

@api_router.put("/treatment-packages/{pkg_id}")
async def update_treatment_package(pkg_id: str, pkg: TreatmentPackageCreate, current_user: dict = Depends(require_admin)):
    existing = await db.treatment_packages.find_one({'id': pkg_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Package not found")
    await db.treatment_packages.update_one({'id': pkg_id}, {'$set': {
        'name': pkg.name,
        'duration_days': pkg.duration_days,
        'therapies': pkg.therapies,
        'description': pkg.description or "",
        'room_type': pkg.room_type,
        'total_cost': pkg.total_cost,
        'includes_room': pkg.includes_room,
        'includes_food': pkg.includes_food,
        'includes_medicines': pkg.includes_medicines
    }})
    return await db.treatment_packages.find_one({'id': pkg_id}, {'_id': 0})

@api_router.delete("/treatment-packages/{pkg_id}")
async def delete_treatment_package(pkg_id: str, current_user: dict = Depends(require_admin)):
    await db.treatment_packages.update_one({'id': pkg_id}, {'$set': {'status': 'inactive'}})
    return {"message": "Package deactivated"}

# ==================== REPORTS & ANALYTICS ====================

@api_router.get("/reports/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_patients = await db.patients.count_documents({})
    ip_patients = await db.patients.count_documents({'patient_type': 'IP'})
    op_patients = await db.patients.count_documents({'patient_type': 'OP'})
    
    total_inventory = await db.inventory.count_documents({})
    low_stock = await db.inventory.count_documents({'$expr': {'$lte': ['$quantity', '$min_stock']}})
    
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_appointments = await db.appointments.count_documents({'date': today})
    
    # Revenue stats
    bills = await db.bills.find({}, {'_id': 0, 'total_amount': 1, 'paid_amount': 1}).to_list(1000)
    total_revenue = sum(b['total_amount'] for b in bills)
    collected_revenue = sum(b['paid_amount'] for b in bills)
    
    # Inventory movement stats
    fast_moving = await db.inventory.count_documents({'movement_status': 'fast'})
    slow_moving = await db.inventory.count_documents({'movement_status': 'slow'})
    dead_stock = await db.inventory.count_documents({'movement_status': 'dead'})
    
    return {
        'patients': {'total': total_patients, 'ip': ip_patients, 'op': op_patients},
        'inventory': {'total': total_inventory, 'low_stock': low_stock},
        'appointments': {'today': today_appointments},
        'revenue': {'total': total_revenue, 'collected': collected_revenue, 'pending': total_revenue - collected_revenue},
        'inventory_movement': {'fast': fast_moving, 'slow': slow_moving, 'dead': dead_stock}
    }

@api_router.get("/reports/inventory-analytics")
async def get_inventory_analytics(current_user: dict = Depends(get_current_user)):
    items = await db.inventory.find({}, {'_id': 0}).to_list(1000)
    
    # Group by category
    category_stats = {}
    for item in items:
        cat = item['category']
        if cat not in category_stats:
            category_stats[cat] = {'total_items': 0, 'total_value': 0, 'fast': 0, 'slow': 0, 'dead': 0}
        category_stats[cat]['total_items'] += 1
        category_stats[cat]['total_value'] += item['quantity'] * item.get('purchase_price', item.get('price', 0))
        category_stats[cat][item['movement_status']] += 1
    
    # Top fast moving
    fast_moving_items = [i for i in items if i['movement_status'] == 'fast']
    fast_moving_items.sort(key=lambda x: x['movement_count'], reverse=True)
    
    # Top slow moving
    slow_moving_items = [i for i in items if i['movement_status'] in ['slow', 'dead']]
    slow_moving_items.sort(key=lambda x: x['movement_count'])
    
    return {
        'category_stats': category_stats,
        'fast_moving_items': fast_moving_items[:10],
        'slow_moving_items': slow_moving_items[:10],
        'total_items': len(items),
        'total_value': sum(i['quantity'] * i.get('purchase_price', i.get('price', 0)) for i in items)
    }

@api_router.get("/reports/revenue")
async def get_revenue_report(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if start_date:
        query['created_at'] = {'$gte': start_date}
    if end_date:
        if 'created_at' in query:
            query['created_at']['$lte'] = end_date
        else:
            query['created_at'] = {'$lte': end_date}
    
    bills = await db.bills.find(query, {'_id': 0}).to_list(1000)
    
    # Group by date
    daily_revenue = {}
    for bill in bills:
        date = bill['created_at'][:10]
        if date not in daily_revenue:
            daily_revenue[date] = {'total': 0, 'collected': 0}
        daily_revenue[date]['total'] += bill['total_amount']
        daily_revenue[date]['collected'] += bill['paid_amount']
    
    return {
        'daily_revenue': daily_revenue,
        'total_bills': len(bills),
        'total_amount': sum(b['total_amount'] for b in bills),
        'collected_amount': sum(b['paid_amount'] for b in bills)
    }

@api_router.get("/doctors")
async def get_doctors(current_user: dict = Depends(get_current_user)):
    doctors = await db.users.find({'role': 'doctor'}, {'_id': 0, 'password': 0}).to_list(100)
    return doctors

# ==================== PASSWORD RESET (MOCKED) ====================

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# In-memory store for password reset tokens (In production, use Redis or DB)
password_reset_tokens = {}

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset - MOCKED (logs token to console)"""
    user = await db.users.find_one({'email': request.email})
    if not user:
        # Return success even if user not found (security best practice)
        return {"message": "If an account exists with this email, a reset link has been sent"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store token (in production, store in Redis/DB)
    password_reset_tokens[reset_token] = {
        'user_id': user['id'],
        'email': request.email,
        'expiry': expiry.isoformat()
    }
    
    # MOCKED: Log token to console (in production, send via email)
    logger.info(f"PASSWORD RESET TOKEN for {request.email}: {reset_token}")
    logger.info(f"Reset link would be: /reset-password?token={reset_token}")
    
    return {"message": "If an account exists with this email, a reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password_with_token(request: ResetPasswordRequest):
    """Reset password using token"""
    token_data = password_reset_tokens.get(request.token)
    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expiry = datetime.fromisoformat(token_data['expiry'])
    if datetime.now(timezone.utc) > expiry:
        del password_reset_tokens[request.token]
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    hashed = hash_password(request.new_password)
    await db.users.update_one(
        {'id': token_data['user_id']},
        {'$set': {'password': hashed}}
    )
    
    # Remove used token
    del password_reset_tokens[request.token]
    
    return {"message": "Password reset successfully"}

# ==================== HR / STAFF MANAGEMENT ====================

class StaffCreate(BaseModel):
    name: str
    email: str
    phone: str
    role: str  # doctor, nurse, receptionist, pharmacist, accountant, other
    department: str
    designation: str
    salary: float
    join_date: str
    address: Optional[str] = ""

class StaffResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: str
    department: str
    designation: str
    salary: float
    join_date: str
    address: str
    status: str  # active, inactive
    created_at: str

class SalaryPaymentCreate(BaseModel):
    staff_id: str
    month: str  # YYYY-MM format
    amount: float
    bonus: float = 0
    deductions: float = 0
    payment_date: str
    payment_method: str
    notes: Optional[str] = ""

class ExpenseCreate(BaseModel):
    category: str  # utilities, maintenance, supplies, equipment, rent, other
    description: str
    amount: float
    date: str
    vendor: Optional[str] = ""
    notes: Optional[str] = ""

@api_router.post("/staff")
async def create_staff(staff: StaffCreate, current_user: dict = Depends(require_hr_access)):
    staff_id = str(uuid.uuid4())
    staff_doc = {
        'id': staff_id,
        'name': staff.name,
        'email': staff.email,
        'phone': staff.phone,
        'role': staff.role,
        'department': staff.department,
        'designation': staff.designation,
        'salary': staff.salary,
        'join_date': staff.join_date,
        'address': staff.address or "",
        'status': 'active',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.staff.insert_one(staff_doc)
    # Return without _id
    return await db.staff.find_one({'id': staff_id}, {'_id': 0})

@api_router.get("/staff")
async def get_staff(department: Optional[str] = None, current_user: dict = Depends(require_hr_access)):
    query = {}
    if department and department != 'all':
        query['department'] = department
    staff = await db.staff.find(query, {'_id': 0}).to_list(1000)
    return staff

@api_router.get("/staff/{staff_id}")
async def get_staff_member(staff_id: str, current_user: dict = Depends(require_hr_access)):
    staff = await db.staff.find_one({'id': staff_id}, {'_id': 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff

@api_router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, staff: StaffCreate, current_user: dict = Depends(require_hr_access)):
    update_data = staff.model_dump()
    await db.staff.update_one({'id': staff_id}, {'$set': update_data})
    updated = await db.staff.find_one({'id': staff_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Staff not found")
    return updated

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, current_user: dict = Depends(require_hr_access)):
    await db.staff.update_one({'id': staff_id}, {'$set': {'status': 'inactive'}})
    return {"message": "Staff deactivated"}

@api_router.post("/staff/salary-payment")
async def record_salary_payment(payment: SalaryPaymentCreate, current_user: dict = Depends(require_hr_access)):
    staff = await db.staff.find_one({'id': payment.staff_id}, {'_id': 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    payment_id = str(uuid.uuid4())
    net_amount = payment.amount + payment.bonus - payment.deductions
    payment_doc = {
        'id': payment_id,
        'staff_id': payment.staff_id,
        'staff_name': staff['name'],
        'month': payment.month,
        'base_amount': payment.amount,
        'bonus': payment.bonus,
        'deductions': payment.deductions,
        'net_amount': net_amount,
        'payment_date': payment.payment_date,
        'payment_method': payment.payment_method,
        'notes': payment.notes or "",
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.salary_payments.insert_one(payment_doc)
    return await db.salary_payments.find_one({'id': payment_id}, {'_id': 0})

@api_router.get("/staff/salary-payments/{staff_id}")
async def get_staff_salary_payments(staff_id: str, current_user: dict = Depends(require_hr_access)):
    payments = await db.salary_payments.find({'staff_id': staff_id}, {'_id': 0}).to_list(100)
    return payments

@api_router.get("/salary-payments")
async def get_all_salary_payments(month: Optional[str] = None, current_user: dict = Depends(require_hr_access)):
    query = {}
    if month:
        query['month'] = month
    payments = await db.salary_payments.find(query, {'_id': 0}).to_list(1000)
    return payments

# ==================== LEAVE MANAGEMENT ====================

class LeaveCreate(BaseModel):
    staff_id: str
    leave_date: str  # YYYY-MM-DD
    leave_type: str = "casual"  # casual, sick, earned, other
    from_time: Optional[str] = None  # HH:MM (for half-day)
    to_time: Optional[str] = None
    is_half_day: bool = False
    reason: Optional[str] = ""

@api_router.post("/leaves")
async def create_leave(leave: LeaveCreate, current_user: dict = Depends(require_hr_access)):
    staff = await db.staff.find_one({'id': leave.staff_id}, {'_id': 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    leave_id = str(uuid.uuid4())
    leave_doc = {
        'id': leave_id,
        'staff_id': leave.staff_id,
        'staff_name': staff['name'],
        'leave_date': leave.leave_date,
        'leave_type': leave.leave_type,
        'from_time': leave.from_time or "",
        'to_time': leave.to_time or "",
        'is_half_day': leave.is_half_day,
        'reason': leave.reason or "",
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.leaves.insert_one(leave_doc)
    return await db.leaves.find_one({'id': leave_id}, {'_id': 0})

@api_router.get("/leaves")
async def get_leaves(staff_id: Optional[str] = None, month: Optional[str] = None, current_user: dict = Depends(require_hr_access)):
    query = {}
    if staff_id:
        query['staff_id'] = staff_id
    if month:
        query['leave_date'] = {'$regex': f'^{month}'}
    leaves = await db.leaves.find(query, {'_id': 0}).sort('leave_date', -1).to_list(1000)
    return leaves

@api_router.get("/leaves/staff/{staff_id}")
async def get_staff_leaves(staff_id: str, current_user: dict = Depends(require_hr_access)):
    leaves = await db.leaves.find({'staff_id': staff_id}, {'_id': 0}).sort('leave_date', -1).to_list(1000)
    return leaves

@api_router.get("/leaves/summary")
async def get_leave_summary(current_user: dict = Depends(require_hr_access)):
    staff_list = await db.staff.find({'status': 'active'}, {'_id': 0}).to_list(1000)
    current_year = datetime.now(timezone.utc).strftime('%Y')
    summaries = []
    for s in staff_list:
        leaves = await db.leaves.find({
            'staff_id': s['id'],
            'leave_date': {'$regex': f'^{current_year}'}
        }, {'_id': 0}).to_list(1000)
        total_days = sum(0.5 if l.get('is_half_day') else 1 for l in leaves)
        by_type = {}
        for l in leaves:
            lt = l.get('leave_type', 'casual')
            by_type[lt] = by_type.get(lt, 0) + (0.5 if l.get('is_half_day') else 1)
        summaries.append({
            'staff_id': s['id'],
            'staff_name': s['name'],
            'department': s['department'],
            'total_leaves': total_days,
            'by_type': by_type
        })
    return summaries

@api_router.delete("/leaves/{leave_id}")
async def delete_leave(leave_id: str, current_user: dict = Depends(require_hr_access)):
    result = await db.leaves.delete_one({'id': leave_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Leave record not found")
    return {"message": "Leave record deleted"}

# ==================== MESS MANAGEMENT ====================

class MealPriceUpdate(BaseModel):
    breakfast: float = 0
    lunch: float = 0
    dinner: float = 0
    snacks: float = 0
    tea_coffee: float = 0

class PatientMealCreate(BaseModel):
    patient_id: str
    date: str  # YYYY-MM-DD
    breakfast: bool = False
    lunch: bool = False
    dinner: bool = False
    snacks: bool = False
    tea_coffee: bool = False
    notes: Optional[str] = ""

@api_router.get("/mess/settings")
async def get_mess_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.mess_settings.find_one({'type': 'meal_prices'}, {'_id': 0})
    if not settings:
        default = {
            'type': 'meal_prices',
            'breakfast': 80,
            'lunch': 120,
            'dinner': 120,
            'snacks': 50,
            'tea_coffee': 30,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        await db.mess_settings.insert_one(default)
        return {k: v for k, v in default.items() if k != '_id'}
    return settings

@api_router.put("/mess/settings")
async def update_mess_settings(prices: MealPriceUpdate, current_user: dict = Depends(require_hr_access)):
    update_data = prices.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.mess_settings.update_one(
        {'type': 'meal_prices'},
        {'$set': update_data},
        upsert=True
    )
    return await db.mess_settings.find_one({'type': 'meal_prices'}, {'_id': 0})

@api_router.post("/mess/meals")
async def assign_patient_meal(meal: PatientMealCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': meal.patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    prices = await db.mess_settings.find_one({'type': 'meal_prices'}, {'_id': 0})
    if not prices:
        prices = {'breakfast': 80, 'lunch': 120, 'dinner': 120, 'snacks': 50, 'tea_coffee': 30}
    total = 0
    if meal.breakfast:
        total += prices.get('breakfast', 0)
    if meal.lunch:
        total += prices.get('lunch', 0)
    if meal.dinner:
        total += prices.get('dinner', 0)
    if meal.snacks:
        total += prices.get('snacks', 0)
    if meal.tea_coffee:
        total += prices.get('tea_coffee', 0)

    # Check if meal record already exists for this patient+date
    existing = await db.patient_meals.find_one({
        'patient_id': meal.patient_id,
        'date': meal.date
    })
    meal_id = str(uuid.uuid4()) if not existing else existing['id']
    meal_doc = {
        'id': meal_id,
        'patient_id': meal.patient_id,
        'patient_name': patient['name'],
        'date': meal.date,
        'breakfast': meal.breakfast,
        'lunch': meal.lunch,
        'dinner': meal.dinner,
        'snacks': meal.snacks,
        'tea_coffee': meal.tea_coffee,
        'total_cost': total,
        'notes': meal.notes or "",
        'created_by': current_user['id'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    if existing:
        await db.patient_meals.update_one({'id': meal_id}, {'$set': meal_doc})
    else:
        meal_doc['created_at'] = datetime.now(timezone.utc).isoformat()
        await db.patient_meals.insert_one(meal_doc)
    return await db.patient_meals.find_one({'id': meal_id}, {'_id': 0})

@api_router.get("/mess/meals")
async def get_patient_meals(date: Optional[str] = None, patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if date:
        query['date'] = date
    if patient_id:
        query['patient_id'] = patient_id
    meals = await db.patient_meals.find(query, {'_id': 0}).sort('date', -1).to_list(1000)
    return meals

@api_router.get("/mess/meals/patient/{patient_id}")
async def get_patient_meal_history(patient_id: str, current_user: dict = Depends(get_current_user)):
    meals = await db.patient_meals.find({'patient_id': patient_id}, {'_id': 0}).sort('date', -1).to_list(100)
    return meals

@api_router.get("/mess/summary")
async def get_mess_summary(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if date:
        query['date'] = date
    else:
        query['date'] = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    meals = await db.patient_meals.find(query, {'_id': 0}).to_list(1000)
    total_cost = sum(m.get('total_cost', 0) for m in meals)
    breakfast_count = sum(1 for m in meals if m.get('breakfast'))
    lunch_count = sum(1 for m in meals if m.get('lunch'))
    dinner_count = sum(1 for m in meals if m.get('dinner'))
    snacks_count = sum(1 for m in meals if m.get('snacks'))
    tea_coffee_count = sum(1 for m in meals if m.get('tea_coffee'))
    return {
        'date': query['date'],
        'total_patients': len(meals),
        'total_cost': total_cost,
        'breakdown': {
            'breakfast': breakfast_count,
            'lunch': lunch_count,
            'dinner': dinner_count,
            'snacks': snacks_count,
            'tea_coffee': tea_coffee_count
        }
    }

@api_router.delete("/mess/meals/{meal_id}")
async def delete_patient_meal(meal_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.patient_meals.delete_one({'id': meal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal record not found")
    return {"message": "Meal record deleted"}

# ==================== EXPENSE MANAGEMENT ====================

@api_router.post("/expenses")
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense_id = str(uuid.uuid4())
    expense_doc = {
        'id': expense_id,
        'category': expense.category,
        'description': expense.description,
        'amount': expense.amount,
        'date': expense.date,
        'vendor': expense.vendor or "",
        'notes': expense.notes or "",
        'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.expenses.insert_one(expense_doc)
    return await db.expenses.find_one({'id': expense_id}, {'_id': 0})

@api_router.get("/expenses")
async def get_expenses(category: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category and category != 'all':
        query['category'] = category
    if start_date:
        query['date'] = {'$gte': start_date}
    if end_date:
        if 'date' in query:
            query['date']['$lte'] = end_date
        else:
            query['date'] = {'$lte': end_date}
    expenses = await db.expenses.find(query, {'_id': 0}).to_list(1000)
    return expenses

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({'id': expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# ==================== ENHANCED FINANCIAL REPORTS ====================

@api_router.get("/reports/financial")
async def get_financial_report(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(require_reports_access)):
    # Date filter
    date_filter = {}
    if start_date:
        date_filter['$gte'] = start_date
    if end_date:
        date_filter['$lte'] = end_date if '$gte' in date_filter else end_date
    
    # Get all IP and OP patients (historical)
    total_ip_checkins = await db.checkin_history.count_documents({'patient_type': 'IP'})
    total_op_checkins = await db.checkin_history.count_documents({'patient_type': 'OP'})
    
    # Current IP/OP
    current_ip = await db.patients.count_documents({'patient_type': 'IP', 'status': 'active'})
    current_op = await db.patients.count_documents({'patient_type': 'OP', 'status': 'active'})
    
    # Revenue from bills
    bill_query = {'created_at': date_filter} if date_filter else {}
    bills = await db.bills.find(bill_query, {'_id': 0}).to_list(1000)
    total_revenue = sum(b.get('total_amount', 0) for b in bills)
    collected_revenue = sum(b.get('paid_amount', 0) for b in bills)
    
    # Medicine sales and profit (from bill items)
    medicine_sales = 0
    medicine_cost = 0
    medicine_profit = 0
    for bill in bills:
        for item in bill.get('items', []):
            qty = item.get('quantity', 0)
            sale_price = item.get('sale_price', item.get('price', 0))
            purchase_price = item.get('purchase_price', 0)
            medicine_sales += qty * sale_price
            medicine_cost += qty * purchase_price
        # Also sum from bill-level profit tracking
        medicine_profit += bill.get('total_profit', 0)
    
    # If no bill-level profit, calculate from sales - cost
    if medicine_profit == 0:
        medicine_profit = medicine_sales - medicine_cost
    
    # Treatment revenue
    treatment_revenue = sum(b.get('treatment_charges', 0) for b in bills)
    room_revenue = sum(b.get('room_charges', 0) for b in bills)
    
    # Expenses
    expense_query = {'date': date_filter} if date_filter else {}
    expenses = await db.expenses.find(expense_query, {'_id': 0}).to_list(1000)
    total_expenses = sum(e['amount'] for e in expenses)
    
    # Expense by category
    expense_by_category = {}
    for exp in expenses:
        cat = exp['category']
        expense_by_category[cat] = expense_by_category.get(cat, 0) + exp['amount']
    
    # Salary expenses
    salary_query = {}
    if start_date:
        salary_query['payment_date'] = {'$gte': start_date}
    if end_date:
        if 'payment_date' in salary_query:
            salary_query['payment_date']['$lte'] = end_date
        else:
            salary_query['payment_date'] = {'$lte': end_date}
    
    salary_payments = await db.salary_payments.find(salary_query, {'_id': 0}).to_list(1000)
    total_salary_expense = sum(p['net_amount'] for p in salary_payments)
    
    # Total expenses including salaries
    total_all_expenses = total_expenses + total_salary_expense
    
    # Profit/Loss
    profit_loss = collected_revenue - total_all_expenses
    
    return {
        'patients': {
            'total_ip_checkins': total_ip_checkins,
            'total_op_checkins': total_op_checkins,
            'current_ip': current_ip,
            'current_op': current_op
        },
        'revenue': {
            'total_billed': total_revenue,
            'collected': collected_revenue,
            'pending': total_revenue - collected_revenue,
            'medicine_sales': medicine_sales,
            'medicine_cost': medicine_cost,
            'medicine_profit': medicine_profit,
            'treatment_revenue': treatment_revenue,
            'room_revenue': room_revenue
        },
        'expenses': {
            'operational': total_expenses,
            'salaries': total_salary_expense,
            'total': total_all_expenses,
            'by_category': expense_by_category
        },
        'profit_loss': {
            'medicine_profit': medicine_profit,
            'gross_profit': collected_revenue - total_expenses,
            'net_profit': profit_loss,
            'is_profit': profit_loss >= 0
        },
        'summary': {
            'total_revenue': collected_revenue,
            'total_expense': total_all_expenses,
            'net_result': profit_loss
        }
    }

@api_router.get("/reports/hr-summary")
async def get_hr_summary(current_user: dict = Depends(require_hr_access)):
    staff = await db.staff.find({'status': 'active'}, {'_id': 0}).to_list(1000)
    
    # Total salary liability
    total_monthly_salary = sum(s['salary'] for s in staff)
    
    # Staff by department
    by_department = {}
    for s in staff:
        dept = s['department']
        if dept not in by_department:
            by_department[dept] = {'count': 0, 'salary': 0}
        by_department[dept]['count'] += 1
        by_department[dept]['salary'] += s['salary']
    
    # Staff by role
    by_role = {}
    for s in staff:
        role = s['role']
        by_role[role] = by_role.get(role, 0) + 1
    
    # Recent salary payments
    recent_payments = await db.salary_payments.find({}, {'_id': 0}).sort('created_at', -1).to_list(10)
    
    # Current month payments
    current_month = datetime.now(timezone.utc).strftime('%Y-%m')
    paid_this_month = await db.salary_payments.find({'month': current_month}, {'_id': 0}).to_list(1000)
    paid_staff_ids = [p['staff_id'] for p in paid_this_month]
    
    return {
        'total_staff': len(staff),
        'total_monthly_salary': total_monthly_salary,
        'by_department': by_department,
        'by_role': by_role,
        'recent_payments': recent_payments,
        'paid_this_month': len(paid_this_month),
        'pending_this_month': len(staff) - len(paid_this_month)
    }

# ==================== EXECUTIVE DASHBOARD ====================

@api_router.get("/reports/executive-dashboard")
async def get_executive_dashboard(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    
    ip_today = await db.checkin_history.count_documents({'patient_type': 'IP', 'checkin_time': {'$gte': today_start}})
    op_today = await db.checkin_history.count_documents({'patient_type': 'OP', 'checkin_time': {'$gte': today_start}})
    active_ip = await db.patients.count_documents({'patient_type': 'IP', 'status': 'active'})
    active_op = await db.patients.count_documents({'patient_type': 'OP', 'status': 'active'})
    
    today_bills = await db.bills.find({'created_at': {'$gte': today_start}}, {'_id': 0}).to_list(500)
    today_revenue = sum(b.get('total_amount', 0) for b in today_bills)
    today_collected = sum(b.get('paid_amount', 0) for b in today_bills)
    
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0).isoformat()
    month_bills = await db.bills.find({'created_at': {'$gte': month_start}}, {'_id': 0, 'total_amount': 1, 'paid_amount': 1}).to_list(1000)
    month_revenue = sum(b.get('total_amount', 0) for b in month_bills)
    month_collected = sum(b.get('paid_amount', 0) for b in month_bills)
    
    doctor_stats = {}
    today_checkins = await db.checkin_history.find({'checkin_time': {'$gte': today_start}}, {'_id': 0}).to_list(500)
    for ci in today_checkins:
        doc_id = ci.get('doctor_id', '')
        if doc_id:
            if doc_id not in doctor_stats:
                doctor_stats[doc_id] = {'consultations': 0, 'name': ''}
            doctor_stats[doc_id]['consultations'] += 1
    
    docs = await db.users.find({'role': 'doctor'}, {'_id': 0, 'id': 1, 'name': 1}).to_list(100)
    doc_map = {d['id']: d['name'] for d in docs}
    for doc_id in doctor_stats:
        doctor_stats[doc_id]['name'] = doc_map.get(doc_id, 'Unknown')
    
    doctor_performance = sorted(
        [{'doctor_id': k, 'name': v['name'], 'consultations': v['consultations']} for k, v in doctor_stats.items()],
        key=lambda x: x['consultations'], reverse=True
    )
    
    total_rooms = await db.rooms.count_documents({})
    occupied_rooms = await db.rooms.count_documents({'is_occupied': True})
    today_appts = await db.appointments.count_documents({'date': today})
    completed_appts = await db.appointments.count_documents({'date': today, 'status': 'completed'})
    waiting = await db.checkin_history.count_documents({'checkin_time': {'$gte': today_start}, 'queue_status': 'waiting'})
    in_consultation = await db.checkin_history.count_documents({'checkin_time': {'$gte': today_start}, 'queue_status': 'in_consultation'})
    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({'status': 'new'})
    
    return {
        'today': {'ip_checkins': ip_today, 'op_checkins': op_today, 'total_checkins': ip_today + op_today, 'revenue': today_revenue, 'collected': today_collected, 'appointments': today_appts, 'completed_appointments': completed_appts},
        'active': {'ip_patients': active_ip, 'op_patients': active_op, 'queue_waiting': waiting, 'queue_in_consultation': in_consultation},
        'monthly': {'revenue': month_revenue, 'collected': month_collected},
        'rooms': {'total': total_rooms, 'occupied': occupied_rooms, 'available': total_rooms - occupied_rooms, 'occupancy_rate': round((occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0, 1)},
        'doctor_performance': doctor_performance,
        'leads': {'total': total_leads, 'new': new_leads}
    }

# ==================== LEAD MANAGEMENT ====================

class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    source: str = "whatsapp"
    inquiry_type: str = "general"
    notes: Optional[str] = ""
    assigned_to: Optional[str] = None
    follow_up_date: Optional[str] = None

@api_router.post("/leads")
async def create_lead(lead: LeadCreate, current_user: dict = Depends(get_current_user)):
    lead_id = str(uuid.uuid4())
    lead_doc = {
        'id': lead_id, 'name': lead.name, 'phone': lead.phone, 'email': lead.email or "",
        'source': lead.source, 'inquiry_type': lead.inquiry_type, 'notes': lead.notes or "",
        'assigned_to': lead.assigned_to, 'follow_up_date': lead.follow_up_date,
        'status': 'new', 'converted_patient_id': None, 'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat(), 'updated_at': datetime.now(timezone.utc).isoformat(),
        'history': [{'action': 'created', 'by': current_user.get('name', ''), 'at': datetime.now(timezone.utc).isoformat()}]
    }
    await db.leads.insert_one(lead_doc)
    return await db.leads.find_one({'id': lead_id}, {'_id': 0})

@api_router.get("/leads")
async def get_leads(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status and status != 'all':
        query['status'] = status
    return await db.leads.find(query, {'_id': 0}).sort('created_at', -1).to_list(1000)

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, lead: LeadCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.leads.find_one({'id': lead_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.leads.update_one({'id': lead_id}, {'$set': {
        'name': lead.name, 'phone': lead.phone, 'email': lead.email or "",
        'source': lead.source, 'inquiry_type': lead.inquiry_type, 'notes': lead.notes or "",
        'assigned_to': lead.assigned_to, 'follow_up_date': lead.follow_up_date,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }})
    return await db.leads.find_one({'id': lead_id}, {'_id': 0})

@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, current_user: dict = Depends(get_current_user)):
    valid = ['new', 'contacted', 'follow_up', 'converted', 'lost']
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status")
    existing = await db.leads.find_one({'id': lead_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.leads.update_one({'id': lead_id}, {
        '$set': {'status': status, 'updated_at': datetime.now(timezone.utc).isoformat()},
        '$push': {'history': {'action': f'status_changed_to_{status}', 'by': current_user.get('name', ''), 'at': datetime.now(timezone.utc).isoformat()}}
    })
    return await db.leads.find_one({'id': lead_id}, {'_id': 0})

@api_router.post("/leads/{lead_id}/convert")
async def convert_lead_to_patient(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.get('status') == 'converted':
        raise HTTPException(status_code=400, detail="Lead already converted")
    patient_id = str(uuid.uuid4())
    pid = await generate_pid()
    patient_doc = {
        'id': patient_id, 'pid': pid, 'name': lead['name'], 'age': 0, 'gender': 'other',
        'phone': lead['phone'], 'address': '', 'medical_history': '', 'prakriti': '',
        'dob': '', 'email': lead.get('email', ''), 'blood_group': '', 'occupation': '',
        'marital_status': '', 'emergency_contact_name': '', 'emergency_contact_phone': '',
        'lifestyle': '', 'referral_source': lead.get('source', ''),
        'status': 'active', 'patient_type': 'None', 'room_number': None,
        'token_number': None, 'admission_date': None, 'priority': 'normal',
        'queue_status': None, 'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.patients.insert_one(patient_doc)
    await db.leads.update_one({'id': lead_id}, {
        '$set': {'status': 'converted', 'converted_patient_id': patient_id, 'updated_at': datetime.now(timezone.utc).isoformat()},
        '$push': {'history': {'action': 'converted_to_patient', 'patient_pid': pid, 'by': current_user.get('name', ''), 'at': datetime.now(timezone.utc).isoformat()}}
    })
    return {'message': f'Lead converted to patient {pid}', 'patient_id': patient_id, 'pid': pid}

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({'id': lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

# ==================== FEEDBACK MANAGEMENT ====================

class FeedbackCreate(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = ""
    rating: int = 5
    feedback_text: Optional[str] = ""
    source: str = "in_person"

@api_router.post("/feedback")
async def create_feedback(fb: FeedbackCreate, current_user: dict = Depends(get_current_user)):
    fb_id = str(uuid.uuid4())
    patient_name = fb.patient_name
    if fb.patient_id and not patient_name:
        patient = await db.patients.find_one({'id': fb.patient_id}, {'_id': 0, 'name': 1})
        patient_name = patient.get('name', '') if patient else ''
    fb_doc = {
        'id': fb_id, 'patient_id': fb.patient_id, 'patient_name': patient_name,
        'rating': fb.rating, 'feedback_text': fb.feedback_text or "", 'source': fb.source,
        'escalation': fb.rating <= 2, 'escalation_resolved': False, 'escalation_notes': '',
        'google_review_sent': False, 'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.feedback.insert_one(fb_doc)
    return await db.feedback.find_one({'id': fb_id}, {'_id': 0})

@api_router.get("/feedback")
async def get_feedback(escalation_only: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if escalation_only:
        query['escalation'] = True
    return await db.feedback.find(query, {'_id': 0}).sort('created_at', -1).to_list(500)

@api_router.put("/feedback/{fb_id}/resolve")
async def resolve_escalation(fb_id: str, notes: Optional[str] = "", current_user: dict = Depends(get_current_user)):
    await db.feedback.update_one({'id': fb_id}, {'$set': {'escalation_resolved': True, 'escalation_notes': notes or "Resolved"}})
    return await db.feedback.find_one({'id': fb_id}, {'_id': 0})

@api_router.get("/feedback/summary")
async def get_feedback_summary(current_user: dict = Depends(get_current_user)):
    all_fb = await db.feedback.find({}, {'_id': 0, 'rating': 1, 'escalation': 1, 'escalation_resolved': 1}).to_list(1000)
    total = len(all_fb)
    if total == 0:
        return {'total': 0, 'average_rating': 0, 'escalations': 0, 'unresolved': 0, 'by_rating': {}}
    avg = sum(f['rating'] for f in all_fb) / total
    by_rating = {}
    for f in all_fb:
        r = str(f['rating'])
        by_rating[r] = by_rating.get(r, 0) + 1
    return {
        'total': total, 'average_rating': round(avg, 1),
        'escalations': sum(1 for f in all_fb if f.get('escalation')),
        'unresolved': sum(1 for f in all_fb if f.get('escalation') and not f.get('escalation_resolved')),
        'by_rating': by_rating
    }

@api_router.delete("/feedback/{fb_id}")
async def delete_feedback(fb_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.feedback.delete_one({'id': fb_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"message": "Feedback deleted"}

# ==================== THERAPY SCHEDULING (REQ-4) ====================

class TherapyTypeCreate(BaseModel):
    name: str
    category: str = "general"  # panchakarma, massage, general, yoga
    duration_minutes: int = 60
    base_cost: float = 0
    requires_room: bool = True
    gender_specific: Optional[str] = None  # male, female, or None for any
    description: Optional[str] = ""

class TherapyScheduleCreate(BaseModel):
    patient_id: str
    therapy_type_id: str
    therapist_id: Optional[str] = None
    room_id: Optional[str] = None
    scheduled_date: str
    scheduled_time: str
    notes: Optional[str] = ""

@api_router.post("/therapy-types")
async def create_therapy_type(therapy: TherapyTypeCreate, current_user: dict = Depends(get_current_user)):
    therapy_id = str(uuid.uuid4())
    therapy_doc = {
        'id': therapy_id,
        'name': therapy.name,
        'category': therapy.category,
        'duration_minutes': therapy.duration_minutes,
        'base_cost': therapy.base_cost,
        'requires_room': therapy.requires_room,
        'gender_specific': therapy.gender_specific,
        'description': therapy.description or "",
        'is_active': True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.therapy_types.insert_one(therapy_doc)
    return await db.therapy_types.find_one({'id': therapy_id}, {'_id': 0})

@api_router.get("/therapy-types")
async def get_therapy_types(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {'is_active': True}
    if category:
        query['category'] = category
    return await db.therapy_types.find(query, {'_id': 0}).to_list(200)

@api_router.put("/therapy-types/{therapy_id}")
async def update_therapy_type(therapy_id: str, therapy: TherapyTypeCreate, current_user: dict = Depends(get_current_user)):
    update_data = therapy.dict()
    await db.therapy_types.update_one({'id': therapy_id}, {'$set': update_data})
    updated = await db.therapy_types.find_one({'id': therapy_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Therapy type not found")
    return updated

@api_router.delete("/therapy-types/{therapy_id}")
async def delete_therapy_type(therapy_id: str, current_user: dict = Depends(get_current_user)):
    await db.therapy_types.update_one({'id': therapy_id}, {'$set': {'is_active': False}})
    return {"message": "Therapy type deactivated"}

@api_router.post("/therapy-schedules")
async def create_therapy_schedule(schedule: TherapyScheduleCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': schedule.patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    therapy_type = await db.therapy_types.find_one({'id': schedule.therapy_type_id}, {'_id': 0})
    if not therapy_type:
        raise HTTPException(status_code=404, detail="Therapy type not found")
    
    # Gender-based validation
    if therapy_type.get('gender_specific'):
        patient_gender = patient.get('gender', '').lower()
        if patient_gender and patient_gender != therapy_type['gender_specific']:
            raise HTTPException(status_code=400, detail=f"This therapy is restricted to {therapy_type['gender_specific']} patients only")
    
    # Check for room conflicts if room assigned
    if schedule.room_id and therapy_type.get('requires_room'):
        duration = therapy_type.get('duration_minutes', 60)
        # Parse scheduled time
        try:
            sched_hour, sched_min = map(int, schedule.scheduled_time.split(':'))
            start_minutes = sched_hour * 60 + sched_min
            end_minutes = start_minutes + duration
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
        
        existing = await db.therapy_schedules.find({
            'room_id': schedule.room_id,
            'scheduled_date': schedule.scheduled_date,
            'status': {'$nin': ['cancelled', 'completed']}
        }, {'_id': 0}).to_list(100)
        
        for ex in existing:
            try:
                ex_hour, ex_min = map(int, ex['scheduled_time'].split(':'))
                ex_start = ex_hour * 60 + ex_min
                ex_type = await db.therapy_types.find_one({'id': ex['therapy_type_id']}, {'_id': 0})
                ex_duration = ex_type.get('duration_minutes', 60) if ex_type else 60
                ex_end = ex_start + ex_duration
                if start_minutes < ex_end and end_minutes > ex_start:
                    raise HTTPException(status_code=409, detail=f"Room conflict: already booked from {ex['scheduled_time']} for {ex_duration} min")
            except ValueError:
                continue
    
    # Check therapist conflicts
    if schedule.therapist_id:
        duration = therapy_type.get('duration_minutes', 60)
        try:
            sched_hour, sched_min = map(int, schedule.scheduled_time.split(':'))
            start_minutes = sched_hour * 60 + sched_min
            end_minutes = start_minutes + duration
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
        
        therapist_existing = await db.therapy_schedules.find({
            'therapist_id': schedule.therapist_id,
            'scheduled_date': schedule.scheduled_date,
            'status': {'$nin': ['cancelled', 'completed']}
        }, {'_id': 0}).to_list(100)
        
        for ex in therapist_existing:
            try:
                ex_hour, ex_min = map(int, ex['scheduled_time'].split(':'))
                ex_start = ex_hour * 60 + ex_min
                ex_type = await db.therapy_types.find_one({'id': ex['therapy_type_id']}, {'_id': 0})
                ex_duration = ex_type.get('duration_minutes', 60) if ex_type else 60
                ex_end = ex_start + ex_duration
                if start_minutes < ex_end and end_minutes > ex_start:
                    raise HTTPException(status_code=409, detail=f"Therapist conflict: already booked from {ex['scheduled_time']}")
            except ValueError:
                continue
    
    # Get therapist name
    therapist_name = None
    if schedule.therapist_id:
        therapist = await db.staff.find_one({'id': schedule.therapist_id}, {'_id': 0})
        if not therapist:
            therapist = await db.users.find_one({'id': schedule.therapist_id}, {'_id': 0})
        if therapist:
            therapist_name = therapist.get('name')
    
    schedule_id = str(uuid.uuid4())
    schedule_doc = {
        'id': schedule_id,
        'patient_id': schedule.patient_id,
        'patient_name': patient['name'],
        'patient_phone': patient.get('phone', ''),
        'therapy_type_id': schedule.therapy_type_id,
        'therapy_name': therapy_type['name'],
        'therapy_category': therapy_type.get('category', 'general'),
        'duration_minutes': therapy_type.get('duration_minutes', 60),
        'cost': therapy_type.get('base_cost', 0),
        'therapist_id': schedule.therapist_id,
        'therapist_name': therapist_name,
        'room_id': schedule.room_id,
        'scheduled_date': schedule.scheduled_date,
        'scheduled_time': schedule.scheduled_time,
        'status': 'scheduled',  # scheduled, in_progress, completed, cancelled
        'notes': schedule.notes or "",
        'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.therapy_schedules.insert_one(schedule_doc)
    return await db.therapy_schedules.find_one({'id': schedule_id}, {'_id': 0})

@api_router.get("/therapy-schedules")
async def get_therapy_schedules(
    date: Optional[str] = None,
    patient_id: Optional[str] = None,
    therapist_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if date:
        query['scheduled_date'] = date
    if patient_id:
        query['patient_id'] = patient_id
    if therapist_id:
        query['therapist_id'] = therapist_id
    if status and status != 'all':
        query['status'] = status
    schedules = await db.therapy_schedules.find(query, {'_id': 0}).sort('scheduled_time', 1).to_list(500)
    return schedules

@api_router.get("/therapy-schedules/patient/{patient_id}")
async def get_patient_therapy_schedules(patient_id: str, current_user: dict = Depends(get_current_user)):
    schedules = await db.therapy_schedules.find(
        {'patient_id': patient_id}, {'_id': 0}
    ).sort('scheduled_date', -1).to_list(200)
    return schedules

@api_router.put("/therapy-schedules/{schedule_id}/status")
async def update_therapy_schedule_status(schedule_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if status not in ['scheduled', 'in_progress', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Invalid status")
    update_data = {'status': status}
    if status == 'completed':
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
    await db.therapy_schedules.update_one({'id': schedule_id}, {'$set': update_data})
    updated = await db.therapy_schedules.find_one({'id': schedule_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return updated

@api_router.delete("/therapy-schedules/{schedule_id}")
async def delete_therapy_schedule(schedule_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.therapy_schedules.delete_one({'id': schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted"}

# ==================== ADVANCE DEPOSITS (REQ-5) ====================

class AdvanceCreate(BaseModel):
    patient_id: str
    amount: float
    payment_method: str = "cash"
    notes: Optional[str] = ""

@api_router.post("/advances")
async def create_advance(advance: AdvanceCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': advance.patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    advance_id = str(uuid.uuid4())
    advance_doc = {
        'id': advance_id,
        'patient_id': advance.patient_id,
        'patient_name': patient['name'],
        'amount': advance.amount,
        'used_amount': 0,
        'balance': advance.amount,
        'payment_method': advance.payment_method,
        'status': 'active',  # active, used, refunded
        'notes': advance.notes or "",
        'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.advances.insert_one(advance_doc)
    return await db.advances.find_one({'id': advance_id}, {'_id': 0})

@api_router.get("/advances")
async def get_advances(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if patient_id:
        query['patient_id'] = patient_id
    return await db.advances.find(query, {'_id': 0}).sort('created_at', -1).to_list(500)

@api_router.get("/advances/patient/{patient_id}/balance")
async def get_patient_advance_balance(patient_id: str, current_user: dict = Depends(get_current_user)):
    advances = await db.advances.find({'patient_id': patient_id, 'status': 'active'}, {'_id': 0}).to_list(100)
    total_balance = sum(a.get('balance', 0) for a in advances)
    return {'patient_id': patient_id, 'total_balance': total_balance, 'advances': advances}

@api_router.post("/advances/apply-to-bill")
async def apply_advance_to_bill(bill_id: str, amount: float, current_user: dict = Depends(get_current_user)):
    bill = await db.bills.find_one({'id': bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    patient_id = bill['patient_id']
    advances = await db.advances.find(
        {'patient_id': patient_id, 'status': 'active', 'balance': {'$gt': 0}},
        {'_id': 0}
    ).sort('created_at', 1).to_list(50)
    
    remaining_to_apply = min(amount, bill['total_amount'] - bill['paid_amount'])
    total_applied = 0
    
    for adv in advances:
        if remaining_to_apply <= 0:
            break
        can_use = min(adv['balance'], remaining_to_apply)
        new_used = adv['used_amount'] + can_use
        new_balance = adv['amount'] - new_used
        new_status = 'used' if new_balance <= 0 else 'active'
        await db.advances.update_one(
            {'id': adv['id']},
            {'$set': {'used_amount': new_used, 'balance': new_balance, 'status': new_status}}
        )
        remaining_to_apply -= can_use
        total_applied += can_use
    
    if total_applied > 0:
        new_paid = bill['paid_amount'] + total_applied
        new_status = 'paid' if new_paid >= bill['total_amount'] else 'partial'
        await db.bills.update_one(
            {'id': bill_id},
            {'$set': {'paid_amount': new_paid, 'status': new_status}}
        )
        payment_record = {
            'id': str(uuid.uuid4()),
            'bill_id': bill_id,
            'amount': total_applied,
            'payment_method': 'advance',
            'user_id': current_user['id'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        await db.payments.insert_one(payment_record)
    
    updated_bill = await db.bills.find_one({'id': bill_id}, {'_id': 0})
    return {'applied_amount': total_applied, 'bill': ensure_bill_profit_fields(updated_bill)}

# Get patient's therapy charges for billing consolidation
@api_router.get("/billing/patient-summary/{patient_id}")
async def get_patient_billing_summary(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get completed therapy sessions
    therapies = await db.therapy_schedules.find(
        {'patient_id': patient_id, 'status': 'completed'}, {'_id': 0}
    ).to_list(200)
    therapy_total = sum(t.get('cost', 0) for t in therapies)
    
    # Get room charges if IP
    room_total = 0
    if patient.get('patient_type') == 'IP' and patient.get('room_number'):
        room = await db.rooms.find_one({'room_number': patient['room_number']}, {'_id': 0})
        if room:
            admitted_date = patient.get('admitted_date')
            if admitted_date:
                try:
                    admit = datetime.fromisoformat(admitted_date)
                    days = max(1, (datetime.now(timezone.utc) - admit).days)
                    room_total = days * room.get('daily_rate', 0)
                except (ValueError, TypeError):
                    room_total = room.get('daily_rate', 0)
    
    # Get mess charges
    meals = await db.patient_meals.find({'patient_id': patient_id}, {'_id': 0}).to_list(500)
    mess_total = sum(m.get('total_cost', 0) for m in meals)
    
    # Get advance balance
    advances = await db.advances.find(
        {'patient_id': patient_id, 'status': 'active'}, {'_id': 0}
    ).to_list(50)
    advance_balance = sum(a.get('balance', 0) for a in advances)
    
    # Get existing bills total
    bills = await db.bills.find({'patient_id': patient_id}, {'_id': 0}).to_list(100)
    billed_total = sum(b.get('total_amount', 0) for b in bills)
    paid_total = sum(b.get('paid_amount', 0) for b in bills)
    
    return {
        'patient': patient,
        'therapy_charges': therapy_total,
        'therapy_sessions': len(therapies),
        'therapies': therapies,
        'room_charges': room_total,
        'mess_charges': mess_total,
        'advance_balance': advance_balance,
        'billed_total': billed_total,
        'paid_total': paid_total,
        'outstanding': billed_total - paid_total
    }

# Include router AFTER all routes are defined
app.include_router(api_router)

# Register AI Agents (Phase 1: Intake, Prakriti, Knowledge, Review Queue)
try:
    from ai_agents import register_ai_router
    register_ai_router(app, db, get_current_user)
    print("AI Agents registered: /api/ai/*")
except Exception as e:
    print(f"WARNING: AI Agents not registered: {e}")

# CORS Configuration - handle credentials properly
cors_origins_env = os.environ.get('CORS_ORIGINS', '*')
if cors_origins_env == '*':
    cors_origins = ["*"]
    cors_credentials = False
else:
    cors_origins = [o.strip() for o in cors_origins_env.split(',') if o.strip()]
    cors_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_credentials=cors_credentials,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
