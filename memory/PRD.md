# VakilDot - Indian Legal Platform

## Product Vision
Digital Munshi for Indian Advocates + Live Consultation Marketplace (AstroTalk Model)

## Tech Stack
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + Firebase Admin SDK
- **Database**: 
  - Firestore (users, cases, clients, chats, call history)
  - Supabase PostgreSQL (wallet, billing)
- **Auth**: Firebase Phone OTP
- **Video**: Agora SDK
- **Payments**: Razorpay (Dummy mode for testing)
- **Notifications**: Firebase Cloud Messaging (FCM)

---

## Features Status

### ✅ Core Features (Completed)
- Lawyer/Client Authentication (Firebase Phone OTP)
- Case Management with Court Dropdowns
- Client Management with Photo Upload
- Communication Hub (Webhook Integration)
- Document Management
- Calendar with Custom Reminders
- Settings with Profile Edit

### ✅ Live Consultation Module (Completed)
1. **Live Lawyers Slider** - Horizontal carousel with state/court filters
2. **Wallet System** - Dummy recharge, balance tracking
3. **Video Consultation** - Agora SDK integration
4. **Billing Engine** - 80/20 split (Lawyer/Platform)

### ✅ NEW FEATURES (Just Added)

#### 1. Push Notifications (`/app/backend/push_notifications.py`)
- FCM token registration
- Notification types:
  - Lawyer goes online
  - Hearing reminders (1 day before)
  - Payment received
  - New message alerts
- Scheduled notifications
- Notification history

#### 2. Chat During Call (`/app/backend/chat_module.py` + `/app/frontend/src/components/CallChat.jsx`)
- Real-time WebSocket chat
- Text messages
- Image & Document sharing
- Quick reply templates (Hindi + English)
- Chat transcript saved

#### 3. Call History & Recording (`/app/backend/call_history.py` + `/app/frontend/src/pages/CallHistory.jsx`)
- Complete call logs
- Duration, cost, billing breakdown
- Chat transcript retrieval
- Call rating system
- Recording status tracking
- Lawyer & client statistics

#### 4. Admin Panel (`/app/backend/admin_panel.py` + `/app/frontend/src/pages/AdminPanel.jsx`)
- **Dashboard**: Total users, revenue, calls, pending actions
- **User Management**: View all, ban/unban, warnings
- **Lawyer Verification**: Approve/reject pending lawyers
- **Transaction History**: All calls with billing details
- **Dispute Management**: Handle complaints
- **Asset Recovery Leads**: Manage leads from quiz

---

## API Endpoints

### Existing
- `/api/auth/*` - Authentication
- `/api/cases/*` - Case management
- `/api/clients/*` - Client management
- `/api/documents/*` - Documents
- `/api/calendar/*` - Calendar

### Live Module
- `GET /api/live/lawyers/live` - Get online lawyers
- `GET /api/live/wallet/{user_id}` - Get wallet balance
- `POST /api/live/wallet/recharge` - Add funds (dummy)
- `POST /api/live/wallet/deduct` - Deduct with 80/20 split
- `GET /api/live/agora-token` - Get Agora credentials

### NEW: Push Notifications
- `POST /api/notifications/register-token` - Register FCM token
- `POST /api/notifications/send` - Send to single user
- `POST /api/notifications/lawyer-online` - Notify clients
- `POST /api/notifications/hearing-reminder` - Send reminder
- `POST /api/notifications/payment-received` - Notify lawyer
- `POST /api/notifications/new-message` - Message alert

### NEW: Chat Module
- `WebSocket /api/chat/ws/{session_id}` - Real-time chat
- `POST /api/chat/send` - Send message (REST fallback)
- `POST /api/chat/upload-file/{session_id}` - Upload image/document
- `GET /api/chat/history/{session_id}` - Get chat transcript
- `GET /api/chat/quick-replies` - Get templates

### NEW: Call History
- `POST /api/calls/start` - Start call session
- `POST /api/calls/end` - End call with billing
- `GET /api/calls/history/{user_id}` - Get user's call history
- `GET /api/calls/detail/{session_id}` - Call details + chat
- `POST /api/calls/rate` - Rate a call
- `GET /api/calls/stats/lawyer/{lawyer_id}` - Lawyer statistics

### NEW: Admin Panel
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/action` - Ban/unban/verify
- `GET /api/admin/verification/pending` - Pending lawyers
- `POST /api/admin/verification/update` - Approve/reject
- `GET /api/admin/transactions` - All transactions
- `GET /api/admin/disputes` - Dispute list
- `POST /api/admin/disputes/resolve` - Resolve dispute

---

## Routes

### Public
- `/` - Welcome (Sign Up options)
- `/signin` - Sign In
- `/signup/lawyer` - Lawyer registration
- `/signup/client` - Client registration
- `/asset-recovery` - Asset recovery quiz
- `/admin` - Admin panel login

### Protected
- `/dashboard` - Dashboard
- `/cases` - Case management
- `/wallet` - Wallet & recharge
- `/call-history` - Call history (NEW)
- `/consultation/:lawyerId` - Video consultation + Chat
- `/clients` - Client management (lawyer only)
- `/documents` - Documents (lawyer only)
- `/calendar` - Calendar (lawyer only)
- `/settings` - Profile settings

---

## Admin Credentials (Test)
- **Email**: admin@vakildot.com
- **Password**: admin123

---

## Environment Variables

### Backend (.env)
```
JWT_SECRET=vakildot-secret-key-2024
AGORA_APP_ID=cb1117d8b0af48b7bb53e2536e717a21
AGORA_APP_CERTIFICATE=00081798e38949d1a6d7a269ebc36b9d
SUPABASE_URL=https://elxueimqqbcahlffwbcy.supabase.co
SUPABASE_KEY=[provided]
ADMIN_EMAILS=admin@vakildot.com
ADMIN_PASSWORD=admin123
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=[deployment_url]
REACT_APP_AGORA_APP_ID=cb1117d8b0af48b7bb53e2536e717a21
```

---

## Pending / Future Tasks

### P1 - Next Priority
- [ ] AI Chat Manager (Legal FAQ, Document analysis)
- [ ] Real Razorpay integration
- [ ] PWA setup for mobile

### P2 - Future
- [ ] Call recording download (Agora Cloud Recording)
- [ ] Advanced analytics dashboard
- [ ] Google Calendar sync
- [ ] Flutter mobile app

---

## File Structure

```
/app
├── backend/
│   ├── server.py              # Main FastAPI app
│   ├── live_consultation.py   # Agora, Wallet, Sessions
│   ├── push_notifications.py  # FCM notifications (NEW)
│   ├── chat_module.py         # WebSocket chat (NEW)
│   ├── call_history.py        # Call logs & recording (NEW)
│   ├── admin_panel.py         # Admin dashboard (NEW)
│   └── .env                   # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── CallChat.jsx   # Chat component (NEW)
│   │   ├── pages/
│   │   │   ├── Welcome.js     # Homepage
│   │   │   ├── AdminPanel.jsx # Admin dashboard (NEW)
│   │   │   ├── CallHistory.jsx # Call history page (NEW)
│   │   │   ├── ConsultationRoom.js # Video call + chat
│   │   │   └── ...
│   │   └── App.js
│   └── package.json
└── memory/
    └── PRD.md
```

---

Last Updated: February 15, 2026
