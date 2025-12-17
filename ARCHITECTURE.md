# ProCon System Architecture

This document provides a comprehensive overview of the ProCon system architecture.

---

## 1. High-Level System Architecture

The ProCon system consists of three main layers:

### Frontend Layer (React + TypeScript)
- **Technology**: React 18, TypeScript, Vite
- **Port**: 5173 (development)
- **Key Libraries**: Recharts, Google Maps API, Tailwind CSS
- **Components**: Dashboard, Device Management, Financial Reports, Alerts, User Management

### Backend Layer (Node.js + Express)
- **Technology**: Node.js, Express.js
- **Port**: 4000
- **Key Features**: REST API, JWT Authentication, Server-Sent Events (SSE)
- **Background Services**: Device & Event Sync (every 5 minutes)

### Data Layer (PostgreSQL)
- **Database**: PostgreSQL
- **Key Tables**: users, companies, devices, events, financial_summary

### External Integration
- **Mazda API**: Provides device and event data
- **Sync Frequency**: Every 5 minutes

---

## 2. System Components

### Frontend Components
```
├── Dashboard
│   ├── Financial Metrics (Revenue, Net Win, Transactions)
│   ├── Device Status Overview
│   └── Active Alerts Monitor
├── Device Management
│   ├── Device List & Map View
│   ├── Real-time Status Tracking
│   └── Device Commands (Enable/Disable with MFA)
├── Financial Reports
│   ├── Revenue & Net Win Analytics
│   ├── Machine Performance Table
│   ├── Time-series Charts
│   └── Export (PDF/Excel)
├── Alert System
│   ├── Real-time Event Stream (SSE)
│   └── Alert Acknowledgment
└── User Management
    ├── User CRUD Operations
    └── Role-Based Access Control
```

### Backend Controllers
```
├── authController.js - Authentication & OTP
├── deviceController.js - Device operations
├── eventController.js - Event handling & SSE
├── dashboardController.js - Dashboard statistics
├── reportController.js - Financial reports
└── userController.js - User management
```

### Background Services
```
├── backgroundSync.js
│   ├── Device Sync (every 5 min)
│   └── Event Sync (every 5 min)
└── eventProcessor.js
    ├── Parse financial events
    ├── Calculate amounts
    └── Update financial_summary
```

---

## 3. Data Flow

### User Authentication Flow
1. User enters credentials → POST `/api/auth/login`
2. Backend verifies credentials in database
3. Backend generates OTP code
4. User enters OTP → POST `/api/auth/verify-otp`
5. Backend validates OTP and issues JWT token
6. Frontend stores JWT for subsequent requests

### Dashboard Data Flow
1. Frontend requests stats → GET `/api/dashboard/stats` (with JWT)
2. Backend aggregates data from `financial_summary` table
3. Calculates: Total Revenue, Net Win, Active Machines, Alerts
4. Returns JSON response
5. Frontend displays charts and metrics

### Financial Reports Flow
1. User selects year/month filters
2. Frontend calls:
   - GET `/api/reports/financial/stats` (summary cards)
   - GET `/api/reports/financial/chart` (chart data)
   - GET `/api/reports/financial/performance` (machine table)
3. Backend queries `financial_summary` with date filters
4. Aggregates data by device/date
5. Returns formatted data
6. Frontend renders charts and tables

### Background Sync Flow
1. Cron job triggers every 5 minutes
2. Fetch device data from Mazda API → Update `devices` table
3. Fetch event data from Mazda API → Process events
4. Event Processor:
   - Identifies financial events (Money Added, Voucher Issued)
   - Parses amounts (handles $XX.XX format)
   - Categorizes as Cash In or Cash Out (vouchers)
5. Update `financial_summary` table (daily aggregates)

---

## 4. Database Schema

### Tables Overview

**users**
- Stores user accounts with hashed passwords
- Fields: user_id, company_id, username, email, password_hash, role_name, is_active

**companies**
- Multi-tenant support
- Fields: company_id, company_name, account_id

**devices**
- Device inventory and status
- Fields: device_id, imei, serial_number, nickname, status, lat/lng, is_online, group_name, rssi, voltage

**events**
- All device events (financial, door, cashbox, etc.)
- Fields: event_uuid, device_id, event_type, event_id, entry, event_timestamp, is_financial_event, parsed_amount

**financial_summary**
- Daily financial aggregates per device
- Fields: device_id, summary_date, total_cash_in, total_vouchers, transaction_count

### Relationships
- companies → users (1:many)
- companies → devices (1:many)
- companies → events (1:many)
- devices → events (1:many)
- devices → financial_summary (1:many)

---

## 5. API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `GET /api/auth/me` - Get current user info

### Devices
- `GET /api/devices` - List all devices
- `POST /api/devices/:deviceId/command` - Send command (requires MFA)

### Events
- `GET /api/events` - List events with pagination
- `GET /api/events/stream` - Server-Sent Events stream
- `POST /api/events/:eventUuid/ack` - Acknowledge event

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Financial Reports
- `GET /api/reports/financial/stats` - Financial statistics (revenue, net win, etc.)
- `GET /api/reports/financial/chart` - Time-series chart data
- `GET /api/reports/financial/performance` - Machine performance metrics
- `GET /api/reports/export` - Export reports (PDF/Excel)

### User Management
- `GET /api/users` - List users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `GET /api/users/:userId` - Get user details
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Delete user

---

## 6. Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: Bcrypt with salt rounds
- **OTP Verification**: Multi-factor authentication for login
- **Role-Based Access**: Admin, Manager, Admin Tech, Viewer roles
- **MFA for Critical Actions**: Device enable/disable requires OTP

### API Security
- **Rate Limiting**: 120 requests per minute per IP
- **CORS Protection**: Configured for allowed origins
- **Helmet.js**: Security headers (XSS, clickjacking protection)
- **Input Validation**: Sanitized user inputs
- **SQL Injection Prevention**: Parameterized queries

---

## 7. Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (custom design system)
- **Charts**: Recharts
- **Maps**: Google Maps JavaScript API
- **HTTP Client**: Fetch API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: Bcrypt
- **Scheduling**: Node-Cron
- **Database Client**: node-postgres (pg)

### Database
- **DBMS**: PostgreSQL
- **Features Used**: 
  - UUID primary keys
  - Timestamp tracking
  - Aggregation functions
  - Foreign key constraints

### DevOps
- **Development**: Nodemon (auto-restart)
- **Version Control**: Git
- **Code Quality**: ESLint
- **Package Manager**: npm

---

## 8. Key Metrics & Calculations

### Financial Metrics
- **Total Revenue** = SUM(total_cash_in) from financial_summary
- **Total Vouchers** = SUM(total_vouchers) from financial_summary
- **Net Win** = Total Revenue - Total Vouchers
- **Payout Rate** = (Total Vouchers / Total Revenue) × 100
- **Average Transaction** = Total Revenue / Transaction Count

### Device Metrics
- **Active Machines** = COUNT(devices WHERE is_online = true)
- **Revenue per Day** = Total Revenue / Days Active
- **Uptime** = Based on is_online status (snapshot)

---

## 9. Deployment Recommendations

### Development Environment
- Frontend: `npm run dev` (Vite dev server on port 5173)
- Backend: `npm run dev` (Nodemon on port 4000)
- Database: PostgreSQL (local or Docker)

### Production Environment
- **Frontend**: 
  - Build: `npm run build`
  - Deploy: Static hosting (Vercel, Netlify, S3 + CloudFront)
- **Backend**: 
  - Process Manager: PM2 or Docker
  - Hosting: AWS EC2, DigitalOcean, Heroku
  - Load Balancer: Nginx or AWS ALB
- **Database**: 
  - Managed PostgreSQL (AWS RDS, DigitalOcean Managed DB)
  - Automated backups
  - Read replicas for scaling

### Environment Variables
```
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=...
PROCON_ACCOUNT_ID=104437,104409
PORT=4000

# Frontend
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_MAPS_API_KEY=...
```

---

## 10. Future Enhancements

### Planned Features
1. **Historical Uptime Tracking**: Store connection events for accurate uptime %
2. **Efficiency Metrics**: Calculate based on actual performance data
3. **Advanced Analytics**: Predictive analytics, trend forecasting
4. **Mobile App**: React Native companion app
5. **Notifications**: Email/SMS alerts for critical events
6. **Caching Layer**: Redis for improved performance
7. **Real-time Dashboard**: WebSocket for live updates
8. **Advanced Reporting**: Custom report builder

### Scalability Considerations
- Horizontal scaling with load balancer
- Database read replicas
- Caching frequently accessed data
- CDN for static assets
- Microservices architecture (future)

---

## Contact & Support

For questions about this architecture or the ProCon system, please contact the development team.

**Project**: ProCon Device Management System  
**Version**: 1.0  
**Last Updated**: December 2025
