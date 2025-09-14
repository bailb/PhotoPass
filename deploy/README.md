# PhotoPass Deployment Guide

This directory contains Docker deployment configurations for PhotoPass application, supporting both H5 web application and WeChat Mini Program.

## Files Structure

```
deploy/
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile.h5              # Dockerfile for H5 web application
├── Dockerfile.miniprogram     # Dockerfile for WeChat Mini Program
├── nginx-h5.conf             # Nginx configuration for H5
├── nginx-miniprogram.conf    # Nginx configuration for Mini Program
└── README.md                 # This file
```

## Services

### H5 Web Application
- **Container**: `photopass-h5`
- **Port**: `3000`
- **URL**: http://localhost:3000
- **Description**: Vue3-based photo cropping web application

### WeChat Mini Program
- **Container**: `photopass-miniprogram`
- **Port**: `3001`
- **URL**: http://localhost:3001
- **Description**: WeChat Mini Program version of photo cropping application

## Quick Start

### Prerequisites
- Docker
- Docker Compose

### Deploy All Services
```bash
# Build and start all services
docker-compose -f deploy/docker-compose.yml up -d

# View logs
docker-compose -f deploy/docker-compose.yml logs -f

# Stop all services
docker-compose -f deploy/docker-compose.yml down
```

### Deploy Individual Service

#### H5 Only
```bash
docker-compose -f deploy/docker-compose.yml up -d photopass-h5
```

#### Mini Program Only
```bash
docker-compose -f deploy/docker-compose.yml up -d photopass-miniprogram
```

## Build Commands

### Build H5 Image
```bash
docker build -f deploy/Dockerfile.h5 -t photopass-h5 .
```

### Build Mini Program Image
```bash
docker build -f deploy/Dockerfile.miniprogram -t photopass-miniprogram .
```

## Environment Variables

Both services support the following environment variables:
- `NODE_ENV`: Set to `production` for production builds

## Network Configuration

- **Network**: `photopass-network` (bridge driver)
- **Volume**: `photopass-data` (local driver)

## Nginx Features

- Gzip compression enabled
- Static asset caching (1 year)
- Client-side routing support
- Security headers
- WeChat Mini Program file type support (.wxss, .wxml)

## Troubleshooting

### Check Container Status
```bash
docker-compose -f deploy/docker-compose.yml ps
```

### View Container Logs
```bash
# All services
docker-compose -f deploy/docker-compose.yml logs

# Specific service
docker-compose -f deploy/docker-compose.yml logs photopass-h5
docker-compose -f deploy/docker-compose.yml logs photopass-miniprogram
```

### Rebuild Services
```bash
# Rebuild and restart
docker-compose -f deploy/docker-compose.yml up -d --build

# Force rebuild without cache
docker-compose -f deploy/docker-compose.yml build --no-cache
docker-compose -f deploy/docker-compose.yml up -d
```

