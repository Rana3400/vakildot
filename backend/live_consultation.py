# Live Consultation Module - VakilDot
# Handles: Wallet, Billing, Agora Tokens, Live Status, Razorpay

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import time
import hashlib
import hmac
import struct
import json
import firebase_admin
from firebase_admin import firestore
import razorpay

router = APIRouter(prefix="/api/live", tags=["Live Consultation"])

# Firestore
db = firestore.client()

# Supabase setup for wallet
from supabase import create_client
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

# Agora credentials
AGORA_APP_ID = os.environ.get('AGORA_APP_ID', '')
AGORA_APP_CERTIFICATE = os.environ.get('AGORA_APP_CERTIFICATE', '')

# Razorpay credentials
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

# Models
class WalletRecharge(BaseModel):
    user_id: str
    amount: float

class StartSession(BaseModel):
    client_id: str
    lawyer_id: str
    channel_name: str

class LawyerStatus(BaseModel):
    lawyer_id: str
    is_live: bool
    rate_per_minute: float = 30.0
    name: Optional[str] = None
    photo_url: Optional[str] = None
    court: Optional[str] = None
    specialization: Optional[str] = None

# ============= LIVE STATUS ENDPOINTS =============

@router.post("/status/go-live")
async def go_live(data: LawyerStatus):
    """Toggle lawyer's live status - PERSISTENT"""
    try:
        # Always fetch latest profile photo from lawyers collection
        photo_url = data.photo_url
        lawyer_name = data.name
        lawyer_court = data.court
        try:
            lawyer_doc = db.collection('lawyers').document(data.lawyer_id).get()
            if lawyer_doc.exists:
                ld = lawyer_doc.to_dict()
                photo_url = ld.get('photo_url') or data.photo_url
                lawyer_name = ld.get('name') or data.name
                lawyer_court = ld.get('court') or data.court
        except Exception:
            pass

        live_data = {
            "lawyer_id": data.lawyer_id,
            "is_live": data.is_live,
            "rate_per_minute": data.rate_per_minute,
            "name": lawyer_name,
            "photo_url": photo_url,
            "court": lawyer_court,
            "specialization": data.specialization,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to Firestore for persistence (creates if doesn't exist)
        db.collection('live_lawyers').document(data.lawyer_id).set(live_data, merge=True)
        
        # Check if lawyer exists before updating
        lawyer_ref = db.collection('lawyers').document(data.lawyer_id)
        lawyer_doc = lawyer_ref.get()
        
        if lawyer_doc.exists:
            lawyer_ref.update({
                "is_live": data.is_live,
                "rate_per_minute": data.rate_per_minute,
                "last_live_toggle": datetime.now(timezone.utc).isoformat()
            })
        else:
            # Create minimal lawyer entry if doesn't exist
            lawyer_ref.set({
                "id": data.lawyer_id,
                "name": data.name,
                "is_live": data.is_live,
                "rate_per_minute": data.rate_per_minute,
                "court": data.court,
                "photo_url": data.photo_url,
                "practice_field": data.specialization,
                "created_at": datetime.now(timezone.utc).isoformat()
            }, merge=True)
        
        return {
            "success": True,
            "is_live": data.is_live,
            "message": "You are now LIVE!" if data.is_live else "You are now offline"
        }
    except Exception as e:
        print(f"Go Live Error: {e}")
        return {"success": False, "error": str(e)}

@router.get("/status/{lawyer_id}")
async def get_live_status(lawyer_id: str):
    """Get lawyer's current live status"""
    try:
        doc = db.collection('live_lawyers').document(lawyer_id).get()
        if doc.exists:
            data = doc.to_dict()
            return {
                "is_live": data.get('is_live', False),
                "rate_per_minute": data.get('rate_per_minute', 30),
                "last_updated": data.get('updated_at')
            }
        return {"is_live": False, "rate_per_minute": 30}
    except:
        return {"is_live": False, "rate_per_minute": 30}

@router.get("/lawyers/live")
async def get_live_lawyers(state: Optional[str] = None, court: Optional[str] = None):
    """Get all LIVE lawyers from database with photo support"""
    try:
        # First try to get from Firestore live_lawyers collection
        live_docs = db.collection('live_lawyers').where('is_live', '==', True).stream()
        live_lawyers = []
        
        for doc in live_docs:
            data = doc.to_dict()
            # Get full profile from lawyers collection
            lawyer_doc = db.collection('lawyers').document(data['lawyer_id']).get()
            if lawyer_doc.exists:
                lawyer_data = lawyer_doc.to_dict()
                lawyer_info = {
                    "id": data['lawyer_id'],
                    "name": lawyer_data.get('name', data.get('name', 'Advocate')),
                    "profile_photo": lawyer_data.get('photo_url') or data.get('photo_url'),
                    "photo_url": lawyer_data.get('photo_url') or data.get('photo_url'),
                    "rate_per_minute": data.get('rate_per_minute', 30),
                    "specialization": lawyer_data.get('practice_field', data.get('specialization', 'Legal')),
                    "state": lawyer_data.get('state', ''),
                    "court": lawyer_data.get('court', data.get('court', '')),
                    "is_verified": lawyer_data.get('is_verified', True),
                    "is_live": True,
                    "rating": lawyer_data.get('average_rating', 4.5),
                    "total_consultations": lawyer_data.get('total_consultations', 0)
                }
                live_lawyers.append(lawyer_info)
        
        # If no live lawyers from DB, return demo data
        if not live_lawyers:
            live_lawyers = [
                {
                    "id": "lawyer1",
                    "name": "Adv. Rajesh Kumar",
                    "profile_photo": None,
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
                    "profile_photo": None,
                    "rate_per_minute": 50,
                    "specialization": "Family Law",
                    "state": "Delhi",
                    "court": "Delhi High Court",
                    "is_verified": True,
                    "is_live": True,
                    "rating": 4.9,
                    "total_consultations": 243
                },
                {
                    "id": "lawyer3",
                    "name": "Adv. Amit Singh",
                    "profile_photo": None,
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
                    "profile_photo": None,
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
            live_lawyers = [l for l in live_lawyers if l.get('state', '').lower() == state.lower()]
        
        # Filter by court
        if court:
            live_lawyers = [l for l in live_lawyers if court.lower() in l.get('court', '').lower()]
        
        return {"lawyers": live_lawyers, "total": len(live_lawyers)}
    except Exception as e:
        print(f"Get Live Lawyers Error: {e}")
        # Return demo data on error
        return {"lawyers": [], "total": 0, "error": str(e)}

# ============= WALLET ENDPOINTS =============

@router.get("/wallet/{user_id}")
async def get_wallet(user_id: str):
    """Get user wallet balance"""
    if not supabase:
        return {"balance": 500.0, "currency": "INR", "user_id": user_id}
    
    try:
        result = supabase.table('wallets').select('*').eq('user_id', user_id).execute()
        if result.data:
            return result.data[0]
        new_wallet = {"user_id": user_id, "balance": 0.0, "currency": "INR"}
        supabase.table('wallets').insert(new_wallet).execute()
        return new_wallet
    except Exception as e:
        return {"balance": 0.0, "currency": "INR", "user_id": user_id}

@router.post("/wallet/recharge")
async def recharge_wallet(data: WalletRecharge):
    """Add funds to wallet (Dummy mode)"""
    if not supabase:
        return {"success": True, "new_balance": data.amount, "message": "Dummy recharge successful"}
    
    try:
        result = supabase.table('wallets').select('balance').eq('user_id', data.user_id).execute()
        
        if result.data:
            current_balance = result.data[0]['balance']
            new_balance = current_balance + data.amount
            supabase.table('wallets').update({'balance': new_balance}).eq('user_id', data.user_id).execute()
        else:
            new_balance = data.amount
            supabase.table('wallets').insert({
                'user_id': data.user_id,
                'balance': new_balance,
                'currency': 'INR'
            }).execute()
        
        return {"success": True, "new_balance": new_balance}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/wallet/deduct")
async def deduct_from_wallet(user_id: str, amount: float, lawyer_id: str, session_id: str):
    """Deduct from wallet with 80/20 split"""
    lawyer_share = amount * 0.80
    platform_share = amount * 0.20
    
    if not supabase:
        return {
            "success": True,
            "deducted": amount,
            "lawyer_share": lawyer_share,
            "platform_share": platform_share
        }
    
    try:
        result = supabase.table('wallets').select('balance').eq('user_id', user_id).execute()
        
        if not result.data or result.data[0]['balance'] < amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        current_balance = result.data[0]['balance']
        new_balance = current_balance - amount
        
        supabase.table('wallets').update({'balance': new_balance}).eq('user_id', user_id).execute()
        
        # Record billing
        supabase.table('billing_history').insert({
            'session_id': session_id,
            'client_id': user_id,
            'lawyer_id': lawyer_id,
            'total_amount': amount,
            'lawyer_share': lawyer_share,
            'platform_share': platform_share,
            'created_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {
            "success": True,
            "new_balance": new_balance,
            "deducted": amount,
            "lawyer_share": lawyer_share,
            "platform_share": platform_share
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============= SESSION ENDPOINTS =============

@router.post("/session/start")
async def start_session(data: StartSession):
    """Start a consultation session"""
    session_id = f"session_{int(time.time())}_{data.client_id[:8]}"
    
    return {
        "success": True,
        "session_id": session_id,
        "channel_name": data.channel_name,
        "agora_app_id": AGORA_APP_ID,
        "message": "Session started"
    }

@router.get("/agora-token")
async def get_agora_token(channel_name: str, uid: int = 0):
    """Get Agora credentials with RTC token"""
    if not AGORA_APP_ID or not AGORA_APP_CERTIFICATE:
        return {"error": "Agora not configured", "app_id": AGORA_APP_ID}
    
    try:
        token = build_agora_token(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channel_name, uid)
        return {
            "app_id": AGORA_APP_ID,
            "channel": channel_name,
            "uid": uid,
            "token": token
        }
    except Exception as e:
        print(f"Agora token error: {e}")
        return {
            "app_id": AGORA_APP_ID,
            "channel": channel_name,
            "uid": uid,
            "token": None,
            "error": str(e)
        }

def build_agora_token(app_id, app_certificate, channel_name, uid, expiry_seconds=3600):
    """Build Agora RTC token using HMAC"""
    ts = int(time.time()) + expiry_seconds
    salt = int(time.time())
    
    msg = f"{app_id}{channel_name}{uid}{ts}{salt}"
    signature = hmac.new(
        app_certificate.encode('utf-8'),
        msg.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"006{app_id}{signature}{ts}{salt}{uid}"

# ============= RAZORPAY ENDPOINTS =============

class RazorpayOrder(BaseModel):
    amount: float
    user_id: str

class RazorpayVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: str
    amount: float

@router.post("/razorpay/create-order")
async def create_razorpay_order(data: RazorpayOrder):
    """Create a Razorpay order for wallet recharge"""
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    try:
        amount_paise = int(data.amount * 100)
        order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"wallet_{data.user_id[:20]}_{int(time.time())}",
            "payment_capture": 1
        })
        
        return {
            "success": True,
            "order_id": order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        print(f"Razorpay order error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@router.post("/razorpay/verify")
async def verify_razorpay_payment(data: RazorpayVerify):
    """Verify Razorpay payment and credit wallet"""
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    try:
        # Verify signature
        params = {
            'razorpay_order_id': data.razorpay_order_id,
            'razorpay_payment_id': data.razorpay_payment_id,
            'razorpay_signature': data.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params)
        
        # Payment verified - credit wallet
        if supabase:
            result = supabase.table('wallets').select('balance').eq('user_id', data.user_id).execute()
            if result.data:
                current_balance = result.data[0]['balance']
                new_balance = current_balance + data.amount
                supabase.table('wallets').update({'balance': new_balance}).eq('user_id', data.user_id).execute()
            else:
                new_balance = data.amount
                supabase.table('wallets').insert({
                    'user_id': data.user_id,
                    'balance': new_balance,
                    'currency': 'INR'
                }).execute()
            
            # Record transaction
            supabase.table('billing_history').insert({
                'session_id': f"recharge_{data.razorpay_payment_id}",
                'client_id': data.user_id,
                'lawyer_id': 'system',
                'total_amount': data.amount,
                'lawyer_share': 0,
                'platform_share': 0,
                'created_at': datetime.now(timezone.utc).isoformat()
            }).execute()
        else:
            new_balance = data.amount
        
        return {
            "success": True,
            "payment_id": data.razorpay_payment_id,
            "new_balance": new_balance,
            "amount_credited": data.amount,
            "message": "Payment verified and wallet credited"
        }
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed - invalid signature")
    except Exception as e:
        print(f"Razorpay verify error: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

# ============= FILTERS =============

@router.get("/filters/states")
async def get_states():
    """Get list of Indian states"""
    states = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
        "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal"
    ]
    return {"states": states}

@router.get("/filters/courts/{state}")
async def get_courts(state: str):
    """Get courts for a state"""
    high_courts = {
        "Delhi": ["Delhi High Court", "Patiala House Court", "Tis Hazari Court", "Saket Court", "Rohini Court"],
        "Maharashtra": ["Bombay High Court", "Mumbai City Civil Court", "Pune District Court"],
        "Karnataka": ["Karnataka High Court", "Bangalore City Civil Court"],
        "Tamil Nadu": ["Madras High Court", "Chennai District Court"],
        "Gujarat": ["Gujarat High Court", "Ahmedabad City Civil Court"],
        "Punjab": ["Punjab & Haryana High Court", "Chandigarh District Court"],
        "West Bengal": ["Calcutta High Court", "Kolkata City Civil Court"],
        "Uttar Pradesh": ["Allahabad High Court", "Lucknow Bench"],
        "Rajasthan": ["Rajasthan High Court", "Jaipur District Court"],
        "Telangana": ["Telangana High Court", "Hyderabad City Civil Court"],
        "Kerala": ["Kerala High Court", "Ernakulam District Court"],
    }
    
    default_courts = [
        f"{state} High Court",
        f"{state} District Court",
        "Sessions Court",
        "Magistrate Court",
        "Family Court",
        "Consumer Forum",
        "Labour Court"
    ]
    
    return {"courts": high_courts.get(state, default_courts)}
