# Team CRM System - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [Production Deployment](#production-deployment)
5. [Domain & SSL Setup](#domain--ssl-setup)
6. [Post-Deployment](#post-deployment)

---

## Prerequisites

### Required Software
- **Docker** and **Docker Compose** (recommended)
- **Node.js** 18+ and **npm** (for frontend)
- **Python** 3.10+ (for backend)
- **PostgreSQL** 15+ (for database)
- **Git** (for code management)

### Required Accounts
- Cloud provider account (AWS, DigitalOcean, Linode, etc.)
- Domain name (optional but recommended)
- SSL certificate provider (Let's Encrypt is free)

---

## Environment Setup

### 1. Production Environment Variables

Create a `.env.production` file in the root directory:

```bash
# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=team_crm_prod
DB_USER=crm_user
DB_PASSWORD=STRONG_PASSWORD_HERE_CHANGE_THIS

# JWT Security
JWT_SECRET=GENERATE_RANDOM_SECRET_KEY_HERE_64_CHARS
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Office Location (GPS Validation)
LAB_LATITUDE=28.544396761789827
LAB_LONGITUDE=77.19271651688473
LAB_RADIUS_METERS=200

# App Configuration
DEBUG=false
API_V1_PREFIX=/api/v1

# CORS (Update with your frontend domain)
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 2. Generate Secure Secrets

```bash
# Generate JWT Secret (Linux/Mac)
openssl rand -hex 32

# Or using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Deployment Options

### Option 1: Docker Deployment (Recommended)

**Advantages:**
- Easy setup and configuration
- Consistent environment
- Easy updates and rollbacks
- Isolated dependencies

**Best for:** VPS (DigitalOcean, Linode, AWS EC2)

### Option 2: Vercel + Supabase

**Advantages:**
- Serverless architecture
- Auto-scaling
- Built-in CDN
- Free tier available

**Best for:** Small to medium teams, low cost

### Option 3: Traditional VPS

**Advantages:**
- Full control
- Cost-effective for larger teams
- Custom configurations

**Best for:** Organizations with specific requirements

---

## Production Deployment

### A. Docker Deployment (VPS)

#### Step 1: Prepare Your Server

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Step 2: Clone and Configure

```bash
# Clone your repository
git clone https://github.com/your-username/team-crm-software.git
cd team-crm-software

# Copy and edit environment file
cp .env.example .env.production
nano .env.production  # Edit with your production values

# Create production docker-compose
cp docker-compose.yml docker-compose.prod.yml
```

#### Step 3: Update Production Docker Compose

Edit `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: crm_db_prod
    env_file:
      - .env.production
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
    networks:
      - crm_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: crm_backend_prod
    env_file:
      - .env.production
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - crm_network
    restart: unless-stopped
    expose:
      - "8000"

  frontend:
    build:
      context: ./web-crm
      dockerfile: Dockerfile.prod
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    container_name: crm_frontend_prod
    networks:
      - crm_network
    restart: unless-stopped
    expose:
      - "3000"

  nginx:
    image: nginx:alpine
    container_name: crm_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - crm_network
    restart: unless-stopped

volumes:
  postgres_data_prod:

networks:
  crm_network:
    driver: bridge
```

#### Step 4: Create Production Dockerfiles

**Backend Dockerfile (`backend/Dockerfile.prod`):**

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run migrations and start server
CMD alembic upgrade head && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Frontend Dockerfile (`web-crm/Dockerfile.prod`):**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build application
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

#### Step 5: Configure Nginx

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API Docs
        location /docs {
            proxy_pass http://backend;
            proxy_set_header Host $host;
        }
    }
}
```

#### Step 6: Deploy

```bash
# Build and start containers
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Seed initial data (roles, admin user)
docker-compose -f docker-compose.prod.yml exec backend python seed.py
```

---

### B. Vercel + Supabase Deployment

#### Step 1: Setup Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a project
2. Get your database connection string
3. Run migrations manually or use Supabase SQL editor

#### Step 2: Deploy Backend to Railway/Render

**Using Railway:**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

**Using Render:**

1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect your GitHub repository
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables

#### Step 3: Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd web-crm

# Deploy
vercel --prod
```

---

### C. Traditional VPS Deployment

#### Install Dependencies

```bash
# Install Python
sudo apt install python3.10 python3-pip python3-venv

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx
sudo apt install nginx
```

#### Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed database
python seed.py

# Create systemd service
sudo nano /etc/systemd/system/crm-backend.service
```

**Backend Service File:**

```ini
[Unit]
Description=Team CRM Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/team-crm-software/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable crm-backend
sudo systemctl start crm-backend
```

#### Setup Frontend

```bash
cd web-crm

# Install dependencies
npm ci --production

# Build
npm run build

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "crm-frontend" -- start
pm2 save
pm2 startup
```

---

## Domain & SSL Setup

### Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (runs automatically)
sudo certbot renew --dry-run
```

### DNS Configuration

Point your domain to your server:

```
A Record:  @        ->  YOUR_SERVER_IP
A Record:  www      ->  YOUR_SERVER_IP
```

---

## Post-Deployment

### 1. Security Checklist

- [ ] Change all default passwords
- [ ] Enable firewall (UFW)
- [ ] Configure fail2ban
- [ ] Set up automatic backups
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up monitoring

### 2. Firewall Setup

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 3. Database Backups

```bash
# Create backup script
nano /home/backup-crm.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker exec crm_db_prod pg_dump -U crm_user team_crm_prod > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -type f -mtime +7 -delete
```

```bash
# Make executable
chmod +x /home/backup-crm.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/backup-crm.sh
```

### 4. Monitoring

Install monitoring tools:

```bash
# Install htop
sudo apt install htop

# Install docker stats
docker stats

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Update Procedure

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.prod.yml up -d --build

# Run new migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## Recommended VPS Providers

1. **DigitalOcean** - $6/month (1GB RAM, 25GB SSD)
2. **Linode** - $5/month (1GB RAM, 25GB SSD)
3. **Vultr** - $6/month (1GB RAM, 25GB SSD)
4. **AWS Lightsail** - $5/month (512MB RAM, 20GB SSD)
5. **Hetzner** - €4.51/month (2GB RAM, 40GB SSD)

**Recommended:** Start with 2GB RAM minimum for production.

---

## Support & Troubleshooting

### Common Issues

**Issue:** Database connection failed
```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# Check logs
docker-compose -f docker-compose.prod.yml logs db
```

**Issue:** Frontend not loading
```bash
# Check frontend logs
docker-compose -f docker-compose.prod.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

**Issue:** API not accessible
```bash
# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Verify backend is running
curl http://localhost:8000/api/v1/docs
```

---

## Performance Optimization

1. **Enable Redis caching**
2. **Use CDN for static assets**
3. **Configure database connection pooling**
4. **Enable Gzip compression in Nginx**
5. **Implement rate limiting**

---

## Maintenance

### Regular Tasks

- **Weekly:** Check logs for errors
- **Monthly:** Review security updates
- **Quarterly:** Test backup restoration
- **Yearly:** Review and update dependencies

---

For questions or issues, refer to the main [README.md](README.md) or create an issue on GitHub.
