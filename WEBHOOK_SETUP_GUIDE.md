# VakilDesk Webhook Integration Guide

## Overview
VakilDesk is configured to send notifications via HTTP POST requests to external automation platforms like Make.com, Zapier, or n8n. This allows you to integrate with WhatsApp, SMS, and Voice Call services.

## Webhook Configuration

### 1. Environment Variables

Update your webhook URL in the environment files:

**Backend (.env):**
```
WEBHOOK_URL=https://hook.us1.make.com/your-webhook-endpoint-here
```

**Frontend (.env):**
```
REACT_APP_WEBHOOK_URL=https://hook.us1.make.com/your-webhook-endpoint-here
```

### 2. JSON Payload Structure

When a notification is triggered, the following JSON payload is sent to your webhook:

```json
{
  "client_name": "Mr. Amit Sharma",
  "client_phone": "9988776655",
  "hearing_date": "2025-02-15",
  "case_description": "Property dispute case involving land ownership",
  "notification_type": "whatsapp",
  "case_number": "CRL/123/2025",
  "court_name": "Delhi District Court",
  "timestamp": "2025-01-24T14:30:00.000Z",
  "lawyer_name": "Adv. Rajesh Kumar",
  "lawyer_mobile": "9876543210"
}
```

**Notification Types:**
- `whatsapp` - WhatsApp Business message
- `sms` - SMS text message
- `voice` - AI voice call

## Setting Up Make.com (Recommended)

### Step 1: Create a Webhook in Make.com

1. Log in to [Make.com](https://www.make.com)
2. Create a new scenario
3. Add "Webhooks" module → "Custom webhook"
4. Copy the webhook URL provided (e.g., `https://hook.us1.make.com/xxxxx`)
5. Paste this URL into your `.env` files

### Step 2: Configure Notification Modules

#### For WhatsApp (using Twilio or WhatsApp Business API):

1. Add a "Router" module after the webhook
2. Add a filter: `notification_type = whatsapp`
3. Add "Twilio" or "WhatsApp Business" module
4. Configure the message template:
   ```
   Hello {{client_name}},
   
   This is a reminder for your court hearing:
   📋 Case: {{case_number}}
   🏛️ Court: {{court_name}}
   📅 Date: {{hearing_date}}
   
   Please be present on time.
   
   Regards,
   {{lawyer_name}}
   ```

#### For SMS (using Twilio):

1. Add another route with filter: `notification_type = sms`
2. Add "Twilio" → "Send SMS" module
3. Set recipient to: `{{client_phone}}`
4. Message template (similar to WhatsApp)

#### For Voice Call (using Twilio Voice):

1. Add route with filter: `notification_type = voice`
2. Add "Twilio" → "Make a Call" module
3. Configure TwiML for automated voice message
4. Use text-to-speech for dynamic content

## API Endpoints

### 1. Manual Notification (Communication Hub)
**Endpoint:** `POST /api/notifications/send-webhook`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "client_name": "Mr. Amit Sharma",
  "client_phone": "9988776655",
  "hearing_date": "2025-02-15",
  "case_description": "Property dispute case",
  "notification_type": "whatsapp",
  "case_number": "CRL/123/2025",
  "court_name": "Delhi District Court"
}
```

### 2. Get Upcoming Reminders (for automated scheduling)
**Endpoint:** `GET /api/notifications/upcoming-reminders`

Returns all cases with hearings in the next 24 hours that have reminders enabled.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "reminders": [
    {
      "case_id": "uuid",
      "case_number": "CRL/123/2025",
      "client_name": "Mr. Amit Sharma",
      "client_phone": "9988776655",
      "hearing_date": "2025-02-15",
      "case_description": "Property dispute",
      "court_name": "Delhi District Court",
      "reminder_types": ["whatsapp", "sms", "voice"]
    }
  ]
}
```

### 3. Trigger Automatic Reminders
**Endpoint:** `POST /api/notifications/trigger-auto-reminders`

Automatically sends reminders for all upcoming hearings in the next 24 hours.

This endpoint should be called by a scheduled job (cron) daily.

## Setting Up Automatic Daily Reminders

### Option 1: Using Make.com Scheduler

1. In your Make.com scenario, add a "Schedule" module
2. Set it to run daily at 9:00 AM
3. Add an "HTTP" module to call:
   ```
   POST {BACKEND_URL}/api/notifications/trigger-auto-reminders
   Headers:
   - Authorization: Bearer {LAWYER_JWT_TOKEN}
   ```
4. This will automatically send reminders for all hearings in the next 24 hours

### Option 2: Using Cron Job (Linux Server)

1. Create a script `/app/scripts/send_daily_reminders.sh`:
```bash
#!/bin/bash
API_URL="https://your-backend-url.com"
TOKEN="your-lawyer-jwt-token"

curl -X POST "$API_URL/api/notifications/trigger-auto-reminders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

2. Add to crontab:
```bash
# Run daily at 9:00 AM
0 9 * * * /app/scripts/send_daily_reminders.sh
```

### Option 3: Using Cloud Functions (AWS Lambda, Google Cloud Functions)

Deploy a serverless function that runs on a schedule and calls the trigger endpoint.

## Testing the Webhook

### Test with Make.com

1. Go to your Make.com scenario
2. Click "Run once" 
3. In VakilDesk, go to any client detail page
4. Click any of the communication buttons (WhatsApp/SMS/Voice)
5. Check Make.com to see the received payload
6. Configure your downstream actions based on the data

### Test with RequestBin (for debugging)

1. Go to [RequestBin](https://requestbin.com)
2. Create a bin and copy the URL
3. Set as WEBHOOK_URL temporarily
4. Send test notifications
5. View the exact payload structure

## Example Make.com Scenario Flow

```
1. Webhook Trigger (receives notification)
   ↓
2. Router (split by notification_type)
   ↓
3a. WhatsApp route → Twilio/WhatsApp Business API
3b. SMS route → Twilio SMS
3c. Voice route → Twilio Voice Call
   ↓
4. Logger (optional - log to Google Sheets)
   ↓
5. Success response
```

## Notification Logs

All sent notifications are logged in the database with:
- Timestamp
- Client phone
- Notification type
- Status (sent/failed)
- Full payload

Query logs via MongoDB:
```javascript
db.notification_logs.find({ lawyer_id: "your-lawyer-id" }).sort({ sent_at: -1 })
```

## Security Notes

1. **Never expose your JWT tokens** in client-side code
2. Use environment variables for all sensitive URLs and keys
3. Validate webhook signatures if your platform supports it
4. Rate limit the notification endpoints to prevent abuse
5. Monitor webhook response times and failures

## Troubleshooting

### Webhook not receiving data?
- Check if WEBHOOK_URL is correctly set in .env
- Verify the webhook endpoint is active in Make.com
- Check browser console for error messages
- Review backend logs: `tail -f /var/log/supervisor/backend.err.log`

### Notifications not sending?
- Verify Twilio/WhatsApp API credentials in Make.com
- Check phone number format (should be international format)
- Review Make.com execution logs
- Ensure notification_type matches your router filters

### Automatic reminders not working?
- Verify the scheduled job is running
- Check JWT token hasn't expired
- Ensure cases have reminder_enabled = true
- Verify hearing dates are within 24 hours

## Support

For issues or questions:
1. Check backend logs: `/var/log/supervisor/backend.err.log`
2. Check notification logs in MongoDB: `notification_logs` collection
3. Test webhook manually with curl or Postman
4. Review Make.com execution history

## Next Steps

1. Set up your Make.com/Zapier account
2. Configure your webhook URL in environment variables
3. Test manual notifications from Communication Hub
4. Set up scheduled reminders
5. Monitor and optimize your automation workflow
