# Docker Deployment

## Quick Start

### Development Mode
```bash
docker-compose --profile development up -d
```

Access:
- Frontend: http://localhost:5173
- PocketBase Admin: http://localhost:8090/_/

### Production Mode
```bash
# Build and run
docker-compose --profile production up -d --build
```

Access:
- Frontend: http://localhost (nginx on port 80)
- PocketBase Admin: http://localhost:8090/_/

## Services

| Service | Port | Description |
|---------|------|-------------|
| `pocketbase` | 8090 | Database server (official v0.22.0) |
| `frontend-dev` | 5173 | Dev server with hot reload |
| `frontend` | 80 | Production build (nginx) |

## Profiles

```bash
# Development - includes hot reload
docker-compose --profile development up -d

# Production - serves built app via nginx
docker-compose --profile production up -d --build
```

## PocketBase Setup

1. First run: Access http://localhost:8090/_/ and create admin account
2. Import collections using the JSON from `scripts/setup-pocketbase.js`
3. Or use the ConfigTab in the app to copy the JSON

## Commands

```bash
# Start development
docker-compose --profile development up -d

# Start production
docker-compose --profile production up -d --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after code changes (production)
docker-compose --profile production up -d --build

# Shell into pocketbase container
docker exec -it atssaha_pocketbase /bin/sh

# Reset pocketbase data
docker-compose down -v
```

## Production Build Steps

```bash
# 1. Build the frontend
npm run build

# 2. Start production services
docker-compose --profile production up -d
```

## Environment

- Timezone: Europe/Istanbul
- Health checks enabled for PocketBase
- Auto-restart unless stopped
