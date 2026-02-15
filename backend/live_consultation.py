# Live Consultation Module - VakilDot
# Handles: Wallet, Billing, Agora Tokens, Live Status

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import time
import hashlib
import hmac
import base64
import struct

router = APIRouter(prefix="/api/live", tags=["Live Consultation"])

# Supabase setup
from supabase import create_client
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

# Agora credentials
AGORA_APP_ID = os.environ.get('AGORA_APP_ID', '')
AGORA_APP_CERTIFICATE = os.environ.get('AGORA_APP_CERTIFICATE', '')

# Models
class WalletRecharge(BaseModel):
    user_id: str
    amount: float

class StartSession(BaseModel):
    client_id: str
    lawyer_id: str
    channel_name: str

class EndSession(BaseModel):
    session_id: str

class LawyerStatus(BaseModel):
    lawyer_id: str
    is_live: bool
    rate_per_minute: float = 30.0

# Agora Token Generator
def generate_agora_token(channel_name: str, uid: int, role: int = 1, expire_seconds: int = 3600):
    """Generate Agora RTC token"""
    if not AGORA_APP_ID or not AGORA_APP_CERTIFICATE:
        return None
    
    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expire_seconds
    
    # Simple token for testing - in production use agora_token_builder
    token_data = f"{AGORA_APP_ID}{channel_name}{uid}{privilege_expired_ts}"
    signature = hmac.new(
        AGORA_APP_CERTIFICATE.encode(),
        token_data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return f"006{AGORA_APP_ID}{signature}{channel_name}{uid}{privilege_expired_ts}"

# Initialize Supabase tables
async def init_tables():
    """Create tables if not exist"""
    if not supabase:
        return
    
    # Tables are created via Supabase dashboard or migrations
    # This is just for reference
    pass

# Wallet Endpoints
@router.get("/wallet/{user_id}")
async def get_wallet(user_id: str):
    """Get user wallet balance"""
    if not supabase:
        return {"balance": 500.0, "currency": "INR", "user_id": user_id}  # Dummy for testing
    
    try:
        result = supabase.table('wallets').select('*').eq('user_id', user_id).execute()
        if result.data:
            return result.data[0]
        # Create wallet if not exists
        new_wallet = {"user_id": user_id, "balance": 0.0, "currency": "INR"}
        supabase.table('wallets').insert(new_wallet).execute()
        return new_wallet
    except Exception as e:
        return {"balance": 0.0, "currency": "INR", "user_id": user_id, "error": str(e)}

@router.post("/wallet/recharge")
async def recharge_wallet(data: WalletRecharge):
    """Add funds to wallet (Dummy for testing)"""
    if not supabase:
        return {"success": True, "new_balance": data.amount, "message": "Dummy recharge successful"}
    
    try:
        # Get current balance
        result = supabase.table('wallets').select('balance').eq('user_id', data.user_id).execute()
        current_balance = result.data[0]['balance'] if result.data else 0.0
        new_balance = current_balance + data.amount
        
        # Update or insert
        if result.data:
            supabase.table('wallets').update({'balance': new_balance}).eq('user_id', data.user_id).execute()
        else:
            supabase.table('wallets').insert({'user_id': data.user_id, 'balance': new_balance, 'currency': 'INR'}).execute()
        
        # Log transaction
        supabase.table('billing_history').insert({
            'user_id': data.user_id,
            'type': 'recharge',
            'amount': data.amount,
            'balance_after': new_balance,
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {"success": True, "new_balance": new_balance, "amount_added": data.amount}
    except Exception as e:
        return {"success": True, "new_balance": data.amount, "message": f"Dummy mode: {str(e)}"}

@router.post("/wallet/deduct")
async def deduct_wallet(user_id: str, amount: float, description: str = "Consultation fee"):
    """Deduct from wallet with 80/20 split"""
    lawyer_share = amount * 0.80
    platform_share = amount * 0.20
    
    if not supabase:
        return {
            "success": True,
            "deducted": amount,
            "lawyer_share": lawyer_share,
            "platform_share": platform_share,
            "message": "Dummy deduction"
        }
    
    try:
        result = supabase.table('wallets').select('balance').eq('user_id', user_id).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="Wallet not found")
        
        current_balance = result.data[0]['balance']
        if current_balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        new_balance = current_balance - amount
        supabase.table('wallets').update({'balance': new_balance}).eq('user_id', user_id).execute()
        
        # Log billing
        supabase.table('billing_history').insert({
            'user_id': user_id,
            'type': 'consultation',
            'amount': -amount,
            'lawyer_share': lawyer_share,
            'platform_share': platform_share,
            'balance_after': new_balance,
            'description': description,
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {
            "success": True,
            "deducted": amount,
            "new_balance": new_balance,
            "lawyer_share": lawyer_share,
            "platform_share": platform_share
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}

# Agora Token Endpoint
@router.get("/agora-token")
async def get_agora_token(channel: str, uid: int = 0):
    """Generate Agora RTC token for video call"""
    if not AGORA_APP_ID:
        return {"error": "Agora not configured"}
    
    # For testing, return app ID only (token not required in testing mode)
    return {
        "app_id": AGORA_APP_ID,
        "channel": channel,
        "uid": uid,
        "token": None  # Token optional for testing
    }

# Live Status Endpoints
@router.post("/status/go-live")
async def go_live(data: LawyerStatus):
    """Set lawyer as live"""
    return {
        "success": True,
        "lawyer_id": data.lawyer_id,
        "is_live": data.is_live,
        "rate_per_minute": data.rate_per_minute
    }

@router.get("/lawyers/live")
async def get_live_lawyers(state: Optional[str] = None, court: Optional[str] = None):
    """Get all live lawyers with optional filtering"""
    # Dummy data for testing
    live_lawyers = [
        {
            "id": "lawyer1",
            "name": "Adv. Rajesh Kumar",
            "photo": None,
            "rate_per_minute": 30,
            "specialization": "Criminal Law",
            "state": "Punjab",
            "court": "Punjab High Court",
            "is_verified": True,
            "is_live": True,
            "rating": 4.8,
            "total_consultations": 156
        },
        {
            "id": "lawyer2",
            "name": "Adv. Priya Sharma",
            "photo": None,
            "rate_per_minute": 50,
            "specialization": "Family Law",
            "state": "Delhi",
            "court": "Delhi High Court",
            "is_verified": True,
            "is_live": True,
            "is_asset_recovery_expert": True,
            "rating": 4.9,
            "total_consultations": 243
        },
        {
            "id": "lawyer3",
            "name": "Adv. Amit Singh",
            "photo": None,
            "rate_per_minute": 25,
            "specialization": "Property Law",
            "state": "Maharashtra",
            "court": "Bombay High Court",
            "is_verified": True,
            "is_live": True,
            "rating": 4.5,
            "total_consultations": 89
        },
        {
            "id": "lawyer4",
            "name": "Adv. Neha Gupta",
            "photo": None,
            "rate_per_minute": 40,
            "specialization": "Corporate Law",
            "state": "Karnataka",
            "court": "Karnataka High Court",
            "is_verified": True,
            "is_live": True,
            "rating": 4.7,
            "total_consultations": 178
        }
    ]
    
    # Filter by state
    if state:
        live_lawyers = [l for l in live_lawyers if l['state'].lower() == state.lower()]
    
    # Filter by court
    if court:
        live_lawyers = [l for l in live_lawyers if court.lower() in l['court'].lower()]
    
    return {"lawyers": live_lawyers, "total": len(live_lawyers)}

# Session Management
@router.post("/session/start")
async def start_session(data: StartSession):
    """Start a consultation session"""
    session_id = f"session_{int(time.time())}_{data.client_id[:8]}"
    
    return {
        "success": True,
        "session_id": session_id,
        "channel_name": data.channel_name,
        "agora_app_id": AGORA_APP_ID,
        "started_at": datetime.now(timezone.utc).isoformat()
    }

@router.post("/session/end")
async def end_session(data: EndSession):
    """End session and calculate billing"""
    # In production, calculate actual duration and bill
    return {
        "success": True,
        "session_id": data.session_id,
        "ended_at": datetime.now(timezone.utc).isoformat(),
        "total_minutes": 0,
        "total_amount": 0
    }

# Billing History
@router.get("/billing/history/{user_id}")
async def get_billing_history(user_id: str):
    """Get user's billing history"""
    if not supabase:
        return {"history": [], "message": "Dummy mode"}
    
    try:
        result = supabase.table('billing_history').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(50).execute()
        return {"history": result.data or []}
    except:
        return {"history": []}

# States and Courts data
@router.get("/filters/states")
async def get_states():
    """Get list of Indian states"""
    return {
        "states": [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
            "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
            "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
            "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
            "Uttarakhand", "West Bengal"
        ]
    }

@router.get("/filters/courts/{state}")
async def get_courts(state: str):
    """Get courts for a state"""
    high_courts = {
        "Punjab": ["Punjab & Haryana High Court", "District Court Chandigarh", "District Court Ludhiana"],
        "Delhi": ["Delhi High Court", "Tis Hazari Courts", "Saket Courts", "Patiala House Courts"],
        "Maharashtra": ["Bombay High Court", "City Civil Court Mumbai", "District Court Pune"],
        "Karnataka": ["Karnataka High Court", "City Civil Court Bangalore", "District Court Mysore"],
        "Tamil Nadu": ["Madras High Court", "City Civil Court Chennai", "District Court Coimbatore"],
        "Gujarat": ["Gujarat High Court", "City Civil Court Ahmedabad", "District Court Surat"],
        "Uttar Pradesh": ["Allahabad High Court", "District Court Lucknow", "District Court Varanasi"],
        "West Bengal": ["Calcutta High Court", "City Civil Court Kolkata", "District Court Howrah"],
        "Rajasthan": ["Rajasthan High Court", "District Court Jaipur", "District Court Jodhpur"],
        "Telangana": ["Telangana High Court", "City Civil Court Hyderabad", "District Court Secunderabad"],
    }
    
    default_courts = [f"{state} High Court", f"District Court {state}", "Sessions Court", "Civil Court"]
    return {"courts": high_courts.get(state, default_courts)}
