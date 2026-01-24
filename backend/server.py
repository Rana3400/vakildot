from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import random
import base64
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'vakildesk-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
WEBHOOK_URL = os.environ.get('WEBHOOK_URL', 'https://hook.us1.make.com/your-webhook-endpoint-here')

# Health check flag
db_connected = False

# ============= MODELS =============

class OTPRequest(BaseModel):
    mobile: str

class OTPVerify(BaseModel):
    mobile: str
    otp: str

class LawyerRegister(BaseModel):
    mobile: str
    name: str
    email: EmailStr
    bar_council_number: str
    practice_areas: List[str]
    courts: List[str]
    role: str = "senior_advocate"  # senior_advocate, junior_advocate, clerk

class LawyerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    mobile: str
    name: str
    email: str
    bar_council_number: str
    practice_areas: List[str]
    courts: List[str]
    role: str
    created_at: str

class ClientCreate(BaseModel):
    name: str
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lawyer_id: str
    name: str
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

class CaseCreate(BaseModel):
    client_id: str
    case_number: str
    fir_number: Optional[str] = None
    case_type: str  # Civil, Criminal, Constitutional, etc.
    court_name: str
    judge_name: Optional[str] = None
    case_stage: str  # Filed, Under Trial, Judgment, Appeal
    next_hearing_date: str  # ISO format
    case_description: Optional[str] = None
    reminder_enabled: bool = True
    reminder_types: List[str] = ["sms", "call"]  # sms, call, whatsapp

class Case(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lawyer_id: str
    client_id: str
    client_name: str
    case_number: str
    fir_number: Optional[str] = None
    case_type: str
    court_name: str
    judge_name: Optional[str] = None
    case_stage: str
    next_hearing_date: str
    case_description: Optional[str] = None
    reminder_enabled: bool
    reminder_types: List[str]
    created_at: str
    updated_at: str

class CaseTimelineEntry(BaseModel):
    case_id: str
    event_type: str  # hearing, document_filed, judgment, etc.
    event_date: str
    description: str
    created_by: str

class CaseTimeline(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    case_id: str
    event_type: str
    event_date: str
    description: str
    created_by: str
    created_at: str

class DocumentCreate(BaseModel):
    case_id: str
    document_type: str  # petition, affidavit, evidence, judgment, etc.
    document_name: str
    file_data: str  # base64 encoded file
    file_type: str  # pdf, jpg, png

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lawyer_id: str
    case_id: str
    document_type: str
    document_name: str
    file_size: int
    file_type: str
    uploaded_at: str

class InvoiceCreate(BaseModel):
    client_id: str
    case_id: Optional[str] = None
    amount: float
    fee_type: str  # per_hearing, fixed, consultation
    description: str
    due_date: str

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lawyer_id: str
    client_id: str
    client_name: str
    case_id: Optional[str] = None
    case_number: Optional[str] = None
    amount: float
    fee_type: str
    description: str
    due_date: str
    status: str  # pending, paid, overdue
    created_at: str

class Holiday(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: str
    name: str
    court_type: str  # all, supreme_court, high_court, district_court

class DashboardStats(BaseModel):
    total_cases: int
    active_cases: int
    total_clients: int
    todays_hearings: int
    this_week_hearings: int
    pending_invoices: int
    total_revenue: float

class NotificationRequest(BaseModel):
    client_name: str
    client_phone: str
    hearing_date: str
    case_description: str
    notification_type: str  # whatsapp, sms, voice
    case_number: Optional[str] = None
    court_name: Optional[str] = None

# ============= AUTH HELPERS =============

OTP_STORAGE = {}  # In production, use Redis

def generate_otp():
    return str(random.randint(100000, 999999))

def create_token(lawyer_id: str):
    payload = {
        'lawyer_id': lawyer_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_lawyer(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        lawyer_id = payload.get('lawyer_id')
        if not lawyer_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        lawyer = await db.lawyers.find_one({"id": lawyer_id}, {"_id": 0})
        if not lawyer:
            raise HTTPException(status_code=401, detail="Lawyer not found")
        
        return lawyer
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============= AUTH ROUTES =============

@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    otp = generate_otp()
    OTP_STORAGE[request.mobile] = otp
    # Mock SMS sending
    print(f"[MOCK SMS] Sending OTP {otp} to {request.mobile}")
    return {"success": True, "message": f"OTP sent to {request.mobile}", "otp": otp}

@api_router.post("/auth/verify-otp")
async def verify_otp(request: OTPVerify):
    stored_otp = OTP_STORAGE.get(request.mobile)
    if not stored_otp or stored_otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check if lawyer exists
    lawyer = await db.lawyers.find_one({"mobile": request.mobile}, {"_id": 0})
    
    if lawyer:
        token = create_token(lawyer['id'])
        return {"success": True, "token": token, "lawyer": lawyer, "is_new": False}
    else:
        return {"success": True, "is_new": True, "mobile": request.mobile}

@api_router.post("/auth/register")
async def register_lawyer(lawyer_data: LawyerRegister):
    existing = await db.lawyers.find_one({"mobile": lawyer_data.mobile}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Lawyer already registered")
    
    lawyer_dict = lawyer_data.model_dump()
    lawyer_dict['id'] = str(uuid.uuid4())
    lawyer_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.lawyers.insert_one(lawyer_dict)
    
    token = create_token(lawyer_dict['id'])
    lawyer_dict.pop('_id', None)
    
    return {"success": True, "token": token, "lawyer": lawyer_dict}

# ============= LAWYER ROUTES =============

@api_router.get("/lawyers/profile", response_model=LawyerProfile)
async def get_profile(current_lawyer = Depends(get_current_lawyer)):
    return LawyerProfile(**current_lawyer)

@api_router.put("/lawyers/profile")
async def update_profile(update_data: dict, current_lawyer = Depends(get_current_lawyer)):
    allowed_fields = ['name', 'email', 'practice_areas', 'courts']
    update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if update_fields:
        await db.lawyers.update_one(
            {"id": current_lawyer['id']},
            {"$set": update_fields}
        )
    
    updated_lawyer = await db.lawyers.find_one({"id": current_lawyer['id']}, {"_id": 0})
    return {"success": True, "lawyer": updated_lawyer}

# ============= CLIENT ROUTES =============

@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_lawyer = Depends(get_current_lawyer)):
    client_dict = client_data.model_dump()
    client_dict['id'] = str(uuid.uuid4())
    client_dict['lawyer_id'] = current_lawyer['id']
    client_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.clients.insert_one(client_dict)
    client_dict.pop('_id', None)
    
    return Client(**client_dict)

@api_router.get("/clients", response_model=List[Client])
async def get_clients(current_lawyer = Depends(get_current_lawyer)):
    clients = await db.clients.find({"lawyer_id": current_lawyer['id']}, {"_id": 0}).to_list(1000)
    return [Client(**c) for c in clients]

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, current_lawyer = Depends(get_current_lawyer)):
    client = await db.clients.find_one({"id": client_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return Client(**client)

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, update_data: dict, current_lawyer = Depends(get_current_lawyer)):
    client = await db.clients.find_one({"id": client_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    allowed_fields = ['name', 'mobile', 'email', 'address', 'notes']
    update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if update_fields:
        await db.clients.update_one({"id": client_id}, {"$set": update_fields})
    
    updated_client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return {"success": True, "client": updated_client}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_lawyer = Depends(get_current_lawyer)):
    result = await db.clients.delete_one({"id": client_id, "lawyer_id": current_lawyer['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True, "message": "Client deleted"}

# ============= CASE ROUTES =============

@api_router.post("/cases", response_model=Case)
async def create_case(case_data: CaseCreate, current_lawyer = Depends(get_current_lawyer)):
    # Get client name
    client = await db.clients.find_one({"id": case_data.client_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    case_dict = case_data.model_dump()
    case_dict['id'] = str(uuid.uuid4())
    case_dict['lawyer_id'] = current_lawyer['id']
    case_dict['client_name'] = client['name']
    case_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    case_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.cases.insert_one(case_dict)
    
    # Add initial timeline entry
    timeline_entry = {
        'id': str(uuid.uuid4()),
        'case_id': case_dict['id'],
        'event_type': 'case_filed',
        'event_date': datetime.now(timezone.utc).isoformat(),
        'description': f'Case {case_dict["case_number"]} filed',
        'created_by': current_lawyer['name'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.case_timeline.insert_one(timeline_entry)
    
    case_dict.pop('_id', None)
    return Case(**case_dict)

@api_router.get("/cases", response_model=List[Case])
async def get_cases(current_lawyer = Depends(get_current_lawyer)):
    cases = await db.cases.find({"lawyer_id": current_lawyer['id']}, {"_id": 0}).to_list(1000)
    return [Case(**c) for c in cases]

@api_router.get("/cases/{case_id}", response_model=Case)
async def get_case(case_id: str, current_lawyer = Depends(get_current_lawyer)):
    case = await db.cases.find_one({"id": case_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return Case(**case)

@api_router.put("/cases/{case_id}")
async def update_case(case_id: str, update_data: dict, current_lawyer = Depends(get_current_lawyer)):
    case = await db.cases.find_one({"id": case_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    allowed_fields = ['case_number', 'fir_number', 'case_type', 'court_name', 'judge_name', 
                     'case_stage', 'next_hearing_date', 'case_description', 'reminder_enabled', 'reminder_types']
    update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_fields:
        await db.cases.update_one({"id": case_id}, {"$set": update_fields})
    
    updated_case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    return {"success": True, "case": updated_case}

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str, current_lawyer = Depends(get_current_lawyer)):
    result = await db.cases.delete_one({"id": case_id, "lawyer_id": current_lawyer['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"success": True, "message": "Case deleted"}

@api_router.get("/cases/{case_id}/timeline", response_model=List[CaseTimeline])
async def get_case_timeline(case_id: str, current_lawyer = Depends(get_current_lawyer)):
    # Verify case ownership
    case = await db.cases.find_one({"id": case_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    timeline = await db.case_timeline.find({"case_id": case_id}, {"_id": 0}).sort("event_date", -1).to_list(1000)
    return [CaseTimeline(**t) for t in timeline]

@api_router.post("/cases/{case_id}/timeline")
async def add_timeline_entry(case_id: str, entry: CaseTimelineEntry, current_lawyer = Depends(get_current_lawyer)):
    case = await db.cases.find_one({"id": case_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    timeline_dict = entry.model_dump()
    timeline_dict['id'] = str(uuid.uuid4())
    timeline_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.case_timeline.insert_one(timeline_dict)
    timeline_dict.pop('_id', None)
    
    return {"success": True, "timeline": timeline_dict}

# ============= DOCUMENT ROUTES =============

@api_router.post("/documents", response_model=Document)
async def upload_document(doc_data: DocumentCreate, current_lawyer = Depends(get_current_lawyer)):
    # Verify case ownership
    case = await db.cases.find_one({"id": doc_data.case_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    try:
        file_bytes = base64.b64decode(doc_data.file_data)
        file_size = len(file_bytes)
    except:
        raise HTTPException(status_code=400, detail="Invalid file data")
    
    doc_dict = {
        'id': str(uuid.uuid4()),
        'lawyer_id': current_lawyer['id'],
        'case_id': doc_data.case_id,
        'document_type': doc_data.document_type,
        'document_name': doc_data.document_name,
        'file_data': doc_data.file_data,
        'file_size': file_size,
        'file_type': doc_data.file_type,
        'uploaded_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.insert_one(doc_dict)
    
    response_dict = doc_dict.copy()
    response_dict.pop('file_data')  # Don't return file data in response
    response_dict.pop('_id', None)
    
    return Document(**response_dict)

@api_router.get("/documents")
async def get_documents(case_id: Optional[str] = None, current_lawyer = Depends(get_current_lawyer)):
    query = {"lawyer_id": current_lawyer['id']}
    if case_id:
        query['case_id'] = case_id
    
    documents = await db.documents.find(query, {"_id": 0, "file_data": 0}).to_list(1000)
    return documents

@api_router.get("/documents/{doc_id}")
async def get_document(doc_id: str, current_lawyer = Depends(get_current_lawyer)):
    doc = await db.documents.find_one({"id": doc_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

# ============= BILLING ROUTES =============

@api_router.post("/billing/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_lawyer = Depends(get_current_lawyer)):
    # Get client
    client = await db.clients.find_one({"id": invoice_data.client_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    invoice_dict = invoice_data.model_dump()
    invoice_dict['id'] = str(uuid.uuid4())
    invoice_dict['lawyer_id'] = current_lawyer['id']
    invoice_dict['client_name'] = client['name']
    invoice_dict['status'] = 'pending'
    invoice_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    if invoice_data.case_id:
        case = await db.cases.find_one({"id": invoice_data.case_id}, {"_id": 0})
        if case:
            invoice_dict['case_number'] = case['case_number']
        else:
            invoice_dict['case_number'] = None
    else:
        invoice_dict['case_number'] = None
    
    await db.invoices.insert_one(invoice_dict)
    invoice_dict.pop('_id', None)
    
    return Invoice(**invoice_dict)

@api_router.get("/billing/invoices", response_model=List[Invoice])
async def get_invoices(status: Optional[str] = None, current_lawyer = Depends(get_current_lawyer)):
    query = {"lawyer_id": current_lawyer['id']}
    if status:
        query['status'] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Invoice(**inv) for inv in invoices]

@api_router.put("/billing/invoices/{invoice_id}")
async def update_invoice_status(invoice_id: str, status_data: dict, current_lawyer = Depends(get_current_lawyer)):
    invoice = await db.invoices.find_one({"id": invoice_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if 'status' in status_data:
        await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": status_data['status']}})
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return {"success": True, "invoice": updated_invoice}

# ============= CALENDAR/HOLIDAYS =============

@api_router.get("/calendar/hearings")
async def get_hearings(start_date: Optional[str] = None, end_date: Optional[str] = None, current_lawyer = Depends(get_current_lawyer)):
    query = {"lawyer_id": current_lawyer['id']}
    
    if start_date and end_date:
        query['next_hearing_date'] = {"$gte": start_date, "$lte": end_date}
    
    cases = await db.cases.find(query, {"_id": 0}).sort("next_hearing_date", 1).to_list(1000)
    return cases

@api_router.get("/calendar/holidays", response_model=List[Holiday])
async def get_holidays():
    holidays = await db.holidays.find({}, {"_id": 0}).sort("date", 1).to_list(1000)
    return [Holiday(**h) for h in holidays]

@api_router.post("/calendar/holidays")
async def add_holiday(holiday_data: dict, current_lawyer = Depends(get_current_lawyer)):
    # Only admin can add holidays
    if current_lawyer['role'] != 'senior_advocate':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    holiday_dict = {
        'id': str(uuid.uuid4()),
        'date': holiday_data['date'],
        'name': holiday_data['name'],
        'court_type': holiday_data.get('court_type', 'all')
    }
    
    await db.holidays.insert_one(holiday_dict)
    holiday_dict.pop('_id', None)
    
    return {"success": True, "holiday": holiday_dict}

# ============= DASHBOARD =============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_lawyer = Depends(get_current_lawyer)):
    total_cases = await db.cases.count_documents({"lawyer_id": current_lawyer['id']})
    active_cases = await db.cases.count_documents({"lawyer_id": current_lawyer['id'], "case_stage": {"$ne": "Closed"}})
    total_clients = await db.clients.count_documents({"lawyer_id": current_lawyer['id']})
    
    # Today's hearings
    today = datetime.now(timezone.utc).date().isoformat()
    todays_hearings = await db.cases.count_documents({
        "lawyer_id": current_lawyer['id'],
        "next_hearing_date": {"$regex": f"^{today}"}
    })
    
    # This week's hearings
    week_end = (datetime.now(timezone.utc).date() + timedelta(days=7)).isoformat()
    this_week_hearings = await db.cases.count_documents({
        "lawyer_id": current_lawyer['id'],
        "next_hearing_date": {"$gte": today, "$lte": week_end}
    })
    
    # Pending invoices
    pending_invoices = await db.invoices.count_documents({
        "lawyer_id": current_lawyer['id'],
        "status": "pending"
    })
    
    # Total revenue
    paid_invoices = await db.invoices.find({
        "lawyer_id": current_lawyer['id'],
        "status": "paid"
    }, {"_id": 0, "amount": 1}).to_list(10000)
    total_revenue = sum(inv['amount'] for inv in paid_invoices)
    
    return DashboardStats(
        total_cases=total_cases,
        active_cases=active_cases,
        total_clients=total_clients,
        todays_hearings=todays_hearings,
        this_week_hearings=this_week_hearings,
        pending_invoices=pending_invoices,
        total_revenue=total_revenue
    )

@api_router.get("/dashboard/recent-activity")
async def get_recent_activity(current_lawyer = Depends(get_current_lawyer)):
    # Get recent cases
    recent_cases = await db.cases.find(
        {"lawyer_id": current_lawyer['id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Get upcoming hearings
    today = datetime.now(timezone.utc).date().isoformat()
    upcoming_hearings = await db.cases.find(
        {"lawyer_id": current_lawyer['id'], "next_hearing_date": {"$gte": today}},
        {"_id": 0}
    ).sort("next_hearing_date", 1).limit(5).to_list(5)
    
    return {
        "recent_cases": recent_cases,
        "upcoming_hearings": upcoming_hearings
    }

# ============= REMINDER MOCK =============

@api_router.post("/reminders/send")
async def send_reminder(case_id: str, current_lawyer = Depends(get_current_lawyer)):
    case = await db.cases.find_one({"id": case_id, "lawyer_id": current_lawyer['id']}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    client = await db.clients.find_one({"id": case['client_id']}, {"_id": 0})
    
    messages = []
    if 'sms' in case['reminder_types']:
        msg = f"[MOCK SMS] Reminder sent to {client['mobile']}: Hearing for case {case['case_number']} on {case['next_hearing_date']}"
        print(msg)
        messages.append(msg)
    
    if 'call' in case['reminder_types']:
        msg = f"[MOCK CALL] Voice reminder scheduled for {client['mobile']} about case {case['case_number']}"
        print(msg)
        messages.append(msg)
    
    if 'whatsapp' in case['reminder_types']:
        msg = f"[MOCK WHATSAPP] WhatsApp reminder sent to {client['mobile']}: Case {case['case_number']} hearing on {case['next_hearing_date']}"
        print(msg)
        messages.append(msg)
    
    return {"success": True, "messages": messages}

# ============= WEBHOOK NOTIFICATION =============

async def send_webhook_notification(payload: dict):
    """Send notification data to external webhook (Make.com, Zapier, etc.)"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(WEBHOOK_URL, json=payload)
            response.raise_for_status()
            return {"success": True, "status_code": response.status_code, "response": response.text}
    except httpx.HTTPError as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error sending webhook: {str(e)}")
        return {"success": False, "error": str(e)}

@api_router.post("/notifications/send-webhook")
async def send_notification_webhook(notification: NotificationRequest, current_lawyer = Depends(get_current_lawyer)):
    """
    Send notification via external webhook (Make.com, Zapier, etc.)
    This endpoint can be used for:
    1. Manual notifications from Communication Hub
    2. Automated reminders triggered by scheduled jobs
    """
    
    # Prepare payload for webhook
    payload = {
        "client_name": notification.client_name,
        "client_phone": notification.client_phone,
        "hearing_date": notification.hearing_date,
        "case_description": notification.case_description,
        "notification_type": notification.notification_type,
        "case_number": notification.case_number,
        "court_name": notification.court_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lawyer_name": current_lawyer.get('name'),
        "lawyer_mobile": current_lawyer.get('mobile')
    }
    
    # Send to webhook
    result = await send_webhook_notification(payload)
    
    if result['success']:
        # Log the notification in database
        notification_log = {
            'id': str(uuid.uuid4()),
            'lawyer_id': current_lawyer['id'],
            'client_phone': notification.client_phone,
            'notification_type': notification.notification_type,
            'payload': payload,
            'status': 'sent',
            'sent_at': datetime.now(timezone.utc).isoformat()
        }
        await db.notification_logs.insert_one(notification_log)
        
        return {
            "success": True,
            "message": f"{notification.notification_type.upper()} notification sent successfully",
            "webhook_response": result
        }
    else:
        # Log failed notification
        notification_log = {
            'id': str(uuid.uuid4()),
            'lawyer_id': current_lawyer['id'],
            'client_phone': notification.client_phone,
            'notification_type': notification.notification_type,
            'payload': payload,
            'status': 'failed',
            'error': result.get('error'),
            'sent_at': datetime.now(timezone.utc).isoformat()
        }
        await db.notification_logs.insert_one(notification_log)
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send notification: {result.get('error', 'Unknown error')}"
        )

@api_router.get("/notifications/upcoming-reminders")
async def get_upcoming_reminders(current_lawyer = Depends(get_current_lawyer)):
    """
    Get cases that need reminders in the next 24 hours
    This endpoint can be called by a scheduled job (cron) to send automatic reminders
    """
    
    # Calculate time range: today to tomorrow
    today = datetime.now(timezone.utc)
    tomorrow = today + timedelta(days=1)
    today_str = today.date().isoformat()
    tomorrow_str = tomorrow.date().isoformat()
    
    # Find cases with hearings in the next 24 hours
    upcoming_cases = await db.cases.find({
        "lawyer_id": current_lawyer['id'],
        "reminder_enabled": True,
        "next_hearing_date": {
            "$gte": today_str,
            "$lte": tomorrow_str
        }
    }, {"_id": 0}).to_list(1000)
    
    reminders = []
    for case in upcoming_cases:
        # Get client details
        client = await db.clients.find_one({"id": case['client_id']}, {"_id": 0})
        if client:
            reminders.append({
                "case_id": case['id'],
                "case_number": case['case_number'],
                "client_name": client['name'],
                "client_phone": client['mobile'],
                "hearing_date": case['next_hearing_date'],
                "case_description": case.get('case_description', ''),
                "court_name": case['court_name'],
                "reminder_types": case['reminder_types']
            })
    
    return {
        "success": True,
        "count": len(reminders),
        "reminders": reminders
    }

@api_router.post("/notifications/trigger-auto-reminders")
async def trigger_auto_reminders(current_lawyer = Depends(get_current_lawyer)):
    """
    Trigger automatic reminders for upcoming hearings
    This should be called by a scheduled job (cron) daily
    """
    
    # Get upcoming reminders
    reminders_response = await get_upcoming_reminders(current_lawyer)
    reminders = reminders_response['reminders']
    
    results = []
    for reminder in reminders:
        # Send notification for each reminder type
        for notification_type in reminder['reminder_types']:
            notification = NotificationRequest(
                client_name=reminder['client_name'],
                client_phone=reminder['client_phone'],
                hearing_date=reminder['hearing_date'],
                case_description=reminder['case_description'],
                notification_type=notification_type,
                case_number=reminder['case_number'],
                court_name=reminder['court_name']
            )
            
            try:
                result = await send_notification_webhook(notification, current_lawyer)
                results.append({
                    "case_number": reminder['case_number'],
                    "notification_type": notification_type,
                    "status": "sent",
                    "result": result
                })
            except Exception as e:
                results.append({
                    "case_number": reminder['case_number'],
                    "notification_type": notification_type,
                    "status": "failed",
                    "error": str(e)
                })
    
    return {
        "success": True,
        "total_reminders": len(reminders),
        "total_notifications_sent": len(results),
        "results": results
    }

# ============= INCLUDE ROUTER =============

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