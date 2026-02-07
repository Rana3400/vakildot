from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, storage
import os
import uuid
import jwt
import httpx
import base64
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT_DIR, '.env'))

# Initialize Firebase Admin
if not firebase_admin._apps:
    service_account_path = os.path.join(ROOT_DIR, "serviceAccountKey.json")
    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, {'storageBucket': 'vakil-app-auth.firebasestorage.app'})
    else:
        firebase_admin.initialize_app()

db = firestore.client()
app = FastAPI(title="VakilDot API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'vakildot-secret-key-2024')
WEBHOOK_URL = "https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n"

# Models
class LawyerRegister(BaseModel):
    mobile: str
    name: str
    email: str
    practice_field: str = ""
    court: str = ""
    lawyer_type: str = ""
    chamber_number: str = ""

class ClientCreate(BaseModel):
    name: str
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CaseCreate(BaseModel):
    client_id: str
    case_number: str
    fir_number: Optional[str] = None
    case_type: str
    court_name: str
    judge_name: Optional[str] = None
    case_stage: str
    next_hearing_date: str
    next_hearing_time: Optional[str] = None
    case_description: Optional[str] = None
    reminder_enabled: bool = True
    reminder_types: List[str] = ["sms", "call"]

class NotificationRequest(BaseModel):
    client_name: str
    client_phone: str
    case_number: Optional[str] = None
    hearing_date: Optional[str] = None
    hearing_time: Optional[str] = None
    message: str
    notification_type: str

# Helper Functions
def create_token(user_id: str):
    payload = {'user_id': user_id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_doc = db.collection('lawyers').document(user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=401, detail="User not found")
        return user_doc.to_dict()
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def send_webhook(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(WEBHOOK_URL, json=payload)
            logger.info(f"Webhook Sent Successfully: {response.status_code}")
            return {"success": True}
    except Exception as e:
        logger.error(f"Webhook failed: {e}")
        return {"success": False, "error": str(e)}

# Health Check
@app.get("/health")
async def health():
    return {"status": "healthy", "database": "firestore", "app": "VakilDot", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/")
async def root():
    return {"service": "VakilDot API", "status": "running", "version": "2.0"}

# Auth Routes
@api_router.post("/auth/check-existing")
async def check_existing(data: dict):
    mobile = data.get('mobile')
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile required")
    docs = db.collection('lawyers').where('mobile', '==', mobile).limit(1).get()
    return {"exists": len(docs) > 0}

@api_router.post("/auth/register")
async def register(data: LawyerRegister):
    docs = db.collection('lawyers').where('mobile', '==', data.mobile).limit(1).get()
    if len(docs) > 0:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid.uuid4())
    user_dict = data.model_dump()
    user_dict.update({
        "id": user_id,
        "user_role": "lawyer",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    db.collection('lawyers').document(user_id).set(user_dict)
    token = create_token(user_id)
    return {"success": True, "token": token, "user": user_dict}

@api_router.post("/auth/signin")
async def signin(data: dict):
    mobile = data.get('mobile')
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile required")
    docs = db.collection('lawyers').where('mobile', '==', mobile).limit(1).get()
    if len(docs) == 0:
        return {"success": False, "message": "User not found"}
    user = docs[0].to_dict()
    token = create_token(user['id'])
    return {"success": True, "token": token, "user": user}

@api_router.post("/auth/register-client")
async def register_client(data: dict):
    mobile = data.get('mobile')
    name = data.get('name')
    docs = db.collection('lawyers').where('mobile', '==', mobile).limit(1).get()
    if len(docs) > 0:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "mobile": mobile,
        "name": name,
        "user_role": "client",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.collection('lawyers').document(user_id).set(user_dict)
    token = create_token(user_id)
    return {"success": True, "token": token, "user": user_dict}

# Client Routes
@api_router.post("/clients")
async def create_client(data: ClientCreate, user = Depends(get_current_user)):
    client_id = str(uuid.uuid4())
    client_dict = data.model_dump()
    client_dict.update({
        "id": client_id,
        "lawyer_id": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    db.collection('clients').document(client_id).set(client_dict)
    return client_dict

@api_router.get("/clients")
async def get_clients(user = Depends(get_current_user)):
    docs = db.collection('clients').where('lawyer_id', '==', user['id']).get()
    return [doc.to_dict() for doc in docs]

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, user = Depends(get_current_user)):
    doc = db.collection('clients').document(client_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Client not found")
    client = doc.to_dict()
    if client.get('lawyer_id') != user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    return client

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user = Depends(get_current_user)):
    doc = db.collection('clients').document(client_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Client not found")
    if doc.to_dict().get('lawyer_id') != user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    db.collection('clients').document(client_id).delete()
    return {"success": True}

@api_router.post("/clients/{client_id}/upload-photo")
async def upload_client_photo(client_id: str, file: UploadFile = File(...), user = Depends(get_current_user)):
    doc = db.collection('clients').document(client_id).get()
    if not doc.exists or doc.to_dict().get('lawyer_id') != user['id']:
        raise HTTPException(status_code=404, detail="Client not found")
    
    content = await file.read()
    photo_base64 = base64.b64encode(content).decode('utf-8')
    photo_url = f"data:{file.content_type};base64,{photo_base64}"
    
    db.collection('clients').document(client_id).update({"photo_url": photo_url})
    return {"success": True, "photo_url": photo_url}

# Case Routes
@api_router.post("/cases")
async def create_case(data: CaseCreate, user = Depends(get_current_user)):
    client_doc = db.collection('clients').document(data.client_id).get()
    if not client_doc.exists:
        raise HTTPException(status_code=404, detail="Client not found")
    client = client_doc.to_dict()
    
    case_id = str(uuid.uuid4())
    case_dict = data.model_dump()
    case_dict.update({
        "id": case_id,
        "lawyer_id": user['id'],
        "client_name": client['name'],
        "client_phone": client['mobile'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    db.collection('cases').document(case_id).set(case_dict)
    
    # Trigger webhook
    webhook_payload = {
        "event": "case_created",
        "client_name": client['name'],
        "client_phone": client['mobile'],
        "case_number": data.case_number,
        "hearing_date": data.next_hearing_date,
        "hearing_time": data.next_hearing_time or "10:00 AM",
        "court_name": data.court_name,
        "lawyer_name": user.get('name', ''),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await send_webhook(webhook_payload)
    
    return case_dict

@api_router.get("/cases")
async def get_cases(user = Depends(get_current_user)):
    if user.get('user_role') == 'client':
        docs = db.collection('cases').where('client_phone', '==', user['mobile']).get()
    else:
        docs = db.collection('cases').where('lawyer_id', '==', user['id']).get()
    return [doc.to_dict() for doc in docs]

@api_router.get("/cases/{case_id}")
async def get_case(case_id: str, user = Depends(get_current_user)):
    doc = db.collection('cases').document(case_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Case not found")
    return doc.to_dict()

@api_router.put("/cases/{case_id}")
async def update_case(case_id: str, data: dict, user = Depends(get_current_user)):
    doc = db.collection('cases').document(case_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Case not found")
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    db.collection('cases').document(case_id).update(data)
    return {"success": True}

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str, user = Depends(get_current_user)):
    doc = db.collection('cases').document(case_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Case not found")
    if doc.to_dict().get('lawyer_id') != user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    db.collection('cases').document(case_id).delete()
    return {"success": True}

# Communication Hub - Webhook Integration
@api_router.post("/notifications/send-webhook")
async def send_notification(data: NotificationRequest, user = Depends(get_current_user)):
    payload = {
        "event": "notification_request",
        "notification_type": data.notification_type,
        "client_name": data.client_name,
        "client_phone": data.client_phone,
        "case_number": data.case_number,
        "hearing_date": data.hearing_date,
        "hearing_time": data.hearing_time,
        "message": data.message,
        "lawyer_name": user.get('name', ''),
        "lawyer_phone": user.get('mobile', ''),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    result = await send_webhook(payload)
    if result['success']:
        return {"success": True, "message": f"{data.notification_type.upper()} notification sent"}
    raise HTTPException(status_code=500, detail="Failed to send notification")

# Calendar - Get hearings by month
@api_router.get("/calendar/hearings")
async def get_calendar_hearings(month: Optional[str] = None, user = Depends(get_current_user)):
    docs = db.collection('cases').where('lawyer_id', '==', user['id']).get()
    cases = [doc.to_dict() for doc in docs]
    
    hearings = []
    for case in cases:
        if case.get('next_hearing_date'):
            hearings.append({
                "id": case['id'],
                "title": f"{case['case_number']} - {case['client_name']}",
                "date": case['next_hearing_date'],
                "time": case.get('next_hearing_time', '10:00 AM'),
                "court": case.get('court_name', ''),
                "case_stage": case.get('case_stage', '')
            })
    return hearings

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user = Depends(get_current_user)):
    cases = db.collection('cases').where('lawyer_id', '==', user['id']).get()
    clients = db.collection('clients').where('lawyer_id', '==', user['id']).get()
    
    total_cases = len(cases)
    active_cases = sum(1 for c in cases if c.to_dict().get('case_stage') != 'Closed')
    
    today = datetime.now(timezone.utc).date().isoformat()
    todays_hearings = sum(1 for c in cases if c.to_dict().get('next_hearing_date', '').startswith(today))
    
    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "total_clients": len(clients),
        "todays_hearings": todays_hearings,
        "this_week_hearings": 0,
        "pending_invoices": 0,
        "total_revenue": 0
    }

@api_router.get("/dashboard/recent-activity")
async def get_recent_activity(user = Depends(get_current_user)):
    cases = db.collection('cases').where('lawyer_id', '==', user['id']).order_by('created_at', direction=firestore.Query.DESCENDING).limit(5).get()
    return {
        "recent_cases": [c.to_dict() for c in cases],
        "upcoming_hearings": []
    }

# Document Upload
@api_router.post("/documents/upload")
async def upload_document(case_id: str, file: UploadFile = File(...), user = Depends(get_current_user)):
    content = await file.read()
    doc_base64 = base64.b64encode(content).decode('utf-8')
    
    doc_id = str(uuid.uuid4())
    doc_dict = {
        "id": doc_id,
        "case_id": case_id,
        "lawyer_id": user['id'],
        "filename": file.filename,
        "content_type": file.content_type,
        "data": doc_base64,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    db.collection('documents').document(doc_id).set(doc_dict)
    return {"success": True, "document_id": doc_id}

@api_router.get("/documents")
async def get_documents(case_id: Optional[str] = None, user = Depends(get_current_user)):
    query = db.collection('documents').where('lawyer_id', '==', user['id'])
    if case_id:
        query = query.where('case_id', '==', case_id)
    docs = query.get()
    return [{"id": d.to_dict()['id'], "filename": d.to_dict()['filename'], "case_id": d.to_dict()['case_id'], "uploaded_at": d.to_dict()['uploaded_at']} for d in docs]

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
