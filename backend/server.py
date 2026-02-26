from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import os
import uuid
import jwt
import httpx
import base64
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
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
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

db = firestore.client()
app = FastAPI(title="VakilDot API")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'vakildot-secret-key-2024')
WEBHOOK_URL = "https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n"

# Models
class LawyerRegister(BaseModel):
    mobile: str
    name: str
    email: str = ""
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

class ReminderCreate(BaseModel):
    title: str
    date: str
    time: str = "10:00"
    notes: Optional[str] = None

# Helpers
def create_token(user_id: str):
    return jwt.encode({'user_id': user_id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm='HS256')

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=['HS256'])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_doc = db.collection('lawyers').document(user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=401, detail="User not found")
        return {**user_doc.to_dict(), 'id': user_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

async def send_webhook(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(WEBHOOK_URL, json=payload)
            logger.info(f"Webhook Sent Successfully: {response.status_code}")
            return {"success": True}
    except Exception as e:
        logger.error(f"Webhook failed: {e}")
        return {"success": False}

# Health Check
@app.get("/health")
async def health():
    return {"status": "healthy", "database": "firestore", "app": "VakilDot", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/")
async def root():
    return {"service": "VakilDot API", "status": "running"}

# Auth
@api_router.post("/auth/check-existing")
async def check_existing(data: dict):
    mobile = data.get('mobile')
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile required")
    docs = list(db.collection('lawyers').where('mobile', '==', mobile).limit(1).stream())
    return {"exists": len(docs) > 0}

@api_router.post("/auth/register")
async def register(data: LawyerRegister):
    docs = list(db.collection('lawyers').where('mobile', '==', data.mobile).limit(1).stream())
    if len(docs) > 0:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid.uuid4())
    user_dict = data.model_dump()
    user_dict.update({"id": user_id, "user_role": "lawyer", "created_at": datetime.now(timezone.utc).isoformat()})
    db.collection('lawyers').document(user_id).set(user_dict)
    return {"success": True, "token": create_token(user_id), "user": user_dict}

@api_router.post("/auth/signin")
async def signin(data: dict):
    mobile = data.get('mobile')
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile required")
    docs = list(db.collection('lawyers').where('mobile', '==', mobile).limit(1).stream())
    if len(docs) == 0:
        return {"success": False, "message": "User not found"}
    user = docs[0].to_dict()
    user['id'] = docs[0].id
    return {"success": True, "token": create_token(user['id']), "user": user}

@api_router.post("/auth/register-client")
async def register_client(data: dict):
    mobile = data.get('mobile')
    name = data.get('name')
    docs = list(db.collection('lawyers').where('mobile', '==', mobile).limit(1).stream())
    if len(docs) > 0:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid.uuid4())
    user_dict = {"id": user_id, "mobile": mobile, "name": name, "user_role": "client", "created_at": datetime.now(timezone.utc).isoformat()}
    db.collection('lawyers').document(user_id).set(user_dict)
    return {"success": True, "token": create_token(user_id), "user": user_dict}

# Profile
@api_router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    return user

@api_router.put("/profile")
async def update_profile(data: dict, user=Depends(get_current_user)):
    allowed = ['name', 'email', 'practice_field', 'court', 'lawyer_type', 'chamber_number', 'address', 'bio', 'photo_url']
    update_data = {k: v for k, v in data.items() if k in allowed}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    db.collection('lawyers').document(user['id']).update(update_data)
    return {"success": True}

@api_router.post("/profile/upload-photo")
async def upload_profile_photo(file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    photo_url = f"data:{file.content_type};base64,{base64.b64encode(content).decode('utf-8')}"
    db.collection('lawyers').document(user['id']).update({"photo_url": photo_url})
    return {"success": True, "photo_url": photo_url}

@api_router.delete("/profile")
async def delete_profile(user=Depends(get_current_user)):
    """HARD DELETE - Permanently purge all user data from database"""
    user_id = user['id']
    
    # Delete all clients
    for c in db.collection('clients').where('lawyer_id', '==', user_id).stream():
        db.collection('clients').document(c.id).delete()
    
    # Delete all cases
    for c in db.collection('cases').where('lawyer_id', '==', user_id).stream():
        db.collection('cases').document(c.id).delete()
    
    # Delete all documents
    for d in db.collection('documents').where('lawyer_id', '==', user_id).stream():
        db.collection('documents').document(d.id).delete()
    
    # Delete all reminders
    for r in db.collection('reminders').where('lawyer_id', '==', user_id).stream():
        db.collection('reminders').document(r.id).delete()
    
    # Delete call history
    for h in db.collection('call_history').where('lawyer_id', '==', user_id).stream():
        db.collection('call_history').document(h.id).delete()
    for h in db.collection('call_history').where('client_id', '==', user_id).stream():
        db.collection('call_history').document(h.id).delete()
    
    # Delete chat messages
    for m in db.collection('chat_messages').where('sender_id', '==', user_id).stream():
        db.collection('chat_messages').document(m.id).delete()
    
    # Delete notifications
    for n in db.collection('fcm_tokens').where('user_id', '==', user_id).stream():
        db.collection('fcm_tokens').document(n.id).delete()
    for n in db.collection('notification_logs').where('user_id', '==', user_id).stream():
        db.collection('notification_logs').document(n.id).delete()
    
    # Delete live status
    try:
        db.collection('live_lawyers').document(user_id).delete()
    except:
        pass
    
    # Delete from users collection (Firebase)
    try:
        db.collection('users').document(user_id).delete()
    except:
        pass
    
    # Finally delete the main lawyer/user profile
    db.collection('lawyers').document(user_id).delete()
    
    return {"success": True, "message": "Account permanently deleted"}

# Clients
@api_router.post("/clients")
async def create_client(data: ClientCreate, user=Depends(get_current_user)):
    client_id = str(uuid.uuid4())
    client_dict = data.model_dump()
    client_dict.update({"id": client_id, "lawyer_id": user['id'], "created_at": datetime.now(timezone.utc).isoformat()})
    db.collection('clients').document(client_id).set(client_dict)
    return client_dict

@api_router.get("/clients")
async def get_clients(user=Depends(get_current_user)):
    docs = db.collection('clients').where('lawyer_id', '==', user['id']).stream()
    return [{**doc.to_dict(), 'id': doc.id} for doc in docs]

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, user=Depends(get_current_user)):
    doc = db.collection('clients').document(client_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Client not found")
    return {**doc.to_dict(), 'id': doc.id}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user=Depends(get_current_user)):
    doc = db.collection('clients').document(client_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Client not found")
    db.collection('clients').document(client_id).delete()
    return {"success": True}

@api_router.post("/clients/{client_id}/upload-photo")
async def upload_client_photo(client_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    photo_url = f"data:{file.content_type};base64,{base64.b64encode(content).decode('utf-8')}"
    db.collection('clients').document(client_id).update({"photo_url": photo_url})
    return {"success": True, "photo_url": photo_url}

# Cases
@api_router.post("/cases")
async def create_case(data: CaseCreate, user=Depends(get_current_user)):
    client_doc = db.collection('clients').document(data.client_id).get()
    if not client_doc.exists:
        raise HTTPException(status_code=404, detail="Client not found")
    client = client_doc.to_dict()
    
    case_id = str(uuid.uuid4())
    case_dict = data.model_dump()
    case_dict.update({
        "id": case_id, "lawyer_id": user['id'], "client_name": client['name'], "client_phone": client['mobile'],
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
    })
    db.collection('cases').document(case_id).set(case_dict)
    
    # Webhook
    await send_webhook({
        "event": "case_created", "client_name": client['name'], "client_phone": client['mobile'],
        "case_number": data.case_number, "hearing_date": data.next_hearing_date,
        "hearing_time": data.next_hearing_time or "10:00 AM", "court_name": data.court_name,
        "lawyer_name": user.get('name', ''), "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return case_dict

@api_router.get("/cases")
async def get_cases(user=Depends(get_current_user)):
    if user.get('user_role') == 'client':
        docs = db.collection('cases').where('client_phone', '==', user['mobile']).stream()
    else:
        docs = db.collection('cases').where('lawyer_id', '==', user['id']).stream()
    return [{**doc.to_dict(), 'id': doc.id} for doc in docs]

@api_router.get("/cases/{case_id}")
async def get_case(case_id: str, user=Depends(get_current_user)):
    doc = db.collection('cases').document(case_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Case not found")
    return {**doc.to_dict(), 'id': doc.id}

@api_router.put("/cases/{case_id}")
async def update_case(case_id: str, data: dict, user=Depends(get_current_user)):
    data['updated_at'] = datetime.now(timezone.utc).isoformat()
    db.collection('cases').document(case_id).update(data)
    return {"success": True}

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str, user=Depends(get_current_user)):
    db.collection('cases').document(case_id).delete()
    return {"success": True}

# Notifications
@api_router.post("/notifications/send-webhook")
async def send_notification(data: NotificationRequest, user=Depends(get_current_user)):
    payload = {
        "event": "notification_request", "notification_type": data.notification_type,
        "client_name": data.client_name, "client_phone": data.client_phone,
        "case_number": data.case_number, "hearing_date": data.hearing_date,
        "hearing_time": data.hearing_time, "message": data.message,
        "lawyer_name": user.get('name', ''), "timestamp": datetime.now(timezone.utc).isoformat()
    }
    result = await send_webhook(payload)
    if result['success']:
        return {"success": True, "message": f"{data.notification_type.upper()} sent"}
    raise HTTPException(status_code=500, detail="Failed to send")

# Calendar
@api_router.get("/calendar/hearings")
async def get_hearings(user=Depends(get_current_user)):
    docs = db.collection('cases').where('lawyer_id', '==', user['id']).stream()
    hearings = []
    for doc in docs:
        c = doc.to_dict()
        if c.get('next_hearing_date'):
            hearings.append({
                "id": doc.id, "title": f"{c['case_number']} - {c.get('client_name', '')}",
                "date": c['next_hearing_date'], "time": c.get('next_hearing_time', '10:00 AM'),
                "court": c.get('court_name', ''), "case_stage": c.get('case_stage', '')
            })
    return hearings

@api_router.get("/calendar/reminders")
async def get_reminders(user=Depends(get_current_user)):
    docs = db.collection('reminders').where('lawyer_id', '==', user['id']).stream()
    return [{**doc.to_dict(), 'id': doc.id} for doc in docs]

@api_router.post("/calendar/reminders")
async def create_reminder(data: ReminderCreate, user=Depends(get_current_user)):
    reminder_id = str(uuid.uuid4())
    reminder_dict = data.model_dump()
    reminder_dict.update({"id": reminder_id, "lawyer_id": user['id'], "created_at": datetime.now(timezone.utc).isoformat()})
    db.collection('reminders').document(reminder_id).set(reminder_dict)
    return reminder_dict

# Documents
@api_router.post("/documents/upload")
async def upload_document(case_id: str = Query(...), file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    doc_id = str(uuid.uuid4())
    doc_dict = {
        "id": doc_id, "case_id": case_id, "lawyer_id": user['id'],
        "filename": file.filename, "content_type": file.content_type,
        "data": base64.b64encode(content).decode('utf-8'),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    db.collection('documents').document(doc_id).set(doc_dict)
    return {"success": True, "document_id": doc_id}

@api_router.get("/documents")
async def get_documents(case_id: Optional[str] = None, user=Depends(get_current_user)):
    query = db.collection('documents').where('lawyer_id', '==', user['id'])
    if case_id:
        query = query.where('case_id', '==', case_id)
    docs = query.stream()
    return [{"id": d.id, "filename": d.to_dict()['filename'], "case_id": d.to_dict()['case_id'], "uploaded_at": d.to_dict()['uploaded_at']} for d in docs]

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    db.collection('documents').document(doc_id).delete()
    return {"success": True}

@api_router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, user=Depends(get_current_user)):
    doc = db.collection('documents').document(doc_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Document not found")
    data = doc.to_dict()
    from fastapi.responses import Response
    content = base64.b64decode(data['data'])
    return Response(content=content, media_type=data['content_type'], headers={"Content-Disposition": f"attachment; filename={data['filename']}"})

# Dashboard
@api_router.get("/dashboard/stats")
async def get_stats(user=Depends(get_current_user)):
    cases = list(db.collection('cases').where('lawyer_id', '==', user['id']).stream())
    clients = list(db.collection('clients').where('lawyer_id', '==', user['id']).stream())
    
    total = len(cases)
    active = sum(1 for c in cases if c.to_dict().get('case_stage') != 'Closed')
    today = datetime.now(timezone.utc).date().isoformat()
    todays = sum(1 for c in cases if c.to_dict().get('next_hearing_date', '').startswith(today))
    
    return {"total_cases": total, "active_cases": active, "total_clients": len(clients), "todays_hearings": todays, "this_week_hearings": 0, "pending_invoices": 0, "total_revenue": 0}

@api_router.get("/dashboard/recent-activity")
async def get_activity(user=Depends(get_current_user)):
    cases = list(db.collection('cases').where('lawyer_id', '==', user['id']).stream())
    cases_data = [c.to_dict() for c in cases]
    cases_data.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    upcoming = sorted([c for c in cases_data if c.get('next_hearing_date')], key=lambda x: x.get('next_hearing_date', ''))[:5]
    
    return {"recent_cases": cases_data[:5], "upcoming_hearings": upcoming}

# Import Live Consultation Module
from live_consultation import router as live_router
app.include_router(live_router)

# Import Push Notifications Module
from push_notifications import router as notifications_router
app.include_router(notifications_router)

# Import Chat Module
from chat_module import router as chat_router
app.include_router(chat_router)

# Import Call History Module
from call_history import router as calls_router
app.include_router(calls_router)

# Import Admin Panel Module
from admin_panel import router as admin_router
app.include_router(admin_router)

# Client-specific endpoints
@api_router.get("/client/my-cases")
async def get_client_cases(user=Depends(get_current_user)):
    """Get cases assigned to this client"""
    if user.get('user_role') != 'client':
        raise HTTPException(status_code=403, detail="Client access only")
    
    # Find cases where client phone matches
    docs = db.collection('cases').where('client_phone', '==', user['mobile']).stream()
    cases = []
    for doc in docs:
        case_data = doc.to_dict()
        case_data['id'] = doc.id
        # Get lawyer name
        lawyer_doc = db.collection('lawyers').document(case_data.get('lawyer_id', '')).get()
        if lawyer_doc.exists:
            case_data['lawyer_name'] = lawyer_doc.to_dict().get('name', 'Your Lawyer')
        cases.append(case_data)
    # Also return assigned lawyer IDs from cases
    lawyer_ids = list(set(c.get('lawyer_id') for c in cases if c.get('lawyer_id')))
    assigned_lawyer_id = lawyer_ids[0] if lawyer_ids else None
    return {"cases": cases, "assigned_lawyer_id": assigned_lawyer_id}

@api_router.get("/client/my-lawyer")
async def get_client_lawyer(user=Depends(get_current_user)):
    """Get the lawyer assigned to this client via their cases"""
    if user.get('user_role') != 'client':
        raise HTTPException(status_code=403, detail="Client access only")
    
    # Find cases for this client
    case_docs = list(db.collection('cases').where('client_phone', '==', user['mobile']).stream())
    if not case_docs:
        return {"lawyer": None}
    
    # Get the lawyer_id from the first case
    lawyer_id = case_docs[0].to_dict().get('lawyer_id')
    if not lawyer_id:
        return {"lawyer": None}
    
    # Get the lawyer's full profile
    lawyer_doc = db.collection('lawyers').document(lawyer_id).get()
    if not lawyer_doc.exists:
        return {"lawyer": None}
    
    ld = lawyer_doc.to_dict()
    # Check live status
    live_doc = db.collection('live_lawyers').document(lawyer_id).get()
    is_live = live_doc.to_dict().get('is_live', False) if live_doc.exists else False
    
    return {"lawyer": {
        "id": lawyer_id,
        "name": ld.get('name', 'Advocate'),
        "photo_url": ld.get('photo_url'),
        "court": ld.get('court', ''),
        "practice_field": ld.get('practice_field', ''),
        "mobile": ld.get('mobile', ''),
        "is_live": is_live,
        "rate_per_minute": ld.get('rate_per_minute', 30)
    }}

@api_router.get("/client/my-documents")
async def get_client_documents(user=Depends(get_current_user)):
    """Get documents related to client's cases"""
    if user.get('user_role') != 'client':
        raise HTTPException(status_code=403, detail="Client access only")
    
    # Get client's cases first
    case_docs = db.collection('cases').where('client_phone', '==', user['mobile']).stream()
    case_ids = [doc.id for doc in case_docs]
    
    documents = []
    for case_id in case_ids:
        doc_stream = db.collection('documents').where('case_id', '==', case_id).stream()
        for doc in doc_stream:
            doc_data = doc.to_dict()
            doc_data['id'] = doc.id
            documents.append(doc_data)
    
    return {"documents": documents}

@api_router.get("/client/my-hearings")
async def get_client_hearings(user=Depends(get_current_user)):
    """Get upcoming hearings for client"""
    if user.get('user_role') != 'client':
        raise HTTPException(status_code=403, detail="Client access only")
    
    today = datetime.now(timezone.utc).date().isoformat()
    docs = db.collection('cases').where('client_phone', '==', user['mobile']).stream()
    
    hearings = []
    for doc in docs:
        case_data = doc.to_dict()
        if case_data.get('next_hearing_date') and case_data['next_hearing_date'] >= today:
            hearings.append({
                'case_id': doc.id,
                'case_number': case_data.get('case_number'),
                'case_type': case_data.get('case_type'),
                'court_name': case_data.get('court_name'),
                'hearing_date': case_data.get('next_hearing_date'),
                'hearing_time': case_data.get('next_hearing_time', '10:00 AM'),
                'case_stage': case_data.get('case_stage')
            })
    
    hearings.sort(key=lambda x: x['hearing_date'])
    return {"hearings": hearings}

# Asset Recovery Leads
@api_router.post("/asset-recovery/leads")
async def create_asset_lead(data: dict):
    lead_id = str(uuid.uuid4())
    data['id'] = lead_id
    data['status'] = 'new'
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    db.collection('asset_recovery_leads').document(lead_id).set(data)
    return {"success": True, "lead_id": lead_id}

@api_router.get("/asset-recovery/leads")
async def get_asset_leads(user=Depends(get_current_user)):
    if user.get('user_role') != 'lawyer':
        raise HTTPException(status_code=403, detail="Access denied")
    docs = db.collection('asset_recovery_leads').stream()
    return [doc.to_dict() for doc in docs]

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
