# ATS Saha - CasaOS, Cloudflare & Docker Deployment Guide

## Overview

This guide covers deploying the ATS Saha application with:
- **CasaOS** - Home server OS with Docker management
- **Cloudflare** - Free DNS + SSL + Tunnel for remote access
- **Docker** - Container runtime

---

## Prerequisites

- CasaOS installed on your server
- Cloudflare account (free tier sufficient)
- Domain name (optional but recommended)
- Server with public IP or Cloudflare Tunnel

---

## Part 1: Clone and Prepare

```bash
# SSH into your CasaOS server
ssh user@your-server-ip

# Navigate to app directory
cd /path/to/atssaha

# Or clone if not present
git clone <repository-url> atssaha
cd atssaha
```

---

## Part 2: Docker Compose Configuration

The project includes [`docker-compose.yml`](docker-compose.yml) with:
- **PocketBase** (port 8090) - Database server
- **Frontend** (port 80) - Production nginx server
- **Frontend-dev** (port 5173) - Development with hot reload

### Quick Start

```bash
# Development mode (with hot reload)
docker-compose --profile development up -d

# Production mode (requires build first)
docker-compose --profile production up -d --build
```

### CasaOS App Store Deployment

Create `/DATA/AppData/atssaha/docker-compose.yml`:

```yaml
version: '3.8'

services:
  pocketbase:
    image: ghcr.io/pocketbase/pocketbase:v0.22.0
    container_name: atssaha_pocketbase
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - pocketbase_data:/pb/data
      - pocketbase_logs:/pb/logs
    environment:
      - TZ=Europe/Istanbul
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: atssaha_frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      pocketbase:
        condition: service_healthy

volumes:
  pocketbase_data:
  pocketbase_logs:
```

---

## Part 3: CasaOS Deployment

### Method A: CasaOS App Store (Recommended)

1. **Open CasaOS Web Interface**
   ```
   http://YOUR_SERVER_IP:8080
   ```

2. **Navigate to App Store**
   - Click the App Store icon

3. **Add Custom App**
   - Look for "Custom" or "Compose" section
   - Select "Create from Compose"

4. **Paste Configuration**
   - Paste the docker-compose.yml content
   - Name it: `atssaha`
   - Click Install

### Method B: Terminal SSH

```bash
# Create app directory
mkdir -p /DATA/AppData/atssaha
cd /DATA/AppData/atssaha

# Create docker-compose.yml
nano docker-compose.yml
# Paste content from above

# Start services
docker-compose up -d

# Verify
docker-compose ps
```

### Verify Deployment

```bash
# Check containers
docker ps | grep atssaha

# View logs
docker logs atssaha_pocketbase
docker logs atssaha_frontend

# Test locally
curl http://localhost
curl http://localhost:8090/api/health
```

---

## Part 4: Cloudflare Setup

### Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com
2. Sign up / Log in
3. Add your domain OR use a free tunnel subdomain

### Step 2: Set up Cloudflare Tunnel (Zero Trust)

#### Option A: Using cloudflared (Recommended)

```bash
# SSH into your server
ssh user@your-server-ip

# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create atssaha-tunnel

# Note the tunnel ID from output
```

#### Option B: Cloudflare Dashboard Tunnel

1. Go to https://one.dash.cloudflare.com
2. Navigate to **Networks > Tunnels**
3. Click **Create a tunnel**
4. Select **Cloudflared** as connector
5. Download cloudflared on your server
6. Run the provided install command

### Step 3: Configure Tunnel Routes

```bash
# Create config file
sudo nano /etc/cloudflared/config.yml

# Add:
# tunnel: YOUR_TUNNEL_ID
# credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json
#
# ingress:
#   - hostname: atsaha.yourdomain.com
#     service: http://localhost:80
#   - hostname: pb-atsaha.yourdomain.com
#     service: http://localhost:8090
#   - service: http_status:404

# Install config
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Step 4: DNS Configuration (if using domain)

1. In Cloudflare Dashboard → DNS
2. Add **CNAME** records:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | atsaha | your-tunnel-id.cfargotunnel.com | DNS only → Proxied |
| CNAME | pb-atsaha | your-tunnel-id.cfargotunnel.com | DNS only → Proxied |

3. Wait 1-2 minutes for propagation

### Step 5: SSL/TLS Settings

1. Go to Cloudflare Dashboard → your domain → SSL/TLS
2. Set **Mode**: Full (strict)
3. Enable **Always Use HTTPS**

---

## Part 5: PocketBase Setup

### Initial Setup

1. Access PocketBase admin panel: http://YOUR_SERVER:8090/_/
2. Create your admin account
3. Go to Settings → Import Collections
4. Paste JSON from `scripts/setup-pocketbase.js`

### API Rules Configuration

Set the following rules for collections:

| Collection | List | View | Create | Update | Delete |
|------------|------|------|--------|--------|--------|
| reports | Public | Public | Auth | - | - |
| modem_reports | Public | Public | Auth | - | - |
| announcements | Public | Public | Auth | - | - |
| damage_reports | Public | Public | Auth | - | - |
| job_completions | Public | Public | Auth | - | - |
| vehicle_logs | Public | Public | Auth | - | - |
| port_changes | Public | Public | Auth | - | - |
| inventory_logs | Public | Public | Auth | - | - |
| improvement_reports | Public | Public | Auth | - | - |
| kablo_materials | Public | Public | Auth | - | - |

---

## Part 6: Security & Access Control

### Firewall Settings (UFW)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow CasaOS
sudo ufw allow 8080/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Internal ports
sudo ufw allow 8090/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### Cloudflare Tunnel Access Rules

In Cloudflare Zero Trust Dashboard:

1. **Networks > Tunnels** → Select your tunnel
2. **Access Policies** (optional):
   - Require specific email domains
   - Add IP restrictions

---

## Part 7: Maintenance

### Backup PocketBase Data

```bash
# Stop containers
docker-compose down

# Backup volume
sudo tar -czvf backup_atssaha_$(date +%Y%m%d).tar.gz \
  -C /DATA/AppData/atssaha \
  pocketbase_data/

# Restart
docker-compose --profile production up -d
```

### Update Application

```bash
cd /DATA/AppData/atssaha

# Pull latest code
git pull

# Rebuild and restart
docker-compose --profile production up -d --build
```

### Monitor Logs

```bash
# Real-time logs
docker-compose logs -f

# Specific service
docker logs -f atssaha_pocketbase
docker logs -f atssaha_frontend

# System logs
journalctl -u cloudflared -f
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't access CasaOS | Check firewall: `sudo ufw status` |
| PocketBase 502 error | Restart: `docker-compose restart pocketbase` |
| Cloudflare tunnel down | Check: `cloudflared tunnel list` |
| SSL certificate error | Cloudflare SSL mode: Full (strict) |

---

## Access URLs

After successful setup:

| Service | Local URL | Remote URL (Cloudflare) |
|---------|-----------|-------------------------|
| Frontend | http://localhost | https://atsaha.yourdomain.com |
| PocketBase Admin | http://localhost:8090/_/ | https://pb-atsaha.yourdomain.com/_/ |

---

## Support

For issues:
1. Check Docker logs: `docker logs <container_name>`
2. Verify Cloudflare tunnel: `cloudflared tunnel list`
3. Test local connectivity: `curl http://localhost`
