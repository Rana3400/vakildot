# VakilDot - Product Requirements Document

## Original Problem Statement
Build a comprehensive lawyer management application named "VakilDot" - a real-time legal consultation marketplace (like AstroTalk) where clients connect with live lawyers for pay-per-minute video consultations.

## Core Vision
An open marketplace for clients to find and connect with any available live lawyer for pay-per-minute video consultations.

## Tech Stack
- **Frontend:** React, TailwindCSS, Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** Firestore (Firebase)
- **Auth:** Firebase Phone OTP + Custom JWT
- **Video:** Agora SDK
- **Payments:** Razorpay (LIVE keys)
- **Deployment:** PWA-enabled

## Key Features
- Role-Based System: Lawyer and Client roles with distinct dashboards
- Live Consultation Marketplace: Homepage shows online lawyers
- Pay-Per-Minute Billing: ₹20/min rate, 66/34 (Lawyer/Platform) split
- Wallet System: Razorpay LIVE for recharges, Firestore for balance
- Video Calls: Agora SDK integration
- PWA: Installable on mobile devices

## What's Been Implemented
- Full auth flow (signup/signin) with Firebase Phone OTP
- Lawyer & Client onboarding with state/court selection
- Live marketplace showing online lawyers
- Wallet system with Razorpay LIVE integration
- Lawyer dashboard with earnings & withdrawal feature
- Client dashboard as open marketplace
- Mobile-responsive UI with PWA support
- State-wise court selection system (36 states/UTs)

## Bug Fixes (Latest - March 2026)
1. **Login Failed (P0):** Fixed - Backend signin now checks both `mobile` and `phone` fields across `lawyers` and `clients` collections. Register endpoints store both fields for consistency.
2. **State/UT Dropdown (P0):** Fixed - Added proper error handling and logging. API confirmed working with 36+ states.
3. **Live Lawyers Not Showing (P0):** Fixed - Added proper error handling. API and frontend confirmed working.

## Pending Issues
- Agora video call end-to-end testing (P1)
- Client signup flow full verification (P1)
- Site performance optimization (P2)

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
- GET /api/live/filters/states - Returns all states/UTs
- GET /api/live/filters/courts/{state} - Returns grouped courts
- POST /api/live/razorpay/create-order - Creates payment order
- POST /api/live/razorpay/verify - Verifies payment

## Mocked Features
- Lawyer withdrawal: Creates request only, no actual bank transfer
- Payment split: Not automated via Razorpay Route
