# Chat Module - VakilDot
# Real-time chat during video calls with text, images, documents, and quick replies

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import firestore
import os
import uuid
import base64
import json
import asyncio

router = APIRouter(prefix="/api/chat", tags=["Chat"])

db = firestore.client()

# Active WebSocket connections
active_connections: Dict[str, List[WebSocket]] = {}

# Models
class ChatMessage(BaseModel):
    session_id: str
    sender_id: str
    sender_name: str
    sender_role: str  # lawyer, client
    message_type: str  # text, image, document, quick_reply
    content: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class QuickReply(BaseModel):
    id: str
    text: str
    category: str  # greeting, closing, legal_terms, general

# Quick Reply Templates
QUICK_REPLIES = [
    # Greetings
    {"id": "qr1", "text": "Namaste! Main aapki kaise madad kar sakta hoon?", "category": "greeting"},
    {"id": "qr2", "text": "Hello! Please tell me about your case.", "category": "greeting"},
    {"id": "qr3", "text": "Welcome! How may I assist you today?", "category": "greeting"},
    
    # Legal Terms
    {"id": "qr4", "text": "Aapko FIR ki copy ki zarurat hogi.", "category": "legal_terms"},
    {"id": "qr5", "text": "Please share the case number for reference.", "category": "legal_terms"},
    {"id": "qr6", "text": "Hearing ki date confirm hone par main aapko inform karunga.", "category": "legal_terms"},
    {"id": "qr7", "text": "Aapke documents review karke main advice dunga.", "category": "legal_terms"},
    
    # Closing
    {"id": "qr8", "text": "Thank you for consulting. Feel free to reach out again.", "category": "closing"},
    {"id": "qr9", "text": "Consultation complete. Please rate your experience.", "category": "closing"},
    {"id": "qr10", "text": "Documents email kar dijiye, main review karke reply karunga.", "category": "closing"},
    
    # General
    {"id": "qr11", "text": "Ek minute, main check karta hoon.", "category": "general"},
    {"id": "qr12", "text": "Aap screen share kar sakte ho document dikhane ke liye.", "category": "general"},
    {"id": "qr13", "text": "Network issue lag raha hai, kya aap sun sakte ho?", "category": "general"},
]

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
    
    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

# WebSocket Endpoint for Real-time Chat
@router.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Save message to Firestore
            message_id = str(uuid.uuid4())
            message_doc = {
                "id": message_id,
                "session_id": session_id,
                "sender_id": data.get("sender_id"),
                "sender_name": data.get("sender_name"),
                "sender_role": data.get("sender_role"),
                "message_type": data.get("message_type", "text"),
                "content": data.get("content"),
                "file_url": data.get("file_url"),
                "file_name": data.get("file_name"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            db.collection('chat_messages').document(message_id).set(message_doc)
            
            # Broadcast to all connections in the session
            await manager.broadcast(session_id, message_doc)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, session_id)

# REST Endpoints

# Send Message (fallback if WebSocket not available)
@router.post("/send")
async def send_message(data: ChatMessage):
    """Send a chat message"""
    try:
        message_id = str(uuid.uuid4())
        message_doc = {
            "id": message_id,
            "session_id": data.session_id,
            "sender_id": data.sender_id,
            "sender_name": data.sender_name,
            "sender_role": data.sender_role,
            "message_type": data.message_type,
            "content": data.content,
            "file_url": data.file_url,
            "file_name": data.file_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_read": False
        }
        
        db.collection('chat_messages').document(message_id).set(message_doc)
        
        # Try to broadcast via WebSocket
        await manager.broadcast(data.session_id, message_doc)
        
        return {"success": True, "message_id": message_id, "message": message_doc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Upload File for Chat
@router.post("/upload-file/{session_id}")
async def upload_chat_file(session_id: str, file: UploadFile = File(...)):
    """Upload image or document for chat"""
    try:
        content = await file.read()
        
        # Store file in Firestore (for small files) or could use Firebase Storage
        file_id = str(uuid.uuid4())
        file_data = {
            "id": file_id,
            "session_id": session_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "data": base64.b64encode(content).decode('utf-8'),
            "size": len(content),
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.collection('chat_files').document(file_id).set(file_data)
        
        # Return URL for the file
        file_url = f"/api/chat/file/{file_id}"
        
        return {
            "success": True,
            "file_id": file_id,
            "file_url": file_url,
            "filename": file.filename,
            "content_type": file.content_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Chat File
@router.get("/file/{file_id}")
async def get_chat_file(file_id: str):
    """Download a chat file"""
    try:
        doc = db.collection('chat_files').document(file_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="File not found")
        
        data = doc.to_dict()
        content = base64.b64decode(data['data'])
        
        from fastapi.responses import Response
        return Response(
            content=content,
            media_type=data['content_type'],
            headers={"Content-Disposition": f"attachment; filename={data['filename']}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Chat History for a Session
@router.get("/history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 100):
    """Get all messages for a session"""
    try:
        docs = db.collection('chat_messages').where('session_id', '==', session_id).order_by('timestamp').limit(limit).stream()
        messages = [doc.to_dict() for doc in docs]
        return {"messages": messages, "total": len(messages)}
    except Exception as e:
        return {"messages": [], "error": str(e)}

# Get Quick Replies
@router.get("/quick-replies")
async def get_quick_replies(category: Optional[str] = None):
    """Get quick reply templates"""
    if category:
        filtered = [qr for qr in QUICK_REPLIES if qr['category'] == category]
        return {"quick_replies": filtered}
    return {"quick_replies": QUICK_REPLIES}

# Add Custom Quick Reply
@router.post("/quick-replies")
async def add_quick_reply(user_id: str, text: str, category: str = "custom"):
    """Add a custom quick reply for a lawyer"""
    try:
        qr_id = str(uuid.uuid4())
        qr_doc = {
            "id": qr_id,
            "user_id": user_id,
            "text": text,
            "category": category,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.collection('custom_quick_replies').document(qr_id).set(qr_doc)
        return {"success": True, "quick_reply": qr_doc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get User's Custom Quick Replies
@router.get("/quick-replies/{user_id}")
async def get_user_quick_replies(user_id: str):
    """Get lawyer's custom quick replies"""
    try:
        docs = db.collection('custom_quick_replies').where('user_id', '==', user_id).stream()
        custom_replies = [doc.to_dict() for doc in docs]
        return {"quick_replies": QUICK_REPLIES + custom_replies}
    except:
        return {"quick_replies": QUICK_REPLIES}

# Mark Messages as Read
@router.post("/mark-read/{session_id}")
async def mark_messages_read(session_id: str, user_id: str):
    """Mark all messages in a session as read for a user"""
    try:
        docs = db.collection('chat_messages').where('session_id', '==', session_id).where('sender_id', '!=', user_id).stream()
        for doc in docs:
            db.collection('chat_messages').document(doc.id).update({"is_read": True})
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Get Unread Count
@router.get("/unread-count/{user_id}")
async def get_unread_count(user_id: str):
    """Get count of unread messages for a user"""
    try:
        # Get all sessions where user is a participant
        sessions = db.collection('call_history').where('client_id', '==', user_id).stream()
        session_ids = [s.to_dict()['session_id'] for s in sessions]
        
        # Also check if user is lawyer
        lawyer_sessions = db.collection('call_history').where('lawyer_id', '==', user_id).stream()
        session_ids.extend([s.to_dict()['session_id'] for s in lawyer_sessions])
        
        unread_count = 0
        for session_id in session_ids:
            docs = db.collection('chat_messages').where('session_id', '==', session_id).where('sender_id', '!=', user_id).where('is_read', '==', False).stream()
            unread_count += len(list(docs))
        
        return {"unread_count": unread_count}
    except:
        return {"unread_count": 0}
