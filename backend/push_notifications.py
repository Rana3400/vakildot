# Push Notifications Module - VakilDot
# Firebase Cloud Messaging (FCM) for push notifications

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import messaging, firestore
import os
import uuid

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

db = firestore.client()

# Models
class FCMToken(BaseModel):
    user_id: str
    token: str
    device_type: str = "web"  # web, android, ios

class NotificationPayload(BaseModel):
    title: str
    body: str
    data: Optional[dict] = {}
    image_url: Optional[str] = None

class ScheduledNotification(BaseModel):
    user_id: str
    title: str
    body: str
    scheduled_time: str  # ISO format
    notification_type: str  # hearing_reminder, payment, lawyer_online, message

# 🔔 NEW: Incoming Call Model
class IncomingCallNotification(BaseModel):
    lawyer_id: str
    client_id: str
    client_name: str
    session_id: str
    channel_name: str

# Store FCM Token
@router.post("/register-token")
async def register_fcm_token(data: FCMToken):
    """Register user's FCM token for push notifications"""
    try:
        token_doc = {
            "user_id": data.user_id,
            "token": data.token,
            "device_type": data.device_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        
        # Check if token already exists
        existing = list(db.collection('fcm_tokens').where('token', '==', data.token).limit(1).stream())
        if existing:
            db.collection('fcm_tokens').document(existing[0].id).update(token_doc)
        else:
            db.collection('fcm_tokens').document(str(uuid.uuid4())).set(token_doc)
        
        return {"success": True, "message": "Token registered"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Get user's FCM tokens
def get_user_tokens(user_id: str) -> List[str]:
    """Get all FCM tokens for a user"""
    tokens = []
    try:
        docs = db.collection('fcm_tokens').where('user_id', '==', user_id).where('is_active', '==', True).stream()
        tokens = [doc.to_dict()['token'] for doc in docs]
    except:
        pass
    return tokens

# Send Push Notification
@router.post("/send")
async def send_notification(user_id: str, payload: NotificationPayload):
    """Send push notification to a specific user"""
    tokens = get_user_tokens(user_id)
    
    if not tokens:
        return {"success": False, "message": "No active tokens for user"}
    
    try:
        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(
                title=payload.title,
                body=payload.body,
                image=payload.image_url
            ),
            data=payload.data or {},
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/logo192.png",
                    badge="/badge.png"
                )
            )
        )
        
        response = messaging.send_multicast(message)
        
        # Log notification
        db.collection('notification_logs').document(str(uuid.uuid4())).set({
            "user_id": user_id,
            "title": payload.title,
            "body": payload.body,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "success_count": response.success_count,
            "failure_count": response.failure_count
        })
        
        return {
            "success": True,
            "sent": response.success_count,
            "failed": response.failure_count
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Send to Multiple Users
@router.post("/send-bulk")
async def send_bulk_notification(user_ids: List[str], payload: NotificationPayload):
    """Send notification to multiple users"""
    all_tokens = []
    for user_id in user_ids:
        all_tokens.extend(get_user_tokens(user_id))
    
    if not all_tokens:
        return {"success": False, "message": "No tokens found"}
    
    # FCM allows max 500 tokens per request
    batches = [all_tokens[i:i+500] for i in range(0, len(all_tokens), 500)]
    total_success = 0
    total_failure = 0
    
    for batch in batches:
        try:
            message = messaging.MulticastMessage(
                tokens=batch,
                notification=messaging.Notification(
                    title=payload.title,
                    body=payload.body
                ),
                data=payload.data or {}
            )
            response = messaging.send_multicast(message)
            total_success += response.success_count
            total_failure += response.failure_count
        except:
            total_failure += len(batch)
    
    return {"success": True, "sent": total_success, "failed": total_failure}

# 🔔 NEW: Incoming Call Notification - THE MISSING PIECE!
@router.post("/incoming-call")
async def notify_incoming_call(data: IncomingCallNotification):
    """Notify lawyer of incoming video call consultation"""
    try:
        # ALWAYS store in Firestore for polling (this is the primary mechanism)
        db.collection('call_notifications').document(f"{data.lawyer_id}_active").set({
            "lawyer_id": data.lawyer_id,
            "client_id": data.client_id,
            "client_name": data.client_name,
            "session_id": data.session_id,
            "channel_name": data.channel_name,
            "type": "incoming_call",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print(f"[NOTIFICATION] Stored incoming call for lawyer {data.lawyer_id} from {data.client_name}")
        
        # Also try FCM push notification (bonus - works if token is registered)
        try:
            payload = NotificationPayload(
                title=f"Incoming Call from {data.client_name}",
                body="Tap to accept consultation call",
                data={
                    "type": "incoming_call",
                    "client_id": data.client_id,
                    "client_name": data.client_name,
                    "session_id": data.session_id,
                    "channel_name": data.channel_name
                }
            )
            await send_notification(data.lawyer_id, payload)
        except Exception as fcm_err:
            print(f"[NOTIFICATION] FCM push failed (polling still works): {fcm_err}")
        
        return {"success": True, "message": "Call notification stored"}
    except Exception as e:
        print(f"[NOTIFICATION] Error: {e}")
        return {"success": False, "error": str(e)}

# Notification Types
@router.post("/lawyer-online")
async def notify_lawyer_online(lawyer_id: str, lawyer_name: str):
    """Notify clients when a lawyer goes online"""
    # Get all clients who have consulted with this lawyer before
    try:
        sessions = db.collection('call_history').where('lawyer_id', '==', lawyer_id).stream()
        client_ids = list(set([s.to_dict()['client_id'] for s in sessions]))
        
        if client_ids:
            payload = NotificationPayload(
                title=f"{lawyer_name} is now LIVE!",
                body="Your preferred lawyer is available for consultation. Tap to connect.",
                data={"type": "lawyer_online", "lawyer_id": lawyer_id}
            )
            return await send_bulk_notification(client_ids, payload)
        return {"success": True, "message": "No previous clients to notify"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/hearing-reminder")
async def send_hearing_reminder(case_id: str, client_id: str, case_number: str, hearing_date: str, hearing_time: str, court_name: str):
    """Send hearing reminder notification"""
    payload = NotificationPayload(
        title=f"Hearing Reminder: {case_number}",
        body=f"Your hearing is scheduled for {hearing_date} at {hearing_time} in {court_name}",
        data={"type": "hearing_reminder", "case_id": case_id}
    )
    return await send_notification(client_id, payload)

@router.post("/payment-received")
async def notify_payment_received(lawyer_id: str, amount: float, client_name: str):
    """Notify lawyer of payment received"""
    payload = NotificationPayload(
        title="Payment Received! 💰",
        body=f"₹{amount:.2f} received from {client_name} for consultation",
        data={"type": "payment", "amount": str(amount)}
    )
    return await send_notification(lawyer_id, payload)

@router.post("/new-message")
async def notify_new_message(user_id: str, sender_name: str, message_preview: str):
    """Notify user of new message"""
    payload = NotificationPayload(
        title=f"New message from {sender_name}",
        body=message_preview[:100] + "..." if len(message_preview) > 100 else message_preview,
        data={"type": "message", "sender": sender_name}
    )
    return await send_notification(user_id, payload)

# Schedule Notification (for hearing reminders)
@router.post("/schedule")
async def schedule_notification(data: ScheduledNotification):
    """Schedule a notification for later"""
    try:
        notification_id = str(uuid.uuid4())
        db.collection('scheduled_notifications').document(notification_id).set({
            "id": notification_id,
            "user_id": data.user_id,
            "title": data.title,
            "body": data.body,
            "scheduled_time": data.scheduled_time,
            "notification_type": data.notification_type,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"success": True, "notification_id": notification_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Get User's Notification History
@router.get("/history/{user_id}")
async def get_notification_history(user_id: str, limit: int = 50):
    """Get user's notification history"""
    try:
        docs = db.collection('notification_logs').where('user_id', '==', user_id).order_by('sent_at', direction=firestore.Query.DESCENDING).limit(limit).stream()
        return {"notifications": [doc.to_dict() for doc in docs]}
    except:
        return {"notifications": []}

# Unsubscribe Token
@router.post("/unsubscribe")
async def unsubscribe_token(token: str):
    """Mark a token as inactive"""
    try:
        docs = list(db.collection('fcm_tokens').where('token', '==', token).stream())
        for doc in docs:
            db.collection('fcm_tokens').document(doc.id).update({"is_active": False})
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}