# Call History & Recording Module - VakilDot
# Handles: Call logs, chat transcripts, and Agora cloud recording

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import firestore
import os
import uuid
import httpx

router = APIRouter(prefix="/api/calls", tags=["Call History"])

db = firestore.client()

# Agora Recording credentials
AGORA_APP_ID = os.environ.get('AGORA_APP_ID', '')
AGORA_APP_CERTIFICATE = os.environ.get('AGORA_APP_CERTIFICATE', '')
AGORA_CUSTOMER_ID = os.environ.get('AGORA_CUSTOMER_ID', '')
AGORA_CUSTOMER_SECRET = os.environ.get('AGORA_CUSTOMER_SECRET', '')

# Models
class CallRecord(BaseModel):
    session_id: str
    client_id: str
    client_name: str
    lawyer_id: str
    lawyer_name: str
    channel_name: str
    start_time: str
    end_time: Optional[str] = None
    duration_seconds: int = 0
    duration_minutes: int = 0
    total_amount: float = 0.0
    rate_per_minute: float = 0.0
    lawyer_share: float = 0.0
    platform_share: float = 0.0
    recording_url: Optional[str] = None
    recording_status: str = "none"  # none, recording, completed, failed
    call_status: str = "completed"  # completed, missed, cancelled

class StartRecording(BaseModel):
    session_id: str
    channel_name: str

class CallRating(BaseModel):
    session_id: str
    rating: int  # 1-5
    feedback: Optional[str] = None
    rated_by: str  # client_id or lawyer_id

# Start a Call Session (creates record)
@router.post("/start")
async def start_call_session(
    session_id: str,
    client_id: str,
    client_name: str,
    lawyer_id: str,
    lawyer_name: str,
    channel_name: str,
    rate_per_minute: float
):
    """Start a new call session and create initial record"""
    try:
        call_record = {
            "session_id": session_id,
            "client_id": client_id,
            "client_name": client_name,
            "lawyer_id": lawyer_id,
            "lawyer_name": lawyer_name,
            "channel_name": channel_name,
            "rate_per_minute": rate_per_minute,
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": None,
            "duration_seconds": 0,
            "duration_minutes": 0,
            "total_amount": 0.0,
            "lawyer_share": 0.0,
            "platform_share": 0.0,
            "recording_url": None,
            "recording_status": "none",
            "call_status": "ongoing",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.collection('call_history').document(session_id).set(call_record)
        
        return {"success": True, "session_id": session_id, "call_record": call_record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# End Call Session
@router.post("/end")
async def end_call_session(
    session_id: str,
    duration_seconds: int,
    total_amount: float
):
    """End a call session and update records"""
    try:
        end_time = datetime.now(timezone.utc).isoformat()
        duration_minutes = duration_seconds // 60
        
        # Calculate shares (80/20 split)
        lawyer_share = total_amount * 0.80
        platform_share = total_amount * 0.20
        
        update_data = {
            "end_time": end_time,
            "duration_seconds": duration_seconds,
            "duration_minutes": duration_minutes,
            "total_amount": total_amount,
            "lawyer_share": lawyer_share,
            "platform_share": platform_share,
            "call_status": "completed"
        }
        
        db.collection('call_history').document(session_id).update(update_data)
        
        # Get full record
        doc = db.collection('call_history').document(session_id).get()
        call_record = doc.to_dict() if doc.exists else {}
        
        return {
            "success": True,
            "session_id": session_id,
            "duration_minutes": duration_minutes,
            "total_amount": total_amount,
            "lawyer_share": lawyer_share,
            "platform_share": platform_share,
            "call_record": call_record
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Call History for User
@router.get("/history/{user_id}")
async def get_call_history(user_id: str, role: str = "client", limit: int = 50):
    """Get call history for a user"""
    try:
        if role == "client":
            docs = db.collection('call_history').where('client_id', '==', user_id).order_by('start_time', direction=firestore.Query.DESCENDING).limit(limit).stream()
        else:
            docs = db.collection('call_history').where('lawyer_id', '==', user_id).order_by('start_time', direction=firestore.Query.DESCENDING).limit(limit).stream()
        
        history = []
        for doc in docs:
            record = doc.to_dict()
            # Get chat transcript count
            chat_count = len(list(db.collection('chat_messages').where('session_id', '==', record['session_id']).stream()))
            record['chat_message_count'] = chat_count
            history.append(record)
        
        return {"history": history, "total": len(history)}
    except Exception as e:
        return {"history": [], "error": str(e)}

# Get Single Call Details
@router.get("/detail/{session_id}")
async def get_call_detail(session_id: str):
    """Get detailed call information including chat transcript"""
    try:
        # Get call record
        doc = db.collection('call_history').document(session_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Call not found")
        
        call_record = doc.to_dict()
        
        # Get chat transcript
        chat_docs = db.collection('chat_messages').where('session_id', '==', session_id).order_by('timestamp').stream()
        chat_transcript = [c.to_dict() for c in chat_docs]
        
        # Get rating if exists
        rating_doc = db.collection('call_ratings').document(session_id).get()
        rating = rating_doc.to_dict() if rating_doc.exists else None
        
        return {
            "call_record": call_record,
            "chat_transcript": chat_transcript,
            "rating": rating
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Start Cloud Recording (Agora)
@router.post("/recording/start")
async def start_recording(data: StartRecording):
    """Start Agora cloud recording for a session"""
    if not AGORA_CUSTOMER_ID or not AGORA_CUSTOMER_SECRET:
        # Fallback: Mark as recording without actual Agora cloud recording
        db.collection('call_history').document(data.session_id).update({
            "recording_status": "recording_simulated"
        })
        return {"success": True, "message": "Recording simulated (Agora credentials not configured)", "resource_id": "simulated"}
    
    try:
        # Agora Cloud Recording API
        auth = (AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET)
        
        # Acquire resource
        acquire_url = f"https://api.agora.io/v1/apps/{AGORA_APP_ID}/cloud_recording/acquire"
        acquire_data = {
            "cname": data.channel_name,
            "uid": "999",  # Recording bot UID
            "clientRequest": {}
        }
        
        async with httpx.AsyncClient() as client:
            acquire_res = await client.post(acquire_url, json=acquire_data, auth=auth)
            if acquire_res.status_code != 200:
                raise Exception(f"Failed to acquire resource: {acquire_res.text}")
            
            resource_id = acquire_res.json().get("resourceId")
            
            # Start recording
            start_url = f"https://api.agora.io/v1/apps/{AGORA_APP_ID}/cloud_recording/resourceid/{resource_id}/mode/mix/start"
            start_data = {
                "cname": data.channel_name,
                "uid": "999",
                "clientRequest": {
                    "recordingConfig": {
                        "channelType": 0,
                        "streamTypes": 2,  # Audio + Video
                        "maxIdleTime": 120
                    },
                    "storageConfig": {
                        # Configure your cloud storage here
                        "vendor": 0,  # AWS S3
                        "region": 0
                    }
                }
            }
            
            start_res = await client.post(start_url, json=start_data, auth=auth)
            
            if start_res.status_code == 200:
                sid = start_res.json().get("sid")
                
                # Update call record
                db.collection('call_history').document(data.session_id).update({
                    "recording_status": "recording",
                    "recording_resource_id": resource_id,
                    "recording_sid": sid
                })
                
                return {"success": True, "resource_id": resource_id, "sid": sid}
            else:
                raise Exception(f"Failed to start recording: {start_res.text}")
                
    except Exception as e:
        db.collection('call_history').document(data.session_id).update({
            "recording_status": "failed",
            "recording_error": str(e)
        })
        return {"success": False, "error": str(e)}

# Stop Cloud Recording
@router.post("/recording/stop")
async def stop_recording(session_id: str):
    """Stop Agora cloud recording"""
    try:
        doc = db.collection('call_history').document(session_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")
        
        call_data = doc.to_dict()
        
        if call_data.get('recording_status') == 'recording_simulated':
            # Simulated recording
            db.collection('call_history').document(session_id).update({
                "recording_status": "completed",
                "recording_url": f"/api/calls/recording/{session_id}/simulated"
            })
            return {"success": True, "message": "Simulated recording stopped"}
        
        resource_id = call_data.get('recording_resource_id')
        sid = call_data.get('recording_sid')
        
        if not resource_id or not sid:
            return {"success": False, "message": "No active recording found"}
        
        if not AGORA_CUSTOMER_ID:
            return {"success": True, "message": "Recording stopped (simulated)"}
        
        auth = (AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET)
        stop_url = f"https://api.agora.io/v1/apps/{AGORA_APP_ID}/cloud_recording/resourceid/{resource_id}/sid/{sid}/mode/mix/stop"
        
        async with httpx.AsyncClient() as client:
            stop_res = await client.post(stop_url, json={
                "cname": call_data.get('channel_name'),
                "uid": "999",
                "clientRequest": {}
            }, auth=auth)
            
            if stop_res.status_code == 200:
                server_response = stop_res.json().get("serverResponse", {})
                file_list = server_response.get("fileList", [])
                recording_url = file_list[0].get("fileName") if file_list else None
                
                db.collection('call_history').document(session_id).update({
                    "recording_status": "completed",
                    "recording_url": recording_url
                })
                
                return {"success": True, "recording_url": recording_url}
            else:
                raise Exception(f"Failed to stop recording: {stop_res.text}")
                
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}

# Rate a Call
@router.post("/rate")
async def rate_call(data: CallRating):
    """Rate a completed call"""
    try:
        rating_doc = {
            "session_id": data.session_id,
            "rating": data.rating,
            "feedback": data.feedback,
            "rated_by": data.rated_by,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.collection('call_ratings').document(data.session_id).set(rating_doc)
        
        # Update call record with rating
        db.collection('call_history').document(data.session_id).update({
            "rating": data.rating,
            "feedback": data.feedback
        })
        
        # Update lawyer's average rating
        call_doc = db.collection('call_history').document(data.session_id).get()
        if call_doc.exists:
            lawyer_id = call_doc.to_dict().get('lawyer_id')
            
            # Calculate new average
            all_ratings = db.collection('call_history').where('lawyer_id', '==', lawyer_id).where('rating', '>', 0).stream()
            ratings = [r.to_dict().get('rating', 0) for r in all_ratings]
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
                db.collection('lawyers').document(lawyer_id).update({
                    "average_rating": round(avg_rating, 1),
                    "total_ratings": len(ratings)
                })
        
        return {"success": True, "message": "Rating submitted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Lawyer Stats
@router.get("/stats/lawyer/{lawyer_id}")
async def get_lawyer_call_stats(lawyer_id: str):
    """Get call statistics for a lawyer"""
    try:
        docs = list(db.collection('call_history').where('lawyer_id', '==', lawyer_id).stream())
        
        total_calls = len(docs)
        total_minutes = sum(d.to_dict().get('duration_minutes', 0) for d in docs)
        total_earnings = sum(d.to_dict().get('lawyer_share', 0) for d in docs)
        
        # Average rating
        ratings = [d.to_dict().get('rating', 0) for d in docs if d.to_dict().get('rating')]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0
        
        return {
            "total_calls": total_calls,
            "total_minutes": total_minutes,
            "total_earnings": round(total_earnings, 2),
            "average_rating": avg_rating,
            "total_ratings": len(ratings)
        }
    except Exception as e:
        return {"total_calls": 0, "total_minutes": 0, "total_earnings": 0, "average_rating": 0}

# Get Platform Stats (Admin)
@router.get("/stats/platform")
async def get_platform_stats():
    """Get overall platform call statistics"""
    try:
        docs = list(db.collection('call_history').stream())
        
        total_calls = len(docs)
        total_minutes = sum(d.to_dict().get('duration_minutes', 0) for d in docs)
        total_revenue = sum(d.to_dict().get('total_amount', 0) for d in docs)
        platform_earnings = sum(d.to_dict().get('platform_share', 0) for d in docs)
        
        # Today's stats
        today = datetime.now(timezone.utc).date().isoformat()
        today_calls = [d for d in docs if d.to_dict().get('start_time', '').startswith(today)]
        today_revenue = sum(d.to_dict().get('total_amount', 0) for d in today_calls)
        
        return {
            "total_calls": total_calls,
            "total_minutes": total_minutes,
            "total_revenue": round(total_revenue, 2),
            "platform_earnings": round(platform_earnings, 2),
            "today_calls": len(today_calls),
            "today_revenue": round(today_revenue, 2)
        }
    except Exception as e:
        return {"error": str(e)}
