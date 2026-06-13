const express = require('express');
const cors = require('cors');
const { frontendUrl } = require('./config/env');
const { ApiError, errorHandler } = require('./middleware/error');
const routes = require('./routes');

const app = express();

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(
  cors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, `Not found - ${req.originalUrl}`));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
