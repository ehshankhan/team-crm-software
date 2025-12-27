#!/bin/bash

echo "================================"
echo "Team CRM - Quick Deploy Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo ./deploy.sh)${NC}"
  exit 1
fi

echo "This script will deploy Team CRM in production mode."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Step 1: Check Docker
echo ""
echo "Step 1: Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Step 2: Check Docker Compose
echo ""
echo "Step 2: Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

# Step 3: Environment Setup
echo ""
echo "Step 3: Setting up environment..."
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}Creating .env.production from template...${NC}"

    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -hex 16)

    cat > .env.production << EOF
# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=team_crm_prod
DB_USER=crm_user
DB_PASSWORD=$DB_PASSWORD

# JWT Security
JWT_SECRET=$JWT_SECRET
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
EOF

    echo -e "${GREEN}✓ Environment file created${NC}"
    echo -e "${YELLOW}⚠ Please edit .env.production and update coordinates if needed${NC}"
else
    echo -e "${GREEN}✓ Environment file exists${NC}"
fi

# Step 4: Create production docker-compose
echo ""
echo "Step 4: Creating production configuration..."
if [ ! -f docker-compose.prod.yml ]; then
    cp docker-compose.yml docker-compose.prod.yml
    echo -e "${GREEN}✓ Production docker-compose created${NC}"
else
    echo -e "${GREEN}✓ Production docker-compose exists${NC}"
fi

# Step 5: Build and start containers
echo ""
echo "Step 5: Building and starting containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
echo ""
echo "Waiting for services to start..."
sleep 10

# Step 6: Run migrations
echo ""
echo "Step 6: Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# Step 7: Seed database
echo ""
echo "Step 7: Seeding initial data..."
docker-compose -f docker-compose.prod.yml exec -T backend python seed.py

# Step 8: Check status
echo ""
echo "Step 8: Checking deployment status..."
echo ""

if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Services are running!${NC}"
    echo ""
    echo "================================"
    echo "DEPLOYMENT SUCCESSFUL!"
    echo "================================"
    echo ""
    echo "Access your application:"
    echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3001"
    echo "  Backend API: http://$(hostname -I | awk '{print $1}'):8000"
    echo "  API Docs: http://$(hostname -I | awk '{print $1}'):8000/docs"
    echo ""
    echo "Default admin credentials:"
    echo "  Email: admin@example.com"
    echo "  Password: admin123"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Change admin password immediately!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Set up domain and SSL (see DEPLOYMENT.md)"
    echo "  2. Configure firewall"
    echo "  3. Set up backups"
    echo "  4. Change default passwords"
    echo ""
else
    echo -e "${RED}✗ Deployment failed. Check logs:${NC}"
    echo "  docker-compose -f docker-compose.prod.yml logs"
fi

# Step 9: Show useful commands
echo ""
echo "Useful commands:"
echo "  View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop:         docker-compose -f docker-compose.prod.yml down"
echo "  Restart:      docker-compose -f docker-compose.prod.yml restart"
echo "  Update:       git pull && docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
