# Mirage Deployment Guide

Complete guide for deploying Mirage Mock Data Service to production environments.

## 🚀 Production Deployment Options

### Option 1: Docker Compose (Recommended)
### Option 2: Kubernetes
### Option 3: Cloud Platforms (AWS, GCP, Azure)
### Option 4: Manual Server Setup

## 📋 Pre-Deployment Checklist

### Security Requirements
- [ ] Strong JWT secret generated (32+ random characters)
- [ ] Database credentials secured
- [ ] Environment variables configured
- [ ] CORS origins restricted to your domain
- [ ] Rate limits configured appropriately
- [ ] SSL/TLS certificates ready

### Infrastructure Requirements
- [ ] PostgreSQL 12+ database
- [ ] Node.js 18+ runtime
- [ ] Load balancer (for high availability)
- [ ] Monitoring solution
- [ ] Backup strategy implemented

### Performance Planning
- [ ] Expected user load estimated
- [ ] Database sizing calculated
- [ ] CDN configured (if needed)
- [ ] Caching strategy planned

## 🐳 Docker Compose Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mirage-app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: mirage-db
      DB_PORT: 5432
      DB_NAME: mirage_production
      DB_USER: mirage_user
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 24h
      BCRYPT_ROUNDS: 12
      CORS_ORIGIN: https://yourdomain.com
      LOG_LEVEL: warn
    depends_on:
      mirage-db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - mirage-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mirage-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mirage_production
      POSTGRES_USER: mirage_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-local=trust --auth-host=md5"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - mirage-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mirage_user -d mirage_production"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - mirage-app
    restart: unless-stopped
    networks:
      - mirage-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - mirage-network
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

volumes:
  postgres_data:
  redis_data:

networks:
  mirage-network:
    driver: bridge
```

### Environment Configuration

Create `.env.production`:

```env
# Database
DB_PASSWORD=your-secure-database-password-here
DB_HOST=mirage-db
DB_PORT=5432
DB_NAME=mirage_production
DB_USER=mirage_user

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars-random
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Security
CORS_ORIGIN=https://yourdomain.com,https://api.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Redis (optional - for session storage)
REDIS_PASSWORD=your-redis-password
REDIS_URL=redis://redis:6379

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
```

### Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream mirage_app {
        server mirage-app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    server {
        listen 80;
        server_name yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/certificate.crt;
        ssl_certificate_key /etc/nginx/ssl/private.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # API endpoints with rate limiting
        location /api/v1/auth {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://mirage_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://mirage_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Mock endpoints (higher limits)
        location /mock {
            proxy_pass http://mirage_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health checks and metrics
        location ~ ^/(health|metrics) {
            proxy_pass http://mirage_app;
            access_log off;
        }
    }
}
```

### Deployment Commands

```bash
# 1. Clone repository
git clone <your-repo> mirage-production
cd mirage-production

# 2. Set up environment
cp .env.production .env
chmod 600 .env

# 3. Generate strong secrets
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
echo "DB_PASSWORD=$(openssl rand -hex 16)" >> .env
echo "REDIS_PASSWORD=$(openssl rand -hex 16)" >> .env

# 4. Build and start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Check health
curl -f http://localhost:3000/health

# 6. View logs
docker-compose -f docker-compose.prod.yml logs -f mirage-app
```

## ☸️ Kubernetes Deployment

### Namespace and ConfigMap

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mirage

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mirage-config
  namespace: mirage
data:
  NODE_ENV: "production"
  DB_HOST: "mirage-postgres"
  DB_PORT: "5432"
  DB_NAME: "mirage_production"
  DB_USER: "mirage_user"
  JWT_EXPIRES_IN: "24h"
  BCRYPT_ROUNDS: "12"
  LOG_LEVEL: "warn"
  CORS_ORIGIN: "https://yourdomain.com"
```

### Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mirage-secrets
  namespace: mirage
type: Opaque
data:
  # Base64 encoded values
  DB_PASSWORD: <base64-encoded-db-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
  REDIS_PASSWORD: <base64-encoded-redis-password>
```

### PostgreSQL Deployment

```yaml
# postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mirage-postgres
  namespace: mirage
spec:
  serviceName: mirage-postgres
  replicas: 1
  selector:
    matchLabels:
      app: mirage-postgres
  template:
    metadata:
      labels:
        app: mirage-postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: mirage_production
        - name: POSTGRES_USER
          value: mirage_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mirage-secrets
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi

---
apiVersion: v1
kind: Service
metadata:
  name: mirage-postgres
  namespace: mirage
spec:
  selector:
    app: mirage-postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### Application Deployment

```yaml
# mirage-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mirage-app
  namespace: mirage
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mirage-app
  template:
    metadata:
      labels:
        app: mirage-app
    spec:
      containers:
      - name: mirage
        image: your-registry/mirage:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: mirage-config
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mirage-secrets
              key: DB_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: mirage-secrets
              key: JWT_SECRET
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: mirage-app
  namespace: mirage
spec:
  selector:
    app: mirage-app
  ports:
  - port: 80
    targetPort: 3000

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mirage-ingress
  namespace: mirage
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: mirage-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mirage-app
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres.yaml
kubectl apply -f mirage-app.yaml

# Check deployment
kubectl get pods -n mirage
kubectl get svc -n mirage
kubectl logs -f deployment/mirage-app -n mirage

# Scale application
kubectl scale deployment mirage-app --replicas=5 -n mirage
```

## ☁️ Cloud Platform Deployment

### AWS ECS with Fargate

```yaml
# task-definition.json
{
  "family": "mirage-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "mirage",
      "image": "your-account.dkr.ecr.region.amazonaws.com/mirage:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DB_HOST",
          "value": "mirage-db.cluster-xyz.region.rds.amazonaws.com"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:mirage/db-password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:mirage/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mirage-app",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### Google Cloud Run

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: mirage-app
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
      - image: gcr.io/your-project/mirage:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DB_HOST
          value: "10.1.1.3"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mirage-secrets
              key: db-password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: mirage-secrets
              key: jwt-secret
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
```

Deploy with:
```bash
gcloud run services replace cloudrun.yaml --region=us-central1
```

### Azure Container Instances

```yaml
# azure-container.yaml
apiVersion: 2019-12-01
location: East US
name: mirage-app
properties:
  containers:
  - name: mirage
    properties:
      image: yourregistry.azurecr.io/mirage:latest
      ports:
      - port: 3000
        protocol: TCP
      environmentVariables:
      - name: NODE_ENV
        value: production
      - name: DB_HOST
        value: mirage-db.postgres.database.azure.com
      - name: DB_PASSWORD
        secureValue: your-secure-password
      - name: JWT_SECRET
        secureValue: your-jwt-secret
      resources:
        requests:
          cpu: 1
          memoryInGB: 1
  osType: Linux
  ipAddress:
    type: Public
    ports:
    - port: 3000
      protocol: TCP
  restartPolicy: Always
type: Microsoft.ContainerInstance/containerGroups
```

## 🔧 Production Configuration

### Enhanced Dockerfile for Production

```dockerfile
# Multi-stage build
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mirage -u 1001

# Copy production dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Security: don't run as root
USER mirage

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Production Environment Variables

```env
# Core Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database (use connection pooling in production)
DB_HOST=production-db-host
DB_PORT=5432
DB_NAME=mirage_production
DB_USER=mirage_production
DB_PASSWORD=very-secure-password
DB_POOL_MIN=2
DB_POOL_MAX=20

# Authentication
JWT_SECRET=your-super-secure-32-plus-character-secret
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Security
CORS_ORIGIN=https://yourdomain.com,https://api.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
HELMET_CSP_DIRECTIVES='{"defaultSrc":["'\''self'\''"]}'

# Performance
COMPRESSION_LEVEL=6
REQUEST_TIMEOUT=30000

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
PROMETHEUS_ENABLED=true

# Email (for verification)
SMTP_HOST=smtp.yourmailservice.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

## 📊 Monitoring and Observability

### Health Checks Configuration

```typescript
// src/routes/monitoring.routes.ts
import { Router, Request, Response } from 'express';
import { DatabaseConnection } from '../database/connection';

const router = Router();

// Enhanced health check
router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Database health
    const db = DatabaseConnection.getInstance();
    await db.testConnection();
    
    // Memory usage
    const memUsage = process.memoryUsage();
    
    // Uptime
    const uptime = process.uptime();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      database: 'connected',
      memory: {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      },
      responseTime: `${Date.now() - startTime}ms`
    };
    
    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// Liveness probe (basic)
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe (with dependencies)
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    await DatabaseConnection.getInstance().testConnection();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
```

### Prometheus Metrics

```typescript
// src/middleware/metrics.ts
import promClient from 'prom-client';

// Create metrics registry
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeUsers = new promClient.Gauge({
  name: 'mirage_active_users_total',
  help: 'Number of active users'
});

const mockEndpointsTotal = new promClient.Gauge({
  name: 'mirage_mock_endpoints_total',
  help: 'Total number of mock endpoints'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeUsers);
register.registerMetric(mockEndpointsTotal);

export { register, httpRequestDuration, httpRequestsTotal, activeUsers, mockEndpointsTotal };
```

### Log Aggregation with Structured Logging

```typescript
// src/utils/logger.ts (enhanced for production)
import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
    isProduction 
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  defaultMeta: {
    service: 'mirage-api',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console(),
    
    // File logging for production
    ...(isProduction ? [
      new winston.transports.File({ 
        filename: '/var/log/mirage/error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: '/var/log/mirage/combined.log' 
      })
    ] : [])
  ]
});

// Add request correlation ID
export const addCorrelationId = (req: any, res: any, next: any) => {
  req.correlationId = require('crypto').randomUUID();
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Add to logger metadata
  req.logger = logger.child({ correlationId: req.correlationId });
  
  next();
};
```

## 🔐 Security Hardening

### Security Headers

```typescript
// src/middleware/security.ts (enhanced)
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting by user type
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path.startsWith('/health');
    }
  });
};
```

### Database Security

```sql
-- Create read-only user for monitoring
CREATE USER mirage_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE mirage_production TO mirage_readonly;
GRANT USAGE ON SCHEMA public TO mirage_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mirage_readonly;

-- Create backup user
CREATE USER mirage_backup WITH PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE mirage_production TO mirage_backup;
GRANT USAGE ON SCHEMA public TO mirage_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mirage_backup;

-- Row Level Security (if needed)
ALTER TABLE mock_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON mock_endpoints 
  FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);
```

## 🔄 Backup and Recovery

### Database Backup Script

```bash
#!/bin/bash
# backup.sh

set -e

BACKUP_DIR="/backups"
DB_NAME="mirage_production"
DB_USER="mirage_backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mirage_backup_${TIMESTAMP}.sql"
S3_BUCKET="your-backup-bucket"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3 (optional)
if [ ! -z "$S3_BUCKET" ]; then
  aws s3 cp "${BACKUP_FILE}.gz" "s3://${S3_BUCKET}/database/$(date +%Y/%m/%d)/"
fi

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "mirage_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Recovery Procedure

```bash
#!/bin/bash
# restore.sh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="mirage_production"
DB_USER="postgres"

# Stop the application
docker-compose -f docker-compose.prod.yml stop mirage-app

# Create a new database for restoration
createdb -h $DB_HOST -U $DB_USER "${DB_NAME}_restore"

# Restore from backup
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql -h $DB_HOST -U $DB_USER -d "${DB_NAME}_restore"
else
  psql -h $DB_HOST -U $DB_USER -d "${DB_NAME}_restore" < $BACKUP_FILE
fi

# Verify restoration
psql -h $DB_HOST -U $DB_USER -d "${DB_NAME}_restore" -c "SELECT COUNT(*) FROM users;"

echo "Restoration completed to ${DB_NAME}_restore"
echo "To switch to restored database:"
echo "1. Stop application"
echo "2. Rename databases"
echo "3. Restart application"
```

## 📈 Performance Optimization

### Database Optimization

```sql
-- Create additional indexes for production
CREATE INDEX CONCURRENTLY idx_mock_endpoints_user_id_active_method 
ON mock_endpoints (user_id, is_active, method) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_api_usage_user_id_date 
ON api_usage (user_id, date_key);

CREATE INDEX CONCURRENTLY idx_user_subscriptions_user_id_status 
ON user_subscriptions (user_id, status) 
WHERE status = 'active';

-- Update table statistics
ANALYZE mock_endpoints;
ANALYZE users;
ANALYZE api_usage;
ANALYZE user_subscriptions;
```

### Node.js Optimization

```typescript
// src/config/production.ts
export const productionConfig = {
  // Cluster mode for multi-core utilization
  cluster: {
    enabled: process.env.CLUSTER_MODE === 'true',
    workers: parseInt(process.env.CLUSTER_WORKERS || '0') || require('os').cpus().length
  },
  
  // Database connection pooling
  database: {
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    }
  },
  
  // Caching
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300'),
    max: parseInt(process.env.CACHE_MAX_ITEMS || '1000')
  }
};
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database connectivity
   docker-compose exec mirage-app npm run db:test
   
   # View database logs
   docker-compose logs mirage-db
   
   # Check connection pool status
   docker-compose exec mirage-app node -e "console.log(require('./dist/database/connection').DatabaseConnection.getInstance().getPool().totalCount)"
   ```

2. **Memory Issues**
   ```bash
   # Check memory usage
   docker stats mirage_mirage-app_1
   
   # Increase memory limits in docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 1G
   ```

3. **Authentication Problems**
   ```bash
   # Verify JWT secret
   docker-compose exec mirage-app node -e "console.log(process.env.JWT_SECRET?.length)"
   
   # Test token generation
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

### Monitoring Commands

```bash
# Application health
curl -f http://localhost:3000/health

# Database health
docker-compose exec mirage-db pg_isready -U mirage_user

# View application logs
docker-compose logs -f --tail=100 mirage-app

# Monitor resource usage
docker-compose top

# Check disk space
df -h
docker system df
```

### Performance Monitoring

```bash
# Monitor request latency
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3000/api/v1/auth/dashboard

# Database performance
docker-compose exec mirage-db psql -U mirage_user -d mirage_production \
  -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Application metrics
curl http://localhost:3000/metrics
```

This comprehensive deployment guide covers all aspects of running Mirage in production, from basic Docker setups to enterprise Kubernetes deployments with full monitoring and security hardening.