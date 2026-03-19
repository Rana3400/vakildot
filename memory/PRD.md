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
- **Role-Aware Settings Page**: Client sees only Name/Email/Mobile/Address. Lawyer sees all professional fields (Chamber, Practice Field, Court, Type, Bio).
- **Backend Auth Fix**: `get_current_user` now checks BOTH `lawyers` AND `clients` Firestore collections - clients can now authenticate properly.
- **Removed Business Info from Wallet**: 80%/20%/5min cards removed from Wallet page and ConsultationRoom billing section - internal info hidden from users.
- **Open Marketplace ClientDashboard**: Clients now see ALL live lawyers (not just assigned one). Any client can click "Consult Now" on any live lawyer. If wallet has minimum balance → goes to consultation. If not → redirects to wallet.
- **Flow**: Client opens dashboard → sees live lawyers → clicks Consult Now → adds money if needed → connects via video call.
- **Wallet migrated to Firestore**: Supabase DNS was failing in preview/production. Wallet now uses Firestore for balance, recharge, deductions, transactions.
- **Rate changed to ₹20/min**: All defaults updated from ₹30 to ₹20 per minute.
- **State-wise Court Selection**: Courts are now grouped by state (High Court, District Courts, Other Courts). Chandigarh, Delhi, and all 28 states + 8 UTs included with specific courts. National courts (Supreme Court, NCLT, NGT, etc.) available as separate option.
- **Auth: Signin/Check checks BOTH collections** (lawyers + clients). No more "Login failed" for existing clients.
- **register-client stores in `clients` collection** (was wrongly storing in `lawyers`).
- **Profile update writes to correct collection** based on user role.
- **Revenue split changed: 66% Lawyer / 34% Company** (was 80/20).
- **Resend OTP button** added to SignIn, LawyerOnboarding, ClientOnboarding - with 30s cooldown timer.
- **OTP expired** shows clear message "OTP expired. Please click Resend OTP."
- **ClientOnboarding rewritten** - uses backend API `/api/auth/register-client` instead of direct Firestore writes.
- **Asset Recovery section HIDDEN** from homepage (section removed + About text cleaned).
- **Billing Breakdown removed** from CallHistory page (no lawyer share/platform fee visible to clients).
- **Lawyer Earnings Wallet** added to LawyerDashboard with Withdraw to Bank button.
- **Withdrawal API**: `POST /api/live/wallet/withdraw` - deducts from lawyer wallet, creates pending withdrawal record. Min ₹100.
- **Earnings API**: `GET /api/live/wallet/earnings/{lawyer_id}` - total earned, total calls, total withdrawn, current balance.
- **AstroTalk Flow**: During call → per-minute deduct from client → 66% to lawyer wallet → 34% to company. Lawyer can withdraw to bank.

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
