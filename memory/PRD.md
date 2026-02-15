# VakilDot - Indian Legal Platform

## Product Vision
Digital Munshi for Indian Advocates + Live Consultation Marketplace (AstroTalk Model)

## Tech Stack
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + Firebase Admin SDK
- **Database**: 
  - Firestore (users, cases, clients)
  - Supabase PostgreSQL (wallet, billing)
- **Auth**: Firebase Phone OTP
- **Video**: Agora SDK
- **Payments**: Razorpay (Dummy mode for testing)

## Features

### Core Features (Existing) ✅
- Lawyer/Client Authentication
- Case Management with Court Dropdowns
- Client Management with Photo Upload
- Communication Hub (Webhook Integration)
- Document Management
- Calendar with Custom Reminders
- Settings with Profile Edit

### NEW: Live Consultation Module ✅
1. **Live Lawyers Slider**
   - Horizontal carousel of online lawyers
   - State/Court filtering (interconnected dropdowns)
   - Verified badges, ratings, rates

2. **Wallet System**
   - Test recharge (dummy payments)
   - Balance tracking
   - Transaction history
   - 80/20 split logic (Lawyer/Platform)

3. **Video Consultation**
   - Agora SDK integration
   - Pay-per-minute billing
   - Auto-deduction every minute
   - Auto-disconnect on low balance

4. **Billing Engine**
   - Real-time minute tracking
   - 80% to Lawyer, 20% to Platform
   - Supabase PostgreSQL for transactions

## API Endpoints

### Existing
- `/api/auth/*` - Authentication
- `/api/cases/*` - Case management
- `/api/clients/*` - Client management
- `/api/documents/*` - Documents
- `/api/calendar/*` - Calendar

### NEW Live Module
- `GET /api/live/lawyers/live` - Get online lawyers
- `GET /api/live/wallet/{user_id}` - Get wallet balance
- `POST /api/live/wallet/recharge` - Add funds (dummy)
- `POST /api/live/wallet/deduct` - Deduct with 80/20 split
- `GET /api/live/agora-token` - Get Agora credentials
- `POST /api/live/session/start` - Start consultation
- `POST /api/live/session/end` - End consultation
- `GET /api/live/filters/states` - Get Indian states
- `GET /api/live/filters/courts/{state}` - Get courts by state

## Environment Variables

### Backend (.env)
```
JWT_SECRET=vakildot-secret-key-2024
AGORA_APP_ID=cb1117d8b0af48b7bb53e2536e717a21
AGORA_APP_CERTIFICATE=00081798e38949d1a6d7a269ebc36b9d
SUPABASE_URL=https://elxueimqqbcahlffwbcy.supabase.co
SUPABASE_KEY=[provided]
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=[deployment_url]
REACT_APP_AGORA_APP_ID=cb1117d8b0af48b7bb53e2536e717a21
```

## Routes

### Public
- `/` - Welcome (Sign Up options)
- `/signin` - Sign In
- `/signup/lawyer` - Lawyer registration
- `/signup/client` - Client registration

### Protected
- `/dashboard` - Dashboard with Live Lawyers Slider
- `/cases` - Case management
- `/wallet` - Wallet & recharge
- `/consultation/:lawyerId` - Video consultation room
- `/clients` - Client management (lawyer only)
- `/documents` - Documents (lawyer only)
- `/calendar` - Calendar (lawyer only)
- `/settings` - Profile settings

## Pending Setup

1. **Supabase Tables** - Create via dashboard:
   - `wallets` (user_id, balance, currency)
   - `billing_history` (user_id, type, amount, lawyer_share, platform_share, balance_after, created_at)

2. **Razorpay** - Replace dummy payments when account ready

3. **Firebase Console** - Add `vakildot.com` to authorized domains

---
Last Updated: February 15, 2026
