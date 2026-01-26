# VakilDesk - Indian Lawyer Management Application

## Product Vision
Digitize lawyers' daily work, reduce manual record-keeping, and prevent missed court hearings through automated reminders.

## Target Users
- Individual advocates and law firms
- Junior advocates and clerks
- Clients who want to track their cases

## Core Features

### Implemented (P0) ✅
1. **User Authentication**
   - Firebase Phone OTP authentication for secure login
   - Role-based access: Lawyer vs Client
   - User profiles stored in Firestore (lawyers, clients collections)
   - Case data stored in MongoDB

2. **Case Management**
   - Create, view, and delete cases
   - Case details: case number, FIR number, court name, judge name, hearing date & time
   - Case stages: Filed, Under Trial, Arguments, Judgment Reserved, Judgment, Appeal, Closed

3. **Client Management**
   - Add and manage client profiles
   - Link clients to cases
   - View client details and associated cases

4. **Reminder System**
   - Enable/disable reminders per case
   - Reminder types: SMS, Voice Call, WhatsApp
   - Make.com webhook integration for automated notifications

5. **Make.com Webhook Integration**
   - Triggers on new case creation
   - Payload: client_name, client_phone, case_number, hearing_date, hearing_time
   - Webhook URL: https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n

6. **Dashboard**
   - Case statistics
   - Upcoming hearings
   - Recent activity

### Upcoming Tasks (P1)
- **Automated Reminder Scheduler**: Backend scheduler to automatically trigger notifications for upcoming hearing dates

### Future Tasks (P2)
- Document Management: Upload, store, and organize case documents
- Billing and Fee Management: Invoice generation and payment tracking
- Legal Calendar: Court holidays and hearing date calendar with Google Calendar sync
- Advanced User Roles: Clerk, Senior Advocate differentiation

## Tech Stack
- **Frontend**: React with TailwindCSS and Shadcn/UI
- **Backend**: FastAPI with Python
- **Database**: MongoDB (cases, clients) + Firestore (user profiles)
- **Authentication**: Firebase Phone OTP
- **Notifications**: Make.com webhooks

## Key API Endpoints
- `GET /health` - Health check
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/register` - Register lawyer
- `POST /api/auth/register-client` - Register client
- `POST /api/auth/signin` - Sign in
- `GET /api/cases` - List cases
- `POST /api/cases` - Create case (triggers webhook)
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/dashboard/stats` - Dashboard statistics

## Firebase Configuration
- Project: vakil-app-auth
- Auth: Phone OTP with reCAPTCHA verification
- Firestore Collections: lawyers, clients

## Data Models

### Case (MongoDB)
```json
{
  "id": "uuid",
  "lawyer_id": "string",
  "client_id": "string",
  "client_name": "string",
  "case_number": "string",
  "case_type": "Criminal|Civil|Constitutional|Family|Property|Corporate",
  "court_name": "string",
  "judge_name": "string",
  "case_stage": "Filed|Under Trial|Arguments|Judgment Reserved|Judgment|Appeal|Closed",
  "next_hearing_date": "YYYY-MM-DD",
  "next_hearing_time": "HH:MM",
  "case_description": "string",
  "reminder_enabled": true,
  "reminder_types": ["sms", "call", "whatsapp"]
}
```

### User (Firestore)
```json
{
  "uid": "firebase_uid",
  "name": "string",
  "email": "string",
  "phone": "string",
  "role": "lawyer|client"
}
```

---
Last Updated: January 26, 2026
