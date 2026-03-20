# Make.com Webhook Integration - Live Configuration

## ✅ WEBHOOK CONFIGURED AND WORKING!

Your Make.com webhook is now fully integrated and receiving data from VakilDesk.

### Webhook URL (Active)
```
https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n
```

## JSON Payload Structure

When any Communication Hub button is clicked, your Make.com webhook receives this exact JSON structure:

```json
{
  "client_name": "Mr. Amit Sharma",
  "client_phone": "9988776655",
  "hearing_date": "2025-02-15",
  "case_description": "Property dispute case - urgent hearing",
  "notification_type": "whatsapp",
  "case_number": "CRL/456/2025",
  "court_name": "Delhi District Court",
  "timestamp": "2026-01-24T15:45:30.123456+00:00",
  "lawyer_name": "Adv. Rajesh Kumar",
  "lawyer_mobile": "9876543210"
}
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `client_name` | string | Full name of the client | "Mr. Amit Sharma" |
| `client_phone` | string | 10-digit mobile number | "9988776655" |
| `hearing_date` | string | ISO date format (YYYY-MM-DD) | "2025-02-15" |
| `case_description` | string | Brief case details | "Property dispute case" |
| `notification_type` | string | Type of notification | "whatsapp", "sms", or "voice" |
| `case_number` | string | Unique case identifier | "CRL/456/2025" |
| `court_name` | string | Name of the court | "Delhi District Court" |
| `timestamp` | string | UTC timestamp when sent | "2026-01-24T15:45:30.123456+00:00" |
| `lawyer_name` | string | Advocate's name | "Adv. Rajesh Kumar" |
| `lawyer_mobile` | string | Advocate's mobile | "9876543210" |

## Notification Types

Your webhook will receive one of three notification types:

### 1. WhatsApp Reminder (Green Button)
```json
{
  "notification_type": "whatsapp",
  ...
}
```

### 2. SMS Alert (Blue Button)
```json
{
  "notification_type": "sms",
  ...
}
```

### 3. AI Voice Call (Orange Button)
```json
{
  "notification_type": "voice",
  ...
}
```

## Testing Results

All three buttons have been tested and are successfully sending data to your Make.com webhook:

✅ **WhatsApp Reminder** - Status: 200 OK  
✅ **SMS Alert** - Status: 200 OK  
✅ **AI Voice Call** - Status: 200 OK  

## How to Use in Make.com

### Step 1: Webhook Trigger
Your scenario should start with the webhook trigger you've already created. It will automatically parse the JSON payload.

### Step 2: Router Based on Notification Type
Add a Router module with three routes:

**Route 1: WhatsApp**
- Filter: `notification_type` equals `whatsapp`
- Action: Send WhatsApp message via Twilio/WhatsApp Business API

**Route 2: SMS**
- Filter: `notification_type` equals `sms`
- Action: Send SMS via Twilio

**Route 3: Voice Call**
- Filter: `notification_type` equals `voice`
- Action: Make voice call via Twilio Voice

### Step 3: Message Template Example

For WhatsApp/SMS:
```
नमस्ते {{client_name}},

यह आपकी सुनवाई की reminder है:

📋 केस नंबर: {{case_number}}
🏛️ कोर्ट: {{court_name}}
📅 तारीख: {{hearing_date}}

कृपया समय पर उपस्थित हों।

सादर,
{{lawyer_name}}
{{lawyer_mobile}}
```

For Voice Call (Text-to-Speech):
```
Hello {{client_name}}. This is a reminder for your court hearing. Case number {{case_number}} in {{court_name}} on {{hearing_date}}. Please be present on time. Thank you.
```

## Sample Make.com Scenario Structure

```
┌─────────────────────────┐
│  Webhook Trigger        │
│  (Receives JSON)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Router                 │
│  (Split by type)        │
└─┬─────────┬─────────┬───┘
  │         │         │
  ▼         ▼         ▼
┌───┐    ┌───┐    ┌────┐
│WA │    │SMS│    │Voice│
└───┘    └───┘    └────┘
  │         │         │
  ▼         ▼         ▼
┌─────────────────────────┐
│  Log to Google Sheets   │
│  (Optional tracking)    │
└─────────────────────────┘
```

## Phone Number Format

All phone numbers are sent in Indian format without country code:
- Format: `9988776655` (10 digits)
- For Twilio, prepend with country code: `+919988776655`

In Make.com:
```
Phone: +91{{client_phone}}
```

## Automatic Reminders

You can also set up automatic daily reminders using the same webhook:

### Create a Scheduled Scenario in Make.com

1. **Schedule Module**: Run daily at 9:00 AM
2. **HTTP Module**: 
   ```
   Method: POST
   URL: https://vakil-live-1.preview.emergentagent.com/api/notifications/trigger-auto-reminders
   Headers:
     - Authorization: Bearer {LAWYER_JWT_TOKEN}
     - Content-Type: application/json
   ```
3. This will automatically trigger reminders for all hearings in the next 24 hours
4. Each reminder will be sent to your webhook with the same JSON structure

## Troubleshooting

### Check Webhook in Make.com
1. Go to your scenario
2. Click on the webhook module
3. View "History" to see all received payloads

### Test from VakilDesk
1. Go to any Client Detail page
2. Click any Communication Hub button
3. Check Make.com history for the payload

### Common Issues

**Issue**: Webhook not receiving data
- **Solution**: Verify the webhook URL is correct in both `.env` files
- **Check**: Make.com webhook is in "Listening" state

**Issue**: Phone number format wrong
- **Solution**: Add `+91` prefix in Make.com: `+91{{client_phone}}`

**Issue**: Date format needs conversion
- **Solution**: Use Make.com's `formatDate()` function if needed

## Data Logging

All notifications sent are logged in MongoDB:
- Collection: `notification_logs`
- Includes: timestamp, status (sent/failed), full payload

Query logs:
```javascript
db.notification_logs.find().sort({sent_at: -1}).limit(10)
```

## Next Steps

1. ✅ Webhook configured and tested
2. Configure your Make.com scenario with the three routes (WhatsApp/SMS/Voice)
3. Set up Twilio/WhatsApp Business API credentials in Make.com
4. Test end-to-end flow by clicking buttons in VakilDesk
5. Set up scheduled automatic reminders (optional)
6. Monitor Make.com execution logs

## Support

Your webhook is now live and sending data successfully. All three buttons (WhatsApp, SMS, Voice) are connected and working with your Make.com automation!

**Webhook Status**: 🟢 ACTIVE  
**Last Tested**: 2026-01-24 15:59:40 UTC  
**Test Results**: All buttons working ✅
