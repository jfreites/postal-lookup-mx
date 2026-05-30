require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const postalCodesRoutes = require('./routes/postalCodesRoutes');
const statesRoutes = require('./routes/statesRoutes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', postalCodesRoutes);
app.use('/api', statesRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(status).json({ success: false, error: message });
});

module.exports = app;