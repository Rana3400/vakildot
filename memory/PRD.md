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
- **PWA**: Service Worker + Manifest (installable app)

---

## Features Status

### Completed
- Lawyer/Client Authentication (Firebase Phone OTP)
- Role-Based Dashboards (Lawyer & Client separated)
- Case Management with Court Dropdowns
- Client Management with Photo Upload
- Communication Hub (Webhook Integration)
- Document Management
- Calendar with Custom Reminders
- Settings with Profile Edit + Photo Upload (syncs to localStorage)
- Live Consultation Module (Wallet, Agora, Billing)
- Security: Alphanumeric Captcha + Hard Delete
- RBAC: Strict role separation in routes and sidebars
- PWA Support (manifest.json, service worker, install banner)
- Hostinger VPS Deployment Guide

### Fixed in This Session (Feb 26, 2026)
- Lawyer profile image flow: photo_url now syncs to localStorage on upload and go-live fetches latest from Firestore
- Added missing `/api/client/my-lawyer` endpoint for client dashboard
- `/api/client/my-cases` now returns `assigned_lawyer_id`
- PWA: manifest.json, service-worker.js, app icons, install banner
- Updated index.html with PWA meta tags
- **Mobile Responsive Fix**: Complete homepage mobile overhaul:
  - Header: hamburger menu + visible Sign In button (no more horizontal scroll)
  - Responsive text sizes, card spacing, button sizes
  - Touch-friendly slider with snap scrolling
  - Compact asset recovery grid on mobile
  - Proper footer on small screens
- **Razorpay LIVE Integration**: Real payment gateway with live keys
  - `POST /api/live/razorpay/create-order` - Creates real Razorpay orders
  - `POST /api/live/razorpay/verify` - Verifies payment signature and credits wallet
  - Frontend Wallet.js uses Razorpay Checkout.js with UPI, Cards, Net Banking
- **Agora Video Call**: Real SDK integration
  - `agora-rtc-sdk-ng` installed and integrated in ConsultationRoom.js
  - Token generation using HMAC-SHA256 with app certificate
  - Full video call: create/join channel, publish local tracks, subscribe to remote
  - PiP local video, controls (mute/unmute, video on/off, end call)
- **Fixed .env**: Corrected concatenated values in frontend .env

### Scaffolded (Not Fully Tested)
- Push Notifications (backend module exists)
- In-call Chat (WebSocket endpoint + component)
- Call History (backend + frontend)
- Admin Panel (backend + frontend)

---

## API Endpoints

### Auth
- `POST /api/auth/check-existing` - Check if user exists
- `POST /api/auth/register` - Register lawyer
- `POST /api/auth/register-client` - Register client
- `POST /api/auth/signin` - Sign in

### Client-Specific
- `GET /api/client/my-cases` - Client's own cases (+ assigned_lawyer_id)
- `GET /api/client/my-lawyer` - Client's assigned lawyer with live status
- `GET /api/client/my-documents` - Client's case documents
- `GET /api/client/my-hearings` - Client's upcoming hearings

### Live Module
- `POST /api/live/status/go-live` - Toggle live status (fetches latest photo)
- `GET /api/live/status/{lawyer_id}` - Get live status
- `GET /api/live/lawyers/live` - Get online lawyers
- `GET /api/live/wallet/{user_id}` - Get wallet balance
- `POST /api/live/wallet/recharge` - Add funds (dummy)
- `POST /api/live/wallet/deduct` - Deduct with 80/20 split
- `GET /api/live/agora-token` - Get Agora credentials

### Cases, Clients, Calendar, Documents, Profile
- Full CRUD endpoints (see server.py)

---

## Pending/Known Issues
- Client signup may have captcha conflicts (Firebase reCAPTCHA + custom captcha)
- Supabase wallet operations may fail in preview environment (DNS restriction) - works in production
- End-to-end live consultation flow needs user testing with 2 devices

## Upcoming Tasks
- [ ] AI Agent for client enquiries
- [ ] Fix client signup captcha conflict
- [ ] End-to-end live consultation testing (2 devices)
- [ ] PWA offline support enhancement

## Future/Backlog
- [ ] AI Chat Manager (Legal FAQ)
- [ ] Advanced user roles (Clerk, Junior Advocate)
- [ ] Analytics dashboards
- [ ] Google Calendar sync
- [ ] Flutter/React Native mobile app
- [ ] Call recording download

---

## Admin Credentials (Test)
- **Email**: admin@vakildot.com
- **Password**: admin123

---

Last Updated: February 26, 2026
