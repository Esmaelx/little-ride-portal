# Little-Ride Internal Portal

A secure internal web portal for ride-hailing company operations, built with the MERN stack.

## Features

- **Role-Based Access Control (RBAC)** - Sales Agents, Operations Officers, and Administrators
- **JWT Authentication** - Secure login with access and refresh tokens
- **Driver Onboarding** - Multi-step registration with document upload
- **Document Approval Workflow** - Centralized queue with approve/reject functionality
- **Real-time Dashboards** - Performance metrics and status tracking
- **Audit Logging** - Complete activity trail for compliance

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and install dependencies**

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

2. **Configure environment**

Edit `server/.env` with your MongoDB connection:

```env
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/little-ride

# For MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/little-ride

JWT_SECRET=your-secure-secret-key
```

3. **Seed the database**

```bash
cd server
node scripts/seed.js
```

This creates demo users:
- **Admin**: admin@littleride.et / admin123
- **Operations**: ops@littleride.et / ops123
- **Sales Agent**: sales@littleride.et / sales123

4. **Start the servers**

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

5. **Open the portal**

Visit `http://localhost:5173` and login with the demo credentials.

## Project Structure

```
├── server/                 # Express.js Backend
│   ├── config/            # Database config
│   ├── middleware/        # Auth, RBAC, Upload
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   ├── scripts/           # Seed scripts
│   └── server.js          # Entry point
│
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # Auth context
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API client
│   │   └── styles/        # Global CSS
│   └── index.html
│
└── README.md
```

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/auth/login | User login | Public |
| POST | /api/auth/logout | User logout | Auth |
| GET | /api/drivers | List drivers | Auth |
| POST | /api/drivers | Register driver | Sales, Admin |
| PUT | /api/drivers/:id/status | Update status | Ops, Admin |
| GET | /api/documents/queue | Approval queue | Ops, Admin |
| PUT | /api/documents/:id/status | Approve/Reject | Ops, Admin |
| GET | /api/users | List users | Admin |
| POST | /api/users | Create user | Admin |
| GET | /api/audit | Audit logs | Admin |

## User Roles

| Role | Permissions |
|------|-------------|
| Sales Agent | Register drivers, upload documents, view own dashboard |
| Operations | Review documents, approve/reject, view all drivers |
| Administrator | Full access, user management, audit logs |

## License

Internal use only - © Little-Ride Ethiopia
