# VakilDot - Hostinger VPS Deployment Guide
## Step-by-Step Complete Setup

---

## Prerequisites
- Hostinger VPS plan (minimum VPS KVM 1 - 4GB RAM recommended)
- Domain name (e.g., vakildot.com) pointed to your VPS IP
- SSH access to your VPS
- Firebase project credentials (serviceAccountKey.json)

---

## Step 1: VPS Initial Setup

### 1.1 Login to VPS via SSH
```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Update system
```bash
apt update && apt upgrade -y
```

### 1.3 Create a non-root user (recommended)
```bash
adduser vakildot
usermod -aG sudo vakildot
su - vakildot
```

---

## Step 2: Install Required Software

### 2.1 Install Node.js (v18+)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Should show v18.x
npm -v
```

### 2.2 Install Python 3.11+ & pip
```bash
sudo apt install -y python3 python3-pip python3-venv
python3 --version  # Should show 3.11+
```

### 2.3 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2 yarn
```

### 2.5 Install Certbot for SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 3: Upload Your Code

### Option A: Using Git (Recommended)
```bash
cd /home/vakildot
git clone YOUR_REPO_URL vakildot-app
cd vakildot-app
```

### Option B: Using SCP/SFTP
```bash
# From your local machine:
scp -r /path/to/app vakildot@YOUR_VPS_IP:/home/vakildot/vakildot-app
```

---

## Step 4: Setup Backend

### 4.1 Create Python virtual environment
```bash
cd /home/vakildot/vakildot-app/backend
python3 -m venv venv
source venv/bin/activate
```

### 4.2 Install dependencies
```bash
pip install -r requirements.txt
```

### 4.3 Setup environment variables
```bash
nano .env
```

Add these values (change as needed):
```env
JWT_SECRET=your-strong-secret-key-change-this
CORS_ORIGINS=https://vakildot.com,https://www.vakildot.com
AGORA_APP_ID=cb1117d8b0af48b7bb53e2536e717a21
AGORA_APP_CERTIFICATE=00081798e38949d1a6d7a269ebc36b9d
SUPABASE_URL=https://elxueimqqbcahlffwbcy.supabase.co
SUPABASE_KEY=your-supabase-key
```

### 4.4 Upload Firebase Service Account Key
```bash
# Copy your serviceAccountKey.json to the backend folder
scp serviceAccountKey.json vakildot@YOUR_VPS_IP:/home/vakildot/vakildot-app/backend/
```

### 4.5 Test backend locally
```bash
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
# Visit http://YOUR_VPS_IP:8001/health to verify
# Press Ctrl+C to stop
```

---

## Step 5: Setup Frontend

### 5.1 Install dependencies
```bash
cd /home/vakildot/vakildot-app/frontend
yarn install
```

### 5.2 Setup environment variables
```bash
nano .env
```

```env
REACT_APP_BACKEND_URL=https://vakildot.com
REACT_APP_AGORA_APP_ID=cb1117d8b0af48b7bb53e2536e717a21
```

**Important:** `REACT_APP_BACKEND_URL` should be your domain with https.

### 5.3 Build the frontend
```bash
yarn build
```

This creates a `build/` folder with static files.

---

## Step 6: Configure Nginx

### 6.1 Create Nginx config
```bash
sudo nano /etc/nginx/sites-available/vakildot
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name vakildot.com www.vakildot.com;

    # Frontend - React static files
    root /home/vakildot/vakildot-app/frontend/build;
    index index.html;

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 10M;
    }

    # WebSocket support (for chat)
    location /ws/ {
        proxy_pass http://127.0.0.1:8001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8001/health;
    }

    # React SPA - all other routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
```

### 6.2 Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/vakildot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t  # Test config
sudo systemctl reload nginx
```

---

## Step 7: SSL Certificate (HTTPS)

```bash
sudo certbot --nginx -d vakildot.com -d www.vakildot.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose to redirect HTTP to HTTPS (option 2)

Auto-renewal is set up automatically. Test with:
```bash
sudo certbot renew --dry-run
```

---

## Step 8: Start Services with PM2

### 8.1 Start Backend
```bash
cd /home/vakildot/vakildot-app/backend
pm2 start "source venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2" --name vakildot-backend
```

### 8.2 Save PM2 config & enable startup
```bash
pm2 save
pm2 startup
# Run the command PM2 outputs (sudo env PATH=...)
```

### 8.3 Verify
```bash
pm2 status
pm2 logs vakildot-backend
```

---

## Step 9: Firewall Setup

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

## Step 10: Verify Everything

### Check backend
```bash
curl http://localhost:8001/health
```

### Check frontend
Open `https://vakildot.com` in your browser.

### Check API through Nginx
```bash
curl https://vakildot.com/api/live/lawyers/live
```

---

## Common Commands

### Restart services
```bash
pm2 restart vakildot-backend
sudo systemctl reload nginx
```

### View logs
```bash
pm2 logs vakildot-backend --lines 100
```

### Update code
```bash
cd /home/vakildot/vakildot-app
git pull

# Rebuild frontend
cd frontend && yarn build

# Restart backend
pm2 restart vakildot-backend
```

### Monitor
```bash
pm2 monit
```

---

## Troubleshooting

### Backend not starting?
```bash
cd /home/vakildot/vakildot-app/backend
source venv/bin/activate
python -c "from server import app; print('OK')"
```

### Nginx errors?
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### SSL not working?
```bash
sudo certbot certificates
sudo certbot renew
```

### Firebase not connecting?
- Verify `serviceAccountKey.json` exists in backend folder
- Check file permissions: `chmod 600 serviceAccountKey.json`

---

## Domain Setup (Hostinger DNS)

1. Go to Hostinger hPanel -> Domains -> DNS Zone
2. Add/Edit A Record:
   - Type: A
   - Name: @ (or vakildot.com)
   - Points to: YOUR_VPS_IP
   - TTL: 14400
3. Add CNAME for www:
   - Type: CNAME
   - Name: www
   - Points to: vakildot.com
   - TTL: 14400
4. Wait 5-30 minutes for DNS propagation

---

## Cost Estimate
- Hostinger VPS KVM 1: ~$5.99/month (4GB RAM)
- Domain: ~$10/year
- SSL: FREE (Let's Encrypt via Certbot)
- Total: ~$7/month

---

**Note:** Code is the SAME - no changes needed. Only the .env files and Nginx config are different for VPS deployment.
