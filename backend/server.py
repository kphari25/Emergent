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
    price: float
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
    price: float
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
    items: List[dict]  # [{name, quantity, price}]
    treatment_charges: float
    room_charges: float = 0
    notes: Optional[str] = ""

class BillResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    items: List[dict]
    treatment_charges: float
    room_charges: float
    total_amount: float
    paid_amount: float
    status: str  # pending, partial, paid
    notes: str
    created_at: str

class PaymentRequest(BaseModel):
    bill_id: str
    amount: float
    payment_method: str

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

@api_router.post("/inventory", response_model=InventoryItemResponse)
async def create_inventory_item(item: InventoryItemCreate, current_user: dict = Depends(get_current_user)):
    item_id = str(uuid.uuid4())
    item_doc = {
        'id': item_id,
        'name': item.name,
        'category': item.category,
        'quantity': item.quantity,
        'unit': item.unit,
        'min_stock': item.min_stock,
        'price': item.price,
        'supplier': item.supplier or "",
        'batch_number': item.batch_number or "",
        'expiry_date': item.expiry_date or "",
        'movement_count': 0,
        'movement_status': 'slow',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.inventory.insert_one(item_doc)
    return item_doc

@api_router.get("/inventory", response_model=List[InventoryItemResponse])
async def get_inventory(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category and category != 'all':
        query['category'] = category
    items = await db.inventory.find(query, {'_id': 0}).to_list(1000)
    return items

@api_router.get("/inventory/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.inventory.find_one({'id': item_id}, {'_id': 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@api_router.put("/inventory/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(item_id: str, item: InventoryItemCreate, current_user: dict = Depends(get_current_user)):
    update_data = item.model_dump()
    await db.inventory.update_one({'id': item_id}, {'$set': update_data})
    updated = await db.inventory.find_one({'id': item_id}, {'_id': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

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

# ==================== BILLING ROUTES ====================

@api_router.post("/bills", response_model=BillResponse)
async def create_bill(bill: BillCreate, current_user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({'id': bill.patient_id}, {'_id': 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    items_total = sum(item['quantity'] * item['price'] for item in bill.items)
    total_amount = items_total + bill.treatment_charges + bill.room_charges
    
    bill_id = str(uuid.uuid4())
    bill_doc = {
        'id': bill_id,
        'patient_id': bill.patient_id,
        'patient_name': patient['name'],
        'items': bill.items,
        'treatment_charges': bill.treatment_charges,
        'room_charges': bill.room_charges,
        'total_amount': total_amount,
        'paid_amount': 0,
        'status': 'pending',
        'notes': bill.notes or "",
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.bills.insert_one(bill_doc)
    return bill_doc

@api_router.get("/bills", response_model=List[BillResponse])
async def get_bills(patient_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if patient_id:
        query['patient_id'] = patient_id
    if status and status != 'all':
        query['status'] = status
    bills = await db.bills.find(query, {'_id': 0}).to_list(1000)
    return bills

@api_router.get("/bills/{bill_id}", response_model=BillResponse)
async def get_bill(bill_id: str, current_user: dict = Depends(get_current_user)):
    bill = await db.bills.find_one({'id': bill_id}, {'_id': 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill

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
        category_stats[cat]['total_value'] += item['quantity'] * item['price']
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
        'total_value': sum(i['quantity'] * i['price'] for i in items)
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
