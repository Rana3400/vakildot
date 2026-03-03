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

# Agora credentials
AGORA_APP_ID = os.environ.get('AGORA_APP_ID', '')
AGORA_APP_CERTIFICATE = os.environ.get('AGORA_APP_CERTIFICATE', '')

# Razorpay credentials
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

DEFAULT_RATE = 20  # ₹20 per minute

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
    rate_per_minute: float = 20.0
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
                "rate_per_minute": data.get('rate_per_minute', DEFAULT_RATE),
                "last_updated": data.get('updated_at')
            }
        return {"is_live": False, "rate_per_minute": DEFAULT_RATE}
    except:
        return {"is_live": False, "rate_per_minute": DEFAULT_RATE}

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
                    "rate_per_minute": data.get('rate_per_minute', DEFAULT_RATE),
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
                    "rate_per_minute": DEFAULT_RATE,
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
                    "rate_per_minute": 20,
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
                    "rate_per_minute": 20,
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
                    "rate_per_minute": 20,
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

# ============= WALLET ENDPOINTS (Firestore) =============

@router.get("/wallet/{user_id}")
async def get_wallet(user_id: str):
    """Get user wallet balance from Firestore"""
    try:
        doc = db.collection('wallets').document(user_id).get()
        if doc.exists:
            data = doc.to_dict()
            return {"balance": data.get('balance', 0.0), "currency": "INR", "user_id": user_id}
        return {"balance": 0.0, "currency": "INR", "user_id": user_id}
    except Exception as e:
        print(f"Wallet get error: {e}")
        return {"balance": 0.0, "currency": "INR", "user_id": user_id}

@router.post("/wallet/recharge")
async def recharge_wallet(data: WalletRecharge):
    """Add funds to wallet via Firestore"""
    try:
        doc_ref = db.collection('wallets').document(data.user_id)
        doc = doc_ref.get()
        
        if doc.exists:
            current = doc.to_dict().get('balance', 0.0)
            new_balance = current + data.amount
        else:
            new_balance = data.amount
        
        doc_ref.set({
            'user_id': data.user_id,
            'balance': new_balance,
            'currency': 'INR',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }, merge=True)
        
        # Record transaction
        db.collection('transactions').add({
            'user_id': data.user_id,
            'type': 'recharge',
            'amount': data.amount,
            'balance_after': new_balance,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        return {"success": True, "new_balance": new_balance}
    except Exception as e:
        print(f"Wallet recharge error: {e}")
        return {"success": False, "error": str(e)}

@router.post("/wallet/deduct")
async def deduct_from_wallet(user_id: str, amount: float, lawyer_id: str, session_id: str):
    """Deduct from wallet with 80/20 split - Firestore"""
    lawyer_share = amount * 0.80
    platform_share = amount * 0.20
    
    try:
        doc_ref = db.collection('wallets').document(user_id)
        doc = doc_ref.get()
        
        if not doc.exists or doc.to_dict().get('balance', 0) < amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        current_balance = doc.to_dict()['balance']
        new_balance = current_balance - amount
        
        doc_ref.update({
            'balance': new_balance,
            'updated_at': datetime.now(timezone.utc).isoformat()
        })
        
        # Record billing
        db.collection('billing_history').add({
            'session_id': session_id,
            'client_id': user_id,
            'lawyer_id': lawyer_id,
            'total_amount': amount,
            'lawyer_share': lawyer_share,
            'platform_share': platform_share,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        # Credit lawyer wallet
        lawyer_wallet_ref = db.collection('wallets').document(lawyer_id)
        lawyer_doc = lawyer_wallet_ref.get()
        lawyer_bal = lawyer_doc.to_dict().get('balance', 0) if lawyer_doc.exists else 0
        lawyer_wallet_ref.set({
            'user_id': lawyer_id,
            'balance': lawyer_bal + lawyer_share,
            'currency': 'INR',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }, merge=True)
        
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
        print(f"Wallet deduct error: {e}")
        return {"success": False, "error": str(e)}

@router.get("/billing/history/{user_id}")
async def get_billing_history(user_id: str):
    """Get billing history from Firestore"""
    try:
        docs = list(db.collection('transactions').where('user_id', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING).limit(50).stream())
        history = []
        for doc in docs:
            d = doc.to_dict()
            history.append(d)
        return {"history": history}
    except Exception as e:
        print(f"Billing history error: {e}")
        return {"history": []}

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
        
        # Payment verified - credit wallet in Firestore
        doc_ref = db.collection('wallets').document(data.user_id)
        doc = doc_ref.get()
        
        if doc.exists:
            current_balance = doc.to_dict().get('balance', 0.0)
            new_balance = current_balance + data.amount
        else:
            new_balance = data.amount
        
        doc_ref.set({
            'user_id': data.user_id,
            'balance': new_balance,
            'currency': 'INR',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }, merge=True)
        
        # Record transaction
        db.collection('transactions').add({
            'user_id': data.user_id,
            'type': 'recharge',
            'amount': data.amount,
            'balance_after': new_balance,
            'payment_id': data.razorpay_payment_id,
            'order_id': data.razorpay_order_id,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
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

STATES_AND_UTS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal",
    "Chandigarh", "Delhi", "Jammu & Kashmir", "Ladakh",
    "Puducherry", "Andaman & Nicobar", "Dadra & Nagar Haveli", "Lakshadweep"
]

STATE_COURTS = {
    "Andhra Pradesh": {
        "High Court": ["Andhra Pradesh High Court, Amaravati"],
        "District Courts": ["Visakhapatnam District Court", "Vijayawada District Court", "Guntur District Court", "Tirupati District Court", "Kurnool District Court", "Rajahmundry District Court", "Nellore District Court", "Anantapur District Court", "Kadapa District Court", "Eluru District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Arunachal Pradesh": {
        "High Court": ["Gauhati High Court, Itanagar Bench"],
        "District Courts": ["Itanagar District Court", "Naharlagun District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court"]
    },
    "Assam": {
        "High Court": ["Gauhati High Court, Guwahati"],
        "District Courts": ["Kamrup District Court, Guwahati", "Nagaon District Court", "Dibrugarh District Court", "Jorhat District Court", "Silchar District Court", "Tezpur District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Bihar": {
        "High Court": ["Patna High Court"],
        "District Courts": ["Patna District Court", "Gaya District Court", "Muzaffarpur District Court", "Bhagalpur District Court", "Darbhanga District Court", "Purnia District Court", "Arrah District Court", "Begusarai District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Chhattisgarh": {
        "High Court": ["Chhattisgarh High Court, Bilaspur"],
        "District Courts": ["Raipur District Court", "Bilaspur District Court", "Durg District Court", "Korba District Court", "Jagdalpur District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Consumer Forum"]
    },
    "Chandigarh": {
        "High Court": ["Punjab & Haryana High Court, Chandigarh"],
        "District Courts": ["Chandigarh District Court, Sector 43"],
        "Other Courts": ["Sessions Court, Chandigarh", "Magistrate Court, Chandigarh", "Family Court, Chandigarh", "Consumer Forum, Chandigarh", "Labour Court, Chandigarh"]
    },
    "Delhi": {
        "High Court": ["Delhi High Court"],
        "District Courts": ["Patiala House Court", "Tis Hazari Court", "Saket Court", "Rohini Court", "Karkardooma Court", "Dwarka Court", "New Delhi District Court"],
        "Other Courts": ["Sessions Court", "Metropolitan Magistrate Court", "Family Court", "Consumer Forum", "Labour Court", "Motor Accident Claims Tribunal", "Rent Control Tribunal"]
    },
    "Goa": {
        "High Court": ["Bombay High Court, Goa Bench, Panaji"],
        "District Courts": ["North Goa District Court, Panaji", "South Goa District Court, Margao"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Consumer Forum"]
    },
    "Gujarat": {
        "High Court": ["Gujarat High Court, Ahmedabad"],
        "District Courts": ["Ahmedabad City Civil Court", "Surat District Court", "Vadodara District Court", "Rajkot District Court", "Bhavnagar District Court", "Jamnagar District Court", "Gandhinagar District Court", "Junagadh District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Haryana": {
        "High Court": ["Punjab & Haryana High Court, Chandigarh"],
        "District Courts": ["Gurugram District Court", "Faridabad District Court", "Ambala District Court", "Karnal District Court", "Hisar District Court", "Rohtak District Court", "Panipat District Court", "Sonipat District Court", "Panchkula District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Himachal Pradesh": {
        "High Court": ["Himachal Pradesh High Court, Shimla"],
        "District Courts": ["Shimla District Court", "Kangra District Court, Dharamshala", "Mandi District Court", "Kullu District Court", "Solan District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Consumer Forum"]
    },
    "Jammu & Kashmir": {
        "High Court": ["Jammu & Kashmir High Court, Srinagar", "Jammu & Kashmir High Court, Jammu Wing"],
        "District Courts": ["Srinagar District Court", "Jammu District Court", "Anantnag District Court", "Baramulla District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Consumer Forum"]
    },
    "Jharkhand": {
        "High Court": ["Jharkhand High Court, Ranchi"],
        "District Courts": ["Ranchi District Court", "Jamshedpur District Court", "Dhanbad District Court", "Bokaro District Court", "Hazaribagh District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Consumer Forum"]
    },
    "Karnataka": {
        "High Court": ["Karnataka High Court, Bengaluru", "Karnataka High Court, Dharwad Bench", "Karnataka High Court, Kalaburagi Bench"],
        "District Courts": ["Bengaluru City Civil Court", "Mysuru District Court", "Mangaluru District Court", "Hubli District Court", "Belagavi District Court", "Kalaburagi District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Kerala": {
        "High Court": ["Kerala High Court, Ernakulam"],
        "District Courts": ["Ernakulam District Court", "Thiruvananthapuram District Court", "Kozhikode District Court", "Thrissur District Court", "Kottayam District Court", "Kollam District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Madhya Pradesh": {
        "High Court": ["Madhya Pradesh High Court, Jabalpur", "MP High Court, Gwalior Bench", "MP High Court, Indore Bench"],
        "District Courts": ["Bhopal District Court", "Indore District Court", "Jabalpur District Court", "Gwalior District Court", "Ujjain District Court", "Sagar District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Maharashtra": {
        "High Court": ["Bombay High Court, Mumbai", "Bombay HC, Aurangabad Bench", "Bombay HC, Nagpur Bench"],
        "District Courts": ["Mumbai City Civil Court", "Pune District Court", "Nagpur District Court", "Thane District Court", "Nashik District Court", "Aurangabad District Court", "Kolhapur District Court", "Solapur District Court", "Navi Mumbai District Court"],
        "Other Courts": ["Sessions Court", "Metropolitan Magistrate Court", "Family Court", "Labour Court", "Consumer Forum", "Debt Recovery Tribunal"]
    },
    "Manipur": {
        "High Court": ["Manipur High Court, Imphal"],
        "District Courts": ["Imphal District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court"]
    },
    "Meghalaya": {
        "High Court": ["Meghalaya High Court, Shillong"],
        "District Courts": ["Shillong District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court"]
    },
    "Mizoram": {
        "High Court": ["Gauhati High Court, Aizawl Bench"],
        "District Courts": ["Aizawl District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court"]
    },
    "Nagaland": {
        "High Court": ["Gauhati High Court, Kohima Bench"],
        "District Courts": ["Kohima District Court", "Dimapur District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court"]
    },
    "Odisha": {
        "High Court": ["Orissa High Court, Cuttack"],
        "District Courts": ["Bhubaneswar District Court", "Cuttack District Court", "Berhampur District Court", "Sambalpur District Court", "Rourkela District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Punjab": {
        "High Court": ["Punjab & Haryana High Court, Chandigarh"],
        "District Courts": ["Ludhiana District Court", "Amritsar District Court", "Jalandhar District Court", "Patiala District Court", "Bathinda District Court", "Mohali District Court", "Pathankot District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Rajasthan": {
        "High Court": ["Rajasthan High Court, Jodhpur", "Rajasthan HC, Jaipur Bench"],
        "District Courts": ["Jaipur District Court", "Jodhpur District Court", "Udaipur District Court", "Kota District Court", "Ajmer District Court", "Bikaner District Court", "Alwar District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Sikkim": {
        "High Court": ["Sikkim High Court, Gangtok"],
        "District Courts": ["Gangtok District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court"]
    },
    "Tamil Nadu": {
        "High Court": ["Madras High Court, Chennai", "Madras HC, Madurai Bench"],
        "District Courts": ["Chennai District Court", "Coimbatore District Court", "Madurai District Court", "Tiruchirappalli District Court", "Salem District Court", "Tirunelveli District Court", "Vellore District Court"],
        "Other Courts": ["Sessions Court", "Metropolitan Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Telangana": {
        "High Court": ["Telangana High Court, Hyderabad"],
        "District Courts": ["Hyderabad City Civil Court", "Rangareddy District Court", "Warangal District Court", "Karimnagar District Court", "Nizamabad District Court", "Khammam District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Tripura": {
        "High Court": ["Tripura High Court, Agartala"],
        "District Courts": ["Agartala District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court"]
    },
    "Uttar Pradesh": {
        "High Court": ["Allahabad High Court", "Allahabad HC, Lucknow Bench"],
        "District Courts": ["Lucknow District Court", "Allahabad District Court", "Varanasi District Court", "Kanpur District Court", "Agra District Court", "Meerut District Court", "Ghaziabad District Court", "Noida District Court", "Bareilly District Court", "Gorakhpur District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Labour Court", "Consumer Forum", "Revenue Court"]
    },
    "Uttarakhand": {
        "High Court": ["Uttarakhand High Court, Nainital"],
        "District Courts": ["Dehradun District Court", "Haridwar District Court", "Nainital District Court", "Haldwani District Court", "Roorkee District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Consumer Forum"]
    },
    "West Bengal": {
        "High Court": ["Calcutta High Court, Kolkata", "Calcutta HC, Jalpaiguri Circuit Bench"],
        "District Courts": ["Kolkata City Civil Court", "Howrah District Court", "North 24 Parganas District Court", "South 24 Parganas District Court", "Hooghly District Court", "Siliguri District Court", "Asansol District Court"],
        "Other Courts": ["Sessions Court", "Metropolitan Magistrate Court", "Family Court", "Labour Court", "Consumer Forum"]
    },
    "Puducherry": {
        "High Court": ["Madras High Court (Puducherry jurisdiction)"],
        "District Courts": ["Puducherry District Court"],
        "Other Courts": ["Sessions Court", "Magistrate Court"]
    },
    "Ladakh": {
        "High Court": ["Jammu & Kashmir High Court"],
        "District Courts": ["Leh District Court", "Kargil District Court"],
        "Other Courts": ["Magistrate Court"]
    },
}

# Supreme Court (separate - not state specific)
NATIONAL_COURTS = ["Supreme Court of India", "National Company Law Tribunal (NCLT)", "National Green Tribunal (NGT)", "Armed Forces Tribunal", "Income Tax Appellate Tribunal", "Customs, Excise & Service Tax Appellate Tribunal"]

@router.get("/filters/states")
async def get_states():
    """Get list of all Indian states and UTs"""
    return {"states": sorted(STATES_AND_UTS)}

@router.get("/filters/courts/{state}")
async def get_courts(state: str):
    """Get all courts for a specific state - organized by type"""
    if state == "National":
        return {"courts": NATIONAL_COURTS, "grouped": {"National Courts": NATIONAL_COURTS}}
    
    state_data = STATE_COURTS.get(state)
    if state_data:
        all_courts = []
        for court_type, courts in state_data.items():
            all_courts.extend(courts)
        return {"courts": all_courts, "grouped": state_data}
    
    # Fallback for states not explicitly listed
    return {
        "courts": [
            f"{state} High Court",
            f"{state} District Court",
            "Sessions Court",
            "Magistrate Court",
            "Family Court",
            "Consumer Forum",
            "Labour Court"
        ],
        "grouped": {
            "High Court": [f"{state} High Court"],
            "District Courts": [f"{state} District Court"],
            "Other Courts": ["Sessions Court", "Magistrate Court", "Family Court", "Consumer Forum", "Labour Court"]
        }
    }
