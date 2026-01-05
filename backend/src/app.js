const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authMiddleware = require('./middleware/auth');
const roleCheck = require('./middleware/roleCheck');

const { loginHandler, verifyOtpHandler, meHandler } = require('./controllers/authController');
const { listDevices, deviceCommand } = require('./controllers/deviceController');
const { listEvents, ackEvent, sseEvents } = require('./controllers/eventController');
const { createUser, listUsers, updateUser, deleteUser, getUserById } = require('./controllers/userController');
const { exportFinancials, getFinancialStats, getFinancialChart, getMachinePerformance } = require('./controllers/reportController');
const { getDashboardStats } = require('./controllers/dashboardController');

const metadataRoutes = require('./routes/metadataRoutes');
const backgroundSync = require('./services/backgroundSync');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

app.use('/api/metadata', metadataRoutes);
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));

app.post('/api/auth/login', loginHandler);
app.post('/api/auth/verify-otp', verifyOtpHandler);
app.get('/api/auth/me', authMiddleware, meHandler);

app.get('/api/devices', authMiddleware, listDevices);
app.post('/api/devices/:deviceId/command', authMiddleware, roleCheck(['Admin', 'Manager', 'Admin Tech']), deviceCommand);

app.get('/api/events', authMiddleware, listEvents);
app.post('/api/events/:eventUuid/ack', authMiddleware, ackEvent);
app.get('/api/events/stream', authMiddleware, sseEvents);

app.get('/api/users', authMiddleware, roleCheck(['Admin']), listUsers);
app.post('/api/users', authMiddleware, roleCheck(['Admin']), createUser);
app.get('/api/users/:userId', authMiddleware, roleCheck(['Admin']), getUserById);
app.put('/api/users/:userId', authMiddleware, roleCheck(['Admin']), updateUser);
app.delete('/api/users/:userId', authMiddleware, roleCheck(['Admin']), deleteUser);

app.get('/api/reports/export', authMiddleware, exportFinancials);
app.get('/api/reports/financial/stats', authMiddleware, getFinancialStats);
app.get('/api/reports/financial/chart', authMiddleware, getFinancialChart);
app.get('/api/reports/financial/performance', authMiddleware, getMachinePerformance);
app.get('/api/dashboard/stats', authMiddleware, getDashboardStats);

backgroundSync.start();
module.exports = app;
