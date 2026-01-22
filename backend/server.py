from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'ayurcare-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

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
    prakriti: Optional[str] = ""  # Ayurvedic body constitution

class PatientResponse(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    phone: str
    address: str
    medical_history: str
    prakriti: str
    status: str  # active, discharged
    patient_type: str  # IP, OP, None
    room_number: Optional[str] = None
    token_number: Optional[int] = None
    admission_date: Optional[str] = None
    created_at: str

class CheckInRequest(BaseModel):
    patient_id: str
    patient_type: str  # IP or OP
    room_number: Optional[str] = None
    doctor_id: Optional[str] = None
    reason: str

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
    items: List[dict]  # [{name, quantity, sale_price, purchase_price}]
    treatment_charges: float
    room_charges: float = 0
    notes: Optional[str] = ""

class BillResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    items: List[dict]  # [{name, quantity, sale_price, purchase_price, profit}]
    treatment_charges: float
    room_charges: float
    total_amount: float
    total_cost: float  # Total purchase cost
    total_profit: float  # Profit from items
    paid_amount: float
    status: str  # pending, partial, paid
    notes: str
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
    room_type: str  # general, private, icu
    daily_rate: float

class RoomResponse(BaseModel):
    id: str
    room_number: str
    room_type: str
    daily_rate: float
    is_occupied: bool
    patient_id: Optional[str] = None

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
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
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

# ==================== PATIENT ROUTES ====================

@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, current_user: dict = Depends(get_current_user)):
    patient_id = str(uuid.uuid4())
    patient_doc = {
        'id': patient_id,
        'name': patient.name,
        'age': patient.age,
        'gender': patient.gender,
        'phone': patient.phone,
        'address': patient.address,
        'medical_history': patient.medical_history or "",
        'prakriti': patient.prakriti or "",
        'status': 'active',
        'patient_type': 'None',
        'room_number': None,
        'token_number': None,
        'admission_date': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.patients.insert_one(patient_doc)
    return patient_doc

@api_router.get("/patients", response_model=List[PatientResponse])
async def get_patients(patient_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if patient_type and patient_type != 'all':
        query['patient_type'] = patient_type
    patients = await db.patients.find(query, {'_id': 0}).to_list(1000)
    return patients

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
        'admission_date': datetime.now(timezone.utc).isoformat()
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
        'patient_type': request.patient_type,
        'doctor_id': request.doctor_id,
        'reason': request.reason,
        'room_number': request.room_number,
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
        {'$set': {'checkout_time': datetime.now(timezone.utc).isoformat()}}
    )
    
    update_data = {
        'patient_type': 'None',
        'status': 'discharged',
        'room_number': None,
        'token_number': None
    }
    await db.patients.update_one({'id': patient_id}, {'$set': update_data})
    updated = await db.patients.find_one({'id': patient_id}, {'_id': 0})
    return updated

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
    """Ensure bill has profit fields for backward compatibility"""
    if bill:
        if 'total_cost' not in bill:
            bill['total_cost'] = 0
        if 'total_profit' not in bill:
            bill['total_profit'] = 0
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
    total_amount = total_sale + bill.treatment_charges + bill.room_charges
    
    bill_id = str(uuid.uuid4())
    bill_doc = {
        'id': bill_id,
        'patient_id': bill.patient_id,
        'patient_name': patient['name'],
        'items': items_with_profit,
        'treatment_charges': bill.treatment_charges,
        'room_charges': bill.room_charges,
        'total_amount': total_amount,
        'total_cost': total_cost,
        'total_profit': total_profit,
        'paid_amount': 0,
        'status': 'pending',
        'notes': bill.notes or "",
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
        {'$set': {'paid_amount': new_paid, 'status': status}}
    )
    updated = await db.bills.find_one({'id': payment.bill_id}, {'_id': 0})
    return updated

# ==================== ROOM ROUTES ====================

@api_router.post("/rooms", response_model=RoomResponse)
async def create_room(room: RoomCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.rooms.find_one({'room_number': room.room_number})
    if existing:
        raise HTTPException(status_code=400, detail="Room number already exists")
    
    room_id = str(uuid.uuid4())
    room_doc = {
        'id': room_id,
        'room_number': room.room_number,
        'room_type': room.room_type,
        'daily_rate': room.daily_rate,
        'is_occupied': False,
        'patient_id': None
    }
    await db.rooms.insert_one(room_doc)
    return room_doc

@api_router.get("/rooms", response_model=List[RoomResponse])
async def get_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.rooms.find({}, {'_id': 0}).to_list(100)
    return rooms

@api_router.get("/rooms/available", response_model=List[RoomResponse])
async def get_available_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.rooms.find({'is_occupied': False}, {'_id': 0}).to_list(100)
    return rooms

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
async def create_staff(staff: StaffCreate, current_user: dict = Depends(get_current_user)):
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
async def get_staff(department: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if department and department != 'all':
        query['department'] = department
    staff = await db.staff.find(query, {'_id': 0}).to_list(1000)
    return staff

@api_router.get("/staff/{staff_id}")
async def get_staff_member(staff_id: str, current_user: dict = Depends(get_current_user)):
    staff = await db.staff.find_one({'id': staff_id}, {'_id': 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff

@api_router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, staff: StaffCreate, current_user: dict = Depends(get_current_user)):
    update_data = staff.model_dump()
    await db.staff.update_one({'id': staff_id}, {'$set': update_data})
    updated = await db.staff.find_one({'id': staff_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Staff not found")
    return updated

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, current_user: dict = Depends(get_current_user)):
    await db.staff.update_one({'id': staff_id}, {'$set': {'status': 'inactive'}})
    return {"message": "Staff deactivated"}

@api_router.post("/staff/salary-payment")
async def record_salary_payment(payment: SalaryPaymentCreate, current_user: dict = Depends(get_current_user)):
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
async def get_staff_salary_payments(staff_id: str, current_user: dict = Depends(get_current_user)):
    payments = await db.salary_payments.find({'staff_id': staff_id}, {'_id': 0}).to_list(100)
    return payments

@api_router.get("/salary-payments")
async def get_all_salary_payments(month: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if month:
        query['month'] = month
    payments = await db.salary_payments.find(query, {'_id': 0}).to_list(1000)
    return payments

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
async def get_financial_report(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Date filter
    date_filter = {}
    if start_date:
        date_filter['$gte'] = start_date
    if end_date:
        date_filter['$lte'] = end_date if '$gte' in date_filter else end_date
    
    # Get all IP and OP patients (historical)
    all_checkins = await db.checkin_history.find({}, {'_id': 0}).to_list(10000)
    total_ip_checkins = len([c for c in all_checkins if c.get('patient_type') == 'IP'])
    total_op_checkins = len([c for c in all_checkins if c.get('patient_type') == 'OP'])
    
    # Current IP/OP
    current_ip = await db.patients.count_documents({'patient_type': 'IP', 'status': 'active'})
    current_op = await db.patients.count_documents({'patient_type': 'OP', 'status': 'active'})
    
    # Revenue from bills
    bill_query = {'created_at': date_filter} if date_filter else {}
    bills = await db.bills.find(bill_query, {'_id': 0}).to_list(10000)
    total_revenue = sum(b['total_amount'] for b in bills)
    collected_revenue = sum(b['paid_amount'] for b in bills)
    
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
    expenses = await db.expenses.find(expense_query, {'_id': 0}).to_list(10000)
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
    
    salary_payments = await db.salary_payments.find(salary_query, {'_id': 0}).to_list(10000)
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
async def get_hr_summary(current_user: dict = Depends(get_current_user)):
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

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
