# VakilDot - Product Requirements Document

## Original Problem Statement
Build "VakilDot" - a real-time legal consultation marketplace (like AstroTalk) where clients connect with live lawyers for pay-per-minute video consultations.

## Tech Stack
- **Frontend:** React, TailwindCSS, Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** Firestore (Firebase)
- **Auth:** Firebase Phone OTP + Custom JWT (Firebase UID as doc ID)
- **Video:** Agora SDK (official agora-token-builder)
- **Payments:** Razorpay (LIVE keys)
- **Deployment:** PWA-enabled

## Architecture (Fixed March 2026)
### Single-Document Auth System
- Each user has ONE Firestore document with Firebase UID as the doc ID
- Backend `register` endpoint creates the doc with both `mobile` and `phone` fields
- Frontend does NOT call `saveUserToFirestore` (eliminated duplicate docs)
- Signin uses Firebase UID direct lookup + mobile/phone field search fallback
- Register returns existing user data if already registered (no 400 errors)

### Call Notification System
- Uses Firestore polling (every 4 seconds) instead of unreliable FCM
- When client starts call → stores notification in `call_notifications/{lawyer_id}_active`
- LawyerDashboard polls for incoming calls when lawyer is LIVE
- Shows modal with Accept/Reject buttons

## What's Implemented
- Full auth flow (signup/signin) with Firebase Phone OTP
- Lawyer & Client onboarding with state/court selection (36 states/UTs)
- Live marketplace showing online lawyers
- Wallet system with Razorpay LIVE integration
- Lawyer dashboard with earnings & withdrawal feature
- Client dashboard as open marketplace
- Mobile-responsive UI with PWA support
- Lazy loading for 17+ pages (React.lazy/Suspense)
- Incoming call notification with Firestore polling
- Agora video call with official token generation

## Bug Fixes (March 2026 - Session 3)
1. **Auth System Rewrite (P0):** Eliminated dual-document problem by using Firebase UID as single doc ID. Register returns existing user. Signin uses both UID lookup and field search.
2. **OTP/Resend Fix (P0):** firebase.js rewritten with forceNewRecaptcha for resends
3. **Agora Token Fix (P0):** Uses official agora-token-builder SDK
4. **Call Notification (P0):** Firestore polling replaces broken FCM push notifications
5. **Performance (P2):** Lazy loading for 17 non-critical pages
6. **Data Loss Prevention:** No more saveUserToFirestore creating orphan docs

## Key API Endpoints
- POST /api/auth/register - Creates/returns lawyer (uses firebase_uid as doc ID)
- POST /api/auth/register-client - Creates/returns client
- POST /api/auth/signin - Finds user by firebase_uid or mobile/phone
- POST /api/auth/check-existing - Checks if user exists
- GET /api/live/lawyers/live - Fetches online lawyers
- GET /api/live/filters/states - Returns all 36 states/UTs
- GET /api/live/filters/courts/{state} - Returns grouped courts
- GET /api/live/agora-token - Generates Agora RTC tokens
- GET /api/notifications/active-call/{lawyer_id} - Poll for incoming calls
- POST /api/notifications/incoming-call - Store call notification
- POST /api/notifications/call-action - Accept/reject call

## Pending
- End-to-end Agora video call testing (depends on App ID being active)
- Razorpay payment verification testing

## Upcoming Tasks
- AI Agent/Chatbot for client enquiries (P1)
- Bank account details form for lawyer withdrawals (P1)
- Razorpay Route for automated payment splitting (P2)

## Future/Backlog
- Advanced user roles (Clerk, Junior Advocate) (P2)
- Analytics & Reporting dashboards (P3)
- Google Calendar Sync (P3)
- Native mobile app (P3)
- Backend refactoring: Break server.py into modular routers

## Mocked Features
- Lawyer withdrawal: Creates request only, no actual bank transfer
- Payment split: Not automated via Razorpay Route
