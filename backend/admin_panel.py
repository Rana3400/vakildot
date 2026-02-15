# Admin Panel Module - VakilDot
# Complete admin functionality for platform management

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import firestore
import os
import jwt
import uuid

router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])

db = firestore.client()
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'vakildot-secret-key-2024')
ADMIN_EMAILS = os.environ.get('ADMIN_EMAILS', 'admin@vakildot.com').split(',')

# Models
class AdminLogin(BaseModel):
    email: str
    password: str

class LawyerVerification(BaseModel):
    lawyer_id: str
    status: str  # approved, rejected, pending
    notes: Optional[str] = None

class DisputeResolution(BaseModel):
    dispute_id: str
    resolution: str
    action_taken: str  # refund, warning, ban, dismissed
    admin_notes: str

class UserAction(BaseModel):
    user_id: str
    action: str  # ban, unban, warn, verify
    reason: Optional[str] = None

# Admin Authentication
def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=['HS256'])
        if not payload.get('is_admin'):
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid admin token")

# Admin Login
@router.post("/login")
async def admin_login(data: AdminLogin):
    """Admin login with email/password"""
    # Check if email is in admin list
    if data.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=401, detail="Not authorized as admin")
    
    # Simple password check (in production, use proper hashing)
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    if data.password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    token = jwt.encode({
        'email': data.email,
        'is_admin': True,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }, JWT_SECRET, algorithm='HS256')
    
    return {"success": True, "token": token, "email": data.email}

# Dashboard Stats
@router.get("/dashboard")
async def get_dashboard_stats(admin=Depends(verify_admin)):
    """Get admin dashboard statistics"""
    try:
        # Users
        lawyers = list(db.collection('lawyers').where('user_role', '==', 'lawyer').stream())
        clients = list(db.collection('lawyers').where('user_role', '==', 'client').stream())
        pending_verification = [l for l in lawyers if l.to_dict().get('verification_status') == 'pending']
        
        # Calls
        calls = list(db.collection('call_history').stream())
        total_revenue = sum(c.to_dict().get('total_amount', 0) for c in calls)
        platform_earnings = sum(c.to_dict().get('platform_share', 0) for c in calls)
        
        # Today's stats
        today = datetime.now(timezone.utc).date().isoformat()
        today_calls = [c for c in calls if c.to_dict().get('start_time', '').startswith(today)]
        today_revenue = sum(c.to_dict().get('total_amount', 0) for c in today_calls)
        
        # This week's stats
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        week_calls = [c for c in calls if c.to_dict().get('start_time', '') >= week_ago]
        
        # Disputes
        disputes = list(db.collection('disputes').where('status', '==', 'pending').stream())
        
        # Asset Recovery Leads
        leads = list(db.collection('asset_recovery_leads').stream())
        new_leads = [l for l in leads if l.to_dict().get('status') == 'new']
        
        return {
            "users": {
                "total_lawyers": len(lawyers),
                "total_clients": len(clients),
                "pending_verification": len(pending_verification)
            },
            "revenue": {
                "total_revenue": round(total_revenue, 2),
                "platform_earnings": round(platform_earnings, 2),
                "today_revenue": round(today_revenue, 2)
            },
            "calls": {
                "total_calls": len(calls),
                "today_calls": len(today_calls),
                "week_calls": len(week_calls)
            },
            "disputes": {
                "pending": len(disputes)
            },
            "leads": {
                "total": len(leads),
                "new": len(new_leads)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# User Management
@router.get("/users")
async def get_all_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin=Depends(verify_admin)
):
    """Get all users with filtering"""
    try:
        query = db.collection('lawyers')
        
        if role:
            query = query.where('user_role', '==', role)
        
        docs = list(query.stream())
        
        if status:
            docs = [d for d in docs if d.to_dict().get('verification_status') == status or 
                    (status == 'active' and not d.to_dict().get('is_banned'))]
        
        users = []
        for doc in docs[offset:offset+limit]:
            user_data = doc.to_dict()
            user_data['id'] = doc.id
            # Remove sensitive data
            user_data.pop('password', None)
            users.append(user_data)
        
        return {"users": users, "total": len(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, admin=Depends(verify_admin)):
    """Get detailed user information"""
    try:
        doc = db.collection('lawyers').document(user_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = doc.to_dict()
        user_data['id'] = doc.id
        
        # Get user's call history
        if user_data.get('user_role') == 'lawyer':
            calls = list(db.collection('call_history').where('lawyer_id', '==', user_id).stream())
        else:
            calls = list(db.collection('call_history').where('client_id', '==', user_id).stream())
        
        user_data['total_calls'] = len(calls)
        user_data['total_minutes'] = sum(c.to_dict().get('duration_minutes', 0) for c in calls)
        
        if user_data.get('user_role') == 'lawyer':
            user_data['total_earnings'] = sum(c.to_dict().get('lawyer_share', 0) for c in calls)
        else:
            user_data['total_spent'] = sum(c.to_dict().get('total_amount', 0) for c in calls)
        
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/action")
async def perform_user_action(data: UserAction, admin=Depends(verify_admin)):
    """Perform action on a user (ban, unban, verify, warn)"""
    try:
        doc = db.collection('lawyers').document(data.user_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.action == 'ban':
            update_data['is_banned'] = True
            update_data['ban_reason'] = data.reason
            update_data['banned_at'] = datetime.now(timezone.utc).isoformat()
        elif data.action == 'unban':
            update_data['is_banned'] = False
            update_data['ban_reason'] = None
        elif data.action == 'verify':
            update_data['verification_status'] = 'approved'
            update_data['is_verified'] = True
            update_data['verified_at'] = datetime.now(timezone.utc).isoformat()
        elif data.action == 'warn':
            # Add warning to user's record
            warnings = doc.to_dict().get('warnings', [])
            warnings.append({
                "reason": data.reason,
                "date": datetime.now(timezone.utc).isoformat()
            })
            update_data['warnings'] = warnings
        
        db.collection('lawyers').document(data.user_id).update(update_data)
        
        # Log admin action
        db.collection('admin_logs').document(str(uuid.uuid4())).set({
            "admin_email": admin.get('email'),
            "action": data.action,
            "target_user_id": data.user_id,
            "reason": data.reason,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"success": True, "message": f"Action '{data.action}' performed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Lawyer Verification
@router.get("/verification/pending")
async def get_pending_verifications(admin=Depends(verify_admin)):
    """Get lawyers pending verification"""
    try:
        docs = db.collection('lawyers').where('user_role', '==', 'lawyer').where('verification_status', '==', 'pending').stream()
        lawyers = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            lawyers.append(data)
        return {"lawyers": lawyers, "total": len(lawyers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verification/update")
async def update_verification(data: LawyerVerification, admin=Depends(verify_admin)):
    """Approve or reject lawyer verification"""
    try:
        update_data = {
            "verification_status": data.status,
            "verification_notes": data.notes,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_by": admin.get('email')
        }
        
        if data.status == 'approved':
            update_data['is_verified'] = True
        
        db.collection('lawyers').document(data.lawyer_id).update(update_data)
        
        # Log action
        db.collection('admin_logs').document(str(uuid.uuid4())).set({
            "admin_email": admin.get('email'),
            "action": f"verification_{data.status}",
            "target_user_id": data.lawyer_id,
            "notes": data.notes,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"success": True, "message": f"Lawyer verification {data.status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Transactions
@router.get("/transactions")
async def get_all_transactions(
    limit: int = 50,
    offset: int = 0,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin=Depends(verify_admin)
):
    """Get all transactions"""
    try:
        query = db.collection('call_history')
        docs = list(query.stream())
        
        # Filter by date
        if date_from:
            docs = [d for d in docs if d.to_dict().get('start_time', '') >= date_from]
        if date_to:
            docs = [d for d in docs if d.to_dict().get('start_time', '') <= date_to]
        
        # Sort by date descending
        docs.sort(key=lambda x: x.to_dict().get('start_time', ''), reverse=True)
        
        transactions = []
        for doc in docs[offset:offset+limit]:
            data = doc.to_dict()
            transactions.append({
                "session_id": data.get('session_id'),
                "client_name": data.get('client_name'),
                "lawyer_name": data.get('lawyer_name'),
                "duration_minutes": data.get('duration_minutes'),
                "total_amount": data.get('total_amount'),
                "lawyer_share": data.get('lawyer_share'),
                "platform_share": data.get('platform_share'),
                "date": data.get('start_time')
            })
        
        total_revenue = sum(d.to_dict().get('total_amount', 0) for d in docs)
        platform_earnings = sum(d.to_dict().get('platform_share', 0) for d in docs)
        
        return {
            "transactions": transactions,
            "total": len(docs),
            "total_revenue": round(total_revenue, 2),
            "platform_earnings": round(platform_earnings, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Disputes
@router.get("/disputes")
async def get_disputes(status: Optional[str] = None, admin=Depends(verify_admin)):
    """Get all disputes"""
    try:
        query = db.collection('disputes')
        if status:
            query = query.where('status', '==', status)
        
        docs = query.stream()
        disputes = [doc.to_dict() for doc in docs]
        return {"disputes": disputes, "total": len(disputes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disputes/create")
async def create_dispute(
    session_id: str,
    complainant_id: str,
    complaint_type: str,
    description: str
):
    """Create a new dispute/complaint"""
    try:
        dispute_id = str(uuid.uuid4())
        dispute_doc = {
            "id": dispute_id,
            "session_id": session_id,
            "complainant_id": complainant_id,
            "complaint_type": complaint_type,
            "description": description,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.collection('disputes').document(dispute_id).set(dispute_doc)
        return {"success": True, "dispute_id": dispute_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disputes/resolve")
async def resolve_dispute(data: DisputeResolution, admin=Depends(verify_admin)):
    """Resolve a dispute"""
    try:
        update_data = {
            "status": "resolved",
            "resolution": data.resolution,
            "action_taken": data.action_taken,
            "admin_notes": data.admin_notes,
            "resolved_by": admin.get('email'),
            "resolved_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.collection('disputes').document(data.dispute_id).update(update_data)
        
        # If action is refund, process refund
        if data.action_taken == 'refund':
            dispute = db.collection('disputes').document(data.dispute_id).get().to_dict()
            # Add refund logic here
        
        # If action is ban, ban the user
        if data.action_taken == 'ban':
            # Get the other party and ban them
            pass
        
        return {"success": True, "message": "Dispute resolved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Asset Recovery Leads
@router.get("/leads")
async def get_asset_leads(status: Optional[str] = None, admin=Depends(verify_admin)):
    """Get asset recovery leads"""
    try:
        query = db.collection('asset_recovery_leads')
        if status:
            query = query.where('status', '==', status)
        
        docs = query.stream()
        leads = [doc.to_dict() for doc in docs]
        return {"leads": leads, "total": len(leads)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/leads/{lead_id}/update-status")
async def update_lead_status(lead_id: str, status: str, notes: Optional[str] = None, admin=Depends(verify_admin)):
    """Update lead status"""
    try:
        update_data = {
            "status": status,
            "admin_notes": notes,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get('email')
        }
        db.collection('asset_recovery_leads').document(lead_id).update(update_data)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin Logs
@router.get("/logs")
async def get_admin_logs(limit: int = 100, admin=Depends(verify_admin)):
    """Get admin activity logs"""
    try:
        docs = db.collection('admin_logs').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit).stream()
        logs = [doc.to_dict() for doc in docs]
        return {"logs": logs}
    except Exception as e:
        return {"logs": []}

# Reports
@router.get("/reports/revenue")
async def get_revenue_report(period: str = "month", admin=Depends(verify_admin)):
    """Get revenue report"""
    try:
        if period == "week":
            start_date = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        elif period == "month":
            start_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        elif period == "year":
            start_date = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
        else:
            start_date = "2020-01-01"
        
        docs = list(db.collection('call_history').stream())
        docs = [d for d in docs if d.to_dict().get('start_time', '') >= start_date]
        
        # Group by date
        daily_revenue = {}
        for doc in docs:
            data = doc.to_dict()
            date = data.get('start_time', '')[:10]
            if date not in daily_revenue:
                daily_revenue[date] = {"revenue": 0, "calls": 0, "platform_share": 0}
            daily_revenue[date]["revenue"] += data.get('total_amount', 0)
            daily_revenue[date]["calls"] += 1
            daily_revenue[date]["platform_share"] += data.get('platform_share', 0)
        
        return {
            "period": period,
            "daily_data": daily_revenue,
            "total_revenue": sum(d.to_dict().get('total_amount', 0) for d in docs),
            "total_calls": len(docs),
            "platform_earnings": sum(d.to_dict().get('platform_share', 0) for d in docs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
