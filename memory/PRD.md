# VakilDot - Product Requirements Document

## Original Problem Statement
Build a comprehensive lawyer management application named "VakilDot" - a real-time legal consultation marketplace (like AstroTalk) where clients connect with live lawyers for pay-per-minute video consultations.

## Tech Stack
- **Frontend:** React, TailwindCSS, Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** Firestore (Firebase)
- **Auth:** Firebase Phone OTP + Custom JWT
- **Video:** Agora SDK (official agora-token-builder)
- **Payments:** Razorpay (LIVE keys)
- **Deployment:** PWA-enabled

## What's Been Implemented
- Full auth flow (signup/signin) with Firebase Phone OTP
- Lawyer & Client onboarding with state/court selection (36 states/UTs)
- Live marketplace showing online lawyers
- Wallet system with Razorpay LIVE integration
- Lawyer dashboard with earnings & withdrawal feature
- Client dashboard as open marketplace
- Mobile-responsive UI with PWA support
- Lazy loading for 17+ pages (React.lazy/Suspense)

## Bug Fixes (March 2026)

### Session 1 - Backend Auth & UI Fixes
1. **Login Failed (P0):** Backend signin checks both `mobile` and `phone` fields across `lawyers` and `clients` collections
2. **State/UT Dropdown (P0):** Added proper error handling, verified working with 36 states
3. **Live Lawyers Not Showing (P0):** Fixed silent error handling, verified on desktop & mobile

### Session 2 - OTP, Agora & Performance
4. **OTP/Resend OTP Fails (P0):** Complete rewrite of firebase.js reCAPTCHA management - creates once, force-recreates on resend with `isResend` flag
5. **Agora Video Call Fails (P0):** Replaced custom HMAC token builder with official `agora-token-builder` SDK (139 char proper tokens)
6. **Slow Performance (P2):** Added React.lazy/Suspense lazy loading for 17 non-critical pages

## Pending Issues
- End-to-end video call testing with real users (depends on Agora App ID being active)
- Client signup flow full verification (P1)

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

## Key API Endpoints
- POST /api/auth/signin - Authenticates users (checks mobile & phone fields)
- POST /api/auth/register - Registers lawyers
- POST /api/auth/register-client - Registers clients
- GET /api/live/lawyers/live - Fetches online lawyers
- GET /api/live/filters/states - Returns all 36 states/UTs
- GET /api/live/filters/courts/{state} - Returns grouped courts
- GET /api/live/agora-token - Generates proper Agora RTC tokens
- POST /api/live/razorpay/create-order - Creates payment order
- POST /api/live/razorpay/verify - Verifies payment

## Mocked Features
- Lawyer withdrawal: Creates request only, no actual bank transfer
- Payment split: Not automated via Razorpay Route
