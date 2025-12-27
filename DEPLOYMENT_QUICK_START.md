# Quick Deployment Guide

## 🚀 Fastest Way to Deploy

### Option 1: One-Command VPS Deployment (Recommended)

**Requirements:** Ubuntu 20.04+ VPS with Docker support

```bash
# SSH into your server
ssh root@your-server-ip

# Clone repository
git clone https://github.com/your-username/team-crm-software.git
cd team-crm-software

# Run deployment script
chmod +x deploy.sh
sudo ./deploy.sh
```

**That's it!** Your CRM will be running at `http://your-server-ip:3001`

---

## 🌐 Popular Deployment Platforms

### 1. DigitalOcean (Easiest)

**Cost:** $6/month
**Setup Time:** 10 minutes

1. Create a Droplet (Ubuntu 22.04, 2GB RAM)
2. SSH into droplet
3. Run the deploy script above
4. Point your domain to the droplet IP
5. Set up SSL with Let's Encrypt

**Command:**
```bash
ssh root@your-droplet-ip
git clone <your-repo>
cd team-crm-software
sudo ./deploy.sh
```

### 2. Vercel + Railway (Free Tier Available)

**Frontend on Vercel, Backend on Railway**

**Vercel (Frontend):**
```bash
cd web-crm
npm install -g vercel
vercel --prod
```

**Railway (Backend):**
1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add PostgreSQL database
4. Deploy!

### 3. AWS Lightsail

**Cost:** $5/month
**Best for:** Scalability

1. Create Lightsail instance (Ubuntu, 1GB RAM)
2. Open ports: 80, 443, 8000, 3001
3. SSH and run deploy script
4. Attach static IP
5. Configure DNS

### 4. Heroku (Simplest)

**Frontend + Backend on Heroku**

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Deploy backend
cd backend
heroku create your-crm-backend
git push heroku main

# Deploy frontend
cd ../web-crm
heroku create your-crm-frontend
git push heroku main
```

---

## 📋 Pre-Deployment Checklist

- [ ] Update `.env.production` with your settings
- [ ] Change default admin password
- [ ] Set your GPS coordinates
- [ ] Set up database backups
- [ ] Configure CORS origins
- [ ] Get domain name (optional)
- [ ] Set up SSL certificate

---

## 🔒 Security First Steps (Critical!)

After deployment, immediately:

```bash
# 1. Change admin password
curl -X PUT http://your-server:8000/api/v1/users/admin-id \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"password": "new-strong-password"}'

# 2. Enable firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. Set up SSL (Let's Encrypt)
sudo apt install certbot
sudo certbot --nginx -d your-domain.com
```

---

## 🔄 Update Your Deployment

```bash
cd team-crm-software
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🐛 Troubleshooting

**Services not starting?**
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

**Database connection error?**
```bash
docker-compose -f docker-compose.prod.yml restart db
```

**Port already in use?**
```bash
# Change ports in docker-compose.prod.yml
# Frontend: 3001 -> 3002
# Backend: 8000 -> 8001
```

---

## 💰 Cost Comparison

| Provider | Monthly Cost | RAM | Storage | Best For |
|----------|-------------|-----|---------|----------|
| DigitalOcean | $6 | 1GB | 25GB | General use |
| Linode | $5 | 1GB | 25GB | Budget |
| AWS Lightsail | $5 | 512MB | 20GB | AWS ecosystem |
| Heroku | Free-$7 | 512MB | - | Simplicity |
| Railway | Free-$5 | 512MB | - | Hobby projects |
| Vercel + Supabase | Free | - | 500MB | Serverless |

**Recommended for production:** DigitalOcean or Linode (2GB RAM minimum)

---

## 📞 Need Help?

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guide
2. View logs: `docker-compose logs -f`
3. Check system: `docker-compose ps`

---

## ⚡ Quick Commands Reference

```bash
# Start
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose -f docker-compose.prod.yml down

# Restart
docker-compose -f docker-compose.prod.yml restart

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Backup database
docker exec crm_db pg_dump -U crm_user team_crm_prod > backup.sql

# Restore database
cat backup.sql | docker exec -i crm_db psql -U crm_user team_crm_prod
```

---

**Ready to deploy?** Choose your platform above and follow the steps! 🚀
