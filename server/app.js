/**
 * NIRA System - Express App Configuration
 * This file configures the Express application with middleware and routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth.routes');
const citizenRoutes = require('./routes/citizen.routes');
const userRoutes = require('./routes/user.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const noticeRoutes = require('./routes/notice.routes');
const activityRoutes = require('./routes/activity.routes');
const fileRoutes = require('./routes/file.routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler.middleware');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins in development for mobile testing
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8000'
];

// In development, allow all origins for mobile device testing
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // In development, allow all origins for easier mobile testing
        if (isDevelopment) {
            return callback(null, true);
        }

        // In production, check against allowed origins
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/citizens', citizenRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/files', fileRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'NIRA System API',
        version: '2.0.0',
        description: 'National Identity Registration Authority - Backend API',
        stack: 'Node.js + Express + MongoDB',
        status: 'operational'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
