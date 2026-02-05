# Raspberry Pi Deployment Guide

## Prerequisites

Ensure your Raspberry Pi has the following installed:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.10+ and pip
sudo apt install python3 python3-pip python3-venv -y

# Install Node.js 18+ (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install build tools (may be needed for bcrypt)
sudo apt install build-essential libffi-dev -y

# Verify installations
python3 --version  # Should be 3.10+
node --version     # Should be 18+
npm --version
psql --version
```

## Database Setup

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE assessment_db;
CREATE USER assessmentuser WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE assessment_db TO assessmentuser;
\c assessment_db
GRANT ALL ON SCHEMA public TO assessmentuser;
EOF
```

## Application Setup

### 1. Clone/Copy the Application

```bash
# Copy files to Raspberry Pi (from your computer)
scp -r /path/to/Test pi@<raspberry-pi-ip>:~/shakham-assessment

# Or clone from git
git clone <your-repo-url> ~/shakham-assessment
cd ~/shakham-assessment
```

### 2. Configure Environment Variables

```bash
cd ~/shakham-assessment

# Backend configuration
cat > backend/.env << EOF
DATABASE_URL=postgresql://assessmentuser:your_secure_password@localhost:5432/assessment_db
CORS_ORIGINS=*
ADMIN_EMAIL=admin@shakham.com
ADMIN_PASSWORD=PASSWORD!@123
JWT_SECRET=$(openssl rand -hex 32)
SESSION_TIMEOUT_MINUTES=60
EOF

# Frontend configuration
cat > .env.local << EOF
VITE_API_URL=http://$(hostname -I | awk '{print $1}'):8000/api
VITE_BASE_URL=/
VITE_API_TARGET=http://localhost:8000
EOF
```

### 3. Install Dependencies

```bash
# Backend dependencies
cd ~/shakham-assessment/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend dependencies
cd ~/shakham-assessment
npm install
```

### 4. Make Start Script Executable

```bash
chmod +x start.sh
```

## Running the Application

### Start Services

```bash
./start.sh start
```

### Stop Services

```bash
./start.sh stop
```

### Restart Services

```bash
./start.sh restart
```

### Check Status

```bash
./start.sh status
```

### View Logs

```bash
./start.sh logs

# Or tail specific logs
tail -f logs/backend.log
tail -f logs/frontend.log
```

## Accessing the Application

After starting, access the application at:

- **Landing Page**: `http://<raspberry-pi-ip>:5173`
- **Admin Dashboard**: `http://<raspberry-pi-ip>:5173` → Click "Admin Dashboard"
- **API Docs**: `http://<raspberry-pi-ip>:8000/docs`

### Default Admin Credentials

- Email: `admin@shakham.com`
- Password: `PASSWORD!@123`

## Auto-Start on Boot (Systemd)

### Create Backend Service

```bash
sudo tee /etc/systemd/system/shakham-backend.service << EOF
[Unit]
Description=Shakham Assessment Backend
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/shakham-assessment/backend
Environment=PATH=/home/pi/shakham-assessment/backend/venv/bin
ExecStart=/home/pi/shakham-assessment/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### Create Frontend Service

```bash
sudo tee /etc/systemd/system/shakham-frontend.service << EOF
[Unit]
Description=Shakham Assessment Frontend
After=network.target shakham-backend.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/shakham-assessment
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### Enable Auto-Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable shakham-backend
sudo systemctl enable shakham-frontend
sudo systemctl start shakham-backend
sudo systemctl start shakham-frontend
```

### Check Service Status

```bash
sudo systemctl status shakham-backend
sudo systemctl status shakham-frontend
```

## Production Deployment (Optional)

For production, consider:

### 1. Build Frontend

```bash
npm run build
```

Then serve the `dist` folder with nginx.

### 2. Install Nginx

```bash
sudo apt install nginx -y
```

### 3. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/shakham << EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /home/pi/shakham-assessment/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/shakham /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Troubleshooting

### Check if ports are in use

```bash
sudo lsof -i :8000
sudo lsof -i :5173
```

### Check PostgreSQL connection

```bash
psql -U assessmentuser -d assessment_db -h localhost -c "SELECT 1;"
```

### View system logs

```bash
sudo journalctl -u shakham-backend -f
sudo journalctl -u shakham-frontend -f
```

### Common Issues

1. **bcrypt compilation fails**: Install build-essential
   ```bash
   sudo apt install build-essential libffi-dev
   ```

2. **Permission denied on port 80**: Use port 8080 or run with sudo

3. **Database connection refused**: Ensure PostgreSQL is running
   ```bash
   sudo systemctl start postgresql
   ```

## Network Access

To access from other devices on the network:

1. Find Raspberry Pi IP:
   ```bash
   hostname -I
   ```

2. Ensure firewall allows connections:
   ```bash
   sudo ufw allow 8000
   sudo ufw allow 5173
   sudo ufw allow 80
   ```
