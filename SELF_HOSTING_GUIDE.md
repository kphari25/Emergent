# Tatva Ayurved - Self-Hosting Guide

Complete guide to deploy Tatva Ayurved Hospital Management System on your own server.

---

## 📋 Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 1 GB | 2 GB |
| Storage | 10 GB | 20 GB |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 |
| Python | 3.9+ | 3.11 |
| Node.js | 16+ | 18+ |

---

## 🖥️ Server Options (Choose One)

### Option A: Cloud Providers (Recommended)

| Provider | Free Tier | Paid |
|----------|-----------|------|
| [DigitalOcean](https://digitalocean.com) | $200 credit (60 days) | $4-6/month |
| [AWS EC2](https://aws.amazon.com) | 12 months free (t2.micro) | ~$5/month |
| [Google Cloud](https://cloud.google.com) | $300 credit (90 days) | ~$5/month |
| [Linode](https://linode.com) | - | $5/month |
| [Vultr](https://vultr.com) | - | $5/month |
| [Railway](https://railway.app) | $5 free/month | Pay as you go |
| [Render](https://render.com) | Free tier available | $7/month |

### Option B: Local Server / Raspberry Pi
- Works on any Linux machine
- Requires port forwarding for external access

---

## 🗄️ Database Setup (MongoDB)

### Option 1: MongoDB Atlas (FREE - Recommended)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free account
3. Create a **FREE** M0 cluster (512 MB storage)
4. Click "Connect" → "Connect your application"
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with your credentials

### Option 2: Self-Hosted MongoDB

```bash
# Install MongoDB on Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

Connection string for local: `mongodb://localhost:27017`

---

## 🚀 Step-by-Step Deployment

### Step 1: Server Setup

```bash
# Connect to your server
ssh root@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx git curl

# Install Node.js 18 (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install yarn
npm install -g yarn

# Install PM2 (process manager)
npm install -g pm2
```

### Step 2: Clone/Upload Application

```bash
# Create app directory
sudo mkdir -p /var/www/tatva-ayurved
cd /var/www/tatva-ayurved

# Option A: Clone from GitHub (if you pushed to GitHub)
git clone https://github.com/YOUR_USERNAME/tatva-ayurved.git .

# Option B: Upload via SCP from your local machine
# Run this on YOUR LOCAL machine (not server):
# scp -r /path/to/app/* root@your-server-ip:/var/www/tatva-ayurved/
```

### Step 3: Backend Setup

```bash
cd /var/www/tatva-ayurved/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create environment file
cat > .env << 'EOF'
MONGO_URL=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=tatva_ayurved
JWT_SECRET=your-super-secret-key-change-this-to-something-random-and-long
EOF

# Test backend
python3 -c "from server import app; print('Backend OK!')"
```

### Step 4: Frontend Setup

```bash
cd /var/www/tatva-ayurved/frontend

# Install dependencies
yarn install

# Create environment file
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://your-domain.com
EOF

# Build production version
yarn build
```

### Step 5: Configure Nginx

```bash
# Create Nginx configuration
sudo cat > /etc/nginx/sites-available/tatva-ayurved << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend (React build)
    location / {
        root /var/www/tatva-ayurved/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        client_max_body_size 50M;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/tatva-ayurved /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Start Backend with PM2

```bash
cd /var/www/tatva-ayurved/backend

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tatva-backend',
    script: 'venv/bin/uvicorn',
    args: 'server:app --host 0.0.0.0 --port 8001',
    cwd: '/var/www/tatva-ayurved/backend',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF

# Start backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 7: Setup SSL (HTTPS) - FREE with Let's Encrypt

```bash
# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (already set up by certbot)
sudo systemctl enable certbot.timer
```

---

## 🔐 Create Admin User

After deployment, create your admin user:

```bash
cd /var/www/tatva-ayurved/backend
source venv/bin/activate

python3 << 'EOF'
import bcrypt
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

async def create_admin():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'tatva_ayurved')]
    
    # Check if admin exists
    existing = await db.users.find_one({'email': 'admin@tatva.com'})
    if existing:
        print('Admin already exists!')
        return
    
    # Create admin
    password = 'admin1234'  # CHANGE THIS!
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    
    await db.users.insert_one({
        'id': str(uuid.uuid4()),
        'email': 'admin@tatva.com',
        'name': 'Administrator',
        'password': hashed,
        'role': 'admin',
        'is_active': True
    })
    
    print('✅ Admin user created!')
    print('Email: admin@tatva.com')
    print('Password: admin1234')
    print('\n⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!')
    
    client.close()

asyncio.run(create_admin())
EOF
```

---

## 🌐 Domain Setup

### Option A: Free Subdomain (No Cost)
- [Freenom](https://freenom.com) - Free .tk, .ml, .ga domains
- [DuckDNS](https://duckdns.org) - Free dynamic DNS subdomain
- [No-IP](https://noip.com) - Free dynamic DNS

### Option B: Paid Domain (~$10/year)
- [Namecheap](https://namecheap.com)
- [Google Domains](https://domains.google)
- [Cloudflare](https://cloudflare.com)

### DNS Configuration
Point your domain to your server IP:
```
Type: A
Name: @
Value: YOUR_SERVER_IP

Type: A  
Name: www
Value: YOUR_SERVER_IP
```

---

## 📊 Useful Commands

```bash
# Check backend status
pm2 status

# View backend logs
pm2 logs tatva-backend

# Restart backend
pm2 restart tatva-backend

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Update application
cd /var/www/tatva-ayurved
git pull
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && yarn install && yarn build
pm2 restart tatva-backend
```

---

## 🔧 Troubleshooting

### Backend won't start
```bash
cd /var/www/tatva-ayurved/backend
source venv/bin/activate
python3 server.py  # Check for errors
```

### MongoDB connection issues
```bash
# Test connection
python3 -c "from motor.motor_asyncio import AsyncIOMotorClient; import os; from dotenv import load_dotenv; load_dotenv(); c = AsyncIOMotorClient(os.environ['MONGO_URL']); print('Connected!')"
```

### Nginx 502 Bad Gateway
```bash
# Check if backend is running
pm2 status

# Check backend port
curl http://localhost:8001/api/health
```

### Permission issues
```bash
sudo chown -R www-data:www-data /var/www/tatva-ayurved
sudo chmod -R 755 /var/www/tatva-ayurved
```

---

## 💰 Cost Summary

| Component | Free Option | Paid Option |
|-----------|-------------|-------------|
| Server | AWS/GCP free tier | $4-6/month |
| Database | MongoDB Atlas M0 | $0 (free 512MB) |
| Domain | DuckDNS/Freenom | $10/year |
| SSL | Let's Encrypt | $0 (free) |
| **Total** | **$0/month** | **$5-6/month** |

---

## 📞 Support

If you face issues:
1. Check the logs: `pm2 logs` and `sudo tail -f /var/log/nginx/error.log`
2. Verify MongoDB connection
3. Ensure all environment variables are set correctly

---

**Your Tatva Ayurved system is now self-hosted! 🎉**
