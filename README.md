# Pharmaventory

A next-generation pharmaceutical inventory management platform for hospitals, clinics, pharmacies, and distributors.

## Features

- ✅ Real-time stock monitoring with expiry alerts and prioritized medicine usage
- ✅ Automated reordering module with threshold-based purchase requests
- ✅ Prescription validation for accurate and safe medicine dispensing
- ✅ Demand trend analysis using historical data for predictive inventory optimization
- ✅ AI-powered NLP chatbot for medicine queries (<2s response time)
- ✅ Interactive dashboards for inventory, expiry tracking, and analytics
- ✅ Secure authentication and role-based access control (admin, pharmacist, staff)
- ✅ Cloud deployment ready (AWS/Heroku) with HTTPS support

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB
- **Authentication**: JWT
- **Real-time**: Socket.io
- **AI Chatbot**: OpenRouter API / Custom NLP

## Project Structure

```
golu/
├── backend/          # Express.js backend server
├── frontend/         # React frontend application
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Backend Setup**:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

2. **Frontend Setup**:
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

### Environment Variables

**Backend (.env)**:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pharmaventory
JWT_SECRET=your-secret-key
OPENROUTER_API_KEY=your-openrouter-key
NODE_ENV=development
```

**Frontend (.env)**:
```
VITE_API_URL=http://localhost:5000/api
```

## Deployment

### Heroku
See `render.yaml` for deployment configuration.

### AWS
Use AWS Elastic Beanstalk or EC2 with PM2 for process management.

## License

MIT

