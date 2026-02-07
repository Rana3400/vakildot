from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import os
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List, Optional

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT_DIR, '.env'))

if not firebase_admin._apps:
    service_account_path = os.path.join(ROOT_DIR, "serviceAccountKey.json")
    if not os.path.exists(service_account_path):
        raise RuntimeError("serviceAccountKey.json not found")
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()
app = FastAPI(title="VakilDot API")

origins = os.getenv("MCORS_ORIGINS", "https://vakildot.com").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

class ClientCreate(BaseModel):
    name: str
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = None

@api_router.post("/clients")
async def create_client(client_data: ClientCreate):
    try:
        client_id = str(uuid.uuid4())
        client_dict = client_data.model_dump()
        client_dict.update({"id": client_id, "created_at": datetime.now(timezone.utc).isoformat()})
        db.collection("clients").document(client_id).set(client_dict)
        return {"success": True, "id": client_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/health")
async def health():
    return {"status": "healthy", "database": "firestore", "app": "VakilDot"}

app.include_router(api_router)

@app.get("/")
async def root():
    return {"service": "VakilDot API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)