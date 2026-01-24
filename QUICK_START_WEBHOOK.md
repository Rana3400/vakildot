# VakilDesk - Quick Start Guide for Webhook Integration

## 🚀 What's Been Configured

Your VakilDesk application now sends HTTP POST requests to an external webhook whenever you click the Communication Hub buttons (WhatsApp, SMS, Voice Call).

## 📋 Payload Structure Sent to Webhook

```json
{
  "client_name": "Mr. Amit Sharma",
  "client_phone": "9988776655",
  "hearing_date": "2025-02-15",
  "case_description": "Criminal case - theft charges",
  "notification_type": "whatsapp",
  "case_number": "CRL/456/2025",
  "court_name": "Delhi District Court",
  "timestamp": "2025-01-24T14:30:00.000Z",
  "lawyer_name": "Adv. Rajesh Kumar",
  "lawyer_mobile": "9876543210"
}
```

## 🔧 How to Connect to Make.com (5 minutes)

### Step 1: Create Your Webhook
1. Go to [Make.com](https://www.make.com) (free account works)
2. Create a new scenario
3. Add "Webhooks" → "Custom webhook"
4. Copy the webhook URL (looks like: `https://hook.us1.make.com/xxxxx`)

### Step 2: Update Environment Variables
Edit `/app/backend/.env`:
```bash
WEBHOOK_URL=https://hook.us1.make.com/YOUR-ACTUAL-WEBHOOK-ID-HERE
```

Edit `/app/frontend/.env`:
```bash
REACT_APP_WEBHOOK_URL=https://hook.us1.make.com/YOUR-ACTUAL-WEBHOOK-ID-HERE
```

### Step 3: Restart Services
```bash
sudo supervisorctl restart backend frontend
```

### Step 4: Test the Integration
1. Go to any Client Detail page in VakilDesk
2. Click any Communication Hub button (WhatsApp/SMS/Voice)
3. Check your Make.com scenario - you'll see the payload received!

## 📱 Setting Up WhatsApp/SMS/Voice in Make.com

### For WhatsApp (Option 1: Twilio)
After your webhook, add:
1. **Router** module
2. Add filter: `notification_type = whatsapp`
3. Add **Twilio** → "Send WhatsApp Message"
4. Configure:
   - From: Your Twilio WhatsApp number
   - To: `{{client_phone}}`
   - Body:
   ```
   Hello {{client_name}},
   
   Reminder for your court hearing:
   📋 Case: {{case_number}}
   🏛️ Court: {{court_name}}
   📅 Date: {{hearing_date}}
   
   {{case_description}}
   
   Regards,
   {{lawyer_name}}
   ```

### For SMS (Twilio)
1. Add another route with filter: `notification_type = sms`
2. Add **Twilio** → "Send SMS"
3. Use similar message template

### For Voice Call (Twilio Voice)
1. Add route with filter: `notification_type = voice`
2. Add **Twilio** → "Make a Call"
3. Configure TwiML with text-to-speech

## ⏰ Automatic Daily Reminders

### Option 1: Make.com Scheduled Scenario
1. Create a NEW scenario in Make.com
2. Add **Schedule** module (run daily at 9:00 AM)
3. Add **HTTP** module:
   - URL: `{YOUR_BACKEND_URL}/api/notifications/trigger-auto-reminders`
   - Method: POST
   - Headers: 
     - `Authorization: Bearer {YOUR_JWT_TOKEN}`
     - `Content-Type: application/json`
4. Add error handling and logging

### Option 2: Cron Job (Linux)
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 9 AM)
0 9 * * * curl -X POST "YOUR_BACKEND_URL/api/notifications/trigger-auto-reminders" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 Testing Your Setup

### Test API Directly
```bash
curl -X POST "YOUR_BACKEND_URL/api/notifications/send-webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "client_name": "Test Client",
    "client_phone": "9999999999",
    "hearing_date": "2025-02-15",
    "case_description": "Test notification",
    "notification_type": "whatsapp",
    "case_number": "TEST/001",
    "court_name": "Test Court"
  }'
```

### Check Upcoming Reminders
```bash
curl -X GET "YOUR_BACKEND_URL/api/notifications/upcoming-reminders" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Available API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications/send-webhook` | POST | Send single notification manually |
| `/api/notifications/upcoming-reminders` | GET | Get cases needing reminders in next 24h |
| `/api/notifications/trigger-auto-reminders` | POST | Send all upcoming reminders (for cron) |

## 🔐 Getting Your JWT Token

1. Login to VakilDesk
2. Open browser console (F12)
3. Type: `localStorage.getItem('vakildesk_token')`
4. Copy the token (valid for 30 days)

## 💡 Pro Tips

1. **Test with RequestBin first**: Use [requestbin.com](https://requestbin.com) to see exact payloads before connecting real services
2. **Use Make.com's Data Store**: Log all notifications to track delivery
3. **Add retry logic**: Configure Make.com to retry failed sends
4. **Monitor costs**: Twilio charges per message - set alerts
5. **Indian phone format**: Ensure numbers are in format: +919999999999

## 🎯 What Works Now

✅ Manual notifications from Communication Hub  
✅ Webhook sends complete case + client data  
✅ Notification logging in database  
✅ API endpoint for automatic reminders  
✅ Upcoming reminders detection (24h window)  
✅ Support for WhatsApp, SMS, and Voice  

## 📚 Full Documentation

See `/app/WEBHOOK_SETUP_GUIDE.md` for detailed setup instructions including:
- Alternative platforms (Zapier, n8n)
- Advanced Make.com scenarios
- Troubleshooting guide
- Security best practices

## 🆘 Need Help?

Common issues:
1. **404 error**: Webhook URL not set correctly in .env
2. **401 error**: JWT token expired or invalid
3. **No data received**: Check Make.com webhook is "Listening"
4. **Wrong phone format**: Must be international format (+91xxxxxxxxxx)

Check logs:
```bash
tail -f /var/log/supervisor/backend.err.log
```

## 🎉 Next Steps

1. Set up your Make.com webhook URL
2. Test manual notifications
3. Configure WhatsApp/SMS/Voice flows
4. Set up automatic daily reminders
5. Monitor and optimize delivery rates!
