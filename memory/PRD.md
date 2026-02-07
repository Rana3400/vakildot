# VakilDot - Indian Lawyer Management Platform

## Product Vision
Digital Munshi for Indian Advocates - Digitize lawyers' daily work, reduce manual record-keeping, and prevent missed court hearings.

## Tech Stack
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + Firebase Admin SDK
- **Database**: Google Firestore (100% - NO MongoDB)
- **Auth**: Firebase Phone OTP (Test Mode)
- **Notifications**: Make.com Webhook → Twilio

## Completed Features (P0) ✅

### 1. Authentication
- Firebase Phone OTP with Test Numbers
- Role-based: Lawyer / Client
- JWT token for API auth

### 2. Lawyer Registration (Enhanced)
- Name, Email, Mobile
- **Practice Field** (Criminal, Civil, Constitutional, etc.)
- **Court** (Supreme Court, High Courts, District Courts)
- **Type** (Advocate / Practitioner)
- **Chamber Number**

### 3. Case Management
- Full form: Client, Case Number, FIR Number, Case Type, Court, Judge, Stage
- **Hearing Date + Time (AM/PM)**
- Reminder settings (SMS/Call/WhatsApp)
- Auto webhook on case creation

### 4. Client Management
- Add/View/Delete clients
- **Photo upload** (base64 stored in Firestore)
- Click card → Client Detail with Communication Hub

### 5. Communication Hub
- Send WhatsApp/SMS/Voice via Make.com webhook
- Payload: client_name, client_phone, case_number, hearing_date, hearing_time, message

### 6. Calendar
- Monthly view with hearing dates
- Upcoming hearings list

### 7. Dashboard
- Stats: Total Cases, Active Cases, Clients, Today's Hearings

## Webhook Integration
- **URL**: https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n
- **Events**: case_created, notification_request
- **Payload**: client_name, client_phone, case_number, hearing_date, hearing_time, message, notification_type

## API Endpoints
- `GET /health` - Health check (database: firestore)
- `POST /api/auth/register` - Lawyer registration
- `POST /api/auth/signin` - Login
- `GET/POST /api/clients` - Client CRUD
- `POST /api/clients/{id}/upload-photo` - Photo upload
- `GET/POST /api/cases` - Case CRUD (triggers webhook)
- `POST /api/notifications/send-webhook` - Communication Hub
- `GET /api/calendar/hearings` - Calendar data
- `GET /api/dashboard/stats` - Dashboard stats

## Firestore Collections
- `lawyers` - User profiles
- `clients` - Client records
- `cases` - Case records
- `documents` - Uploaded documents

## Branding
- **Name**: VakilDot
- **Tagline**: The Digital Munshi for Indian Advocates

---
Last Updated: February 7, 2026
