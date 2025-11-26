# Pharmaventory Deployment Guide

## Cloud Deployment Options

### Option 1: Render.com (Recommended for Quick Deployment)

1. **Backend Deployment**:
   - Connect your GitHub repository to Render
   - Create a new Web Service
   - Set root directory to `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Set environment variables:
     - `MONGODB_URI`
     - `JWT_SECRET`
     - `OPENROUTER_API_KEY` (optional)
     - `OPENROUTER_HTTP_REFERER` (optional)
     - `CORS_ORIGIN` (frontend URL)

2. **Frontend Deployment**:
   - Create a new Static Site
   - Set root directory to `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Set environment variable:
     - `VITE_API_URL` (backend API URL)

### Option 2: Heroku

#### Backend

```bash
cd backend
heroku create pharmaventory-backend
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-secret
heroku config:set OPENROUTER_API_KEY=your-key
heroku config:set OPENROUTER_HTTP_REFERER=https://your-frontend-url.com
heroku config:set CORS_ORIGIN=https://your-frontend-url.com
git push heroku main
```

#### Frontend

Use Heroku static buildpack or deploy to Vercel/Netlify separately.

### Option 3: AWS

#### Using Elastic Beanstalk

1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init`
3. Create environment: `eb create pharmaventory-env`
4. Set environment variables in EB console
5. Deploy: `eb deploy`

#### Using EC2

1. Launch EC2 instance (Ubuntu)
2. Install Node.js and MongoDB
3. Clone repository
4. Set up PM2: `pm2 start dist/server.js`
5. Configure nginx as reverse proxy
6. Set up SSL with Let's Encrypt

### Option 4: Docker Deployment

Create `Dockerfile` in backend:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t pharmaventory-backend .
docker run -p 5000:5000 --env-file .env pharmaventory-backend
```

## Environment Variables

### Backend (.env)

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pharmaventory
JWT_SECRET=generate-a-strong-secret-key
JWT_EXPIRE=7d
CORS_ORIGIN=https://your-frontend-domain.com
OPENROUTER_API_KEY=sk-or-... (optional)
OPENROUTER_HTTP_REFERER=https://your-frontend-domain.com
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend-domain.com/api
```

## HTTPS Configuration

### Using Nginx (Recommended)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Using Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Scalability Considerations

1. **Database**: Use MongoDB Atlas for managed database
2. **Caching**: Implement Redis for session management
3. **Load Balancing**: Use AWS ELB or similar
4. **CDN**: Use CloudFront for frontend assets
5. **Monitoring**: Set up monitoring with PM2 Plus or AWS CloudWatch

## Security Checklist

- [ ] Use strong JWT secret
- [ ] Enable HTTPS
- [ ] Set secure CORS origins
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB authentication
- [ ] Set up rate limiting
- [ ] Regular security updates
- [ ] Enable MongoDB network restrictions

## Monitoring

### PM2 Monitoring

```bash
npm install -g pm2
pm2 start dist/server.js --name pharmaventory
pm2 monit
pm2 logs
```

### Health Check Endpoint

The backend includes a health check endpoint:
- `GET /health` - Returns server status

Use this for load balancer health checks.

## Backup Strategy

1. **Database Backups**: Set up automated MongoDB backups
2. **Code Backups**: Use Git version control
3. **Environment Variables**: Store securely (use secrets manager)

## Performance Optimization

1. **Database Indexing**: Already implemented in models
2. **Connection Pooling**: Configured in database.ts
3. **Caching**: Consider adding Redis for frequently accessed data
4. **CDN**: Use for static assets

