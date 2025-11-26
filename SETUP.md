# Pharmaventory Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn package manager
- OpenRouter API key (optional, for chatbot functionality)

## Installation Steps

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pharmaventory
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
OPENROUTER_API_KEY=your-openrouter-api-key-optional
OPENROUTER_HTTP_REFERER=https://pharmaventory.com
```

Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### 3. Database Setup

#### Option A: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Update `MONGODB_URI` in backend `.env` to point to your local instance

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in backend `.env` with your Atlas connection string

### 4. Create Initial Admin User

You can create an admin user by registering through the frontend or by using MongoDB directly:

```javascript
// In MongoDB shell or Compass
db.users.insertOne({
  name: "Admin User",
  email: "admin@pharmaventory.com",
  password: "$2a$12$...", // Hashed password (use bcrypt)
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or use the registration endpoint with a temporary admin route (you may need to add this).

## Features

### ✅ Implemented Features

1. **Real-time Stock Monitoring**
   - Stock levels with low stock alerts
   - Expiry date tracking with alerts
   - Priority-based medicine categorization

2. **Automated Reordering**
   - Automatic reorder request generation when stock falls below threshold
   - Reorder request workflow (pending → approved → ordered → received)
   - Scheduled checks every 6 hours

3. **Prescription Validation**
   - Prescription creation and management
   - Automated validation (stock check, expiry check)
   - Safe dispensing with transaction tracking

4. **Demand Trend Analysis**
   - Historical transaction analysis
   - Predictive demand forecasting
   - Reorder recommendations based on trends

5. **AI-Powered Chatbot**
   - Natural language queries about medicines
   - Medicine availability and alternatives
   - Response time < 2 seconds

6. **Interactive Dashboards**
   - Inventory overview dashboard
   - Analytics with charts and visualizations
   - Real-time updates via Socket.IO

7. **Role-Based Access Control**
   - Admin: Full access
   - Pharmacist: Can validate and dispense prescriptions
   - Staff: Read-only access

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile

### Medicines
- `GET /api/medicines` - Get all medicines (with filters)
- `GET /api/medicines/:id` - Get single medicine
- `POST /api/medicines` - Create medicine (admin/pharmacist)
- `PUT /api/medicines/:id` - Update medicine (admin/pharmacist)
- `DELETE /api/medicines/:id` - Delete medicine (admin)
- `GET /api/medicines/expiry-alerts` - Get expiry alerts

### Prescriptions
- `GET /api/prescriptions` - Get all prescriptions
- `GET /api/prescriptions/:id` - Get single prescription
- `POST /api/prescriptions` - Create prescription
- `POST /api/prescriptions/:id/validate` - Validate prescription
- `POST /api/prescriptions/:id/dispense` - Dispense prescription

### Reorders
- `GET /api/reorders` - Get all reorder requests
- `GET /api/reorders/pending` - Get pending requests
- `POST /api/reorders/:id/approve` - Approve request
- `POST /api/reorders/:id/order` - Mark as ordered
- `POST /api/reorders/:id/receive` - Mark as received

### Analytics
- `GET /api/analytics/demand-trends` - Get demand trends for medicine
- `GET /api/analytics/inventory` - Get inventory analytics
- `GET /api/analytics/reorder-recommendations` - Get reorder recommendations

### Chatbot
- `POST /api/chatbot/chat` - Process chatbot query

## Deployment

### Heroku Deployment

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create pharmaventory-backend`
4. Set environment variables in Heroku dashboard
5. Deploy: `git push heroku main`

### AWS Deployment

1. Use AWS Elastic Beanstalk or EC2
2. Set up environment variables
3. Use PM2 for process management: `pm2 start dist/server.js`
4. Configure nginx as reverse proxy

### Render.com Deployment

See `render.yaml` for configuration. Deploy both backend and frontend as separate services.

## Troubleshooting

### Backend Issues

- **MongoDB Connection Error**: Check `MONGODB_URI` in `.env`
- **JWT Errors**: Ensure `JWT_SECRET` is set
- **Port Already in Use**: Change `PORT` in `.env`

### Frontend Issues

- **API Connection Error**: Check `VITE_API_URL` in `.env`
- **CORS Errors**: Ensure backend `CORS_ORIGIN` includes frontend URL

### Chatbot Issues

- **OpenAI API Errors**: Ensure `OPENAI_API_KEY` is set (optional)
- Chatbot will use fallback responses if API key is not configured

## License

MIT

