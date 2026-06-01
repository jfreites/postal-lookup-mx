require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const postalCodesRoutes = require('./routes/postalCodesRoutes');
const statesRoutes = require('./routes/statesRoutes');
const logger = require('./utils/logger');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', postalCodesRoutes);
app.use('/api', statesRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;

  logger.error('Request error', {
    status,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(status).json({ success: false, error: message });
});

module.exports = app;