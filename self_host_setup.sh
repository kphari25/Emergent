#!/bin/bash

# Tatva Ayurved - Quick Setup Script
# Run this on a fresh Ubuntu 20.04+ server

set -e

echo "=========================================="
echo "  Tatva Ayurved - Self-Hosting Setup"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo ./self_host_setup.sh)${NC}"
    exit 1
fi

# Get configuration from user
echo ""
echo -e "${YELLOW}Please provide the following information:${NC}"
echo ""

read -p "Enter your domain name (e.g., tatva.example.com): " DOMAIN_NAME
read -p "Enter MongoDB connection string: " MONGO_URL
read -p "Enter a strong JWT secret (random string): " JWT_SECRET

echo ""
echo -e "${GREEN}Starting installation...${NC}"
echo ""

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git curl

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install yarn and PM2
echo "📦 Installing yarn and PM2..."
npm install -g yarn pm2

# Create app directory
APP_DIR="/var/www/tatva-ayurved"
echo "📁 Creating application directory at $APP_DIR..."
mkdir -p $APP_DIR

# Check if files exist in current directory
if [ -f "./backend/server.py" ]; then
    echo "📁 Copying application files..."
    cp -r ./* $APP_DIR/
else
    echo -e "${RED}Error: Application files not found in current directory${NC}"
    echo "Please run this script from the application root directory"
    exit 1
fi

# Setup Backend
echo "🐍 Setting up backend..."
cd $APP_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create backend .env
cat > .env << EOF
MONGO_URL=$MONGO_URL
DB_NAME=tatva_ayurved
JWT_SECRET=$JWT_SECRET
EOF

deactivate

# Setup Frontend
echo "⚛️ Setting up frontend..."
cd $APP_DIR/frontend

# Create frontend .env
cat > .env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN_NAME
EOF

yarn install
yarn build

# Create PM2 ecosystem file
echo "🔧 Configuring PM2..."
cd $APP_DIR/backend
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tatva-backend',
    script: 'venv/bin/uvicorn',
    args: 'server:app --host 0.0.0.0 --port 8001',
    cwd: '/var/www/tatva-ayurved/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/tatva-ayurved << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    location / {
        root /var/www/tatva-ayurved/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        client_max_body_size 50M;
    }
}
EOF

ln -sf /etc/nginx/sites-available/tatva-ayurved /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx

# Start backend with PM2
echo "🚀 Starting backend..."
cd $APP_DIR/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Set permissions
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

echo ""
echo -e "${GREEN}=========================================="
echo "  Installation Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Point your domain DNS to this server's IP"
echo "2. Run: sudo certbot --nginx -d $DOMAIN_NAME"
echo "3. Create admin user (see SELF_HOSTING_GUIDE.md)"
echo ""
echo -e "Your app will be available at: ${GREEN}https://$DOMAIN_NAME${NC}"
echo ""
