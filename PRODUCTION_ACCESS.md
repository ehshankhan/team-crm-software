# Production Deployment - Access Information

## Deployment Status: ✅ SUCCESS

Your Team CRM system is now running in production mode!

---

## Access URLs

### Frontend (Web Application)
**URL:** http://localhost:3002

### Backend API
**URL:** http://localhost:8000
**API Documentation:** http://localhost:8000/docs

### Database
- **Host:** localhost (not exposed externally)
- **Port:** Internal Docker network only
- **Database:** team_crm_prod

---

## Default Admin Credentials

**⚠️ IMPORTANT: Change these credentials immediately in production!**

```
Email: admin@example.com
Password: admin123
```

---

## System Features

All modules are deployed and ready:

1. ✅ **User Management** - Create/edit users, assign roles
2. ✅ **Attendance System** - GPS-based check-in/out (200m radius)
3. ✅ **Timesheet Management** - Auto-generation and approval workflow
4. ✅ **Project Management** - Kanban boards with drag-and-drop
5. ✅ **Inventory Management** - Categories, items, stock tracking, alerts

---

## GPS Location Configuration

**Configured Location:**
- Latitude: 28.544396761789827
- Longitude: 77.19271651688473
- Radius: 200 meters

Users must be within 200 meters of this location to check in/out.

---

## Container Status

Check running containers:
```bash
docker-compose -f docker-compose.prod.yml ps
```

Expected output:
- ✅ crm_frontend_prod - Running on port 3002
- ✅ crm_backend_prod - Running on port 8000
- ✅ crm_db_prod - Running (healthy)

---

## Useful Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f db
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Update Deployment
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Run new migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## Database Backup

### Create Backup
```bash
docker exec crm_db_prod pg_dump -U crm_user team_crm_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Backup
```bash
cat backup_file.sql | docker exec -i crm_db_prod psql -U crm_user team_crm_prod
```

---

## Security Checklist

After deployment, complete these security tasks:

- [ ] Change admin password from default
- [ ] Update JWT secret in .env file
- [ ] Configure firewall rules
- [ ] Set up SSL certificate (for public deployment)
- [ ] Configure CORS for your domain
- [ ] Set up automatic database backups
- [ ] Enable authentication logs monitoring

---

## Troubleshooting

### Frontend Not Loading
```bash
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml restart frontend
```

### Backend API Errors
```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml exec backend alembic current
```

### Database Connection Issues
```bash
docker-compose -f docker-compose.prod.yml logs db
docker-compose -f docker-compose.prod.yml restart db
```

### Port Already in Use
If you get port conflict errors, edit `docker-compose.prod.yml` and change the port mappings:
- Frontend: Change `3002:3000` to `<new-port>:3000`
- Backend: Change `8000:8000` to `<new-port>:8000`

---

## Next Steps

1. **Access the system:** Open http://localhost:3002 in your browser
2. **Login with admin credentials:** admin@example.com / admin123
3. **Change admin password immediately**
4. **Create user accounts** for your team
5. **Configure GPS location** if different from default
6. **Test all features** to ensure everything works
7. **Set up backups** on a schedule

---

## For Public Deployment

If deploying to a VPS/cloud server:

1. Point your domain to the server IP
2. Set up Nginx reverse proxy (see DEPLOYMENT.md)
3. Configure SSL with Let's Encrypt
4. Update CORS settings in backend .env
5. Configure firewall (UFW)
6. Set up monitoring and alerts

See **DEPLOYMENT.md** and **DEPLOYMENT_QUICK_START.md** for detailed instructions.

---

**Deployment completed:** 2025-12-27
**Next.js version:** 14.2.3
**Python version:** 3.11
**PostgreSQL version:** 15
**Node version:** 18
